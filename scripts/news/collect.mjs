import Parser from 'rss-parser';
import { toPlainText } from './text.mjs';

const FETCH_TIMEOUT_MS = 10_000;
const EXCERPT_LENGTH = 200;

const parser = new Parser();

async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FENewsBot/1.0)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parser.parseString(await response.text());
}

function toEntry(item, source) {
  const fullText = toPlainText(item['content:encoded'] ?? item.content ?? item.summary ?? '');

  return {
    url: item.link,
    title: item.title?.trim() ?? '',
    publishedAt: item.isoDate ?? item.pubDate ?? null,
    excerpt: (item.contentSnippet ? toPlainText(item.contentSnippet) : fullText).slice(0, EXCERPT_LENGTH),
    fullText,
    source,
  };
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
    entries.push(...result.value.items.map((item) => toEntry(item, source)));
  });

  return { entries, failures };
}
