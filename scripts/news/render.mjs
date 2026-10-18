import matter from 'gray-matter';
import { format, getWeekOfMonth } from 'date-fns';
import { CATEGORIES } from './sources.mjs';

const MAX_BOOKMARKS = 8;
const FALLBACK_SUMMARY_LENGTH = 160;

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

function renderMainItem(item, useBookmark) {
  const link = useBookmark ? toBookmark(item.url) : `[원문 · ${item.sourceName}](${item.url})`;
  return [`### ${item.titleKo}`, item.summaryKo, link].filter(Boolean).join('\n\n');
}

export function renderDigest({ entries, summary, since, until }) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const items = (summary?.items ?? entries.map(toFallbackItem))
    .map((item) => {
      const entry = entryById.get(item.id);
      return { ...item, url: entry.url, sourceName: entry.source.name };
    })
    .sort((a, b) => b.importance - a.importance);

  const mainItems = items.filter((item) => item.importance >= 2);
  const minorItems = items.filter((item) => item.importance < 2);
  const bookmarkIds = new Set(mainItems.slice(0, MAX_BOOKMARKS).map((item) => item.id));

  const sections = CATEGORIES.map((category) => {
    const categoryItems = mainItems.filter((item) => item.category === category);
    if (categoryItems.length === 0) return null;
    const body = categoryItems.map((item) => renderMainItem(item, bookmarkIds.has(item.id)));
    return [`## ${category}`, ...body].join('\n\n');
  }).filter(Boolean);

  if (minorItems.length > 0) {
    const list = minorItems.map((item) => `- [${item.titleKo}](${item.url}) · ${item.sourceName}`);
    sections.push(['## 기타 소식', list.join('\n')].join('\n\n'));
  }

  const tags = [...new Set(mainItems.map((item) => item.category))];
  const description =
    summary?.headline ?? mainItems.slice(0, 3).map((item) => item.titleKo).join(', ');

  const frontmatter = {
    title: `FE News ${format(until, 'yyyy년 M월')} ${getWeekOfMonth(until, { weekStartsOn: 1 })}주차`,
    date: format(until, 'yyyy-MM-dd'),
    period: `${format(since, 'yyyy-MM-dd')} ~ ${format(until, 'yyyy-MM-dd')}`,
    description,
    tags,
    sourceCount: items.length,
  };

  return {
    frontmatter,
    markdown: matter.stringify(`\n${sections.join('\n\n')}\n`, frontmatter),
  };
}
