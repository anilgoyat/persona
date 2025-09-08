// api/rag/query.js
import { QdrantClient } from "@qdrant/js-client-rest";
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // 🔹 1. Gemini se query embedding banao
    const embedRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/embedding-001",
          content: { parts: [{ text: query }] },
        }),
      }
    );

    const embedData = await embedRes.json();
    if (!embedData.embedding?.values) {
      return res.status(500).json({
        error: "Failed to generate query embedding",
        details: embedData,
      });
    }
    const queryVector = embedData.embedding.values;

    // 🔹 2. Qdrant me search
    const client = new QdrantClient({
   url: 'https://ea286b3a-eb40-4007-adaa-2d9fc6dd6857.europe-west3-0.gcp.cloud.qdrant.io',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzY0NjA1Njc3fQ.2Sbt7TzJ3VF7xgHHZRvx54OP4ZRU5Utuoy2wWPq-OEY',
    });

    const searchResults = await client.search("rag_sources", {
      vector: queryVector,
      limit: 3,
      with_payload: true,
    });

    if (!searchResults.length) {
      return res.status(200).json({ answer: "No relevant results found." });
    }

    // 🔹 3. Top chunks combine karo
    const context = searchResults
      .map((r, i) => `(${i + 1}) ${r.payload?.text || ""}`)
      .join("\n\n");

    // 🔹 4. Gemini se final answer banao (summarization + refinement)
    const llmRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a helpful assistant.
Answer the user strictly using the provided context. 
If the answer is not in the context, say "I could not find this in your uploaded sources. 
Question: "${query}" 
Use the following context to answer clearly:\n\n${context}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const llmData = await llmRes.json();
    const answer =
      llmData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No answer generated.";

    // 🔹 5. Return final refined answer
    res.status(200).json({
      query,
      answer,
      contextUsed: context,
      rawMatches: searchResults,
    });
  } catch (err) {
    console.error("❌ Qdrant query error:", err);
    res.status(500).json({ error: "Failed to search and summarize" });
  }
}
