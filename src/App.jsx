import { Routes, Route } from "react-router-dom";
import Home from "./components/Home.jsx";
import PersonaDetail from "./components/PersonaDetail.jsx";
import Chat from "./components/Chat.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/persona/:id" element={<PersonaDetail />} />
      <Route path="/chat/:id" element={<Chat />} />
    </Routes>
  );
}

export default App;
