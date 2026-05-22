import { processMarkdown } from '@/lib/processMarkdown';

interface Props {
  content: string;
}

export default async function MarkdownRenderer({ content }: Props) {
  const html = await processMarkdown(content);

  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
