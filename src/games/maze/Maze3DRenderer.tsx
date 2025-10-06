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
  onActionComplete?: () => void; // THÊM MỚI
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

// THÊM MỚI: Truyền onActionComplete xuống Scene
const Scene: React.FC<{ gameConfig: MazeConfig; gameState: MazeGameState; robotRef: React.RefObject<THREE.Group>; onActionComplete: () => void; }> = ({ gameConfig, gameState, robotRef, onActionComplete }) => {
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
      {gameConfig.blocks?.map((block, index) => (
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
          (gameConfig.finish.z ?? gameConfig.finish.y) * TILE_SIZE
        ]} 
      />
      
      <RobotCharacter 
        ref={robotRef}
        position={robotPosition} 
        direction={gameState.player.direction}
        animationName={gameState.player.pose || 'Idle'}
        onTweenComplete={onActionComplete} // THÊM MỚI: Truyền callback xuống
      />
    </group>
  );
};

// --- Main Renderer Component ---

// THÊM MỚI: Nhận onActionComplete
export const Maze3DRenderer: IGameRenderer = ({ gameState, gameConfig, cameraMode = 'Follow', onActionComplete = () => {} }) => {
    const robotRef = useRef<THREE.Group>(null);
    const mazeState = gameState as MazeGameState;
    
    const normalizedConfig = useMemo((): MazeConfig => {
      if (gameConfig.type === 'maze' && gameConfig.map) {
        const blocks: Block[] = [];
        for (let y = 0; y < gameConfig.map.length; y++) {
          for (let x = 0; x < gameConfig.map[y].length; x++) {
            const cell = gameConfig.map[y][x];
            if (cell === SquareType.WALL) {
              blocks.push({ modelKey: 'wall.brick01', position: { x, y: 0, z: y } });
            } else if (cell !== 0) {
              blocks.push({ modelKey: 'ground.normal', position: { x, y: 0, z: y } });
            }
          }
        }
        return {
          ...gameConfig,
          blocks: blocks,
          finish: { ...gameConfig.finish, z: gameConfig.finish.y },
        };
      }
      return gameConfig as MazeConfig;
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
        
        {/* THÊM MỚI: Truyền onActionComplete vào Scene */}
        <Scene gameConfig={normalizedConfig} gameState={mazeState} robotRef={robotRef} onActionComplete={onActionComplete} />
      </Canvas>
    );
};