import Image from 'next/image';
import Link from 'next/link';
import { PostMeta } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import Badge from '@/components/ui/Badge';
import { format } from 'date-fns';

interface Props {
  post: PostMeta;
}

export default function PostCard({ post }: Props) {
  const href = ROUTES.POST(post.category, post.slug);
  const formattedDate = post.date
    ? format(new Date(post.date), 'MMM dd, yyyy')
    : '';

  return (
    <Link href={href} className="group flex flex-col">
      {post.thumbnail && (
        <div className="relative w-full aspect-[16/10] overflow-hidden mb-4">
          <Image
            src={post.thumbnail}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className={post.thumbnail ? '' : 'pt-2'}>
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
