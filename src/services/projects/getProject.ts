import fs from 'fs';
import path from 'path';
import { Project } from '@/types/project';
import { PROJECTS_DIR } from '@/constants/paths';
import { parseProject } from '@/services/projects/parseProject';
import { slugify } from '@/lib/markdown';

export async function getProject(slug: string): Promise<Project | null> {
  if (!fs.existsSync(PROJECTS_DIR)) return null;

  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.md'));
  const decodedSlug = decodeURIComponent(slug);

  for (const file of files) {
    const source = fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf-8');
    const project = parseProject(source, file);
    if (project.slug === slugify(decodedSlug) || project.slug === decodedSlug) {
      return project;
    }
  }

  return null;
}
