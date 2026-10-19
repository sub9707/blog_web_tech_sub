export const NEWS_PAGE = {
  TITLE: 'FE News',
  DESCRIPTION:
    'Next.js, React, JavaScript, 프론트엔드 생태계의 주간 소식을 AI가 모으고 요약한 뒤 직접 검토해 정리합니다.',
  AI_NOTICE:
    '이 글은 공개 RSS 피드에서 수집한 소식을 AI가 요약하고, 작성자가 직접 검토해 발행했습니다. 자세한 내용은 각 원문 링크를 확인해 주세요.',
} as const;

export const NEWS_PIPELINE = [
  {
    title: '수집',
    description: 'Next.js, React, TypeScript, Node.js 공식 블로그와 릴리스 노트, 주요 뉴스레터의 RSS를 매주 월요일 자동으로 모읍니다.',
  },
  {
    title: '선별',
    description: '이미 다룬 소식과 같은 내용의 중복 글, canary 같은 사전 릴리스를 걸러내고 관련도 높은 소식만 남깁니다.',
  },
  {
    title: 'AI 작성',
    description: '주요 소식은 원문 본문까지 가져와 Google Gemini Flash 모델이 읽고, 같은 주제끼리 묶어 해설하는 한국어 글로 씁니다. 출처와 링크는 원문 데이터를 그대로 붙입니다.',
  },
  {
    title: '직접 검토',
    description: 'AI가 만든 초안을 작성자가 원문과 대조해 고치고 다듬은 뒤 발행합니다.',
  },
] as const;
