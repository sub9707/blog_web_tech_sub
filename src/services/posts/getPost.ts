import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Post } from '@/types/post';
import { calculateReadTime, slugify } from '@/lib/markdown';
import { CONTENT_DIR } from '@/constants/paths';

export async function getPost(
  category: string,
  slug: string
): Promise<Post | null> {
  const categoryDir = path.join(CONTENT_DIR, category);
  if (!fs.existsSync(categoryDir)) return null;

  const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.md'));

  const decodedSlug = decodeURIComponent(slug);

  for (const file of files) {
    const filePath = path.join(categoryDir, file);
    const source = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(source);
    const title = data.title ?? file.replace(/\.md$/, '');

    if (slugify(title) === decodedSlug) {
      return {
        slug: decodedSlug,
        category,
        title,
        date: data.date ?? '',
        description: data.description ?? '',
        thumbnail: data.thumbnail,
        tags: data.tags ?? [],
        readTime: calculateReadTime(content),
        content,
      };
    }
  }

  return null;
}
