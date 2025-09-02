export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

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
                  text: `Bhai ek UI bana de for: ${prompt}

Rules:
- First give only HTML code inside \`\`\`html block
- Then give only CSS code inside \`\`\`css block
- HTML should NOT contain <style> or inline CSS
- CSS should only target classes used in HTML
- Do not mix HTML and CSS together
- After code blocks, give a short explanation in Hinglish + thodi Haryanvi tone
- End me ek alag funny dialogue ya joke add karna (har baar different ho, repeat na ho)`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract HTML + CSS separately
    const htmlMatch = raw.match(/```html([\s\S]*?)```/);
    const cssMatch = raw.match(/```css([\s\S]*?)```/);

    let html = htmlMatch ? htmlMatch[1].trim() : "";
    let css = cssMatch ? cssMatch[1].trim() : "";

    // 🚀 Sanitize: remove <style> tags or inline styles
    html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    html = html.replace(/\sstyle="[^"]*"/gi, "");

    // Explanation: remove code blocks
    const explanation = raw
      .replace(/```html[\s\S]*?```/, "")
      .replace(/```css[\s\S]*?```/, "")
      .trim();

    res.status(200).json({ html, css, explanation });
  } catch (err) {
    console.error("❌ CSS Playground API error:", err);
    res.status(500).json({ error: "Failed to generate UI" });
  }
}
