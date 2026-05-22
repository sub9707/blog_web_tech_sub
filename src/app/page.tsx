import { Suspense } from 'react';
import { getPosts } from '@/services/posts/getPosts';
import { getCategories } from '@/services/posts/getCategories';
import CategoryFilter from '@/components/post/CategoryFilter';
import PostGrid from '@/components/post/PostGrid';
import { SITE } from '@/constants/site';

export const metadata = {
  title: SITE.NAME,
  description: SITE.DESCRIPTION,
};

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h1 className="text-6xl font-bold tracking-tight text-gray-900 leading-none">
              Blog
            </h1>
            <p className="mt-3 text-sm text-gray-500">{SITE.DESCRIPTION}</p>
          </div>
          <Suspense>
            <CategoryFilter categories={categories} />
          </Suspense>
        </div>
        <div className="mt-8 border-t border-gray-100" />
      </div>

      <Suspense>
        <PostGrid posts={posts} />
      </Suspense>
    </div>
  );
}
