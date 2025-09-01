import { useState } from "react";

export default function ChatInput({ onSend }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return; // empty msg ignore
    onSend(text);
    setText(""); // clear input
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 flex gap-2 bg-white dark:bg-gray-900 shadow">
      <input
        type="text"
        placeholder="Type your message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyPress}
        className="flex-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600"
      />
      <button
        onClick={handleSend}
        className="px-4 py-2 bg-purple-600 text-white rounded"
      >
        ➤
      </button>
    </div>
  );
}
