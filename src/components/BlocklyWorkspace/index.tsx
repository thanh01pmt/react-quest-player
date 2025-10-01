// src/components/BlocklyWorkspace/index.tsx

import React, { useRef } from 'react';
import { BlocklyWorkspace as BlocklyComponent } from 'react-blockly';
import Blockly from 'blockly';
import 'blockly/javascript'; // Required for code generation
import en from 'blockly/msg/en';
import type { BlocklyConfig } from '../../types';

// Set locale for Blockly
Blockly.setLocale(en);

interface BlocklyWorkspaceProps {
  blocklyConfig: BlocklyConfig;
  onRun: (code: string) => void;
}

export const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({ blocklyConfig, onRun }) => {
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const handleRunClick = () => {
    if (workspaceRef.current) {
      const code = (Blockly as any).JavaScript.workspaceToCode(workspaceRef.current);
      onRun(code);
    } else {
      console.error("Workspace is not initialized yet.");
    }
  };

  // This is a workaround for react-blockly as it needs a div with explicit size.
  // We'll use CSS later to make this more robust.
  const blocklyComponentStyle = {
    height: 'calc(100% - 50px)', // Subtract button area height
    width: '100%',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '5px', borderBottom: '1px solid #ddd' }}>
        <button onClick={handleRunClick} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          Run Program
        </button>
      </div>
      <div style={blocklyComponentStyle}>
        <BlocklyComponent
          toolboxConfiguration={blocklyConfig.toolbox}
          initialXml={blocklyConfig.startBlocks}
          className="fill-height"
          workspaceConfiguration={{}} // Add required empty workspace configuration
          onWorkspaceChange={(workspace) => {
            workspaceRef.current = workspace;
          }}
        />
      </div>
    </div>
  );
};