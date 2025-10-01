// src/components/BlocklyWorkspace/index.tsx

import { useRef, useImperativeHandle, forwardRef } from 'react';
import { BlocklyWorkspace as BlocklyComponent } from 'react-blockly';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import 'blockly/javascript';
import * as en from 'blockly/msg/en';
import type { BlocklyConfig } from '../../types';
import './BlocklyWorkspace.css'; // Import the new CSS file

Blockly.setLocale(en as unknown as { [key: string]: string; });

interface BlocklyWorkspaceProps {
  blocklyConfig: BlocklyConfig;
}

export interface BlocklyWorkspaceHandle {
  getCode: () => string;
}

export const BlocklyWorkspace = forwardRef<BlocklyWorkspaceHandle, BlocklyWorkspaceProps>(
  ({ blocklyConfig }, ref) => {
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    useImperativeHandle(ref, () => ({
      getCode: () => {
        if (workspaceRef.current) {
          return javascriptGenerator.workspaceToCode(workspaceRef.current);
        }
        console.warn("getCode called before workspace was initialized.");
        return '';
      }
    }));

    // FIXED: Re-introduce a wrapper div with absolute positioning
    // to reliably fill the parent flex container.
    return (
      <div className="blockly-wrapper">
        <BlocklyComponent
          toolboxConfiguration={blocklyConfig.toolbox}
          initialXml={blocklyConfig.startBlocks}
          className="fill-container"
          workspaceConfiguration={{}}
          onWorkspaceChange={(workspace) => {
            workspaceRef.current = workspace;
          }}
        />
      </div>
    );
  }
);