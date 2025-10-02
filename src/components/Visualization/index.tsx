// src/components/Visualization/index.tsx

import React, { forwardRef } from 'react';
import type { IGameRenderer, GameState, GameConfig } from '../../types';

interface VisualizationProps {
  GameRenderer: IGameRenderer | null;
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  [key: string]: any; // Allow other props
}

export const Visualization = forwardRef<any, VisualizationProps>(
  ({ GameRenderer, gameState, gameConfig, ...rest }, ref) => {
    const containerStyle: React.CSSProperties = {
      flexGrow: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--visualization-bg)',
      position: 'relative',
      overflow: 'hidden',
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
        <GameRenderer 
          gameState={gameState} 
          gameConfig={gameConfig} 
          ref={ref} 
          {...rest} 
        />
      </div>
    );
  }
);