import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getPost } from '@/services/posts/getPost';
import { getPosts } from '@/services/posts/getPosts';
import MarkdownRenderer from '@/components/post/MarkdownRenderer';
import Badge from '@/components/ui/Badge';
import { ROUTES } from '@/constants/routes';
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

  const formattedDate = post.date
    ? format(new Date(post.date), 'MMMM dd, yyyy')
    : '';

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href={ROUTES.HOME}
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-10"
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
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 leading-tight">
          {post.title}
        </h1>
        {post.description && (
          <p className="mt-3 text-base text-gray-500 leading-relaxed">
            {post.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span>{formattedDate}</span>
          <span>·</span>
          <span>{post.readTime} min read</span>
        </div>
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {post.thumbnail && (
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg mb-10">
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

      <MarkdownRenderer content={post.content} />
    </div>
  );
}
