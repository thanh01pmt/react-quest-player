// src/games/maze/blocks.ts

/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Blocks for Maze game, refactored for ES6 modules.
 * @author fraser@google.com (Neil Fraser)
 */

import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';

/**
 * Construct custom maze block types. Called from QuestPlayer.
 */
export function init() {
  /**
   * Common HSV hue for all movement blocks.
   */
  const MOVEMENT_HUE = 290;

  /**
   * HSV hue for loop block.
   */
  const LOOPS_HUE = 120;

  /**
   * Common HSV hue for all logic blocks.
   */
  const LOGIC_HUE = 210;

  /**
   * Counterclockwise arrow to be appended to left turn option.
   */
  const LEFT_TURN = ' ↺';

  /**
   * Clockwise arrow to be appended to right turn option.
   */
  const RIGHT_TURN = ' ↻';

  // Using hardcoded English strings until i18n is implemented.
  const TURN_DIRECTIONS: [string, string][] = [
    ['turn left', 'turnLeft'],
    ['turn right', 'turnRight'],
  ];

  const PATH_DIRECTIONS: [string, string][] = [
    ['path ahead', 'isPathForward'],
    ['path to the left', 'isPathLeft'],
    ['path to the right', 'isPathRight'],
  ];

  // Add arrows to turn options after prefix/suffix have been separated.
  Blockly.Extensions.register('maze_turn_arrows',
      function(this: Blockly.Block) {
        const dropdown = this.getField('DIR');
        if (!dropdown || typeof (dropdown as any).getOptions !== 'function') return;
        const options = (dropdown as any).getOptions();
        options[0][0] += LEFT_TURN;
        options[1][0] += RIGHT_TURN;
      });

  Blockly.defineBlocksWithJsonArray([
    // Block for moving forward.
    {
      "type": "maze_moveForward",
      "message0": "move forward",
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_HUE,
      "tooltip": "Moves the player forward one space.",
    },
    // Block for turning left or right.
    {
      "type": "maze_turn",
      "message0": "%1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "DIR",
          "options": TURN_DIRECTIONS,
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_HUE,
      "tooltip": "Turns the player left or right.",
      "extensions": ["maze_turn_arrows"],
    },
    // Block for conditional "if there is a path".
    {
      "type": "maze_if",
      "message0": "if %1 %2 do %3",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "DIR",
          "options": PATH_DIRECTIONS,
        },
        { "type": "input_dummy" },
        {
          "type": "input_statement",
          "name": "DO",
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOGIC_HUE,
      "tooltip": "If there is a path in the specified direction, then do some actions.",
    },
    // Block for conditional "if there is a path, else".
    {
      "type": "maze_ifElse",
      "message0": "if %1 %2 do %3 else %4",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "DIR",
          "options": PATH_DIRECTIONS,
        },
        { "type": "input_dummy" },
        {
          "type": "input_statement",
          "name": "DO",
        },
        {
          "type": "input_statement",
          "name": "ELSE",
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOGIC_HUE,
      "tooltip": "If there is a path in the specified direction, then do some actions. Otherwise, do other actions.",
    },
    // Block for repeat loop.
    {
      "type": "maze_forever",
      "message0": "repeat until %1 %2 do %3",
      "args0": [
        {
          "type": "field_image",
          "src": "/assets/maze/marker.png", // Use absolute path from public folder
          "width": 12,
          "height": 16,
        },
        { "type": "input_dummy" },
        {
          "type": "input_statement",
          "name": "DO",
        }
      ],
      "previousStatement": null,
      "colour": LOOPS_HUE,
      "tooltip": "Repeat the enclosed blocks until the goal is reached.",
    },
  ]);

  javascriptGenerator.forBlock['maze_moveForward'] = function(block: Blockly.Block) {
    return `moveForward('block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['maze_turn'] = function(block: Blockly.Block) {
    const dir = block.getFieldValue('DIR');
    return `${dir}('block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['maze_if'] = function(block: Blockly.Block) {
    const dir = block.getFieldValue('DIR');
    const argument = `${dir}('block_id_${block.id}')`;
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    return `if (${argument}) {\n${branch}}\n`;
  };

  javascriptGenerator.forBlock['maze_ifElse'] = function(block: Blockly.Block) {
    const dir = block.getFieldValue('DIR');
    const argument = `${dir}('block_id_${block.id}')`;
    const branch0 = javascriptGenerator.statementToCode(block, 'DO');
    const branch1 = javascriptGenerator.statementToCode(block, 'ELSE');
    return `if (${argument}) {\n${branch0}} else {\n${branch1}}\n`;
  };

  javascriptGenerator.forBlock['maze_forever'] = function(block: Blockly.Block) {
    let branch = javascriptGenerator.statementToCode(block, 'DO');
    if ((javascriptGenerator as any).INFINITE_LOOP_TRAP) {
      branch = (javascriptGenerator as any).INFINITE_LOOP_TRAP.replace(/%1/g,
          `'block_id_${block.id}'`) + branch;
    }
    return `while (notDone()) {\n${branch}}\n`;
  };
}