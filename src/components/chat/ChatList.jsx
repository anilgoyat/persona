import ChatMessage from "./ChatMessage";

export default function ChatList({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
      {messages.map((m, idx) => (
        <ChatMessage key={idx} message={m} />
      ))}
    </div>
  );
}
