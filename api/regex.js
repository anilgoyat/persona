export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { regex } = req.body;

  if (!regex) {
    return res.status(400).json({ error: "Regex is required" });
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
                  text: `Bhai ek regex samjha: ${regex}

Tu ek AI Engineer hai aur mujhe is regex ka breakdown 
point by point simple words me samjha.

Style:
- Normal developer jaisa bol, formal nahi.
- Hinglish + thodi Haryanvi tone me.
- Har step me bata kya part ka matlab hai.
- Ek do chhote examples bhi de, taki clear ho jaye.
- End me ek alag funny dialogue ya joke add karna (har baar different ho, repeat na ho).`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation available";

    res.status(200).json({ explanation });
  } catch (err) {
    console.error("❌ Regex API error:", err);
    res.status(500).json({ error: "Failed to generate regex explanation" });
  }
}


// with open ai
// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res
//       .status(405)
//       .json({ error: "Method not allowed" });
//   }

//   const { prompt } = req.body;

//   if (!prompt) {
//     return res
//       .status(400)
//       .json({ error: "Prompt is required" });
//   }

//   try {
//     // ✅ OpenAI REST endpoint
//     const response = await fetch(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // ✅ auth header
//         },
//         body: JSON.stringify({
//           model: "gpt-4o-mini", // 🔑 any OpenAI model
//           messages: [
//             {
//               role: "system",
//               content:
//                 "You are a helpful assistant that answers clearly.",
//             },
//             {
//               role: "user",
//               content: prompt,
//             },
//           ],
//         }),
//       }
//     );

//     const data = await response.json();
//     console.log("🔵 OpenAI Raw:", JSON.stringify(data, null, 2));

//     const answer =
//       data.choices?.[0]?.message?.content ||
//       "No answer available";

//     res.status(200).json({ answer });
//   } catch (err) {
//     console.error("❌ OpenAI API error:", err);
//     res
//       .status(500)
//       .json({ error: "Failed to fetch from OpenAI" });
//   }
// }
