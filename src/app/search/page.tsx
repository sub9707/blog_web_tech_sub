export const metadata = {
  title: 'Search',
};

export default function SearchPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-xl">
        <h1 className="font-serif text-5xl font-bold text-gray-900 mb-10">
          Search
        </h1>

        <div className="relative">
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            className="w-full border-b-2 border-gray-200 py-3 pr-10 text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 transition-colors text-base bg-transparent"
          />
          <svg
            className="absolute right-0 top-3.5 text-gray-400"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <p className="mt-20 text-center text-sm text-gray-400">
          검색 기능은 준비 중입니다.
        </p>
      </div>
    </div>
  );
}
