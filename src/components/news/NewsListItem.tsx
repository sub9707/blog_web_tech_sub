import Image from 'next/image';
import Link from 'next/link';
import { NewsMeta } from '@/types/news';
import { ROUTES } from '@/constants/routes';
import { getNewsThumbnail } from '@/services/news/parseNews';
import { format } from 'date-fns';

interface Props {
  news: NewsMeta;
}

export default function NewsListItem({ news }: Props) {
  const formattedDate = news.date ? format(new Date(news.date), 'MMM dd, yyyy') : '';

  return (
    <Link
      href={ROUTES.NEWS_DETAIL(news.slug)}
      className="group flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5 py-5 border-t border-gray-100 dark:border-navy-700"
    >
      <div className="relative w-full sm:w-52 shrink-0 aspect-1200/630 overflow-hidden bg-gray-100 dark:bg-navy-700 sm:order-last">
        <Image
          src={getNewsThumbnail(news)}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 208px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-slate-500">
          <span>{news.period || formattedDate}</span>
          {news.isDraft && <span className="text-amber-600 dark:text-amber-400">Draft</span>}
        </div>
        <h2 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-200 leading-snug group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors line-clamp-2">
          {news.title}
        </h2>
        {news.description && (
          <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500 leading-relaxed line-clamp-2">
            {news.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-slate-500">
          <time dateTime={news.date}>{formattedDate}</time>
          {news.sourceCount > 0 && <span>소식 {news.sourceCount}건</span>}
        </div>
      </div>
    </Link>
  );
}
