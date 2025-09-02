import ToolCard from "../components/tools/ToolCard";

export default function ToolPage() {
  const tools = [
    {
      title: "🔍 Regex Explainer",
      desc: "Understand or generate regex patterns easily.",
      path: "/tools/regex",
      color: "from-pink-500 to-purple-500",
    },
   {
  title: "🎨 CSS Playground",
  desc: "Generate CSS snippets with Hinglish + Desi style explanation.",
  path: "/tools/css",
  color: "from-green-500 to-blue-500",
}
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.title} {...tool} />
      ))}
    </div>
  );
}
