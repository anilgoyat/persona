import { useNavigate, useParams } from "react-router-dom";
import { usePersona } from "../../context/PersonaContext";

export default function PersonaHeader() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { personas } = usePersona();

  const persona = personas.find((p) => p.id === id);

  return (
    <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 shadow">
      <button onClick={() => navigate(-1)} className="text-purple-600">
        ← Back
      </button>
      <h2 className="font-semibold text-gray-800 dark:text-gray-200">
        {persona?.name || "Unknown Persona"}
      </h2>
      <span />
    </header>
  );
}
