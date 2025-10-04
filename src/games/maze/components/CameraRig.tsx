// src/games/maze/components/CameraRig.tsx

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { gsap } from 'gsap';
import type { CameraMode } from '../../../types';

const FOLLOW_LERP_FACTOR = 0.08; // Độ mượt khi camera đi theo
const TRANSITION_DURATION = 1.0; // Thời gian chuyển đổi giữa các chế độ (giây)

interface CameraRigProps {
  targetRef: React.RefObject<THREE.Group>;
  mode: CameraMode;
}

export const CameraRig: React.FC<CameraRigProps> = ({ targetRef, mode }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !targetRef.current) return;

    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);

    const robotPosition = targetRef.current.position;
    const lookAtTarget = new THREE.Vector3(robotPosition.x, robotPosition.y + 1, robotPosition.z);

    switch (mode) {
      case 'Follow':
        controls.enabled = false;
        break;

      case 'TopDown':
        controls.enabled = true;
        controls.enablePan = true;
        controls.enableRotate = false;
        controls.enableZoom = true;

        gsap.to(camera.position, {
          duration: TRANSITION_DURATION,
          x: robotPosition.x,
          y: robotPosition.y + 20,
          z: robotPosition.z + 0.01,
          ease: 'power2.inOut',
        });
        gsap.to(controls.target, {
          duration: TRANSITION_DURATION,
          ...lookAtTarget,
          ease: 'power2.inOut',
        });
        break;

      case 'Free':
        controls.enabled = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.enableZoom = true;
        break;
    }
  }, [mode, targetRef, camera]);

  useFrame(() => {
    if (!targetRef.current || !controlsRef.current) return;

    const robotPosition = targetRef.current.position;
    const lookAtTarget = robotPosition.clone().add(new THREE.Vector3(0, 1, 0));

    if (mode === 'Follow') {
      const robotQuaternion = targetRef.current.quaternion;
      const offset = new THREE.Vector3(0, 6, 10);
      offset.applyQuaternion(robotQuaternion);
      const cameraTargetPosition = robotPosition.clone().add(offset);
      
      camera.position.lerp(cameraTargetPosition, FOLLOW_LERP_FACTOR);
      camera.lookAt(lookAtTarget);
      
      // Keep controls target updated even when disabled for smooth transitions
      controlsRef.current.target.copy(lookAtTarget);
      controlsRef.current.update();
    } else {
      // For TopDown and Free mode, OrbitControls handles everything,
      // but we can still smoothly update the target if the robot moves.
      if (controlsRef.current.target.distanceTo(lookAtTarget) > 0.1) {
         controlsRef.current.target.lerp(lookAtTarget, FOLLOW_LERP_FACTOR);
      }
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.05}
      screenSpacePanning={false}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
};