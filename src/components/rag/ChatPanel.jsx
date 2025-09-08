import { useState } from "react";

function formatTime(sec = 0) {
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  const m = Math.floor((sec / 60) % 60).toString().padStart(2, "0");
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export default function ChatPanel() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', text: string }
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);   // last answer's sources array

  const handleSend = async () => {
    if (!query.trim()) return;

    // push user message
    const userMsg = { role: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);

    const currentQuery = query;
    setQuery("");
    setLoading(true);
    setSources([]); // clear previous sources

    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: currentQuery }),
      });

      const data = await res.json();

      const botText = data.answer || "Not found in your uploaded sources.";
      setMessages((prev) => [...prev, { role: "assistant", text: botText }]);
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      console.error("❌ Query API error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Error: Failed to get answer." },
      ]);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  const openYoutubeAt = (videoId, start) => {
    const t = Math.floor(start || 0);
    const url = `https://www.youtube.com/watch?v=${videoId}&t=${t}s`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Title */}
      <div className="mb-4 text-gray-600 dark:text-gray-400 text-sm">
        <span className="font-medium">Ask questions</span> about your uploaded sources
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length > 0 ? (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg shadow-sm max-w-[80%] ${
                msg.role === "user"
                  ? "bg-blue-600 text-white self-end ml-auto"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 self-start mr-auto"
              }`}
            >
              {msg.text}
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
            Start a conversation
          </div>
        )}

        {loading && (
          <div className="p-3 text-gray-400 dark:text-gray-500">Thinking...</div>
        )}

        {/* Sources for last answer */}
        {!loading && sources.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Sources used
            </div>
            <ul className="space-y-2">
              {sources.map((s, i) => (
                <li
                  key={s.id || i}
                  className="p-2 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800">
                        {s.type === "youtube" ? "YouTube" :
                         s.type === "website" ? "Website" :
                         s.type === "vtt" ? "VTT" :
                         s.type === "file" ? "File" :
                         s.type === "text" ? "Text" : (s.type || "Source")}
                      </span>
                      <span className="font-medium truncate max-w-[200px]">
                        {s.name || "Unnamed"}
                      </span>
                    </div>

                    {/* Timestamp button for YouTube */}
                    {s.type === "youtube" && typeof s.start === "number" && (
                      <button
                        onClick={() => openYoutubeAt(s.name, s.start)}
                        className="text-blue-600 hover:underline text-xs shrink-0"
                        title="Open at timestamp"
                      >
                        ▶ {formatTime(s.start)}
                      </button>
                    )}
                  </div>

                  {/* short preview */}
                  {s.text && (
                    <div className="mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
                      {s.text}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="mt-4 flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about your sources..."
          className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 dark:bg-gray-900"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
