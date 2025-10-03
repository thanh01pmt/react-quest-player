// src/games/maze/Maze3DRenderer.tsx

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { IGameRenderer, MazeConfig } from '../../types';
import type { MazeGameState, Direction, PlayerState } from './types';

const TILE_SIZE = 2;
const WALL_HEIGHT = 1.5;
const PATH_HEIGHT = 0.2;

const SquareType = { WALL: 0, OPEN: 1, START: 2, FINISH: 3 };

// --- Helper Components ---

const Tile: React.FC<{ position: [number, number, number]; type: 'wall' | 'path' }> = React.memo(({ position, type }) => {
  const height = type === 'wall' ? WALL_HEIGHT : PATH_HEIGHT;
  const color = type === 'wall' ? '#4a2c2c' : '#d2b48c';
  
  // Place the top of the path at y=0
  return (
    <mesh position={[position[0], position[1] + height / 2 - PATH_HEIGHT, position[2]]}>
      <boxGeometry args={[TILE_SIZE, height, TILE_SIZE]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});

const FinishMarker: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const height = 0.5;
    return (
        // Place the bottom of the cylinder at y=0
        <mesh position={[position[0], height / 2, position[2]]}>
            <cylinderGeometry args={[TILE_SIZE / 4, TILE_SIZE / 4, height, 32]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
        </mesh>
    );
};

const Player: React.FC<{ playerState: PlayerState }> = ({ playerState }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const targetPosition = useRef(new THREE.Vector3());
  const targetQuaternion = useRef(new THREE.Quaternion());

  const capsuleArgs: [radius?: number, length?: number, capSegments?: number, radialSegments?: number] = [0.5, 0.5];
  const capsuleBottomToCenter = (capsuleArgs[1]! / 2) + capsuleArgs[0]!;

  const directionToRotationY = useMemo((): Record<Direction, number> => ({
    0: Math.PI,      // North (z-)
    1: -Math.PI / 2, // East (x+)
    2: 0,            // South (z+)
    3: Math.PI / 2,  // West (x-)
  }), []);

  useEffect(() => {
    const { x, y, direction } = playerState;
    // Map (x, y) from map data to (x, z) in 3D space
    targetPosition.current.set(
      x * TILE_SIZE,
      capsuleBottomToCenter, // Place the bottom of the capsule at y=0
      y * TILE_SIZE
    );

    // Cập nhật góc quay mục tiêu
    const euler = new THREE.Euler(0, directionToRotationY[direction], 0);
    targetQuaternion.current.setFromEuler(euler);

  }, [playerState, directionToRotationY, capsuleBottomToCenter]);

  useFrame((_, delta) => {
    // Nội suy mượt mà vị trí và góc quay
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPosition.current, delta * 10);
      groupRef.current.quaternion.slerp(targetQuaternion.current, delta * 10);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <capsuleGeometry args={capsuleArgs} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

const Scene: React.FC<{ gameConfig: MazeConfig; gameState: MazeGameState }> = ({ gameConfig, gameState }) => {
  const mapCenterOffset = useMemo(() => {
    const mapWidth = gameConfig.map[0].length * TILE_SIZE;
    const mapHeight = gameConfig.map.length * TILE_SIZE;
    return { x: -mapWidth / 2 + TILE_SIZE / 2, z: -mapHeight / 2 + TILE_SIZE / 2 };
  }, [gameConfig.map]);

  return (
    <group position={[mapCenterOffset.x, 0, mapCenterOffset.z]}>
      {/* Render Map Tiles */}
      {gameConfig.map.map((row, y) =>
        row.map((cell, x) => {
          const type = cell === SquareType.WALL ? 'wall' : 'path';
          return <Tile key={`${x}-${y}`} position={[x * TILE_SIZE, 0, y * TILE_SIZE]} type={type} />;
        })
      )}
      {/* Render Finish Marker */}
      <FinishMarker position={[gameConfig.finish.x * TILE_SIZE, 0, gameConfig.finish.y * TILE_SIZE]} />
      {/* Render Player */}
      <Player playerState={gameState.player} />
    </group>
  );
};

// --- Main Renderer Component ---

export const Maze3DRenderer: IGameRenderer = ({ gameState, gameConfig }) => {
    const mazeState = gameState as MazeGameState;
    const mazeConfig = gameConfig as MazeConfig;

    if (!mazeState || !mazeConfig) return null;

    return (
      <Canvas
        camera={{ position: [0, 20, 25], fov: 50 }}
        shadows
      >
        <color attach="background" args={['#1a0c2b']} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <OrbitControls />
        <Scene gameConfig={mazeConfig} gameState={mazeState} />
      </Canvas>
    );
};