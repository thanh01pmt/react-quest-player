// src/components/Visualization/index.tsx

import { forwardRef } from 'react';
import type { IGameRenderer, GameState, GameConfig, CameraMode } from '../../types';

interface VisualizationProps {
  GameRenderer: IGameRenderer;
  gameState: GameState | null;
  gameConfig: GameConfig;
  solutionCommands?: string[];
  cameraMode?: CameraMode;
  onActionComplete: () => void;
  onTeleportComplete?: () => void;
}

export const Visualization = forwardRef<any, VisualizationProps>(
  (
    {
      GameRenderer,
      gameState,
      gameConfig,
      solutionCommands,
      cameraMode,
      onActionComplete,
      onTeleportComplete, 
    },
    ref
  ) => {
    if (!gameState) {
      // Có thể hiển thị một trạng thái loading hoặc fallback ở đây nếu cần
      return null;
    }

    return (
      <GameRenderer
        ref={ref}
        gameState={gameState}
        gameConfig={gameConfig}
        solutionCommands={solutionCommands}
        cameraMode={cameraMode}
        onActionComplete={onActionComplete}
        onTeleportComplete={onTeleportComplete} 
      />
    );
  }
);