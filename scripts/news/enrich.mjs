import { toPlainText } from './text.mjs';
import { extractImages } from './images.mjs';

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

async function fetchArticle(url) {
  try {
    const response = await fetchPage(url);
    if (!response.ok) return { text: '', images: [] };

    const fullHtml = await response.text();
    const cleanHtml = fullHtml.replace(NOISE_BLOCKS, ' ');
    const contentHtml = pickBlock(cleanHtml, 'article') ?? pickBlock(cleanHtml, 'main') ?? pickBlock(cleanHtml, 'body') ?? '';

    return { text: toPlainText(contentHtml), images: extractImages(fullHtml, contentHtml, response.url || url) };
  } catch {
    return { text: '', images: [] };
  }
}

export async function attachArticleBodies(entries) {
  return Promise.all(
    entries.map(async (entry) => {
      const article = await fetchArticle(entry.url);
      const body = article.text.length > entry.fullText.length ? article.text : entry.fullText;
      return { ...entry, body: body.slice(0, ARTICLE_TEXT_LIMIT), images: article.images };
    })
  );
}
