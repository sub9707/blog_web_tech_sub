import { CATEGORIES } from './sources.mjs';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `너는 한국어 프론트엔드 기술 뉴스 에디터다.
입력은 "id | 출처 | 제목 | 발췌" 형식의 이번 주 소식 목록이다.
이 소식들로 기술 블로그 글 한 편을 쓴다. 문체는 "~다"로 끝나는 평서체로 통일한다.
- title: 이번 주 가장 궁금해할 만하거나 파장이 큰 주제를 앞세운 글 제목. 주차나 "FE News" 같은 말은 넣지 않는다. 40자 안팎.
- intro: 이번 주 흐름을 소개하는 도입 문단 2~3문장.
- headline: 목록과 검색 결과에 쓸 한 문장 요약.
- items 각 항목
  - titleKo: 자연스러운 한국어 소제목. 제품명, 버전, API 이름은 원문 그대로 둔다.
  - summaryKo: 무엇이 바뀌었는지와 개발자에게 어떤 영향이 있는지 3~4문장.
  - importance: 3=주요 릴리스나 실무에 바로 영향, 2=알아두면 좋음, 1=단순 홍보나 관련성 낮음.
발췌에 없는 내용은 지어내지 않는다. 입력에 없는 id는 만들지 않는다.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    intro: { type: 'STRING' },
    headline: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          category: { type: 'STRING', enum: CATEGORIES },
          titleKo: { type: 'STRING' },
          summaryKo: { type: 'STRING' },
          importance: { type: 'INTEGER' },
        },
        required: ['id', 'category', 'titleKo', 'summaryKo', 'importance'],
      },
    },
  },
  required: ['title', 'intro', 'headline', 'items'],
};

function toPromptLine(entry) {
  const clean = (value) => value.replace(/[|\n]/g, ' ');
  return `${entry.id} | ${entry.source.name} | ${clean(entry.title)} | ${clean(entry.excerpt)}`;
}

export async function summarizeEntries(entries, { apiKey, model = DEFAULT_MODEL }) {
  if (!apiKey) return { result: null, error: 'GEMINI_API_KEY가 없어 AI 요약을 건너뛰었습니다.' };

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: entries.map(toPromptLine).join('\n') }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!response.ok) {
      return { result: null, error: `Gemini API ${response.status}: ${(await response.text()).slice(0, 300)}` };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { result: null, error: 'Gemini 응답이 비어 있습니다.' };

    const parsed = JSON.parse(text);
    const knownIds = new Set(entries.map((entry) => entry.id));
    return {
      result: { ...parsed, items: parsed.items.filter((item) => knownIds.has(item.id)) },
      usage: data.usageMetadata,
      error: null,
    };
  } catch (error) {
    return { result: null, error: `Gemini 호출 실패: ${error.message}` };
  }
}
