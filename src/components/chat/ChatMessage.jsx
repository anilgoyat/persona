export default function ChatMessage({ msg }) {
  const isUser = msg.from === "user";
  return (
    <div
      className={`max-w-lg p-3 rounded-lg ${
        isUser
          ? "bg-purple-600 text-white self-end"
          : "bg-gray-200 dark:bg-gray-700 dark:text-white self-start"
      }`}
    >
      {msg.text}
    </div>
  );
}
