// pages/api/rag/addYoutube.js (Hardened - add global handlers + defensive try/catch)
// Paste this replacing your previous file. It retains previous logic (lemnos/jina/youtube-transcript),
// chunking, embedding (Gemini -> OpenAI), Qdrant upsert, but adds robust error handling.

import fetch from "node-fetch";
import crypto from "crypto";

/* ---------- Global safety handlers (helpful during dev) ---------- */
try {
  // handle unhandled rejections so they log clearly (dev only)
  if (typeof process !== "undefined" && process && process.on) {
    process.on("unhandledRejection", (reason, promise) => {
      console.error("UNHANDLED_REJECTION:", reason && reason.stack ? reason.stack : reason);
    });
    process.on("uncaughtException", (err) => {
      console.error("UNCAUGHT_EXCEPTION:", err && err.stack ? err.stack : err);
    });
  }
} catch (e) {
  console.warn("Could not attach global handlers:", e?.message || e);
}

/* ---------- optional package: youtube-transcript (dynamic require) ---------- */
let youtubeTranscript = null;
try {
  // dynamic require to avoid build-time bundling issues
  // eslint-disable-next-line no-eval
  youtubeTranscript = eval("require")("youtube-transcript");
  console.log("youtube-transcript dynamic require: OK");
} catch (e) {
  youtubeTranscript = null;
  console.log("youtube-transcript not available, will skip that method.");
}

/* ---------- ENV helpers ---------- */

/* ---------- util functions (same as before) ---------- */
function extractVideoId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function chunkText(text, maxLen = 800, overlap = 100) {
  if (!text) return [];
  const tokens = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < tokens.length) {
    let j = i;
    let len = 0;
    while (j < tokens.length && len + tokens[j].length + 1 <= maxLen) {
      len += tokens[j].length + 1;
      j++;
    }
    chunks.push(tokens.slice(i, j).join(" "));
    i = Math.max(j - Math.floor(overlap / 5), j);
  }
  return chunks;
}
function parseVttToSegments(vttText) {
  const lines = vttText.split(/\r?\n/);
  const segments = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const startMatch = line.split("-->")[0].trim();
      const parts = startMatch.split(":").map((p) => p.replace(",", "."));
      let seconds = 0;
      if (parts.length === 3) seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
      else if (parts.length === 2) seconds = Number(parts[0]) * 60 + Number(parts[1]);
      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].trim());
        i++;
      }
      const text = textLines.join(" ").trim();
      if (text) segments.push({ start: seconds, text });
    } else {
      i++;
    }
  }
  return segments;
}
function groupSegments(segments) {
  const joined = [];
  let bufferText = "";
  let bufferStart = null;
  for (const seg of segments) {
    if (!bufferText) {
      bufferStart = seg.start || 0;
      bufferText = seg.text;
    } else {
      if ((bufferText + " " + seg.text).length <= 900) {
        bufferText += " " + seg.text;
      } else {
        joined.push({ text: bufferText, start: bufferStart });
        bufferStart = seg.start || 0;
        bufferText = seg.text;
      }
    }
  }
  if (bufferText) joined.push({ text: bufferText, start: bufferStart });
  const finalChunks = [];
  joined.forEach((j) => {
    const parts = chunkText(j.text, 800, 120);
    for (const p of parts) finalChunks.push({ text: p, start: j.start });
  });
  return finalChunks;
}

/* ---------- embedding helper with try/catch ---------- */
async function embedTextSingle(text) {
  if (!text) throw new Error("embedTextSingle: text empty");
  // Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "models/embedding-001", content: { parts: [{ text }] } }),
      });
      const raw = await r.text();
      if (!r.ok) throw new Error(`Gemini embed failed ${r.status}: ${raw}`);
      const j = JSON.parse(raw);
      if (j?.embedding?.values) return j.embedding.values;
      throw new Error("Gemini returned no vector");
    } catch (e) {
      console.warn("Gemini embed failed:", e?.message || e);
      // fallthrough to OpenAI fallback if available
    }
  }
  // OpenAI fallback
  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
      });
      const raw = await r.text();
      if (!r.ok) throw new Error(`OpenAI embed failed ${r.status}: ${raw}`);
      const j = JSON.parse(raw);
      return j?.data?.[0]?.embedding;
    } catch (e) {
      console.error("OpenAI embed failed:", e?.message || e);
      throw e;
    }
  }
  throw new Error("No embedding API configured (GEMINI_API_KEY or OPENAI_API_KEY required)");
}

/* ---------- Qdrant helpers with defensive guards ---------- */
async function ensureQdrantCollection(vectorSize) {
  const col = "rag_sources";
  const base = 'https://ea286b3a-eb40-4007-adaa-2d9fc6dd6857.europe-west3-0.gcp.cloud.qdrant.io';
  const url = `${base}/collections/${encodeURIComponent(col)}`;
  const headers = { "api-key": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzY0NjA1Njc3fQ.2Sbt7TzJ3VF7xgHHZRvx54OP4ZRU5Utuoy2wWPq-OEY' };
  const r = await fetch(url, { method: "GET", headers });
  if (r.status === 200) {
    const body = await r.json().catch(() => null);
    const existingSize = body?.result?.config?.params?.vector_size ?? body?.result?.vector_size ?? body?.vector_size ?? null;
    console.log("Qdrant collection exists, vector_size:", existingSize);
    if (existingSize && Number(existingSize) !== Number(vectorSize)) {
      throw new Error(`Vector size mismatch: collection has ${existingSize}, embeddings are ${vectorSize}`);
    }
    return;
  }
  // create
  const createUrl = `${base}/collections/${encodeURIComponent(col)}`;
  const createBody = { vectors: { size: vectorSize, distance: "Cosine" } };
  const rc = await fetch(createUrl, { method: "PUT", headers: { "Content-Type": "application/json", "api-key": process.env.QDRANT_API_KEY }, body: JSON.stringify(createBody) });
  const txt = await rc.text().catch(() => "");
  if (!rc.ok) throw new Error(`Failed to create collection ${rc.status}: ${txt}`);
  console.log("Created collection", col, "vector_size", vectorSize);
}
async function upsertPoints(collection, points) {
  const base = 'https://ea286b3a-eb40-4007-adaa-2d9fc6dd6857.europe-west3-0.gcp.cloud.qdrant.io';
  const url = `${base}/collections/${encodeURIComponent(collection)}/points?wait=true`;
  const headers = { "Content-Type": "application/json", "api-key": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzY0NjA1Njc3fQ.2Sbt7TzJ3VF7xgHHZRvx54OP4ZRU5Utuoy2wWPq-OEY' };
  const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify({ points }) });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Qdrant upsert error ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

/* ---------- caption fetchers (wrapped) ---------- */
async function fetchCaptionsViaLemnos(videoId) {
  try {
    const apiUrl = `https://yt.lemnoslife.com/videos?part=captionTracks&id=${videoId}`;
    const r = await fetch(apiUrl);
    if (!r.ok) throw new Error(`LemnosLife discovery failed ${r.status}`);
    const j = await r.json();
    const tracks = j?.items?.[0]?.captionTracks;
    if (!tracks || !tracks.length) throw new Error("No captionTracks found in lemnoslife response");
    const base = tracks[0].baseUrl;
    try {
      const r2 = await fetch(base + "&fmt=json3");
      if (r2.ok) {
        const j2 = await r2.json();
        return { type: "json3", events: j2.events || [] };
      }
    } catch (e) { /* ignore */ }
    try {
      const r3 = await fetch(base + "&fmt=vtt");
      if (r3.ok) {
        const vtt = await r3.text();
        return { type: "vtt", vtt };
      }
    } catch (e) { /* ignore */ }
    throw new Error("Unable to fetch captions (json3/vtt) from baseUrl");
  } catch (e) {
    throw e;
  }
}
async function fetchViaJina(videoId) {
  try {
    const url = `https://r.jina.ai/http://youtube.com/watch?v=${videoId}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Jina fetch failed ${r.status}`);
    const txt = await r.text();
    const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return { type: "plain", lines };
  } catch (e) {
    throw e;
  }
}

/* ---------- MAIN handler (defensive) ---------- */
export default async function handler(req, res) {
  // upfront env validation

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "Missing url in body" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL or missing video id" });

    // segments collection
    let segments = [];

    // 1) try youtube-transcript package
    if (youtubeTranscript) {
      try {
        let fn = youtubeTranscript.getTranscript || youtubeTranscript.getTranscriptFromUrl || youtubeTranscript.fetchTranscript || youtubeTranscript.transcript;
        if (typeof fn !== "function" && typeof youtubeTranscript === "function") fn = youtubeTranscript;
        if (typeof fn === "function") {
          const result = await fn(videoId);
          if (Array.isArray(result) && result.length) {
            segments = result.map((r) => ({ text: (r.text || r.snippet || r).toString(), start: Number(r.offset ?? r.start ?? r.startMs ?? 0) || 0 })).filter(Boolean);
            console.log("youtube-transcript segments:", segments.length);
          }
        }
      } catch (e) {
        console.warn("youtube-transcript failed:", e?.message || e);
        segments = [];
      }
    }

    // 2) LemnosLife
    if (!segments.length) {
      try {
        const fetched = await fetchCaptionsViaLemnos(videoId);
        if (fetched.type === "json3") {
          segments = (fetched.events || []).map((ev) => ({ text: (ev?.segs || []).map((s) => s.utf8 || s.text || "").join(" ").trim(), start: (ev.tStartMs || 0) / 1000 })).filter(Boolean);
          console.log("LemnosLife json3 segments:", segments.length);
        } else if (fetched.type === "vtt") {
          segments = parseVttToSegments(fetched.vtt || "");
          console.log("LemnosLife vtt segments:", segments.length);
        }
      } catch (e) {
        console.warn("LemnosLife fetch failed:", e?.message || e);
      }
    }

    // 3) Jina.ai fallback
    if (!segments.length) {
      try {
        const j = await fetchViaJina(videoId);
        if (j.type === "plain" && j.lines.length) {
          segments = j.lines.map((ln) => ({ text: ln, start: 0 }));
          console.log("Jina.ai plain segments:", segments.length);
        }
      } catch (e) {
        console.warn("Jina.ai failed:", e?.message || e);
      }
    }

    if (!segments.length) {
      return res.status(404).json({ error: "Captions not found via available methods", detail: "No captions found; use audio STT fallback." });
    }

    // grouping & chunking
    const chunks = groupSegments(segments);
    if (!chunks.length) return res.status(500).json({ error: "No chunks produced from segments" });

    // embedding loop (sequential)
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const vec = await embedTextSingle(chunks[i].text);
        embeddings.push(vec);
        if (i % 20 === 0) console.log(`embedding progress ${i}/${chunks.length}`);
      } catch (e) {
        console.error(`Embedding failed for chunk ${i}:`, e?.message || e);
        embeddings.push(null);
      }
    }

    const firstValid = embeddings.find((v) => Array.isArray(v) && v.length);
    if (!firstValid) return res.status(500).json({ error: "No valid embeddings produced" });

    const vectorSize = firstValid.length;
    try {
      await ensureQdrantCollection(vectorSize);
    } catch (e) {
      console.error("ensureQdrantCollection error:", e?.message || e);
      return res.status(500).json({ error: "Qdrant collection error", detail: e?.message || String(e) });
    }

    // upsert batches
    const collection = process.env.QDRANT_COLLECTION || "rag_sources";
    const batchSize = 50;
    let upserted = 0;
    for (let start = 0; start < chunks.length; start += batchSize) {
      const slice = chunks.slice(start, start + batchSize);
      const pts = [];
      for (let k = 0; k < slice.length; k++) {
        const idx = start + k;
        const emb = embeddings[idx];
        if (!Array.isArray(emb) || emb.length !== vectorSize) {
          console.warn(`Skipping idx=${idx} invalid embedding (len=${emb?.length ?? "nil"})`);
          continue;
        }
        pts.push({ id: crypto.randomUUID(), vector: emb, payload: { type: "youtube", name: `YouTube:${videoId}`, videoId, text: (slice[k].text||"").slice(0,2000), start: slice[k].start || 0 } });
      }
      if (!pts.length) continue;
      try {
        await upsertPoints(collection, pts);
        upserted += pts.length;
      } catch (e) {
        console.error("Qdrant upsert failed:", e?.message || e);
        return res.status(500).json({ error: "Qdrant upsert failed", detail: e?.message || String(e) });
      }
    }

    return res.status(200).json({ message: "YouTube transcript ingested", videoId, chunks: chunks.length, upserted });
  } catch (err) {
    // Catch anything unexpected and return structured JSON
    console.error("addYoutube fatal (caught):", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Failed to ingest YouTube captions", detail: err?.message || String(err) });
  }
}
