export default function SuggestedQuestions() {
  const questions = [
    "Explain JavaScript closures with chai analogy?",
    "Best way to learn DSA for beginners?",
    "How to transition from frontend to fullstack?",
    "Python vs JavaScript for AI development?",
    "Tips for building production-ready web apps?",
  ];

  return (
    <div className="max-w-md w-full bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
      <h3 className="mb-4 text-center font-semibold">Start a conversation</h3>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            className="p-2 border rounded text-left hover:bg-purple-50 dark:hover:bg-gray-700"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
