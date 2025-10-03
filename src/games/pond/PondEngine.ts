// src/games/pond/PondEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, PondConfig, SolutionConfig, GameState } from '../../types';
import type { PondGameState, AvatarState, PondEvent } from './types';

type Interpreter = any;

const STATEMENTS_PER_FRAME = 100;
const MISSILE_SPEED = 3;
const COLLISION_RADIUS = 5;
const AVATAR_SPEED_FACTOR = 1;
const ACCELERATION = 5;
const COLLISION_DAMAGE = 3;

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
      heading: this.pointsToAngle(startX, startY, 50, 50),
      facing: this.pointsToAngle(startX, startY, 50, 50),
      dead: false,
      visualizationIndex: index,
    };
    this.reset();
  }

  reset() {
    this.state.damage = 0;
    this.state.dead = false;
    this.state.speed = 0;
    this.state.desiredSpeed = 0;
    this.interpreter = null;
  }

  private pointsToAngle(x1: number, y1: number, x2: number, y2: number): number {
    // Invert Y-axis for correct angle calculation in game coordinates (0-East, 90-North)
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return (angle + 360) % 360;
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
      const avatar = new Avatar(
        avatarConfig.name,
        avatarConfig.start.x,
        avatarConfig.start.y,
        avatarConfig.damage,
        avatarConfig.isPlayer ? '' : avatarConfig.code || '',
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
    return initialState;
  }

  execute(userCode: string): void {
    this.ticks = 0;
    this.missiles = [];
    this.events = [];
    
    this.avatars.forEach(avatar => {
      avatar.reset();
      const codeToRun = avatar.state.visualizationIndex === 0 ? userCode : avatar.code;
      if (!codeToRun) return;
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
    for (let i = 0; i < STATEMENTS_PER_FRAME; i++) {
        this.ticks++;
        for (const avatar of this.avatars) {
            if (!avatar.state.dead && avatar.interpreter) {
                try {
                    avatar.interpreter.step();
                } catch (e) {
                    console.error(`${avatar.name} interpreter error:`, e);
                    avatar.state.dead = true;
                    this.events.push({ type: 'DIE', avatarId: avatar.id });
                }
            }
        }
    }

    this.updateAvatars();
    this.updateMissiles();

    const nonPlayerSurvivors = this.avatars.filter(a => !a.state.dead && a.state.visualizationIndex !== 0);
    const player = this.avatars.find(a => a.state.visualizationIndex === 0);
    if (nonPlayerSurvivors.length === 0 || (player && player.state.dead)) {
      const finalState = this.getCurrentState();
      finalState.isFinished = true;
      finalState.rank = this.avatars
        .sort((a,b) => (a.state.dead ? 1 : 0) - (b.state.dead ? 1 : 0) || a.state.damage - b.state.damage)
        .map(a => a.id);
      return { done: true, state: finalState };
    }

    const currentState = this.getCurrentState();
    this.events = [];
    return { done: false, state: currentState };
  }
  
  private updateAvatars() {
    for(const avatar of this.avatars) {
        if (avatar.state.dead) continue;

        if (avatar.state.speed < avatar.state.desiredSpeed) {
            avatar.state.speed = Math.min(avatar.state.speed + ACCELERATION, avatar.state.desiredSpeed);
        } else if (avatar.state.speed > avatar.state.desiredSpeed) {
            avatar.state.speed = Math.max(avatar.state.speed - ACCELERATION, avatar.state.desiredSpeed);
        }

        if (avatar.state.speed > 0) {
            const speed = avatar.state.speed / 100 * AVATAR_SPEED_FACTOR;
            const radians = avatar.state.heading * Math.PI / 180;
            avatar.state.x += speed * Math.cos(radians);
            avatar.state.y += speed * Math.sin(radians);

            if (avatar.state.x < 0 || avatar.state.x > 100 || avatar.state.y < 0 || avatar.state.y > 100) {
                avatar.state.x = Math.max(0, Math.min(avatar.state.x, 100));
                avatar.state.y = Math.max(0, Math.min(avatar.state.y, 100));
                const damage = avatar.state.speed / 100 * COLLISION_DAMAGE;
                avatar.state.damage += damage;
                avatar.state.speed = 0;
                avatar.state.desiredSpeed = 0;
                this.events.push({ type: 'CRASH', avatarId: avatar.id, damage });
                if (avatar.state.damage >= 100) avatar.state.dead = true;
            }
        }
    }
  }

  private updateMissiles() {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
        const missile = this.missiles[i];
        missile.progress += MISSILE_SPEED;

        if (missile.progress >= missile.range) {
            this.missiles.splice(i, 1);
            this.events.push({ type: 'BOOM', x: missile.endLoc.x, y: missile.endLoc.y, damage: 10 });
            
            for (const avatar of this.avatars) {
                if (avatar.state.dead || avatar.id === missile.ownerId) continue;

                const dx = avatar.state.x - missile.endLoc.x;
                const dy = avatar.state.y - missile.endLoc.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < COLLISION_RADIUS + 2) {
                    const damage = 25;
                    avatar.state.damage += damage;
                     if (avatar.state.damage >= 100) {
                        avatar.state.dead = true;
                        this.events.push({ type: 'DIE', avatarId: avatar.id });
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
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const toDegrees = (rad: number) => rad * 180 / Math.PI;

    const cannon = (degree: number, range: number) => {
        const startLoc = { x: currentAvatar.state.x, y: currentAvatar.state.y };
        degree = (degree + 360) % 360;
        currentAvatar.state.facing = degree;
        range = Math.max(0, Math.min(range, 70));
        const radians = degree * Math.PI / 180;
        const endLoc = {
            x: startLoc.x + range * Math.cos(radians),
            y: startLoc.y + range * Math.sin(radians),
        };
        this.missiles.push({ avatar: currentAvatar, ownerId: currentAvatar.id, startLoc, endLoc, range, progress: 0 });
    };
    interpreter.setProperty(globalObject, 'cannon', wrap(cannon));

    const scan = (degree: number, resolution = 5): number => {
      degree = (degree + 360) % 360;
      resolution = Math.max(0, Math.min(resolution, 20));
      this.events.push({ type: 'SCAN', avatarId: currentAvatar.id, degree, resolution });
      const scan1 = (degree - resolution / 2 + 360) % 360;
      let scan2 = (degree + resolution / 2 + 360) % 360;
      if (scan1 > scan2) scan2 += 360;
      let closestRange = Infinity;
      for (const enemy of this.avatars) {
        if (enemy === currentAvatar || enemy.state.dead) continue;
        const dx = enemy.state.x - currentAvatar.state.x;
        const dy = enemy.state.y - currentAvatar.state.y;
        const range = Math.sqrt(dx*dx + dy*dy);
        if (range >= closestRange) continue;
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        angle = (angle + 360) % 360;
        if (angle < scan1) angle += 360;
        if (scan1 <= angle && angle <= scan2) {
            closestRange = range;
        }
      }
      return closestRange;
    };
    interpreter.setProperty(globalObject, 'scan', wrap(scan));

    const swim = (degree: number, speed = 50) => {
        degree = (degree + 360) % 360;
        if (currentAvatar.state.speed <= 50) {
            currentAvatar.state.heading = degree;
        }
        currentAvatar.state.facing = degree; // Sync facing with swim direction
        currentAvatar.state.desiredSpeed = Math.max(0, Math.min(speed, 100));
    };
    interpreter.setProperty(globalObject, 'swim', wrap(swim));
    interpreter.setProperty(globalObject, 'drive', wrap(swim));

    interpreter.setProperty(globalObject, 'stop', wrap(() => { currentAvatar.state.desiredSpeed = 0; }));
    interpreter.setProperty(globalObject, 'getX', wrap(() => currentAvatar.state.x));
    interpreter.setProperty(globalObject, 'getY', wrap(() => currentAvatar.state.y));
    interpreter.setProperty(globalObject, 'health', wrap(() => 100 - currentAvatar.state.damage));
    interpreter.setProperty(globalObject, 'speed', wrap(() => currentAvatar.state.speed));
    interpreter.setProperty(globalObject, 'damage', wrap(() => currentAvatar.state.damage));

    const mathObj = interpreter.getProperty(globalObject, 'Math');
    if (mathObj) {
      const wrapMath = (func: Function) => interpreter.createNativeFunction(func);
      interpreter.setProperty(mathObj, 'sin_deg', wrapMath((deg: number) => Math.sin(toRadians(deg))));
      interpreter.setProperty(mathObj, 'cos_deg', wrapMath((deg: number) => Math.cos(toRadians(deg))));
      interpreter.setProperty(mathObj, 'tan_deg', wrapMath((deg: number) => Math.tan(toRadians(deg))));
      interpreter.setProperty(mathObj, 'asin_deg', wrapMath((num: number) => toDegrees(Math.asin(num))));
      interpreter.setProperty(mathObj, 'acos_deg', wrapMath((num: number) => toDegrees(Math.acos(num))));
      interpreter.setProperty(mathObj, 'atan_deg', wrapMath((num: number) => toDegrees(Math.atan(num))));
    }
  }

  checkWinCondition(finalState: GameState, _solutionConfig: SolutionConfig): boolean {
    const finalStateTyped = finalState as PondGameState;
    const player = finalStateTyped.avatars.find(a => a.visualizationIndex === 0);
    const others = finalStateTyped.avatars.filter(a => a.visualizationIndex !== 0);
    return !!(player && !player.dead && others.every(o => o.dead));
  }
}