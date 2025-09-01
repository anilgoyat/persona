/* 
 ChatMessage Component
 - Single chat bubble render karta hai
 - from = "user" | "persona"
 - text = message string
*/
import { memo } from "react";

function ChatMessage({ from, text }) {
  const isUser = from === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-1`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-2xl shadow transition-colors duration-300 ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-200 dark:bg-gray-700 dark:text-white rounded-bl-none"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

// memo → unnecessary re-renders avoid karne ke liye
export default memo(ChatMessage);
