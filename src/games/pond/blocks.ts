// src/games/pond/blocks.ts

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import i18n from '../../i18n';
import { FieldAngle } from '@blockly/field-angle';

interface PondMathNumberBlock extends Blockly.Block {
  updateField_(isAngle: boolean): void;
}

export function init() {
  const POND_HUE = 290;

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
    },
    {
      "type": "pond_math_single",
      "message0": "Math.%1(%2)",
      "args0": [
        {
          "type": "field_dropdown", "name": "OP",
          "options": [
            ["sqrt", "ROOT"], ["abs", "ABS"],
            ["sin_deg", "SIN"], ["cos_deg", "COS"], ["tan_deg", "TAN"],
            ["asin_deg", "ASIN"], ["acos_deg", "ACOS"], ["atan_deg", "ATAN"]
          ]
        },
        { "type": "input_value", "name": "NUM", "check": "Number" }
      ],
      "output": "Number",
      "colour": "%{BKY_MATH_HUE}",
      "extensions": ["math_op_tooltip"]
    }
  ]);

  Blockly.Blocks['pond_math_number'] = {
    init: function(this: Blockly.Block) {
      this.jsonInit({
        "message0": "%1",
        "args0": [{
          "type": "field_number",
          "name": "NUM",
          "value": 0,
        }],
        "output": "Number",
        "helpUrl": "%{BKY_MATH_NUMBER_HELPURL}",
        "colour": "%{BKY_MATH_HUE}",
        "tooltip": "%{BKY_MATH_NUMBER_TOOLTIP}",
        "extensions": ["parent_tooltip_when_inline"]
      });
    },
    mutationToDom: function(this: Blockly.Block) {
      const container = document.createElement('mutation');
      const field = this.getField('NUM');
      const isAngle = field instanceof FieldAngle;
      container.setAttribute('angle_field', String(isAngle));
      return container;
    },
    domToMutation: function(this: PondMathNumberBlock, xmlElement: Element) {
      const isAngle = (xmlElement.getAttribute('angle_field') === 'true');
      this.updateField_(isAngle);
    },
    onchange: function(this: PondMathNumberBlock) {
      if (!this.workspace || !this.outputConnection || !this.outputConnection.targetConnection) {
        return;
      }
      const field = this.getField('NUM');
      const wantsAngle = this.outputConnection.targetConnection.getCheck()?.includes('Angle');
      const isAngle = field instanceof FieldAngle;
      if (wantsAngle && !isAngle) {
        this.updateField_(true);
      } else if (!wantsAngle && isAngle) {
        this.updateField_(false);
      }
    },
    updateField_: function(this: Blockly.Block, isAngle: boolean) {
      Blockly.Events.disable();
      const input = this.inputList[0];
      const field = this.getField('NUM');
      const value = field!.getValue();
      input.removeField('NUM');
      let newField;
      if (isAngle) {
        newField = new FieldAngle(value);
      } else {
        newField = new Blockly.FieldNumber(value);
      }
      input.appendField(newField, 'NUM');
      // The render call is removed as it's incorrect and likely unnecessary.
      // Blockly's event system should handle re-rendering.
      Blockly.Events.enable();
    }
  };

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
  
  javascriptGenerator.forBlock['pond_math_number'] = (javascriptGenerator as any).forBlock['math_number'];

  javascriptGenerator.forBlock['pond_math_single'] = function(block: Blockly.Block) {
    const arg = javascriptGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
    const op = block.getFieldValue('OP');
    const func = {
      'ROOT': 'sqrt', 'ABS': 'abs', 'SIN': 'sin_deg', 'COS': 'cos_deg',
      'TAN': 'tan_deg', 'ASIN': 'asin_deg', 'ACOS': 'acos_deg', 'ATAN': 'atan_deg',
    };
    return [`Math.${func[op as keyof typeof func]}(${arg})`, Order.FUNCTION_CALL];
  };
  
  (Blockly.Blocks as any)['pond_loc_x'] = Blockly.Blocks['pond_getX'];
  (javascriptGenerator.forBlock as any)['pond_loc_x'] = javascriptGenerator.forBlock['pond_getX'];
  (Blockly.Blocks as any)['pond_loc_y'] = Blockly.Blocks['pond_getY'];
  (javascriptGenerator.forBlock as any)['pond_loc_y'] = javascriptGenerator.forBlock['pond_getY'];
}