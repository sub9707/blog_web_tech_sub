import Image from 'next/image';
import Link from 'next/link';
import { PostMeta } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import { format } from 'date-fns';

interface Props {
  post: PostMeta;
}

function ThumbnailPlaceholder({ category }: { category: string }) {
  return (
    <div className="aspect-video w-full bg-linear-to-br from-gray-100 to-gray-200 dark:from-navy-700 dark:to-navy-600 flex items-center justify-center relative">
      <div className="absolute inset-2 border border-gray-300 dark:border-navy-500 pointer-events-none" />
      <div className="absolute inset-3 border border-gray-300/50 dark:border-navy-500/50 pointer-events-none" />
      <span className="font-serif text-sm font-bold tracking-tight text-gray-500 dark:text-slate-400 uppercase">
        {category}
      </span>
    </div>
  );
}

export default function PostListItem({ post }: Props) {
  const href = ROUTES.POST(post.category, post.slug);
  const formattedDate = post.date ? format(new Date(post.date), 'MMM dd, yyyy') : '';

  return (
    <Link href={href} className="group block py-5 border-t border-gray-100 dark:border-navy-700">
      <div className="sm:hidden w-full aspect-video overflow-hidden bg-gray-100 dark:bg-navy-700 mb-3">
        {post.thumbnail ? (
          <Image
            src={post.thumbnail}
            alt={post.title}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ThumbnailPlaceholder category={post.category} />
        )}
      </div>

      <div className="flex items-start gap-4 sm:gap-5">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-slate-500">
            {post.category}
          </span>
          <h3 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-200 leading-snug group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500 leading-relaxed line-clamp-2">
            {post.description}
          </p>
          <div className="mt-2 text-xs text-gray-400 dark:text-slate-500">
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="hidden sm:block w-44 md:w-52 shrink-0 self-start overflow-hidden bg-gray-100 dark:bg-navy-700">
          {post.thumbnail ? (
            <Image
              src={post.thumbnail}
              alt={post.title}
              width={0}
              height={0}
              sizes="(max-width: 768px) 176px, 208px"
              className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <ThumbnailPlaceholder category={post.category} />
          )}
        </div>
      </div>
    </Link>
  );
}
