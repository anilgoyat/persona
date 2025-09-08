export default function handler(req, res) {
  res.status(200).json({
    OPENAI_KEY: process.env.OPENAI_API_KEY || "❌ Missing",
    QDRANT_URL: process.env.QDRANT_URL || "❌ Missing",
    QDRANT_KEY: process.env.QDRANT_API_KEY ? "✅ Loaded" : "❌ Missing",
  });
}