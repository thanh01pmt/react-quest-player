// src/games/maze/MazeEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, GameState, MazeConfig, SolutionConfig, StepResult, PlayerConfig, Block, Portal, Direction } from '../../types';
import type { MazeGameState, PlayerState, WorldGridCell } from './types';

export interface IMazeEngine extends IGameEngine {
  triggerInteraction(): boolean;
  completeTeleport(): void;
}

export class MazeEngine implements IMazeEngine {
  public readonly gameType = 'maze';

  private readonly initialGameState: MazeGameState;
  private readonly finish: { x: number; y: number; z: number };
  
  private currentState!: MazeGameState;
  private interpreter: any | null = null;
  private highlightedBlockId: string | null = null;
  private executedAction: boolean = false;

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as MazeConfig;
    
    const players: PlayerConfig[] = config.players || (config.player ? [{ ...config.player, id: 'player1' }] : []);
    const playerStates: { [id: string]: PlayerState } = {};
    for (const p of players) {
      playerStates[p.id] = {
        id: p.id,
        x: p.start.x,
        y: p.start.y ?? 1,
        z: p.start.z ?? p.start.y,
        direction: p.start.direction ?? 1,
        pose: 'Idle',
        // THÊM: Theo dõi vị trí trước đó để phát hiện di chuyển
        xPrev: p.start.x,
        zPrev: p.start.z ?? p.start.y,
      };
    }

    const unbuiltState: Omit<MazeGameState, 'worldGrid'> = {
      blocks: this.normalizeBlocks(config),
      collectibles: config.collectibles || [],
      interactibles: config.interactibles || [],
      players: playerStates,
      activePlayerId: players[0]?.id || '',
      collectedIds: [],
      interactiveStates: (config.interactibles || []).reduce((acc, item) => {
        if (item.type === 'switch') acc[item.id] = item.initialState;
        return acc;
      }, {} as { [id: string]: string }),
      result: 'unset',
      isFinished: false,
    };

    this.initialGameState = {
      ...unbuiltState,
      worldGrid: this._buildWorldGrid(unbuiltState),
    };

    this.finish = {
      x: config.finish.x,
      y: config.finish.y,
      z: config.finish.z ?? config.finish.y,
    };

    this.currentState = this.getInitialState();
  }

  private _buildWorldGrid(state: Omit<MazeGameState, 'worldGrid'>): Record<string, WorldGridCell> {
    const grid: Record<string, WorldGridCell> = {};
    
    for (const block of state.blocks) {
      const key = `${block.position.x},${block.position.y},${block.position.z}`;
      grid[key] = { type: 'block', isSolid: true };
    }
    for (const item of state.collectibles) {
      const key = `${item.position.x},${item.position.y},${item.position.z}`;
      grid[key] = { type: 'collectible', isSolid: false, id: item.id };
    }
    for (const item of state.interactibles) {
      const key = `${item.position.x},${item.position.y},${item.position.z}`;
      grid[key] = { type: item.type, isSolid: false, id: item.id };
    }
    
    return grid;
  }

  private normalizeBlocks(config: MazeConfig): Block[] {
    if (config.blocks) return config.blocks;
    if (config.map) {
      const blocks: Block[] = [];
      for (let y = 0; y < config.map.length; y++) {
        for (let x = 0; x < config.map[y].length; x++) {
          const cell = config.map[y][x];
          if (cell === 0) {
            blocks.push({ modelKey: 'wall.brick01', position: { x, y: 0, z: y } });
          } else if (cell !== 0) {
            blocks.push({ modelKey: 'ground.normal', position: { x, y: 0, z: y } });
          }
        }
      }
      return blocks;
    }
    return [];
  }

  getInitialState(): MazeGameState {
    return JSON.parse(JSON.stringify(this.initialGameState));
  }

  execute(userCode: string): void {
    this.currentState = this.getInitialState();
    this.highlightedBlockId = null;

    const initApi = (interpreter: any, globalObject: any) => {
      const createWrapper = (func: Function, isAction: boolean) => {
        return interpreter.createNativeFunction((...args: any[]) => {
          const blockId = args.pop();
          this.highlight(blockId);
          if (isAction) this.executedAction = true;
          return func.apply(this, args);
        });
      };

      interpreter.setProperty(globalObject, 'moveForward', createWrapper(this.moveForward.bind(this), true));
      interpreter.setProperty(globalObject, 'turnLeft', createWrapper(this.turnLeft.bind(this), true));
      interpreter.setProperty(globalObject, 'turnRight', createWrapper(this.turnRight.bind(this), true));
      interpreter.setProperty(globalObject, 'jump', createWrapper(this.jump.bind(this), true));
      interpreter.setProperty(globalObject, 'isPathForward', createWrapper(this.isPath.bind(this, 0), false));
      interpreter.setProperty(globalObject, 'isPathRight', createWrapper(this.isPath.bind(this, 1), false));
      interpreter.setProperty(globalObject, 'isPathLeft', createWrapper(this.isPath.bind(this, 3), false));
      interpreter.setProperty(globalObject, 'notDone', createWrapper(this.notDone.bind(this), false));
      interpreter.setProperty(globalObject, 'collectItem', createWrapper(this.collectItem.bind(this), true));
      interpreter.setProperty(globalObject, 'isItemPresent', createWrapper(this.isItemPresent.bind(this), false));
      interpreter.setProperty(globalObject, 'getItemCount', createWrapper(this.getItemCount.bind(this), false));
      interpreter.setProperty(globalObject, 'placeBlock', createWrapper(() => {}, true));
      interpreter.setProperty(globalObject, 'removeBlock', createWrapper(() => {}, true));
    };

    this.interpreter = new Interpreter(userCode, initApi);
  }
  
  step(): StepResult {
    const currentPlayerPose = this.getActivePlayer().pose;
    if (currentPlayerPose && !['Idle', 'Walking'].includes(currentPlayerPose)) {
      const stateToReturn = JSON.parse(JSON.stringify(this.currentState));
      
      if (currentPlayerPose === 'TeleportIn' || currentPlayerPose === 'Bump' || currentPlayerPose === 'Victory') {
        this.getActivePlayer().pose = 'Idle';
      }
      
      return {
        done: this.currentState.isFinished,
        state: stateToReturn,
        highlightedBlockId: this.highlightedBlockId
      };
    }

    if (!this.interpreter || this.currentState.isFinished) return null;

    this.highlightedBlockId = null;
    this.executedAction = false;
    let hasMoreCode = true;

    while (hasMoreCode && !this.executedAction) {
      try {
        hasMoreCode = this.interpreter.step();
      } catch (e) {
        this.currentState.result = 'error';
        this.currentState.isFinished = true;
        return { done: true, state: this.currentState, highlightedBlockId: this.highlightedBlockId };
      }
    }

    if (!hasMoreCode && !this.executedAction) {
      this.currentState.isFinished = true;
      if (this.notDone()) {
        this.currentState.result = 'failure';
      } else {
        this.currentState.result = 'success';
        this.logVictoryAnimation();
      }

      return {
        done: true,
        state: JSON.parse(JSON.stringify(this.currentState)),
        highlightedBlockId: this.highlightedBlockId
      };
    }

    if (!hasMoreCode) {
      this.currentState.result = this.notDone() ? 'failure' : 'success';
      if (this.currentState.result === 'success') this.logVictoryAnimation();
      this.currentState.isFinished = true;
    }
    
    return {
      done: this.currentState.isFinished,
      state: JSON.parse(JSON.stringify(this.currentState)),
      highlightedBlockId: this.highlightedBlockId
    };
  }

  checkWinCondition(finalState: GameState, _solutionConfig: SolutionConfig): boolean {
    const state = finalState as MazeGameState;
    const activePlayer = state.players[state.activePlayerId];
    return activePlayer.x === this.finish.x && activePlayer.y === this.finish.y && activePlayer.z === this.finish.z;
  }
  
  private highlight(id?: any): void {
    if (typeof id === 'string' && id.startsWith('block_id_')) {
      this.highlightedBlockId = id.replace('block_id_', '');
    }
  }

  private getActivePlayer(): PlayerState {
    return this.currentState.players[this.currentState.activePlayerId];
  }

  private getNextPosition(x: number, z: number, direction: Direction): { x: number, z: number } {
    if (direction === 0) z--; else if (direction === 1) x++; else if (direction === 2) z++; else if (direction === 3) x--;
    return { x, z };
  }
  
  private _isSolidAt(x: number, y: number, z: number): boolean {
    const cell = this.currentState.worldGrid[`${x},${y},${z}`];
    return cell ? cell.isSolid : false;
  }

  private _isGroundAt(x: number, y: number, z: number): boolean {
    const cell = this.currentState.worldGrid[`${x},${y},${z}`];
    return !!cell;
  }

  private _isWalkable(x: number, y: number, z: number): boolean {
    return !this._isSolidAt(x, y, z) && this._isGroundAt(x, y - 1, z);
  }

  // THAY ĐỔI: Cập nhật xPrev và zPrev trước khi di chuyển
  private moveForward(): void {
    const player = this.getActivePlayer();
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, player.direction);

    if (this._isSolidAt(nextX, player.y, nextZ)) {
      player.pose = 'Bump';
      return;
    }

    let targetY: number | null = null;
    if (this._isWalkable(nextX, player.y, nextZ)) {
      targetY = player.y;
    } else if (this._isWalkable(nextX, player.y - 1, nextZ)) {
      targetY = player.y - 1;
    }

    if (targetY === null) {
      player.pose = 'Bump';
      return;
    }

    // Lưu vị trí cũ trước khi di chuyển
    player.xPrev = player.x;
    player.zPrev = player.z;

    player.pose = 'Walking';
    player.x = nextX;
    player.y = targetY;
    player.z = nextZ;
  }

  // THAY ĐỔI: Cập nhật xPrev và zPrev trước khi nhảy
  private jump(): void {
    const player = this.getActivePlayer();
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, player.direction);

    if (this._isWalkable(nextX, player.y + 1, nextZ)) {
      // Lưu vị trí cũ trước khi nhảy
      player.xPrev = player.x;
      player.zPrev = player.z;

      player.pose = 'Jumping';
      player.x = nextX;
      player.y = player.y + 1;
      player.z = nextZ;
    } else {
      player.pose = 'Bump';
    }
  }

  private turnLeft(): void {
    this.getActivePlayer().direction = this.constrainDirection(this.getActivePlayer().direction - 1);
    this.getActivePlayer().pose = 'Idle';
  }

  private turnRight(): void {
    this.getActivePlayer().direction = this.constrainDirection(this.getActivePlayer().direction + 1);
    this.getActivePlayer().pose = 'Idle';
  }

  private isPath(relativeDirection: 0 | 1 | 3): boolean {
    const player = this.getActivePlayer();
    const effectiveDirection = this.constrainDirection(player.direction + relativeDirection);
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, effectiveDirection);

    return (
      this._isWalkable(nextX, player.y + 1, nextZ) ||
      this._isWalkable(nextX, player.y, nextZ) ||
      this._isWalkable(nextX, player.y - 1, nextZ)
    );
  }

  private notDone(): boolean {
    const player = this.getActivePlayer();
    return player.x !== this.finish.x || player.y !== this.finish.y || player.z !== this.finish.z;
  }
  
  private logVictoryAnimation(): void {
    this.getActivePlayer().pose = 'Victory';
  }

  private constrainDirection(d: number): Direction {
    d = Math.round(d) % 4;
    if (d < 0) d += 4;
    return d as Direction;
  }

  private collectItem(): boolean {
    const player = this.getActivePlayer();
    const cell = this.currentState.worldGrid[`${player.x},${player.y},${player.z}`];

    if (cell && cell.type === 'collectible' && cell.id && !this.currentState.collectedIds.includes(cell.id)) {
      this.currentState.collectedIds.push(cell.id);
      
      this.currentState.collectibles = this.currentState.collectibles.filter(c => c.id !== cell.id);
      this.currentState.worldGrid = this._buildWorldGrid(this.currentState);
      return true;
    }
    return false;
  }

  private isItemPresent(itemType: 'any' | 'crystal' | 'key' = 'any'): boolean {
    const player = this.getActivePlayer();
    const cell = this.currentState.worldGrid[`${player.x},${player.y},${player.z}`];
    
    if (!cell || cell.type !== 'collectible') return false;
    if (itemType === 'any') return true;

    const item = this.initialGameState.collectibles.find(c => c.id === cell.id);
    return item?.type === itemType;
  }

  private getItemCount(itemType: 'any' | 'crystal' | 'key' = 'any'): number {
    if (itemType === 'any') return this.currentState.collectedIds.length;
    
    const collectedTypes = this.initialGameState.collectibles
      .filter(c => this.currentState.collectedIds.includes(c.id))
      .map(c => c.type);
    
    return collectedTypes.filter(type => type === itemType).length;
  }

  // SỬA ĐỔI: Chỉ trigger portal nếu nhân vật VỪA MỚI di chuyển vào (vị trí trước khác vị trí hiện tại)
  public triggerInteraction(): boolean {
    const player = this.getActivePlayer();
    const cell = this.currentState.worldGrid[`${player.x},${player.y},${player.z}`];
    
    if (cell && cell.type === 'portal') {
      // Kiểm tra xem nhân vật có VỪA MỚI di chuyển vào portal không
      const justMoved = (player.xPrev !== player.x) || (player.zPrev !== player.z);
      
      if (justMoved) {
        player.pose = 'TeleportOut';
        return true;
      }
    }
    return false;
  }

  // THAY ĐỔI: Sau khi teleport, cập nhật xPrev/Z để không trigger lại
  public completeTeleport(): void {
    const player = this.getActivePlayer();
    const posKey = `${player.x},${player.y},${player.z}`;
    const cell = this.currentState.worldGrid[posKey];

    if (cell && cell.type === 'portal' && cell.id) {
      const sourcePortal = this.initialGameState.interactibles.find(i => i.id === cell.id) as Portal | undefined;
      if (sourcePortal) {
        const targetPortal = this.initialGameState.interactibles.find(i => i.id === sourcePortal.targetId) as Portal | undefined;
        if (targetPortal) {
          player.x = targetPortal.position.x;
          player.y = targetPortal.position.y;
          player.z = targetPortal.position.z;
          player.direction = targetPortal.exitDirection ?? player.direction;
          
          // QUAN TRỌNG: Đặt xPrev/Z bằng vị trí hiện tại để portal không trigger lại
          player.xPrev = player.x;
          player.zPrev = player.z;
          
          player.pose = 'TeleportIn';
        }
      }
    }
  }
}