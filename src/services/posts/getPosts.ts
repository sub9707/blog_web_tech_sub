import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { PostMeta } from '@/types/post';
import { calculateReadTime, slugify } from '@/lib/markdown';
import { CONTENT_DIR } from '@/constants/paths';

export async function getPosts(): Promise<PostMeta[]> {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const categories = fs.readdirSync(CONTENT_DIR).filter((item) =>
    fs.statSync(path.join(CONTENT_DIR, item)).isDirectory()
  );

  const posts: PostMeta[] = [];

  for (const category of categories) {
    const categoryDir = path.join(CONTENT_DIR, category);
    const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const source = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(source);
      const title = data.title ?? file.replace(/\.md$/, '');
      const slug = slugify(title);

      posts.push({
        slug,
        category,
        title,
        date: data.date ?? '',
        description: data.description ?? '',
        thumbnail: data.thumbnail,
        tags: data.tags ?? [],
        readTime: calculateReadTime(content),
      });
    }
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
