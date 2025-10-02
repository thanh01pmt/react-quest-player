// src/games/pond/PondRenderer.tsx

import { useRef, useEffect, useMemo } from 'react';
import type { IGameRenderer } from '../../types';
import type { PondGameState } from './types';
import './Pond.css';

const CANVAS_SIZE = 400;
const AVATAR_SIZE = 35;
const AVATAR_HALF_SIZE = AVATAR_SIZE / 2;
const MISSILE_RADIUS = 5;

const POND_COLOURS = ['#ff8b00', '#c90015', '#166c0b', '#223068'];

// Helper to convert 0-100 coordinate to canvas coordinate
const toCanvas = (val: number) => (val / 100) * (CANVAS_SIZE - AVATAR_SIZE) + AVATAR_HALF_SIZE;

export const PondRenderer: IGameRenderer = ({ gameState }) => {
  const state = gameState as PondGameState;
  
  const displayRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement>(null);
  const sprites = useMemo(() => new Image(), []);

  // Preload sprites
  useEffect(() => {
    sprites.src = '/assets/pond/sprites.png';
  }, [sprites]);

  useEffect(() => {
    if (!state || !sprites.complete) return;

    const displayCtx = displayRef.current?.getContext('2d');
    const scratchCtx = scratchRef.current?.getContext('2d');

    if (!displayCtx || !scratchCtx) return;

    // --- Draw on scratch canvas ---
    // 1. Clear with blue background
    scratchCtx.beginPath();
    scratchCtx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    scratchCtx.fillStyle = '#527dbf';
    scratchCtx.fill();

    // 2. Draw avatars (dead ones first)
    const sortedAvatars = [...state.avatars].sort((a, b) => (a.dead ? 1 : 0) - (b.dead ? 1 : 0));
    for (const avatar of sortedAvatars) {
        const x = toCanvas(avatar.x);
        const y = toCanvas(100 - avatar.y);
        const colorIndex = avatar.visualizationIndex % POND_COLOURS.length;
        const spriteY = colorIndex * AVATAR_SIZE;

        scratchCtx.save();
        scratchCtx.translate(x, y);
        if (avatar.dead) {
            scratchCtx.globalAlpha = 0.25;
        }
        
        // Draw avatar body (simplified: no head rotation for now)
        scratchCtx.drawImage(sprites, 0, spriteY, AVATAR_SIZE, AVATAR_SIZE, -AVATAR_HALF_SIZE, -AVATAR_HALF_SIZE, AVATAR_SIZE, AVATAR_SIZE);
        scratchCtx.restore();
    }
    
    // 3. Draw missiles
    for (const missile of state.missiles) {
        const x = toCanvas(missile.x);
        const y = toCanvas(100 - missile.y);
        const shadowY = toCanvas(100 - missile.shadowY);
        const owner = state.avatars.find(a => a.id === missile.ownerId);
        const color = owner ? POND_COLOURS[owner.visualizationIndex % POND_COLOURS.length] : '#000';

        // Draw shadow
        scratchCtx.beginPath();
        scratchCtx.arc(x, shadowY, Math.max(0, 1 - missile.parabola / 10) * MISSILE_RADIUS, 0, 2 * Math.PI);
        scratchCtx.fillStyle = `rgba(0, 0, 0, 0.2)`;
        scratchCtx.fill();

        // Draw missile
        scratchCtx.beginPath();
        scratchCtx.arc(x, y, MISSILE_RADIUS, 0, 2 * Math.PI);
        scratchCtx.fillStyle = color;
        scratchCtx.fill();
    }

    // 4. Draw events (e.g., explosions)
    for (const event of state.events) {
        if (event.type === 'BOOM') {
            const x = toCanvas(event.x);
            const y = toCanvas(100 - event.y);
            scratchCtx.beginPath();
            scratchCtx.arc(x, y, MISSILE_RADIUS * 2, 0, 2 * Math.PI);
            scratchCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            scratchCtx.lineWidth = MISSILE_RADIUS;
            scratchCtx.stroke();
        }
    }


    // --- Copy scratch to display ---
    displayCtx.drawImage(scratchRef.current!, 0, 0);

  }, [state, sprites.complete]);


  return (
    <div className="pondContainer">
      <canvas id="displayCanvas" ref={displayRef} width={CANVAS_SIZE} height={CANVAS_SIZE}></canvas>
      <canvas id="scratchCanvas" ref={scratchRef} width={CANVAS_SIZE} height={CANVAS_SIZE}></canvas>
    </div>
  );
};