// src/games/maze/MazeEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, GameState, MazeConfig, SolutionConfig, Block } from '../../types';
import type { MazeGameState, Direction, ResultType, PlayerState } from './types';

const EXECUTION_TIMEOUT_TICKS = 10000;

export class MazeEngine implements IGameEngine {
  private readonly blocks: Block[];
  private readonly blockSet: Set<string>; // For fast lookups: 'x,y,z'
  private readonly start: PlayerState;
  private readonly finish: { x: number; y: number; z: number };

  private currentState!: MazeGameState;
  private log!: MazeGameState[];

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as MazeConfig;
    this.blocks = config.blocks;
    this.finish = config.finish;
    
    this.blockSet = new Set(this.blocks.map(b => `${b.position.x},${b.position.y},${b.position.z}`));

    // SỬA LỖI: Khởi tạo PlayerState 3D đầy đủ
    this.start = {
      x: config.player.start.x,
      y: config.player.start.y,
      z: config.player.start.z,
      direction: config.player.start.direction,
      pose: 'Idle',
    };
  }

  getInitialState(): MazeGameState {
    return {
      player: { ...this.start },
      result: 'unset',
      isFinished: false,
    };
  }

  execute(userCode: string, onHighlight: (blockId: string) => void): GameState[] {
    this.currentState = this.getInitialState();
    this.log = [this.getInitialState()];

    const initApi = (interpreter: any, globalObject: any) => {
      const wrapper = (func: (...args: any[]) => any) => interpreter.createNativeFunction(func.bind(this));
      interpreter.setProperty(globalObject, 'moveForward', wrapper(this.moveForward));
      interpreter.setProperty(globalObject, 'turnLeft', wrapper(this.turnLeft));
      interpreter.setProperty(globalObject, 'turnRight', wrapper(this.turnRight));
      interpreter.setProperty(globalObject, 'isPathForward', wrapper(() => this.isPath(0)));
      interpreter.setProperty(globalObject, 'isPathRight', wrapper(() => this.isPath(1)));
      interpreter.setProperty(globalObject, 'isPathLeft', wrapper(() => this.isPath(3)));
      interpreter.setProperty(globalObject, 'notDone', wrapper(this.notDone));

      const highlightWrapper = (id: string) => {
        const realId = id ? id.replace('block_id_', '') : '';
        onHighlight(realId);
      };
      interpreter.setProperty(globalObject, 'highlightBlock', interpreter.createNativeFunction(highlightWrapper));
    };

    const interpreter = new Interpreter(userCode, initApi);
    let result: ResultType = 'unset';

    try {
      let ticks = EXECUTION_TIMEOUT_TICKS;
      while (interpreter.step()) {
        if (ticks-- <= 0) throw new Error('Timeout');
      }
      result = this.notDone() ? 'failure' : 'success';
    } catch (e: any) {
      result = e.message === 'Timeout' ? 'timeout' : 'error';
    }
    
    if (result === 'success') {
      this.logVictoryAnimation();
    }
    
    this.currentState.isFinished = true;
    this.currentState.result = result;
    this.log.push(JSON.parse(JSON.stringify(this.currentState)));
    
    return this.log;
  }

  checkWinCondition(finalState: GameState, _solutionConfig: SolutionConfig): boolean {
    const state = finalState as MazeGameState;
    // SỬA LỖI: So sánh cả 3 tọa độ
    return state.player.x === this.finish.x && state.player.y === this.finish.y && state.player.z === this.finish.z;
  }

  // SỬA LỖI: Hàm này hoạt động trên mặt phẳng XZ
  private getNextPosition(x: number, z: number, direction: Direction): { x: number, z: number } {
    if (direction === 0) z--; // North
    else if (direction === 1) x++; // East
    else if (direction === 2) z++; // South
    else if (direction === 3) x--; // West
    return { x, z };
  }
  
  private isWalkable(x: number, y: number, z: number): boolean {
    const posStr = `${x},${y},${z}`;
    const groundStr = `${x},${y - 1},${z}`;
    return !this.blockSet.has(posStr) && this.blockSet.has(groundStr);
  }

  private moveForward(): void {
    const { player } = this.currentState;
    // SỬA LỖI: Sử dụng player.z cho chiều sâu
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, player.direction);

    let targetY: number | null = null;
    if (this.isWalkable(nextX, player.y + 1, nextZ)) {
      targetY = player.y + 1;
    } else if (this.isWalkable(nextX, player.y, nextZ)) {
      targetY = player.y;
    } else if (this.isWalkable(nextX, player.y - 1, nextZ)) {
      targetY = player.y - 1;
    }

    if (targetY === null) {
      throw new Error('Hit a wall');
    }

    player.pose = 'Walking';
    this.logState();
    
    player.x = nextX;
    player.y = targetY;
    player.z = nextZ; // SỬA LỖI: Cập nhật player.z
    this.logState();

    player.pose = 'Idle';
    this.logState();
  }

  private turnLeft(): void {
    this.currentState.player.direction = this.constrainDirection(this.currentState.player.direction - 1);
    this.currentState.player.pose = 'Idle';
    this.logState();
  }

  private turnRight(): void {
    this.currentState.player.direction = this.constrainDirection(this.currentState.player.direction + 1);
    this.currentState.player.pose = 'Idle';
    this.logState();
  }

  private isPath(relativeDirection: 0 | 1 | 3): boolean {
    const { player } = this.currentState;
    const effectiveDirection = this.constrainDirection(player.direction + relativeDirection);
    // SỬA LỖI: Sử dụng player.z cho chiều sâu
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, effectiveDirection);

    return (
      this.isWalkable(nextX, player.y + 1, nextZ) ||
      this.isWalkable(nextX, player.y, nextZ) ||
      this.isWalkable(nextX, player.y - 1, nextZ)
    );
  }

  private notDone(): boolean {
    const { player } = this.currentState;
    // SỬA LỖI: So sánh cả 3 tọa độ
    return player.x !== this.finish.x || player.y !== this.finish.y || player.z !== this.finish.z;
  }

  private logState(): void {
    this.log.push(JSON.parse(JSON.stringify(this.currentState)));
  }
  
  private logVictoryAnimation(): void {
    this.currentState.player.pose = 'Victory';
    this.logState();
    this.logState();
    this.currentState.player.pose = 'Idle';
    this.logState();
  }

  private constrainDirection(d: number): Direction {
    d = Math.round(d) % 4;
    if (d < 0) d += 4;
    return d as Direction;
  }
}