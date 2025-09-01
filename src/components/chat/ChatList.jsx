import ChatMessage from "./ChatMessage";
import { memo } from "react";

function ChatList({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
      {messages.map((m, idx) => (
        <ChatMessage key={idx} from={m.from} text={m.text} />
      ))}
    </div>
  );
}

// memo for performance → sirf tab re-render hoga jab messages array change hogi
export default memo(ChatList);
