import PersonaList from "./components/persona/PersonaList";
import Navbar from "./components/layout/Navbar";

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <PersonaList />
    </div>
  );
}

export default App;
