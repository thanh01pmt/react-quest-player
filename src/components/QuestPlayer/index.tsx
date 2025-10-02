// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n'; // Import the i18next instance
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import type { Quest, GameEngineConstructor, IGameEngine, GameState, IGameRenderer } from '../../types';
import { Visualization } from '../Visualization';
import { QuestImporter } from '../QuestImporter';
import { Dialog } from '../Dialog';
import { LanguageSelector } from '../LanguageSelector';
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

export const QuestPlayer: React.FC = () => {
  const { t } = useTranslation();
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

  // ADDED: useEffect to dynamically load translations from the quest file
  useEffect(() => {
    if (questData?.translations) {
      const { translations } = questData;
      Object.keys(translations).forEach((lang) => {
        i18n.addResourceBundle(lang, 'translation', translations[lang], true, true);
      });
      // Force a re-render if the language has already been loaded
      // to ensure the new translations are picked up immediately.
      i18n.changeLanguage(i18n.language); 
    }
  }, [questData]);

  // Load and initialize game modules
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
          setDialogState({ isOpen: true, title: t('Games.dialogCongratulations'), message: t('Games.linesOfCode1') });
        } else {
          setDialogState({ isOpen: true, title: t('Games.dialogTryAgain'), message: `${t('Games.dialogReason')}: ${finalState.result}` });
        }
      } else {
        frameIndex.current = nextIndex;
        setCurrentGameState(executionLog[nextIndex]);
      }
    }, 150);
    return () => clearInterval(intervalId);
  }, [playerStatus, executionLog, t]);

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
      <div className="appContainer">
        <div className="visualizationColumn">
          <div className="main-content-wrapper">
            <div className="controlsArea">
              <div>
                {questData && (
                  <>
                    <button className="primaryButton" onClick={handleRun}>{t('Games.runProgram')}</button>
                    <button className="primaryButton" onClick={handleReset}>{t('Games.resetProgram')}</button>
                  </>
                )}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {questData && maxBlocks && isFinite(maxBlocks) && (
                  <div style={{ fontFamily: 'monospace' }}>
                    {t('Games.blocks')}: {blockCount} / {maxBlocks}
                  </div>
                )}
              </div>
            </div>

            {questData ? (
              <Visualization
                GameRenderer={GameRenderer}
                gameState={currentGameState}
                gameConfig={questData.gameConfig}
              />
            ) : (
              <div className="emptyState">
                <h2>{t('Games.loadQuest')}</h2>
              </div>
            )}

            {questData && (
              <div className="descriptionArea">
                {t('Games.task')}: {t(questData.descriptionKey)}
              </div>
            )}
          </div>

          <div className="importer-container">
            <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
            {importError && <p style={{ color: 'red', fontSize: '12px', textAlign: 'center' }}>{importError}</p>}
            <LanguageSelector />
          </div>
        </div>
        <div className="blocklyColumn">
          {questData && GameEngine ? (
            <BlocklyWorkspace
              key={questData.id}
              className="fill-container"
              toolboxConfiguration={questData.blocklyConfig.toolbox}
              initialXml={questData.blocklyConfig.startBlocks}
              workspaceConfiguration={{
                trashcan: true,
                zoom: {
                  controls: true,
                  wheel: false,
                  startScale: 1.0,
                  maxScale: 3,
                  minScale: 0.3,
                  scaleSpeed: 1.2
                },
                grid: {
                  spacing: 20,
                  length: 3,
                  colour: "#ccc",
                  snap: true,
                }
              }}
              onWorkspaceChange={(workspace) => {
                workspaceRef.current = workspace;
                setBlockCount(workspace.getAllBlocks(false).length);
              }}
            />
          ) : (
            <div className="emptyState">
              <h2>{t('Games.blocklyArea')}</h2>
              <p>{t('Games.waitingForQuest')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};