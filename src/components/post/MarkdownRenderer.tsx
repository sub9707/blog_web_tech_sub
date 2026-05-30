import parse, { type HTMLReactParserOptions, type DOMNode, Element } from 'html-react-parser'
import { processMarkdown } from '@/lib/processMarkdown'
import InteractiveDemo from './InteractiveDemo'

interface Props {
  content: string
}

const parserOptions: HTMLReactParserOptions = {
  replace(domNode: DOMNode) {
    if (domNode instanceof Element && domNode.name === 'interactive-demo') {
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
  },
}

export default async function MarkdownRenderer({ content }: Props) {
  const html = await processMarkdown(content)

  return (
    <div className="prose">
      {parse(html, parserOptions)}
    </div>
  )
}
