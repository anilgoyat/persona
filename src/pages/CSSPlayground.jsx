import { useState, useEffect } from "react";

export default function CSSPlayground() {
  const [prompt, setPrompt] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // Inject CSS into DOM
  useEffect(() => {
    if (!css) return;

    const oldStyle = document.getElementById("ai-preview-style");
    if (oldStyle) oldStyle.remove();

    const styleTag = document.createElement("style");
    styleTag.id = "ai-preview-style";
    styleTag.innerHTML = css;
    document.head.appendChild(styleTag);
  }, [css]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setHtml("");
    setCss("");
    setExplanation("");

    try {
      const res = await fetch("/api/css", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setHtml(data.html || "");
      setCss(data.css || "");
      setExplanation(data.explanation || "");
    } catch (err) {
      console.error("❌ CSS Playground error:", err);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(
      () => {
        setToast(`${label} copied to clipboard ✅`);
        setTimeout(() => setToast(""), 2000);
      },
      (err) => console.error("❌ Copy failed:", err)
    );
  }

  return (
    <div className="relative max-w-6xl mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in-out z-50">
          {toast}
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        🎨 CSS Playground (Dynamic Preview)
      </h2>

      {/* Input */}
      <div className="flex gap-4 mb-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "1 button with green color, 1 textbox with gray background"'
          className="w-full p-3 border rounded-lg font-mono text-sm dark:bg-gray-700 dark:text-white"
          rows={3}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2 h-fit rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate UI"}
        </button>
      </div>

      {/* Output */}
      {(html || css) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Left - Code Output */}
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-auto max-h-[300px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Generated HTML:</h3>
              <button
                onClick={() => copyToClipboard(html, "HTML")}
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
            <pre className="text-sm whitespace-pre-wrap">{html}</pre>

            <div className="flex justify-between items-center mt-4 mb-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Generated CSS:</h3>
              <button
                onClick={() => copyToClipboard(css, "CSS")}
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
            <pre className="text-sm whitespace-pre-wrap">{css}</pre>
          </div>

          {/* Right - Live Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Live Preview:</h3>
            <div
              className="border rounded-lg p-6 min-h-[200px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Explanation */}
            {explanation && (
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-800 rounded max-h-[200px] overflow-auto">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  ⚡ AI Engineer Explains:
                </h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
