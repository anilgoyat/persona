import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, persona } = req.body;

  const client = new OpenAI({
    apiKey: process.env.GOOGLE_API_KEY, // ✅ safe in Vercel env
  });

  try {
    const response = await client.chat.completions.create({
      model: 'gemini-1.5-flash',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      messages: [
        {
          role: "system",
          content: `You are ${persona.name}, ${persona.role}. Answer in Hinglish, motivational tone.`,
        },
        { role: "user", content: message },
      ],
    });

    res.setHeader("Access-Control-Allow-Origin", "*"); // ✅ CORS allow
    return res.status(200).json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    return res.status(500).json({ error: "OpenAI request failed" });
  }
}
