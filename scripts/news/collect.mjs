import Parser from 'rss-parser';
import { inferCategory } from './sources.mjs';
import { toPlainText } from './text.mjs';

const FETCH_TIMEOUT_MS = 10_000;
const EXCERPT_LENGTH = 200;
const STORY_LINK = /<a href="([^"]+)"[^>]*\btitle="([^"]+)"[^>]*>([\s\S]*?)<\/a>/;
const SPONSOR_LABEL = />\s*sponsor\s*<\/span>/i;

const parser = new Parser();

async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FENewsBot/1.0)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parser.parseString(await response.text());
}

function getItemHtml(item) {
  return item['content:encoded'] ?? item.content ?? item.summary ?? '';
}

function toEntry(item, source) {
  const fullText = toPlainText(getItemHtml(item));
  const title = item.title?.trim() ?? '';

  return {
    url: item.link,
    title,
    publishedAt: item.isoDate ?? item.pubDate ?? null,
    excerpt: (item.contentSnippet ? toPlainText(item.contentSnippet) : fullText).slice(0, EXCERPT_LENGTH),
    fullText,
    category: source.category,
    source,
  };
}

function toNewsletterStory(block, item, source) {
  const match = block.match(STORY_LINK);
  if (!match) return null;

  const rest = block.slice(match.index + match[0].length);
  const paragraphEnd = rest.search(/<\/p>/i);
  const description = toPlainText(paragraphEnd >= 0 ? rest.slice(0, paragraphEnd) : rest).replace(/^[—–-]\s*/, '');
  const title = toPlainText(match[3]);

  return {
    url: match[1],
    title,
    publishedAt: item.isoDate ?? item.pubDate ?? null,
    excerpt: description.slice(0, EXCERPT_LENGTH),
    fullText: description,
    category: inferCategory(title, source.category),
    source,
  };
}

function toNewsletterStories(item, source) {
  return getItemHtml(item)
    .split(/<\/table>/i)
    .filter((block) => !SPONSOR_LABEL.test(block))
    .map((block) => toNewsletterStory(block, item, source))
    .filter((story) => story && story.title.length > 3);
}

function toEntries(feedResult, source) {
  if (source.isNewsletter) return feedResult.items.flatMap((item) => toNewsletterStories(item, source));

  return feedResult.items.map((item) => toEntry(item, source));
}

export async function collectFeeds(sources) {
  const results = await Promise.allSettled(sources.map((source) => fetchFeed(source.url)));

  const entries = [];
  const failures = [];

  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'rejected') {
      failures.push({ name: source.name, reason: result.reason?.message ?? String(result.reason) });
      return;
    }
    entries.push(...toEntries(result.value, source));
  });

  return { entries, failures };
}
