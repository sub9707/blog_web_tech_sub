export const CATEGORIES = [
  'Next.js',
  'React',
  'JavaScript',
  'TypeScript',
  'CSS',
  'HTML',
  'Browser',
  'Runtime',
  'Framework',
  'Tooling',
  'Event',
];

const feed = (name, url, category, priority, options = {}) => ({ name, url, category, priority, ...options });
const newsletter = (name, url, category) => feed(name, url, category, 3, { isNewsletter: true });

export const SOURCES = [
  feed('Next.js Blog', 'https://nextjs.org/feed.xml', 'Next.js', 5),
  feed('Next.js Releases', 'https://github.com/vercel/next.js/releases.atom', 'Next.js', 4, { isRelease: true }),
  feed('Vercel Changelog', 'https://vercel.com/changelog/rss.xml', 'Next.js', 2, { requiresKeyword: true }),
  feed('React Blog', 'https://react.dev/rss.xml', 'React', 5),
  feed('React Releases', 'https://github.com/facebook/react/releases.atom', 'React', 4, { isRelease: true }),
  feed('TypeScript Blog', 'https://devblogs.microsoft.com/typescript/feed/', 'TypeScript', 4),
  feed('Total TypeScript', 'https://www.totaltypescript.com/rss.xml', 'TypeScript', 2),
  feed('V8 Blog', 'https://v8.dev/blog.atom', 'JavaScript', 3),
  feed('Node.js Blog', 'https://nodejs.org/en/feed/blog.xml', 'Runtime', 3),
  feed('Deno Blog', 'https://deno.com/feed', 'Runtime', 3),
  feed('Bun Blog', 'https://bun.sh/rss.xml', 'Runtime', 3),
  feed('web.dev', 'https://web.dev/static/blog/feed.xml', 'Browser', 4),
  feed('WebKit Blog', 'https://webkit.org/feed/', 'Browser', 4),
  feed('MDN Blog', 'https://developer.mozilla.org/en-US/blog/rss.xml', 'HTML', 4),
  feed('CSS-Tricks', 'https://css-tricks.com/feed/', 'CSS', 3),
  feed('Tailwind CSS Blog', 'https://tailwindcss.com/feeds/feed.xml', 'CSS', 3),
  feed('Smashing Magazine', 'https://www.smashingmagazine.com/feed/', 'CSS', 2, { requiresKeyword: true }),
  feed('Vue Blog', 'https://blog.vuejs.org/feed.rss', 'Framework', 4),
  feed('Svelte Blog', 'https://svelte.dev/blog/rss.xml', 'Framework', 3),
  feed('Angular Blog', 'https://blog.angular.dev/feed', 'Framework', 3),
  feed('Astro Blog', 'https://astro.build/rss.xml', 'Framework', 3),
  feed('Remix Blog', 'https://remix.run/blog/rss.xml', 'Framework', 3),
  feed('Vite Blog', 'https://vite.dev/blog.rss', 'Tooling', 4),
  feed('Storybook Blog', 'https://storybook.js.org/blog/rss/', 'Tooling', 2),
  newsletter('JavaScript Weekly', 'https://cprss.s3.amazonaws.com/javascriptweekly.com.xml', 'JavaScript'),
  newsletter('Frontend Focus', 'https://cprss.s3.amazonaws.com/frontendfoc.us.xml', 'Browser'),
  newsletter('React Status', 'https://cprss.s3.amazonaws.com/react.statuscode.com.xml', 'React'),
  newsletter('Node Weekly', 'https://cprss.s3.amazonaws.com/nodeweekly.com.xml', 'Runtime'),
];

const CATEGORY_KEYWORDS = [
  ['Event', /conf\b|conference|summit|meetup|keynote|talks\b/i],
  ['Next.js', /next\.?js|turbopack|vercel/i],
  ['React', /react|jsx|redux|tanstack/i],
  ['TypeScript', /typescript|\btsc\b/i],
  ['CSS', /\bcss\b|tailwind|style quer|container quer|animation|font/i],
  ['HTML', /\bhtml\b|accessib|a11y|aria|semantic/i],
  ['Browser', /browser|chrome|firefox|safari|webkit|interop|baseline|web platform|jpeg xl|webp/i],
  ['Runtime', /node\.?js|\bnode\b|\bbun\b|\bdeno\b|cloudflare workers|lambda/i],
  ['Framework', /\bvue\b|nuxt|svelte|angular|astro|remix|solid|qwik/i],
  ['Tooling', /\bvite\b|webpack|rolldown|eslint|biome|vitest|playwright|storybook|\bcli\b/i],
];

export function inferCategory(text, fallback) {
  return CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? fallback;
}

export const RELEVANCE_KEYWORDS = [
  'next.js',
  'nextjs',
  'react',
  'javascript',
  'typescript',
  'node',
  'turbopack',
  'webpack',
  'vite',
  'css',
  'html',
  'browser',
  'baseline',
  'server component',
  'app router',
  'hydration',
  'performance',
  'core web vitals',
  'framework',
  'frontend',
];

export const IMPACT_KEYWORDS = ['security', 'vulnerab', 'release', 'stable', 'breaking', 'deprecat', '1.0', 'launch'];
