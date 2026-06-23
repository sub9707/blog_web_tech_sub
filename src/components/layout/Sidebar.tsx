import Image from 'next/image';
import Link from 'next/link';
import { PostMeta } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import { format } from 'date-fns';

interface ArchiveEntry {
  label: string;
  count: number;
}

interface Props {
  featuredPosts: PostMeta[];
  archive: ArchiveEntry[];
}

export default function Sidebar({ featuredPosts, archive }: Props) {
  return (
    <div className="space-y-10">
      {featuredPosts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-slate-500 mb-4">
            Featured Posts
          </h3>
          <ul className="space-y-4">
            {featuredPosts.map((post, i) => (
              <li key={`${post.category}-${post.slug}`}>
                <Link
                  href={ROUTES.POST(post.category, post.slug)}
                  className="flex items-start gap-3 group"
                >
                  <span className="font-mono text-xs text-gray-300 dark:text-navy-500 tabular-nums w-5 shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative w-12 h-12 shrink-0 overflow-hidden bg-gray-100 dark:bg-navy-700">
                    {post.thumbnail ? (
                      <Image
                        src={post.thumbnail}
                        alt={post.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-navy-600 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                          {post.category.slice(0, 2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {post.date ? format(new Date(post.date), 'MMM dd, yyyy') : ''}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {archive.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-slate-500 mb-4">
            Archive
          </h3>
          <ul className="space-y-2">
            {archive.slice(0, 6).map((entry) => (
              <li key={entry.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">{entry.label}</span>
                <span className="text-gray-400 dark:text-slate-500">({entry.count})</span>
              </li>
            ))}
          </ul>
          {archive.length > 6 && (
            <Link
              href={ROUTES.ARCHIVE}
              className="mt-3 inline-block text-xs text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
            >
              More +
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
