---
title: "Next.js 버전별 핵심 변화와 개발 문화의 전환"
date: "2026-07-06"
description: "Next.js 1부터 15까지, Pages Router에서 App Router로 넘어오기까지 무엇이 왜 바뀌었는지 정리"
tags: ["nextjs", "history", "app-router", "server-components", "turbopack", "new-features"]
thumbnail: "/assets/thumbnails/next-version.png"
---

Next.js의 역사는 크게 두 시대로 나뉜다.

**Pages Router 시대**(1~12)와 **App Router 시대**(13~)다.

전자는 "React로 SSR/SSG를 쉽게" 만드는 데 집중했고, 후자는 React Server Components를 기반으로 데이터 패칭과 렌더링 모델 자체를 다시 짰다.

버전 하나하나의 기능보다 중요한 건 이 두 시대를 거치며 개발자들의 선택이 어떻게 바뀌었는지다.

순서대로 짚어본다.

<br/>

## 시작 전에, 용어부터 가볍게 짚고 가자

- **CSR(Client-Side Rendering)**: 브라우저가 빈 HTML을 먼저 받고, 자바스크립트가 실행되면서 화면 내용을 그때그때 그려 넣는 방식. 리액트로 만든 일반적인 SPA(Single Page Application)가 이 방식이다.

- **SSR(Server-Side Rendering)**: 사용자가 요청할 때마다 서버가 미리 완성된 HTML을 만들어서 보내주는 방식. 화면이 처음부터 채워진 채로 도착해서 초기 로딩이 빠르고 검색엔진이 내용을 읽기 쉽다.

- **SSG(Static Site Generation)**: 요청이 올 때마다가 아니라, 빌드(배포 준비) 시점에 미리 HTML을 만들어두는 방식. 이미 만들어진 파일을 그대로 보여주기만 하면 되니 매우 빠르다.

- **ISR(Incremental Static Regeneration)**: SSG로 만든 정적 페이지를 일정 시간이 지나면 백그라운드에서 자동으로 다시 생성해 최신 상태로 갱신하는 방식. 거의 정적인데 가끔 갱신되는 페이지를 만들 수 있다.

- **CDN(Content Delivery Network)**: 전 세계 여러 지역에 파일 사본을 복사해두고, 사용자와 가장 가까운 곳에서 파일을 내려주는 인프라. 정적 파일을 빠르게 전달하기 위해 쓰인다.

- **서버리스(Serverless)**: 개발자가 서버를 직접 구축하거나 관리하지 않고, 필요할 때만 클라우드 제공자가 함수를 실행해주는 방식. 요청이 없을 땐 아무 서버도 켜져 있지 않아도 된다.

- **엣지(Edge)**: 사용자와 물리적으로 가까운 서버에서 코드를 실행하는 것. 본사 데이터센터까지 왕복하지 않아도 되니 응답이 빠르다.

- **캐시(cache)**: 한 번 만든 결과를 저장해뒀다가, 같은 요청이 다시 오면 새로 만들지 않고 저장된 결과를 그대로 재사용하는 것.

- **Core Web Vitals**: 구글이 정한 웹사이트 사용자 경험 측정 지표(로딩 속도, 반응성, 시각적 안정성 등). SEO(검색엔진 최적화) 점수에도 영향을 준다.

<br/>

## Next.js 1~8 (2016~2019) — SSR을 쉽게 만드는 도구

2016년 Vercel(당시 ZEIT)이 Next.js를 처음 공개했을 때 목표는 단순했다.

React로 서버 사이드 렌더링을 하려면 왜 이렇게 설정이 복잡해야 하냐는 것.

당시 React로 SSR을 하려면 Webpack, Babel, 서버용/클라이언트용 번들 분리, 라우팅, 코드 스플리팅을 전부 직접 구성해야 했다.

Next.js는 파일 기반 라우팅과 제로 컨피그(별도 설정 없이 바로 동작하는) 번들링으로 이 과정을 통째로 없애버렸다.

```jsx
// pages/about.js — 파일 경로가 곧 라우트
export default function About() {
  return <div>About page</div>;
}
```

**왜 등장했을까**

CRA(Create React App)는 SPA를 쉽게 만들어줬지만 SSR은 지원하지 않았다.

SEO가 중요한 서비스(블로그, 커머스)에서 클라이언트 전용 렌더링은 초기 로딩 시 빈 화면이 뜨고 크롤러가 내용을 못 읽는 문제로 이어졌다.

Next.js는 "설정 없이 SSR"이라는 명확한 틈새를 파고들었다.

**DX 변화**

Webpack 설정 파일을 직접 만질 일이 거의 없어졌다.

`pages/` 폴더에 파일만 추가하면 라우트가 알아서 생겼다.

<br/>

## Next.js 9 (2019) — API Routes와 동적 라우팅

```jsx
// pages/posts/[id].js — 동적 라우트
import { useRouter } from 'next/router';
export default function Post() {
  const router = useRouter();
  return <div>Post {router.query.id}</div>;
}

// pages/api/hello.js — 백엔드 API를 같은 프로젝트 안에서
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello' });
}
```

**왜 바뀌었을까**

프론트엔드와 별도로 백엔드 서버(Express 등)를 두는 건 간단한 프로젝트치고는 과한 구성이었다.

API Routes는 서버리스 함수 하나로 간단한 백엔드 로직을 같은 저장소, 같은 배포 파이프라인 안에 둘 수 있게 해줬다.

Vercel이 밀고 있던 서버리스 인프라와도 정확히 맞아떨어지는 방향이었다.

<br/>

## Next.js 9.3 (2020) — getStaticProps / getServerSideProps, SSG의 본격화

```jsx
// 빌드 타임에 데이터를 가져와 정적 HTML로 생성
export async function getStaticProps() {
  const posts = await fetchPosts();
  return { props: { posts }, revalidate: 60 }; // ISR
}

// 요청마다 서버에서 데이터를 가져옴
export async function getServerSideProps(context) {
  const user = await fetchUser(context.params.id);
  return { props: { user } };
}

export default function Blog({ posts }) {
  return posts.map((p) => <PostCard key={p.id} post={p} />);
}
```

**왜 바뀌었을까**

그전까지는 `getInitialProps` 하나로 SSR과 CSR을 뭉뚱그려 처리했는데, 정적 생성(SSG)과 서버 렌더링(SSR)은 사실 요구사항이 서로 다르다는 게 점점 명확해졌다.

정적 페이지는 CDN에서 바로 서빙하고 싶고, 동적 페이지는 요청마다 최신 데이터가 필요하다.

**ISR(Incremental Static Regeneration)** 은 이 둘의 중간 지점을 채워서, 정적이지만 주기적으로 갱신되는 페이지를 가능하게 했다.

**버려진 것**: `getInitialProps`.

SSG와 SSR을 구분하지 못하고 자동 정적 최적화를 방해한다는 이유로 공식 문서에서 비권장으로 밀려났다.

**DX 변화**

"이 페이지는 빌드 타임에 만들까, 요청마다 만들까"를 함수 하나만 바꿔서 고를 수 있게 됐다.

커머스나 블로그처럼 콘텐츠가 자주 안 바뀌는 페이지에 ISR을 쓰면서, 별도 캐시 인프라 없이도 "거의 정적, 가끔 갱신"을 구현하는 게 표준 패턴으로 자리잡았다.

<br/>

## Next.js 10~11 (2020~2021) — 이미지 최적화와 국제화

```jsx
// next/image — 자동 최적화, lazy loading, 레이아웃 시프트 방지
import Image from 'next/image';
<Image src="/hero.png" width={800} height={400} alt="hero" priority />;
```

Next 10에서 `next/image`와 국제화 라우팅(`i18n`)이 들어왔고, Next 11에서는 Webpack 5가 기본값이 되고 `next/script`가 추가됐다.

**왜 바뀌었을까**

2020년 구글이 Core Web Vitals를 SEO 지표로 공식화하면서, 이미지 최적화와 레이아웃 시프트 방지는 선택이 아니라 필수가 됐다.

`next/image`는 이 요구사항을 아예 프레임워크 레벨에서 강제해버린 셈이다.

**버려진 것**: 수동으로 `srcset`을 구성하거나 `react-lazyload` 같은 서드파티 lazy-loading 라이브러리를 쓰던 관습이 `next/image` 하나로 대체됐다.

<br/>

## Next.js 12 (2021) — Middleware와 SWC

**Middleware — 요청을 라우팅 이전에 가로챈다**

```js
// middleware.js
export function middleware(request) {
  const token = request.cookies.get('token');
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}
```

**SWC — Babel을 대체한 Rust 기반 컴파일러**

**왜 바뀌었을까**

Babel은 자바스크립트로 짜여진 컴파일러라, 대규모 프로젝트에서는 빌드 속도의 병목이 되곤 했다.

Next.js는 Rust로 작성된 SWC로 전환하면서 트랜스파일 속도를 크게 끌어올렸다(공식 벤치마크 기준 최대 17배).

Middleware는 인증, 리다이렉트, A/B 테스트처럼 페이지 렌더링 전에 처리해야 하는 로직을 엣지에서 실행할 수 있게 해줬는데, 덕분에 각 페이지의 `getServerSideProps`마다 따로 작성하던 인증 체크를 한 곳으로 모을 수 있었다.

**버려진 것**: `babel.config.js` 커스터마이징.

대부분의 프로젝트가 SWC 기본 설정만으로도 충분해지면서, Babel 플러그인을 직접 추가하는 경우가 크게 줄었다.

<br/>

## Next.js 13 (2022~2023) — App Router의 등장, 패러다임 전환

Next.js 역사상 가장 큰 전환이다.

React Server Components를 정식으로 프레임워크에 통합했다.

```
app/
├── layout.tsx       // 공통 레이아웃, 페이지 전환 시 리렌더링 안 됨
├── page.tsx          // 라우트의 실제 화면
├── loading.tsx        // 이 구간 로딩 UI(자동 Suspense)
├── error.tsx          // 이 구간 에러 UI(자동 Error Boundary)
└── posts/
    └── [slug]/
        └── page.tsx
```

```tsx
// app/posts/[slug]/page.tsx — 기본이 Server Component
async function getPost(slug: string) {
  const res = await fetch(`https://api.example.com/posts/${slug}`, {
    next: { revalidate: 3600 }, // fetch 단위로 캐시 전략 지정
  });
  return res.json();
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug); // 컴포넌트 안에서 직접 await
  return <article>{post.title}</article>;
}
```

**왜 바뀌었을까**

Pages Router에는 구조적인 한계가 몇 가지 있었다.

1. **레이아웃 중복 렌더링**: 페이지를 전환할 때마다 `_app.js` 전체가 다시 실행되는 구조라, 공통 레이아웃(사이드바, 헤더)에 상태를 유지하기 까다로웠다.
2. **데이터 패칭이 페이지 최상단에 묶임**: `getServerSideProps`는 페이지 컴포넌트에서만 쓸 수 있어서, 깊이 중첩된 컴포넌트가 필요한 데이터도 일단 최상단에서 모아 props로 내려보내야 했다(props drilling과 비슷한 문제다).
3. **클라이언트 번들 크기**: 페이지 전체가 기본적으로 클라이언트 컴포넌트라, 상호작용이 없는 정적인 부분까지 JS로 번들링돼서 브라우저로 전송됐다.

App Router는 React Server Components로 이 세 문제를 한 번에 풀었다.

레이아웃은 중첩 구조로 유지되면서 페이지 전환에도 다시 렌더링되지 않고, 각 컴포넌트가 필요한 데이터를 직접 `fetch`할 수 있으며, 상호작용이 필요 없는 컴포넌트는 아예 클라이언트로 전송조차 되지 않는다.

**DX 변화**

- `getStaticProps`/`getServerSideProps`/`getInitialProps`로 나뉘어 있던 데이터 패칭 API가 컴포넌트 안의 평범한 `async/await`로 통합됐다.
- `loading.tsx`, `error.tsx` 파일 컨벤션만으로 Suspense와 Error Boundary가 자동 적용돼서, 로딩/에러 UI를 위해 매번 `<Suspense>`를 손으로 감쌀 필요가 줄었다.
- 반대로 "이 컴포넌트가 서버에서 도는가, 클라이언트에서 도는가"를 항상 신경 써야 하는 새로운 부담이 생겼다. `useState`나 `useEffect`, 이벤트 핸들러가 필요한 순간 `"use client"`를 붙여야 한다는 규칙을 깜빡해서 실수하는 일도 잦았다.
- `styled-components`, `emotion` 같은 CSS-in-JS 라이브러리(자바스크립트 코드 안에서 CSS를 작성하는 방식)는 브라우저가 코드를 실행하는 시점에 스타일을 주입하는데, 이 방식이 서버 렌더링 스트리밍과 충돌했다. 이때부터 Tailwind CSS, CSS Modules, `vanilla-extract`처럼 실행 시점에 의존하지 않는 스타일링으로 옮겨가는 흐름이 뚜렷해졌다.

**버려진 것 / 새로 선택한 것**

| 이전 | 이후 | 이유 |
|---|---|---|
| `pages/` + `getStaticProps`/`getServerSideProps` | `app/` + Server Component의 `async/await` | 데이터 패칭을 컴포넌트 트리 어디서나 가능하게 |
| `_app.js`, `_document.js` | `app/layout.tsx` | 중첩 레이아웃과 상태 유지 |
| 런타임 CSS-in-JS(styled-components 등) | Tailwind, CSS Modules | Server Component/스트리밍과의 호환성 |
| Redux로 서버 데이터까지 전역 관리 | Server Component fetch + TanStack Query(클라이언트 상호작용 부분만) | 서버 상태를 렌더링 트리에서 직접 해결 |

<br/>

## Next.js 14 (2023) — Server Actions 안정화

```tsx
// app/actions.ts
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title');
  await db.post.create({ data: { title } });
  revalidatePath('/posts');
}

// app/new/page.tsx
import { createPost } from '../actions';

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">작성</button>
    </form>
  );
}
```

**왜 바뀌었을까**

App Router가 나온 뒤에도 폼을 제출해서 서버 데이터를 바꾸는 흐름은 여전히 별도 API Route를 만들고 클라이언트에서 `fetch`로 호출하는 방식이 일반적이었다.

Server Actions는 이 클라이언트-서버 왕복을 위한 API Route 작성 자체를 없앴다.

폼의 `action`에 서버 함수를 바로 연결하면 그걸로 끝이다.

**DX 변화**

CRUD 하나를 위해 API Route 파일과 클라이언트 fetch 로직을 따로 작성하던 관행이 줄고, 서버 함수 하나로 폼 처리가 끝나는 경우가 늘었다.

다만 이 로직이 서버에서 안전하게 실행되는지 검증하는 습관(입력 검증, 권한 체크)은 여전히 개발자 몫이라서, 실수로 민감한 로직을 클라이언트에 노출시킬 위험도 함께 따라왔다.

<br/>

## Next.js 15 (2024) — 캐싱 시맨틱 변경과 React 19

**fetch 캐시 기본값 변경**: Next 14까지 `fetch`는 기본적으로 캐시됐다(옵트아웃 방식 — 끄고 싶을 때만 명시적으로 설정).

Next 15부터는 기본이 **캐시하지 않음**(옵트인 방식 — 켜고 싶을 때만 명시적으로 설정)으로 뒤집혔다.

```tsx
// Next 14: 기본 캐시됨, 명시적으로 꺼야 했음
fetch(url); // 기본 force-cache
fetch(url, { cache: 'no-store' }); // 캐시 끄려면 명시

// Next 15: 기본 캐시 안 됨, 명시적으로 켜야 함
fetch(url); // 기본 no-store
fetch(url, { cache: 'force-cache' }); // 캐시 쓰려면 명시
```

**비동기 요청 API**: `cookies()`, `headers()`, `params`, `searchParams`가 Promise를 반환하도록 바뀌었다.

```tsx
// Next 14
export default function Page({ params }: { params: { slug: string } }) {
  return <div>{params.slug}</div>;
}

// Next 15
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <div>{slug}</div>;
}
```

**왜 바뀌었을까**

캐시 기본값 변경은 App Router 도입 초기부터 나왔던 가장 큰 불만, 그러니까 "왜 내 데이터가 자동으로 캐시돼서 최신이 아니지?"에 대한 응답이었다.

암묵적 캐싱이 디버깅을 어렵게 만든다는 커뮤니티 피드백을 받아들여서, 명시하지 않으면 캐시하지 않는 더 예측 가능한 기본값으로 되돌린 것이다.

비동기 요청 API 변경은 서버 렌더링 인프라가 요청별 정보를 스트리밍이나 부분 사전 렌더링(PPR)과 함께 다루기 위한 내부 구조 변경에서 비롯됐다.

**DX 변화**

캐싱 동작을 예측하려고 문서를 다시 찾아봐야 하는 빈도가 줄었다.

"아무것도 안 썼는데 왜 캐시됐지"라는 혼란이 줄고, "캐시하려면 명시적으로 켜야 한다"는 직관과 맞아떨어졌기 때문이다.

다만 `params`/`cookies`가 전부 Promise가 되면서, 기존 코드 곳곳에 `await`를 추가해야 하는 마이그레이션 비용이 새로 생겼다.

<br/>

## 전체 흐름 정리

| 버전 | 연도 | 핵심 변화 | 왜 |
|---|---|---|---|
| 1~8 | 2016~2019 | 파일 기반 라우팅, 제로 컨피그 SSR | Webpack/Babel 수동 설정 없이 SSR 구현 |
| 9 | 2019 | API Routes, 동적 라우트 | 프론트/백엔드를 한 저장소에서 |
| 9.3 | 2020 | getStaticProps/getServerSideProps, ISR | SSG/SSR 구분, 정적+주기적 갱신 |
| 10~11 | 2020~2021 | next/image, i18n, Webpack5, SWC 도입 | Core Web Vitals 대응, 빌드 성능 |
| 12 | 2021 | Middleware, SWC 기본 컴파일러 | 엣지 로직 통합, Babel 병목 제거 |
| 13 | 2022~2023 | App Router, Server Components | 레이아웃 재렌더링, props drilling, 번들 크기 문제 해결 |
| 14 | 2023 | Server Actions 안정화 | API Route 없이 서버 변이 처리 |
| 15 | 2024 | 캐시 기본값 변경, 비동기 요청 API | 예측 가능한 캐싱, PPR 기반 마련 |

Next.js가 바뀌어온 방향은 한 줄로 요약된다.

React 생태계에서 계속 반복되던 설정과 보일러플레이트를, 프레임워크가 대신 떠맡아준다는 것.

Webpack 설정 대신 파일 기반 라우팅을, 수동 이미지 최적화 대신 `next/image`를, API Route와 fetch 조합 대신 Server Actions를 쓰는 식이다.

그래서 지금 Next.js를 쓴다는 건 단순히 "React용 SSR 도구를 쓴다"는 의미보다는, 데이터 패칭·캐싱·렌더링 전략에 대한 Vercel의 관점을 함께 받아들인다는 의미에 더 가깝다.

<br/>

## 참고

<bookmark url="https://nextjs.org/blog"></bookmark>

<bookmark url="https://nextjs.org/docs/app/building-your-application/upgrading/version-15"></bookmark>

<bookmark url="https://nextjs.org/docs/architecture/nextjs-compiler"></bookmark>
