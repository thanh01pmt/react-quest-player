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
    // SỬA LỖI: Sử dụng công thức tính toán độ cao Y chính xác.
    // Độ cao của mặt sàn = (y của khối bên dưới) * TILE_SIZE + nửa chiều cao khối
    const groundY = (gameState.player.y - 1) * TILE_SIZE;
    const surfaceY = groundY + TILE_SIZE / 2;

    return new THREE.Vector3(
        gameState.player.x * TILE_SIZE,
        surfaceY,
        gameState.player.z * TILE_SIZE
    );
  }, [gameState.player.x, gameState.player.y, gameState.player.z]);


  return (
    <group>
      {/* Render các khối từ mảng gameConfig.blocks */}
      {gameConfig.blocks.map((block, index) => (
        <Block 
          key={index} 
          modelKey={block.modelKey} 
          position={[
            block.position.x * TILE_SIZE, 
            block.position.y * TILE_SIZE, 
            block.position.z * TILE_SIZE
          ]} 
        />
      ))}

      {/* Render Finish Marker tại vị trí 3D */}
      <FinishMarker 
        position={[
          gameConfig.finish.x * TILE_SIZE, 
          // SỬA LỖI: Tính toán độ cao Y cho marker tương tự robot
          (gameConfig.finish.y - 1) * TILE_SIZE + TILE_SIZE / 2,
          gameConfig.finish.z * TILE_SIZE
        ]} 
      />
      
      {/* Robot được render tại vị trí 3D đã tính toán */}
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