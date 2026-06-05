import { Suspense } from 'react';
import { getPosts } from '@/services/posts/getPosts';
import { getCategories } from '@/services/posts/getCategories';
import CategoryFilter from '@/components/post/CategoryFilter';
import PostGrid from '@/components/post/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import HeroSection from '@/components/layout/HeroSection';
import { SITE } from '@/constants/site';
import { format } from 'date-fns';

export const metadata = {
  title: SITE.NAME,
  description: SITE.DESCRIPTION,
};

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);

  const archiveMap = new Map<string, number>();
  posts.forEach((p) => {
    if (!p.date) return;
    const key = format(new Date(p.date), 'yyyy년 M월');
    archiveMap.set(key, (archiveMap.get(key) ?? 0) + 1);
  });
  const archive = [...archiveMap.entries()].map(([label, count]) => ({ label, count }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <HeroSection />

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mt-6 sm:mt-8">
        <div className="flex-1 min-w-0">
          <Suspense>
            <CategoryFilter categories={categories} />
          </Suspense>

          <Suspense>
            <PostGrid posts={posts} />
          </Suspense>
        </div>

        <aside className="lg:w-60 xl:w-64 shrink-0">
          <div className="lg:sticky lg:top-20">
            <Sidebar featuredPosts={posts.slice(0, 5)} archive={archive} />
          </div>
        </aside>
      </div>
    </div>
  );
}
