// src/games/pond/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import i18n from '../../i18n';

export function init() {
  const POND_HUE = 290;

  // ===== POND SPECIFIC BLOCKS =====
  Blockly.defineBlocksWithJsonArray([
    {
      "type": "pond_scan",
      "message0": "scan(%1)",
      "args0": [
        { "type": "input_value", "name": "DEGREE", "check": ["Number", "Angle"] }
      ],
      "inputsInline": true,
      "output": "Number",
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.scanTooltip'),
    },
    {
      "type": "pond_cannon",
      "message0": "cannon(%1, %2);",
      "args0": [
        { "type": "input_value", "name": "DEGREE", "check": ["Number", "Angle"] },
        { "type": "input_value", "name": "RANGE", "check": "Number" }
      ],
      "inputsInline": true,
      "previousStatement": null,
      "nextStatement": null,
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.cannonTooltip'),
    },
    {
      "type": "pond_swim",
      "message0": "swim(%1);",
      "args0": [
        { "type": "input_value", "name": "DEGREE", "check": ["Number", "Angle"] }
      ],
      "inputsInline": true,
      "previousStatement": null,
      "nextStatement": null,
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.swimTooltip'),
    },
    {
      "type": "pond_stop",
      "message0": "stop();",
      "previousStatement": null,
      "nextStatement": null,
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.stopTooltip'),
    },
    {
      "type": "pond_health",
      "message0": "health()",
      "output": "Number",
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.healthTooltip'),
    },
    {
      "type": "pond_speed",
      "message0": "speed()",
      "output": "Number",
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.speedTooltip'),
    },
    {
      "type": "pond_getX",
      "message0": "getX()",
      "output": "Number",
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.locXTooltip'),
    },
    {
      "type": "pond_getY",
      "message0": "getY()",
      "output": "Number",
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.locYTooltip'),
    },
    {
      "type": "pond_log",
      "message0": "log(%1);",
      "args0": [
        { "type": "input_value", "name": "VALUE" }
      ],
      "inputsInline": true,
      "previousStatement": null,
      "nextStatement": null,
      "colour": POND_HUE,
      "tooltip": i18n.t('Pond.logTooltip'),
    }
  ]);

  // ===== JAVASCRIPT-STYLE BLOCK OVERRIDES =====

  // Logic Compare
  Blockly.Blocks['logic_compare'] = {
    init: function() {
      this.jsonInit({
        "message0": "%1 %2 %3",
        "args0": [
          { "type": "input_value", "name": "A" },
          {
            "type": "field_dropdown", "name": "OP",
            "options": [["==", "EQ"], ["!=", "NEQ"], ["<", "LT"], ["<=", "LTE"], [">", "GT"], [">=", "GTE"]]
          },
          { "type": "input_value", "name": "B" }
        ],
        "inputsInline": true,
        "output": "Boolean",
        "colour": "%{BKY_LOGIC_HUE}",
        "helpUrl": "%{BKY_LOGIC_COMPARE_HELPURL}",
        "extensions": ["logic_compare", "logic_op_tooltip"],
      });
    }
  };

  // Logic Operation
  Blockly.Blocks['logic_operation'] = {
      init: function() {
        this.jsonInit({
            "message0": "%1 %2 %3",
            "args0": [
                { "type": "input_value", "name": "A", "check": "Boolean" },
                { "type": "field_dropdown", "name": "OP", "options": [["&&", "AND"], ["||", "OR"]] },
                { "type": "input_value", "name": "B", "check": "Boolean" },
            ],
            "inputsInline": true,
            "output": "Boolean",
            "colour": "%{BKY_LOGIC_HUE}",
            "helpUrl": "%{BKY_LOGIC_OPERATION_HELPURL}",
            "extensions": ["logic_op_tooltip"],
        });
      }
  };
  
  // While Loop
  Blockly.Blocks['controls_whileUntil'] = {
    init: function() {
        this.jsonInit({
            "message0": "while ( %1 ) { %2 %3 }",
            "args0": [
                { "type": "input_value", "name": "BOOL", "check": "Boolean" },
                { "type": "input_dummy" },
                { "type": "input_statement", "name": "DO" },
            ],
            "inputsInline": true,
            "previousStatement": null,
            "nextStatement": null,
            "colour": "%{BKY_LOOPS_HUE}",
            "tooltip": "%{BKY_CONTROLS_WHILEUNTIL_TOOLTIP_WHILE}",
            "helpUrl": "%{BKY_CONTROLS_WHILEUNTIL_HELPURL}",
        });
    }
  };
  
  // Variable Setter
  Blockly.Blocks['variables_set'] = {
      init: function(this: Blockly.Block) {
          this.appendValueInput('VALUE')
              .appendField('var')
              .appendField(new Blockly.FieldVariable('item'), 'VAR')
              .appendField('=');
          this.appendDummyInput().appendField(';');
          this.setInputsInline(true);
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour("%{BKY_VARIABLES_HUE}");
          this.setTooltip("%{BKY_VARIABLES_SET_TOOLTIP}");
          this.setHelpUrl("%{BKY_VARIABLES_SET_HELPURL}");
      }
  };

  // ===== JAVASCRIPT GENERATORS =====

  javascriptGenerator.forBlock['pond_scan'] = function(block: Blockly.Block) {
    const degree = javascriptGenerator.valueToCode(block, 'DEGREE', Order.NONE) || '0';
    return [`scan(${degree})`, Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['pond_cannon'] = function(block: Blockly.Block) {
    const degree = javascriptGenerator.valueToCode(block, 'DEGREE', Order.COMMA) || '0';
    const range = javascriptGenerator.valueToCode(block, 'RANGE', Order.COMMA) || '0';
    return `cannon(${degree}, ${range});\n`;
  };

  javascriptGenerator.forBlock['pond_swim'] = function(block: Blockly.Block) {
    const degree = javascriptGenerator.valueToCode(block, 'DEGREE', Order.NONE) || '0';
    return `swim(${degree});\n`;
  };

  javascriptGenerator.forBlock['pond_stop'] = function(_block: Blockly.Block) {
    return 'stop();\n';
  };

  javascriptGenerator.forBlock['pond_health'] = function(_block: Blockly.Block) {
    return ['health()', Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['pond_speed'] = function(_block: Blockly.Block) {
    return ['speed()', Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['pond_getX'] = function(_block: Blockly.Block) {
    return ['getX()', Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['pond_getY'] = function(_block: Blockly.Block) {
    return ['getY()', Order.FUNCTION_CALL];
  };

  javascriptGenerator.forBlock['pond_log'] = function(block: Blockly.Block) {
    const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.NONE) || '\'\'';
    return `log(${value});\n`;
  };
}