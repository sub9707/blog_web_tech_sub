'use client';

import { useState } from 'react';
import { PostMeta } from '@/types/post';
import PostListItem from '@/components/post/PostListItem';
import { SITE } from '@/constants/site';

interface Props {
  posts: PostMeta[];
}

export default function PostListPaginated({ posts }: Props) {
  const [visibleCount, setVisibleCount] = useState<number>(SITE.POSTS_PER_PAGE);
  const visible = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  return (
    <div>
      {visible.map((post) => (
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
