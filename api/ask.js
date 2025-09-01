export default async function handler(req, res) {
  console.log("🔵 Gemini API Key:", process.env.GEMINI_API_KEY);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history = [] } = req.body;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...history.map((m) => ({
              role: m.from === "user" ? "user" : "model",
              parts: [{ text: m.text }],
            })),
            { role: "user", parts: [{ text: message }] },
          ],
        }),
      }
    );

    const data = await response.json();

    // Send full raw data back for debugging
    res.status(200).json({
      raw: data,
      reply:
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("\n") || "No reply",
    });
  } catch (err) {
    res.status(500).json({
      error: "Gemini request failed",
      detail: err.message,
    });
  }
}
