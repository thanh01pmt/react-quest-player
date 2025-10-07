// src/games/maze/components/RobotCharacter.tsx

import React, { useState, useEffect, forwardRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { gsap } from 'gsap';
import type { Direction } from '../../../types';

const ROBOT_MODEL_PATH = '/assets/maze/models/draco-robot.glb';

const ANIMATION_MAP: { [key: string]: string } = {
  Idle: 'Idle',
  Walking: 'Walking',
  Victory: 'Wave',
  Jumping: 'Jump',
};

const ONE_SHOT_ANIMATIONS = ['Victory', 'Jumping'];

const DIRECTION_TO_ROTATION: Record<Direction, number> = {
  0: Math.PI,
  1: Math.PI / 2,
  2: 0,
  3: -Math.PI / 2,
};

interface RobotCharacterProps {
  position: THREE.Vector3;
  direction: Direction;
  animationName: string;
  onTweenComplete: () => void;
  onTeleportOutComplete?: () => void;
}

const TILE_SIZE = 2;
const BUMP_DISTANCE = TILE_SIZE * 0.15;
const BUMP_DURATION = 0.15;
const TELEPORT_DURATION = 0.5;

export const RobotCharacter = forwardRef<THREE.Group, RobotCharacterProps>(
  ({ position, direction, animationName, onTweenComplete, onTeleportOutComplete }, ref) => {
    const groupRef = ref as React.RefObject<THREE.Group>;
    const [effectiveAnimation, setEffectiveAnimation] = useState('Idle');

    const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
    const { actions, mixer } = useAnimations(animations, groupRef);

    const tweenDuration = 0.8;

    useEffect(() => {
      const targetAnimationName = ANIMATION_MAP[effectiveAnimation] || ANIMATION_MAP.Idle;
      const newAction = actions[targetAnimationName];

      if (!newAction) return;
      
      const activeAction = Object.values(actions).find(a => a && a.isRunning());
      
      if (newAction !== activeAction) {
        if (activeAction) activeAction.fadeOut(0.2);

        if (effectiveAnimation === 'Walking') {
          const clipDuration = newAction.getClip().duration;
          newAction.timeScale = clipDuration / tweenDuration;
        } else {
          newAction.timeScale = 1;
        }

        if (ONE_SHOT_ANIMATIONS.includes(effectiveAnimation)) {
            newAction.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.2).play();
            newAction.clampWhenFinished = true;

            const onFinished = (event: any) => {
                if (event.action === newAction) {
                    const idleAction = actions[ANIMATION_MAP.Idle];
                    if (idleAction) {
                        newAction.fadeOut(0.2);
                        idleAction.reset().fadeIn(0.2).play();
                    }
                    mixer.removeEventListener('finished', onFinished);
                    onTweenComplete();
                }
            };
            mixer.addEventListener('finished', onFinished);
        } else {
            newAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
        }
      }
    }, [effectiveAnimation, actions, mixer, onTweenComplete]);

    useEffect(() => {
      const group = groupRef.current;
      if (!group) return;

      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.scale);

      const isMoveAnimation = ['Walking', 'Jumping'].includes(animationName);

      // Safety net: If a move animation is requested but we are already at the target,
      // just complete the action immediately to avoid getting stuck.
      if (isMoveAnimation && group.position.equals(position)) {
        setEffectiveAnimation('Idle');
        onTweenComplete();
        return;
      }
      
      if (animationName === 'Bump') {
        const bumpOffset = new THREE.Vector3(0, 0, BUMP_DISTANCE).applyQuaternion(group.quaternion);
        const bumpPosition = new THREE.Vector3().copy(group.position).add(bumpOffset);
        
        gsap.to(group.position, {
          x: bumpPosition.x, y: bumpPosition.y, z: bumpPosition.z,
          duration: BUMP_DURATION, ease: 'power2.out', yoyo: true, repeat: 1,
          onComplete: () => {
            group.position.copy(position);
            setEffectiveAnimation('Idle');
            onTweenComplete();
          }
        });
        return;
      }
      
      if (animationName === 'TeleportOut') {
        setEffectiveAnimation('Idle');
        gsap.to(group.scale, {
          x: 0.01, y: 0.01, z: 0.01,
          duration: TELEPORT_DURATION, ease: 'power2.in',
          onComplete: () => {
            if (onTeleportOutComplete) onTeleportOutComplete();
          }
        });
        return;
      }

      if (animationName === 'TeleportIn') {
        group.position.copy(position);
        group.scale.set(0.01, 0.01, 0.01);
        setEffectiveAnimation('Idle');
        gsap.to(group.scale, {
          x: 1, y: 1, z: 1,
          duration: TELEPORT_DURATION, ease: 'power2.out',
          onComplete: () => {
            onTweenComplete();
          }
        });
        return;
      }

      group.scale.set(1, 1, 1);

      if (isMoveAnimation && !group.position.equals(position)) {
        setEffectiveAnimation(animationName);
        const startY = group.position.y;
        gsap.to(group.position, {
          x: position.x, y: position.y, z: position.z,
          duration: tweenDuration, ease: 'linear',
          onUpdate: function() {
            if (animationName === 'Jumping') {
              const progress = this.progress();
              group.position.y = startY + Math.sin(progress * Math.PI) * (TILE_SIZE / 2);
            }
          },
          onComplete: () => {
            setEffectiveAnimation('Idle');
            onTweenComplete();
          }
        });
      } else {
        group.position.copy(position);
        setEffectiveAnimation(animationName);
        if (!isMoveAnimation) {
          onTweenComplete();
        }
      }
    }, [position, animationName, onTweenComplete, onTeleportOutComplete, groupRef]);

    useFrame((_, delta) => {
      const group = groupRef.current;
      if (!group) return;

      const targetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, DIRECTION_TO_ROTATION[direction], 0)
      );
      if (!group.quaternion.equals(targetQuaternion)) {
        group.quaternion.slerp(targetQuaternion, delta * 10);
      }
    });
    
    useEffect(() => {
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [scene]);

    return (
      <group ref={groupRef} dispose={null} scale={1}>
        <primitive 
          object={scene} 
          scale={TILE_SIZE/2*0.68}
        />
      </group>
    );
  }
);

useGLTF.preload(ROBOT_MODEL_PATH);