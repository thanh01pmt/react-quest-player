// src/components/QuestPlayer/index.tsx

import React, { useState, useEffect } from 'react';
import type { Quest } from '../../types';
import { BlocklyWorkspace } from '../BlocklyWorkspace';
import { Visualization } from '../Visualization';

interface QuestPlayerProps {
  questId: string;
}

export const QuestPlayer: React.FC<QuestPlayerProps> = ({ questId }) => {
  const [questData, setQuestData] = useState<Quest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setQuestData(null); // Reset data on quest change

    fetch(`/quests/${questId}.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setQuestData(data as Quest);
      })
      .catch(err => {
        console.error("Failed to load quest data:", err);
        setError(`Could not load quest: ${questId}.json`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [questId]);

  if (loading) {
    return <div>Loading Quest...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!questData) {
    return <div>No quest data found.</div>;
  }

  const handleRun = (userCode: string) => {
    // Placeholder for future implementation
    console.log("Running user code:");
    console.log(userCode);
    alert("Execution logic not yet implemented.");
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
        <Visualization />
      </div>
      <div style={{ flex: 1 }}>
        <BlocklyWorkspace
          key={questId} // Add key to force re-mount on quest change
          blocklyConfig={questData.blocklyConfig}
          onRun={handleRun}
        />
      </div>
    </div>
  );
};