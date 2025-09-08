import { useState } from "react";

/**
 * SourcesPanel
 * - Files: base64 JSON → /api/rag/uploadFileLite (.pdf .docx .txt .vtt .zip)
 * - Website: local add (optionally POST /api/rag/addWebsite)
 * - YouTube: POST /api/rag/addYoutube (captions ingest)
 * - Text: local add (optionally POST /api/rag/addText)
 */

export default function SourcesPanel() {
  const [activeTab, setActiveTab] = useState("Files");
  const [sources, setSources] = useState([]);

  // File upload UI
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadMsg, setUploadMsg] = useState(""); // success/error banner

  // YouTube UI
  const [ytLoading, setYtLoading] = useState(false);
  const [ytStatus, setYtStatus] = useState("");

  const tabs = ["Files", "Website", "YouTube", "Text"];

  // ---------- utils ----------
  async function fileToBase64(file) {
    const arrayBuf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(arrayBuf);
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  function showBanner(msg, type = "info") {
    // type: "info" | "ok" | "err"
    setUploadMsg(`${type.toUpperCase()}: ${msg}`);
    setTimeout(() => setUploadMsg(""), 4500);
  }

  // ---------- Files: base64 → /api/rag/uploadFileLite ----------
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(15);
    setUploadMsg("");

    try {
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/rag/uploadFileLite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mime: file.type || "application/octet-stream",
          base64,
        }),
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response: ${raw.slice(0, 160)}`);
      }

      if (!res.ok) {
        const msg = data.detail ? `${data.error}: ${data.detail}` : data.error || "Upload failed";
        showBanner(msg, "err");
        setUploading(false);
        setProgress(0);
        return;
      }

      setProgress(100);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 350);

      const label = data.file
        ? `${data.file} (${data.chunks} chunks)`
        : `Processed (${data.chunks} chunks)`;

      setSources((prev) => [
        {
          type: file.name.endsWith(".zip") ? "vtt" : (file.name.split(".").pop() || "file"),
          name: label,
        },
        ...prev,
      ]);

      showBanner(`✅ ${label}`, "ok");
    } catch (err) {
      console.error("Upload error:", err);
      showBanner(err.message || "Unknown error", "err");
      setUploading(false);
      setProgress(0);
    } finally {
      // allow re-upload of same file
      e.target.value = "";
    }
  };

  // ---------- Website (optional backend wiring) ----------
 // replace existing addWebsite() in SourcesPanel.jsx with:

const addWebsite = async () => {
  const el = document.getElementById("website-input");
  const url = el.value.trim();
  if (!url) return;

  // UX state
  setYtStatus(""); // reuse status area (or create new state for websiteStatus)
  setYtLoading(true); // reuse loading state or create separate websiteLoading if preferred
  try {
    // quick validation
    try { new URL(url); } catch { throw new Error("Invalid URL"); }

    // show immediate feedback
    setYtStatus("Fetching page and extracting content…");

    const res = await fetch("/api/rag/addWebsite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error(`Non-JSON response: ${raw.slice(0,140)}`); }

    if (!res.ok) {
      throw new Error(data.detail ? `${data.error}: ${data.detail}` : data.error || "Ingest failed");
    }

    // success - add to sources list
    const label = `${data.title || url} (${data.inserted}/${data.chunks} chunks)`;
    setSources((p) => [{ type: "website", name: label, url }, ...p]);

    setYtStatus(`✅ Ingested: ${label}`);
    el.value = "";
    setTimeout(()=>setYtStatus(""), 4000);
  } catch (err) {
    console.error("Website ingest error:", err);
    setYtStatus("❌ " + (err.message || "Failed to add website"));
    setTimeout(()=>setYtStatus(""), 6000);
  } finally {
    setYtLoading(false);
  }
};


  // ---------- YouTube: /api/rag/addYoutube ----------
  const addYouTube = async () => {
    const el = document.getElementById("youtube-input");
    const url = el.value.trim();
    if (!url) return;

    setYtStatus("Fetching captions and storing…");
    setYtLoading(true);
    try {
      const res = await fetch("/api/rag/addYoutube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response: ${raw.slice(0, 160)}`);
      }

      if (!res.ok) {
        setYtStatus(`❌ ${data.detail ? `${data.error}: ${data.detail}` : (data.error || "Failed to fetch captions")}`);
        return;
      }

      setYtStatus(`✅ Stored transcript. Video: ${data.videoId}, chunks: ${data.chunks}`);
      setSources((p) => [
        { type: "youtube", name: `${data.videoId} (${data.chunks} chunks)` },
        ...p,
      ]);
      el.value = "";
    } catch (err) {
      console.error("YouTube ingest error:", err);
      setYtStatus("❌ " + (err.message || "Network error"));
    } finally {
      setYtLoading(false);
      setTimeout(() => setYtStatus(""), 4000);
    }
  };

  // ---------- Text (optional backend wiring) ----------
  const addText = () => {
    const el = document.getElementById("text-input");
    const text = el.value.trim();
    if (!text) return;
    setSources((p) => [
      { type: "text", name: text.slice(0, 50) + (text.length > 50 ? "..." : "") },
      ...p,
    ]);
    el.value = "";
  };

  const removeAt = (i) => setSources((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="w-1/3 min-w-[300px] border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Sources</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === t
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Optional banner */}
      {uploadMsg && (
        <div className="mb-3 text-xs px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
          {uploadMsg}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "Files" && (
          <label className="block cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.vtt,.zip"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <p className="mb-1">Upload PDF, DOCX, TXT, VTT, or ZIP (VTT inside)</p>
              <p className="text-xs">Max size: 5MB</p>
            </div>
          </label>
        )}

        {activeTab === "Website" && (
          <div className="flex items-center gap-2">
            <input
              id="website-input"
              type="url"
              placeholder="Enter website URL (e.g., https://example.com)"
              className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              onClick={addWebsite}
              className="px-3 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600"
            >
              Add
            </button>
          </div>
        )}

        {activeTab === "YouTube" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                id="youtube-input"
                type="url"
                placeholder="Enter YouTube link"
                className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
              />
              <button
                onClick={addYouTube}
                disabled={ytLoading}
                className={`px-3 py-2 rounded text-white ${
                  ytLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {ytLoading ? "Adding..." : "Add"}
              </button>
            </div>
            {ytStatus && (
              <div className="text-xs text-gray-600 dark:text-gray-300">{ytStatus}</div>
            )}
          </div>
        )}

        {activeTab === "Text" && (
          <div>
            <textarea
              id="text-input"
              rows={8}
              placeholder="Enter your text here (up to 5000 words)…"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              onClick={addText}
              className="mt-2 w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Submit Text
            </button>
          </div>
        )}

        {uploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{progress}%</div>
          </div>
        )}
      </div>

      {/* Sources list */}
      <div className="mt-4">
        {sources.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500">
            No sources added yet
          </div>
        ) : (
          <ul className="space-y-2">
            {sources.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-800 dark:text-gray-100"
              >
                <span>
                  {s.type === "file" && "📄 "}
                  {s.type === "website" && "🌐 "}
                  {s.type === "youtube" && "▶️ "}
                  {s.type === "text" && "✍️ "}
                  {s.name}
                </span>
                <button
                  onClick={() => removeAt(i)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
