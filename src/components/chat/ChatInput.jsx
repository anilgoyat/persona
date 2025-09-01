import { useState } from "react";

export default function ChatInput({ onSend }) {
  const [text, setText] = useState("");

  const sendMessage = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="p-3 flex gap-2 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
      <input
        type="text"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        className="flex-1 px-4 py-2 rounded-full border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none"
      />
      <button
        onClick={sendMessage}
        className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
      >
        ➤
      </button>
    </div>
  );
}
