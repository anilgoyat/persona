import PersonaHeader from "../components/persona/PersonaHeader";
import SuggestedQuestions from "../components/persona/SuggestedQuestions";
import ChatInput from "../components/chat/ChatInput";

export default function PersonaDetail() {
  return (
    <div className="min-h-screen flex flex-col">
      <PersonaHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <SuggestedQuestions />
      </main>
      <ChatInput />
    </div>
  );
}
