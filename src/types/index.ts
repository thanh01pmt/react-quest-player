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

export interface BlocklyConfig {
  toolbox: ToolboxJSON;
  maxBlocks?: number;
  startBlocks?: string;
}

export type GameConfig = MazeConfig | TurtleConfig | PondConfig;

export interface MonacoConfig {
  initialCode: string;
}

export interface Quest {
  id: string;
  gameType: 'maze' | 'bird' | 'turtle' | 'movie' | 'music' | 'pond' | 'puzzle';
  level: number;
  titleKey: string;
  descriptionKey: string;
  
  supportedEditors?: ('blockly' | 'monaco')[];

  translations?: Record<string, Record<string, string>>;

  blocklyConfig?: BlocklyConfig;
  monacoConfig?: MonacoConfig;
  
  gameConfig: GameConfig;
  solution: SolutionConfig;
  sounds?: Record<string, string>;
  backgroundMusic?: string;
}

export type ExecutionMode = 'run' | 'debug';

export type CameraMode = 'Follow' | 'TopDown' | 'Free';

// =================================================================
// ==                 GAME-SPECIFIC CONFIGURATIONS                ==
// =================================================================

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

// SỬA LỖI: Thêm từ khóa 'export'
export interface Block {
  modelKey: string;
  position: Position3D;
}

export interface MazeConfig {
  type: 'maze';
  blocks: Block[]; // Thay thế 'map' bằng 'blocks'
  player: {
    start: Position3D & { direction: 0 | 1 | 2 | 3 }; // Thêm 'y'
  };
  finish: Position3D; // finish giờ là một vị trí 3D
  renderer?: '2d' | '3d';
}

export interface TurtleConfig {
  type: 'turtle';
  player: {
    start: { x: number, y: number } & { direction: number; penDown: boolean };
  };
}

export interface PondAvatarConfig {
  name: string;
  isPlayer: boolean;
  start: { x: number, y: number };
  damage: number;
  code?: string;
}

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

export interface SolutionConfig {
  type: 'reach_target' | 'match_drawing' | 'match_music' | 'survive_battle' | 'destroy_target';
  pixelTolerance?: number;
  solutionBlocks?: string;
  solutionScript?: string;
}

// =================================================================
// ==                  ENGINE & RENDERER INTERFACES               ==
// =================================================================

export interface GameState {
  // Common properties can be added here if any.
}

export type StepResult = {
    done: boolean;
    state: GameState;
    highlightedBlockId?: string | null;
} | null;

export interface IGameEngine {
  reset?(): void;
  getInitialState(): GameState;
  
  execute(userCode: string, onHighlight: (blockId: string) => void): GameState[] | void;

  step?(): StepResult;

  checkWinCondition(finalState: GameState, solutionConfig: SolutionConfig): boolean;
}

export type GameEngineConstructor = new (gameConfig: GameConfig) => IGameEngine;

export type IGameRenderer = React.FC<{
  gameState: GameState;
  gameConfig: GameConfig;
  [key: string]: any;
}>;