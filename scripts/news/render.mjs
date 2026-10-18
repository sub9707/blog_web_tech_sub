import matter from 'gray-matter';
import { format } from 'date-fns';

const MAX_MAIN_ITEMS = 10;
const MAX_BOOKMARKS = 8;
const FALLBACK_SUMMARY_LENGTH = 200;
const SECTION_BREAK = '<br/>';

function toFallbackItem(entry) {
  return {
    id: entry.id,
    category: entry.source.category,
    titleKo: entry.title,
    summaryKo: entry.excerpt.slice(0, FALLBACK_SUMMARY_LENGTH),
    importance: entry.source.priority >= 4 ? 3 : 2,
  };
}

function toBookmark(url) {
  return `<bookmark url="${url.replace(/"/g, '%22')}"></bookmark>`;
}

function escapeLinkText(text) {
  return text.replace(/([[\]])/g, '\\$1');
}

function formatPublishedDate(publishedAt) {
  return format(new Date(publishedAt), 'yyyy.MM.dd');
}

function renderCitation(item) {
  const link = `[${escapeLinkText(item.originalTitle)}](${item.url})`;
  return `출처: ${link} · ${item.sourceName} · ${formatPublishedDate(item.publishedAt)}`;
}

function renderSection(item, index, useBookmark) {
  return [
    `## ${index + 1}. ${item.titleKo}`,
    useBookmark && toBookmark(item.url),
    item.summaryKo,
    renderCitation(item),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function renderFallbackTitle(mainItems) {
  const [first] = mainItems;
  if (!first) return '이번 주 프론트엔드 소식';
  return mainItems.length > 1 ? `${first.titleKo} 외 ${mainItems.length - 1}건` : first.titleKo;
}

export function renderDigest({ entries, summary, since, until }) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const items = (summary?.items ?? entries.map(toFallbackItem))
    .map((item) => {
      const entry = entryById.get(item.id);
      return {
        ...item,
        url: entry.url,
        originalTitle: entry.title,
        sourceName: entry.source.name,
        publishedAt: entry.publishedAt,
      };
    })
    .sort((a, b) => b.importance - a.importance);

  const mainItems = items.filter((item) => item.importance >= 2).slice(0, MAX_MAIN_ITEMS);
  const mainIds = new Set(mainItems.map((item) => item.id));
  const minorItems = items.filter((item) => !mainIds.has(item.id));

  const sections = mainItems.map((item, index) => renderSection(item, index, index < MAX_BOOKMARKS));

  if (minorItems.length > 0) {
    const list = minorItems.map(
      (item) =>
        `- [${escapeLinkText(item.titleKo)}](${item.url}) · ${item.sourceName} · ${formatPublishedDate(item.publishedAt)}`
    );
    sections.push(['## 함께 볼 소식', list.join('\n')].join('\n\n'));
  }

  const intro =
    summary?.intro ??
    `${format(since, 'M월 d일')}부터 ${format(until, 'M월 d일')}까지 올라온 프론트엔드 소식 ${items.length}건을 정리했다.`;

  const frontmatter = {
    title: summary?.title ?? renderFallbackTitle(mainItems),
    date: format(until, 'yyyy-MM-dd'),
    period: `${format(since, 'yyyy-MM-dd')} ~ ${format(until, 'yyyy-MM-dd')}`,
    description: summary?.headline ?? mainItems.slice(0, 3).map((item) => item.titleKo).join(', '),
    tags: [...new Set(mainItems.map((item) => item.category))],
    sourceCount: items.length,
  };

  const body = [intro, ...sections].join(`\n\n${SECTION_BREAK}\n\n`);

  return {
    frontmatter,
    markdown: matter.stringify(`\n${body}\n`, frontmatter),
  };
}
