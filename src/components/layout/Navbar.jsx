import { useNavigate, useLocation, useParams } from "react-router-dom";
import { usePersona } from "../../context/PersonaContext";
import { useEffect, useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { getPersona } = usePersona();
  const persona = getPersona(id);

  // ✅ Theme state
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow">
      {/* Left - Back button (only show on /chat route) */}
      <div className="flex items-center gap-3">
        {location.pathname.startsWith("/chat") && (
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 dark:text-gray-300 text-xl"
          >
            ←
          </button>
        )}
        {persona && (
          <div className="flex items-center gap-2">
            <img
              src={persona.avatar}
              alt={persona.name}
              className="w-8 h-8 rounded-full"
            />
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {persona.name}
            </span>
          </div>
        )}
      </div>

      {/* Right - Theme toggle */}
      <button
        onClick={() => setDark(!dark)}
        className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm"
      >
        {dark ? "🌙 Dark" : "🌞 Light"}
      </button>
    </div>
  );
}
