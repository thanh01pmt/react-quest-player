// src/components/Visualization/index.tsx

import React from 'react';
import type { IGameRenderer, GameState, GameConfig } from '../../types';

interface VisualizationProps {
  GameRenderer: IGameRenderer | null;
  gameState: GameState | null;
  gameConfig: GameConfig | null;
}

// FIXED: Changed component definition syntax for better type inference.
export const Visualization = ({
  GameRenderer,
  gameState,
  gameConfig,
}: VisualizationProps) => {
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333', // A dark background for the viz area
  };
  
  if (!GameRenderer || !gameState || !gameConfig) {
    return (
      <div style={containerStyle}>
        <span>Initializing Visualization...</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <GameRenderer gameState={gameState} gameConfig={gameConfig} />
    </div>
  );
};