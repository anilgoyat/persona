// api/rag/uploadFileLite.js
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuid } from "uuid";
import AdmZip from "adm-zip";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } }, // allow 5MB + overhead
};

// ---------------- Helpers ----------------
const ALLOWED = new Set([".pdf", ".docx", ".txt", ".vtt", ".zip"]);
const extOf = (n = "") =>
  n.lastIndexOf(".") >= 0 ? n.slice(n.lastIndexOf(".")).toLowerCase() : "";
const chunk = (s, size = 1000) =>
  (s || "").match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) || [];

const toSec = (ts = "00:00:00.000") => {
  const [h, m, s] = ts.trim().split(":");
  const sec = parseFloat(s);
  return (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (isNaN(sec) ? 0 : sec);
};
const parseVtt = (raw = "") =>
  raw
    .replace(/\uFEFF/g, "")
    .split("\n\n")
    .filter((b) => b.includes("-->"))
    .map((b) => {
      const lines = b.trim().split("\n");
      const [timeline, ...text] = lines;
      const [start] = (timeline || "").split("-->");
      return { start: toSec(start || "0:00:00.000"), text: text.join(" ").trim() };
    })
    .filter((x) => x.text);

// group short cues into ~900 char chunks
function groupSegmentsToChunks(segments, targetSize = 900) {
  const chunks = [];
  let cur = [];
  let curLen = 0;
  for (const seg of segments) {
    if (curLen + seg.text.length > targetSize && cur.length) {
      chunks.push({ text: cur.map((x) => x.text).join(" "), start: cur[0].start });
      cur = [];
      curLen = 0;
    }
    cur.push(seg);
    curLen += seg.text.length + 1;
  }
  if (cur.length) {
    chunks.push({ text: cur.map((x) => x.text).join(" "), start: cur[0].start });
  }
  return chunks;
}

// ---------------- Embeddings ----------------
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedWithGemini(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/embedding-001",
      content: { parts: [{ text }] },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j?.embedding?.values || [];
}

async function embedWithOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI key missing");
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small", // 1536 dims
      input: text,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j?.data?.[0]?.embedding || [];
}

async function embedText(text, { retries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await embedWithGemini(text);
    } catch (e) {
      lastErr = e;
      await sleep(400 * (i + 1));
    }
  }
  // fallback
  return await embedWithOpenAI(text).catch((e2) => {
    throw new Error(`Embedding failed (Gemini+OpenAI): ${lastErr?.message} | ${e2.message}`);
  });
}

async function upsertPoint(qd, collection, vector, payload) {
  return qd.upsert(collection, { points: [{ id: uuid(), vector, payload }] });
}

// ---------------- Handler ----------------
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.GEMINI_API_KEY)
    return res.status(500).json({ error: "GEMINI_API_KEY missing" });
  // if (!process.env.QDRANT_URL)
  //   return res.status(500).json({ error: "QDRANT_URL missing" });
  // if (!process.env.QDRANT_API_KEY)
  //   return res.status(500).json({ error: "QDRANT_API_KEY missing" });

  const COLLECTION = "rag_sources";

  try {
    const { name, base64 } = req.body || {};
    if (!name || !base64)
      return res.status(400).json({ error: "name/base64 required" });

    const ext = extOf(name);
    if (!ALLOWED.has(ext))
      return res.status(400).json({ error: `Unsupported type: ${ext}` });

    const buf = Buffer.from(base64, "base64");
    const qd = new QdrantClient({
      url: 'https://ea286b3a-eb40-4007-adaa-2d9fc6dd6857.europe-west3-0.gcp.cloud.qdrant.io',
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzY0NjA1Njc3fQ.2Sbt7TzJ3VF7xgHHZRvx54OP4ZRU5Utuoy2wWPq-OEY',
    });
    let totalInserted = 0;

    if (ext === ".zip") {
      const zip = new AdmZip(buf);
      const entries = zip.getEntries().filter((e) =>
        e.entryName.toLowerCase().endsWith(".vtt")
      );
      for (const entry of entries) {
        const segs = parseVtt(entry.getData().toString("utf8"));
        const grouped = groupSegmentsToChunks(segs);
        for (const g of grouped) {
          const v = await embedText(g.text);
          await upsertPoint(qd, COLLECTION, v, {
            type: "vtt",
            name: entry.entryName,
            text: g.text,
            start: g.start,
          });
          totalInserted++;
        }
      }
      return res
        .status(200)
        .json({ message: "ZIP processed", files: entries.length, chunks: totalInserted });
    }

    if (ext === ".txt") {
      for (const c of chunk(buf.toString("utf8"))) {
        const v = await embedText(c);
        await upsertPoint(qd, COLLECTION, v, { type: "text", name, text: c });
        totalInserted++;
      }
    } else if (ext === ".vtt") {
      for (const seg of parseVtt(buf.toString("utf8"))) {
        const v = await embedText(seg.text);
        await upsertPoint(qd, COLLECTION, v, {
          type: "vtt",
          name,
          text: seg.text,
          start: seg.start,
        });
        totalInserted++;
      }
    } else if (ext === ".pdf") {
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const pdf = await pdfParse(buf);
      for (const c of chunk((pdf.text || "").trim())) {
        const v = await embedText(c);
        await upsertPoint(qd, COLLECTION, v, { type: "pdf", name, text: c });
        totalInserted++;
      }
    } else if (ext === ".docx") {
      const { default: mammoth } = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: buf });
      for (const c of chunk((value || "").trim())) {
        const v = await embedText(c);
        await upsertPoint(qd, COLLECTION, v, { type: "docx", name, text: c });
        totalInserted++;
      }
    }

    return res.status(200).json({ message: "File processed", file: name, chunks: totalInserted });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "uploadFileLite fatal", detail: e.message || String(e) });
  }
}
