// src/games/maze/MazeEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, GameState, MazeConfig, SolutionConfig, StepResult, PlayerConfig, Block } from '../../types';
import type { MazeGameState, Direction, PlayerState } from './types';

export class MazeEngine implements IGameEngine {
  public readonly gameType = 'maze';

  private readonly initialGameState: MazeGameState;
  private readonly finish: { x: number; y: number; z: number };
  
  private currentState!: MazeGameState;
  private interpreter: any | null = null;
  private highlightedBlockId: string | null = null;
  private executedAction: boolean = false;

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as MazeConfig;
    
    // Normalize players from old/new config format
    const players: PlayerConfig[] = config.players || (config.player ? [{ ...config.player, id: 'player1' }] : []);
    const playerStates: { [id: string]: PlayerState } = {};
    for (const p of players) {
      playerStates[p.id] = {
        id: p.id,
        x: p.start.x,
        y: p.start.y ?? 1,
        z: p.start.z ?? p.start.y,
        direction: p.start.direction,
        pose: 'Idle'
      };
    }

    this.initialGameState = {
      blocks: this.normalizeBlocks(config),
      collectibles: config.collectibles || [],
      interactibles: config.interactibles || [],
      players: playerStates,
      activePlayerId: players[0]?.id || '',
      collectedIds: [],
      interactiveStates: (config.interactibles || []).reduce((acc, item) => {
        acc[item.id] = item.initialState;
        return acc;
      }, {} as { [id: string]: string }),
      result: 'unset',
      isFinished: false,
    };

    this.finish = {
      x: config.finish.x,
      y: config.finish.y,
      z: config.finish.z ?? config.finish.y,
    };

    this.currentState = this.getInitialState();
  }

  private normalizeBlocks(config: MazeConfig): Block[] {
    if (config.blocks) return config.blocks;
    if (config.map) {
      const blocks: Block[] = [];
      for (let y = 0; y < config.map.length; y++) {
        for (let x = 0; x < config.map[y].length; x++) {
          const cell = config.map[y][x];
          if (cell === 0) { // WALL
            blocks.push({ modelKey: 'wall.brick01', position: { x, y: 0, z: y } });
          } else if (cell !== 0) { // OPEN, START, FINISH
            blocks.push({ modelKey: 'ground.normal', position: { x, y: 0, z: y } });
          }
        }
      }
      return blocks;
    }
    return [];
  }

  getInitialState(): MazeGameState {
    // Deep copy to prevent mutation of the initial state
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

      // Movement API
      interpreter.setProperty(globalObject, 'moveForward', createWrapper(this.moveForward.bind(this), true));
      interpreter.setProperty(globalObject, 'turnLeft', createWrapper(this.turnLeft.bind(this), true));
      interpreter.setProperty(globalObject, 'turnRight', createWrapper(this.turnRight.bind(this), true));
      interpreter.setProperty(globalObject, 'jump', createWrapper(this.jump.bind(this), true));

      // Conditional API
      interpreter.setProperty(globalObject, 'isPathForward', createWrapper(this.isPath.bind(this, 0), false));
      interpreter.setProperty(globalObject, 'isPathRight', createWrapper(this.isPath.bind(this, 1), false));
      interpreter.setProperty(globalObject, 'isPathLeft', createWrapper(this.isPath.bind(this, 3), false));
      interpreter.setProperty(globalObject, 'notDone', createWrapper(this.notDone.bind(this), false));
      
      // New Item API
      interpreter.setProperty(globalObject, 'collectItem', createWrapper(this.collectItem.bind(this), true));
      interpreter.setProperty(globalObject, 'isItemPresent', createWrapper(this.isItemPresent.bind(this), false));
      interpreter.setProperty(globalObject, 'getItemCount', createWrapper(this.getItemCount.bind(this), false));
      
      // New Build API (Placeholders)
      interpreter.setProperty(globalObject, 'placeBlock', createWrapper(() => {}, true)); // Placeholder
      interpreter.setProperty(globalObject, 'removeBlock', createWrapper(() => {}, true)); // Placeholder
    };

    this.interpreter = new Interpreter(userCode, initApi);
  }
  
  step(): StepResult {
    if (!this.interpreter || this.currentState.isFinished) {
      return null;
    }

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

    if (!hasMoreCode) {
        this.currentState.result = this.notDone() ? 'failure' : 'success';
        if (this.currentState.result === 'success') {
            this.logVictoryAnimation();
        }
        this.currentState.isFinished = true;
    }
    
    const result = {
        done: this.currentState.isFinished,
        state: JSON.parse(JSON.stringify(this.currentState)),
        highlightedBlockId: this.highlightedBlockId
    };
    this.highlightedBlockId = null; 
    return result;
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
  
  private isWalkable(x: number, y: number, z: number): boolean {
    const blockSet = new Set(this.currentState.blocks.map(b => `${b.position.x},${b.position.y},${b.position.z}`));
    const posStr = `${x},${y},${z}`;
    const groundStr = `${x},${y - 1},${z}`;
    return !blockSet.has(posStr) && blockSet.has(groundStr);
  }

  private moveForward(): void {
    const player = this.getActivePlayer();
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, player.direction);

    let targetY: number | null = null;
    if (this.isWalkable(nextX, player.y, nextZ)) {
      targetY = player.y;
    } else if (this.isWalkable(nextX, player.y - 1, nextZ)) {
      targetY = player.y - 1;
    }

    if (targetY === null) throw new Error('Hit a wall');

    player.pose = 'Walking';
    player.x = nextX;
    player.y = targetY;
    player.z = nextZ;
  }

  private jump(): void {
    const player = this.getActivePlayer();
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, player.direction);

    if (this.isWalkable(nextX, player.y + 1, nextZ)) {
        player.pose = 'Jumping';
        player.x = nextX;
        player.y = player.y + 1;
        player.z = nextZ;
    } else {
        throw new Error('Cannot jump there');
    }
  }

  private turnLeft(): void {
    const player = this.getActivePlayer();
    player.direction = this.constrainDirection(player.direction - 1);
    player.pose = 'Idle';
  }

  private turnRight(): void {
    const player = this.getActivePlayer();
    player.direction = this.constrainDirection(player.direction + 1);
    player.pose = 'Idle';
  }

  private isPath(relativeDirection: 0 | 1 | 3): boolean {
    const player = this.getActivePlayer();
    const effectiveDirection = this.constrainDirection(player.direction + relativeDirection);
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, effectiveDirection);

    return (
      this.isWalkable(nextX, player.y + 1, nextZ) ||
      this.isWalkable(nextX, player.y, nextZ) ||
      this.isWalkable(nextX, player.y - 1, nextZ)
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

  // --- New Item and Build APIs ---

  private collectItem(): boolean {
    const player = this.getActivePlayer();
    const itemIndex = this.currentState.collectibles.findIndex(c => 
      c.position.x === player.x &&
      c.position.y === player.y &&
      c.position.z === player.z &&
      !this.currentState.collectedIds.includes(c.id)
    );

    if (itemIndex !== -1) {
      const item = this.currentState.collectibles[itemIndex];
      this.currentState.collectedIds.push(item.id);
      // In a unified model, we remove the item from the world
      this.currentState.collectibles.splice(itemIndex, 1);
      return true;
    }
    return false;
  }

  private isItemPresent(itemType: 'any' | 'crystal' | 'key' = 'any'): boolean {
    const player = this.getActivePlayer();
    return this.currentState.collectibles.some(c => 
      c.position.x === player.x &&
      c.position.y === player.y &&
      c.position.z === player.z &&
      (itemType === 'any' || c.type === itemType)
    );
  }

  private getItemCount(itemType: 'any' | 'crystal' | 'key' = 'any'): number {
    if (itemType === 'any') {
      return this.currentState.collectedIds.length;
    }
    const collectedTypes = this.initialGameState.collectibles
      .filter(c => this.currentState.collectedIds.includes(c.id))
      .map(c => c.type);
    
    return collectedTypes.filter(type => type === itemType).length;
  }
}