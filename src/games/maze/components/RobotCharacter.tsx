// src/games/maze/components/RobotCharacter.tsx

import React, { useEffect, forwardRef } from 'react';
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

    const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
    const { actions, mixer } = useAnimations(animations, groupRef);

    const tweenDuration = 0.8;

    // useEffect to manage PLAYING animations
    useEffect(() => {
      const targetAnimationName = ANIMATION_MAP[animationName] || ANIMATION_MAP.Idle;
      const newAction = actions[targetAnimationName];
      if (!newAction) return;
      
      const activeAction = Object.values(actions).find(a => a && a.isRunning());
      if (newAction === activeAction) return;

      if (activeAction) activeAction.fadeOut(0.2);

      if (animationName === 'Walking') {
        const clipDuration = newAction.getClip().duration;
        newAction.timeScale = clipDuration / tweenDuration;
      } else {
        newAction.timeScale = 1;
      }

      if (ONE_SHOT_ANIMATIONS.includes(animationName)) {
          newAction.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.2).play();
          newAction.clampWhenFinished = true;
          const onFinished = (event: any) => {
              if (event.action === newAction) {
                  mixer.removeEventListener('finished', onFinished);
                  console.log('%c[RobotCharacter] Calling onTweenComplete() from One-Shot Animation FINISHED.', 'color: #e74c3c; font-weight: bold;');
              }
          };
          mixer.addEventListener('finished', onFinished);
      } else {
          newAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
      }
    }, [animationName, actions, mixer, onTweenComplete]);

    // useEffect to manage MOVEMENT (tweens)
    useEffect(() => {
      const group = groupRef.current;
      if (!group) return;

      console.group(`%c[RobotCharacter] useEffect Triggered`, 'color: #9b59b6; font-weight: bold;');
      console.log('Received props:', { animationName, targetPosition: { x: position.x, y: position.y, z: position.z } });
      console.log('Current visual position:', { x: group.position.x, y: group.position.y, z: group.position.z });

      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.scale);
      group.scale.set(1, 1, 1);

      const isMoveAnimation = ['Walking', 'Jumping'].includes(animationName);

      if (animationName === 'Bump') {
        console.log('-> Executing LOGIC BRANCH: Bump');
        const bumpOffset = new THREE.Vector3(0, 0, BUMP_DISTANCE).applyQuaternion(group.quaternion);
        const bumpPosition = new THREE.Vector3().copy(group.position).add(bumpOffset);
        gsap.to(group.position, {
          x: bumpPosition.x, y: bumpPosition.y, z: bumpPosition.z,
          duration: BUMP_DURATION, ease: 'power2.out', yoyo: true, repeat: 1,
          onComplete: () => {
            console.log('%c[RobotCharacter] Calling onTweenComplete() from Bump.', 'color: #e74c3c; font-weight: bold;');
            onTweenComplete();
          }
        });
        console.groupEnd();
        return;
      }
      
      if (animationName === 'TeleportOut') {
        console.log('-> Executing LOGIC BRANCH: TeleportOut');
        gsap.to(group.scale, {
          x: 0.01, y: 0.01, z: 0.01,
          duration: TELEPORT_DURATION, ease: 'power2.in',
          onComplete: () => {
            console.log('%c[RobotCharacter] Calling onTeleportOutComplete().', 'color: #e74c3c; font-weight: bold;');
            if (onTeleportOutComplete) onTeleportOutComplete();
          }
        });
        console.groupEnd();
        return;
      }

      if (animationName === 'TeleportIn') {
        console.log('-> Executing LOGIC BRANCH: TeleportIn');
        group.position.copy(position);
        group.scale.set(0.01, 0.01, 0.01);
        gsap.to(group.scale, {
          x: 1, y: 1, z: 1,
          duration: TELEPORT_DURATION, ease: 'power2.out',
          onComplete: () => {
            console.log('%c[RobotCharacter] Calling onTweenComplete() from TeleportIn.', 'color: #e74c3c; font-weight: bold;');
            onTweenComplete();
          }
        });
        console.groupEnd();
        return;
      }

      if (isMoveAnimation) {
        console.log('-> Executing LOGIC BRANCH: Movement');
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
            console.log('%c[RobotCharacter] Calling onTweenComplete() from Movement.', 'color: #e74c3c; font-weight: bold;');
            onTweenComplete();
          }
        });
        console.groupEnd();
        return;
      }
      
      console.log('-> Executing LOGIC BRANCH: Static Pose');
      group.position.copy(position);
      // if (!ONE_SHOT_ANIMATIONS.includes(animationName)) {
      //   console.log('%c[RobotCharacter] Calling onTweenComplete() from Static Pose.', 'color: #e74c3c; font-weight: bold;');
      //   onTweenComplete();
      // }
      console.groupEnd();
      
    }, [position, animationName, onTweenComplete, onTeleportOutComplete, groupRef]);

    useFrame((_, delta) => {
      const group = groupRef.current;
      if (!group) return;
      const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, DIRECTION_TO_ROTATION[direction], 0));
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