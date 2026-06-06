import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPosts } from '@/services/posts/getPosts';
import PostListPaginated from '@/components/post/PostListPaginated';
import { ROUTES } from '@/constants/routes';

interface Props {
  params: Promise<{ year: string; month: string }>;
}

export async function generateStaticParams() {
  const posts = await getPosts();
  const seen = new Set<string>();
  const params: { year: string; month: string }[] = [];

  for (const post of posts) {
    if (!post.date) continue;
    const d = new Date(post.date);
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${year}/${month}`;
    if (!seen.has(key)) {
      seen.add(key);
      params.push({ year, month });
    }
  }

  return params;
}

export async function generateMetadata({ params }: Props) {
  const { year, month } = await params;
  return { title: `Archive — ${year}년 ${Number(month)}월` };
}

export default async function ArchiveMonthPage({ params }: Props) {
  const { year, month } = await params;

  const posts = await getPosts();
  const filtered = posts.filter((post) => {
    if (!post.date) return false;
    const d = new Date(post.date);
    return (
      String(d.getFullYear()) === year &&
      String(d.getMonth() + 1).padStart(2, '0') === month
    );
  });

  if (filtered.length === 0) notFound();

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-2xl">
        <Link
          href={ROUTES.ARCHIVE}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors mb-8 inline-block"
        >
          ← Archive
        </Link>

        <h1 className="font-serif text-5xl font-bold text-gray-900 mb-2">
          {year}년 {Number(month)}월
        </h1>
        <p className="text-sm text-gray-400 mb-12">{filtered.length}개의 글</p>

        <PostListPaginated posts={filtered} />
      </div>
    </div>
  );
}
