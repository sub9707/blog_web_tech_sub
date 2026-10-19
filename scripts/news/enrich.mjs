import { toPlainText } from './text.mjs';

const FETCH_TIMEOUT_MS = 10_000;
const ARTICLE_TEXT_LIMIT = 6000;
const NOISE_BLOCKS = /<(script|style|noscript|svg|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi;

function pickBlock(html, tag) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)</${tag}>`, 'i'))?.[1];
}

async function fetchArticleText(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FENewsBot/1.0)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return '';

    const html = (await response.text()).replace(NOISE_BLOCKS, ' ');
    return toPlainText(pickBlock(html, 'article') ?? pickBlock(html, 'main') ?? pickBlock(html, 'body') ?? '');
  } catch {
    return '';
  }
}

export async function enrichEntries(entries) {
  return Promise.all(
    entries.map(async (entry) => {
      const pageText = await fetchArticleText(entry.url);
      const body = pageText.length > entry.fullText.length ? pageText : entry.fullText;
      return { ...entry, body: body.slice(0, ARTICLE_TEXT_LIMIT) };
    })
  );
}
