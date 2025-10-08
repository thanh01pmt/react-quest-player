// src/games/maze/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import i18n from '../../i18n';

export function init() {
  Blockly.Msg['CONTROLS_REPEAT_TITLE'] = i18n.t('Controls.repeatTitle', 'repeat %1 times');
  Blockly.Msg['CONTROLS_REPEAT_INPUT_DO'] = i18n.t('Controls.repeatInputDo', 'do');
  Blockly.Msg['DUPLICATE_BLOCK'] = i18n.t('DUPLICATE_BLOCK', 'Duplicate Block');
  Blockly.Msg['REMOVE_COMMENT'] = i18n.t('REMOVE_COMMENT', 'Remove Comment');
  Blockly.Msg['ADD_COMMENT'] = i18n.t('ADD_COMMENT', 'Add Comment');
  Blockly.Msg['EXTERNAL_INPUTS'] = i18n.t('EXTERNAL_INPUTS', 'External Inputs');
  Blockly.Msg['INLINE_INPUTS'] = i18n.t('INLINE_INPUTS', 'Inline Inputs');
  Blockly.Msg['DELETE_BLOCK'] = i18n.t('DELETE_BLOCK', 'Delete Block');
  Blockly.Msg['DELETE_X_BLOCKS'] = i18n.t('DELETE_X_BLOCKS', 'Delete %1 Blocks');
  Blockly.Msg['HELP'] = i18n.t('Games.help', 'Help');

  const MOVEMENT_COLOUR = '#CF63CF';
  const LOOPS_COLOUR = '#5BA55B';
  const LOGIC_COLOUR = '#5B80A5';
  const ACTION_COLOUR = '#A5745B'; // New color for actions like collect/build

  const LEFT_TURN = ' ↺';
  const RIGHT_TURN = ' ↻';

  const TURN_DIRECTIONS: [string, string][] = [
    [i18n.t('Maze.turnLeft'), 'turnLeft'],
    [i18n.t('Maze.turnRight'), 'turnRight'],
  ];

  const PATH_DIRECTIONS: [string, string][] = [
    [i18n.t('Maze.pathAhead'), 'isPathForward'],
    [i18n.t('Maze.pathLeft'), 'isPathLeft'],
    [i18n.t('Maze.pathRight'), 'isPathRight'],
  ];

  const ITEM_TYPES: [string, string][] = [
    ['any item', 'any'],
    ['crystal', 'crystal'],
    ['key', 'key'],
  ];

  Blockly.Extensions.register('maze_turn_arrows', function(this: Blockly.Block) {
      const dropdown = this.getField('DIR');
      if (!dropdown || typeof (dropdown as any).getOptions !== 'function') return;
      const options = (dropdown as any).getOptions(false);
      if (options[0]) options[0][0] = `${i18n.t('Maze.turnLeft')}${LEFT_TURN}`;
      if (options[1]) options[1][0] = `${i18n.t('Maze.turnRight')}${RIGHT_TURN}`;
  });

  const helpClickHandler = () => {
    const helpButton = document.querySelector('.help-button');
    if (helpButton instanceof HTMLElement) {
      helpButton.click();
    }
  };

  Blockly.defineBlocksWithJsonArray([
    // --- Existing Blocks ---
    {
      "type": "maze_moveForward",
      "message0": i18n.t('Maze.moveForward'),
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_COLOUR,
      "tooltip": i18n.t('Maze.moveForwardTooltip'),
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_jump",
      "message0": "jump",
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_COLOUR,
      "tooltip": "Jumps forward and up one block.",
      "helpUrl": helpClickHandler,
    },
    {
      "type": "maze_turn",
      "message0": "%1",
      "args0": [{ "type": "field_dropdown", "name": "DIR", "options": TURN_DIRECTIONS, }],
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_COLOUR,
      "tooltip": i18n.t('Maze.turnTooltip'),
      "extensions": ["maze_turn_arrows"],
      "helpUrl": helpClickHandler,
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
      "colour": LOGIC_COLOUR,
      "tooltip": i18n.t('Maze.ifTooltip'),
      "helpUrl": helpClickHandler,
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
      "colour": LOGIC_COLOUR,
      "tooltip": i18n.t('Maze.ifelseTooltip'),
      "helpUrl": helpClickHandler,
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
      "colour": LOOPS_COLOUR,
      "tooltip": i18n.t('Maze.whileTooltip'),
      "helpUrl": helpClickHandler,
    },
    // --- New Blocks ---
    {
      "type": "maze_collect",
      "message0": "collect item",
      "previousStatement": null,
      "nextStatement": null,
      "colour": ACTION_COLOUR,
      "tooltip": "Collects the item at the current location.",
    },
    {
      "type": "maze_if_item",
      "message0": "if %1 at current location %2 %3",
      "args0": [
        { "type": "field_dropdown", "name": "TYPE", "options": ITEM_TYPES },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOGIC_COLOUR,
      "tooltip": "Executes the blocks inside if an item of the specified type is at the current location.",
    },
    {
      "type": "maze_item_count",
      "message0": "count of %1",
      "args0": [
        { "type": "field_dropdown", "name": "TYPE", "options": ITEM_TYPES }
      ],
      "output": "Number",
      "colour": ACTION_COLOUR,
      "tooltip": "Returns the number of collected items of the specified type.",
    },
    {
        "type": "maze_place_block",
        "message0": "place block forward",
        "previousStatement": null,
        "nextStatement": null,
        "colour": ACTION_COLOUR,
        "tooltip": "Places a new block in front of the player.",
    },
    {
        "type": "maze_remove_block",
        "message0": "remove block forward",
        "previousStatement": null,
        "nextStatement": null,
        "colour": ACTION_COLOUR,
        "tooltip": "Removes the block in front of the player.",
    },
    {
        "type": "maze_if_block",
        "message0": "if block is forward %1 %2",
        "args0": [
            { "type": "input_dummy" },
            { "type": "input_statement", "name": "DO" }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": LOGIC_COLOUR,
        "tooltip": "Checks if there is a block directly in front of the player.",
    }
  ]);

  // --- Existing Generators ---
  javascriptGenerator.forBlock['maze_moveForward'] = function(block: Blockly.Block) {
    return `moveForward('block_id_${block.id}');\n`;
  };
  javascriptGenerator.forBlock['maze_jump'] = function(block: Blockly.Block) {
    return `jump('block_id_${block.id}');\n`;
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
    return `while (notDone('block_id_${block.id}')) {\n${branch}}\n`;
  };
  
  // --- New Generators ---
  javascriptGenerator.forBlock['maze_collect'] = function(block: Blockly.Block) {
    return `collectItem('block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['maze_if_item'] = function(block: Blockly.Block) {
    const type = block.getFieldValue('TYPE');
    const argument = `isItemPresent('${type}', 'block_id_${block.id}')`;
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    return `if (${argument}) {\n${branch}}\n`;
  };

  javascriptGenerator.forBlock['maze_item_count'] = function(block: Blockly.Block) {
    const type = block.getFieldValue('TYPE');
    const code = `getItemCount('${type}', 'block_id_${block.id}')`;
    return [code, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['maze_place_block'] = function(block: Blockly.Block) {
    return `placeBlock('block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['maze_remove_block'] = function(block: Blockly.Block) {
    return `removeBlock('block_id_${block.id}');\n`;
  };

  javascriptGenerator.forBlock['maze_if_block'] = function(block: Blockly.Block) {
    const argument = `isBlockForward('block_id_${block.id}')`; // Assuming this API will exist
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    return `if (${argument}) {\n${branch}}\n`;
  };
}