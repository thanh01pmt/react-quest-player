// src/games/maze/index.ts

import { MazeEngine } from './MazeEngine';
import { Maze2DRenderer } from './Maze2DRenderer';

// Export the engine constructor
export const GameEngine = MazeEngine;

// Export the renderer component
export const GameRenderer = Maze2DRenderer;