// src/games/maze/components/RobotCharacter.tsx

import React, { useEffect, useRef } from 'react';
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

export const RobotCharacter: React.FC<RobotCharacterProps> = ({ position, direction, animationName }) => {
  const groupRef = useRef<THREE.Group>(null!);

  const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
  const { actions } = useAnimations(animations, groupRef);

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
    if (!groupRef.current) return;
    groupRef.current.position.lerp(position, delta * 10);
    const targetQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, DIRECTION_TO_ROTATION[direction], 0)
    );
    groupRef.current.quaternion.slerp(targetQuaternion, delta * 10);
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
    <group ref={groupRef} dispose={null}>
      {/* SỬA LỖI: Cập nhật scale và position-y cho robot */}
      <primitive 
        object={scene} 
        scale={0.6} // Giảm kích thước robot một chút so với ô
        position-y={TILE_SIZE} // Nâng robot lên để đứng trên sàn
      />
    </group>
  );
};

useGLTF.preload(ROBOT_MODEL_PATH);