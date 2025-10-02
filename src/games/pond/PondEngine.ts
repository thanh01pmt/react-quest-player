// src/games/pond/PondEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, PondConfig, SolutionConfig, GameState } from '../../types';
import type { PondGameState, AvatarState, PondEvent } from './types';

type Interpreter = any;

const STATEMENTS_PER_FRAME = 100;
const MISSILE_SPEED = 3;
const COLLISION_RADIUS = 5;

// Internal type for missile simulation
interface Missile {
  avatar: Avatar;
  ownerId: string;
  startLoc: { x: number; y: number };
  endLoc: { x: number; y: number };
  range: number;
  progress: number;
}

// A simple class to manage the state and interpreter of a single avatar
class Avatar {
  id: string;
  name: string;
  state: AvatarState;
  interpreter: Interpreter | null = null;
  code: string;

  constructor(name: string, startX: number, startY: number, damage: number, code: string, index: number) {
    this.id = `${name}-${index}`;
    this.name = name;
    this.code = code;
    this.state = {
      id: this.id,
      name: this.name,
      x: startX,
      y: startY,
      damage: damage,
      speed: 0,
      desiredSpeed: 0,
      heading: 0,
      facing: 0,
      dead: false,
      visualizationIndex: index,
    };
    this.reset();
  }

  reset() {
    // Reset mutable state properties
    this.state.damage = 0;
    this.state.dead = false;
    this.interpreter = null;
  }
}

export class PondEngine implements IGameEngine {
  private avatars: Avatar[] = [];
  private missiles: Missile[] = [];
  private events: PondEvent[] = [];
  private ticks = 0;

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as PondConfig;
    config.avatars.forEach((avatarConfig, index) => {
      const code = avatarConfig.isPlayer ? '' : avatarConfig.code || '';
      const avatar = new Avatar(
        avatarConfig.name,
        avatarConfig.start.x,
        avatarConfig.start.y,
        avatarConfig.damage,
        code,
        index
      );
      this.avatars.push(avatar);
    });
  }

  getInitialState(): PondGameState {
    const initialState = {
      avatars: this.avatars.map(a => ({...a.state})),
      missiles: [],
      events: [],
      isFinished: false,
      ticks: 0,
      rank: [],
    };
    console.log("DEBUG: PondEngine.getInitialState() returned:", initialState); // DEBUG LINE ADDED
    return initialState;
  }

  execute(userCode: string): void {
    this.ticks = 0;
    this.missiles = [];
    this.events = [];
    
    this.avatars.forEach(avatar => {
      avatar.reset();
      const codeToRun = avatar.state.visualizationIndex === 0 ? userCode : avatar.code;
      try {
        avatar.interpreter = new Interpreter(codeToRun, (interpreter: any, globalObject: any) => {
          this.initApi(interpreter, globalObject, avatar);
        });
      } catch (e) {
        console.error(`Error initializing interpreter for ${avatar.name}:`, e);
        avatar.state.dead = true;
      }
    });
  }

  step(): { done: boolean; state: PondGameState } | null {
    // 1. Execute some code for each avatar
    for (let i = 0; i < STATEMENTS_PER_FRAME; i++) {
        this.ticks++;
        for (const avatar of this.avatars) {
            if (!avatar.state.dead && avatar.interpreter) {
                try {
                    avatar.interpreter.step();
                } catch (e) {
                    console.error(`${avatar.name} interpreter error:`, e);
                    avatar.state.dead = true;
                }
            }
        }
    }

    // 2. Update missiles
    this.updateMissiles();

    // 3. Update avatars (movement, collisions, etc. - simplified for now)
    // To be implemented in later steps

    // 4. Check for game over condition
    const survivors = this.avatars.filter(a => !a.state.dead && a.state.visualizationIndex !== 0);
    if (survivors.length === 0) {
      this.events.push({ type: 'DIE', avatarId: 'Target-1' }); // Mock event
      const finalState = this.getCurrentState();
      finalState.isFinished = true;
      return { done: true, state: finalState };
    }

    const currentState = this.getCurrentState();
    this.events = []; // Clear events after each step
    return { done: false, state: currentState };
  }
  
  private updateMissiles() {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
        const missile = this.missiles[i];
        missile.progress += MISSILE_SPEED;

        if (missile.progress >= missile.range) {
            this.missiles.splice(i, 1);
            this.events.push({ type: 'BOOM', x: missile.endLoc.x, y: missile.endLoc.y, damage: 10 });
            
            // Check for damage
            for (const avatar of this.avatars) {
                if (avatar.state.dead || avatar.id === missile.ownerId) continue;

                const dx = avatar.state.x - missile.endLoc.x;
                const dy = avatar.state.y - missile.endLoc.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < COLLISION_RADIUS + 2) { // Allow a small blast radius
                    avatar.state.damage += 25; // Simplified damage model
                    if (avatar.state.damage >= 100) {
                        avatar.state.dead = true;
                    }
                }
            }
        }
    }
  }

  private getCurrentState(): PondGameState {
    return {
      avatars: this.avatars.map(a => ({...a.state})),
      missiles: this.missiles.map(m => {
        const progress = m.progress / m.range;
        const dx = (m.endLoc.x - m.startLoc.x) * progress;
        const dy = (m.endLoc.y - m.startLoc.y) * progress;
        const halfRange = m.range / 2;
        const xAxis = m.progress - halfRange;
        const parabola = (m.range * 0.15) - Math.pow(xAxis / Math.sqrt(m.range * 0.15) * (m.range * 0.15) / halfRange, 2);

        return {
            ownerId: m.avatar.id,
            x: m.startLoc.x + dx,
            y: m.startLoc.y + dy - parabola,
            shadowY: m.startLoc.y + dy,
            parabola: parabola,
        };
      }),
      events: [...this.events],
      isFinished: false,
      ticks: this.ticks,
      rank: [],
    };
  }

  private initApi(interpreter: any, globalObject: any, currentAvatar: Avatar) {
    const wrap = (func: Function) => interpreter.createNativeFunction(func);

    const cannon = (degree: number, range: number) => {
        const startLoc = { x: currentAvatar.state.x, y: currentAvatar.state.y };
        degree = (degree + 360) % 360;
        currentAvatar.state.facing = degree;
        range = Math.max(0, Math.min(range, 70));

        const radians = ((degree - 90) * Math.PI) / 180;
        const endLoc = {
            x: startLoc.x + range * Math.cos(radians),
            y: startLoc.y + range * Math.sin(radians),
        };
        
        this.missiles.push({
            avatar: currentAvatar,
            ownerId: currentAvatar.id,
            startLoc,
            endLoc,
            range,
            progress: 0,
        });
    };
    interpreter.setProperty(globalObject, 'cannon', wrap(cannon));

    // Add stubs for other functions
    interpreter.setProperty(globalObject, 'scan', wrap(() => Infinity));
    interpreter.setProperty(globalObject, 'swim', wrap(() => {}));
    interpreter.setProperty(globalObject, 'stop', wrap(() => {}));
    interpreter.setProperty(globalObject, 'getX', wrap(() => currentAvatar.state.x));
    interpreter.setProperty(globalObject, 'getY', wrap(() => currentAvatar.state.y));
    interpreter.setProperty(globalObject, 'health', wrap(() => 100 - currentAvatar.state.damage));
    interpreter.setProperty(globalObject, 'speed', wrap(() => currentAvatar.state.speed));
  }

  checkWinCondition(_finalState: GameState, _solutionConfig: SolutionConfig): boolean {
    return true; // Win condition is determined by the engine's internal state
  }
}