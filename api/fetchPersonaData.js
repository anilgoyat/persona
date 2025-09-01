// utils/fetchPersonaData.js
export async function fetchPersonaData(name) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: `${name} latest news OR recent updates OR profile photo`,
        search_depth: "advanced",
        include_images: true,
        max_results: 3,
      }),
    });

    const data = await response.json();

    // ✅ Get first image
    const image =
      data.results?.[0]?.images?.[0] ||
      data.images?.[0] ||
      null;

    // ✅ Get top 2 headlines/snippets
    const news = data.results
      ?.slice(0, 2)
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
      })) || [];

    return { image, news };
  } catch (err) {
    console.error("❌ Tavily fetch error:", err);
    return { image: null, news: [] };
  }
}
