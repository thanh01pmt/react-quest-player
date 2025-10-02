// src/games/maze/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import i18n from '../../i18n'; // Import the initialized i18next instance

/**
 * Construct custom maze block types. Called from the GameBlockManager.
 */
export function init() {
  const MOVEMENT_HUE = 290;
  const LOOPS_HUE = 120;
  const LOGIC_HUE = 210;
  const LEFT_TURN = ' ↺';
  const RIGHT_TURN = ' ↻';

  // Use i18next to get translated strings
  const TURN_DIRECTIONS: [string, string][] = [
    [i18n.t('Maze.turnLeft'), 'turnLeft'],
    [i18n.t('Maze.turnRight'), 'turnRight'],
  ];

  const PATH_DIRECTIONS: [string, string][] = [
    [i18n.t('Maze.pathAhead'), 'isPathForward'],
    [i18n.t('Maze.pathLeft'), 'isPathLeft'],
    [i18n.t('Maze.pathRight'), 'isPathRight'],
  ];

  Blockly.Extensions.register('maze_turn_arrows', function(this: Blockly.Block) {
      const dropdown = this.getField('DIR');
      if (!dropdown || typeof (dropdown as any).getOptions !== 'function') return;
      const options = (dropdown as any).getOptions(false); // Get raw options
      // This logic assumes a fixed order, which is safe for our definition
      if (options[0]) options[0][0] = `${i18n.t('Maze.turnLeft')}${LEFT_TURN}`;
      if (options[1]) options[1][0] = `${i18n.t('Maze.turnRight')}${RIGHT_TURN}`;
  });

  Blockly.defineBlocksWithJsonArray([
    {
      "type": "maze_moveForward",
      "message0": i18n.t('Maze.moveForward'),
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_HUE,
      "tooltip": i18n.t('Maze.moveForwardTooltip'),
    },
    {
      "type": "maze_turn",
      "message0": "%1",
      "args0": [{
        "type": "field_dropdown",
        "name": "DIR",
        "options": TURN_DIRECTIONS,
      }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_HUE,
      "tooltip": i18n.t('Maze.turnTooltip'),
      "extensions": ["maze_turn_arrows"],
    },
    {
      "type": "maze_if",
      "message0": `${i18n.t('CONTROLS_IF_MSG_IF')} %1 %2 ${i18n.t('Maze.doCode')} %3`,
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": PATH_DIRECTIONS },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOGIC_HUE,
      "tooltip": i18n.t('Maze.ifTooltip'),
    },
    {
      "type": "maze_ifElse",
      "message0": `${i18n.t('CONTROLS_IF_MSG_IF')} %1 %2 ${i18n.t('Maze.doCode')} %3 ${i18n.t('CONTROLS_IF_MSG_ELSE')} %4`,
      "args0": [
        { "type": "field_dropdown", "name": "DIR", "options": PATH_DIRECTIONS },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" },
        { "type": "input_statement", "name": "ELSE" },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOGIC_HUE,
      "tooltip": i18n.t('Maze.ifelseTooltip'),
    },
    {
      "type": "maze_forever",
      "message0": `${i18n.t('Maze.repeatUntil')} %1 %2 ${i18n.t('Maze.doCode')} %3`,
      "args0": [
        { "type": "field_image", "src": "/assets/maze/marker.png", "width": 12, "height": 16, "alt": "*" },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" }
      ],
      "previousStatement": null,
      "colour": LOOPS_HUE,
      "tooltip": i18n.t('Maze.whileTooltip'),
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