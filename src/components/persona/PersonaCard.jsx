import { useNavigate } from "react-router-dom";

export default function PersonaCard({ persona }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/chat/${persona.id}`)}
      className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer flex flex-col"
    >
      <div className="flex items-center gap-4">
        <img
          src={persona.avatar}
          alt={persona.name}
          className="w-14 h-14 rounded-full border-2 border-purple-500"
        />
        <div>
          <h3 className="text-lg font-semibold">{persona.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {persona.role}
          </p>
           <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {persona.short_description}
          </p>
        </div>
      </div>

      {/* Skills */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {persona.skills.map((skill, idx) => (
          <span
            key={idx}
            className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 rounded-full"
          >
            {skill}
          </span>
        ))}
      </div>
      {/* Social Links */}
<div className="mt-4 flex gap-3 text-sm text-blue-500">
  {persona.social_links?.twitter && (
    <a
      href={persona.social_links.twitter}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      Twitter
    </a>
  )}
  {persona.social_links?.linkedin && (
    <a
      href={persona.social_links.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      LinkedIn
    </a>
  )}
  {persona.social_links?.youtube && (
    <a
      href={persona.social_links.youtube}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      YouTube
    </a>
  )}
</div>

    </div>
  );
}
