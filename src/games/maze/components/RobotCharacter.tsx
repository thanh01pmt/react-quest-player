// src/games/maze/components/RobotCharacter.tsx

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { gsap } from 'gsap';
import type { Direction } from '../types';

const ROBOT_MODEL_PATH = '/assets/maze/models/draco-robot.glb';

const ANIMATION_MAP: { [key: string]: string } = {
  Idle: 'Idle',
  Walking: 'Walking',
  Victory: 'Wave',
  Jumping: 'Jump',
  // No animation for Bump, it will be handled by code
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
}

const TILE_SIZE = 2;
const BUMP_DISTANCE = TILE_SIZE * 0.15;
const BUMP_DURATION = 0.15;

export const RobotCharacter = forwardRef<THREE.Group, RobotCharacterProps>(
  ({ position, direction, animationName, onTweenComplete }, ref) => {
    const groupRef = ref as React.RefObject<THREE.Group>;
    const [effectiveAnimation, setEffectiveAnimation] = useState('Idle');

    const { scene, animations } = useGLTF(ROBOT_MODEL_PATH);
    const { actions, mixer } = useAnimations(animations, groupRef);

    const currentPosition = useRef(new THREE.Vector3().copy(position));
    const targetPosition = useRef(new THREE.Vector3().copy(position));
    const isTweening = useRef(false);
    const tweenDuration = 0.8;

    useEffect(() => {
      const targetAnimationName = ANIMATION_MAP[effectiveAnimation] || ANIMATION_MAP.Idle;
      const newAction = actions[targetAnimationName];

      if (!newAction) {
        console.warn(`Animation not found: ${targetAnimationName}`);
        return;
      }
      
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

      // Kill any previous tweens on this object to avoid conflicts
      gsap.killTweensOf(group.position);
      isTweening.current = false;

      const isMoveAnimation = ['Walking', 'Jumping'].includes(animationName);
      
      if (animationName === 'Bump') {
        const bumpOffset = new THREE.Vector3(0, 0, BUMP_DISTANCE).applyQuaternion(group.quaternion);
        const bumpPosition = new THREE.Vector3().copy(group.position).add(bumpOffset);
        
        // Use GSAP for a quick bump and return animation
        gsap.to(group.position, {
          x: bumpPosition.x,
          y: bumpPosition.y,
          z: bumpPosition.z,
          duration: BUMP_DURATION,
          ease: 'power2.out',
          yoyo: true, // Go back to the start
          repeat: 1,
          onComplete: () => {
            group.position.copy(position); // Ensure final position is correct
            setEffectiveAnimation('Idle');
            onTweenComplete();
          }
        });
        return; // Stop further processing for Bump
      }

      if (isMoveAnimation && !group.position.equals(position)) {
        currentPosition.current.copy(group.position);
        targetPosition.current.copy(position);
        isTweening.current = true;
        setEffectiveAnimation(animationName);
      } else {
        currentPosition.current.copy(position);
        group.position.copy(position);
        isTweening.current = false;
        setEffectiveAnimation(animationName);
        if (!isMoveAnimation) {
          onTweenComplete();
        }
      }
    }, [position, animationName, onTweenComplete, groupRef]);

    useFrame((state, delta) => {
      const group = groupRef.current;
      if (!group) return;

      const targetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, DIRECTION_TO_ROTATION[direction], 0)
      );
      if (!group.quaternion.equals(targetQuaternion)) {
        group.quaternion.slerp(targetQuaternion, delta * 10);
      }

      if (isTweening.current) {
        const t = Math.min(1, (state.clock.elapsedTime * 1000 - (gsap.timeline().time() * 1000 - tweenDuration * 1000)) / (tweenDuration * 1000));
        
        gsap.to(group.position, {
          x: targetPosition.current.x,
          y: targetPosition.current.y,
          z: targetPosition.current.z,
          duration: tweenDuration,
          ease: 'linear',
          onUpdate: () => {
            if (effectiveAnimation === 'Jumping') {
              const progress = gsap.getProperty(group.position, "x") / targetPosition.current.x; // Simplified progress
              const arcHeight = TILE_SIZE / 2;
              group.position.y += Math.sin(progress * Math.PI) * arcHeight;
            }
          },
          onComplete: () => {
            isTweening.current = false;
            setEffectiveAnimation('Idle');
            onTweenComplete();
          }
        });
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
      <group ref={groupRef} dispose={null}>
        <primitive 
          object={scene} 
          scale={TILE_SIZE/2*0.68}
        />
      </group>
    );
  }
);

useGLTF.preload(ROBOT_MODEL_PATH);