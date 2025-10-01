// src/hooks/useGameLoop.ts

import { useState, useEffect } from 'react';
import type { GameState } from '../types';

/**
 * A custom hook to manage the animation loop for replaying game states.
 *
 * @param log The array of game states to iterate through.
 * @param isPlaying A boolean flag to start or stop the loop.
 * @param speed The delay in milliseconds between each frame.
 * @param onComplete A callback function to execute when the loop finishes.
 * @returns The game state for the current frame, or null if the loop isn't active.
 */
export function useGameLoop(
  log: GameState[] | null,
  isPlaying: boolean,
  speed: number,
  onComplete: () => void
): GameState | null {
  const [frameIndex, setFrameIndex] = useState(0);

  // Reset the frame index whenever a new log is provided.
  useEffect(() => {
    setFrameIndex(0);
  }, [log]);

  // The main timer effect.
  useEffect(() => {
    if (!isPlaying || !log || log.length === 0) {
      return; // Do nothing if not playing or no log is available.
    }

    const intervalId = setInterval(() => {
      setFrameIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= log.length) {
          clearInterval(intervalId); // Stop the timer at the end of the log.
          onComplete(); // Notify the parent component that the loop is done.
          return prevIndex;
        }
        return nextIndex;
      });
    }, speed);

    // Cleanup function to clear the interval when the component unmounts
    // or when the dependencies (isPlaying, log, speed) change.
    return () => clearInterval(intervalId);
  }, [isPlaying, log, speed, onComplete]);

  return log ? log[frameIndex] : null;
}