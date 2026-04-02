import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CharacterList from './pages/CharacterList';
import CreationFlow from './pages/CreationFlow';
import CharacterSheet from './pages/CharacterSheet';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CharacterList />} />
        <Route path="/create" element={<CreationFlow />} />
        <Route path="/character/:id" element={<CharacterSheet />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
