import GithubSlugger from 'github-slugger';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];

  const lines = markdown.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim().replace(/`([^`]*)`/g, '$1');
    const id = slugger.slug(text);

    headings.push({ id, text, level });
  }

  return headings;
}
