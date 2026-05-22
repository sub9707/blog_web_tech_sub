'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PostMeta } from '@/types/post';
import PostCard from '@/components/post/PostCard';
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
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(SITE.POSTS_PER_PAGE);
  }, [activeCategory]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + SITE.POSTS_PER_PAGE);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-16 text-center">
        No posts in this category yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {visible.map((post) => (
          <PostCard key={`${post.category}-${post.slug}`} post={post} />
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
