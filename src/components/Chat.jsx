import ChatBox from "../components/chat/ChatBox";
import PersonaHeader from "../components/persona/PersonaHeader";

export default function Chat() {
  return (
    <div className="flex flex-col h-screen">
      <PersonaHeader />
      <ChatBox />
    </div>
  );
}
