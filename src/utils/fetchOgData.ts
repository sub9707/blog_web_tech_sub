export interface OgData {
  title: string
  description: string
  image: string | null
  url: string
  siteName: string | null
  favicon: string | null
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function fetchOgData(url: string): Promise<OgData> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)' },
      next: { revalidate: 86400 },
    })
    const html = await res.text()

    const title =
      extractMeta(html, 'og:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      url

    const description =
      extractMeta(html, 'og:description') ||
      extractMeta(html, 'description') ||
      ''

    const image = extractMeta(html, 'og:image')
    const siteName = extractMeta(html, 'og:site_name')

    const urlObj = new URL(url)
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
    const faviconPath = faviconMatch?.[1]
    const favicon = faviconPath
      ? faviconPath.startsWith('http') ? faviconPath : `${urlObj.origin}${faviconPath}`
      : `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`

    return {
      title: title.trim(),
      description: description.trim(),
      image,
      url,
      siteName,
      favicon,
    }
  } catch {
    return { title: url, description: '', image: null, url, siteName: null, favicon: null }
  }
}
