import type { Metadata } from 'next';
import { getNewsList } from '@/services/news/getNewsList';
import NewsListItem from '@/components/news/NewsListItem';
import NewsPipelineIntro from '@/components/news/NewsPipelineIntro';
import { NEWS_PAGE } from '@/constants/news';
import { ROUTES } from '@/constants/routes';

export const metadata: Metadata = {
  title: NEWS_PAGE.TITLE,
  description: NEWS_PAGE.DESCRIPTION,
  alternates: { canonical: ROUTES.NEWS },
  openGraph: {
    title: NEWS_PAGE.TITLE,
    description: NEWS_PAGE.DESCRIPTION,
  },
};

export default async function NewsPage() {
  const newsList = await getNewsList();

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-3xl">
        <h1 className="font-serif text-5xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          {NEWS_PAGE.TITLE}
        </h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 leading-relaxed mb-10">
          {NEWS_PAGE.DESCRIPTION}
        </p>

        <NewsPipelineIntro />

        {newsList.length > 0 ? (
          <ul>
            {newsList.map((news) => (
              <li key={news.slug}>
                <NewsListItem news={news} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-16 text-center text-sm text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-navy-700">
            아직 발행된 소식이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
