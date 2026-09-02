import Image from 'next/image';
import Link from 'next/link';
import { ProjectMeta } from '@/types/project';
import { ROUTES } from '@/constants/routes';

interface Props {
  project: ProjectMeta;
}

export default function ProjectCard({ project }: Props) {
  return (
    <Link href={ROUTES.PROJECT(project.slug)} className="group block">
      <div className="relative aspect-4/3 overflow-hidden bg-gray-100 dark:bg-navy-800">
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt={project.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-sm font-bold tracking-widest text-gray-400 uppercase dark:text-slate-500">
              {project.category}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-slate-500">
          {project.category}
        </span>
        <h3 className="mt-1 text-lg leading-snug font-semibold text-gray-900 transition-colors group-hover:text-gray-500 dark:text-slate-200 dark:group-hover:text-slate-400">
          {project.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-400 dark:text-slate-500">
          {project.description}
        </p>
        {project.tags.length > 0 && (
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
            {project.tags.join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}
