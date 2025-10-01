// src/games/maze/index.ts

import { MazeEngine } from './MazeEngine';
// We will create and export the renderer in a future step.
// import { Maze2DRenderer } from './Maze2DRenderer';

// Export the engine constructor
export const GameEngine = MazeEngine;

// Export the renderer component. For now, it's a placeholder.
// We'll replace this with the actual renderer later.
export const GameRenderer = () => null;