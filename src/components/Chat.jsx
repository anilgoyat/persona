import PersonaHeader from "../components/persona/PersonaHeader";
import ChatBox from "../components/chat/ChatBox";
import ChatInput from "../components/chat/ChatInput";

export default function Chat() {
  return (
    <div className="min-h-screen flex flex-col">
      <PersonaHeader />
      <main className="flex-1 p-6">
        <ChatBox />
      </main>
      <ChatInput />
    </div>
  );
}
