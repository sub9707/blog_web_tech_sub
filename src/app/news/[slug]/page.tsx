import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getNews } from '@/services/news/getNews';
import { getNewsList } from '@/services/news/getNewsList';
import MarkdownRenderer from '@/components/post/MarkdownRenderer';
import ImageZoomWrapper from '@/components/post/ImageZoomWrapper';
import GlossaryWrapper from '@/components/news/GlossaryWrapper';
import TableOfContents from '@/components/post/TableOfContents';
import MobileTocDrawer from '@/components/post/MobileTocDrawer';
import HeadingBreadcrumb from '@/components/post/HeadingBreadcrumb';
import ReadingProgressBar from '@/components/common/ReadingProgressBar';
import BackLink from '@/components/common/BackLink';
import Badge from '@/components/ui/Badge';
import { ROUTES } from '@/constants/routes';
import { NEWS_PAGE } from '@/constants/news';
import { extractHeadings } from '@/utils/extractHeadings';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const newsList = await getNewsList();
  return newsList.map((news) => ({ slug: news.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNews(slug);
  if (!news) return {};

  return {
    title: news.title,
    description: news.description,
    alternates: { canonical: ROUTES.NEWS_DETAIL(news.slug) },
    openGraph: {
      type: 'article',
      title: news.title,
      description: news.description,
      publishedTime: news.date,
      tags: news.tags,
      ...(news.thumbnail && { images: [news.thumbnail] }),
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const news = await getNews(slug);

  if (!news) notFound();

  const headings = extractHeadings(news.content);
  const formattedDate = news.date ? format(new Date(news.date), 'MMMM dd, yyyy') : '';

  return (
    <>
      <ReadingProgressBar className="sticky top-14.25 z-40 h-0.75 bg-gray-200 dark:bg-navy-700" />
      <HeadingBreadcrumb headings={headings} />
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex gap-24 items-start">
          <article className="min-w-0 flex-1">
            <BackLink href={ROUTES.NEWS} label="Back to FE News" />

            <header className="mb-10">
              <Badge>{NEWS_PAGE.TITLE}</Badge>
              <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100 leading-tight">
                {news.title}
              </h1>
              {news.description && (
                <p className="mt-3 text-base text-gray-500 dark:text-slate-400 leading-relaxed">
                  {news.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-slate-500">
                <time dateTime={news.date}>{formattedDate}</time>
                {news.period && <span>수집 기간 {news.period}</span>}
                {news.sourceCount > 0 && <span>소식 {news.sourceCount}건</span>}
              </div>
              {news.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {news.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-navy-700 text-gray-500 dark:text-slate-400 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <ImageZoomWrapper>
              <GlossaryWrapper glossary={news.glossary}>
                <MarkdownRenderer content={news.content} />
              </GlossaryWrapper>
            </ImageZoomWrapper>

            <p className="mt-16 pt-6 border-t border-gray-100 dark:border-navy-700 text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
              {NEWS_PAGE.AI_NOTICE}
            </p>
          </article>

          {headings.length > 0 && (
            <aside className="hidden lg:block w-60 shrink-0 sticky top-24 self-start">
              <TableOfContents headings={headings} />
            </aside>
          )}
        </div>
      </div>

      {headings.length > 0 && <MobileTocDrawer headings={headings} />}
    </>
  );
}
