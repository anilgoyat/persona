export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, role } = req.body;
  const id = name.toLowerCase().replace(/\s+/g, "-");

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
              parts: [
                {
                  text: `Return only pure JSON with all keys always present, even if empty, for ${name} (${role || "public figure"}):
{
  "role": "short role/identity of the person",
  "skills": ["3-5 key skills or domains"],
  "short_description": "1-2 line intro",
  "social_links": {
    "twitter": "url or empty string",
    "linkedin": "url or empty string",
    "youtube": "url or empty string"
  },
  "background": "short background",
  "current_work": "current activities",
  "impact": "impact on society/industry",
  "vision": "future goals"
}
Rules:
- Do not add any text outside JSON.
- If info not available, put empty string ("").`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log("🔵 Gemini Raw:", JSON.stringify(data, null, 2));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let details = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      details = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (err) {
      console.error("❌ JSON parse failed:", err, "Text:", text);
      details = {};
    }

    const persona = {
      id,
      name,
      role: details.role || role || "Generated Persona",
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`, // fallback avatar
      skills: details.skills?.length ? details.skills : ["General"],
      short_description:
        details.short_description || "No description available",
      social_links: {
        twitter: details.social_links?.twitter || "",
        linkedin: details.social_links?.linkedin || "",
        youtube: details.social_links?.youtube || "",
      },
      background: details.background || "Background not available",
      current_work: details.current_work || "Work info not available",
      impact: details.impact || "Impact not available",
      vision: details.vision || "Vision not available",
    };

    console.log("🟢 Parsed Persona:", persona);

    res.status(200).json({ persona });
  } catch (err) {
    console.error("❌ Persona AI error:", err);
    res.status(500).json({ error: "Failed to generate persona" });
  }
}
