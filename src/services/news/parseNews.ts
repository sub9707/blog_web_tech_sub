import matter from 'gray-matter';
import { News, NewsMeta } from '@/types/news';
import { ROUTES } from '@/constants/routes';

export function toNewsMeta(data: Record<string, unknown>, fileName: string): NewsMeta {
  const slug = fileName.replace(/\.md$/, '');

  return {
    slug,
    title: (data.title as string) ?? slug,
    date: (data.date as string) ?? '',
    period: (data.period as string) ?? '',
    description: (data.description as string) ?? '',
    tags: (data.tags as string[]) ?? [],
    sourceCount: typeof data.sourceCount === 'number' ? data.sourceCount : 0,
    thumbnail: data.thumbnail as string | undefined,
    isDraft: data.draft === true,
  };
}

export function parseNews(source: string, fileName: string): News {
  const { data, content } = matter(source);
  return { ...toNewsMeta(data, fileName), content };
}

export function isPublished(news: NewsMeta): boolean {
  return !news.isDraft || process.env.NODE_ENV !== 'production';
}

export function getNewsThumbnail(news: NewsMeta): string {
  return news.thumbnail ?? ROUTES.NEWS_THUMBNAIL(news.slug);
}
