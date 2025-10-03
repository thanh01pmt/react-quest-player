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

// NEW: Schema for Monaco configuration
const monacoConfigSchema = z.object({
    initialCode: z.string(),
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
  renderer: z.enum(['2d', '3d']).optional(),
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

const pondAvatarConfigSchema = z.object({
    name: z.string(),
    isPlayer: z.boolean(),
    start: z.object({ x: z.number(), y: z.number() }),
    damage: z.number(),
    code: z.string().optional(),
});

const pondConfigSchema = z.object({
    type: z.literal('pond'),
    avatars: z.array(pondAvatarConfigSchema),
});

// A discriminated union for all possible game configurations.
const gameConfigSchema = z.discriminatedUnion('type', [
  mazeConfigSchema,
  turtleConfigSchema,
  pondConfigSchema,
]);

// Schema for the solution configuration
const solutionConfigSchema = z.object({
  type: z.enum(['reach_target', 'match_drawing', 'match_music', 'survive_battle', 'destroy_target']),
  pixelTolerance: z.number().optional(),
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
  
  supportedEditors: z.array(z.enum(['blockly', 'monaco'])).default(['blockly']),

  translations: z.record(z.string(), z.record(z.string(), z.string())).optional(),

  blocklyConfig: blocklyConfigSchema.optional(),
  monacoConfig: monacoConfigSchema.optional(),

  gameConfig: gameConfigSchema,
  solution: solutionConfigSchema,
  sounds: z.record(z.string(), z.string()).optional(),
  backgroundMusic: z.string().optional(),
});

export type Quest = z.infer<typeof questSchema>;