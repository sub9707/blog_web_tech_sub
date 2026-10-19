import matter from 'gray-matter';
import { format } from 'date-fns';

const MAX_BOOKMARKS = 8;
const SECTION_BREAK = '<br/>';

function escapeLinkText(text) {
  return text.replace(/([[\]])/g, '\\$1');
}

function toBookmark(url) {
  return `<bookmark url="${url.replace(/"/g, '%22')}"></bookmark>`;
}

function toSourceLink(entry) {
  const date = format(new Date(entry.publishedAt), 'yyyy.MM.dd');
  return `[${escapeLinkText(entry.title)}](${entry.url}) · ${entry.source.name} · ${date}`;
}

function renderCitation(entries) {
  if (entries.length === 1) return `출처: ${toSourceLink(entries[0])}`;
  return `출처\n\n${entries.map((entry) => `- ${toSourceLink(entry)}`).join('\n')}`;
}

function renderSection(section, index, entryById) {
  const entries = section.ids.map((id) => entryById.get(id));
  return [
    `## ${index + 1}. ${section.heading}`,
    index < MAX_BOOKMARKS && toBookmark(entries[0].url),
    section.body.trim(),
    renderCitation(entries),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function renderBriefs(briefs, entryById) {
  const lines = briefs.map((brief) => {
    const entry = entryById.get(brief.id);
    const summary = brief.summary ? ` ${brief.summary}` : '';
    return `- **${brief.titleKo}**${summary}\n  출처: ${toSourceLink(entry)}`;
  });
  return ['## 한눈에 보는 단신', lines.join('\n')].join('\n\n');
}

export function renderArticle({ entries, article, since, until }) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const mentionedIds = new Set([
    ...article.sections.flatMap((section) => section.ids),
    ...article.briefs.map((brief) => brief.id),
  ]);
  const unmentionedBriefs = entries
    .filter((entry) => !mentionedIds.has(entry.id))
    .map((entry) => ({ id: entry.id, titleKo: entry.title, summary: '' }));
  const briefs = [...article.briefs, ...unmentionedBriefs];

  const blocks = [
    article.intro.trim(),
    ...article.sections.map((section, index) => renderSection(section, index, entryById)),
    briefs.length > 0 && renderBriefs(briefs, entryById),
    `## 마무리\n\n${article.outro.trim()}`,
  ].filter(Boolean);

  const frontmatter = {
    title: article.title,
    date: format(until, 'yyyy-MM-dd'),
    period: `${format(since, 'yyyy-MM-dd')} ~ ${format(until, 'yyyy-MM-dd')}`,
    description: article.description,
    tags: [...new Set(article.sections.map((section) => section.category).filter(Boolean))],
    sourceCount: entries.length,
  };

  return {
    frontmatter,
    markdown: matter.stringify(`\n${blocks.join(`\n\n${SECTION_BREAK}\n\n`)}\n`, frontmatter),
  };
}
