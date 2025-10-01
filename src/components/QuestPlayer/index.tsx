// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import type { Quest, GameEngineConstructor, IGameEngine, GameState, IGameRenderer } from '../../types';
import { Visualization } from '../Visualization';
import { QuestImporter } from '../QuestImporter';
import { Dialog } from '../Dialog';
import { initializeGame } from '../../games/GameBlockManager';
import type { MazeGameState } from '../../games/maze/types';
import '../../App.css';
import './QuestPlayer.css';

type PlayerStatus = 'idle' | 'running' | 'finished';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
}

// ADDED: Small sub-component for the description
const QuestDescription: React.FC<{ descriptionKey: string }> = ({ descriptionKey }) => {
  const style: React.CSSProperties = {
    padding: '10px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--background-color)',
    textAlign: 'center',
    fontStyle: 'italic',
  };
  // We'll replace this with a proper i18n lookup later
  return <div style={style}>Task: {descriptionKey}</div>;
};


export const QuestPlayer: React.FC = () => {
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
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [blockCount, setBlockCount] = useState(0);

  // Load and initialize game modules when a new quest is loaded
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
  
  // Instantiate engine
  useEffect(() => {
    if (GameEngine && questData) {
      const engine = new GameEngine(questData.gameConfig);
      gameEngine.current = engine;
      setCurrentGameState(engine.getInitialState());
      setPlayerStatus('idle');
      setExecutionLog(null);
      setBlockCount(0);
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
        const finalState = executionLog[executionLog.length - 1] as MazeGameState;
        if (finalState.result === 'success') {
          setDialogState({ isOpen: true, title: 'Congratulations!', message: 'You solved the puzzle!' });
        } else {
          setDialogState({ isOpen: true, title: 'Try Again', message: `You haven't reached the goal. (Reason: ${finalState.result})` });
        }
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
    setDialogState({ isOpen: false, title: '', message: '' });
  }

  const handleQuestLoad = (loadedQuest: Quest) => {
    setQuestData(loadedQuest);
    setImportError('');
  };

  const EmptyState = ({ inColumn }: { inColumn: 'viz' | 'blockly' }) => (
    <div style={{ padding: '20px', textAlign: 'center', height: '100%', boxSizing: 'border-box' }}>
      <h2>{inColumn === 'viz' ? 'Game Area' : 'Blockly Area'}</h2>
      <p>Please import a Quest JSON file to begin.</p>
      {importError && <p style={{ color: 'red' }}>Error: {importError}</p>}
    </div>
  );
  
  const maxBlocks = questData?.blocklyConfig.maxBlocks;

  return (
    <>
      <Dialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        onClose={() => setDialogState({ ...dialogState, isOpen: false })}
      >
        <p>{dialogState.message}</p>
      </Dialog>
      <div style={{ display: 'flex' }}>
        <div style={{ width: '450px' }}>
          {/* ADDED: Description display */}
          {questData && <QuestDescription descriptionKey={questData.descriptionKey} />}
          {questData ? (
            <Visualization
              GameRenderer={GameRenderer}
              gameState={currentGameState}
              gameConfig={questData.gameConfig}
            />
          ) : (
            <EmptyState inColumn="viz" />
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
            {maxBlocks && isFinite(maxBlocks) && (
              <div style={{ fontFamily: 'monospace' }}>
                Blocks: {blockCount} / {maxBlocks}
              </div>
            )}
            <div>
              <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
            </div>
          </div>
        </div>
        <div style={{ height: '800px', width: '800px', border: '1px solid red' }}>
          {questData && GameEngine ? (
            <BlocklyWorkspace
              key={questData.id}
              className="fill-container"
              toolboxConfiguration={questData.blocklyConfig.toolbox}
              initialXml={questData.blocklyConfig.startBlocks}
              workspaceConfiguration={{}}
              onWorkspaceChange={(workspace) => {
                workspaceRef.current = workspace;
                setBlockCount(workspace.getAllBlocks(false).length);
              }}
            />
          ) : (
            <EmptyState inColumn="blockly" />
          )}
        </div>
      </div>
    </>
  );
};