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
 * Defines the state of a single player character.
 * An 'id' is added to uniquely identify each character.
 */
export type PlayerState = {
  id: string; // Unique identifier for the character
  x: number;
  y: number; // Represents height
  z: number; // Represents depth
  direction: Direction;
  pose?: string; // For special animations like victory dance
};

/**
 * The specific game state for the Maze game.
 * Updated to support multiple players, collectibles, and interactives.
 */
export interface MazeGameState extends GameState {
  // A map of player states, keyed by their unique ID.
  players: { [id: string]: PlayerState };

  // The ID of the player currently being controlled by the code execution.
  activePlayerId: string;
  
  // An array of IDs of collectibles that have been picked up.
  collectedIds: string[];
  
  // A map storing the current state (e.g., 'on'/'off') of interactive objects.
  interactiveStates: { [id: string]: string };

  result: ResultType;
  isFinished: boolean;
}