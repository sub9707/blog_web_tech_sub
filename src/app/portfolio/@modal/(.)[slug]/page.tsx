import { notFound } from 'next/navigation';
import { getProject } from '@/services/projects/getProject';
import ProjectModal from '@/components/portfolio/ProjectModal';
import ProjectDetail from '@/components/portfolio/ProjectDetail';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InterceptedProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  return (
    <ProjectModal>
      <ProjectDetail project={project} />
    </ProjectModal>
  );
}
