import { CATEGORIES } from './sources.mjs';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3.5-super-vl:free',
];
const MAX_OUTPUT_TOKENS = 16000;
const RETRY_DELAYS_MS = [20_000, 40_000];
const FOREIGN_SCRIPT = /(?:(?![\p{Script=Hangul}\p{Script=Latin}])\p{L})+/u;

const OUTPUT_FORMAT = `{
  "title": "글 제목",
  "description": "한 문장 요약",
  "intro": "도입 문단 (Markdown)",
  "sections": [
    { "ids": ["대표 id", "함께 묶은 id"], "category": "${CATEGORIES.join(' | ')}", "heading": "소제목", "body": "본문 (Markdown)" }
  ],
  "briefs": [
    { "id": "id", "titleKo": "한국어 제목", "summary": "한 문장" }
  ],
  "outro": "마무리 문단 (Markdown)"
}`;

const SYSTEM_PROMPT = `너는 프론트엔드 기술 블로그를 운영하는 개발자다.
이번 주 프론트엔드 소식을 바탕으로 블로그 글 한 편을 쓴다. 소식을 나열하는 정리가 아니라, 맥락을 짚고 풀어 쓰는 읽을거리여야 한다.
독자는 실무 프론트엔드 개발자다.

언어와 문체
- 한국어(한글)로만 쓴다. 일본어, 한자, 중국어, 러시아어 등 한글과 영어 알파벳이 아닌 문자는 한 글자도 섞지 않는다. 예: "リリース"가 아니라 "릴리스", "公開"가 아니라 "공개", "версия"가 아니라 "버전".
- 영어는 제품명, 버전, API 이름, 코드에만 쓴다.
- 모든 문장은 "~다", "~했다", "~이다"로 끝낸다. "~습니다", "~해요"는 쓰지 않는다.

입력
- [주요 소식]: 각 항목은 "### id | 출처 | 원문 제목" 줄 다음에 원문 본문이 온다.
- [단신]: "id | 출처 | 원문 제목 | 발췌" 한 줄씩.

작성 규칙
- title: 이번 주 가장 궁금해할 만하거나 파장이 큰 주제를 앞세운 글 제목. 40자 안팎. 주차나 "FE News"는 넣지 않는다.
- description: 목록과 검색 결과에 보일 한 문장 요약.
- intro: 이번 주 흐름을 짚는 도입 1~2문단.
- sections: 주요 소식으로 쓰는 본문 섹션. 중요한 순서대로 쓴다.
  - 같은 주제(예: 같은 보안 이슈의 블로그 공지와 여러 버전 릴리스)는 한 섹션으로 묶고 ids에 모두 넣는다. 첫 번째 id가 대표 원문이다.
  - heading: 한국어 소제목. 제품명, 버전, API 이름은 원문 그대로 둔다.
  - body: Markdown 2~4문단. 무엇이 바뀌었는지, 왜 중요한지, 개발자가 지금 무엇을 하면 되는지를 풀어 쓴다. 필요하면 목록, 인라인 코드, 짧은 코드 블록을 쓴다. 제목 기호(#)는 쓰지 않는다.
  - 원문 내용이 빈약하거나 단순 홍보인 주요 소식은 sections 대신 briefs에 넣는다.
- briefs: 짧게 소개할 소식. titleKo(한국어 제목)와 summary(한 문장).
- outro: 이번 주를 정리하고 무엇을 챙기면 좋을지 짚는 마무리 1문단.

금지
- 원문에 없는 사실, 수치, 버전, 날짜를 지어내지 않는다. 확실하지 않으면 쓰지 않는다.
- 링크, URL, 출처 표기를 쓰지 않는다. 출처는 따로 붙인다.
- 입력에 없는 id를 쓰지 않는다.

출력은 아래 형식의 JSON 객체 하나만 보낸다. 설명이나 코드 블록 표시는 붙이지 않는다.
${OUTPUT_FORMAT}`;

const clean = (value) => value.replace(/[|\n]/g, ' ');

function buildPrompt(featured, briefs) {
  const featuredBlock = featured
    .map((entry) => `### ${entry.id} | ${entry.source.name} | ${clean(entry.title)}\n${entry.body}`)
    .join('\n\n');
  const briefBlock = briefs
    .map((entry) => `${entry.id} | ${entry.source.name} | ${clean(entry.title)} | ${clean(entry.excerpt)}`)
    .join('\n');

  return `[주요 소식]\n\n${featuredBlock}\n\n[단신]\n${briefBlock || '(없음)'}`;
}

function parseArticle(text) {
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const article = JSON.parse(json);

  const isString = (value) => typeof value === 'string' && value.trim().length > 0;
  const isValid =
    ['title', 'description', 'intro', 'outro'].every((key) => isString(article[key])) &&
    Array.isArray(article.sections) &&
    article.sections.every((section) => Array.isArray(section.ids) && isString(section.heading) && isString(section.body)) &&
    Array.isArray(article.briefs ?? []);

  if (!isValid) throw new Error(`AI 응답 형식이 올바르지 않습니다: ${json.slice(0, 300)}`);
  return { ...article, briefs: article.briefs ?? [] };
}

function sanitizeArticle(article, knownIds) {
  const usedIds = new Set();
  const takeId = (id) => {
    if (!knownIds.has(id) || usedIds.has(id)) return false;
    usedIds.add(id);
    return true;
  };

  const sections = article.sections
    .map((section) => ({
      ...section,
      category: CATEGORIES.includes(section.category) ? section.category : null,
      ids: section.ids.filter(takeId),
    }))
    .filter((section) => section.ids.length > 0);
  const briefs = article.briefs.filter((brief) => takeId(brief.id));

  return { ...article, sections, briefs };
}

function findForeignScript(article) {
  const text = [
    article.title,
    article.description,
    article.intro,
    article.outro,
    ...article.sections.flatMap((section) => [section.heading, section.body]),
    ...article.briefs.flatMap((brief) => [brief.titleKo, brief.summary]),
  ].join('\n');
  const match = text.match(FOREIGN_SCRIPT);
  if (!match) return null;
  return text.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20).replace(/\s+/g, ' ');
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(status) {
  return status === 429 || status >= 500;
}

async function fetchCompletion(model, prompt, { apiKey, baseUrl }) {
  const url = baseUrl || DEFAULT_BASE_URL;
  const isOpenRouter = url === DEFAULT_BASE_URL;

  return fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Title': 'FE News',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: MAX_OUTPUT_TOKENS,
      ...(isOpenRouter && { reasoning: { effort: 'low' } }),
    }),
  });
}

async function requestArticle(model, prompt, options) {
  let response;
  for (let attempt = 0; ; attempt += 1) {
    response = await fetchCompletion(model, prompt, options);
    if (response.ok || !isRetryable(response.status) || attempt >= RETRY_DELAYS_MS.length) break;

    console.warn(`${model}: ${response.status} 응답, ${RETRY_DELAYS_MS[attempt] / 1000}초 후 다시 시도`);
    await wait(RETRY_DELAYS_MS[attempt]);
  }

  if (!response.ok) {
    throw new Error(`LLM API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content;

  if (!text && choice?.finish_reason === 'length') {
    throw new Error(`출력 한도(${MAX_OUTPUT_TOKENS} 토큰)를 생각하는 데 다 써서 본문이 비었습니다.`);
  }
  if (!text) throw new Error(`응답이 비어 있습니다: ${JSON.stringify(data).slice(0, 300)}`);

  return { article: parseArticle(text), usage: data.usage, model: data.model ?? model };
}

export async function writeArticle(featured, briefs, { apiKey, baseUrl, models }) {
  if (!apiKey) throw new Error('NEWS_LLM_API_KEY가 설정되지 않았습니다.');

  const modelList = models?.length ? models : DEFAULT_MODELS;
  const prompt = buildPrompt(featured, briefs);
  const knownIds = new Set([...featured, ...briefs].map((entry) => entry.id));
  const failures = [];

  for (const model of modelList) {
    try {
      const result = await requestArticle(model, prompt, { apiKey, baseUrl });
      const foreign = findForeignScript(result.article);
      if (foreign) {
        failures.push(`${model}: 한글, 영어 외 문자가 섞임 ("${foreign}")`);
        console.warn(failures.at(-1));
        continue;
      }
      return { ...result, article: sanitizeArticle(result.article, knownIds) };
    } catch (error) {
      failures.push(`${model}: ${error.message}`);
      console.warn(failures.at(-1));
    }
  }

  throw new Error(`모든 모델이 글 작성에 실패했습니다.\n${failures.join('\n')}`);
}
