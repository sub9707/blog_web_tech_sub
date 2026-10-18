export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-3xl">
        <div className="h-12 w-48 bg-gray-100 dark:bg-navy-700 rounded animate-pulse" />
        <div className="mt-3 mb-12 h-4 w-3/4 bg-gray-100 dark:bg-navy-700 rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row gap-3 sm:gap-5 py-5 border-t border-gray-100 dark:border-navy-700"
          >
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3 w-32 bg-gray-100 dark:bg-navy-700 rounded animate-pulse" />
              <div className="h-5 w-full bg-gray-100 dark:bg-navy-700 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-100 dark:bg-navy-700 rounded animate-pulse" />
            </div>
            <div className="w-full sm:w-52 aspect-1200/630 bg-gray-100 dark:bg-navy-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
