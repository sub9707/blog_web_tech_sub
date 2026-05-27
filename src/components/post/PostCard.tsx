import Image from 'next/image';
import Link from 'next/link';
import { PostMeta } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import { format } from 'date-fns';

interface Props {
  post: PostMeta;
}

export default function PostCard({ post }: Props) {
  const href = ROUTES.POST(post.category, post.slug);
  const formattedDate = post.date ? format(new Date(post.date), 'MMM dd, yyyy') : '';

  return (
    <Link href={href} className="group block mb-2">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        <div className="relative w-full sm:w-1/2 aspect-video overflow-hidden bg-gray-100 shrink-0">
          {post.thumbnail ? (
            <Image
              src={post.thumbnail}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="font-serif text-4xl font-bold text-gray-400 uppercase">
                {post.category}
              </span>
            </div>
          )}
        </div>
        <div className="sm:w-1/2 flex flex-col justify-center">
          <span className="text-xs font-medium tracking-widest uppercase text-gray-400">
            {post.category}
          </span>
          <h2 className="font-serif mt-2 text-2xl sm:text-3xl font-bold leading-tight text-gray-900 group-hover:text-gray-600 transition-colors">
            {post.title}
          </h2>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed line-clamp-3">
            {post.description}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{post.readTime} min read</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
