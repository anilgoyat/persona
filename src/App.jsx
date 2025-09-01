import { useState } from "react";
import ChatList from "./components/chat/ChatList";
import ChatInput from "./components/chat/ChatInput";

function App() {
  const [messages, setMessages] = useState([
    { from: "persona", text: "Hello! I am your AI assistant 👋" },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (text) => {
    setMessages((prev) => [...prev, { from: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { from: "persona", text: data.reply }]);
    } catch (err) {
      console.error("❌ API Error:", err);
      setMessages((prev) => [
        ...prev,
        { from: "persona", text: "⚠️ Sorry, something went wrong" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <ChatList messages={messages} />
      {loading && (
        <div className="p-2 text-center text-sm text-gray-500">
          AI is thinking...
        </div>
      )}
      <ChatInput onSend={handleSend} />
    </div>
  );
}

export default App;
