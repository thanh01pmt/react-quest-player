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
const RELOAD_TIME_MS = 500; // Cooldown period for the cannon in milliseconds

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
  lastFiredTime = 0;
  private readonly startX: number;
  private readonly startY: number;
  private readonly startDamage: number;

  constructor(name: string, startX: number, startY: number, damage: number, code: string, index: number) {
    this.id = `${name}-${index}`;
    this.name = name;
    this.code = code;
    this.startX = startX;
    this.startY = startY;
    this.startDamage = damage;

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
      dead: damage >= 100,
      visualizationIndex: index,
    };
  }

  reset() {
    this.state.x = this.startX;
    this.state.y = this.startY;
    this.state.damage = this.startDamage;
    this.state.dead = this.startDamage >= 100;
    this.state.speed = 0;
    this.state.desiredSpeed = 0;
    this.state.heading = this.pointsToAngle(this.startX, this.startY, 50, 50);
    this.state.facing = this.state.heading;
    this.interpreter = null;
    this.lastFiredTime = 0;
  }

  addDamage(damage: number): boolean {
    if (this.state.dead) return false;
    this.state.damage += damage;
    if (this.state.damage >= 100) {
      this.state.damage = 100; // Clamp damage to 100
      this.state.dead = true;
      return true; // Avatar just died
    }
    return false; // Avatar survived
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

  public reset(): void {
    this.ticks = 0;
    this.missiles = [];
    this.events = [];
    for (const avatar of this.avatars) {
        avatar.reset();
    }
  }

  getInitialState(): PondGameState {
    const initialState: PondGameState = {
      avatars: this.avatars.map(a => ({...a.state})),
      missiles: [],
      events: [],
      isFinished: false,
      ticks: 0,
      rank: [],
      isReset: true,
    };
    return initialState;
  }

  execute(userCode: string): void {
    this.reset();
    
    this.avatars.forEach(avatar => {
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
    // Update movement and wall collisions
    for (const avatar of this.avatars) {
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
                const wallCrashX = avatar.state.x;
                const wallCrashY = avatar.state.y;
                avatar.state.x = Math.max(0, Math.min(avatar.state.x, 100));
                avatar.state.y = Math.max(0, Math.min(avatar.state.y, 100));
                const damage = avatar.state.speed / 100 * COLLISION_DAMAGE;
                avatar.state.speed = 0;
                avatar.state.desiredSpeed = 0;
                this.events.push({ type: 'CRASH', avatarId: avatar.id, damage, x: wallCrashX, y: wallCrashY });
                if (avatar.addDamage(damage)) {
                  this.events.push({ type: 'DIE', avatarId: avatar.id });
                }
            }
        }
    }

    // Update avatar-avatar collisions
    for (let i = 0; i < this.avatars.length; i++) {
        const avatarA = this.avatars[i];
        if (avatarA.state.dead) continue;
        for (let j = i + 1; j < this.avatars.length; j++) {
            const avatarB = this.avatars[j];
            if (avatarB.state.dead) continue;

            const dx = avatarA.state.x - avatarB.state.x;
            const dy = avatarA.state.y - avatarB.state.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < COLLISION_RADIUS) {
                const damage = Math.max(avatarA.state.speed, avatarB.state.speed) / 100 * COLLISION_DAMAGE;
                const impactX = (avatarA.state.x + avatarB.state.x) / 2;
                const impactY = (avatarA.state.y + avatarB.state.y) / 2;

                if (avatarA.addDamage(damage)) this.events.push({ type: 'DIE', avatarId: avatarA.id });
                avatarA.state.speed = 0;
                avatarA.state.desiredSpeed = 0;
                this.events.push({ type: 'CRASH', avatarId: avatarA.id, damage, x: impactX, y: impactY });
                
                if (avatarB.addDamage(damage)) this.events.push({ type: 'DIE', avatarId: avatarB.id });
                avatarB.state.speed = 0;
                avatarB.state.desiredSpeed = 0;
                this.events.push({ type: 'CRASH', avatarId: avatarB.id, damage, x: impactX, y: impactY });

                // Physics response: push avatars apart to prevent sticking
                const overlap = COLLISION_RADIUS - distance;
                const adjustX = distance === 0 ? overlap / 2 : (dx / distance) * overlap * 0.5;
                const adjustY = distance === 0 ? overlap / 2 : (dy / distance) * overlap * 0.5;
                
                avatarA.state.x = Math.max(0, Math.min(100, avatarA.state.x + adjustX));
                avatarA.state.y = Math.max(0, Math.min(100, avatarA.state.y + adjustY));
                avatarB.state.x = Math.max(0, Math.min(100, avatarB.state.x - adjustX));
                avatarB.state.y = Math.max(0, Math.min(100, avatarB.state.y - adjustY));
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
            let maxDamage = 0;
            
            for (const avatar of this.avatars) {
                if (avatar.state.dead || avatar.id === missile.ownerId) continue;

                const dx = avatar.state.x - missile.endLoc.x;
                const dy = avatar.state.y - missile.endLoc.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < COLLISION_RADIUS + 2) {
                    const damage = 25;
                    maxDamage = Math.max(maxDamage, damage);
                    if (avatar.addDamage(damage)) {
                        this.events.push({ type: 'DIE', avatarId: avatar.id });
                    }
                }
            }
            this.events.push({ type: 'BOOM', x: missile.endLoc.x, y: missile.endLoc.y, damage: maxDamage });
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
        const now = Date.now();
        if (now - currentAvatar.lastFiredTime < RELOAD_TIME_MS) {
            return;
        }
        currentAvatar.lastFiredTime = now;
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
      resolution = Math.max(1, Math.min(resolution, 20));
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
        const desiredDegree = (degree + 360) % 360;
        if (currentAvatar.state.heading !== desiredDegree) {
            if (currentAvatar.state.speed > 50) {
                // High-speed turn penalty: stop the avatar.
                currentAvatar.state.desiredSpeed = 0;
            } else {
                currentAvatar.state.heading = desiredDegree;
            }
        }
        currentAvatar.state.facing = desiredDegree; // Always update facing direction
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