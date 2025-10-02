// src/types/index.ts

// =================================================================
// ==                      QUEST DEFINITIONS                      ==
// =================================================================

// --- Toolbox Definition Types (to match react-blockly expectations) ---

interface ToolboxBlock {
  kind: 'block';
  type: string;
  fields?: Record<string, any>;
}

interface ToolboxCategory {
  kind: 'category';
  name: string;
  colour?: string;
  contents: ToolboxItem[];
}

interface ToolboxSeparator {
  kind: 'sep';
}

type ToolboxItem = ToolboxBlock | ToolboxCategory | ToolboxSeparator;

export interface ToolboxJSON {
  kind: 'flyoutToolbox' | 'categoryToolbox';
  contents: ToolboxItem[];
}

// --- Main Config Interfaces ---

/**
 * Defines the structure for the Blockly workspace configuration within a quest.
 */
export interface BlocklyConfig {
  toolbox: ToolboxJSON; // FIXED: Use the specific ToolboxJSON interface
  maxBlocks?: number;
  startBlocks?: string; // XML string for starting blocks
}

/**
 * A union type representing all possible game-specific configurations.
 * Each game will have its own config interface.
 */
export type GameConfig = MazeConfig | TurtleConfig | BirdConfig | MusicConfig | PondConfig; // Add more as games are developed

/**
 * Defines the structure for a single quest file.
 * This is the main data structure loaded by the QuestPlayer.
 */
export interface Quest {
  id: string;
  gameType: 'maze' | 'bird' | 'turtle' | 'movie' | 'music' | 'pond' | 'puzzle';
  level: number;
  titleKey: string;
  descriptionKey: string; // The key to look up for the description
  
  // ADDED: Optional, in-quest translations that will be merged at runtime.
  // Structure: { "en": { "key": "value" }, "vi": { "key": "value" } }
  translations?: Record<string, Record<string, string>>;

  blocklyConfig: BlocklyConfig;
  gameConfig: GameConfig;
  solution: SolutionConfig;
}

// =================================================================
// ==                 GAME-SPECIFIC CONFIGURATIONS                ==
// =================================================================

// Using a base interface for player start info might be useful later.
interface PlayerStart {
  x: number;
  y: number;
}

export interface MazeConfig {
  map: number[][];
  player: {
    start: PlayerStart & { direction: 0 | 1 | 2 | 3 }; // 0:N, 1:E, 2:S, 3:W
  };
  finish: PlayerStart;
}

export interface TurtleConfig {
  player: {
    start: PlayerStart & { direction: number; penDown: boolean };
  };
}

export interface BirdConfig {
  player: {
    start: PlayerStart & { angle: number };
  };
  worm?: PlayerStart;
  nest: PlayerStart;
  walls: { x1: number; y1: number; x2: number; y2: number }[];
}

export interface MusicConfig {
  expectedMelody: (number | string)[][];
}

// Placeholder for Pond game config
export interface PondConfig {
  // To be defined
}

// =================================================================
// ==                   SOLUTION CONFIGURATIONS                   ==
// =================================================================

/**
 * Defines how to check for a successful solution.
 */
export interface SolutionConfig {
  type: 'reach_target' | 'match_drawing' | 'match_music' | 'survive_battle';
  // Optional properties depending on the solution type
  drawingCommands?: { action: string; [key: string]: any; }[];
  pixelTolerance?: number;
}

// =================================================================
// ==                  ENGINE & RENDERER INTERFACES               ==
// =================================================================

/**
 * A generic type for the game state. Each game will extend this.
 */
export interface GameState {
  // Common properties can be added here if any.
}

/**
 * Defines the contract for an INSTANCE of a GameEngine class.
 */
export interface IGameEngine {
  getInitialState(): GameState;
  execute(userCode: string): GameState[];
  checkWinCondition(finalState: GameState, solutionConfig: SolutionConfig): boolean;
}

/**
 * Defines the contract for the CONSTRUCTOR of a GameEngine class.
 */
export type GameEngineConstructor = new (gameConfig: GameConfig) => IGameEngine;


/**
 * Defines the contract that every GameRenderer component must follow.
 * It's a React Functional Component.
 */
export type IGameRenderer = React.FC<{
  gameState: GameState;
  gameConfig: GameConfig;
}>;