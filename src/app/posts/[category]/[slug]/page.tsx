import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getPost } from '@/services/posts/getPost';
import { getPosts } from '@/services/posts/getPosts';
import MarkdownRenderer from '@/components/post/MarkdownRenderer';
import ImageZoomWrapper from '@/components/post/ImageZoomWrapper';
import TableOfContents from '@/components/post/TableOfContents';
import MobileTocDrawer from '@/components/post/MobileTocDrawer';
import Badge from '@/components/ui/Badge';
import { ROUTES } from '@/constants/routes';
import { extractHeadings } from '@/utils/extractHeadings';
import { format } from 'date-fns';

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    category: post.category,
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  const post = await getPost(category, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      ...(post.thumbnail && { images: [post.thumbnail] }),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { category, slug } = await params;
  const post = await getPost(category, slug);

  if (!post) notFound();

  const headings = extractHeadings(post.content);
  const formattedDate = post.date
    ? format(new Date(post.date), 'MMMM dd, yyyy')
    : '';

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="flex gap-24 items-start">
        <div className="min-w-0 flex-1">
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors mb-10"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Blog
          </Link>

          <header className="mb-10">
            <Badge>{post.category}</Badge>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100 leading-tight">
              {post.title}
            </h1>
            {post.description && (
              <p className="mt-3 text-base text-gray-500 dark:text-slate-400 leading-relaxed">
                {post.description}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              <span>{formattedDate}</span>
            </div>
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
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

          {post.thumbnail && (
            <div className="relative w-full aspect-video overflow-hidden rounded-lg mb-10">
              <Image
                src={post.thumbnail}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}

          <ImageZoomWrapper>
            <MarkdownRenderer content={post.content} />
          </ImageZoomWrapper>
        </div>

        {headings.length > 0 && (
          <aside className="hidden xl:block w-52 shrink-0 sticky top-1/2 -translate-y-1/2 self-start">
            <TableOfContents headings={headings} />
          </aside>
        )}
      </div>

      {headings.length > 0 && (
        <MobileTocDrawer headings={headings} />
      )}
    </div>
  );
}
