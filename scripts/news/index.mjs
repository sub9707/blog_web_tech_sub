import fs from 'fs';
import os from 'os';
import path from 'path';
import { format } from 'date-fns';
import { SOURCES } from './sources.mjs';
import { collectFeeds } from './collect.mjs';
import { dedupeByUrl, loadState, saveState, selectEntries, splitFeatured } from './dedupe.mjs';
import { attachArticleBodies, resolveUrls } from './enrich.mjs';
import { writeArticle } from './write.mjs';
import { renderArticle } from './render.mjs';
import { collectConferences, renderConferences } from './conferences.mjs';

const NEWS_DIR = path.join(process.cwd(), 'content', 'news');
const STATE_FILE = path.join(NEWS_DIR, '.state', 'seen.json');
const MAX_ITEMS = Number(process.env.NEWS_MAX_ITEMS ?? 40);
const MAX_FEATURED = Number(process.env.NEWS_MAX_FEATURED ?? 8);
const MAX_FEATURED_PER_SOURCE = 2;
const DEFAULT_LOOKBACK_DAYS = 7;

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const isAiDisabled = args.has('--no-ai');

function writeOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

function formatUsage(usage) {
  if (!usage) return '알 수 없음';
  const reasoning = usage.completion_tokens_details?.reasoning_tokens;
  const thoughts = reasoning ? ` / 생각 ${reasoning}` : '';
  return `입력 ${usage.prompt_tokens} / 출력 ${usage.completion_tokens}${thoughts}`;
}

function buildPrBody({ frontmatter, failures, usage, model, fileName }) {
  const lines = [
    'AI가 작성한 FE News 초안입니다. 원문과 대조해 검토하고 수정한 뒤 merge하면 배포됩니다.',
    '',
    `- 파일: \`content/news/${fileName}\``,
    `- 기간: ${frontmatter.period}`,
    `- 소식: ${frontmatter.sourceCount}건`,
  ];
  lines.push(`- 모델: ${model}`, `- 토큰: ${formatUsage(usage)}`);
  if (failures.length > 0) {
    lines.push('', '수집 실패 소스', ...failures.map((f) => `- ${f.name}: ${f.reason}`));
  }
  lines.push(
    '',
    '검토 체크리스트',
    '- [ ] 본문 내용이 원문과 일치하는지 (버전, 날짜, 수치)',
    '- [ ] 제목과 description',
    '- [ ] 어색한 문장, 불필요한 섹션'
  );
  return lines.join('\n');
}

function printSelection(featured, briefs) {
  console.log('\n[주요 소식]');
  featured.forEach((entry) => console.log(`- [${entry.category}] ${entry.title} (${entry.source.name}, 본문 ${entry.body.length}자)`));
  console.log('\n[단신]');
  briefs.forEach((entry) => console.log(`- [${entry.category}] ${entry.title} (${entry.source.name})`));
}

async function main() {
  const now = new Date();
  const state = loadState(STATE_FILE);
  const since = state.lastRunAt
    ? new Date(state.lastRunAt)
    : new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [{ entries, failures }, conferences] = await Promise.all([collectFeeds(SOURCES), collectConferences(now)]);
  const { selected, seenIds } = selectEntries(entries, { seen: state.seen, since, maxItems: MAX_ITEMS });

  console.log(`수집 ${entries.length}건 → 선별 ${selected.length}건 (실패 소스 ${failures.length}개)`);
  failures.forEach((f) => console.warn(`  - ${f.name}: ${f.reason}`));

  if (selected.length === 0) {
    if (!isDryRun) saveState(STATE_FILE, state, seenIds, now);
    writeOutput({ has_news: 'false' });
    return;
  }

  const resolved = dedupeByUrl(await resolveUrls(selected));
  const split = splitFeatured(resolved, { maxFeatured: MAX_FEATURED, maxPerSource: MAX_FEATURED_PER_SOURCE });
  const featured = await attachArticleBodies(split.featured);
  const { briefs } = split;

  if (isAiDisabled) {
    printSelection(featured, briefs);
    console.log(`
${renderConferences(conferences) ?? '다가오는 컨퍼런스 없음'}`);
    return;
  }

  const { article, usage, model } = await writeArticle(featured, briefs, {
    apiKey: process.env.NEWS_LLM_API_KEY,
    baseUrl: process.env.NEWS_LLM_BASE_URL,
    models: process.env.NEWS_LLM_MODELS?.split(',').map((name) => name.trim()).filter(Boolean),
  });
  console.log(`모델: ${model}, 토큰 사용: ${formatUsage(usage)}`);

  const { frontmatter, markdown } = renderArticle({
    entries: resolved,
    article,
    conferenceSection: renderConferences(conferences),
    since,
    until: now,
  });
  const fileName = `${format(now, 'yyyy-MM-dd')}-weekly.md`;

  if (isDryRun) {
    console.log(markdown);
    return;
  }

  fs.mkdirSync(NEWS_DIR, { recursive: true });
  fs.writeFileSync(path.join(NEWS_DIR, fileName), markdown);
  saveState(STATE_FILE, state, seenIds, now);

  const prBodyPath = path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), 'news-pr-body.md');
  fs.writeFileSync(prBodyPath, buildPrBody({ frontmatter, failures, usage, model, fileName }));

  console.log(`작성 완료: content/news/${fileName}`);
  writeOutput({ has_news: 'true', title: frontmatter.title, body_path: prBodyPath });
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
