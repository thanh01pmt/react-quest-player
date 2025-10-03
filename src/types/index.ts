// src/types/index.ts

// =================================================================
// ==                      QUEST DEFINITIONS                      ==
// =================================================================

// --- Toolbox Definition Types (to match react-blockly expectations) ---

interface ToolboxBlock {
  kind: 'block';
  type: string;
  inputs?: Record<string, any>;
  fields?: Record<string, any>;
}

interface ToolboxCategory {
  kind: 'category';
  name: string;
  colour?: string;
  contents: ToolboxItem[];
  categorystyle?: string;
}

interface ToolboxSeparator {
  kind: 'sep';
}

export type ToolboxItem = ToolboxBlock | ToolboxCategory | ToolboxSeparator;

export interface ToolboxJSON {
  kind: 'flyoutToolbox' | 'categoryToolbox';
  contents: ToolboxItem[];
}

// --- Main Config Interfaces ---

/**
 * Defines the structure for the Blockly workspace configuration within a quest.
 */
export interface BlocklyConfig {
  toolbox: ToolboxJSON;
  maxBlocks?: number;
  startBlocks?: string;
}

/**
 * A union type representing all possible game-specific configurations.
 * Each game will have its own config interface.
 */
export type GameConfig = MazeConfig | TurtleConfig | PondConfig; // BirdConfig and MusicConfig removed for now

// Configuration for Monaco editor
export interface MonacoConfig {
  initialCode: string;
}

/**
 * Defines the structure for a single quest file.
 * This is the main data structure loaded by the QuestPlayer.
 */
export interface Quest {
  id: string;
  gameType: 'maze' | 'bird' | 'turtle' | 'movie' | 'music' | 'pond' | 'puzzle';
  level: number;
  titleKey: string;
  descriptionKey: string;
  
  supportedEditors?: ('blockly' | 'monaco')[]; // NEW: Specify editor type

  translations?: Record<string, Record<string, string>>;

  blocklyConfig?: BlocklyConfig; // Now optional
  monacoConfig?: MonacoConfig; // NEW: Monaco-specific config
  
  gameConfig: GameConfig;
  solution: SolutionConfig;
  sounds?: Record<string, string>;
  backgroundMusic?: string;
}

export type ExecutionMode = 'run' | 'debug';

// =================================================================
// ==                 GAME-SPECIFIC CONFIGURATIONS                ==
// =================================================================

interface PlayerStart {
  x: number;
  y: number;
}

export interface MazeConfig {
  type: 'maze';
  map: number[][];
  player: {
    start: PlayerStart & { direction: 0 | 1 | 2 | 3 };
  };
  finish: PlayerStart;
  renderer?: '2d' | '3d';
}

export interface TurtleConfig {
  type: 'turtle';
  player: {
    start: PlayerStart & { direction: number; penDown: boolean };
  };
}

// NEW: Configuration for a single avatar in Pond
export interface PondAvatarConfig {
  name: string;
  isPlayer: boolean;
  start: PlayerStart;
  damage: number;
  code?: string;
}

// UPDATED: Placeholder for Pond game config
export interface PondConfig {
  type: 'pond';
  avatars: PondAvatarConfig[];
}


// Placeholders for other game configs
export interface BirdConfig { /* To be defined */ }
export interface MusicConfig { /* To be defined */ }

// =================================================================
// ==                   SOLUTION CONFIGURATIONS                   ==
// =================================================================

/**
 * Defines how to check for a successful solution.
 */
export interface SolutionConfig {
  type: 'reach_target' | 'match_drawing' | 'match_music' | 'survive_battle' | 'destroy_target';
  pixelTolerance?: number;
  // Optional fields for different solution types
  solutionBlocks?: string;
  solutionScript?: string;
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

export type StepResult = {
    done: boolean;
    state: GameState;
    highlightedBlockId?: string | null;
} | null;

/**
 * Defines the contract for an INSTANCE of a GameEngine class.
 */
export interface IGameEngine {
  reset?(): void;
  getInitialState(): GameState;
  
  execute(userCode: string, onHighlight: (blockId: string) => void): GameState[] | void;

  step?(): StepResult;

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
  [key: string]: any; // Allow other props to be passed through (e.g., ref, solutionCommands)
}>;