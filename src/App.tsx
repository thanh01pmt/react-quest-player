// src/App.tsx

import { QuestPlayer } from './components/QuestPlayer';
import './App.css'; // Optional: for global styles

function App() {
  // We'll hardcode the questId for now.
  // In the future, this could come from URL routing.
  const questId = "maze-1";

  return (
    <div className="App">
      <QuestPlayer questId={questId} />
    </div>
  );
}

export default App;