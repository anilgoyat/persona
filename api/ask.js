import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let body = req.body;
    if (!body || typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const { message, persona } = body;

    if (!message || !persona) {
      return res.status(400).json({ error: "Missing message or persona" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY env var" });
    }

    const client = new OpenAI({
       apiKey: process.env.GOOGLE_API_KEY,
       baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });

    const response = await client.chat.completions.create({
       model: 'gemini-1.5-flash',
      messages: [
        { role: "system", content: `You are ${persona.name}, ${persona.role}. Answer in Hinglish.` },
        { role: "user", content: message },
      ],
    });

    return res.status(200).json({
      reply: response.choices[0].message.content,
    });
  } catch (err) {
    console.error("❌ OpenAI API Error:", err);
    return res.status(500).json({
      error: "OpenAI request failed",
      detail: err.message,        // 👈 extra detail bhejna
    });
  }
}