// src/components/DocumentationPanel/index.tsx

import React from 'react';
import './DocumentationPanel.css';

interface DocumentationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationPanel: React.FC<DocumentationPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  const docUrl = '/assets/pond/docs.html';

  return (
    <div className="docs-overlay">
      <div className="docs-panel">
        <div className="docs-header">
          <h3>Pond API Documentation</h3>
          <button onClick={onClose} className="docs-close-button">&times;</button>
        </div>
        <div className="docs-body">
          <iframe
            src={docUrl}
            title="Pond Documentation"
            className="docs-iframe"
          />
        </div>
      </div>
    </div>
  );
};