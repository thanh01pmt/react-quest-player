// src/types/index.ts

// =================================================================
// ==                      QUEST DEFINITIONS                      ==
// =================================================================

/**
 * Defines the structure for the Blockly workspace configuration within a quest.
 */
export interface BlocklyConfig {
    toolbox: string; // This will be a JSON string, not XML.
    maxBlocks?: number;
    startBlocks?: string;
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
    descriptionKey: string;
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
   * Defines the contract that every GameEngine class must follow.
   */
  export interface IGameEngine {
    new(gameConfig: GameConfig): IGameEngine;
    getInitialState(): GameState;
    execute(userCode: string): GameState[];
    checkWinCondition(finalState: GameState, solutionConfig: SolutionConfig): boolean;
  }
  
  /**
   * Defines the contract that every GameRenderer component must follow.
   * It's a React Functional Component.
   */
  export type IGameRenderer = React.FC<{
    gameState: GameState;
    gameConfig: GameConfig;
  }>;