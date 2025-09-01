import { generatePersonaPrompt } from "../src/lib/promptGenerator.js";

export default async function handler(req, res) {
  const { message, history, persona } = req.body;

  if (!message || !persona) {
    return res.status(400).json({ reply: "Invalid request" });
  }

  const prompt = generatePersonaPrompt(persona, message);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No reply";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ Ask API error:", err);
    res.status(500).json({ reply: "Server error" });
  }
}
