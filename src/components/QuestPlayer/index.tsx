// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import type { Quest, GameEngineConstructor, IGameEngine, GameState, IGameRenderer } from '../../types';
import { Visualization } from '../Visualization';
import { QuestImporter } from '../QuestImporter';
import { Dialog } from '../Dialog';
import { LanguageSelector } from '../LanguageSelector';
import { initializeGame } from '../../games/GameBlockManager';
import { countLinesOfCode } from '../../games/codeUtils'; // Import the new utility
import type { MazeGameState, ResultType } from '../../games/maze/types';
import '../../App.css';
import './QuestPlayer.css';

type PlayerStatus = 'idle' | 'running' | 'finished';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
}

// Helper to create a more user-friendly failure message
const getFailureMessage = (t: (key: string, options?: { defaultValue: string }) => string, result: ResultType): string => {
  // Construct the specific key for the result type
  const reasonKey = `Games.result${result.charAt(0).toUpperCase() + result.slice(1)}`; // e.g., "Games.resultFailure"
  
  // Translate the specific reason, providing the raw result as a fallback
  const translatedReason = t(reasonKey, { defaultValue: result });
  const reasonLocale = t('Games.dialogReason');
  
  // Combine with the generic "Reason:" prefix
  return `${reasonLocale}: ${translatedReason}`;
};

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
  const [blocklyKey, setBlocklyKey] = useState(0);
  const [translationVersion, setTranslationVersion] = useState(0);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      if (questData) {
        initializeGame(questData.gameType).then(() => {
          setBlocklyKey(prev => prev + 1);
        });
      }
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [questData]);

  // Load translations from quest file
  useEffect(() => {
    if (questData?.translations) {
      const { translations } = questData;
      Object.keys(translations).forEach((lang) => {
        i18n.addResourceBundle(lang, 'translation', translations[lang], true, true);
      });
      setTranslationVersion(v => v + 1);
    }
  }, [questData]);

  // Load game modules
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
          const code = workspaceRef.current ? javascriptGenerator.workspaceToCode(workspaceRef.current) : '';
          const lines = countLinesOfCode(code);
          let message: string;
          if (lines === 1) {
            message = t('Games.linesOfCode1');
          } else {
            message = t('Games.linesOfCode2').replace('%1', String(lines));
          }
          // Use the correct key for the title
          setDialogState({ isOpen: true, title: t('Games.dialogCongratulations'), message });
        } else {
          // Use the updated getFailureMessage function
          setDialogState({ isOpen: true, title: t('Games.dialogTryAgain'), message: getFailureMessage(t, finalState.result) });
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
              <div className="emptyState" key={translationVersion}>
                <h2>{t('Games.loadQuest')}</h2>
              </div>
            )}
            {questData && (
              <div className="descriptionArea" key={translationVersion}>
                {t('Games.task')}: {t(questData.descriptionKey)}
              </div>
            )}
          </div>

          <div className="importer-container">
            <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
            <LanguageSelector />
            {importError && <p style={{ color: 'red', fontSize: '12px', textAlign: 'center' }}>{importError}</p>}
          </div>
        </div>
        <div className="blocklyColumn">
          {questData && GameEngine ? (
            <BlocklyWorkspace
              key={`${questData.id}-${blocklyKey}`}
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
            <div className="emptyState" key={translationVersion}>
              <h2>{t('Games.blocklyArea')}</h2>
              <p>{t('Games.waitingForQuest')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};