import Image from 'next/image';
import Link from 'next/link';
import { PostMeta } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import { format } from 'date-fns';

interface Props {
  post: PostMeta;
}

const CARD_BG = '#0a0a0a';

export default function PostCard({ post }: Props) {
  const href = ROUTES.POST(post.category, post.slug);
  const formattedDate = post.date ? format(new Date(post.date), 'MMM dd, yyyy') : '';

  return (
    <Link href={href} className="group block mb-6">
      <div
        className="relative overflow-hidden aspect-4/3 sm:aspect-auto sm:min-h-80"
        style={{ background: CARD_BG }}
      >
        {post.thumbnail && (
          <>
            <Image
              src={post.thumbnail}
              alt={post.title}
              fill
              sizes="(max-width: 1024px) 100vw, 65vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
          </>
        )}
        <div className="absolute inset-0 sm:relative z-10 p-5 sm:p-10 flex flex-col justify-end sm:justify-center sm:min-h-80 sm:max-w-[70%]">
          <span className="text-xs font-black sm:font-normal tracking-widest uppercase text-blue-400 mb-2 sm:mb-3">
            Featured
          </span>
          <h2 className="font-serif text-xl sm:text-3xl font-bold text-white leading-tight group-hover:text-gray-300 transition-colors line-clamp-2 sm:line-clamp-3">
            {post.title}
          </h2>
          <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-gray-300 leading-relaxed line-clamp-2">
            {post.description}
          </p>
          <div className="mt-2 sm:mt-4 text-xs text-gray-400">{formattedDate}</div>
        </div>
      </div>
    </Link>
  );
}
