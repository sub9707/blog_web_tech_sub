import { ImageResponse } from 'next/og';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { getNews } from '@/services/news/getNews';
import { getNewsList } from '@/services/news/getNewsList';
import { SITE } from '@/constants/site';

export const alt = 'FE News weekly digest';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MAX_TAGS = 5;
const ASCII_ONLY = /^[\x20-\x7E]+$/;

export async function generateStaticParams() {
  const newsList = await getNewsList();
  return newsList.map((news) => ({ slug: news.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await getNews(slug);
  const date = news?.date ? new Date(news.date) : new Date();
  const weekLabel = `${getISOWeekYear(date)} · WEEK ${getISOWeek(date)}`;
  const tags = (news?.tags ?? []).filter((tag) => ASCII_ONLY.test(tag)).slice(0, MAX_TAGS);
  const period = news?.period && ASCII_ONLY.test(news.period) ? news.period : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#0d1117',
          color: '#e2e8f0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 28, letterSpacing: 6, color: '#8390c0' }}>{weekLabel}</div>
          <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
            FE News
          </div>
          {period && <div style={{ fontSize: 32, color: '#94a3b8' }}>{period}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 820 }}>
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  fontSize: 26,
                  padding: '8px 20px',
                  borderRadius: 999,
                  border: '2px solid #3d4565',
                  color: '#cbd5e1',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 26, color: '#6371a0' }}>{SITE.NAME}</div>
        </div>
      </div>
    ),
    size
  );
}
