export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1 p-3 text-gray-500 dark:text-gray-300 text-sm">
      <span className="animate-bounce">.</span>
      <span className="animate-bounce delay-150">.</span>
      <span className="animate-bounce delay-300">.</span>
    </div>
  );
}
