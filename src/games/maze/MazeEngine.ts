// src/games/maze/MazeEngine.ts

import Interpreter from 'js-interpreter';
// SỬA LỖI: Xóa ResultType khỏi import
import type { IGameEngine, GameConfig, GameState, MazeConfig, SolutionConfig, Block, StepResult } from '../../types';
import type { MazeGameState, Direction, PlayerState } from './types';

const STEPS_PER_FRAME = 100;
const SquareType = { WALL: 0, OPEN: 1, START: 2, FINISH: 3 };

export class MazeEngine implements IGameEngine {
  private readonly blocks: Block[];
  private readonly blockSet: Set<string>;
  private readonly start: PlayerState;
  private readonly finish: { x: number; y: number; z: number };

  private currentState!: MazeGameState;
  
  // SỬA LỖI: Sử dụng 'any' cho interpreter
  private interpreter: any | null = null;
  private onHighlightCallback: (id: string) => void = () => {};
  private highlightedBlockId: string | null = null;

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as MazeConfig;
    
    if (config.map) {
      this.blocks = [];
      for (let y = 0; y < config.map.length; y++) {
        for (let x = 0; x < config.map[y].length; x++) {
          const cell = config.map[y][x];
          if (cell === SquareType.WALL) {
            this.blocks.push({ modelKey: 'wall.brick01', position: { x, y: 0, z: y } });
          } else if (cell !== 0) {
            this.blocks.push({ modelKey: 'ground.normal', position: { x, y: 0, z: y } });
          }
        }
      }
      this.start = {
        x: config.player.start.x,
        y: 1,
        z: config.player.start.y,
        direction: config.player.start.direction,
        pose: 'Idle'
      };
      this.finish = {
        x: config.finish.x,
        y: 1,
        z: config.finish.y,
      };
    } else if (config.blocks) {
      this.blocks = config.blocks;
      this.start = {
        x: config.player.start.x,
        y: config.player.start.y,
        z: config.player.start.z!,
        direction: config.player.start.direction,
        pose: 'Idle'
      };
      this.finish = {
        x: config.finish.x,
        y: config.finish.y,
        z: config.finish.z!,
      };
    } else {
      throw new Error("Invalid MazeConfig: must contain 'map' or 'blocks'");
    }
    
    this.blockSet = new Set(this.blocks.map(b => `${b.position.x},${b.position.y},${b.position.z}`));
  }

  getInitialState(): MazeGameState {
    return {
      player: { ...this.start },
      result: 'unset',
      isFinished: false,
    };
  }

  execute(userCode: string, onHighlight: (blockId: string) => void): void {
    this.currentState = this.getInitialState();
    this.onHighlightCallback = onHighlight;
    this.highlightedBlockId = null;

    const initApi = (interpreter: any, globalObject: any) => {
      const wrapper = (func: (...args: any[]) => any) => interpreter.createNativeFunction(func.bind(this));
      interpreter.setProperty(globalObject, 'moveForward', wrapper(this.moveForward));
      interpreter.setProperty(globalObject, 'turnLeft', wrapper(this.turnLeft));
      interpreter.setProperty(globalObject, 'turnRight', wrapper(this.turnRight));
      interpreter.setProperty(globalObject, 'jump', wrapper(this.jump));
      interpreter.setProperty(globalObject, 'isPathForward', wrapper(() => this.isPath(0)));
      interpreter.setProperty(globalObject, 'isPathRight', wrapper(() => this.isPath(1)));
      interpreter.setProperty(globalObject, 'isPathLeft', wrapper(() => this.isPath(3)));
      interpreter.setProperty(globalObject, 'notDone', wrapper(this.notDone));

      const highlightWrapper = (id: string) => {
        const realId = id ? id.replace('block_id_', '') : '';
        this.highlightedBlockId = realId;
        this.onHighlightCallback(realId);
      };
      interpreter.setProperty(globalObject, 'highlightBlock', interpreter.createNativeFunction(highlightWrapper));
    };

    this.interpreter = new Interpreter(userCode, initApi);
  }

  step(): StepResult {
    if (!this.interpreter || this.currentState.isFinished) {
      return null;
    }

    this.highlightedBlockId = null;
    let hasMoreCode = false;

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
        try {
            hasMoreCode = this.interpreter.step();
        } catch (e) {
            this.currentState.result = 'error';
            this.currentState.isFinished = true;
            return { done: true, state: this.currentState, highlightedBlockId: this.highlightedBlockId };
        }
        if (!hasMoreCode || this.highlightedBlockId) {
            break;
        }
    }

    if (!hasMoreCode) {
        this.currentState.result = this.notDone() ? 'failure' : 'success';
        if (this.currentState.result === 'success') {
            this.logVictoryAnimation();
        }
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
    return state.player.x === this.finish.x && state.player.y === this.finish.y && state.player.z === this.finish.z;
  }

  private getNextPosition(x: number, z: number, direction: Direction): { x: number, z: number } {
    if (direction === 0) z--;
    else if (direction === 1) x++;
    else if (direction === 2) z++;
    else if (direction === 3) x--;
    return { x, z };
  }
  
  private isWalkable(x: number, y: number, z: number): boolean {
    const posStr = `${x},${y},${z}`;
    const groundStr = `${x},${y - 1},${z}`;
    return !this.blockSet.has(posStr) && this.blockSet.has(groundStr);
  }

  private moveForward(): void {
    const { player } = this.currentState;
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, player.direction);

    let targetY: number | null = null;
    if (this.isWalkable(nextX, player.y, nextZ)) {
      targetY = player.y;
    } else if (this.isWalkable(nextX, player.y - 1, nextZ)) {
      targetY = player.y - 1;
    }

    if (targetY === null) {
      throw new Error('Hit a wall');
    }

    player.pose = 'Walking';
    player.x = nextX;
    player.y = targetY;
    player.z = nextZ;
  }

  private jump(): void {
    const { player } = this.currentState;
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
    this.currentState.player.direction = this.constrainDirection(this.currentState.player.direction - 1);
    this.currentState.player.pose = 'Idle';
  }

  private turnRight(): void {
    this.currentState.player.direction = this.constrainDirection(this.currentState.player.direction + 1);
    this.currentState.player.pose = 'Idle';
  }

  private isPath(relativeDirection: 0 | 1 | 3): boolean {
    const { player } = this.currentState;
    const effectiveDirection = this.constrainDirection(player.direction + relativeDirection);
    const { x: nextX, z: nextZ } = this.getNextPosition(player.x, player.z, effectiveDirection);

    return (
      this.isWalkable(nextX, player.y + 1, nextZ) ||
      this.isWalkable(nextX, player.y, nextZ) ||
      this.isWalkable(nextX, player.y - 1, nextZ)
    );
  }

  private notDone(): boolean {
    const { player } = this.currentState;
    return player.x !== this.finish.x || player.y !== this.finish.y || player.z !== this.finish.z;
  }
  
  private logVictoryAnimation(): void {
    this.currentState.player.pose = 'Victory';
  }

  private constrainDirection(d: number): Direction {
    d = Math.round(d) % 4;
    if (d < 0) d += 4;
    return d as Direction;
  }
}