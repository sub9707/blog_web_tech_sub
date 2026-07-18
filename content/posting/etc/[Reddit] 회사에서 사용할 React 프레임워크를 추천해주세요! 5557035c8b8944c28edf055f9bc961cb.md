---
title: "[Reddit] 회사에서 사용할 React 프레임워크를 추천해주세요!"
date: "2025-10-25"
description: "대규모 트래픽을 처리하는 엔터프라이즈 앱에서 사용할 React 프레임워크를 추천해달라는 Reddit Discussion을 정리하고 고찰한 글"
tags: ["reddit", "react", "nextjs", "vite", "framework"]
thumbnail: "/assets/thumbnails/etc/reddit-1.png"
---

많은 트래픽을 처리할 프론트엔드 프로젝트에서 사용할 React 프레임워크를 찾고 있고, TypeScript 기반에 SWC 수준의 빠른 컴파일을 원한다는 질문 글이었다.

<bookmark url="https://www.reddit.com/r/reactjs/comments/1asbino/which_react_framework_you_recommend_for/"></bookmark>

아래는 주요 댓글 의견을 정리한 내용이다.

<br/>

## 주요 의견 정리

<br/>

### #1 — Pure React

사내용 앱에서 SEO가 필요하지 않다면 순수 React 프로젝트를 추천한다.

인프라를 번들 + CDN으로 단순하게 유지할 수 있고, SSG·SSR이 정말 필요한 시점이 오면 그때 Next.js를 도입하면 된다.

<br/>

### #2 — Pure React + 에코시스템 조합

현재 운영 중인 스택을 공유한 댓글이다.

- **상태 관리** — `redux-toolkit` (기존 redux에서 마이그레이션, 둘 다 무난)
- **UI** — `MUI` (베이스 스타일로 사용)
- **폼 관리** — `react-hook-form` 추천 (formik는 구식)
- **빌드 툴** — `Vite` (CRA에서 마이그레이션 중, Vite 강력 추천)
- **테스트** — `React Testing Library`

<br/>

### #3 — Next.js

문서화가 가장 잘 되어 있고 개발자 커뮤니티 규모가 크다.

사소한 성능 차이보다 **유지보수성과 생태계 규모**가 엔터프라이즈에서는 더 중요하다는 관점이다.

<br/>

### #4 — Remix + Vite

Vite 플러그인과 Remix를 함께 사용하고, API 라우팅은 `react-router` 기반으로 구성했다.

Remix는 서버 사이드 데이터 로딩 모델이 명확해서 데이터 흐름을 추적하기 쉽다는 장점이 있다.

<br/>

### #5 — Next.js

Next.js는 SSR·SEO 외에도 **강력한 캐싱 시스템**이 대규모 트래픽 처리에 유리하다.

Vercel이나 Node.js 백엔드 없이도 SPA로 빌드 추출이 가능해 배포 유연성도 높다.

<br/>

### #6 — Pure React or Alpine.js

내부용 앱이라면 아래 스택을 추천한다.

| 역할 | 라이브러리 | 이유 |
|---|---|---|
| 빌드 | `Vite` | TypeScript 스타터 킷 포함, CRA 대체 |
| UI | `MUI` | 무료 컴포넌트 컬렉션, 빠른 프로토타이핑 |
| 데이터 패칭 | `React Query` | 패칭 + 캐싱 + 상태 관리 일체형 |
| 상태 관리 | `Zustand` or `Jotai` | Redux보다 가볍고 보일러플레이트 적음 |
| 폼 | `react-hook-form` | 성능 최적화된 폼 관리 |
| 스타일 | `SCSS` | CSS-in-JS(JSS)는 런타임 비용 발생 |

정적 콘텐츠 위주의 사이트라면 React 대신 **Alpine.js** 를 고려해볼 것을 권했다.

<br/>

## 고찰

댓글들을 종합하면 **"React + 목적에 맞는 라이브러리 조합"** 이 다수 의견이다. 프레임워크 자체보다 에코시스템 선택이 더 중요하다는 맥락이다.

빠지지 않고 등장하는 키워드는 두 가지다.

**React Query** — 데이터 패칭, 캐싱, 서버 상태 동기화를 한 번에 처리해 대규모 앱에서 특히 유용하다.

**Vite** — HMR 속도와 개발 경험이 CRA 대비 압도적이다. 지금 새 프로젝트를 시작한다면 Vite가 사실상 표준이 됐다.

Next.js는 SSR·SEO가 필요한 경우의 선택지로 지지를 받았고, Remix는 서버 사이드 데이터 모델이 명확해 유지보수 측면에서 호평받았다.

overmindJS나 Alpine.js 같은 생소한 선택지도 보였는데, 메인 스택으로 가져가지 않더라도 작은 사이드 프로젝트에서 실험해보며 시야를 넓히는 것도 좋은 방법이라고 생각한다.
