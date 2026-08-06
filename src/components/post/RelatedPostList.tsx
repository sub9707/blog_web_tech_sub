import Link from 'next/link';
import { PostMeta } from '@/types/post';
import { ROUTES } from '@/constants/routes';

interface Props {
  posts: PostMeta[];
  currentSlug: string;
}

export default function RelatedPostList({ posts, currentSlug }: Props) {
  if (posts.length === 0) return null;

  return (
    <nav
      aria-label="함께 읽을 포스팅"
      className="mb-10 rounded-lg border border-gray-100 dark:border-navy-700 bg-gray-50/50 dark:bg-navy-800/50 p-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">
        함께 읽을 포스팅
      </p>
      <ol className="space-y-2">
        {posts.map((post, index) => {
          const isCurrent = post.slug === currentSlug;
          return (
            <li key={post.slug} className="flex items-baseline gap-2 text-sm">
              <span className="text-gray-400 dark:text-slate-500 tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              {isCurrent ? (
                <span className="text-gray-900 dark:text-slate-100 font-medium">
                  {post.title}
                </span>
              ) : (
                <Link
                  href={ROUTES.POST(post.category, post.slug)}
                  className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
                >
                  {post.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
