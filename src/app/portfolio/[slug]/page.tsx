import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProject } from '@/services/projects/getProject';
import { getProjects } from '@/services/projects/getProjects';
import ProjectDetail from '@/components/portfolio/ProjectDetail';
import TableOfContents from '@/components/post/TableOfContents';
import MobileTocDrawer from '@/components/post/MobileTocDrawer';
import HeadingBreadcrumb from '@/components/post/HeadingBreadcrumb';
import ReadingProgressBar from '@/components/common/ReadingProgressBar';
import { extractHeadings } from '@/utils/extractHeadings';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      ...(project.thumbnail && { images: [project.thumbnail] }),
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  const headings = extractHeadings(project.content);

  return (
    <>
      <ReadingProgressBar className="sticky top-14.25 z-40 h-0.75 bg-gray-200 dark:bg-navy-700" />
      <HeadingBreadcrumb headings={headings} />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-start gap-24">
          <div className="min-w-0 flex-1">
            <ProjectDetail project={project} showBackLink />
          </div>

          {headings.length > 0 && (
            <aside className="sticky top-24 hidden w-60 shrink-0 self-start lg:block">
              <TableOfContents headings={headings} />
            </aside>
          )}
        </div>
      </div>

      {headings.length > 0 && <MobileTocDrawer headings={headings} />}
    </>
  );
}
