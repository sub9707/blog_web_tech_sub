import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { NewsMeta } from '@/types/news';
import { NEWS_DIR } from '@/constants/paths';
import { isPublished, toNewsMeta } from '@/services/news/parseNews';

export async function getNewsList(): Promise<NewsMeta[]> {
  if (!fs.existsSync(NEWS_DIR)) return [];

  const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith('.md'));

  return files
    .map((file) => {
      const { data } = matter(fs.readFileSync(path.join(NEWS_DIR, file), 'utf-8'));
      return toNewsMeta(data, file);
    })
    .filter(isPublished)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
