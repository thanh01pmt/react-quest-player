// src/games/maze/Maze2DRenderer.tsx

import React from 'react';
import type { IGameRenderer, MazeConfig } from '../../types';
import type { MazeGameState, Direction } from './types';
import './Maze.css';

const SQUARE_SIZE = 50;
const PEGMAN_WIDTH = 49;
const PEGMAN_HEIGHT = 52;
const FINISH_MARKER_WIDTH = 20;
const FINISH_MARKER_HEIGHT = 34;
const SquareType = { WALL: 0, OPEN: 1, START: 2, FINISH: 3 };

const DIRECTION_TO_FRAME_MAP: Record<Direction, number> = {
  0: 8, 1: 4, 2: 0, 3: 12,
};

// ADDED: Map for special animation poses to spritesheet frames
const POSE_TO_FRAME_MAP: Record<string, number> = {
  'victory1': 16, // From original game's scheduleFinish function
  'victory2': 18,
};

const TILE_SHAPES: Record<string, [number, number]> = {
  '10010': [4, 0],  '10001': [3, 3],  '11000': [0, 1],  '10100': [0, 2],
  '11010': [4, 1],  '10101': [3, 2],  '10110': [0, 0],  '10011': [2, 0],
  '11001': [4, 2],  '11100': [2, 3],  '11110': [1, 1],  '10111': [1, 0],
  '11011': [2, 1],  '11101': [1, 2],  '11111': [2, 2],  'null0': [4, 3],
  'null1': [3, 0],  'null2': [3, 1],  'null3': [0, 3],  'null4': [1, 3],
};

const getTileStyle = (mapData: number[][], x: number, y: number): React.CSSProperties => {
  const COLS = mapData[0].length;
  const ROWS = mapData.length;

  const normalize = (nx: number, ny: number) => {
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return '0';
    return (mapData[ny][nx] === SquareType.WALL) ? '0' : '1';
  };

  let tileShape = normalize(x, y) +
    normalize(x, y - 1) + normalize(x + 1, y) +
    normalize(x, y + 1) + normalize(x - 1, y);

  if (!TILE_SHAPES[tileShape]) {
    if (tileShape === '00000' && Math.random() > 0.3) {
      tileShape = 'null0';
    } else {
      tileShape = 'null' + Math.floor(1 + Math.random() * 4);
    }
  }
  const [left, top] = TILE_SHAPES[tileShape];
  
  return { left: `-${left * SQUARE_SIZE}px`, top: `-${top * SQUARE_SIZE}px` };
};

const MazeMap = React.memo(({ mapData }: { mapData: number[][] }) => {
  return (
    <>
      {mapData.map((row, y) =>
        row.map((_, x) => (
          <div
            key={`${x}-${y}`}
            className="mapCell"
            style={{ left: `${x * SQUARE_SIZE}px`, top: `${y * SQUARE_SIZE}px` }}
          >
            <div className="tileImage" style={getTileStyle(mapData, x, y)} />
          </div>
        ))
      )}
    </>
  );
});

export const Maze2DRenderer: IGameRenderer = ({ gameState, gameConfig }) => {
  const state = gameState as MazeGameState;
  const config = gameConfig as MazeConfig;

  if (!state || !config) return null;

  let frame: number;
  // FIXED: Check for a special pose first, otherwise use direction
  if (state.player.pose && POSE_TO_FRAME_MAP[state.player.pose] !== undefined) {
    frame = POSE_TO_FRAME_MAP[state.player.pose];
  } else {
    frame = DIRECTION_TO_FRAME_MAP[state.player.direction];
  }

  const pegmanStyle: React.CSSProperties = {
    left: `${state.player.x * SQUARE_SIZE + (SQUARE_SIZE - PEGMAN_WIDTH) / 2}px`,
    top: `${state.player.y * SQUARE_SIZE + (SQUARE_SIZE - PEGMAN_HEIGHT) / 2 - 10}px`,
    backgroundPosition: `-${frame * PEGMAN_WIDTH}px 0`,
  };
  const finishStyle: React.CSSProperties = {
    left: `${config.finish.x * SQUARE_SIZE + (SQUARE_SIZE - FINISH_MARKER_WIDTH) / 2}px`,
    top: `${config.finish.y * SQUARE_SIZE + (SQUARE_SIZE - FINISH_MARKER_HEIGHT) / 2 - 15}px`,
  };

  return (
    <div className="mazeContainer">
      <div className="mazeMap">
        <MazeMap mapData={config.map} />
      </div>
      <img src="/assets/maze/marker.png" className="finishMarker" style={finishStyle} alt="Finish" />
      <div className="pegman" style={pegmanStyle} />
    </div>
  );
};