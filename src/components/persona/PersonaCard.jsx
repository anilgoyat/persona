import { useNavigate } from "react-router-dom";

export default function PersonaCard({ persona }) {
  const navigate = useNavigate();

  return (
    <div
      className="p-4 bg-white dark:bg-gray-800 shadow rounded-xl cursor-pointer hover:shadow-lg transition"
      onClick={() => navigate(`/persona/${persona.id}`)}
    >
      <div className="flex items-center gap-3">
        <img
          src={persona.avatar}
          alt={persona.name}
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            {persona.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {persona.role}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {persona.skills.map((s, i) => (
          <span
            key={i}
            className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
