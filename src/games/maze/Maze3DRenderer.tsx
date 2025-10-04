// src/games/maze/Maze3DRenderer.tsx

import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { IGameRenderer as IGameRendererBase, MazeConfig, CameraMode } from '../../types';
import type { MazeGameState } from './types';
import { RobotCharacter } from './components/RobotCharacter';
import { CameraRig } from './components/CameraRig';
import Block from './components/Block';

interface IGameRenderer extends IGameRendererBase {
  cameraMode?: CameraMode;
}

const TILE_SIZE = 2;
const SquareType = { WALL: 0, OPEN: 1, START: 2, FINISH: 3 };

// --- Helper Components ---

const FinishMarker: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const height = 0.5;
    const radius = TILE_SIZE / 4;
    return (
        <mesh position={[position[0], position[1] + height / 2, position[2]]}>
            <cylinderGeometry args={[radius, radius, height, 32]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
        </mesh>
    );
};

const Scene: React.FC<{ gameConfig: MazeConfig; gameState: MazeGameState; robotRef: React.RefObject<THREE.Group> }> = ({ gameConfig, gameState, robotRef }) => {
  const robotPosition = useMemo(() => {
    return new THREE.Vector3(
        gameState.player.x * TILE_SIZE,
        TILE_SIZE,
        gameState.player.y * TILE_SIZE
    );
  }, [gameState.player.x, gameState.player.y]);


  return (
    <group>
      {/* Render Map Tiles from GLB models */}
      {gameConfig.map.map((row, y) =>
        row.map((cell, x) => {
          let modelKey = 'ground.normal'; 
          if (cell === SquareType.WALL) {
            modelKey = 'wall.brick01'; 
          }
          
          return <Block key={`${x}-${y}`} modelKey={modelKey} position={[x * TILE_SIZE, 0, y * TILE_SIZE]} />;
        })
      )}

      {/* Render Finish Marker */}
      <FinishMarker position={[gameConfig.finish.x * TILE_SIZE, TILE_SIZE, gameConfig.finish.y * TILE_SIZE]} />
      
      {/* SỬA LỖI: Xóa group bọc ngoài và truyền ref trực tiếp vào RobotCharacter */}
      <RobotCharacter 
        ref={robotRef}
        position={robotPosition} 
        direction={gameState.player.direction}
        animationName={gameState.player.pose || 'Idle'}
      />
    </group>
  );
};

// --- Main Renderer Component ---

export const Maze3DRenderer: IGameRenderer = ({ gameState, gameConfig, cameraMode = 'Follow' }) => {
    const robotRef = useRef<THREE.Group>(null);
    const mazeState = gameState as MazeGameState;
    const mazeConfig = gameConfig as MazeConfig;

    if (!mazeState || !mazeConfig) return null;

    return (
      <Canvas
        camera={{ position: [10, 20, 25], fov: 50 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#1a0c2b']} />
        <fog attach="fog" args={['#1a0c2b', 20, 50]} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        <CameraRig targetRef={robotRef} mode={cameraMode} />
        
        <Scene gameConfig={mazeConfig} gameState={mazeState} robotRef={robotRef} />
      </Canvas>
    );
};