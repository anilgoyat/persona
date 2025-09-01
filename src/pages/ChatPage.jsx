import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePersona } from "../context/PersonaContext";
import ChatList from "../components/chat/ChatList";
import ChatInput from "../components/chat/ChatInput";
import Navbar from "../components/layout/Navbar";
import LoadingDots from "../components/chat/LoadingDots";

export default function ChatPage() {
  const { id } = useParams();
  const { getPersona } = usePersona();
  const persona = getPersona(id);

  const [messages, setMessages] = useState(() => {
    const stored = sessionStorage.getItem(`chat-${id}`);
    return stored
      ? JSON.parse(stored)
      : [{ from: "persona", text: `Hello! You are now chatting with ${persona?.name}` }];
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(`chat-${id}`, JSON.stringify(messages));
  }, [id, messages]);

  const handleSend = async (text) => {
    setMessages((prev) => [...prev, { from: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          persona,
        }),
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
      <Navbar />
      <ChatList messages={messages} />
      {loading && <LoadingDots />}
      <ChatInput onSend={handleSend} />
    </div>
  );
}
