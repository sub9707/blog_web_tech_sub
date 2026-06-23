import type { FuseResult, FuseResultMatch } from 'fuse.js';
import Link from 'next/link';
import type { SearchItem } from '@/types/search';
import { ROUTES } from '@/constants/routes';

function getMatch(matches: readonly FuseResultMatch[] | undefined, key: string) {
  return matches?.find((m) => m.key === key);
}

function renderHighlighted(text: string, match?: FuseResultMatch) {
  const indices = match?.indices;
  if (!indices?.length) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const [start, end] of indices) {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <span key={start} className="bg-gray-900 dark:bg-slate-200 text-white dark:text-navy-900">
        {text.slice(start, end + 1)}
      </span>,
    );
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}

interface Props {
  result: FuseResult<SearchItem>;
}

export default function SearchResultItem({ result }: Props) {
  const { item, matches } = result;

  const titleMatch = getMatch(matches, 'title');
  const descMatch = getMatch(matches, 'description');
  const matchedTagIndices = new Set(
    matches
      ?.filter((m) => m.key === 'tags')
      .map((m) => (m as FuseResultMatch & { arrayIndex?: number }).arrayIndex) ?? [],
  );

  return (
    <li className="py-5 border-b border-gray-100 dark:border-navy-700 last:border-0">
      <Link
        href={ROUTES.POST(item.category, item.slug)}
        className="group block space-y-1.5"
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-200 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors">
          {renderHighlighted(item.title, titleMatch)}
        </h2>

        {item.description && (
          <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {renderHighlighted(item.description, descMatch)}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap pt-0.5">
          {item.date && (
            <time className="text-xs text-gray-400 dark:text-slate-500">{item.date}</time>
          )}
          {item.tags.map((tag, i) => (
            <span
              key={tag}
              className={
                matchedTagIndices.has(i)
                  ? 'text-xs px-1.5 py-0.5 bg-gray-900 dark:bg-slate-200 text-white dark:text-navy-900 rounded'
                  : 'text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-navy-700 text-gray-500 dark:text-slate-400 rounded'
              }
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </li>
  );
}
