import Link from 'next/link';
import { getPosts } from '@/services/posts/getPosts';
import { ROUTES } from '@/constants/routes';

export const metadata = {
  title: 'Archive',
};

export default async function ArchivePage() {
  const posts = await getPosts();

  const yearMap = new Map<string, Map<string, number>>();

  for (const post of posts) {
    if (!post.date) continue;
    const d = new Date(post.date);
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');

    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  const groups = [...yearMap.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, monthMap]) => ({
      year,
      months: [...monthMap.entries()]
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([num, count]) => ({ num, label: `${Number(num)}월`, count })),
    }));

  const total = posts.length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-xl">
        <h1 className="font-serif text-5xl font-bold text-gray-900 dark:text-slate-100 mb-2">Archive</h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mb-12">총 {total}개의 글</p>

        <div className="space-y-12">
          {groups.map(({ year, months }) => (
            <div key={year}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4 pb-2 border-b border-gray-100 dark:border-navy-700">
                {year}
              </h2>
              <ul className="space-y-1">
                {months.map(({ num, label, count }) => (
                  <li key={num}>
                    <Link
                      href={ROUTES.ARCHIVE_MONTH(year, num)}
                      className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-navy-800 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors px-1 group"
                    >
                      <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-colors">
                        {year}년 {label}
                      </span>
                      <span className="text-sm text-gray-400 dark:text-slate-500">{count}개</span>
                    </Link>
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
