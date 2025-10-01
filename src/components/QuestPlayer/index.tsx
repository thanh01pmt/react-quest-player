// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect } from 'react';
import type { Quest } from '../../types';
import { BlocklyWorkspace } from '../BlocklyWorkspace';
import { Visualization } from '../Visualization';
import { initializeGame } from '../../games/GameBlockManager';

interface QuestPlayerProps {
  questId: string;
}

// Extend the Window interface to include our temporary global
declare global {
  interface Window {
    BlocklyGames: any;
  }
}

export const QuestPlayer: React.FC<QuestPlayerProps> = ({ questId }) => {
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [isGameReady, setIsGameReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Effect to load quest data from JSON
  useEffect(() => {
    setLoading(true);
    setError(null);
    setQuestData(null);
    setIsGameReady(false); // Reset readiness on quest change

    fetch(`/quests/${questId}.json`)
      .then(response => response.json())
      .then(data => setQuestData(data as Quest))
      .catch(err => {
        console.error("Failed to load quest data:", err);
        setError(`Could not load quest: ${questId}.json`);
      })
      .finally(() => setLoading(false));
  }, [questId]);

  // Effect to load and initialize game-specific modules
  useEffect(() => {
    if (!questData) return;

    // TEMPORARY FIX: Create mock globals
    window.BlocklyGames = {
      getMsg: (key: string) => `[${key}]`,
    };
    (window as any).BlocklyMsg = {
        'CONTROLS_IF_MSG_ELSE': 'else',
    };

    const gameType = questData.gameType;
    
    // Use the GameBlockManager to handle initialization
    initializeGame(gameType)
      .then(() => {
        setIsGameReady(true);
      })
      .catch((_err) => {
        // The manager already logs the detailed error, we just update UI state
        setError(`Could not load game module for ${gameType}.`);
      });

    // Cleanup the mock global
    return () => {
      delete window.BlocklyGames;
      delete (window as any).BlocklyMsg;
    };
  }, [questData]);

  if (loading) {
    return <div>Loading Quest...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleRun = (userCode: string) => {
    console.log("Running user code:", userCode);
    alert("Execution logic not yet implemented.");
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
        <Visualization />
      </div>
      <div style={{ flex: 1 }}>
        {isGameReady && questData ? (
          <BlocklyWorkspace
            key={questId}
            blocklyConfig={questData.blocklyConfig}
            onRun={handleRun}
          />
        ) : (
          <div>Initializing Game Engine...</div>
        )}
      </div>
    </div>
  );
};