import fs from 'fs';
import path from 'path';
import { News } from '@/types/news';
import { NEWS_DIR } from '@/constants/paths';
import { isPublished, parseNews } from '@/services/news/parseNews';

export async function getNews(slug: string): Promise<News | null> {
  const fileName = `${decodeURIComponent(slug)}.md`;
  const filePath = path.join(NEWS_DIR, fileName);

  if (path.dirname(filePath) !== NEWS_DIR || !fs.existsSync(filePath)) return null;

  const news = parseNews(fs.readFileSync(filePath, 'utf-8'), fileName);
  return isPublished(news) ? news : null;
}
