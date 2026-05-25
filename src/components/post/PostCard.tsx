import Image from 'next/image';
import Link from 'next/link';
import { PostMeta } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import Badge from '@/components/ui/Badge';
import { format } from 'date-fns';

interface Props {
  post: PostMeta;
}

function ThumbnailPlaceholder({ category, tags }: { category: string; tags: string[] }) {
  const visibleTags = tags.slice(0, 3);

  return (
    <div className="relative w-full aspect-16/10 overflow-hidden mb-4 rounded-sm bg-linear-to-br from-gray-100 via-gray-150 to-gray-200 flex flex-col items-center justify-center gap-3">
      <div className="absolute inset-2.5 rounded-sm border border-gray-300 pointer-events-none" />
      <div className="absolute inset-3.5 rounded-sm border border-gray-300/50 pointer-events-none" />
      <span className="text-4xl font-bold tracking-tight text-gray-500 uppercase" style={{ fontFamily: 'var(--font-playfair)' }}>
        {category}
      </span>
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 px-10">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-500 border border-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post }: Props) {
  const href = ROUTES.POST(post.category, post.slug);
  const formattedDate = post.date
    ? format(new Date(post.date), 'MMM dd, yyyy')
    : '';

  return (
    <Link href={href} className="group flex flex-col">
      {post.thumbnail ? (
        <div className="relative w-full aspect-16/10 overflow-hidden mb-4">
          <Image
            src={post.thumbnail}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <ThumbnailPlaceholder category={post.category} tags={post.tags} />
      )}
      <div>
        <Badge>{post.category}</Badge>
        <h2 className="mt-2 text-base font-semibold text-gray-900 leading-snug group-hover:text-gray-500 transition-colors line-clamp-2">
          {post.title}
        </h2>
        <p className="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-2">
          {post.description}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <span>{formattedDate}</span>
          <span>·</span>
          <span>{post.readTime} min read</span>
        </div>
      </div>
    </Link>
  );
}
