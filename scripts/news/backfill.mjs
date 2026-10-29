import fs from 'fs';
import os from 'os';
import path from 'path';
import { addDays, format, isMonday, subDays } from 'date-fns';
import { SOURCES } from './sources.mjs';
import { collectFeeds } from './collect.mjs';
import { dedupeByUrl, normalizeUrl, selectEntries, splitFeatured } from './dedupe.mjs';
import { attachArticleBodies, resolveUrls } from './enrich.mjs';
import { buildPrompt } from './write.mjs';
import { renderArticle } from './render.mjs';
import { resolveArticleImages } from './images.mjs';
import { collectConferences, renderConferences } from './conferences.mjs';

const NEWS_DIR = path.join(process.cwd(), 'content', 'news');
const WORK_DIR = path.join(os.tmpdir(), 'fe-news-backfill');
const MAX_ITEMS = Number(process.env.NEWS_MAX_ITEMS ?? 40);
const MAX_FEATURED = Number(process.env.NEWS_MAX_FEATURED ?? 8);
const MAX_FEATURED_PER_SOURCE = 2;
const WEEK_DAYS = 7;
const URL_PATTERN = /https?:\/\/[^\s)"'<>]+/g;

function parseArgs(argv) {
  const stage = argv.find((arg) => !arg.startsWith('--'));
  const options = Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => {
        const [key, value = 'true'] = arg.slice(2).split('=');
        return [key, value];
      })
  );
  return { stage, options };
}

function resolveWeek(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('--week=YYYY-MM-DD 형식으로 발행일(월요일)을 지정해야 합니다.');
  }
  const until = new Date(`${value}T00:00:00Z`);
  if (!isMonday(until)) throw new Error(`${value}는 월요일이 아닙니다. 주간 글 발행일은 월요일이어야 합니다.`);
  return { until, since: subDays(until, WEEK_DAYS) };
}

function collectPublishedUrls() {
  if (!fs.existsSync(NEWS_DIR)) return new Set();
  const urls = fs
    .readdirSync(NEWS_DIR)
    .filter((name) => name.endsWith('.md'))
    .flatMap((name) => fs.readFileSync(path.join(NEWS_DIR, name), 'utf-8').match(URL_PATTERN) ?? []);
  return new Set(urls.map((url) => normalizeUrl(url.replace(/[.,]$/, ''))));
}

async function loadEntries(cachePath) {
  if (cachePath && fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    console.log(`수집 캐시 사용: ${cached.entries.length}건 (${cachePath})`);
    return cached;
  }

  const { entries, failures } = await collectFeeds(SOURCES);
  console.log(`수집 ${entries.length}건 (실패 소스 ${failures.length}개)`);
  failures.forEach((failure) => console.warn(`  - ${failure.name}: ${failure.reason}`));

  if (cachePath) {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ entries, failures }));
  }
  return { entries, failures };
}

function inWindow(entry, since, until) {
  if (!entry.publishedAt) return false;
  const publishedAt = new Date(entry.publishedAt);
  return publishedAt >= since && publishedAt < until;
}

async function prepare({ week, since, until, cachePath, outPath }) {
  const { entries } = await loadEntries(cachePath);
  const published = collectPublishedUrls();

  const windowed = entries
    .filter((entry) => inWindow(entry, since, until))
    .filter((entry) => entry.url && !published.has(normalizeUrl(entry.url)));
  console.log(`${format(since, 'yyyy-MM-dd')} ~ ${week} 발행분 ${windowed.length}건`);

  const { selected } = selectEntries(windowed, { seen: {}, since, maxItems: MAX_ITEMS });
  const resolved = dedupeByUrl(await resolveUrls(selected)).filter(
    (entry) => !published.has(normalizeUrl(entry.url))
  );
  const split = splitFeatured(resolved, { maxFeatured: MAX_FEATURED, maxPerSource: MAX_FEATURED_PER_SOURCE });
  const featured = await attachArticleBodies(split.featured);
  const conferences = await collectConferences(until);

  const payload = {
    week,
    since: since.toISOString(),
    until: until.toISOString(),
    entries: resolved,
    featured,
    briefs: split.briefs,
    conferenceSection: renderConferences(conferences),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(outPath.replace(/\.json$/, '.prompt.txt'), buildPrompt(featured, split.briefs));

  console.log(`\n주요 소식 ${featured.length}건 / 단신 ${split.briefs.length}건 / 전체 ${resolved.length}건`);
  featured.forEach((entry) =>
    console.log(`- [${entry.category}] ${entry.title} (${entry.source.name}, 본문 ${entry.body.length}자)`)
  );
  console.log(`\n준비 완료: ${outPath}`);
}

async function render({ week, since, until, preparedPath, articlePath }) {
  const payload = JSON.parse(fs.readFileSync(preparedPath, 'utf-8'));
  const draft = JSON.parse(fs.readFileSync(articlePath, 'utf-8'));
  const article = await resolveArticleImages({ glossary: [], ...draft }, payload.featured);

  const { frontmatter, markdown } = renderArticle({
    entries: payload.entries,
    article,
    conferenceSection: payload.conferenceSection,
    since,
    until,
  });

  const filePath = path.join(NEWS_DIR, `${week}-weekly.md`);
  fs.mkdirSync(NEWS_DIR, { recursive: true });
  fs.writeFileSync(filePath, markdown);

  console.log(`작성 완료: content/news/${week}-weekly.md`);
  console.log(`- 제목: ${frontmatter.title}`);
  console.log(`- 기간: ${frontmatter.period} / 소식 ${frontmatter.sourceCount}건 / 용어 ${article.glossary.length}개`);
}

async function main() {
  const { stage, options } = parseArgs(process.argv.slice(2));
  const week = options.week;
  const { since, until } = resolveWeek(week);
  const defaultPrepared = path.join(WORK_DIR, `${week}.json`);

  if (stage === 'prepare') {
    await prepare({
      week,
      since,
      until,
      cachePath: options.cache === 'false' ? null : options.cache ?? path.join(WORK_DIR, 'feeds.json'),
      outPath: options.out ?? defaultPrepared,
    });
    return;
  }

  if (stage === 'render') {
    if (!options.article) throw new Error('--article=<경로>로 작성한 글 JSON을 지정해야 합니다.');
    await render({
      week,
      since,
      until,
      preparedPath: options.prepared ?? defaultPrepared,
      articlePath: options.article,
    });
    return;
  }

  throw new Error('사용법: node scripts/news/backfill.mjs <prepare|render> --week=YYYY-MM-DD');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
