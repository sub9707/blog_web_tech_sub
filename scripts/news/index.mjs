import fs from 'fs';
import os from 'os';
import path from 'path';
import { format } from 'date-fns';
import { SOURCES } from './sources.mjs';
import { collectFeeds } from './collect.mjs';
import { loadState, saveState, selectEntries } from './dedupe.mjs';
import { summarizeEntries } from './summarize.mjs';
import { renderDigest } from './render.mjs';

const NEWS_DIR = path.join(process.cwd(), 'content', 'news');
const STATE_FILE = path.join(NEWS_DIR, '.state', 'seen.json');
const MAX_ITEMS = Number(process.env.NEWS_MAX_ITEMS ?? 25);
const DEFAULT_LOOKBACK_DAYS = 7;

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const isAiDisabled = args.has('--no-ai');

function writeOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

function buildPrBody({ frontmatter, failures, aiError, usage, fileName }) {
  const lines = [
    `자동 수집된 FE News 초안입니다. 내용을 검토하고 수정한 뒤 merge하면 배포됩니다.`,
    '',
    `- 파일: \`content/news/${fileName}\``,
    `- 기간: ${frontmatter.period}`,
    `- 소식: ${frontmatter.sourceCount}건`,
  ];
  if (usage) lines.push(`- 토큰: 입력 ${usage.promptTokenCount} / 출력 ${usage.candidatesTokenCount}`);
  if (aiError) lines.push('', `> [!WARNING]`, `> AI 요약 없이 원문 발췌로 작성되었습니다. ${aiError}`);
  if (failures.length > 0) {
    lines.push('', '수집 실패 소스', ...failures.map((f) => `- ${f.name}: ${f.reason}`));
  }
  lines.push('', '검토 체크리스트', '- [ ] 요약이 원문과 일치하는지', '- [ ] 제목과 description', '- [ ] 불필요한 항목 삭제');
  return lines.join('\n');
}

async function main() {
  const now = new Date();
  const state = loadState(STATE_FILE);
  const since = state.lastRunAt
    ? new Date(state.lastRunAt)
    : new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const { entries, failures } = await collectFeeds(SOURCES);
  const { selected, seenIds } = selectEntries(entries, { seen: state.seen, since, maxItems: MAX_ITEMS });

  console.log(`수집 ${entries.length}건 → 선별 ${selected.length}건 (실패 소스 ${failures.length}개)`);
  failures.forEach((f) => console.warn(`  - ${f.name}: ${f.reason}`));

  if (selected.length === 0) {
    if (!isDryRun) saveState(STATE_FILE, state, seenIds, now);
    writeOutput({ has_news: 'false' });
    return;
  }

  const { result: summary, usage, error: aiError } = isAiDisabled
    ? { result: null, error: '--no-ai 옵션으로 AI 요약을 건너뛰었습니다.' }
    : await summarizeEntries(selected, {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.NEWS_GEMINI_MODEL,
      });

  if (aiError) console.warn(aiError);
  if (usage) console.log(`토큰 사용: 입력 ${usage.promptTokenCount}, 출력 ${usage.candidatesTokenCount}`);

  const { frontmatter, markdown } = renderDigest({ entries: selected, summary, since, until: now });
  const fileName = `${format(now, 'yyyy-MM-dd')}-weekly.md`;

  if (isDryRun) {
    console.log(markdown);
    return;
  }

  fs.mkdirSync(NEWS_DIR, { recursive: true });
  fs.writeFileSync(path.join(NEWS_DIR, fileName), markdown);
  saveState(STATE_FILE, state, seenIds, now);

  const prBodyPath = path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), 'news-pr-body.md');
  fs.writeFileSync(prBodyPath, buildPrBody({ frontmatter, failures, aiError, usage, fileName }));

  console.log(`작성 완료: content/news/${fileName}`);
  writeOutput({ has_news: 'true', title: frontmatter.title, body_path: prBodyPath });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
