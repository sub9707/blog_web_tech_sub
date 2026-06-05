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
      {/* 모바일: 하단 그라디언트 세로 레이아웃 */}
      <div className="sm:hidden relative overflow-hidden aspect-4/3" style={{ background: CARD_BG }}>
        {post.thumbnail && (
          <Image
            src={post.thumbnail}
            alt={post.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <span className="text-xs tracking-widest uppercase text-blue-400 mb-2 block">
            Featured
          </span>
          <h2 className="font-serif text-xl font-bold text-white leading-tight group-hover:text-gray-300 transition-colors line-clamp-2">
            {post.title}
          </h2>
          <p className="mt-1.5 text-xs text-gray-400 leading-relaxed line-clamp-2">
            {post.description}
          </p>
          <div className="mt-2 text-xs text-gray-500">{formattedDate}</div>
        </div>
      </div>

      {/* sm 이상: 가로 그라디언트 레이아웃 */}
      <div className="hidden sm:block relative overflow-hidden min-h-80" style={{ background: CARD_BG }}>
        {post.thumbnail && (
          <Image
            src={post.thumbnail}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 65vw"
            className="object-cover"
          />
        )}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: post.thumbnail
              ? `linear-gradient(to right, ${CARD_BG} 0%, ${CARD_BG} 28%, rgba(10,10,10,0.88) 45%, rgba(10,10,10,0.38) 65%, rgba(10,10,10,0.05) 100%)`
              : CARD_BG,
          }}
        />
        <div className="relative z-20 p-8 sm:p-10 flex flex-col justify-center min-h-80 max-w-[58%]">
          <span className="text-xs tracking-widest uppercase text-blue-400 mb-3">
            Featured
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight group-hover:text-gray-300 transition-colors line-clamp-3">
            {post.title}
          </h2>
          <p className="mt-3 text-sm text-gray-400 leading-relaxed line-clamp-2">
            {post.description}
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
