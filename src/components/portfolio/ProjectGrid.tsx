'use client';

import { useSearchParams } from 'next/navigation';
import { ProjectMeta } from '@/types/project';
import ProjectCard from '@/components/portfolio/ProjectCard';

interface Props {
  projects: ProjectMeta[];
}

export default function ProjectGrid({ projects }: Props) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'All';

  const filtered =
    activeCategory === 'All'
      ? projects
      : projects.filter((project) => project.category === activeCategory);

  if (filtered.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-gray-400 dark:text-slate-500">
        해당 분류의 프로젝트가 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  );
}
