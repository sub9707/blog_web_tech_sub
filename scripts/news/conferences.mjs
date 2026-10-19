import { addDays, format } from 'date-fns';

const DATA_URL = 'https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences';
const TOPICS = ['javascript', 'css', 'ux'];
const LOOKAHEAD_DAYS = 60;
const MAX_CONFERENCES = 12;
const FETCH_TIMEOUT_MS = 10_000;

async function fetchTopic(year, topic) {
  const response = await fetch(`${DATA_URL}/${year}/${topic}.json`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function collectConferences(now) {
  const until = addDays(now, LOOKAHEAD_DAYS);
  const years = [...new Set([now.getFullYear(), until.getFullYear()])];
  const requests = years.flatMap((year) => TOPICS.map((topic) => fetchTopic(year, topic)));
  const results = await Promise.allSettled(requests);

  const today = format(now, 'yyyy-MM-dd');
  const lastDay = format(until, 'yyyy-MM-dd');
  const byKey = new Map();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const conference of result.value) {
      if (conference.startDate < today || conference.startDate > lastDay) continue;
      byKey.set(`${conference.name}-${conference.startDate}`, conference);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, MAX_CONFERENCES);
}

function formatPeriod({ startDate, endDate }) {
  const start = format(new Date(startDate), 'M월 d일');
  if (!endDate || endDate === startDate) return start;
  return `${start} ~ ${format(new Date(endDate), 'M월 d일')}`;
}

function formatPlace({ city, country, online }) {
  const place = [city, country].filter(Boolean).join(', ');
  if (!place) return online ? '온라인' : '-';
  return online ? `${place} (온라인 병행)` : place;
}

export function renderConferences(conferences) {
  if (conferences.length === 0) return null;

  const rows = conferences.map(
    (conference) =>
      `| ${formatPeriod(conference)} | [${conference.name.replace(/\|/g, '/')}](${conference.url}) | ${formatPlace(conference)} |`
  );

  return [
    '## 다가오는 프론트엔드 컨퍼런스',
    `앞으로 ${LOOKAHEAD_DAYS}일 안에 열리는 JavaScript, CSS, UX 컨퍼런스다.`,
    ['| 일정 | 컨퍼런스 | 장소 |', '|---|---|---|', ...rows].join('\n'),
    '출처: [confs.tech](https://confs.tech) (tech-conferences/conference-data)',
  ].join('\n\n');
}
