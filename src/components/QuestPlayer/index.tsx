// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import type { Quest, GameEngineConstructor, IGameEngine, GameState, IGameRenderer } from '../../types';
import { Visualization } from '../Visualization';
import { initializeGame } from '../../games/GameBlockManager';
import '../../App.css';
import './QuestPlayer.css';

interface QuestPlayerProps {
  questId: string;
}

type PlayerStatus = 'idle' | 'running' | 'finished';

export const QuestPlayer: React.FC<QuestPlayerProps> = ({ questId }) => {
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [GameEngine, setGameEngine] = useState<GameEngineConstructor | null>(null);
  const [GameRenderer, setGameRenderer] = useState<IGameRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const gameEngine = useRef<IGameEngine | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [executionLog, setExecutionLog] = useState<GameState[] | null>(null);
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);
  
  const frameIndex = useRef(0);

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
  
  useEffect(() => {
    if (GameEngine && questData) {
      const engine = new GameEngine(questData.gameConfig);
      gameEngine.current = engine;
      setCurrentGameState(engine.getInitialState());
      setPlayerStatus('idle');
      setExecutionLog(null);
    }
  }, [GameEngine, questData]);

  useEffect(() => {
    if (playerStatus !== 'running' || !executionLog) return;
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleRun = () => {
    if (!gameEngine.current || !workspaceRef.current || playerStatus === 'running') return;
    const userCode = javascriptGenerator.workspaceToCode(workspaceRef.current);
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

  // DEBUG: Simplified layout with fixed dimensions
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '450px' }}>
        <Visualization
          GameRenderer={GameRenderer}
          gameState={currentGameState}
          gameConfig={questData?.gameConfig ?? null}
        />
        <div>
          <button className="primaryButton" onClick={handleRun}>Run</button>
          <button className="primaryButton" onClick={handleReset}>Reset</button>
        </div>
      </div>
      <div style={{ height: '800px', width: '800px', border: '1px solid red' }}>
        {GameEngine && questData ? (
          <BlocklyWorkspace
            key={questId}
            className="fill-container"
            toolboxConfiguration={questData.blocklyConfig.toolbox}
            initialXml={questData.blocklyConfig.startBlocks}
            workspaceConfiguration={{}}
            onWorkspaceChange={(workspace) => {
              workspaceRef.current = workspace;
            }}
          />
        ) : (
          <div>Initializing...</div>
        )}
      </div>
    </div>
  );
};