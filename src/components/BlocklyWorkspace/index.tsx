// src/components/BlocklyWorkspace/index.tsx

import React, { useRef } from 'react';
import { BlocklyWorkspace as BlocklyComponent } from 'react-blockly';
import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript'; // IMPORT javascriptGenerator
import 'blockly/javascript';
import * as en from 'blockly/msg/en';
import type { BlocklyConfig } from '../../types';

Blockly.setLocale(en as unknown as { [key: string]: string; });

interface BlocklyWorkspaceProps {
  blocklyConfig: BlocklyConfig;
  onRun: (code: string) => void;
}

export const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({ blocklyConfig, onRun }) => {
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const handleRunClick = () => {
    if (workspaceRef.current) {
      // USE javascriptGenerator instead of Blockly.JavaScript
      const code = javascriptGenerator.workspaceToCode(workspaceRef.current);
      onRun(code);
    } else {
      console.error("Workspace is not initialized yet.");
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '5px', borderBottom: '1px solid #ddd' }}>
        <button onClick={handleRunClick} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          Run Program
        </button>
      </div>
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
            <BlocklyComponent
              toolboxConfiguration={blocklyConfig.toolbox}
              initialXml={blocklyConfig.startBlocks}
              className="fill-height"
              workspaceConfiguration={{}}
              onWorkspaceChange={(workspace) => {
                workspaceRef.current = workspace;
              }}
            />
        </div>
      </div>
    </div>
  );
};