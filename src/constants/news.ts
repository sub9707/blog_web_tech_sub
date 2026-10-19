export const NEWS_PAGE = {
  TITLE: 'FE News',
  DESCRIPTION:
    'Next.js, React, JavaScript, CSS, 브라우저까지 한 주간의 프론트엔드 소식과 다가오는 컨퍼런스를 모아, Claude가 해설을 쓰고 작성자가 직접 검토해 매주 발행합니다.',
  AI_NOTICE:
    '이 글은 공식 블로그와 뉴스레터의 공개 RSS에서 모은 소식을 바탕으로 Claude가 작성하고, 작성자가 원문과 대조해 검토한 뒤 발행했습니다. 자세한 내용은 각 출처의 원문을 확인해 주세요.',
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
    description: '주요 소식은 원문 본문까지 가져와 Anthropic의 Claude가 읽고, 같은 주제끼리 묶어 해설하는 한국어 글로 씁니다. 출처와 링크는 원문 데이터를 그대로 붙입니다.',
  },
  {
    title: '직접 검토',
    description: 'AI가 만든 초안을 작성자가 원문과 대조해 고치고 다듬은 뒤 발행합니다.',
  },
] as const;
