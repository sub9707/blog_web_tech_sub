import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getProjects } from '@/services/projects/getProjects';
import PortfolioArcCarousel from '@/components/portfolio/PortfolioArcCarousel';
import ProjectGrid from '@/components/portfolio/ProjectGrid';
import CategoryFilter from '@/components/post/CategoryFilter';
import { SITE } from '@/constants/site';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: `${SITE.NAME}의 프로젝트 아카이브`,
};

export default async function PortfolioPage() {
  const projects = await getProjects();
  const categories = [...new Set(projects.map((project) => project.category))];
  const featured = projects.filter((project) => project.featured);
  const carousel = featured.length > 0 ? featured : projects;

  return (
    <div>
      <PortfolioArcCarousel projects={carousel} />

      <section
        id="projects"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
      >
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-slate-500">
            Projects
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-gray-900 sm:text-4xl dark:text-slate-100">
            전체 프로젝트
          </h2>
        </header>

        <Suspense>
          <CategoryFilter categories={categories} />
        </Suspense>

        <Suspense>
          <ProjectGrid projects={projects} />
        </Suspense>
      </section>
    </div>
  );
}
