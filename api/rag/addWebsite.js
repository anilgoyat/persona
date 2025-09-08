// pages/api/rag/addWebsite.js
// LangChain-style ingestion but using plain fetch + small helper functions.
// - Extract main article via Readability (jsdom + @mozilla/readability)
// - Split text with recursive-like splitter (chunk + overlap)
// - Embeddings: Gemini (REST) primary, OpenAI fallback
// - Upsert to Qdrant via @qdrant/js-client-rest
// - Always returns JSON (defensive, lazy imports)

export const config = { api: { bodyParser: true } };

async function safeJsonResponse(res, code, payload) {
  res.status(code).json(payload);
}

// simple UUID helper (lazy import)
async function uuid() {
  const { v4: v4 } = await import("uuid");
  return v4();
}

// --- Text splitter (LangChain-style recursive-ish) ---
function splitTextRecursive(text, chunkSize = 1000, chunkOverlap = 200) {
  // If text <= chunkSize return directly
  if (!text) return [];
  if (text.length <= chunkSize) return [text];

  // naive paragraph-based split with fallback to sliding window
  const paragraphs = text.split(/\n{2,}|\r\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length <= chunkSize) {
      current = current ? current + "\n\n" + p : p;
    } else {
      if (current) {
        chunks.push(current);
      }
      if (p.length > chunkSize) {
        // long paragraph -> split with sliding window
        for (let i = 0; i < p.length; i += chunkSize - chunkOverlap) {
          chunks.push(p.slice(i, i + chunkSize));
        }
        current = "";
      } else {
        current = p;
      }
    }
  }
  if (current) chunks.push(current);

  // add overlap by merging adjacent slices if needed (ensures overlap)
  if (chunkOverlap > 0) {
    const overlapped = [];
    for (let i = 0; i < chunks.length; i++) {
      const prev = overlapped[overlapped.length - 1];
      if (!prev) {
        overlapped.push(chunks[i]);
      } else {
        // merge last overlap portion
        const toOverlap = chunks[i].slice(0, chunkOverlap);
        overlapped[overlapped.length - 1] = prev; // keep prev
        overlapped.push(chunks[i]);
      }
    }
    return overlapped;
  }

  return chunks;
}

// --- Embedding helpers (Gemini primary, OpenAI fallback) ---
async function embedWithGemini(text) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/embedding-001",
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini embedding failed status=${res.status} body=${txt}`);
  }
  const j = await res.json();
  const values = j?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini returned no embedding values");
  return values;
}

async function embedWithOpenAI(text) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI embedding failed status=${res.status} body=${txt}`);
  }
  const j = await res.json();
  const values = j?.data?.[0]?.embedding;
  if (!Array.isArray(values)) throw new Error("OpenAI returned no embedding values");
  return values;
}

async function embedText(text, { retries = 2 } = {}) {
  let lastErr = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await embedWithGemini(text);
    } catch (e) {
      lastErr = e;
      // small backoff
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  // fallback attempt
  try {
    return await embedWithOpenAI(text);
  } catch (e2) {
    throw new Error(`Embedding failed (Gemini then OpenAI): ${lastErr?.message || ""} | ${e2.message}`);
  }
}

// --- Qdrant upsert helper ---
async function upsertToQdrant(points) {
  const { QdrantClient } = await import("@qdrant/js-client-rest");
  const client = new QdrantClient({
      url: 'https://ea286b3a-eb40-4007-adaa-2d9fc6dd6857.europe-west3-0.gcp.cloud.qdrant.io',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzY0NjA1Njc3fQ.2Sbt7TzJ3VF7xgHHZRvx54OP4ZRU5Utuoy2wWPq-OEY',
     });
  // points: array of { id, vector, payload }
  await client.upsert(process.env.QDRANT_COLLECTION || "rag_sources", { points });
}

// --- main handler ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return safeJsonResponse(res, 405, { error: "Method not allowed" });
  }

  try {
    const { url, chunkSize = 1000, chunkOverlap = 200, maxChars = 200000 } = req.body || {};
    if (!url || typeof url !== "string") {
      return safeJsonResponse(res, 400, { error: "url (string) required" });
    }

    // lazy import heavy libs for extraction
    const { JSDOM } = await import("jsdom");
    const { Readability } = await import("@mozilla/readability");

    // 1) fetch page
    let pageRes;
    try {
      pageRes = await fetch(url, { headers: { "User-Agent": "RAG-Website-Ingest/1.0" }, timeout: 20000 });
    } catch (e) {
      return safeJsonResponse(res, 400, { error: "Failed to fetch page (network)", detail: e.message });
    }
    if (!pageRes.ok) {
      const txt = await pageRes.text().catch(() => "");
      return safeJsonResponse(res, 400, { error: "Failed to fetch page", status: pageRes.status, text: txt.slice(0, 300) });
    }
    const html = await pageRes.text();

    // 2) extract main text with Readability
    let title = url;
    let articleText = "";
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      title = (article?.title || dom.window.document.title || url).toString();
      articleText = (article?.textContent || dom.window.document.body?.textContent || "").toString();
    } catch (e) {
      // fallback to body text
      try {
        const dom2 = new JSDOM(html);
        title = dom2.window.document.title || url;
        articleText = dom2.window.document.body?.textContent || "";
      } catch (e2) {
        return safeJsonResponse(res, 500, { error: "Failed to extract page content", detail: e2.message || e.message });
      }
    }

    if (!articleText || articleText.trim().length < 20) {
      return safeJsonResponse(res, 400, { error: "No substantial text found on page" });
    }

    // 3) truncate & split
    const truncated = articleText.slice(0, Math.min(maxChars, articleText.length));
    const chunks = splitTextRecursive(truncated, chunkSize, chunkOverlap);

    if (!chunks.length) {
      return safeJsonResponse(res, 500, { error: "No chunks produced from page" });
    }

    // 4) embed & upsert in safe batches (small concurrency)
    const BATCH_SIZE = 6; // how many upserts per batch (tune)
    const pointsBatch = [];
    let inserted = 0;

    // process sequentially with small concurrency per batch
    for (let i = 0; i < chunks.length; i++) {
      const textChunk = chunks[i];
      // embed
      let vector;
      try {
        vector = await embedText(textChunk);
      } catch (e) {
        return safeJsonResponse(res, 500, { error: "Embedding failed", detail: e.message, inserted });
      }

      const id = await uuid();
      const payload = { type: "website", url, name: title, index: i, text: textChunk };
      pointsBatch.push({ id, vector, payload });
      inserted++;

      // flush per BATCH_SIZE or at end
      if (pointsBatch.length >= BATCH_SIZE || i === chunks.length - 1) {
        try {
          await upsertToQdrant(pointsBatch);
          pointsBatch.length = 0; // clear
        } catch (e) {
          return safeJsonResponse(res, 500, { error: "Qdrant upsert failed", detail: e.message, inserted });
        }
      }
    }

    return safeJsonResponse(res, 200, {
      message: "Website ingested",
      title,
      url,
      chunks: chunks.length,
      inserted,
    });
  } catch (err) {
    console.error("addWebsite error:", err);
    return safeJsonResponse(res, 500, { error: "addWebsite fatal", detail: err.message || String(err) });
  }
}
