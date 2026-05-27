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
      <div className="relative overflow-hidden min-h-60 sm:min-h-70" style={{ background: CARD_BG }}>
        {/* 배경 이미지 — 카드 전체를 채움 */}
        {post.thumbnail && (
          <Image
            src={post.thumbnail}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 65vw"
            className="object-cover"
          />
        )}

        {/* 그라데이션 오버레이 — 왼쪽(어두움) → 오른쪽(투명) */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: post.thumbnail
              ? `linear-gradient(to right, ${CARD_BG} 0%, ${CARD_BG} 28%, rgba(10,10,10,0.88) 45%, rgba(10,10,10,0.38) 65%, rgba(10,10,10,0.05) 100%)`
              : CARD_BG,
          }}
        />

        {/* 텍스트 콘텐츠 */}
        <div className="relative z-20 p-8 sm:p-10 flex flex-col justify-center min-h-60 sm:min-h-70 max-w-[65%] sm:max-w-[58%]">
          <span className="text-xs tracking-widest uppercase text-blue-400 mb-3">
            Featured
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight group-hover:text-gray-300 transition-colors line-clamp-3">
            {post.title}
          </h2>
          <p className="mt-3 text-sm text-gray-400 leading-relaxed line-clamp-2 hidden sm:block">
            {post.description}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{post.readTime} min read</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
