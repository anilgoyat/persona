import { QdrantClient } from "@qdrant/js-client-rest";

export default async function handler(req, res) {
  try {
    const client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });

    // Create collection
   await client.createCollection("rag_sources", {
  vectors: { size: 1536, distance: "Cosine" },
}).catch((err) => {
  if (err.message.includes("already exists")) {
    console.log("Collection already exists, skipping create.");
  } else {
    throw err;
  }
});

    return res.status(200).json({ message: "Collection created: rag_sources" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Collection creation failed" });
  }
}
