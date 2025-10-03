// src/components/QuestPlayer/hooks/useGameLoop.ts

import { useState, useRef, useEffect, useCallback } from 'react';
// import { useTranslation } from 'react-i18next';
import type { IGameEngine, GameState, Quest } from '../../../types';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { TurtleRendererHandle } from '../../../games/turtle/TurtleRenderer';

const BATCH_FRAME_DELAY = 150;
const STEP_FRAME_DELAY = 50;

type PlayerStatus = 'idle' | 'running' | 'finished';

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
) => {
//   const { t } = useTranslation();
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);
  const [executionLog, setExecutionLog] = useState<GameState[] | null>(null);
  
  const frameIndex = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const lastStepTime = useRef(0);

  useEffect(() => {
    if (engineRef.current) {
        setCurrentGameState(engineRef.current.getInitialState());
    }
  }, [engineRef.current]);

  const runGame = useCallback((userCode: string) => {
    const engine = engineRef.current;
    if (!engine || playerStatus === 'running') return;

    frameIndex.current = 0;
    lastStepTime.current = 0;
    const log = engine.execute(userCode);

    if (Array.isArray(log)) {
      setExecutionLog(log);
      setCurrentGameState(log[0]);
    } else {
      setExecutionLog(null);
      setCurrentGameState(engine.getInitialState());
    }
    setPlayerStatus('running');
  }, [engineRef, playerStatus]);

  const resetGame = useCallback(() => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    const engine = engineRef.current;
    if (!engine) return;

    // Hard-reset the internal state of the engine before getting the new initial state.
    if ('reset' in engine && typeof engine.reset === 'function') {
      engine.reset();
    }

    frameIndex.current = 0;
    setCurrentGameState(engine.getInitialState());
    setExecutionLog(null);
    setPlayerStatus('idle');
  }, [engineRef]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (playerStatus !== 'running' || !questData) return;
      const engine = engineRef.current;
      if (!engine) return;

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

        if (isSuccess) {
            playSound('win');
        } else {
            playSound('fail');
        }
        
        const finalState = { ...finalEngineState, result: isSuccess ? 'success' : 'failure' };
        setCurrentGameState(finalState);
        setPlayerStatus('finished');
        onGameEnd({ isSuccess, finalState });
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
  }, [playerStatus, executionLog, questData, engineRef, rendererRef, onGameEnd, playSound]);

  return {
    currentGameState,
    playerStatus,
    runGame,
    resetGame,
  };
};