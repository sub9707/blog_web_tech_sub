'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PostMeta } from '@/types/post';
import PostCard from '@/components/post/PostCard';
import PostListItem from '@/components/post/PostListItem';
import { SITE } from '@/constants/site';

interface Props {
  posts: PostMeta[];
}

export default function PostGrid({ posts }: Props) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'All';

  const filtered =
    activeCategory === 'All'
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const [visibleCount, setVisibleCount] = useState<number>(SITE.POSTS_PER_PAGE);

  useEffect(() => {
    setVisibleCount(SITE.POSTS_PER_PAGE);
  }, [activeCategory]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-16 text-center">
        No posts in this category yet.
      </p>
    );
  }

  const [featured, ...rest] = visible;

  return (
    <div>
      <PostCard post={featured} />
      {rest.map((post) => (
        <PostListItem key={`${post.category}-${post.slug}`} post={post} />
      ))}
      {hasMore && (
        <div className="pt-4 pb-8 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + SITE.POSTS_PER_PAGE)}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors"
          >
            포스팅 더보기
          </button>
        </div>
      )}
    </div>
  );
}
