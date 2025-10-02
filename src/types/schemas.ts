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
  type: z.literal('maze'),
  map: z.array(z.array(z.number())),
  player: z.object({
    start: z.object({
      x: z.number(),
      y: z.number(),
      direction: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    }),
  }),
  finish: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

const turtleConfigSchema = z.object({
  type: z.literal('turtle'),
  player: z.object({
    start: z.object({
      x: z.number(),
      y: z.number(),
      direction: z.number(),
      penDown: z.boolean(),
    }),
  }),
});

const gameConfigSchema = z.discriminatedUnion('type', [
  mazeConfigSchema,
  turtleConfigSchema,
]);

// Schema for the solution configuration
const solutionConfigSchema = z.object({
  type: z.enum(['reach_target', 'match_drawing', 'match_music', 'survive_battle']),
  pixelTolerance: z.number().optional(),
  // Add the optional solution fields
  solutionBlocks: z.string().optional(),
  solutionScript: z.string().optional(),
});


// --- The Master Quest Schema ---

export const questSchema = z.object({
  id: z.string(),
  gameType: z.enum(['maze', 'bird', 'turtle', 'movie', 'music', 'pond', 'puzzle']),
  level: z.number(),
  titleKey: z.string(),
  descriptionKey: z.string(),
  
  translations: z.record(z.string(), z.record(z.string(), z.string())).optional(),

  blocklyConfig: blocklyConfigSchema,
  gameConfig: gameConfigSchema,
  solution: solutionConfigSchema,
});

export type Quest = z.infer<typeof questSchema>;