// src/components/Visualization/index.tsx

import React from 'react';

// At this stage, Visualization is just a placeholder.
// It will later receive gameState and render the actual game.
export const Visualization: React.FC = () => {
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#888',
    fontSize: '1.5em',
    fontFamily: 'sans-serif',
  };

  return (
    <div style={style}>
      <span>Game Visualization Area</span>
    </div>
  );
};