// src/games/turtle/TurtleEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, GameState, TurtleConfig, SolutionConfig } from '../../types';
import type { TurtleGameState, DrawingCommand, TurtleCharacterState } from './types';

type Interpreter = any;

const EXECUTION_TIMEOUT_TICKS = 100000;
const PAUSE_EVERY_N_STEPS = 1000;

export class TurtleEngine implements IGameEngine {
  private readonly startState: TurtleGameState;
  private currentState!: TurtleGameState;
  private interpreter: Interpreter | null = null;
  private ticks = 0;
  private stepsWithoutPause = 0;

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as TurtleConfig;
    const { direction, ...restOfStart } = config.player.start;
    this.startState = {
      turtle: { ...restOfStart, heading: direction, visible: true },
      commands: [
        { command: 'penColour', colour: '#ffffff' }
      ],
      highlightedBlockId: null,
      result: 'unset',
      isFinished: false,
    };
    this.currentState = this.getInitialState();
  }

  getInitialState(): TurtleGameState {
    return JSON.parse(JSON.stringify(this.startState));
  }

  execute(userCode: string): void {
    this.currentState = this.getInitialState();
    this.interpreter = new Interpreter(userCode, this.initApi.bind(this));
    this.ticks = EXECUTION_TIMEOUT_TICKS;
    this.stepsWithoutPause = 0;
  }

  step(): { done: boolean, state: GameState } | null {
    if (!this.interpreter || this.currentState.isFinished) {
      return null;
    }

    let hasMoreCode = true;
    this.currentState.highlightedBlockId = null;

    while (hasMoreCode) {
      if (this.ticks-- <= 0) {
        this.currentState.result = 'timeout';
        this.currentState.isFinished = true;
        return { done: true, state: this.currentState };
      }
      
      try {
        hasMoreCode = this.interpreter.step();
      } catch (e) {
        console.error('Execution error:', e);
        this.currentState.result = 'error';
        this.currentState.isFinished = true;
        return { done: true, state: this.currentState };
      }

      if (this.currentState.highlightedBlockId) {
        this.stepsWithoutPause = 0;
        return { done: false, state: JSON.parse(JSON.stringify(this.currentState)) };
      }

      if (this.stepsWithoutPause++ > PAUSE_EVERY_N_STEPS) {
        this.stepsWithoutPause = 0;
        return { done: false, state: JSON.parse(JSON.stringify(this.currentState)) };
      }
    }

    this.currentState.isFinished = true;
    // Don't assume success. The QuestPlayer will verify and set the final result.
    this.currentState.result = 'unset'; 
    return { done: true, state: this.currentState };
  }
  
  /**
   * Runs a script in a headless, synchronous mode to generate drawing commands for the solution.
   * @param script The JavaScript solution script.
   * @returns An array of drawing commands.
   */
  public runHeadless(script: string): DrawingCommand[] {
    const localState: { turtle: TurtleCharacterState, commands: DrawingCommand[] } = {
        turtle: JSON.parse(JSON.stringify(this.startState.turtle)),
        commands: [{ command: 'penColour', colour: '#ffffff' }],
    };

    const initApiHeadless = (interpreter: Interpreter, globalObject: any) => {
        const wrap = (func: Function) => interpreter.createNativeFunction(func);
        const move = (dist: number) => {
            const { turtle } = localState;
            if (turtle.penDown) {
                localState.commands.push({ command: 'moveTo', x: turtle.x, y: turtle.y });
            }
            const radians = (turtle.heading * Math.PI) / 180;
            turtle.x += dist * Math.sin(radians);
            turtle.y -= dist * Math.cos(radians);
            if (turtle.penDown) {
                localState.commands.push({ command: 'lineTo', x: turtle.x, y: turtle.y });
                localState.commands.push({ command: 'stroke' });
            }
        };
        const turn = (angle: number) => {
            localState.turtle.heading = (localState.turtle.heading + angle + 360) % 360;
        };
        
        interpreter.setProperty(globalObject, 'moveForward', wrap(move));
        interpreter.setProperty(globalObject, 'moveBackward', wrap((dist: number) => move(-dist)));
        interpreter.setProperty(globalObject, 'turnRight', wrap(turn));
        interpreter.setProperty(globalObject, 'turnLeft', wrap((angle: number) => turn(-angle)));
        // Other APIs can be added here if solution scripts need them.
    };

    try {
        const interpreter = new Interpreter(script, initApiHeadless);
        interpreter.run();
    } catch (e) {
        console.error("Error running solution script:", e);
        return [];
    }
    return localState.commands;
  }

  /**
   * Compares two ImageData objects to see if they match within a tolerance.
   * @param userImageData The user's drawing.
   * @param solutionImageData The solution's drawing.
   * @param tolerance The number of pixels allowed to be different.
   * @returns True if the drawings match, false otherwise.
   */
  public verifySolution(userImageData: ImageData, solutionImageData: ImageData, tolerance: number): boolean {
    const len = Math.min(userImageData.data.length, solutionImageData.data.length);
    let delta = 0;
    // Pixels are in RGBA format. We only need to check the Alpha channel.
    for (let i = 3; i < len; i += 4) {
      if (Math.abs(userImageData.data[i] - solutionImageData.data[i]) > 64) {
        delta++;
      }
    }
    return delta <= tolerance;
  }

  checkWinCondition(_finalState: GameState, _solutionConfig: SolutionConfig): boolean {
    // This method is now legacy for Turtle, as verification happens in QuestPlayer.
    return true; 
  }

  private initApi(interpreter: Interpreter, globalObject: any): void {
    const wrap = (func: (...args: any[]) => any) => interpreter.createNativeFunction(func.bind(this));
    
    interpreter.setProperty(globalObject, 'moveForward', wrap(this.move));
    interpreter.setProperty(globalObject, 'moveBackward', wrap((dist: number, id: string) => this.move(-dist, id)));
    interpreter.setProperty(globalObject, 'turnRight', wrap(this.turn));
    interpreter.setProperty(globalObject, 'turnLeft', wrap((angle: number, id: string) => this.turn(-angle, id)));
    interpreter.setProperty(globalObject, 'penUp', wrap((id: string) => this.penDown(false, id)));
    interpreter.setProperty(globalObject, 'penDown', wrap((id: string) => this.penDown(true, id)));
    interpreter.setProperty(globalObject, 'penWidth', wrap(this.penWidth));
    interpreter.setProperty(globalObject, 'penColour', wrap(this.penColour));
    interpreter.setProperty(globalObject, 'hideTurtle', wrap((id: string) => this.isVisible(false, id)));
    interpreter.setProperty(globalObject, 'showTurtle', wrap((id: string) => this.isVisible(true, id)));
    interpreter.setProperty(globalObject, 'print', wrap(() => {}));
    interpreter.setProperty(globalObject, 'font', wrap(() => {}));
  }

  private highlight(id?: string): void {
    if (id) {
      const match = id.match(/^block_id_([^']+)$/);
      this.currentState.highlightedBlockId = match ? match[1] : null;
    }
  }

  private move(distance: number, id?: string): void {
    const { turtle } = this.currentState;
    if (turtle.penDown) {
      this.currentState.commands.push({ command: 'moveTo', x: turtle.x, y: turtle.y });
    }
    const radians = (turtle.heading * Math.PI) / 180;
    turtle.x += distance * Math.sin(radians);
    turtle.y -= distance * Math.cos(radians);
    if (turtle.penDown) {
      this.currentState.commands.push({ command: 'lineTo', x: turtle.x, y: turtle.y });
      this.currentState.commands.push({ command: 'stroke' });
    }
    this.highlight(id);
  }

  private turn(angle: number, id?: string): void {
    this.currentState.turtle.heading = (this.currentState.turtle.heading + angle + 360) % 360;
    this.highlight(id);
  }

  private penDown(isDown: boolean, id?: string): void {
    this.currentState.turtle.penDown = isDown;
    this.highlight(id);
  }

  private penWidth(width: number, id?: string): void {
    this.currentState.commands.push({ command: 'penWidth', width });
    this.highlight(id);
  }

  private penColour(colour: string, id?: string): void {
    this.currentState.commands.push({ command: 'penColour', colour });
    this.highlight(id);
  }
  
  private isVisible(visible: boolean, id?: string): void {
    this.currentState.turtle.visible = visible;
    this.highlight(id);
  }
}