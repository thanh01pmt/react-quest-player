// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import type { Quest, GameEngineConstructor, IGameEngine, GameState, IGameRenderer } from '../../types';
import { BlocklyWorkspace, type BlocklyWorkspaceHandle } from '../BlocklyWorkspace';
import { Visualization } from '../Visualization';
import { initializeGame } from '../../games/GameBlockManager';
import '../../App.css';

interface QuestPlayerProps {
  questId: string;
}

type PlayerStatus = 'idle' | 'running' | 'finished';

export const QuestPlayer: React.FC<QuestPlayerProps> = ({ questId }) => {
  // Quest and module loading state
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [GameEngine, setGameEngine] = useState<GameEngineConstructor | null>(null);
  const [GameRenderer, setGameRenderer] = useState<IGameRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Game instance and execution state
  const gameEngine = useRef<IGameEngine | null>(null);
  const workspaceRef = useRef<BlocklyWorkspaceHandle>(null); // FIXED: Define the ref
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [executionLog, setExecutionLog] = useState<GameState[] | null>(null);
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);
  
  const frameIndex = useRef(0);

  // Load quest data from JSON
  useEffect(() => {
    setLoading(true);
    setError(null);
    setQuestData(null);
    setGameEngine(null);
    setGameRenderer(null);

    fetch(`/quests/${questId}.json`)
      .then(response => response.json())
      .then(data => setQuestData(data as Quest))
      .catch((_err) => setError(`Could not load quest: ${questId}.json`))
      .finally(() => setLoading(false));
  }, [questId]);

  // Load and initialize game-specific modules
  useEffect(() => {
    if (!questData) return;

    const gameType = questData.gameType;
    let isMounted = true;

    const init = async () => {
      try {
        await initializeGame(gameType);
        const gameModule = await import(`../../games/${gameType}/index.ts`);
        if (isMounted) {
          setGameEngine(() => gameModule.GameEngine);
          setGameRenderer(() => gameModule.GameRenderer);
        }
      } catch (_err) {
        if (isMounted) setError(`Could not load game module for ${gameType}.`);
      }
    };

    init();
    return () => { isMounted = false; };
  }, [questData]);
  
  // Instantiate the engine
  useEffect(() => {
    if (GameEngine && questData) {
      const engine = new GameEngine(questData.gameConfig);
      gameEngine.current = engine;
      setCurrentGameState(engine.getInitialState());
      setPlayerStatus('idle');
      setExecutionLog(null);
    }
  }, [GameEngine, questData]);

  // The main animation loop effect
  useEffect(() => {
    if (playerStatus !== 'running' || !executionLog) {
      return;
    }

    const intervalId = setInterval(() => {
      const nextIndex = frameIndex.current + 1;
      if (nextIndex >= executionLog.length) {
        clearInterval(intervalId);
        setPlayerStatus('finished');
      } else {
        frameIndex.current = nextIndex;
        setCurrentGameState(executionLog[nextIndex]);
      }
    }, 150);

    return () => clearInterval(intervalId);
  }, [playerStatus, executionLog]);


  if (loading) return <div>Loading Quest...</div>;
  if (error) return <div>Error: {error}</div>;

  // FIXED: handleRun no longer takes a parameter
  const handleRun = () => {
    if (!gameEngine.current || playerStatus === 'running' || !workspaceRef.current) return;
    
    const userCode = workspaceRef.current.getCode(); // Get code via ref
    
    frameIndex.current = 0;
    const log = gameEngine.current.execute(userCode);
    setExecutionLog(log);
    setCurrentGameState(log[0]);
    setPlayerStatus('running');
  };
  
  const handleReset = () => {
    if (!gameEngine.current) return;
    frameIndex.current = 0;
    setCurrentGameState(gameEngine.current.getInitialState());
    setExecutionLog(null);
    setPlayerStatus('idle');
  }

  return (
    <div className="appContainer">
      <div className="visualizationColumn">
        <Visualization
          GameRenderer={GameRenderer}
          gameState={currentGameState}
          gameConfig={questData?.gameConfig ?? null}
        />
        <div className="controlsArea">
          <button className="primaryButton" onClick={handleRun}>Run Program</button>
          <button className="primaryButton" onClick={handleReset}>Reset</button>
        </div>
      </div>
      <div className="blocklyColumn">
        {GameEngine && questData ? (
          <BlocklyWorkspace
            ref={workspaceRef} // FIXED: Pass the ref down
            key={questId}
            blocklyConfig={questData.blocklyConfig}
          />
        ) : (
          <div>Initializing...</div>
        )}
      </div>
    </div>
  );
};