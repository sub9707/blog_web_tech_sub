import { CATEGORIES } from './sources.mjs';
import { requestWithClaudeCode } from './claude-code.mjs';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODELS = {
  'claude-code': ['sonnet', 'haiku'],
  openai: [
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3.5-super-vl:free',
  ],
};
const MAX_OUTPUT_TOKENS = 16000;
const RETRY_DELAYS_MS = [20_000, 40_000];
const FOREIGN_SCRIPT = /(?:(?![\p{Script=Hangul}\p{Script=Latin}])\p{L})+/u;

const OUTPUT_FORMAT = `{
  "title": "글 제목",
  "description": "한 문장 요약",
  "intro": "도입 문단 (Markdown)",
  "sections": [
    {
      "ids": ["대표 id", "함께 묶은 id"],
      "category": "${CATEGORIES.join(' | ')}",
      "heading": "소제목",
      "body": "본문 (Markdown)",
      "image": { "url": "이미지 파일 주소", "alt": "이미지 설명", "sourceUrl": "이미지가 실린 페이지 주소" }
    }
  ],
  "briefs": [
    { "id": "id", "category": "분류", "titleKo": "한국어 제목", "summary": "한두 문장" }
  ],
  "glossary": [
    {
      "id": "영문 소문자와 하이픈으로 된 고유 id",
      "match": "본문에 실제로 쓴 문구 그대로",
      "term": "모달 제목으로 보일 용어",
      "description": "쉬운 설명",
      "image": { "url": "이미지 파일 주소", "alt": "이미지 설명", "sourceUrl": "이미지가 실린 페이지 주소" }
    }
  ],
  "outro": "마무리 문단 (Markdown)"
}
image는 쓸 만한 이미지가 없으면 생략한다.`;

const IMAGE_SEARCH_RULE = `- 이미지 후보가 없거나 맞지 않으면 웹 검색 도구로 직접 찾는다. 공식 문서, 공식 블로그, GitHub 저장소, MDN, Wikimedia Commons 같은 신뢰할 수 있는 곳의 이미지를 고르고, url에는 이미지 파일 자체의 주소를, sourceUrl에는 그 이미지가 실린 페이지 주소를 넣는다. 찾지 못하면 image를 생략한다.`;

const NO_IMAGE_SEARCH_RULE = `- 이미지 후보 중에서만 고른다. 후보가 없으면 image를 생략한다.`;

function buildSystemPrompt({ canSearchImages }) {
  return `너는 프론트엔드 기술 블로그를 운영하는 개발자다.
이번 주 프론트엔드 소식을 바탕으로 블로그 글 한 편을 쓴다. 소식을 나열하는 정리가 아니라, 맥락을 짚고 풀어 쓰는 읽을거리여야 한다.

독자
- 독자는 프론트엔드를 공부하는 입문자부터 실무 1~3년 차 주니어 개발자다. 이 독자 설정은 글을 쓰는 기준일 뿐이니, 글 안에서 "주니어", "입문자", "초보" 같은 말로 독자를 부르거나 언급하지 않는다.
- 배경 지식을 가정하지 않는다. 소식마다 "이게 원래 무엇이고, 왜 이런 변화가 생겼는지"를 한두 문장으로 먼저 짚고 나서 바뀐 점을 설명한다.
- 기술적인 동작 원리는 비유나 짧은 예시로 풀어 쓴다. 필요하면 짧은 코드 예시를 넣는다.

언어와 문체
- 한국어(한글)로만 쓴다. 일본어, 한자, 중국어, 러시아어 등 한글과 영어 알파벳이 아닌 문자는 한 글자도 섞지 않는다. 예: "リリース"가 아니라 "릴리스", "公開"가 아니라 "공개", "версия"가 아니라 "버전".
- 영어는 제품명, 버전, API 이름, 코드에만 쓴다.
- HTML 태그(<template>, <slot>), 처리 지시(<?marker>), 컴포넌트 이름(<Suspense>)처럼 꺾쇠괄호가 들어가는 표기는 소제목, 본문, 단신 어디서든 반드시 백틱으로 감싼다. 예: \`<template>\`
- 모든 문장은 "~다", "~했다", "~이다"로 끝낸다. "~습니다", "~해요"는 쓰지 않는다.

입력
- [주요 소식]: 각 항목은 "### id | 분류 | 출처 | 원문 제목" 줄 다음에 원문 본문이 오고, 원문에서 찾은 "이미지 후보"가 있으면 함께 온다.
- [단신]: "id | 분류 | 출처 | 원문 제목 | 발췌" 한 줄씩.
- 소식은 Next.js, React, JavaScript, CSS, HTML, 브라우저, 런타임, 프레임워크, 도구 등 여러 분야에 걸쳐 있다. 특정 분야에 치우치지 않게 고르게 다룬다.

작성 규칙
- title: 이번 주 가장 궁금해할 만하거나 파장이 큰 주제를 앞세운 글 제목. 40자 안팎. 주차나 "FE News"는 넣지 않는다.
- description: 목록과 검색 결과에 보일 한 문장 요약.
- intro: 여러 분야를 아울러 이번 주 흐름을 짚는 도입 1~2문단.
- sections: 주요 소식으로 쓰는 본문 섹션. 중요한 순서대로 쓴다.
  - 주요 소식은 하나당 섹션 하나로 쓰는 것이 원칙이다. 섹션은 최소 6개 이상 쓴다.
  - 정말 같은 사건(예: 같은 보안 이슈의 블로그 공지와 그 버전 릴리스)일 때만 한 섹션으로 묶고 ids에 모두 넣는다. 같은 제품의 다른 소식은 묶지 않는다. 첫 번째 id가 대표 원문이다. [단신]에 같은 사건의 소식이 있으면 그 id도 섹션 ids에 넣는다.
  - heading: 한국어 소제목. 제품명, 버전, API 이름은 원문 그대로 둔다.
  - body: Markdown 2~4문단. 무엇이 바뀌었는지, 왜 중요한지, 개발자가 지금 무엇을 하면 되는지를 풀어 쓴다. 필요하면 목록, 인라인 코드, 짧은 코드 블록을 쓴다. 제목 기호(#)는 쓰지 않는다.
  - 단순 광고인 주요 소식만 sections 대신 briefs에 넣는다.
- briefs: [단신] 목록에서 섹션에 쓰지 않은 id를 하나도 빠뜨리지 않고 넣는다. category(입력의 분류 그대로), titleKo(한국어 제목), summary(무엇인지와 왜 볼 만한지 한두 문장)를 쓴다.
- outro: 이번 주를 정리하고 무엇을 챙기면 좋을지 짚는 마무리 1문단.

섹션 이미지 (sections[].image)
- 섹션마다 내용 이해를 돕는 이미지를 하나 고른다. 구조도, 다이어그램, 스크린샷, 제품 화면처럼 내용과 직접 관련된 것을 우선하고, 단순 로고나 장식 이미지는 피한다.
- 이미지 후보가 있으면 그중 가장 알맞은 것의 url을 그대로 쓴다.
${canSearchImages ? IMAGE_SEARCH_RULE : NO_IMAGE_SEARCH_RULE}
- alt에는 이미지가 무엇을 보여주는지 한국어로 짧게 쓴다.

용어 설명 (glossary)
- 독자가 모를 수 있는 용어, 기술 개념, 배경이 되는 사건이나 소식을 6~12개 골라 쉽게 설명한다. 예: RSC, 하이드레이션, 원격 코드 실행(RCE), LTS, 타입 체커, Interop.
- match에는 intro, sections의 body, briefs의 summary, outro 중 한 곳에 실제로 쓴 문구를 글자 하나 다르지 않게 그대로 넣는다. 그 문구가 처음 나오는 곳이 클릭할 수 있는 링크가 된다. 코드(\`...\`) 안의 문구는 고르지 않는다.
- description은 3~5문장으로, 그 용어가 무엇인지, 왜 필요한지, 이번 소식과 어떤 관계인지를 비유와 함께 쉽게 쓴다. Markdown 문법 없이 일반 문장으로 쓰고, 문단을 나눌 때는 빈 줄을 넣는다.
- 구조나 흐름을 그림으로 봐야 이해가 쉬운 용어(예: 렌더링 흐름, 프로토콜 구조, 이벤트 루프, 캐시 동작)는 image를 붙인다. 최소 2~4개 용어에는 다이어그램이나 구조도를 찾아 붙인다. 이미지 규칙은 섹션 이미지와 같다.
- 본문에서는 용어를 짧게 짚고 넘어가도 된다. 자세한 설명은 glossary가 맡는다.

금지
- 원문에 없는 사실, 수치, 버전, 날짜를 지어내지 않는다. 확실하지 않으면 쓰지 않는다.
- 링크, URL, 출처 표기를 쓰지 않는다. 출처는 따로 붙인다.
- 입력에 없는 id를 쓰지 않는다.

출력은 아래 형식의 JSON 객체 하나만 보낸다. 설명이나 코드 블록 표시는 붙이지 않는다.
${OUTPUT_FORMAT}`;
}

const clean = (value) => value.replace(/[|\n]/g, ' ');

function formatImageCandidates(images = []) {
  if (images.length === 0) return '';
  const lines = images.map((image) => `- ${image.url}${image.alt ? ` (${clean(image.alt)})` : ''}`);
  return `\n이미지 후보:\n${lines.join('\n')}`;
}

function buildPrompt(featured, briefs) {
  const featuredBlock = featured
    .map(
      (entry) =>
        `### ${entry.id} | ${entry.category} | ${entry.source.name} | ${clean(entry.title)}\n${entry.body}${formatImageCandidates(entry.images)}`
    )
    .join('\n\n');
  const briefBlock = briefs
    .map((entry) => `${entry.id} | ${entry.category} | ${entry.source.name} | ${clean(entry.title)} | ${clean(entry.excerpt)}`)
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
  return { ...article, briefs: article.briefs ?? [], glossary: Array.isArray(article.glossary) ? article.glossary : [] };
}

function sanitizeImage(image) {
  if (!image || typeof image.url !== 'string' || !/^https:\/\//.test(image.url)) return undefined;
  return {
    url: image.url,
    alt: typeof image.alt === 'string' ? image.alt : '',
    sourceUrl: typeof image.sourceUrl === 'string' && /^https?:\/\//.test(image.sourceUrl) ? image.sourceUrl : undefined,
  };
}

function sanitizeGlossary(glossary) {
  const usedIds = new Set();
  return glossary.flatMap((entry, index) => {
    const { match, term, description } = entry ?? {};
    if (![match, term, description].every((value) => typeof value === 'string' && value.trim())) return [];

    const baseId = String(entry.id ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '') || `term-${index + 1}`;
    const id = usedIds.has(baseId) ? `${baseId}-${index + 1}` : baseId;
    usedIds.add(id);

    return [{ id, match: match.trim(), term: term.trim(), description: description.trim(), image: sanitizeImage(entry.image) }];
  });
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
      image: sanitizeImage(section.image),
    }))
    .filter((section) => section.ids.length > 0);
  const briefs = article.briefs.filter((brief) => takeId(brief.id));

  return { ...article, sections, briefs, glossary: sanitizeGlossary(article.glossary) };
}

function findForeignScript(article) {
  const text = [
    article.title,
    article.description,
    article.intro,
    article.outro,
    ...article.sections.flatMap((section) => [section.heading, section.body]),
    ...article.briefs.flatMap((brief) => [brief.titleKo, brief.summary]),
    ...article.glossary.flatMap((entry) => [entry.term, entry.description]),
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
        { role: 'system', content: buildSystemPrompt({ canSearchImages: false }) },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: MAX_OUTPUT_TOKENS,
      ...(isOpenRouter && { reasoning: { effort: 'low' } }),
    }),
  });
}

async function requestWithOpenAICompatible(model, prompt, options) {
  if (!options.apiKey) throw new Error('NEWS_LLM_API_KEY가 설정되지 않았습니다.');

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

  return { text, usage: data.usage, model: data.model ?? model };
}

async function requestArticle(provider, model, prompt, options) {
  const result =
    provider === 'claude-code'
      ? await requestWithClaudeCode(model, buildSystemPrompt({ canSearchImages: true }), prompt, { allowWebSearch: true })
      : await requestWithOpenAICompatible(model, prompt, options);
  return { ...result, article: parseArticle(result.text) };
}

export async function writeArticle(featured, briefs, { provider, apiKey, baseUrl, models }) {
  const modelList = models?.length ? models : DEFAULT_MODELS[provider];
  const prompt = buildPrompt(featured, briefs);
  const knownIds = new Set([...featured, ...briefs].map((entry) => entry.id));
  const failures = [];

  for (const model of modelList) {
    try {
      const result = await requestArticle(provider, model, prompt, { apiKey, baseUrl });
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
