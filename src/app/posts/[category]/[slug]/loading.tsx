export default function PostLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-10" />
      <div className="space-y-4 mb-10">
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-3/4 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg animate-pulse mb-10" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${80 + Math.random() * 20}%` }} />
        ))}
      </div>
    </div>
  );
}
