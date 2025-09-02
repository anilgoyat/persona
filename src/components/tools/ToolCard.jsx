import { Link } from "react-router-dom";

export default function ToolCard({ title, desc, path, color }) {
  return (
    <Link
      to={path}
      className={`block p-6 rounded-2xl shadow-lg bg-gradient-to-r ${color} text-white hover:scale-105 transform transition`}
    >
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-3 text-sm opacity-90">{desc}</p>
    </Link>
  );
}
