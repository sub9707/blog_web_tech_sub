const FETCH_TIMEOUT_MS = 8_000;
const MAX_CONTENT_IMAGES = 3;
const MIN_IMAGE_SIDE = 200;
const SKIP_IMAGE = /^data:|\.svg(\?|$)|avatar|gravatar|logo|icon|emoji|badge|sprite|pixel|tracking|spacer|favicon/i;
const META_IMAGE =
  /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i;

function readAttribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, 'i'))?.[1];
}

function toAbsoluteUrl(value, baseUrl) {
  try {
    return new URL(value.replace(/&amp;/g, '&'), baseUrl).toString();
  } catch {
    return null;
  }
}

function isTooSmall(tag) {
  const width = Number(readAttribute(tag, 'width'));
  const height = Number(readAttribute(tag, 'height'));
  return (width > 0 && width < MIN_IMAGE_SIDE) || (height > 0 && height < MIN_IMAGE_SIDE);
}

export function extractImages(fullHtml, contentHtml, pageUrl) {
  const contentImages = [...contentHtml.matchAll(/<img\b[^>]*>/gi)]
    .map(([tag]) => {
      const source = readAttribute(tag, 'src') ?? readAttribute(tag, 'data-src');
      if (!source || SKIP_IMAGE.test(source) || isTooSmall(tag)) return null;
      const url = toAbsoluteUrl(source, pageUrl);
      return url && { url, alt: readAttribute(tag, 'alt') ?? '', sourceUrl: pageUrl };
    })
    .filter(Boolean)
    .slice(0, MAX_CONTENT_IMAGES);

  const metaMatch = fullHtml.match(META_IMAGE);
  const ogUrl = metaMatch && toAbsoluteUrl(metaMatch[1] ?? metaMatch[2], pageUrl);
  const ogImage = ogUrl && !SKIP_IMAGE.test(ogUrl) ? { url: ogUrl, alt: '', sourceUrl: pageUrl } : null;

  const unique = new Map([...contentImages, ...(ogImage ? [ogImage] : [])].map((image) => [image.url, image]));
  return [...unique.values()];
}

async function requestImage(url, method) {
  return fetch(url, {
    method,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FENewsBot/1.0)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

const validity = new Map();

export async function isLoadableImage(url) {
  if (!url || !/^https:\/\//.test(url)) return false;
  if (validity.has(url)) return validity.get(url);

  let isValid = false;
  try {
    let response = await requestImage(url, 'HEAD');
    if (!response.ok) response = await requestImage(url, 'GET');
    isValid = response.ok && (response.headers.get('content-type') ?? '').startsWith('image/');
    response.body?.cancel?.();
  } catch {
    isValid = false;
  }

  validity.set(url, isValid);
  return isValid;
}

export async function pickLoadableImage(candidates, usedUrls = new Set()) {
  for (const candidate of candidates) {
    if (!candidate || usedUrls.has(candidate.url)) continue;
    if (await isLoadableImage(candidate.url)) return candidate;
  }
  return null;
}

export async function resolveArticleImages(article, entries) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const usedUrls = new Set();
  const sections = [];

  for (const section of article.sections) {
    const sourceImages = section.ids.flatMap((id) => entryById.get(id)?.images ?? []);
    const image = await pickLoadableImage([section.image, ...sourceImages], usedUrls);
    if (image) usedUrls.add(image.url);
    sections.push({ ...section, image: image ?? undefined });
  }

  const glossary = await Promise.all(
    article.glossary.map(async (entry) => ({
      ...entry,
      image: entry.image && (await isLoadableImage(entry.image.url)) ? entry.image : undefined,
    }))
  );

  return { ...article, sections, glossary };
}
