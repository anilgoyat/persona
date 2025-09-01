import { useParams, Link } from "react-router-dom";
import { usePersona } from "../context/PersonaContext";
import ChatBox from "./chat/ChatBox";
import SuggestedQuestions from "./persona/SuggestedQuestions";

export default function Chat() {
  const { id } = useParams();
  const { chats, personas } = usePersona();
  const messages = chats[id] || [];

  const persona = personas.find((p) => p.id === id);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 shadow">
        <Link to="/" className="text-purple-600 hover:underline">
          ← Back
        </Link>
        <h2 className="font-semibold text-lg text-gray-800 dark:text-white">
          {persona?.name || "Unknown Persona"}
        </h2>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Suggested questions (only if no messages yet) */}
        {messages.length === 0 && (
          <div className="flex justify-center items-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Start a conversation
              </h3>
              <SuggestedQuestions personaId={id} />
            </div>
          </div>
        )}

        {/* ChatBox (ChatList + Input) */}
        <div className="flex flex-col flex-1">
          <ChatBox />
        </div>
      </div>
    </div>
  );
}
