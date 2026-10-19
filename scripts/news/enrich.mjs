import { toPlainText } from './text.mjs';

const FETCH_TIMEOUT_MS = 10_000;
const ARTICLE_TEXT_LIMIT = 6000;
const NOISE_BLOCKS = /<(script|style|noscript|svg|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi;
const REQUEST_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; FENewsBot/1.0)' };

function pickBlock(html, tag) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)</${tag}>`, 'i'))?.[1];
}

async function fetchPage(url, method = 'GET') {
  return fetch(url, { method, headers: REQUEST_HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

async function resolveUrl(entry) {
  if (!entry.source.isNewsletter) return entry;
  try {
    const response = await fetchPage(entry.url, 'HEAD');
    return { ...entry, url: response.url || entry.url };
  } catch {
    return entry;
  }
}

export async function resolveUrls(entries) {
  return Promise.all(entries.map(resolveUrl));
}

async function fetchArticleText(url) {
  try {
    const response = await fetchPage(url);
    if (!response.ok) return '';

    const html = (await response.text()).replace(NOISE_BLOCKS, ' ');
    return toPlainText(pickBlock(html, 'article') ?? pickBlock(html, 'main') ?? pickBlock(html, 'body') ?? '');
  } catch {
    return '';
  }
}

export async function attachArticleBodies(entries) {
  return Promise.all(
    entries.map(async (entry) => {
      const pageText = await fetchArticleText(entry.url);
      const body = pageText.length > entry.fullText.length ? pageText : entry.fullText;
      return { ...entry, body: body.slice(0, ARTICLE_TEXT_LIMIT) };
    })
  );
}
