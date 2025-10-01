// src/components/Visualization/index.tsx

import React from 'react';
import type { IGameRenderer, GameState, GameConfig } from '../../types';

interface VisualizationProps {
  GameRenderer: IGameRenderer | null;
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  // ADDED: Props for overlays
  blockCount?: number;
  maxBlocks?: number;
  descriptionKey?: string;
}

export const Visualization = ({
  GameRenderer,
  gameState,
  gameConfig,
  blockCount,
  maxBlocks,
  descriptionKey,
}: VisualizationProps) => {
  const containerStyle: React.CSSProperties = {
    flexGrow: 1, // Allow it to fill the vertical space in the column
    display: 'flex', // Use flex to center the game canvas
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--visualization-bg)',
    position: 'relative', // ADDED: Anchor for overlays
    overflow: 'hidden',
  };

  const overlayBaseStyle: React.CSSProperties = {
    position: 'absolute',
    left: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    padding: '8px',
    borderRadius: '4px',
    textAlign: 'center',
    fontFamily: 'sans-serif',
  };

  const topOverlayStyle: React.CSSProperties = {
    ...overlayBaseStyle,
    top: '10px',
    fontFamily: 'monospace',
  };

  const bottomOverlayStyle: React.CSSProperties = {
    ...overlayBaseStyle,
    bottom: '10px',
  };

  return (
    <div style={containerStyle}>
      {/* Game Renderer is the first child, so it's at the bottom of the stack */}
      {GameRenderer && gameState && gameConfig && (
        <GameRenderer gameState={gameState} gameConfig={gameConfig} />
      )}
      
      {/* Overlays are rendered on top */}
      {maxBlocks && isFinite(maxBlocks) && (
        <div style={topOverlayStyle}>
          Blocks: {blockCount ?? 0} / {maxBlocks}
        </div>
      )}

      {descriptionKey && (
         <div style={bottomOverlayStyle}>
          Task: {descriptionKey}
        </div>
      )}
    </div>
  );
};