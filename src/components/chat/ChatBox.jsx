import { useParams } from "react-router-dom";
import { usePersona } from "../../context/PersonaContext";
import ChatMessage from "./ChatMessage";

export default function ChatBox() {
  const { id } = useParams();
  const { chats } = usePersona();
  const messages = chats[id] || [];

  return (
    <div className="flex flex-col gap-3">
      {messages.map((m, i) => (
        <ChatMessage key={i} msg={m} />
      ))}
    </div>
  );
}
