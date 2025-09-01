export default function ChatMessage({ message }) {
  const isUser = message.from === "user";

  return (
    <div className={`flex mb-3 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-md ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-200 dark:bg-gray-700 dark:text-white rounded-bl-none"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
