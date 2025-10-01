// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import type { Quest, GameEngineConstructor, IGameEngine, GameState, IGameRenderer } from '../../types';
import { Visualization } from '../Visualization';
import { QuestImporter } from '../QuestImporter';
import { initializeGame } from '../../games/GameBlockManager';
import '../../App.css';
import './QuestPlayer.css';

type PlayerStatus = 'idle' | 'running' | 'finished';

export const QuestPlayer: React.FC = () => {
  // All state is now self-contained within QuestPlayer
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [importError, setImportError] = useState<string>('');

  const [GameEngine, setGameEngine] = useState<GameEngineConstructor | null>(null);
  const [GameRenderer, setGameRenderer] = useState<IGameRenderer | null>(null);
  
  const gameEngine = useRef<IGameEngine | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [executionLog, setExecutionLog] = useState<GameState[] | null>(null);
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);
  
  const frameIndex = useRef(0);

  // Load game modules when a new quest is loaded
  useEffect(() => {
    if (!questData) {
      setGameEngine(null);
      setGameRenderer(null);
      return;
    };

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
        if (isMounted) setImportError(`Could not load game module for ${gameType}.`);
      }
    };

    init();
    return () => { isMounted = false; };
  }, [questData]);
  
  // Instantiate engine when the constructor is ready
  useEffect(() => {
    if (GameEngine && questData) {
      const engine = new GameEngine(questData.gameConfig);
      gameEngine.current = engine;
      setCurrentGameState(engine.getInitialState());
      setPlayerStatus('idle');
      setExecutionLog(null);
    }
  }, [GameEngine, questData]);

  // Animation loop
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

  const handleQuestLoad = (loadedQuest: Quest) => {
    setQuestData(loadedQuest);
    setImportError('');
  };

  const EmptyState = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>No Quest Loaded</h2>
      <p>Please import a Quest JSON file to begin.</p>
      {importError && <p style={{ color: 'red' }}>Error: {importError}</p>}
    </div>
  );

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '450px' }}>
        {questData ? (
          <Visualization
            GameRenderer={GameRenderer}
            gameState={currentGameState}
            gameConfig={questData.gameConfig}
          />
        ) : (
          <div>No Quest Loaded</div>
        )}
        <div className="controlsArea">
          <div>
            {questData && (
              <>
                <button className="primaryButton" onClick={handleRun}>Run</button>
                <button className="primaryButton" onClick={handleReset}>Reset</button>
              </>
            )}
          </div>
          <div>
            <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
          </div>
        </div>
      </div>
      <div style={{ height: '800px', width: '800px', border: '1px solid red' }}>
        {GameEngine && questData ? (
          <BlocklyWorkspace
            key={questData.id}
            className="fill-container"
            toolboxConfiguration={questData.blocklyConfig.toolbox}
            initialXml={questData.blocklyConfig.startBlocks}
            workspaceConfiguration={{}}
            onWorkspaceChange={(workspace) => { workspaceRef.current = workspace; }}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};