import { useState } from "react";
import { usePersona } from "../../context/PersonaContext";
import { useNavigate } from "react-router-dom";

export default function PersonaForm() {
  const { addPersona } = usePersona();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", role: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.name.trim()) return;

  setLoading(true);
  try {
    const res = await fetch("/api/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    console.log("🔵 Persona API Response:", data);

    if (!data.persona) {
      alert("Persona generation failed (no persona returned).");
      return;
    }

    // ✅ safe
    addPersona(data.persona);

    const id = data.persona.id;
    navigate(`/chat/${id}`);
  } catch (err) {
    console.error("❌ Persona generation failed:", err);
    alert("Failed to generate persona details. Try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow mb-6"
    >
      <h2 className="text-lg font-semibold mb-3">➕ Add New Persona</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Name (e.g. Elon Musk)"
          value={form.name}
          onChange={handleChange}
          className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
        />
        <input
          type="text"
          name="role"
          placeholder="Role (optional, e.g. Entrepreneur)"
          value={form.role}
          onChange={handleChange}
          className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        {loading ? "Generating..." : "Add & Chat →"}
      </button>
    </form>
  );
}
