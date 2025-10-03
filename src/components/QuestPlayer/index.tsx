// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import { BlocklyWorkspace } from 'react-blockly';
import { transform } from '@babel/standalone';
import type { Quest, GameEngineConstructor, IGameEngine, GameState, IGameRenderer, ToolboxJSON, ToolboxItem } from '../../types';
import { Visualization } from '../Visualization';
import { QuestImporter } from '../QuestImporter';
import { Dialog } from '../Dialog';
import { LanguageSelector } from '../LanguageSelector';
import { MonacoEditor } from '../MonacoEditor';
import { EditorToolbar } from '../EditorToolbar';
import { initializeGame } from '../../games/GameBlockManager';
import { countLinesOfCode } from '../../games/codeUtils';
import type { ResultType } from '../../games/maze/types';
import { usePrefersColorScheme } from '../../hooks/usePrefersColorScheme';
import type { DrawingCommand } from '../../games/turtle/types';
import type { TurtleRendererHandle } from '../../games/turtle/TurtleRenderer';
import type { TurtleEngine } from '../../games/turtle/TurtleEngine';
import '../../App.css';
import './QuestPlayer.css';

type PlayerStatus = 'idle' | 'running' | 'finished';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
}

const getFailureMessage = (t: (key: string, options?: { defaultValue: string }) => string, result: ResultType): string => {
  if (!result) {
    return t('Games.dialogReason') + ': ' + t('Games.resultFailure');
  }
  const reasonKey = `Games.result${result.charAt(0).toUpperCase() + result.slice(1)}`;
  const translatedReason = t(reasonKey, { defaultValue: result });
  const reasonLocale = t('Games.dialogReason');
  return `${reasonLocale}: ${translatedReason}`;
};

const processToolbox = (toolbox: ToolboxJSON, t: (key: string) => string): ToolboxJSON => {
    const processedContents = toolbox.contents.map((item: ToolboxItem) => {
      if (item.kind === 'category') {
        let processedSubContents = item.contents;
        if (item.contents && Array.isArray(item.contents)) {
          processedSubContents = processToolbox({ ...toolbox, contents: item.contents }, t).contents;
        }
        const newName = item.name.replace(/%{BKY_([^}]+)}/g, (_match: string, key: string) => {
          let i18nKey: string;
          if (key.startsWith('GAMES_CAT')) {
            const catName = key.substring('GAMES_CAT'.length);
            i18nKey = 'Games.cat' + catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase();
          } else {
            i18nKey = 'Games.' + key.substring('GAMES_'.length).toLowerCase();
          }
          return t(i18nKey);
        });
        let categoryTheme = '';
        if (item.name.includes('POND')) categoryTheme = 'pond_category';
        if (item.name.includes('TURTLE')) categoryTheme = 'turtle_category';
        if (item.name.includes('LOOPS')) categoryTheme = 'loops_category';
        if (item.name.includes('COLOUR')) categoryTheme = 'colour_category';
        if (item.name.includes('LOGIC')) categoryTheme = 'logic_category';
        if (item.name.includes('MATH')) categoryTheme = 'math_category';
        if (item.name.includes('TEXT')) categoryTheme = 'text_category';
        if (item.name.includes('LISTS')) categoryTheme = 'list_category';
        if (item.name.includes('VARIABLES')) categoryTheme = 'variable_category';
        if (item.name.includes('PROCEDURES')) categoryTheme = 'procedure_category';
        return { ...item, name: newName, contents: processedSubContents, categorystyle: categoryTheme };
      }
      return item;
    });
    return { ...toolbox, contents: processedContents };
};

const BATCH_FRAME_DELAY = 150;
const STEP_FRAME_DELAY = 50;

export const QuestPlayer: React.FC = () => {
  const { t } = useTranslation();
  const colorScheme = usePrefersColorScheme();

  const [questData, setQuestData] = useState<Quest | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [GameEngine, setGameEngine] = useState<GameEngineConstructor | null>(null);
  const [GameRenderer, setGameRenderer] = useState<IGameRenderer | null>(null);
  const [solutionCommands, setSolutionCommands] = useState<DrawingCommand[] | null>(null);
  const [aceCode, setAceCode] = useState<string>('');
  const [currentEditor, setCurrentEditor] = useState<'blockly' | 'monaco'>('blockly');

  const gameEngine = useRef<IGameEngine | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const rendererRef = useRef<TurtleRendererHandle>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [executionLog, setExecutionLog] = useState<GameState[] | null>(null);
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);

  const frameIndex = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const lastStepTime = useRef(0);

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [blockCount, setBlockCount] = useState(0);
  const [blocklyKey, setBlocklyKey] = useState(0);
  const [translationVersion, setTranslationVersion] = useState(0);

  const blocklyTheme = useMemo(() => {
    const isDark = colorScheme === 'dark';
    const baseTheme = isDark ? Blockly.Themes.Classic : Blockly.Themes.Zelos;
    return Blockly.Theme.defineTheme('customTheme', {
      name: 'customTheme',
      base: baseTheme,
      categoryStyles: {
        'pond_category': { 'colour': '290' },
        'turtle_category': { 'colour': '160' },
        'loops_category': { 'colour': '%{BKY_LOOPS_HUE}' },
        'colour_category': { 'colour': '%{BKY_COLOUR_HUE}' },
        'logic_category': { 'colour': '%{BKY_LOGIC_HUE}' },
        'math_category': { 'colour': '%{BKY_MATH_HUE}' },
        'text_category': { 'colour': '%{BKY_TEXTS_HUE}' },
        'list_category': { 'colour': '%{BKY_LISTS_HUE}' },
        'variable_category': { 'colour': '%{BKY_VARIABLES_HUE}' },
        'procedure_category': { 'colour': '%{BKY_PROCEDURES_HUE}' },
      },
      componentStyles: isDark ? {
        'workspaceBackgroundColour': '#1e1e1e',
        'toolboxBackgroundColour': '#252526',
        'toolboxForegroundColour': '#fff',
        'flyoutBackgroundColour': '#252526',
        'flyoutForegroundColour': '#ccc',
        'scrollbarColour': '#797979',
      } : {},
      'startHats': true,
    });
  }, [colorScheme]);

  useEffect(() => {
    const handleLanguageChange = () => {
      if (questData) {
        initializeGame(questData.gameType).then(() => setBlocklyKey(prev => prev + 1));
      }
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [questData]);

  useEffect(() => {
    if (questData?.translations) {
      Object.keys(questData.translations).forEach((lang) => {
        i18n.addResourceBundle(lang, 'translation', questData.translations![lang], true, true);
      });
      setTranslationVersion(v => v + 1);
    }
  }, [questData]);

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

  useEffect(() => {
    if (GameEngine && questData) {
      const engine = new GameEngine(questData.gameConfig);
      gameEngine.current = engine;
      const initialEditor = questData.supportedEditors?.[0] || 'blockly';
      setCurrentEditor(initialEditor);

      if (initialEditor === 'monaco' && questData.monacoConfig) {
        setAceCode(questData.monacoConfig.initialCode);
      } else {
        setAceCode(''); // Reset code if default is blockly
      }

      setCurrentGameState(engine.getInitialState());
      setPlayerStatus('idle');
      setExecutionLog(null);
      setBlockCount(0);

      if (currentEditor === 'monaco' && questData.monacoConfig) {
        setAceCode(questData.monacoConfig.initialCode);
      }
      
      if (questData.gameType === 'turtle' && (engine as TurtleEngine).runHeadless && (questData.solution as any).solutionScript) {
        const commands = (engine as TurtleEngine).runHeadless((questData.solution as any).solutionScript);
        setSolutionCommands(commands);
      } else {
        setSolutionCommands(null);
      }
    }
  }, [GameEngine, questData]);
  
  const showResultDialog = (finalState: any) => {
    const result = finalState.result as ResultType;
    if (result === 'success') {
      const code = workspaceRef.current ? javascriptGenerator.workspaceToCode(workspaceRef.current) : '';
      const lines = countLinesOfCode(code);
      let message: string;
      if (lines === 1) message = t('Games.linesOfCode1');
      else message = t('Games.linesOfCode2').replace('%1', String(lines));
      setDialogState({ isOpen: true, title: t('Games.dialogCongratulations'), message });
    } else {
      setDialogState({ isOpen: true, title: t('Games.dialogTryAgain'), message: getFailureMessage(t, result) });
    }
  };

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (playerStatus !== 'running' || !questData) return;
      const engine = gameEngine.current;
      if (!engine) return;
  
      const handleGameOver = (finalEngineState: GameState) => {
        setPlayerStatus('finished');
        let isSuccess = false;

        if (engine.step) {
            if (questData.gameType === 'turtle' && rendererRef.current?.getCanvasData) {
                const { userImageData, solutionImageData } = rendererRef.current.getCanvasData();
                if (userImageData && solutionImageData && (engine as TurtleEngine).verifySolution) {
                    isSuccess = (engine as TurtleEngine).verifySolution(userImageData, solutionImageData, questData.solution.pixelTolerance || 0);
                }
            } else {
                isSuccess = engine.checkWinCondition(finalEngineState, questData.solution);
            }
        } else {
            isSuccess = engine.checkWinCondition(finalEngineState, questData.solution);
        }
        
        const finalState = { ...finalEngineState, result: isSuccess ? 'success' : 'failure' };
        setCurrentGameState(finalState);
        showResultDialog(finalState);
      };

      if (engine.step) {
        if (timestamp - lastStepTime.current < STEP_FRAME_DELAY) {
          animationFrameId.current = requestAnimationFrame(animate);
          return;
        }
        lastStepTime.current = timestamp;
  
        const result = engine.step();
        if (result) {
          setCurrentGameState(result.state);
          if (result.done) {
            handleGameOver(result.state);
          } else {
            animationFrameId.current = requestAnimationFrame(animate);
          }
        }
      } else if (executionLog) {
        if (timestamp - lastStepTime.current < BATCH_FRAME_DELAY) {
            animationFrameId.current = requestAnimationFrame(animate);
            return;
        }
        lastStepTime.current = timestamp;
        const nextIndex = frameIndex.current + 1;
        if (nextIndex >= executionLog.length) {
            const finalState = executionLog[executionLog.length - 1];
            handleGameOver(finalState);
        } else {
          frameIndex.current = nextIndex;
          setCurrentGameState(executionLog[nextIndex]);
          animationFrameId.current = requestAnimationFrame(animate);
        }
      }
    };
  
    if (playerStatus === 'running') {
      animationFrameId.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [playerStatus, executionLog, t, questData]);
  
  const handleRun = () => {
    if (!gameEngine.current || playerStatus === 'running') return;
    
    let userCode = '';
    if (currentEditor === 'monaco') {
      try {
        const es5Code = transform(aceCode, { presets: ['env'] }).code;
        if (!es5Code) {
          throw new Error("Babel transpilation failed.");
        }
        userCode = es5Code;
      } catch (e: any) {
        setDialogState({ isOpen: true, title: 'Syntax Error', message: e.message });
        return;
      }
    } else if (workspaceRef.current) {
      userCode = javascriptGenerator.workspaceToCode(workspaceRef.current);
    } else {
        return;
    }

    frameIndex.current = 0;
    lastStepTime.current = 0;
    const log = gameEngine.current.execute(userCode);
    if (Array.isArray(log)) {
      setExecutionLog(log);
      setCurrentGameState(log[0]);
    } else {
      setExecutionLog(null);
      setCurrentGameState(gameEngine.current.getInitialState());
    }
    setPlayerStatus('running');
  };

  const handleReset = () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (!gameEngine.current) return;
    frameIndex.current = 0;
    setCurrentGameState(gameEngine.current.getInitialState());
    setExecutionLog(null);
    setPlayerStatus('idle');
    setDialogState({ isOpen: false, title: '', message: '' });
  };

  const handleQuestLoad = (loadedQuest: Quest) => {
    setQuestData(loadedQuest);
    setImportError('');
  };

  const handleEditorChange = (editor: 'blockly' | 'monaco') => {
    if (currentEditor === 'monaco' && editor === 'blockly') {
      if (!window.confirm(t('Games.breakLink'))) {
        return; // User cancelled the switch
      }
    }

    if (editor === 'monaco' && workspaceRef.current) {
        const code = javascriptGenerator.workspaceToCode(workspaceRef.current);
        setAceCode(code);
    }
    setCurrentEditor(editor);
  };
  
  const maxBlocks = questData?.blocklyConfig?.maxBlocks;
  const processedToolbox = questData?.supportedEditors?.includes('blockly') && questData.blocklyConfig ? 
    processToolbox(questData.blocklyConfig.toolbox, t) : undefined;
  
  const visualizationProps = {
    gameState: currentGameState,
    gameConfig: questData?.gameConfig,
    ref: questData?.gameType === 'turtle' ? rendererRef : undefined,
    solutionCommands: solutionCommands,
  };

  return (
    <>
      <Dialog isOpen={dialogState.isOpen} title={dialogState.title} onClose={() => setDialogState({ ...dialogState, isOpen: false })}>
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
                {questData?.supportedEditors?.includes('blockly') && maxBlocks && isFinite(maxBlocks) && (
                  <div style={{ fontFamily: 'monospace' }}>{t('Games.blocks')}: {blockCount} / {maxBlocks}</div>
                )}
              </div>
            </div>
            {questData ? (
              <Visualization GameRenderer={GameRenderer} {...visualizationProps} />
            ) : (
              <div className="emptyState" key={translationVersion}><h2>{t('Games.loadQuest')}</h2></div>
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
          {questData && (
            <EditorToolbar
              supportedEditors={questData.supportedEditors || ['blockly']}
              currentEditor={currentEditor}
              onEditorChange={handleEditorChange}
            />
          )}
          {questData && GameEngine ? (
            currentEditor === 'monaco' && questData?.monacoConfig ? (
              <MonacoEditor
                initialCode={aceCode}
                onChange={(value) => setAceCode(value || '')}
              />
            ) : (
              processedToolbox && questData?.blocklyConfig && (
                <BlocklyWorkspace
                  key={`${questData.id}-${blocklyKey}`}
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