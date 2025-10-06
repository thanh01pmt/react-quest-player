// src/components/QuestPlayer/hooks/useGameLoop.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import type { IGameEngine, GameState, Quest, StepResult, ExecutionMode } from '../../../types';
import type { TurtleEngine } from '../../../games/turtle/TurtleEngine';
import type { TurtleRendererHandle } from '../../../games/turtle/TurtleRenderer';

const BATCH_FRAME_DELAY = 150;
const STEP_FRAME_DELAY = 30; // Giảm delay cho chế độ Run để mượt hơn
const DEBUG_FRAME_DELAY = 2000;

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
  const isWaitingForAnimation = useRef(false); // STATE MỚI

  // HÀM MỚI: Callback được gọi khi animation hoàn thành
  const handleActionComplete = useCallback(() => {
    isWaitingForAnimation.current = false;
  }, []);

  const executeSingleStep = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !questData) return true; // return true để vòng lặp tiếp tục

    const handleGameOver = (finalEngineState: GameState) => {
      let isSuccess = false;
      // Logic kiểm tra chiến thắng cho Turtle (cần canvas data)
      if (questData.gameType === 'turtle' && rendererRef.current?.getCanvasData) {
        const { userImageData, solutionImageData } = rendererRef.current.getCanvasData();
        if (userImageData && solutionImageData && (engine as TurtleEngine).verifySolution) {
          isSuccess = (engine as TurtleEngine).verifySolution(userImageData, solutionImageData, questData.solution.pixelTolerance || 0);
        }
      } else {
        // Logic kiểm tra chiến thắng chung
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
        // Sau khi cập nhật state, chúng ta chờ animation
        isWaitingForAnimation.current = true; 

        if (executionModeRef.current === 'debug' && result.highlightedBlockId) {
          setHighlightedBlockId(result.highlightedBlockId);
        }
        if (result.done) {
          handleGameOver(result.state);
          return false; // Game kết thúc, dừng vòng lặp
        }
      } else {
        // Nếu engine.step() trả về null (không có gì để làm), không cần chờ
        isWaitingForAnimation.current = false;
      }
    } else if (executionLog) {
      // Logic cho Batch Engine không cần chờ
      isWaitingForAnimation.current = false; 
      const nextIndex = frameIndex.current + 1;
      if (nextIndex >= executionLog.length) {
        const finalState = executionLog[executionLog.length - 1];
        handleGameOver(finalState);
        return false; // Game kết thúc, dừng vòng lặp
      } else {
        frameIndex.current = nextIndex;
        setCurrentGameState(executionLog[nextIndex]);
      }
    }
    return true; // Game tiếp tục, tiếp tục vòng lặp
  }, [engineRef, questData, executionLog, rendererRef, onGameEnd, playSound, setHighlightedBlockId]);


  const runGame = useCallback((userCode: string, mode: ExecutionMode) => {
    const engine = engineRef.current;
    if (!engine || playerStatus === 'running' || playerStatus === 'paused') return;

    isWaitingForAnimation.current = false; // Reset trạng thái chờ
    setHighlightedBlockId(null);
    executionModeRef.current = mode;
    frameIndex.current = 0;
    lastStepTime.current = 0;
    
    const onHighlight = (blockId: string) => {
        if (executionModeRef.current === 'debug') {
            setHighlightedBlockId(blockId);
        }
    };
    engine.execute(userCode, onHighlight); // Giờ execute không trả về gì cả

    // Logic xử lý log bị loại bỏ vì giờ engine nào cũng step-based (hoặc sẽ là vậy)
    // Cập nhật để xử lý cả 2 trường hợp
    if (engine.step) {
      setExecutionLog(null);
      setCurrentGameState(engine.getInitialState());
    } else {
      // Giữ lại logic cũ cho các engine chưa được nâng cấp
      // @ts-ignore
      const log = engine.log || [];
      setExecutionLog(log);
      setCurrentGameState(log[0] || engine.getInitialState());
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

    isWaitingForAnimation.current = false;
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
      isWaitingForAnimation.current = false; // Bỏ qua chờ khi step forward thủ công
      executeSingleStep();
    }
  }, [playerStatus, executeSingleStep]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (playerStatus !== 'running') {
        animationFrameId.current = null;
        return;
      }
      
      // THAY ĐỔI: Không làm gì nếu đang chờ animation
      if (isWaitingForAnimation.current) {
        animationFrameId.current = requestAnimationFrame(animate);
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
      } else {
        animationFrameId.current = null;
      }
    };

    if (playerStatus === 'running' && animationFrameId.current === null) {
      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
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
    handleActionComplete, // TRẢ VỀ HÀM MỚI
  };
};