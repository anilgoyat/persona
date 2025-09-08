// api/rag/addText.js
import { QdrantClient } from "@qdrant/js-client-rest";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
const qdrant = new QdrantClient({
  url: 'https://ea286b3a-eb40-4007-adaa-2d9fc6dd6857.europe-west3-0.gcp.cloud.qdrant.io',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzY0NjA1Njc3fQ.2Sbt7TzJ3VF7xgHHZRvx54OP4ZRU5Utuoy2wWPq-OEY',
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, sourceName } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const chunks = text.match(/[\s\S]{1,1000}/g) || [];

    for (const chunk of chunks) {
      // ✅ Gemini embeddings API call
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/embedding-001",
            content: { parts: [{ text: chunk }] },
          }),
        }
      );

      const data = await response.json();
      console.log("🔵 Gemini embedding raw:", JSON.stringify(data, null, 2));

      if (!data.embedding || !data.embedding.values) {
        return res.status(500).json({ error: "Failed to generate embedding", details: data });
      }

      const embedding = data.embedding.values; // array of floats

      // ✅ Store in Qdrant
      await qdrant.upsert("rag_sources", {
        points: [
          {
            id: uuidv4(),
            vector: embedding,
            payload: {
              type: "text",
              name: sourceName || "Note",
              text: chunk,
            },
          },
        ],
      });
    }

    return res.status(200).json({ message: "Text stored in Qdrant (Gemini)" });
  } catch (err) {
    console.error("❌ Error in addText (Gemini):", err);
    return res.status(500).json({ error: "Failed to add text" });
  }
}
