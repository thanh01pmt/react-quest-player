// src/types/schemas.ts

import { z } from 'zod';

// SỬA ĐỔI: Gỡ bỏ `export` vì chỉ dùng nội bộ
const toolboxJsonSchema = z.object({
  kind: z.enum(['flyoutToolbox', 'categoryToolbox']),
  contents: z.array(z.any()),
});

// SỬA ĐỔI: Gỡ bỏ `export`
const blocklyConfigSchema = z.object({
  toolbox: toolboxJsonSchema,
  maxBlocks: z.number().optional(),
  startBlocks: z.string().optional(),
});

// SỬA ĐỔI: Gỡ bỏ `export`
const monacoConfigSchema = z.object({
    initialCode: z.string(),
});

// --- Game-specific Config Schemas (giữ private) ---

const position3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const blockSchema = z.object({
  modelKey: z.string(),
  position: position3DSchema,
});

const mazeConfigSchema = z.object({
  type: z.literal('maze'),
  renderer: z.enum(['2d', '3d']).optional(),
  map: z.array(z.array(z.number())).optional(),
  blocks: z.array(blockSchema).optional(),
  player: z.object({
    start: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number().optional(),
      direction: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    }),
  }),
  finish: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional(),
  }),
}).superRefine((data, ctx) => {
  if (!data.map && !data.blocks) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maze config must have either 'map' or 'blocks'" });
  }
  if (data.map && data.blocks) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maze config cannot have both 'map' and 'blocks'" });
  }
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

const coordinateSchema = z.object({ x: z.number(), y: z.number() });
const lineSchema = z.object({ x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() });
const birdConfigSchema = z.object({
  type: z.literal('bird'),
  start: coordinateSchema,
  startAngle: z.number(),
  worm: coordinateSchema.nullable(),
  nest: coordinateSchema,
  walls: z.array(lineSchema),
});


const gameConfigSchema = z.discriminatedUnion('type', [
  mazeConfigSchema,
  turtleConfigSchema,
  pondConfigSchema,
  birdConfigSchema, // THÊM MỚI
]);

const solutionConfigSchema = z.object({
  type: z.enum(['reach_target', 'match_drawing', 'match_music', 'survive_battle', 'destroy_target']),
  pixelTolerance: z.number().optional(),
  solutionBlocks: z.string().optional(),
  solutionScript: z.string().optional(),
  optimalBlocks: z.number().optional(),
  solutionMaxBlocks: z.number().optional(),
});

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
