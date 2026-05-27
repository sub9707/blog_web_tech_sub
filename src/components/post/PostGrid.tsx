'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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

  const [featured, ...rest] = visible;

  return (
    <div>
      <PostCard post={featured} />
      {rest.map((post) => (
        <PostListItem key={`${post.category}-${post.slug}`} post={post} />
      ))}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
