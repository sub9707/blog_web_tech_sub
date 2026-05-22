@AGENTS.md

# Claude.md

## 프로젝트 목표

React / Next.js 기반 기술학습 블로그 프로젝트.

핵심 목표:

- 유지보수 쉬운 구조
- 재사용 가능한 컴포넌트 설계
- 모던 Next.js App Router 패턴 사용
- 성능 최적화
- 효율적인 렌더링 구조
- 확장 가능한 아키텍처
- 일관된 디자인 시스템
- SEO 친화적 구조
- 실무 스타일 코드베이스 유지
- 반응형 디자인 필수
- 모던 프론트엔드 디자인 및 레이아웃에 맞게 웹 디자인 고려

항상 "지금은 작아도 커질 수 있다"를 기준으로 구조를 설계한다.

---

# Development Philosophy

## 가장 중요한 기준

구현 전에 항상 아래를 먼저 고민한다.

- 이 구조는 확장 가능한가?
- 재사용 가능한가?
- 중복 제거 가능한가?
- 유지보수 쉬운가?
- Client Component가 꼭 필요한가?
- 상태를 더 단순하게 만들 수 있는가?
- 렌더링 비용이 증가하지 않는가?
- 서버에서 처리 가능한가?
- SEO에 불리하지 않은가?
- 코드 읽기가 쉬운가?

---

# Tech Stack Rules

## 기본 스택

- Next.js App Router
- TypeScript
- TailwindCSS
- Server Component 우선
- 필요할 때만 Client Component
- ESLint / Prettier 유지
- 절대경로 import 사용(상대경로 최대한 지양)
- 이모티콘 남발 금지
- 주석 남발 금지(꼭 필요할 때만 사용)

---

# Folder Structure

## 권장 구조

```txt
src/
├── app/
│
├── components/
│   ├── ui/
│   ├── common/
│   ├── layout/
│   └── post/
│
├── features/
│
├── hooks/
│
├── lib/
│
├── services/
│
├── constants/
│
├── utils/
│
├── styles/
│
├── types/
│
└── data/
```

## App Router Rules

기본 원칙
- App Router 사용
- Server Component 기본 사용
- 필요한 경우만 "use client"
- route segment 기반 구조 유지
- loading.tsx 적극 활용
- error.tsx 적극 활용
- not-found.tsx 적극 활용
- metadata 적극 활용
- Client Component 최소화

Client Component는 아래 상황에서만 사용 고려:

- 브라우저 이벤트 필요
- useState 필요
- useEffect 필요
- animation 필요
- browser API 사용
- interactive UI 필요

기본은 Server Component.

## Component Architecture

컴포넌트 설계 원칙
- 하나의 컴포넌트는 하나의 역할만 담당
- 재사용 가능한 구조 우선
- props 최소화
- 명확한 네이밍 사용
- UI와 비즈니스 로직 분리
- 컴포넌트 depth 최소화

컴포넌트 분리 기준

다음 중 하나라도 해당되면 분리 고려:

- 2번 이상 재사용
- JSX depth 과도
- 조건부 렌더링 복잡
- 이벤트 로직 반복
- 스타일 반복
- 역할이 여러 개
- 파일 길이 과도

재사용 우선 요소

우선적으로 공통화 고려:

- Button
- Input
- Modal
- Container
- Section
- PostCard
- Tag
- Navigation
- Pagination
- MarkdownRenderer
- ThemeToggle

## Styling Rules

스타일링 원칙
- TailwindCSS 우선 사용
- class 중복 최소화
- 디자인 토큰 일관성 유지
- spacing 규칙 통일
- typography scale 통일
- radius/shadow 규칙 통일

금지 사항
- inline style 남용
- magic number 반복
- 의미 없는 div 중첩
- absolute 남발
- z-index 난립
- 스타일 복붙 반복

## Design System Rules

디자인 시스템 유지

반드시 일관성 유지:

- spacing
- typography
- color palette
- border radius
- shadow
- transition
- container width

Tailwind 관리 원칙

반복되는 class는 추출 고려.

예시:

```ts
export const buttonVariants = {
  primary: "...",
  secondary: "...",
}
```

또는 `cn()`, `cva()`, `tailwind-merge` 활용 고려.

## Performance Rules

최적화 기본 원칙

항상 아래를 먼저 고려:

- Server Component 사용 가능 여부
- hydration 감소 가능 여부
- bundle size 증가 여부
- dynamic import 가능 여부
- unnecessary rerender 발생 여부
- memoization이 정말 필요한가?
- list rendering 비용
- key 안정성

useMemo / useCallback Rules

무조건 사용하지 않는다.

다음 상황에서만 고려:

- expensive calculation
- memoized child props
- rerender 최적화 필요
- dependency stability 필요

불필요한 memoization 금지.

## Image Optimization

반드시:

- next/image 사용
- sizes 작성
- lazy loading 고려
- priority 최소화
- blur placeholder 고려

## Font Optimization

- next/font 사용
- 불필요한 font weight 금지
- preload 최소화

## Rendering Rules

렌더링 원칙

항상:

- 불필요한 상태 제거
- derived state 우선
- 서버 렌더링 우선
- streaming 가능 여부 고려
- suspense 고려
- partial rendering 고려

## State Management Rules

상태 관리 우선순위
1. local state
2. props
3. URL state
4. server state
5. global state

전역 상태 남용 금지.

## useEffect Rules

useEffect는 최후의 수단.

먼저 고려할 것:

- server component 처리 가능?
- event handler로 처리 가능?
- derived state 가능?
- memoization 가능?
- ref로 해결 가능?

불필요한 effect 생성 금지.

## Fetching Rules

데이터 패칭 원칙
- 서버 fetch 우선
- parallel fetching 고려
- cache 전략 명확히
- revalidate 전략 명확히
- loading/error 상태 분리
- suspense 적극 활용

## API Layer Rules

- fetch 로직 분리
- services 계층 유지
- API 함수 재사용 가능하게 작성
- 데이터 변환 로직 분리

예시:

```
services/
  posts/
    getPosts.ts
    getPost.ts
```

## Constants Rules

반드시 상수화 고려
- route path
- category
- pagination size
- animation duration
- metadata
- navigation items
- theme values
- breakpoint values

하드코딩 최소화.

잘못된 예시:
```ts
router.push("/posts/react")
```

좋은 예시:
```ts
router.push(ROUTES.REACT)
```

## Naming Rules

네이밍 원칙
- 의미 있는 이름 사용
- 축약 최소화
- 함수는 동사 기반
- Boolean은 is/has/can prefix 사용
- 상수는 UPPER_SNAKE_CASE

예시:
- isOpen
- hasPermission
- fetchPosts
- handleSubmit
- POSTS_PER_PAGE

## TypeScript Rules

타입 원칙
- any 사용 최소화
- 타입 재사용
- 중복 타입 제거
- 명확한 interface/type 정의
- props 타입 분리 고려

타입 위치 기준: `types/` 에서 공통 타입 관리. 컴포넌트 전용 타입은 컴포넌트 근처 유지 가능.

## SEO Rules

기술 블로그 SEO 중요

반드시 고려:

- metadata
- open graph
- canonical
- sitemap
- robots.txt
- semantic heading
- semantic HTML
- structured data 가능 여부

## Accessibility Rules

접근성 고려

반드시:

- semantic tag 사용
- alt 작성
- aria 고려
- keyboard navigation 고려
- button/div 역할 명확화

## Markdown / Content Rules

블로그 콘텐츠 구조 - 모바일/반응형 디자인 고려

고려할 것:

- markdown rendering
- syntax highlight
- heading anchor
- table of contents
- code block copy
- responsive typography

## Code Style Rules

코드 스타일 원칙
- 가독성 우선
- early return 적극 사용
- 중첩 최소화
- 함수 짧게 유지
- 불필요한 abstraction 금지
- 과도한 generic 금지

금지 사항
- 의미 없는 custom hook
- useEffect 남용
- unnecessary client component
- 거대한 page.tsx
- props drilling 방치
- 스타일 복붙
- any 남용
- barrel export 남용
- 과도한 폴더 depth
- 하나의 컴포넌트에 너무 많은 역할 부여

## 리뷰 기준

구현 후 항상 체크:

- 재사용 가능한가?
- 더 단순하게 가능한가?
- 렌더링 최적화 필요한가?
- 상태가 과한가?
- server component로 가능한가?
- 유지보수 쉬운가?
- 읽기 쉬운가?
- SEO 문제 없는가?
- 접근성 문제 없는가?

## Claude 응답 원칙

Claude는 항상:

- 실무적인 구조 우선 제안
- 유지보수성 우선 고려
- 성능 영향 고려
- 재사용성 우선 고려
- App Router 베스트 프랙티스 기준 답변
- 최신 Next.js 패턴 우선 사용
- 불필요한 복잡성 줄이기
- 확장 가능한 구조 우선 제안

구현 전에:

- 폴더 구조 먼저 고려
- 컴포넌트 분리 기준 먼저 제안
- 서버/클라이언트 경계 먼저 판단
- 상태 위치 먼저 판단
- 최적화 포인트 먼저 체크
