export const metadata = {
  title: 'Archive',
};

const testArchive = [
  {
    year: '2025',
    months: [
      { label: '5월', count: 8 },
      { label: '4월', count: 7 },
      { label: '3월', count: 6 },
      { label: '2월', count: 4 },
      { label: '1월', count: 3 },
    ],
  },
  {
    year: '2024',
    months: [
      { label: '12월', count: 5 },
      { label: '11월', count: 3 },
      { label: '10월', count: 6 },
    ],
  },
];

export default function ArchivePage() {
  const total = testArchive.reduce(
    (sum, y) => sum + y.months.reduce((s, m) => s + m.count, 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-xl">
        <h1 className="font-serif text-5xl font-bold text-gray-900 mb-2">
          Archive
        </h1>
        <p className="text-sm text-gray-400 mb-12">총 {total}개의 글</p>

        <div className="space-y-12">
          {testArchive.map((yearGroup) => (
            <div key={yearGroup.year}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                {yearGroup.year}
              </h2>
              <ul className="space-y-1">
                {yearGroup.months.map((month) => (
                  <li
                    key={month.label}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50"
                  >
                    <span className="text-sm text-gray-700">
                      {yearGroup.year}년 {month.label}
                    </span>
                    <span className="text-sm text-gray-400">{month.count}개</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
