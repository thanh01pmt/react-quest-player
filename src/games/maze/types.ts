// src/games/maze/types.ts

import type { GameState } from '../../types';

/**
 * Defines the cardinal directions.
 * 0: North, 1: East, 2: South, 3: West
 */
export type Direction = 0 | 1 | 2 | 3;

/**
 * Defines the possible outcomes of a game execution.
 */
export type ResultType = 'unset' | 'success' | 'failure' | 'timeout' | 'error';

/**
 * Defines the state of the player character.
 */
export type PlayerState = {
  x: number;
  y: number;
  direction: Direction;
  pose?: string; // For special animations like victory dance
};

/**
 * The specific game state for the Maze game.
 */
export interface MazeGameState extends GameState {
  player: PlayerState;
  result: ResultType;
  isFinished: boolean;
}