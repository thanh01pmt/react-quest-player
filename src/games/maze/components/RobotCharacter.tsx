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
};

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

// SỬA LỖI: Bọc component trong `forwardRef`
export const RobotCharacter = forwardRef<THREE.Group, RobotCharacterProps>(
  ({ position, direction, animationName }, ref) => {
    
    // `ref` được truyền từ component cha sẽ được sử dụng trực tiếp
    // nên không cần `useRef` nội bộ nữa.

    const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
    // `useAnimations` giờ sẽ sử dụng `ref` được truyền vào
    const { actions } = useAnimations(animations, ref as React.RefObject<THREE.Group>);

    useEffect(() => {
      console.log('Available animations in draco-robot.glb:', animations.map(a => a.name));
    }, [animations]);

    useEffect(() => {
      const targetAnimation = ANIMATION_MAP[animationName] || ANIMATION_MAP.Idle;
      const newAction = actions[targetAnimation];

      if (newAction) {
        const activeAction = Object.values(actions).find(a => a && a.isRunning());
        if (newAction !== activeAction) {
          if (activeAction) {
            activeAction.fadeOut(0.2);
          }
          newAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
        }
      }
    }, [animationName, actions]);

    useFrame((_, delta) => {
      // `ref` bây giờ là một forwardRef, cần kiểm tra `ref.current`
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
      // SỬA LỖI: Gắn `ref` được truyền vào trực tiếp cho group này.
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