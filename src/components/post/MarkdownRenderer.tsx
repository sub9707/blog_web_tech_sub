import parse, { type HTMLReactParserOptions, type DOMNode, Element } from 'html-react-parser'
import { processMarkdown } from '@/lib/processMarkdown'
import InteractiveDemo from './InteractiveDemo'
import BookmarkCard from './BookmarkCard'
import { fetchOgData, type OgData } from '@/utils/fetchOgData'

interface Props {
  content: string
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
}

function extractBookmarkUrls(html: string): string[] {
  const matches = [...html.matchAll(/<bookmark[^>]+url=["']([^"']+)["']/g)]
  return [...new Set(matches.map((m) => decodeHtmlEntities(m[1])))]
}

export default async function MarkdownRenderer({ content }: Props) {
  const html = await processMarkdown(content)

  const bookmarkUrls = extractBookmarkUrls(html)
  const ogEntries = await Promise.all(
    bookmarkUrls.map(async (url) => [url, await fetchOgData(url)] as [string, OgData]),
  )
  const ogDataMap = Object.fromEntries(ogEntries)

  const parserOptions: HTMLReactParserOptions = {
    replace(domNode: DOMNode) {
      if (!(domNode instanceof Element)) return

      if (domNode.name === 'interactive-demo') {
        const { src, title, height, caption } = domNode.attribs
        if (!src) return
        return (
          <InteractiveDemo
            src={src}
            title={title ?? 'Interactive Demo'}
            height={height ? Number(height) : undefined}
            caption={caption}
          />
        )
      }

      if (domNode.name === 'bookmark') {
        const { url } = domNode.attribs
        if (!url) return
        const ogData: OgData = ogDataMap[url] ?? {
          title: url,
          description: '',
          image: null,
          url,
          siteName: null,
          favicon: null,
        }
        return <BookmarkCard url={url} ogData={ogData} />
      }
    },
  }

  return (
    <div className="prose">
      {parse(html, parserOptions)}
    </div>
  )
}
