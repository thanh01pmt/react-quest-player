// src/types/schemas.ts

import { z } from 'zod';

// Schema for the Blockly toolbox (JSON format)
const toolboxJsonSchema = z.object({
  kind: z.enum(['flyoutToolbox', 'categoryToolbox']),
  contents: z.array(z.any()), // Keep 'any' for now for simplicity, can be refined later
});

// Schema for Blockly configuration
const blocklyConfigSchema = z.object({
  toolbox: toolboxJsonSchema,
  maxBlocks: z.number().optional(),
  startBlocks: z.string().optional(),
});

// --- Game-specific Config Schemas ---

const mazeConfigSchema = z.object({
  map: z.array(z.array(z.number())),
  player: z.object({
    start: z.object({
      x: z.number(),
      y: z.number(),
      direction: z.literal(0).or(z.literal(1)).or(z.literal(2)).or(z.literal(3)),
    }),
  }),
  finish: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

// For now, GameConfig only validates Maze. We will expand this later.
// Using a discriminated union is the best practice for future expansion.
const gameConfigSchema = mazeConfigSchema; // Placeholder for discriminated union

// Schema for the solution configuration
const solutionConfigSchema = z.object({
  type: z.enum(['reach_target', 'match_drawing', 'match_music', 'survive_battle']),
  // Optional fields can be added here as needed
  pixelTolerance: z.number().optional(),
});


// --- The Master Quest Schema ---

export const questSchema = z.object({
  id: z.string(),
  gameType: z.enum(['maze', 'bird', 'turtle', 'movie', 'music', 'pond', 'puzzle']),
  level: z.number(),
  titleKey: z.string(),
  descriptionKey: z.string(),
  blocklyConfig: blocklyConfigSchema,
  gameConfig: gameConfigSchema, // Will be updated to a discriminated union later
  solution: solutionConfigSchema,
});

// We can also infer the TypeScript type from the schema if needed
export type Quest = z.infer<typeof questSchema>;