import ChatList from "./ChatList";
import ChatInput from "./ChatInput";

export default function ChatBox() {
  return (
    <div className="flex flex-col h-full">
      <ChatList />
      <ChatInput />
    </div>
  );
}
