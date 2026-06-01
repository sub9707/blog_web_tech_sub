import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import type { Options } from 'rehype-pretty-code';
import { visit } from 'unist-util-visit';
import type { Root, Element, Parent } from 'hast';

const BLOCK_CUSTOM_ELEMENTS = ['interactive-demo', 'bookmark'];

function rehypeUnwrapCustomBlocks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'p' || !parent || index === undefined) return;
      const hasBlock = node.children.some(
        (child) => child.type === 'element' && BLOCK_CUSTOM_ELEMENTS.includes((child as Element).tagName),
      );
      if (!hasBlock) return;
      (parent as Parent).children.splice(index, 1, ...node.children);
    });
  };
}

const prettyCodeOptions: Options = {
  theme: 'github-light',
  keepBackground: false,
};

export async function processMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeUnwrapCustomBlocks)
    .use(rehypeSlug)
    .use(rehypePrettyCode, prettyCodeOptions)
    .use(rehypeStringify)
    .process(content);

  return result.toString();
}
