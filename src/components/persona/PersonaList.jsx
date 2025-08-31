import PersonaCard from "./PersonaCard";
import { usePersona } from "../../context/PersonaContext";
import { useState } from "react";

export default function PersonaList() {
  const { personas, addPersona } = usePersona();
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (input.trim()) {
      addPersona(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add new persona..."
          className="p-2 border rounded"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          Add
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map((p) => (
          <PersonaCard key={p.id} persona={p} />
        ))}
      </div>
    </div>
  );
}
