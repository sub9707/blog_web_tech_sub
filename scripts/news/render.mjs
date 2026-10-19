import matter from 'gray-matter';
import { format } from 'date-fns';
import { CATEGORIES } from './sources.mjs';
import { createGlossaryLinker, toGlossaryFrontmatter } from './glossary.mjs';
import { escapeRawHtml } from './text.mjs';

const MAX_BOOKMARKS = 8;
const SECTION_BREAK = '<br/>';

function escapeLinkText(text) {
  return text.replace(/([[\]])/g, '\\$1');
}

function toBookmark(url, { isImageHidden = false } = {}) {
  const hideImage = isImageHidden ? ' hide-image' : '';
  return `<bookmark url="${url.replace(/"/g, '%22')}"${hideImage}></bookmark>`;
}

function toSourceLink(entry) {
  const date = format(new Date(entry.publishedAt), 'yyyy.MM.dd');
  return `[${escapeLinkText(entry.title)}](${entry.url}) · ${entry.source.name} · ${date}`;
}

function renderCitation(entries) {
  if (entries.length === 1) return `출처: ${toSourceLink(entries[0])}`;
  return `출처\n\n${entries.map((entry) => `- ${toSourceLink(entry)}`).join('\n')}`;
}

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function renderFigure(image) {
  if (!image) return null;
  const caption = image.sourceUrl
    ? `\n<figcaption>이미지 출처: <a href="${escapeAttribute(image.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeAttribute(getHostname(image.sourceUrl))}</a></figcaption>`
    : '';
  return `<figure>\n<img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt)}" loading="lazy" referrerpolicy="no-referrer">${caption}\n</figure>`;
}

function renderSection(section, index, entryById, linker) {
  const entries = section.ids.map((id) => entryById.get(id));
  return [
    `## ${index + 1}. ${escapeRawHtml(section.heading)}`,
    renderFigure(section.image),
    linker.link(section.body.trim()),
    index < MAX_BOOKMARKS && toBookmark(entries[0].url, { isImageHidden: Boolean(section.image) }),
    renderCitation(entries),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function renderBriefItem(brief, entry, linker) {
  const summary = brief.summary ? ` ${linker.link(brief.summary)}` : '';
  return `- **${escapeRawHtml(brief.titleKo)}**${summary}\n  출처: ${toSourceLink(entry)}`;
}

function renderBriefs(briefs, entryById, linker) {
  const groups = CATEGORIES.map((category) => {
    const items = briefs.filter((brief) => {
      const briefCategory = CATEGORIES.includes(brief.category) ? brief.category : entryById.get(brief.id).category;
      return briefCategory === category;
    });
    if (items.length === 0) return null;
    const lines = items.map((brief) => renderBriefItem(brief, entryById.get(brief.id), linker));
    return [`### ${category}`, lines.join('\n')].join('\n\n');
  }).filter(Boolean);

  return ['## 한눈에 보는 단신', ...groups].join('\n\n');
}

export function renderArticle({ entries, article, conferenceSection, since, until }) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const mentionedIds = new Set([
    ...article.sections.flatMap((section) => section.ids),
    ...article.briefs.map((brief) => brief.id),
  ]);
  const unmentionedBriefs = entries
    .filter((entry) => !mentionedIds.has(entry.id))
    .map((entry) => ({ id: entry.id, titleKo: entry.title, summary: '' }));
  const briefs = [...article.briefs, ...unmentionedBriefs];

  const linker = createGlossaryLinker(article.glossary ?? []);
  const blocks = [
    linker.link(article.intro.trim()),
    ...article.sections.map((section, index) => renderSection(section, index, entryById, linker)),
    briefs.length > 0 && renderBriefs(briefs, entryById, linker),
    conferenceSection,
    `## 마무리\n\n${linker.link(article.outro.trim())}`,
  ].filter(Boolean);
  const glossary = toGlossaryFrontmatter(linker.getLinkedEntries());

  const frontmatter = {
    title: article.title,
    date: format(until, 'yyyy-MM-dd'),
    period: `${format(since, 'yyyy-MM-dd')} ~ ${format(until, 'yyyy-MM-dd')}`,
    description: article.description,
    tags: [...new Set(article.sections.map((section) => section.category).filter(Boolean))],
    sourceCount: entries.length,
    ...(glossary.length > 0 && { glossary }),
  };

  return {
    frontmatter,
    markdown: matter.stringify(`\n${blocks.join(`\n\n${SECTION_BREAK}\n\n`)}\n`, frontmatter),
  };
}
