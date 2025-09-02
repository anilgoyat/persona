import { useNavigate, useLocation, useParams } from "react-router-dom";
import { usePersona } from "../../context/PersonaContext";
import { useEffect, useState } from "react";
import { Home, ArrowLeft } from "lucide-react";  // ✅ Add icons

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { getPersona } = usePersona();
  const persona = getPersona(id);

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

  // ✅ check routes
  const isChatPage = location.pathname.startsWith("/chat");
  const isToolsDetailPage =
    location.pathname.startsWith("/tools/") && location.pathname !== "/tools";

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow">
      {/* Left - Back/Home button */}
      <div className="flex items-center gap-3">
        {/* Back to Home (for chat pages) */}
        {isChatPage && (
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-300 text-sm font-medium hover:underline"
          >
            <ArrowLeft size={18} /> Back
          </button>
        )}

        {/* Back to Tools Home (for tool detail pages only) */}
        {isToolsDetailPage && (
          <button
            onClick={() => navigate("/tools")}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-300 text-sm font-medium hover:underline"
          >
            <Home size={18} /> Tools Home
          </button>
        )}

        {/* Persona info (chat) */}
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
