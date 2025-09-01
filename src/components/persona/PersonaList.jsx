import { usePersona } from "../../context/PersonaContext";
import PersonaCard from "./PersonaCard";
import PersonaForm from "./PersonaForm";

export default function PersonaList() {
  const { personas } = usePersona();

  return (
    <div className="p-6">
      <PersonaForm />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {personas.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No personas yet. Add one above 👆
          </p>
        ) : (
          personas.map((p) => <PersonaCard key={p.id} persona={p} />)
        )}
      </div>
    </div>
  );
}
