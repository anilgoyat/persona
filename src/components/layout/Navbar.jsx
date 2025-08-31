import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="flex justify-between items-center p-4 shadow bg-white dark:bg-gray-900">
      <h1 className="text-xl font-bold text-purple-600">AI Persona Chat</h1>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </nav>
  );
}
