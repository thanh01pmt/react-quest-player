// src/games/maze/MazeEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, GameState, MazeConfig, SolutionConfig } from '../../types';
import type { MazeGameState, Direction, ResultType } from './types';

const SquareType = { WALL: 0, OPEN: 1, START: 2, FINISH: 3 };
const EXECUTION_TIMEOUT_TICKS = 10000;

export class MazeEngine implements IGameEngine {
  private readonly map: number[][];
  private readonly start: { x: number; y: number; direction: Direction };
  private readonly finish: { x: number; y: number };

  private currentState!: MazeGameState;
  private log!: MazeGameState[];

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as MazeConfig;
    this.map = config.map;
    this.start = config.player.start;
    this.finish = config.finish;
  }

  getInitialState(): MazeGameState {
    return {
      player: { ...this.start },
      result: 'unset',
      isFinished: false,
    };
  }

  execute(userCode: string): GameState[] {
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
    
    // If the player succeeded, add the victory animation frames to the log
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
    return state.player.x === this.finish.x && state.player.y === this.finish.y;
  }

  // --- Engine's Internal API ---

  private moveForward(): void {
    if (!this.isPath(0)) throw new Error('Hit a wall');
    const { player } = this.currentState;
    if (player.direction === 0) player.y--;
    else if (player.direction === 1) player.x++;
    else if (player.direction === 2) player.y++;
    else if (player.direction === 3) player.x--;
    this.logState();
  }

  private turnLeft(): void {
    this.currentState.player.direction = this.constrainDirection(this.currentState.player.direction - 1);
    this.logState();
  }

  private turnRight(): void {
    this.currentState.player.direction = this.constrainDirection(this.currentState.player.direction + 1);
    this.logState();
  }

  private isPath(relativeDirection: 0 | 1 | 3): boolean {
    const effectiveDirection = this.constrainDirection(this.currentState.player.direction + relativeDirection);
    let { x, y } = this.currentState.player;
    if (effectiveDirection === 0) y--;
    else if (effectiveDirection === 1) x++;
    else if (effectiveDirection === 2) y++;
    else if (effectiveDirection === 3) x--;
    const square = this.map[y] && this.map[y][x];
    return square !== SquareType.WALL && square !== undefined;
  }

  private notDone(): boolean {
    return this.currentState.player.x !== this.finish.x || this.currentState.player.y !== this.finish.y;
  }

  // --- Helper Methods ---

  private logState(): void {
    this.log.push(JSON.parse(JSON.stringify(this.currentState)));
  }
  
  // ADDED: Helper to append victory animation frames
  private logVictoryAnimation(): void {
    this.currentState.player.pose = 'victory1';
    this.logState();
    this.currentState.player.pose = 'victory2';
    this.logState();
    this.currentState.player.pose = 'victory1';
    this.logState();
    delete this.currentState.player.pose; // Return to normal pose
    this.logState();
  }

  private constrainDirection(d: number): Direction {
    d = Math.round(d) % 4;
    if (d < 0) d += 4;
    return d as Direction;
  }
}