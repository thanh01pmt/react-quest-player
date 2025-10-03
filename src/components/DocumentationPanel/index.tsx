// src/components/DocumentationPanel/index.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import './DocumentationPanel.css';

interface DocumentationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationPanel: React.FC<DocumentationPanelProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();

  if (!isOpen) {
    return null;
  }

  // Determine the language code (e.g., 'en', 'vi')
  const langCode = i18n.language.split('-')[0];
  const docUrl = langCode === 'vi' ? '/assets/pond/docs-vi.html' : '/assets/pond/docs.html';

  return (
    <div className="docs-overlay">
      <div className="docs-panel">
        <div className="docs-header">
          <h3>{t('Pond.documentation')}</h3>
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