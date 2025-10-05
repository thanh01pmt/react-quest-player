// src/components/QuestPlayer/hooks/useGameLoop.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import type { IGameEngine, GameState, Quest, StepResult, ExecutionMode } from '../../../types';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { TurtleRendererHandle } from '../../../games/turtle/TurtleRenderer';

const BATCH_FRAME_DELAY = 50;
const STEP_FRAME_DELAY = 2000;
const DEBUG_FRAME_DELAY = 2000; // Delay for debug mode

type PlayerStatus = 'idle' | 'running' | 'paused' | 'finished';

interface GameLoopResult {
  isSuccess: boolean;
  finalState: GameState;
}

export const useGameLoop = (
  engineRef: React.RefObject<IGameEngine>,
  questData: Quest | null,
  rendererRef: React.RefObject<TurtleRendererHandle>,
  onGameEnd: (result: GameLoopResult) => void,
  playSound: (name: string, volume?: number) => void,
  setHighlightedBlockId: (id: string | null) => void,
) => {
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);
  const [executionLog, setExecutionLog] = useState<GameState[] | null>(null);
  
  const frameIndex = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const lastStepTime = useRef(0);
  const executionModeRef = useRef<ExecutionMode>('run');

  // Logic to execute a single step, refactored to be reusable
  const executeSingleStep = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !questData) return;

    const handleGameOver = (finalEngineState: GameState) => {
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

      if (isSuccess) playSound('win'); else playSound('fail');
      
      const finalState = { ...finalEngineState, result: isSuccess ? 'success' : 'failure' };
      setCurrentGameState(finalState);
      setPlayerStatus('finished');
      setHighlightedBlockId(null);
      onGameEnd({ isSuccess, finalState });
    };

    if (engine.step) {
      const result: StepResult = engine.step();
      if (result) {
        setCurrentGameState(result.state);
        if (executionModeRef.current === 'debug' && result.highlightedBlockId) {
          setHighlightedBlockId(result.highlightedBlockId);
        }
        if (result.done) {
          handleGameOver(result.state);
          return false; // Game is over
        }
      }
    } else if (executionLog) {
      const nextIndex = frameIndex.current + 1;
      if (nextIndex >= executionLog.length) {
        const finalState = executionLog[executionLog.length - 1];
        handleGameOver(finalState);
        return false; // Game is over
      } else {
        frameIndex.current = nextIndex;
        setCurrentGameState(executionLog[nextIndex]);
      }
    }
    return true; // Game continues
  }, [engineRef, questData, executionLog, rendererRef, onGameEnd, playSound, setHighlightedBlockId]);


  const runGame = useCallback((userCode: string, mode: ExecutionMode) => {
    const engine = engineRef.current;
    if (!engine || playerStatus === 'running' || playerStatus === 'paused') return;

    setHighlightedBlockId(null);
    executionModeRef.current = mode;
    frameIndex.current = 0;
    lastStepTime.current = 0;
    
    const onHighlight = (blockId: string) => {
        if (executionModeRef.current === 'debug') {
            setHighlightedBlockId(blockId);
        }
    };
    const log = engine.execute(userCode, onHighlight);

    if (Array.isArray(log)) {
      setExecutionLog(log);
      setCurrentGameState(log[0]);
    } else {
      setExecutionLog(null);
      setCurrentGameState(engine.getInitialState());
    }
    setPlayerStatus('running');
  }, [engineRef, playerStatus, setHighlightedBlockId]);

  const resetGame = useCallback(() => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    const engine = engineRef.current;
    if (!engine) return;

    if ('reset' in engine && typeof engine.reset === 'function') {
      engine.reset();
    }

    frameIndex.current = 0;
    setCurrentGameState(engine.getInitialState());
    setExecutionLog(null);
    setPlayerStatus('idle');
    setHighlightedBlockId(null);
  }, [engineRef, setHighlightedBlockId]);

  const pauseGame = useCallback(() => {
    if (playerStatus === 'running') {
      setPlayerStatus('paused');
    }
  }, [playerStatus]);

  const resumeGame = useCallback(() => {
    if (playerStatus === 'paused') {
      setPlayerStatus('running');
    }
  }, [playerStatus]);
  
  const stepForward = useCallback(() => {
    if (playerStatus === 'paused') {
      executeSingleStep();
    }
  }, [playerStatus, executeSingleStep]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (playerStatus !== 'running') {
        return;
      }

      const delay = executionModeRef.current === 'debug' ? DEBUG_FRAME_DELAY : (engineRef.current?.step ? STEP_FRAME_DELAY : BATCH_FRAME_DELAY);
      
      if (timestamp - lastStepTime.current < delay) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }
      lastStepTime.current = timestamp;

      const gameContinues = executeSingleStep();

      if (gameContinues) {
        animationFrameId.current = requestAnimationFrame(animate);
      }
    };

    if (playerStatus === 'running') {
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [playerStatus, executeSingleStep, engineRef]);

  return {
    currentGameState,
    playerStatus,
    runGame,
    resetGame,
    pauseGame,
    resumeGame,
    stepForward,
  };
};