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
    description: 'Next.js, React, Vue 등 공식 블로그와 CSS, 브라우저, 런타임 소식, 프론트엔드 뉴스레터 26곳의 RSS와 컨퍼런스 일정을 매주 월요일 자동으로 모읍니다.',
  },
  {
    title: '선별',
    description: '이미 다룬 소식과 중복 글, canary 같은 사전 릴리스를 걸러내고, 특정 분야에 치우치지 않도록 분야별로 주요 소식을 고릅니다.',
  },
  {
    title: 'AI 작성',
    description: '주요 소식은 원문 본문까지 가져와 AI 언어 모델(OpenRouter를 통한 오픈 모델)이 읽고, 같은 주제끼리 묶어 해설하는 한국어 글로 씁니다. 출처와 링크는 원문 데이터를 그대로 붙입니다.',
  },
  {
    title: '직접 검토',
    description: 'AI가 만든 초안을 작성자가 원문과 대조해 고치고 다듬은 뒤 발행합니다.',
  },
] as const;
