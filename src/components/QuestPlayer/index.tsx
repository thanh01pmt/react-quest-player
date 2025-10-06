// src/components/QuestPlayer/index.tsx

import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import { transform } from '@babel/standalone';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { Quest, GameState, ExecutionMode, CameraMode } from '../../types';
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

type BlocklyThemeName = 'zelos' | 'classic';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  stars?: number;
  optimalBlocks?: number;
  code?: string;
}

export const QuestPlayer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const prefersColorScheme = usePrefersColorScheme();

  // Quest and UI states
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, title: '', message: '' });
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  
  // Blockly specific states
  const [blockCount, setBlockCount] = useState(0);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  
  // Settings states
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('Follow');

  // Execution states
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('run');

  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const rendererRef = useRef<TurtleRendererHandle>(null);

  // NOTE: colorSchemeMode and related states were removed, using prefersColorScheme directly for now.
  const effectiveColorScheme = prefersColorScheme;

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${effectiveColorScheme}`);
  }, [effectiveColorScheme]);

  const { GameRenderer, engineRef, solutionCommands, error: questLoaderError } = useQuestLoader(questData);
  const { currentEditor, aceCode, setAceCode, handleEditorChange } = useEditorManager(questData, workspaceRef);
  const { playSound } = useSoundManager(questData?.sounds, soundsEnabled);
  
  const handleGameEnd = useCallback(({ isSuccess, finalState }: { isSuccess: boolean, finalState: GameState }) => {
    if (isSuccess && questData) {
      const code = currentEditor === 'blockly' && workspaceRef.current 
        ? javascriptGenerator.workspaceToCode(workspaceRef.current) 
        : aceCode;

      const usedUnits = currentEditor === 'blockly' && workspaceRef.current
        ? workspaceRef.current.getAllBlocks(false).filter(b => b.isDeletable() && b.isEditable() && !b.getInheritedDisabled()).length
        : countLinesOfCode(code);

      const unitLabel = currentEditor === 'blockly' ? 'blockCount' : 'lineCount';
      
      const { optimalBlocks, solutionMaxBlocks } = questData.solution;
      let stars = 1;
      if (currentEditor === 'blockly' && optimalBlocks !== undefined) {
        if (usedUnits <= optimalBlocks) {
          stars = 3;
        } else if (solutionMaxBlocks !== undefined && usedUnits <= solutionMaxBlocks) {
          stars = 2;
        }
      }

      setDialogState({
        isOpen: true,
        title: t('Games.dialogCongratulations'),
        message: t('Games.dialogGoodJob', { [unitLabel]: usedUnits }),
        stars,
        optimalBlocks,
        code,
      });

    } else {
      setDialogState({ 
        isOpen: true, 
        title: t('Games.dialogTryAgain'), 
        message: getFailureMessage(t, (finalState as any).result) 
      });
    }
  }, [t, questData, currentEditor, aceCode]);
  
  const { 
    currentGameState, 
    playerStatus, 
    runGame, 
    resetGame, 
    pauseGame, 
    resumeGame, 
    stepForward,
    handleActionComplete 
  } = useGameLoop(engineRef, questData, rendererRef, handleGameEnd, playSound, setHighlightedBlockId);

  useLayoutEffect(() => {
    if (questData?.translations) {
      const translations = questData.translations;
      Object.keys(translations).forEach((langCode) => {
        i18n.addResourceBundle(langCode, 'translation', translations[langCode], true, true);
      });
      i18n.changeLanguage(i18n.language);
    }
  }, [questData, i18n]);

  useEffect(() => {
    if (questLoaderError) setImportError(questLoaderError);
  }, [questLoaderError]);
  
  useEffect(() => {
    if (engineRef.current) resetGame();
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

  const blocklyTheme = useMemo(() => createBlocklyTheme('zelos' as BlocklyThemeName, effectiveColorScheme), [effectiveColorScheme]);
  
  const handleBlocklyPanelResize = useCallback(() => {
    setTimeout(() => {
      if (workspaceRef.current) Blockly.svgResize(workspaceRef.current);
    }, 0);
  }, []);

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

  const is3DRenderer = questData?.gameConfig.type === 'maze' && questData.gameConfig.renderer === '3d';

  const workspaceConfiguration = useMemo(() => ({
    theme: blocklyTheme,
    renderer: 'zelos',
    trashcan: true,
    zoom: { controls: true, wheel: false, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
    grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
    sounds: soundsEnabled,
  }), [blocklyTheme, soundsEnabled]);

  return (
    <>
      <Dialog isOpen={dialogState.isOpen} title={dialogState.title} onClose={() => setDialogState({ ...dialogState, isOpen: false })}>
        {dialogState.stars !== undefined && dialogState.stars > 0 ? (
          <div className="completion-dialog-content">
            <div className="stars-header">{t('Games.dialogStarsHeader')}</div>
            <div className="stars-container">
              {[...Array(3)].map((_, i) => (
                <i key={i} className={`star ${i < (dialogState.stars || 0) ? 'fas fa-star' : 'far fa-star'}`}></i>
              ))}
            </div>
            <p className="completion-message">{dialogState.message}</p>
            {dialogState.stars < 3 && dialogState.optimalBlocks && (
              <p className="optimal-solution-info">{t('Games.dialogOptimalSolution', { optimalBlocks: dialogState.optimalBlocks })}</p>
            )}
            {dialogState.stars === 3 && <p className="excellent-solution">{t('Games.dialogExcellentSolution')}</p>}
            {dialogState.code && (
              <details className="code-details">
                <summary>{t('Games.dialogShowCode')}</summary>
                <pre><code>{dialogState.code}</code></pre>
              </details>
            )}
          </div>
        ) : (
          <p>{dialogState.message}</p>
        )}
      </Dialog>
      <DocumentationPanel isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} gameType={questData?.gameType} />
      <BackgroundMusic src={questData?.backgroundMusic} play={playerStatus === 'running' && soundsEnabled} />
      
      <PanelGroup direction="horizontal" className="appContainer" autoSaveId="quest-player-panels">
        <Panel defaultSize={50} minSize={20}>
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
                        </>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {is3DRenderer && (
                            <div>
                                <label htmlFor="camera-mode-select" style={{ marginRight: '5px', fontSize: '14px' }}>Camera:</label>
                                <select 
                                    id="camera-mode-select"
                                    value={cameraMode} 
                                    onChange={(e) => setCameraMode(e.target.value as CameraMode)}
                                >
                                    <option value="Follow">Follow</option>
                                    <option value="TopDown">Top Down</option>
                                    <option value="Free">Free</option>
                                </select>
                            </div>
                        )}
                        {currentEditor === 'blockly' && maxBlocks && isFinite(maxBlocks) && (
                            <div style={{ fontFamily: 'monospace' }}>Blocks: {blockCount} / {maxBlocks}</div>
                        )}
                    </div>
                    </div>
                    {questData && GameRenderer ? (
                    <Visualization
                        GameRenderer={GameRenderer}
                        gameState={currentGameState}
                        gameConfig={questData.gameConfig}
                        ref={questData.gameType === 'turtle' ? rendererRef : undefined}
                        solutionCommands={solutionCommands}
                        cameraMode={cameraMode}
                        onActionComplete={handleActionComplete}
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
        </Panel>
        <PanelResizeHandle />
        <Panel minSize={30} onResize={handleBlocklyPanelResize}>
            <div className="blocklyColumn">
                {questData && (
                    <EditorToolbar
                      supportedEditors={questData.supportedEditors || ['blockly']}
                      currentEditor={currentEditor}
                      onEditorChange={handleEditorChange}
                      onHelpClick={() => setIsDocsOpen(true)}
                    />
                )}
                {questData && GameRenderer ? (
                    currentEditor === 'monaco' ? (
                    <MonacoEditor
                        initialCode={aceCode}
                        onChange={(value) => setAceCode(value || '')}
                    />
                    ) : (
                    <>
                        {processedToolbox && questData?.blocklyConfig && (
                            <BlocklyWorkspace
                              key={`${questData.id}-${effectiveColorScheme}`}
                              className="fill-container"
                              toolboxConfiguration={processedToolbox}
                              initialXml={questData.blocklyConfig.startBlocks}
                              workspaceConfiguration={workspaceConfiguration}
                              onWorkspaceChange={(workspace) => {
                                workspaceRef.current = workspace;
                                setBlockCount(workspace.getAllBlocks(false).length);
                              }}
                            />
                        )}
                    </>
                    )
                ) : (
                    <div className="emptyState">
                      <h2>Coding area</h2>
                      <p>Waiting for a Quest</p>
                    </div>
                )}
            </div>
        </Panel>
      </PanelGroup>
    </>
  );
};