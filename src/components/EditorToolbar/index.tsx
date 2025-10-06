// src/components/EditorToolbar/index.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import './EditorToolbar.css';

type EditorType = 'blockly' | 'monaco';

interface EditorToolbarProps {
  supportedEditors: EditorType[];
  currentEditor: EditorType;
  onEditorChange: (editor: EditorType) => void;
  onHelpClick: () => void;
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
  onHelpClick,
}) => {
  const { t } = useTranslation();
  return (
    <div className="editorToolbar">
      <button className="primaryButton help-button" onClick={onHelpClick}>
        {t('Games.help')}
      </button>
      <div className="editor-switch-group">
        {supportedEditors.length > 1 ? (
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
          <span className="editorLabel">{getEditorName(currentEditor)}</span>
        )}
      </div>
    </div>
  );
};