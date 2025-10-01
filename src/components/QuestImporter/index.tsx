// src/components/QuestImporter/index.tsx

import React, { useState } from 'react';
import { questSchema } from '../../types/schemas';
import type { Quest } from '../../types';

interface QuestImporterProps {
  onQuestLoad: (quest: Quest) => void;
  onError: (message: string) => void;
}

export const QuestImporter: React.FC<QuestImporterProps> = ({ onQuestLoad, onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    onError(''); // Clear previous errors

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }

        const jsonData = JSON.parse(text);

        // Validate the JSON data against our Zod schema
        const validationResult = questSchema.safeParse(jsonData);

        if (validationResult.success) {
          // If validation is successful, pass the data to the parent
          onQuestLoad(validationResult.data as Quest);
        } else {
          // If validation fails, report the error
          console.error('Zod validation error:', validationResult.error.flatten());
          throw new Error('Invalid Quest file format.');
        }
      } catch (error: any) {
        onError(error.message || 'An unknown error occurred during file processing.');
      } finally {
        setIsLoading(false);
        // Reset the input value to allow re-uploading the same file
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      onError('Error reading the file.');
      setIsLoading(false);
      event.target.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <input
        id="quest-importer"
        type="file"
        accept=".json"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      {isLoading && <p>Loading and validating...</p>}
    </div>
  );
};