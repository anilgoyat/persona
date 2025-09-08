import { useState } from "react";

export default function RegexExplainer() {
  const [regex, setRegex] = useState("");    // user input
  const [result, setResult] = useState("");  // AI response
  const [error, setError] = useState("");    // error messages
  const [loading, setLoading] = useState(false);

  async function handleExplain() {
    if (!regex.trim()) return;

    setLoading(true);
    setResult("");
    setError("");

    try {
      const res = await fetch("/api/regex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regex }),
      });

      if (!res.ok) {
        // ✅ API error (400, 500 etc.)
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();

      if (data.explanation) {
        setResult(data.explanation);
      } else {
        setError("⚠️ Unexpected API response format.");
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError(err.message || "❌ Error fetching explanation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        🔍 Regex Explainer
      </h2>

      <textarea
        value={regex}
        onChange={(e) => setRegex(e.target.value)}
        placeholder="Enter a regex, e.g. ^[a-zA-Z0-9]+$"
        className="w-full p-3 border rounded-lg mb-4 font-mono text-sm dark:bg-gray-700 dark:text-white"
        rows={3}
      />

      <button
        onClick={handleExplain}
        disabled={loading}
        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "Explaining..." : "Explain Regex"}
      </button>

      {/* ✅ Success Output */}
      {result && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Explanation:</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{result}</p>
        </div>
      )}

      {/* ❌ Error Output */}
      {error && (
        <div className="mt-6 p-4 bg-red-100 dark:bg-red-700 rounded-lg">
          <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200">Error:</h3>
          <p className="text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}
