import { Suspense } from 'react';
import { getPosts } from '@/services/posts/getPosts';
import { getCategories } from '@/services/posts/getCategories';
import CategoryFilter from '@/components/post/CategoryFilter';
import PostGrid from '@/components/post/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import { SITE } from '@/constants/site';
import { format } from 'date-fns';

export const metadata = {
  title: SITE.NAME,
  description: SITE.DESCRIPTION,
};

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);

  const tags = [...new Set(posts.flatMap((p) => p.tags))];

  const archiveMap = new Map<string, number>();
  posts.forEach((p) => {
    if (!p.date) return;
    const key = format(new Date(p.date), 'yyyy년 M월');
    archiveMap.set(key, (archiveMap.get(key) ?? 0) + 1);
  });
  const archive = [...archiveMap.entries()].map(([label, count]) => ({ label, count }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h1
              className="font-serif text-6xl sm:text-7xl font-bold text-gray-900 leading-none tracking-tight"
            >
              Blog
            </h1>
            <p className="mt-3 text-sm text-gray-500">{SITE.DESCRIPTION}</p>
          </div>

          <Suspense>
            <CategoryFilter categories={categories} />
          </Suspense>

          <Suspense>
            <PostGrid posts={posts} />
          </Suspense>
        </div>

        <aside className="lg:w-60 xl:w-68 shrink-0 lg:pt-2">
          <div className="lg:sticky lg:top-20">
            <Sidebar tags={tags} archive={archive} />
          </div>
        </aside>
      </div>
    </div>
  );
}
