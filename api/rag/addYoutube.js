// api/rag/addYoutube.js
import fetch from "node-fetch";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuid } from "uuid";

const ytId = (u) => {
  if (!u) return null;
  if (/^[\w-]{11}$/.test(u)) return u;
  const m =
    u.match(/[?&]v=([^&]+)/) ||
    u.match(/youtu\.be\/([^?]+)/) ||
    u.match(/shorts\/([^?]+)/);
  return m ? m[1] : null;
};

function toSeconds(ts) {
  const [h, m, s] = ts.trim().split(":");
  const sec = parseFloat(s);
  return (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (isNaN(sec) ? 0 : sec);
}

function parseVtt(raw) {
  return (raw || "")
    .split("\n\n")
    .filter((b) => b.includes("-->"))
    .map((block) => {
      const lines = block.trim().split("\n");
      const [timeline, ...textLines] = lines;
      const [start] = timeline.split("-->");
      return { start: toSeconds(start), text: textLines.join(" ").trim() };
    })
    .filter((x) => x.text);
}

// try simple English first
async function trySimple(videoId) {
  const tries = [
    `https://www.youtube.com/api/timedtext?fmt=vtt&v=${videoId}&lang=en`,
    `https://www.youtube.com/api/timedtext?fmt=vtt&v=${videoId}&lang=en&kind=asr`,
    `https://video.google.com/timedtext?fmt=vtt&v=${videoId}&lang=en`,
    `https://video.google.com/timedtext?fmt=vtt&v=${videoId}&lang=en&kind=asr`,
  ];
  for (const u of tries) {
    const r = await fetch(u);
    if (!r.ok) continue;
    const t = await r.text();
    if (t.startsWith("WEBVTT")) return t;
  }
  return null;
}

// parse available tracks from `type=list` XML
function parseTracks(xml) {
  // examples: <track id="0" name="English" lang_code="en" kind="asr" .../>
  const trackRegex = /<track\b[^>]*?>/g;
  const attr = (tag, name) => {
    const m = tag.match(new RegExp(`${name}="([^"]+)"`));
    return m ? m[1] : null;
  };
  const tracks = [];
  const tags = xml.match(trackRegex) || [];
  for (const tag of tags) {
    tracks.push({
      lang: attr(tag, "lang_code"),
      name: attr(tag, "name"), // may be null
      kind: attr(tag, "kind"), // e.g., asr
    });
  }
  return tracks;
}

async function fetchByTrack(videoId, { lang, name, kind }, { translateTo }) {
  const params = new URLSearchParams({ fmt: "vtt", v: videoId, lang });
  if (kind) params.set("kind", kind);
  if (name) params.set("name", name); // some tracks need name
  // translate if requested (and source not English)
  if (translateTo && lang !== translateTo) params.set("tlang", translateTo);

  const u = `https://www.youtube.com/api/timedtext?${params.toString()}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  const t = await r.text();
  return t && t.startsWith("WEBVTT") ? t : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { url, lang = "en", translate = true } = req.body || {};
    const id = ytId(url);
    if (!id) return res.status(400).json({ error: "Invalid YouTube URL/ID" });

    // 1) quick English tries
    let vtt = await trySimple(id);

    // 2) if not, list tracks and try each (with optional translation)
    if (!vtt) {
      const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${id}`;
      const xml = await fetch(listUrl).then((r) => r.text()).catch(() => "");
      const tracks = parseTracks(xml);

      for (const tr of tracks) {
        // try original
        vtt = await fetchByTrack(id, tr, { translateTo: null });
        if (vtt) break;

        // try translated to requested lang (default en)
        if (translate) {
          vtt = await fetchByTrack(id, tr, { translateTo: lang });
          if (vtt) break;
        }
      }
    }

    if (!vtt) {
      return res.status(404).json({
        error:
          "Captions not available for this video (none/disabled). If you own this video, enable captions; otherwise upload VTT file.",
      });
    }

    // 3) parse segments with timestamps
    const segments = parseVtt(vtt);
    if (!segments.length) {
      return res.status(400).json({ error: "Parsed captions empty." });
    }

    // 4) embed + upsert
    const qd = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });

    let inserted = 0;
    for (const seg of segments) {
      const embRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "models/embedding-001", content: { parts: [{ text: seg.text }] } }),
        }
      );
      const emb = await embRes.json();
      const vector = emb?.embedding?.values;
      if (!vector) continue;

      await qd.upsert("rag_sources", {
        points: [
          {
            id: uuid(),
            vector,
            payload: { type: "youtube", name: id, text: seg.text, start: seg.start },
          },
        ],
      });
      inserted++;
    }

    return res.status(200).json({ message: "YouTube transcript stored", videoId: id, chunks: inserted });
  } catch (e) {
    console.error("addYoutube error:", e);
    return res.status(500).json({ error: "Failed to add YouTube transcript" });
  }
}
