import matter from 'gray-matter';
import { GlossaryEntry, GlossaryImage, News, NewsMeta } from '@/types/news';
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toGlossaryImage(value: unknown): GlossaryImage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { url, alt, sourceUrl } = value as Record<string, unknown>;
  if (!isNonEmptyString(url)) return undefined;
  return { url, alt: isNonEmptyString(alt) ? alt : '', sourceUrl: isNonEmptyString(sourceUrl) ? sourceUrl : undefined };
}

function toGlossary(value: unknown): GlossaryEntry[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const { id, term, description, image } = (item ?? {}) as Record<string, unknown>;
    if (!isNonEmptyString(id) || !isNonEmptyString(term) || !isNonEmptyString(description)) return [];
    return [{ id, term, description, image: toGlossaryImage(image) }];
  });
}

export function parseNews(source: string, fileName: string): News {
  const { data, content } = matter(source);
  return { ...toNewsMeta(data, fileName), content, glossary: toGlossary(data.glossary) };
}

export function isPublished(news: NewsMeta): boolean {
  return !news.isDraft || process.env.NODE_ENV !== 'production';
}

export function getNewsThumbnail(news: NewsMeta): string {
  return news.thumbnail ?? ROUTES.NEWS_THUMBNAIL(news.slug);
}
