// src/components/EditorToolbar/index.tsx

import React from 'react';
import './EditorToolbar.css';

type EditorType = 'blockly' | 'monaco';

interface EditorToolbarProps {
  supportedEditors: EditorType[];
  currentEditor: EditorType;
  onEditorChange: (editor: EditorType) => void;
}

const getEditorName = (editor: EditorType) => {
  switch (editor) {
    case 'blockly':
      return 'Blocks';
    case 'monaco':
      return 'JavaScript';
    default:
      return editor;
  }
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  supportedEditors,
  currentEditor,
  onEditorChange,
}) => {
  return (
    <div className="editorToolbar">
      {supportedEditors.length > 1 ? (
        // Render buttons if there are multiple choices
        supportedEditors.map((editor) => (
          <button
            key={editor}
            className={currentEditor === editor ? 'active' : ''}
            onClick={() => onEditorChange(editor)}
          >
            {getEditorName(editor)}
          </button>
        ))
      ) : (
        // Render a static label if there's only one choice
        <span className="editorLabel">{getEditorName(currentEditor)}</span>
      )}
    </div>
  );
};