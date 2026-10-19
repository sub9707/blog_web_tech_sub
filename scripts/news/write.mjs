import { CATEGORIES } from './sources.mjs';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.8-flash';

const SYSTEM_PROMPT = `너는 프론트엔드 기술 블로그를 운영하는 개발자다.
이번 주 프론트엔드 소식을 바탕으로 블로그 글 한 편을 쓴다. 소식을 나열하는 정리가 아니라, 맥락을 짚고 풀어 쓰는 읽을거리여야 한다.
독자는 실무 프론트엔드 개발자다. 문체는 "~다"로 끝나는 평서체로 통일한다.

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
- 입력에 없는 id를 쓰지 않는다.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    intro: { type: 'STRING' },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ids: { type: 'ARRAY', items: { type: 'STRING' } },
          category: { type: 'STRING', enum: CATEGORIES },
          heading: { type: 'STRING' },
          body: { type: 'STRING' },
        },
        required: ['ids', 'category', 'heading', 'body'],
      },
    },
    briefs: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          titleKo: { type: 'STRING' },
          summary: { type: 'STRING' },
        },
        required: ['id', 'titleKo', 'summary'],
      },
    },
    outro: { type: 'STRING' },
  },
  required: ['title', 'description', 'intro', 'sections', 'briefs', 'outro'],
};

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

function sanitizeArticle(article, knownIds) {
  const usedIds = new Set();
  const takeId = (id) => {
    if (!knownIds.has(id) || usedIds.has(id)) return false;
    usedIds.add(id);
    return true;
  };

  const sections = article.sections
    .map((section) => ({ ...section, ids: section.ids.filter(takeId) }))
    .filter((section) => section.ids.length > 0);
  const briefs = article.briefs.filter((brief) => takeId(brief.id));

  return { ...article, sections, briefs };
}

export async function writeArticle(featured, briefs, { apiKey, model }) {
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

  const response = await fetch(`${GEMINI_ENDPOINT}/${model || DEFAULT_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(featured, briefs) }] }],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.find((part) => !part.thought && part.text)?.text;
  if (!text) throw new Error(`Gemini 응답이 비어 있습니다: ${JSON.stringify(data).slice(0, 500)}`);

  const knownIds = new Set([...featured, ...briefs].map((entry) => entry.id));
  return { article: sanitizeArticle(JSON.parse(text), knownIds), usage: data.usageMetadata };
}
