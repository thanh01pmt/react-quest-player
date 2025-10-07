// src/games/maze/types.ts

import type { GameState, Block, Collectible, Interactive } from '../../types';

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
 * The entire world state is now managed here to support in-game world modification.
 */
export interface MazeGameState extends GameState {
  // World definition (mutable)
  blocks: Block[];
  collectibles: Collectible[];
  interactibles: Interactive[];

  // Player states
  players: { [id: string]: PlayerState };
  activePlayerId: string;
  
  // Gameplay progress trackers
  collectedIds: string[];
  interactiveStates: { [id: string]: string };

  // Game execution status
  result: ResultType;
  isFinished: boolean;
}