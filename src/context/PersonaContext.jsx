import { createContext, useContext, useState, useEffect } from "react";

const PersonaContext = createContext();

export const PersonaProvider = ({ children }) => {
  const [personas, setPersonas] = useState(() => {
    const stored = sessionStorage.getItem("personas");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    sessionStorage.setItem("personas", JSON.stringify(personas));
  }, [personas]);


  useEffect(() => {
  const stored = sessionStorage.getItem("personas");
  if (stored) {
    setPersonas(JSON.parse(stored));
  }
  }, []);

const addPersona = (persona) => {
  const id = persona.id || persona.name.toLowerCase().replace(/\s+/g, "-");
  if (personas.some((p) => p.id === id)) return;

  const newPersona = {
    id,
    name: persona.name,
    role: persona.role || "Generated Persona",
    avatar: persona.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${persona.name}`,
    skills: persona.skills || ["AI", "Dynamic"],
    background: persona.background || "Background not available",
    current_work: persona.current_work || "Current work not available",
    impact: persona.impact || "Impact not available",
    vision: persona.vision || "Vision not available",
  };

  setPersonas((prev) => [...prev, newPersona]);
};




  const getPersona = (id) => personas.find((p) => p.id === id);

  return (
    <PersonaContext.Provider value={{ personas, addPersona, getPersona }}>
      {children}
    </PersonaContext.Provider>
  );
};

// ✅ ye line zaroor honi chahiye
export const usePersona = () => useContext(PersonaContext);
