import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePersona } from "../../context/PersonaContext";

export default function ChatInput() {
  const [text, setText] = useState("");
  const { id } = useParams();
  const { askPersona } = usePersona();

  const sendMessage = () => {
    if (!text.trim()) return;
    askPersona(id, text); // ✅ Direct AI call
    setText("");
  };

  return (
    <div className="p-4 flex gap-2 bg-white dark:bg-gray-900 shadow">
      <input
        type="text"
        placeholder="Type your message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600"
      />
      <button
        onClick={sendMessage}
        className="px-4 py-2 bg-purple-600 text-white rounded"
      >
        ➤
      </button>
    </div>
  );
}
