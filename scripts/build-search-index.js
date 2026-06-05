const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const CONTENT_DIR = path.join(process.cwd(), 'content', 'posting');
const OUTPUT = path.join(process.cwd(), 'public', 'search-index.json');

function slugify(text) {
  return text
    .trim()
    .replace(/[?#&=+/\\%<>'"]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}


if (!fs.existsSync(CONTENT_DIR)) {
  console.warn('content/posting not found, skipping search index build');
  process.exit(0);
}

function build() {
  const categories = fs
    .readdirSync(CONTENT_DIR)
    .filter((item) => fs.statSync(path.join(CONTENT_DIR, item)).isDirectory());

  const index = [];

  for (const category of categories) {
    const dir = path.join(CONTENT_DIR, category);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const source = fs.readFileSync(path.join(dir, file), 'utf-8');
      const { data } = matter(source);
      const title = data.title ?? file.replace(/\.md$/, '');

      index.push({
        slug: slugify(title),
        category,
        title,
        date: data.date ?? '',
        description: data.description ?? '',
        tags: data.tags ?? [],
      });
    }
  }

  index.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  fs.writeFileSync(OUTPUT, JSON.stringify(index));
  console.log(`[search-index] ${index.length} posts → public/search-index.json`);
}

build();

if (process.argv.includes('--watch')) {
  let debounceTimer = null;
  fs.watch(CONTENT_DIR, { recursive: true }, (_, filename) => {
    if (!filename?.endsWith('.md')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[search-index] changed: ${filename}`);
      build();
    }, 300);
  });
  console.log('[search-index] watching content/posting...');
}
