import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ProjectMeta } from '@/types/project';
import { PROJECTS_DIR } from '@/constants/paths';
import { sortProjects, toProjectMeta } from '@/services/projects/parseProject';

export async function getProjects(): Promise<ProjectMeta[]> {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.md'));

  const projects = files.map((file) => {
    const source = fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf-8');
    const { data, content } = matter(source);
    return toProjectMeta(data, content, file);
  });

  return sortProjects(projects);
}
