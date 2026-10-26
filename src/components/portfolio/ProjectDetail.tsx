import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Project } from '@/types/project';
import MarkdownRenderer from '@/components/post/MarkdownRenderer';
import ImageZoomWrapper from '@/components/post/ImageZoomWrapper';
import ProjectDescription from '@/components/portfolio/ProjectDescription';
import Badge from '@/components/ui/Badge';
import { ROUTES } from '@/constants/routes';

interface Props {
  project: Project;
  showBackLink?: boolean;
}

export default function ProjectDetail({ project, showBackLink = false }: Props) {
  const timeframe = project.period
    ? project.period
    : project.date
      ? format(new Date(project.date), 'yyyy.MM')
      : '';
  return (
    <>
      {showBackLink && (
        <Link
          href={ROUTES.PORTFOLIO}
          className="mb-10 inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          PORTFOLIO
        </Link>
      )}

      <header className="mb-8 sm:mb-10">
        <Badge>{project.category}</Badge>
        <h1 className="mt-2.5 text-2xl leading-tight font-bold tracking-tight text-gray-900 sm:mt-3 sm:text-3xl lg:text-4xl dark:text-slate-100">
          {project.title}
        </h1>
        {project.description && (
          <p className="mt-2.5 text-sm leading-relaxed break-keep text-balance text-gray-500 sm:mt-3 sm:text-base dark:text-slate-400">
            <ProjectDescription description={project.description} />
          </p>
        )}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-gray-400 sm:mt-4 sm:text-xs dark:text-slate-500">
          {project.tags.length > 0 && <span>{project.tags.join(' · ')}</span>}
          {project.tags.length > 0 && timeframe && <span aria-hidden>·</span>}
          {timeframe && <span>{timeframe}</span>}
        </div>
      </header>

      {project.thumbnail && (
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg sm:mb-10">
          <Image
            src={project.thumbnail}
            alt={project.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 896px, 1152px"
            className="object-cover"
          />
        </div>
      )}

      <ImageZoomWrapper>
        <MarkdownRenderer content={project.content} />
      </ImageZoomWrapper>
    </>
  );
}
