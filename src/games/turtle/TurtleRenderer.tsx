// src/games/turtle/TurtleRenderer.tsx

import { useRef, useEffect } from 'react';
import type { IGameRenderer, TurtleConfig } from '../../types';
import type { TurtleGameState } from './types';
import './Turtle.css';

const HEIGHT = 400;
const WIDTH = 400;

// This is a temporary solution for drawing the answer.
// In a future step, this should be generated from a solution path, not hardcoded.
const drawAnswer = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  
  // Draw a square for level 1
  ctx.beginPath();
  ctx.moveTo(200, 200);
  ctx.lineTo(200, 100);
  ctx.lineTo(300, 100);
  ctx.lineTo(300, 200);
  ctx.lineTo(200, 200);
  ctx.stroke();
};


export const TurtleRenderer: IGameRenderer = ({ gameState, gameConfig }) => {
  const state = gameState as TurtleGameState;
  const config = gameConfig as TurtleConfig;

  const displayRef = useRef<HTMLCanvasElement>(null);
  const answerRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement>(null);

  // Initialize the answer canvas once on mount
  useEffect(() => {
    const answerCtx = answerRef.current?.getContext('2d');
    if (answerCtx) {
      // Clear canvas
      answerCtx.canvas.width = answerCtx.canvas.width;
      drawAnswer(answerCtx);
    }
  }, []);

  // Main rendering effect, runs whenever gameState changes
  useEffect(() => {
    if (!state || !config) return;

    const displayCtx = displayRef.current?.getContext('2d');
    const scratchCtx = scratchRef.current?.getContext('2d');
    const answerCanvas = answerRef.current;

    if (!displayCtx || !scratchCtx || !answerCanvas) return;
    
    // Process drawing commands on scratch canvas
    scratchCtx.lineCap = 'round';
    for (const cmd of state.commands) {
        switch (cmd.command) {
            case 'moveTo': scratchCtx.moveTo(cmd.x, cmd.y); break;
            case 'lineTo': scratchCtx.lineTo(cmd.x, cmd.y); break;
            case 'penWidth': scratchCtx.lineWidth = cmd.width; break;
            case 'penColour': scratchCtx.strokeStyle = cmd.colour; scratchCtx.fillStyle = cmd.colour; break;
            case 'stroke': scratchCtx.stroke(); scratchCtx.beginPath(); break;
        }
    }


    // --- Start Drawing on the main display canvas ---
    
    // 1. Clear the display with black.
    displayCtx.beginPath();
    displayCtx.rect(0, 0, WIDTH, HEIGHT);
    displayCtx.fillStyle = '#000';
    displayCtx.fill();

    // 2. Draw the answer layer with transparency.
    displayCtx.globalAlpha = 0.2;
    displayCtx.drawImage(answerCanvas, 0, 0);
    displayCtx.globalAlpha = 1;

    // 3. Draw the user's drawing (from scratch canvas).
    displayCtx.drawImage(scratchRef.current!, 0, 0);

    // 4. Draw the turtle character if visible.
    if (state.turtle.visible) {
      const { x, y, heading } = state.turtle;
      
      // Use the current pen color for the turtle
      displayCtx.strokeStyle = scratchCtx.strokeStyle;
      displayCtx.fillStyle = scratchCtx.fillStyle;
      displayCtx.lineWidth = 3;

      // Draw the turtle body.
      const radius = scratchCtx.lineWidth / 2 + 10;
      displayCtx.beginPath();
      displayCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
      displayCtx.stroke();
  
      // Draw the turtle head.
      const WIDTH = 0.3;
      const HEAD_TIP = 10;
      const ARROW_TIP = 4;
      const BEND = 6;
      let radians = (heading * Math.PI) / 180;
      const tipX = x + (radius + HEAD_TIP) * Math.sin(radians);
      const tipY = y - (radius + HEAD_TIP) * Math.cos(radians);
      radians -= WIDTH;
      const leftX = x + (radius + ARROW_TIP) * Math.sin(radians);
      const leftY = y - (radius + ARROW_TIP) * Math.cos(radians);
      radians += WIDTH / 2;
      const leftControlX = x + (radius + BEND) * Math.sin(radians);
      const leftControlY = y - (radius + BEND) * Math.cos(radians);
      radians += WIDTH;
      const rightControlX = x + (radius + BEND) * Math.sin(radians);
      const rightControlY = y - (radius + BEND) * Math.cos(radians);
      radians += WIDTH / 2;
      const rightX = x + (radius + ARROW_TIP) * Math.sin(radians);
      const rightY = y - (radius + ARROW_TIP) * Math.cos(radians);
      displayCtx.beginPath();
      displayCtx.moveTo(tipX, tipY);
      displayCtx.lineTo(leftX, leftY);
      displayCtx.bezierCurveTo(leftControlX, leftControlY, rightControlX, rightControlY, rightX, rightY);
      displayCtx.closePath();
      displayCtx.fill();
    }

  }, [state, config]);


  return (
    <div className="turtleContainer">
      <canvas id="displayCanvas" ref={displayRef} width={WIDTH} height={HEIGHT}></canvas>
      <canvas id="answerCanvas" ref={answerRef} width={WIDTH} height={HEIGHT} style={{ display: 'none' }}></canvas>
      <canvas id="scratchCanvas" ref={scratchRef} width={WIDTH} height={HEIGHT} style={{ display: 'none' }}></canvas>
    </div>
  );
};