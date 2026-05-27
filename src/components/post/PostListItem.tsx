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
    <div className="relative w-full h-full bg-linear-to-br from-gray-100 via-gray-150 to-gray-200 flex items-center justify-center">
      <div className="absolute inset-2 border border-gray-300 pointer-events-none" />
      <div className="absolute inset-3 border border-gray-300/50 pointer-events-none" />
      <span className="font-serif text-sm font-bold tracking-tight text-gray-500 uppercase">
        {category}
      </span>
    </div>
  );
}

export default function PostListItem({ post }: Props) {
  const href = ROUTES.POST(post.category, post.slug);
  const formattedDate = post.date ? format(new Date(post.date), 'MMM dd, yyyy') : '';

  return (
    <Link href={href} className="group flex gap-4 sm:gap-6 py-5 border-t border-gray-100">
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium tracking-widest uppercase text-gray-400">
          {post.category}
        </span>
        <h3 className="mt-1 text-base font-semibold text-gray-900 leading-snug group-hover:text-gray-500 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="mt-1 text-sm text-gray-500 leading-relaxed line-clamp-2 hidden sm:block">
          {post.description}
        </p>
        <div className="mt-2 text-xs text-gray-400">
          <span>{formattedDate}</span>
        </div>
      </div>
      <div className="relative w-32 sm:w-40 aspect-video shrink-0 self-start overflow-hidden bg-gray-100">
        {post.thumbnail ? (
          <Image
            src={post.thumbnail}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 128px, 160px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ThumbnailPlaceholder category={post.category} />
        )}
      </div>
    </Link>
  );
}
