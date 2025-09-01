import { createContext, useContext, useState, useEffect } from "react";

const PersonaContext = createContext();

export const PersonaProvider = ({ children }) => {
  // Personas list (dynamic)
  const [personas, setPersonas] = useState(() => {
    const stored = localStorage.getItem("personas");
    return stored ? JSON.parse(stored) : [];
  });

  // Chats per persona
  const [chats, setChats] = useState(() => {
    const stored = localStorage.getItem("chats");
    return stored ? JSON.parse(stored) : {};
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("personas", JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  // Add a new persona dynamically
  const addPersona = (name) => {
    const id = name.toLowerCase().replace(/\s+/g, "-");
    if (personas.some((p) => p.id === id)) return;

    const newPersona = {
      id,
      name,
      role: "Generated Persona",
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      skills: ["AI", "Tech"],
    };

    setPersonas((prev) => [...prev, newPersona]);
  };

  // Add a message to persona's chat
  const addMessage = (personaId, message) => {
    setChats((prev) => ({
      ...prev,
      [personaId]: [...(prev[personaId] || []), message],
    }));
  };

const askPersona = async (personaId, userMessage) => {
  const persona = personas.find((p) => p.id === personaId);
  if (!persona) return;

  addMessage(personaId, { from: "user", text: userMessage });

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, persona }),
    });

    const data = await res.json();
    console.log("🔵 API Response:", data);
    addMessage(personaId, { from: "persona", text: data.reply });
  } catch (err) {
    addMessage(personaId, { from: "persona", text: "⚠️ Error fetching reply" });
  }
};


  return (
    <PersonaContext.Provider
      value={{ personas, addPersona, chats, addMessage, askPersona }}
    >
      {children}
    </PersonaContext.Provider>
  );
};

export const usePersona = () => useContext(PersonaContext);
