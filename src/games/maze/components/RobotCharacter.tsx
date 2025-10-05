// src/games/maze/components/RobotCharacter.tsx

import React, { useState, useRef, useEffect, forwardRef } from 'react';
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
    const [effectiveAnimation, setEffectiveAnimation] = useState('Idle');

    const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
    const { actions, mixer } = useAnimations(animations, ref as React.RefObject<THREE.Group>);

    const currentPosition = useRef(new THREE.Vector3().copy(position));
    const targetPosition = useRef(new THREE.Vector3().copy(position));
    const startTime = useRef(0);
    const isTweening = useRef(false);
    const tweenDuration = 1.0; // Adjust this value based on desired movement speed (in seconds)

    useEffect(() => {
      console.log('Available animations in draco-robot.glb:', animations.map(a => a.name));
    }, [animations]);

    useEffect(() => {
      const targetAnimationName = ANIMATION_MAP[effectiveAnimation] || ANIMATION_MAP.Idle;
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

        const clipDuration = newAction.getClip().duration;
        newAction.timeScale = clipDuration / tweenDuration; // Adjust speed to match tween duration

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
                }
            };
            mixer.addEventListener('finished', onFinished);
        } else {
            newAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
        }
      }
    }, [effectiveAnimation, actions, mixer]);

    useEffect(() => {
      const group = (ref as React.RefObject<THREE.Group>).current;
      if (!group) return;

      if (['Walking', 'Jumping'].includes(animationName) && !group.position.equals(position)) {
        currentPosition.current.copy(group.position);
        targetPosition.current.copy(position);
        startTime.current = performance.now() / 1000;
        isTweening.current = true;
        setEffectiveAnimation(animationName);
      } else {
        currentPosition.current.copy(position);
        group.position.copy(position);
        isTweening.current = false;
        setEffectiveAnimation(animationName);
      }
    }, [position, animationName]);

    useFrame((state, delta) => {
      const group = (ref as React.RefObject<THREE.Group>).current;
      if (!group) return;

      const targetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, DIRECTION_TO_ROTATION[direction], 0)
      );
      group.quaternion.slerp(targetQuaternion, delta * 10);

      if (isTweening.current) {
        const time = performance.now() / 1000;
        let t = (time - startTime.current) / tweenDuration;
        if (t > 1) {
          t = 1;
          isTweening.current = false;
          if (effectiveAnimation === 'Walking') {
            setEffectiveAnimation('Idle');
          }
        }

        const lerpedPosition = new THREE.Vector3().lerpVectors(
          currentPosition.current,
          targetPosition.current,
          t
        );

        group.position.copy(lerpedPosition);

        if (effectiveAnimation === 'Jumping') {
          const arcHeight = TILE_SIZE / 2;
          group.position.y += Math.sin(t * Math.PI) * arcHeight;
        }
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