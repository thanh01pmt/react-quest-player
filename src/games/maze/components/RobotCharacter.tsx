// src/games/maze/components/RobotCharacter.tsx

import React, { useEffect, forwardRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import type { Direction } from '../types';

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
}

const TILE_SIZE = 2;

export const RobotCharacter = forwardRef<THREE.Group, RobotCharacterProps>(
  ({ position, direction, animationName }, ref) => {
    
    const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
    const { actions, mixer } = useAnimations(animations, ref as React.RefObject<THREE.Group>);

    useEffect(() => {
      console.log('Available animations in draco-robot.glb:', animations.map(a => a.name));
    }, [animations]);

    useEffect(() => {
      const targetAnimationName = ANIMATION_MAP[animationName] || ANIMATION_MAP.Idle;
      const newAction = actions[targetAnimationName];

      if (!newAction) {
        console.warn(`Animation not found: ${targetAnimationName}`);
        return;
      }
      
      const activeAction = Object.values(actions).find(a => a && a.isRunning());
      
      if (newAction !== activeAction) {
        if (activeAction) {
          activeAction.fadeOut(0.2);
        }

        if (ONE_SHOT_ANIMATIONS.includes(animationName)) {
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
                }
            };
            mixer.addEventListener('finished', onFinished);

        } else {
            newAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
        }
      }
    }, [animationName, actions, mixer]);

    // SỬA LỖI: Thêm kiểu dữ liệu cho callback của useFrame
    useFrame((state, delta) => {
      const group = (ref as React.RefObject<THREE.Group>).current;
      if (!group) return;
      
      group.position.lerp(position, delta * 10);
      const targetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, DIRECTION_TO_ROTATION[direction], 0)
      );
      group.quaternion.slerp(targetQuaternion, delta * 10);
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
      <group ref={ref} dispose={null}>
        <primitive 
          object={scene} 
          scale={TILE_SIZE/2*0.68}
        />
      </group>
    );
  }
);

useGLTF.preload(ROBOT_MODEL_PATH);