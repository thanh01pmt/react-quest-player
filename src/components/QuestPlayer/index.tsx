// src/components/QuestPlayer/index.tsx

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import { transform } from '@babel/standalone';
import type { Quest, GameState, ExecutionMode } from '../../types';
import { Visualization } from '../Visualization';
import { QuestImporter } from '../QuestImporter';
import { Dialog } from '../Dialog';
import { LanguageSelector } from '../LanguageSelector';
import { MonacoEditor } from '../MonacoEditor';
import { EditorToolbar } from '../EditorToolbar';
import { DocumentationPanel } from '../DocumentationPanel';
import { BackgroundMusic } from '../BackgroundMusic';
import { countLinesOfCode } from '../../games/codeUtils';
import { usePrefersColorScheme } from '../../hooks/usePrefersColorScheme';
import { useSoundManager } from '../../hooks/useSoundManager';
import type { TurtleRendererHandle } from '../../games/turtle/TurtleRenderer';
import { getFailureMessage, processToolbox, createBlocklyTheme } from './utils';
import { useQuestLoader } from './hooks/useQuestLoader';
import { useEditorManager } from './hooks/useEditorManager';
import { useGameLoop } from './hooks/useGameLoop';
import type { PondGameState } from '../../games/pond/types';
import '../../App.css';
import './QuestPlayer.css';


interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
}

export const QuestPlayer: React.FC = () => {
  const { t } = useTranslation();
  const colorScheme = usePrefersColorScheme();

  const [questData, setQuestData] = useState<Quest | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, title: '', message: '' });
  const [blockCount, setBlockCount] = useState(0);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('run');

  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const rendererRef = useRef<TurtleRendererHandle>(null);

  const { GameRenderer, engineRef, solutionCommands, error: questLoaderError } = useQuestLoader(questData);
  const { currentEditor, aceCode, setAceCode, handleEditorChange } = useEditorManager(questData, workspaceRef);
  const { playSound } = useSoundManager(questData?.sounds);
  
  const handleGameEnd = useCallback(({ isSuccess, finalState }: { isSuccess: boolean, finalState: GameState }) => {
    if (isSuccess) {
      const code = currentEditor === 'blockly' && workspaceRef.current 
        ? javascriptGenerator.workspaceToCode(workspaceRef.current) 
        : aceCode;
      const lines = countLinesOfCode(code);
      let message = lines === 1 ? t('Games.linesOfCode1') : t('Games.linesOfCode2').replace('%1', String(lines));
      setDialogState({ isOpen: true, title: t('Games.dialogCongratulations'), message });
    } else {
      setDialogState({ isOpen: true, title: t('Games.dialogTryAgain'), message: getFailureMessage(t, (finalState as any).result) });
    }
  }, [t, aceCode, currentEditor]);
  
  const { currentGameState, playerStatus, runGame, resetGame, pauseGame, resumeGame, stepForward } = useGameLoop(engineRef, questData, rendererRef, handleGameEnd, playSound, setHighlightedBlockId);

  useEffect(() => {
    if (questLoaderError) setImportError(questLoaderError);
  }, [questLoaderError]);
  
  useEffect(() => {
    if (engineRef.current) {
        resetGame();
    }
  }, [engineRef.current, resetGame]);

  useEffect(() => {
    if (questData?.gameType === 'pond' && currentGameState) {
      const pondState = currentGameState as PondGameState;
      if (pondState.events && pondState.events.length > 0) {
        for (const event of pondState.events) {
          switch (event.type) {
            case 'BOOM':
              playSound('boom', event.damage / 25);
              break;
            case 'CRASH':
              playSound('crash', event.damage / 10);
              break;
            case 'DIE':
              playSound('splash');
              break;
          }
        }
      }
    }
  }, [currentGameState, questData?.gameType, playSound]);

  useEffect(() => {
    workspaceRef.current?.highlightBlock(highlightedBlockId);
  }, [highlightedBlockId]);

  const blocklyTheme = useMemo(() => createBlocklyTheme(colorScheme === 'dark'), [colorScheme]);

  const handleRun = (mode: ExecutionMode) => {
    setExecutionMode(mode);
    let userCode = '';
    if (currentEditor === 'monaco') {
      try {
        const es5Code = transform(aceCode, { presets: ['env'] }).code;
        if (!es5Code) throw new Error("Babel transpilation failed.");
        userCode = es5Code;
      } catch (e: any) {
        setDialogState({ isOpen: true, title: 'Syntax Error', message: e.message });
        return;
      }
    } else if (workspaceRef.current) {
      userCode = javascriptGenerator.workspaceToCode(workspaceRef.current);
    }
    runGame(userCode, mode);
  };
  
  const handleQuestLoad = (loadedQuest: Quest) => {
    setQuestData(loadedQuest);
    setImportError('');
  };
  
  const maxBlocks = questData?.blocklyConfig?.maxBlocks;
  const processedToolbox = questData?.supportedEditors?.includes('blockly') && questData.blocklyConfig 
    ? processToolbox(questData.blocklyConfig.toolbox, t) 
    : undefined;

  return (
    <>
      <Dialog isOpen={dialogState.isOpen} title={dialogState.title} onClose={() => setDialogState({ ...dialogState, isOpen: false })}>
        <p>{dialogState.message}</p>
      </Dialog>
      <DocumentationPanel isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
      <BackgroundMusic src={questData?.backgroundMusic} play={playerStatus === 'running'} />
      <div className="appContainer">
        <div className="visualizationColumn">
          <div className="main-content-wrapper">
            <div className="controlsArea">
              <div>
                {questData && (
                  <>
                    {playerStatus === 'idle' || playerStatus === 'finished' ? (
                        <>
                            <button className="primaryButton" onClick={() => handleRun('run')}>Run Program</button>
                            <button className="primaryButton" onClick={() => handleRun('debug')}>Debug Program</button>
                        </>
                    ) : null}

                    {playerStatus === 'running' && executionMode === 'debug' && (
                        <button className="primaryButton" onClick={pauseGame}>Pause</button>
                    )}
                    
                    {playerStatus === 'paused' && (
                        <>
                            <button className="primaryButton" onClick={resumeGame}>Resume</button>
                            <button className="primaryButton" onClick={stepForward}>Step Forward</button>
                        </>
                    )}

                    {playerStatus !== 'idle' && <button className="primaryButton" onClick={resetGame}>Reset</button>}
                    
                    {questData.gameType === 'pond' && (
                        <button className="primaryButton" onClick={() => setIsDocsOpen(true)} title={t('Pond.docsTooltip')}>
                            {t('Pond.documentation')}
                        </button>
                    )}
                  </>
                )}
              </div>
              {currentEditor === 'blockly' && maxBlocks && isFinite(maxBlocks) && (
                <div style={{ fontFamily: 'monospace' }}>Blocks: {blockCount} / {maxBlocks}</div>
              )}
            </div>
            {questData && GameRenderer ? (
              <Visualization
                GameRenderer={GameRenderer}
                gameState={currentGameState}
                gameConfig={questData.gameConfig}
                ref={questData.gameType === 'turtle' ? rendererRef : undefined}
                solutionCommands={solutionCommands}
              />
            ) : (
              <div className="emptyState"><h2>Load quest to play</h2></div>
            )}
            {questData && (
              <div className="descriptionArea">Task: {t(questData.descriptionKey)}</div>
            )}
          </div>
          <div className="importer-container">
            <QuestImporter onQuestLoad={handleQuestLoad} onError={setImportError} />
            <LanguageSelector />
            {importError && <p style={{ color: 'red', fontSize: '12px', textAlign: 'center' }}>{importError}</p>}
          </div>
        </div>
        <div className="blocklyColumn">
          {questData && (
            <EditorToolbar
              supportedEditors={questData.supportedEditors || ['blockly']}
              currentEditor={currentEditor}
              onEditorChange={handleEditorChange}
            />
          )}
          {questData && GameRenderer ? (
            currentEditor === 'monaco' ? (
              <MonacoEditor
                initialCode={aceCode}
                onChange={(value) => setAceCode(value || '')}
              />
            ) : (
              processedToolbox && questData?.blocklyConfig && (
                <BlocklyWorkspace
                  key={`${questData.id}`}
                  className="fill-container"
                  toolboxConfiguration={processedToolbox}
                  initialXml={questData.blocklyConfig.startBlocks}
                  workspaceConfiguration={{ theme: blocklyTheme, trashcan: true, zoom: { controls: true, wheel: false, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 }, grid: { spacing: 20, length: 3, colour: "#ccc", snap: true, } }}
                  onWorkspaceChange={(workspace) => {
                    workspaceRef.current = workspace;
                    setBlockCount(workspace.getAllBlocks(false).length);
                  }}
                />
              )
            )
          ) : (
            <div className="emptyState">
              <h2>Coding area</h2>
              <p>Waiting for a Quest</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};