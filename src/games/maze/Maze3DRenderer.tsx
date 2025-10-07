// src/games/maze/Maze3DRenderer.tsx

import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { IGameRenderer as IGameRendererBase, MazeConfig, CameraMode } from '../../types';
import type { MazeGameState } from './types';
import { RobotCharacter } from './components/RobotCharacter';
import { CameraRig } from './components/CameraRig';
import BlockComponent from './components/Block';
import { Collectible } from './components/Collectible';

interface IGameRenderer extends IGameRendererBase {
  cameraMode?: CameraMode;
  onActionComplete?: () => void;
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

const Scene: React.FC<{ 
  gameConfig: MazeConfig; 
  gameState: MazeGameState; 
  onActionComplete: () => void;
  robotRef: React.RefObject<THREE.Group>; // Receive the ref from parent
}> = ({ gameConfig, gameState, onActionComplete, robotRef }) => {
  const activePlayer = gameState.players[gameState.activePlayerId];
  
  const robotPosition = useMemo(() => {
    if (!activePlayer) return new THREE.Vector3(0, 0, 0);
    const groundY = (activePlayer.y - 1) * TILE_SIZE;
    const surfaceY = groundY + TILE_SIZE / 2;

    return new THREE.Vector3(
        activePlayer.x * TILE_SIZE,
        surfaceY,
        activePlayer.z * TILE_SIZE
    );
  }, [activePlayer]);

  if (!activePlayer) return null;

  return (
    <group>
      {/* CameraRig is now moved outside of Scene */}

      {gameState.blocks.map((block, index) => (
        <BlockComponent 
          key={`block-${index}`} 
          modelKey={block.modelKey} 
          position={[
            block.position.x * TILE_SIZE, 
            block.position.y * TILE_SIZE, 
            block.position.z * TILE_SIZE
          ]} 
        />
      ))}

      {gameState.collectibles.map((item) => (
        <Collectible
          key={item.id}
          collectibleType={item.type}
          position={[
            item.position.x * TILE_SIZE,
            (item.position.y - 1) * TILE_SIZE + TILE_SIZE / 2,
            item.position.z * TILE_SIZE,
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
        ref={robotRef} // Pass the received ref to the character
        position={robotPosition} 
        direction={activePlayer.direction}
        animationName={activePlayer.pose || 'Idle'}
        onTweenComplete={onActionComplete}
      />
    </group>
  );
};

// --- Main Renderer Component ---

export const Maze3DRenderer: IGameRenderer = ({ gameState, gameConfig, cameraMode = 'Follow', onActionComplete = () => {} }) => {
    const mazeState = gameState as MazeGameState;
    const mazeConfig = gameConfig as MazeConfig;
    const robotRef = useRef<THREE.Group>(null); // Create the ref here
    
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
        
        {/* CameraRig is now a direct child of Canvas and receives the necessary props */}
        <CameraRig targetRef={robotRef} mode={cameraMode} />
        
        <Scene 
          gameConfig={mazeConfig} 
          gameState={mazeState} 
          onActionComplete={onActionComplete} 
          robotRef={robotRef} // Pass the ref down to the Scene
        />
      </Canvas>
    );
};