// src/App.tsx

import { useTranslation } from 'react-i18next';
import { QuestPlayer } from './components/QuestPlayer';
import './App.css';

function App() {
  const { i18n } = useTranslation();
  
  // By using the current language as a key, we tell React to create a
  // brand new QuestPlayer component whenever the language changes.
  // This effectively "reloads" the game and its Blockly workspace
  // with the new language, without reloading the entire web page.
  return (
    <QuestPlayer key={i18n.language} />
  );
}

export default App;