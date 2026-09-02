import { PostMeta } from '@/types/post';

export interface ProjectMeta extends PostMeta {
  featured: boolean;
  order: number;
  period: string;
}

export interface Project extends ProjectMeta {
  content: string;
}
