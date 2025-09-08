// pages/api/rag/query.js
// Full RAG retrieval: embed query -> qdrant search -> re-rank (LLM) -> synthesize (LLM)
// Uses Gemini for embeddings & generation; falls back to OpenAI for embeddings if Gemini fails.

export const config = { api: { bodyParser: true } };

async function safeJson(res, code, payload) {
  res.status(code).json(payload);
}

function secondsToHHMMSS(s = 0) {
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

// --- Gemini embed REST wrapper ---
async function embedWithGeminiFetch(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`;
  const fetch = (await import("node-fetch")).default;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "models/embedding-001", content: { parts: [{ text }] } }),
  });
  const txt = await r.text().catch(() => "");
  if (!r.ok) throw new Error(`Gemini embed error ${r.status}: ${txt}`);
  const j = JSON.parse(txt);
  const vec = j?.embedding?.values;
  if (!Array.isArray(vec)) throw new Error("Gemini embed returned no vector");
  return vec;
}

// --- OpenAI embed fallback ---
async function embedWithOpenAIFetch(text) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set for fallback");
  const fetch = (await import("node-fetch")).default;
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  const txt = await r.text().catch(() => "");
  if (!r.ok) throw new Error(`OpenAI embed error ${r.status}: ${txt}`);
  const j = JSON.parse(txt);
  const vec = j?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("OpenAI embed returned no vector");
  return vec;
}

// Primary embed with fallback to OpenAI
async function embedQuery(text) {
  try {
    return await embedWithGeminiFetch(text);
  } catch (e) {
    if (process.env.OPENAI_API_KEY) {
      console.warn("Gemini embed failed, falling back to OpenAI:", e.message);
      return await embedWithOpenAIFetch(text);
    }
    throw e;
  }
}

// --- Gemini generate wrapper (generateContent) ---
// Correct Gemini generateContent wrapper — use contents + generation_config
async function generateWithGemini(prompt, { temperature = 0.0, maxOutputTokens = 512, responseMimeType = "text/plain" } = {}) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  const fetch = (await import("node-fetch")).default;

  // Build request according to Google Generative Language REST shape
  const body = {
    // `contents` is an array of message-like objects (role + parts)
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    // generation_config controls sampling, tokens, etc.
    generation_config: {
      temperature,
      maxOutputTokens,
      // optionally force JSON or other mime type:
      // response_mime_type: responseMimeType
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await r.text().catch(() => "");
  if (!r.ok) {
    // include response body for debugging
    throw new Error(`Gemini gen error ${r.status}: ${raw}`);
  }

  // The API returns JSON; parse it
  let j;
  try {
    j = JSON.parse(raw);
  } catch (e) {
    // If JSON parse fails, just return raw text (rare)
    return raw;
  }

  // Preferred extraction: candidates[0].content.parts[].text
  // There are slightly different shapes across versions, so handle common ones:
  try {
    // shape A: j.candidates[0].content is array of { parts: [...] } or { text }
    const candidate = j.candidates?.[0] ?? j.output?.[0] ?? null;
    if (candidate) {
      // candidate.content may be array of items or a single object
      const content = candidate.content ?? candidate;
      // If content is array with parts that include text fields:
      if (Array.isArray(content)) {
        // try to find text in nested parts
        const texts = [];
        for (const c of content) {
          if (typeof c.text === "string") texts.push(c.text);
          else if (Array.isArray(c.parts)) {
            for (const p of c.parts) {
              if (typeof p.text === "string") texts.push(p.text);
            }
          } else if (typeof c === "string") texts.push(c);
        }
        if (texts.length) return texts.join("\n\n");
      }

      // candidate.content.parts => get text from the first part
      if (Array.isArray(candidate?.content?.parts) && candidate.content.parts[0]?.text) {
        return candidate.content.parts.map((p) => p.text || "").join("\n");
      }

      // fallback: candidate.candidates?.[0]?.content?.parts
      if (Array.isArray(j.candidates) && typeof j.candidates[0] === "string") {
        return j.candidates[0];
      }
    }

    // final fallback: stringify the JSON
    return JSON.stringify(j);
  } catch (e) {
    // if extraction fails, return raw JSON as string
    return JSON.stringify(j);
  }
}


// --- Helpers to extract JSON array from model output robustly ---
function extractFirstJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end >= 0 && end > start) {
    try {
      const substr = text.slice(start, end + 1);
      return JSON.parse(substr);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// --- Build prompt templates ---
function buildRerankerPrompt(userQuery, candidates) {
  // candidates: [{ id, text, name, start }]
  const header = `You are a concise relevance re-ranker. Rate how relevant each candidate snippet is to answering the user's question from 0 (not relevant) to 100 (direct answer). Use ONLY the snippet content. Do NOT invent facts.\n\nQuestion:\n"${userQuery}"\n\nReturn EXACTLY a JSON array of objects: [{"id":"<id>","score":<0-100>,"reason":"<one-line reason>"}]\n\nCandidates:\n`;
  const body = candidates
    .map(
      (c, i) =>
        `${i + 1}) id: "${c.id}"\nsource: "${c.name}"\nstart: ${c.start}\ntext: "${(c.text || "").replace(/\n/g, " ").slice(0, 600)}"`
    )
    .join("\n\n");
  return header + body;
}

function buildSynthPrompt(userQuery, topItems) {
  // topItems: [{ id, text, name, start }]
  const header = `You are an assistant that answers concisely using ONLY the provided snippets below. Do NOT add or invent information.\n\nQuestion:\n"${userQuery}"\n\nSources (most relevant first):\n`;
  const body = topItems
    .map(
      (it) =>
        `- ${it.name} | ${secondsToHHMMSS(it.start || 0)}\n"${(it.text || "").replace(/\n/g, " ").slice(0, 1000)}"`
    )
    .join("\n\n");
  const rules = `\n\nTask:\n1) Provide a short direct answer (2–4 sentences).\n2) Then provide a "Sources:" list with each used snippet in format: - <name> (hh:mm:ss) — "<short quote or paraphrase used>".\n3) If snippets conflict or are insufficient, say exactly: "I don't know — no reliable info in provided sources."\n4) Keep output factual and concise. Do NOT invent facts.\n\nAnswer:\n`;
  return header + body + rules;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return safeJson(res, 405, { error: "Method not allowed" });

  try {
    const { query, topK = 20, rerankN = 5 } = req.body || {};
    if (!query || typeof query !== "string") return safeJson(res, 400, { error: "query (string) required" });

    // 1) embed query
    let qvec;
    try {
      qvec = await embedQuery(query);
    } catch (e) {
      console.error("Embedding query error:", e);
      return safeJson(res, 500, { error: "Failed to generate query embedding", detail: e.message });
    }

    // 2) search Qdrant
    const { QdrantClient } = await import("@qdrant/js-client-rest");
    const qd = new QdrantClient({
     url: 'https://ea286b3a-eb40-4007-adaa-2d9fc6dd6857.europe-west3-0.gcp.cloud.qdrant.io',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzY0NjA1Njc3fQ.2Sbt7TzJ3VF7xgHHZRvx54OP4ZRU5Utuoy2wWPq-OEY',
       });

    let searchRes;
    try {
      // The client returns different shapes depending on version; try safe access
      searchRes = await qd.search(process.env.QDRANT_COLLECTION || "rag_sources", {
        vector: qvec,
        limit: topK,
        with_payload: true,
        with_vector: false,
      });
    } catch (e) {
      console.error("Qdrant search failed:", e);
      return safeJson(res, 500, { error: "Qdrant search failed", detail: e.message || String(e) });
    }

    // normalize results into array of candidate objects
    // qdrant client's return shape varies: try common structures
    const rawCandidates = Array.isArray(searchRes) ? searchRes : (searchRes?.result || searchRes?.hits || []);
    const candidates = rawCandidates.map((pt) => {
      // possible shapes: { id, payload, score } or { payload, id } etc.
      const id = pt.id ?? pt.point_id ?? pt._id ?? (pt.payload && pt.payload.id) ?? JSON.stringify(pt).slice(0, 12);
      const payload = pt.payload ?? pt;
      const text = (payload?.text || payload?.content || payload?.pageContent || "").toString();
      const name = payload?.name || payload?.source || payload?.title || payload?.url || "unknown";
      const start = payload?.start ?? payload?.timestamp ?? payload?.index ?? 0;
      const score = pt.score ?? pt.payload?.score ?? 0;
      return { id: String(id), text, name, start, score, raw: pt };
    });

    if (!candidates.length) {
      return safeJson(res, 200, { answer: null, sources: [], note: "No candidates found" });
    }

    // 3) re-ranker: call LLM to score candidates
    let rerankerOutput = null;
    let rankedCandidates = candidates.slice(0, topK);

    try {
      const rerankPrompt = buildRerankerPrompt(query, rankedCandidates);
      const rrText = await generateWithGemini(rerankPrompt, { temperature: 0.0, maxOutputTokens: 512 });
      // try to extract JSON array
      const arr = extractFirstJsonArray(rrText);
      if (Array.isArray(arr) && arr.length) {
        rerankerOutput = arr;
        const scoreMap = new Map(arr.map((o) => [String(o.id), Number(o.score ?? 0)]));
        rankedCandidates = rankedCandidates.map((c) => ({ ...c, rerankScore: scoreMap.get(String(c.id)) ?? 0 }));
        rankedCandidates.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));
      } else {
        // fallback: if parsing failed, keep Qdrant order but attach raw reranker text for debugging
        rerankerOutput = { raw: rrText, note: "Could not parse JSON array from reranker; using Qdrant order" };
        // leave rankedCandidates as-is (Qdrant order)
      }
    } catch (e) {
      console.warn("Re-ranker failed; falling back to Qdrant order:", e.message);
      rerankerOutput = { error: e.message || String(e) };
      // proceed with Qdrant order
    }

    // 4) pick top N for synthesis
    const topItems = rankedCandidates.slice(0, rerankN).map((c) => ({
      id: c.id,
      text: c.text,
      name: c.name,
      start: Number(c.start) || 0,
      score: c.rerankScore ?? c.score ?? 0,
    }));

    if (!topItems.length) {
      return safeJson(res, 200, { answer: null, sources: [], note: "No top items after rerank" });
    }

    // 5) synthesize final answer
    let answerText = "";
    try {
      const synthPrompt = buildSynthPrompt(query, topItems);
      answerText = await generateWithGemini(synthPrompt, { temperature: 0.0, maxOutputTokens: 700 });
    } catch (e) {
      console.error("Synthesis failed:", e);
      return safeJson(res, 500, { error: "Synthesis failed", detail: e.message || String(e) });
    }

    // 6) Build structured sources output
    const sourcesOut = topItems.map((it) => ({
      id: it.id,
      source: it.name,
      start: it.start,
      hhmmss: secondsToHHMMSS(it.start),
      text: it.text,
      score: it.score,
    }));

    return safeJson(res, 200, {
      query,
      answer: answerText,
      sources: sourcesOut,
      reranker: rerankerOutput,
      qdrantHits: candidates.length,
      usedTopN: topItems.length,
    });
  } catch (err) {
    console.error("query fatal:", err);
    return safeJson(res, 500, { error: "query fatal", detail: err.message || String(err) });
  }
}
