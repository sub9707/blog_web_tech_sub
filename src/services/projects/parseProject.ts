import matter from 'gray-matter';
import { Project, ProjectMeta } from '@/types/project';
import { calculateReadTime, slugify } from '@/lib/markdown';

export function toProjectMeta(
  data: Record<string, unknown>,
  content: string,
  fileName: string
): ProjectMeta {
  const title = (data.title as string) ?? fileName.replace(/\.md$/, '');

  return {
    slug: slugify(title),
    category: (data.category as string) ?? '기타',
    title,
    date: (data.date as string) ?? '',
    description: (data.description as string) ?? '',
    thumbnail: data.thumbnail as string | undefined,
    tags: (data.tags as string[]) ?? (data.technologies as string[]) ?? [],
    readTime: calculateReadTime(content),
    featured: (data.featured as boolean) ?? false,
    order:
      typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
    period: (data.period as string) ?? '',
  };
}

export function parseProject(source: string, fileName: string): Project {
  const { data, content } = matter(source);
  return { ...toProjectMeta(data, content, fileName), content };
}

export function sortProjects<T extends ProjectMeta>(projects: T[]): T[] {
  return [...projects].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
