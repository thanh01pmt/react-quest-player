// src/games/maze/Maze3DRenderer.tsx

import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { IGameRenderer as IGameRendererBase, MazeConfig, CameraMode, Block } from '../../types';
import type { MazeGameState } from './types';
import { RobotCharacter } from './components/RobotCharacter';
import { CameraRig } from './components/CameraRig';
import BlockComponent from './components/Block';

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
      {/* SỬA LỖI: Luôn có gameConfig.blocks vì đã được chuẩn hóa */}
      {gameConfig.blocks!.map((block, index) => (
        <BlockComponent 
          key={index} 
          modelKey={block.modelKey} 
          position={[
            block.position.x * TILE_SIZE, 
            block.position.y * TILE_SIZE, 
            block.position.z * TILE_SIZE
          ]} 
        />
      ))}

      <FinishMarker 
        position={[
          gameConfig.finish.x * TILE_SIZE,
          (gameConfig.finish.y - 1) * TILE_SIZE + TILE_SIZE / 2,
          // SỬA LỖI: Luôn có gameConfig.finish.z vì đã được chuẩn hóa
          gameConfig.finish.z! * TILE_SIZE
        ]} 
      />
      
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
    
    // LỚP TƯƠNG THÍCH (COMPATIBILITY LAYER)
    const normalizedConfig = useMemo((): MazeConfig => {
      const config = gameConfig as MazeConfig;
      if (config.map) {
        // Đây là config 2D, cần chuyển đổi
        const blocks: Block[] = [];
        for (let y = 0; y < config.map.length; y++) {
          for (let x = 0; x < config.map[y].length; x++) {
            const cell = config.map[y][x];
            if (cell === SquareType.WALL) {
              blocks.push({ modelKey: 'wall.brick01', position: { x, y: 0, z: y } });
            } else if (cell !== 0) {
              blocks.push({ modelKey: 'ground.normal', position: { x, y: 0, z: y } });
            }
          }
        }
        return {
          ...config,
          blocks: blocks,
          finish: { ...config.finish, z: config.finish.y }, // Thêm z cho finish
        };
      }
      // Đây là config 3D, trả về trực tiếp
      return config;
    }, [gameConfig]);


    if (!mazeState || !normalizedConfig) return null;

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
        
        <Scene gameConfig={normalizedConfig} gameState={mazeState} robotRef={robotRef} />
      </Canvas>
    );
};