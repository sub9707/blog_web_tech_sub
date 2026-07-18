---
title: "Core Web Vitals — 웹 성능 지표 완전 정리"
date: "2026-06-18"
description: "LCP, CLS, INP 세 가지 Core Web Vitals의 의미와 측정 방법, React/Next.js에서 각 지표를 개선하는 방법까지 정리한 글"
tags: ["performance", "web-vitals", "lcp", "cls", "inp", "nextjs", "react"]
---
<!-- thumbnail: "/assets/thumbnails/web-vitals.jpg" -->

구글은 2020년부터 **Core Web Vitals** 를 검색 랭킹 신호로 반영하기 시작했다.

단순히 SEO 점수 올리는 용도가 아니다. 이 지표들은 실제 사용자가 페이지를 어떻게 경험하는지를 수치로 표현한 것이다. 

지표를 이해하면 "왜 웹 중간중간 느리게 느껴지는지", "무엇을 먼저 고쳐야 하는지"가 보인다.

<br/>

## 왜 Core Web Vitals인가

기존에도 성능 지표는 있었다. `DOMContentLoaded`, `load`, `Time to First Byte` 같은 것들. 하지만 이 지표들은 **사용자가 실제로 느끼는 경험**과 거리가 있었다.

Core Web Vitals는 세 가지 사용자 경험 차원을 다룬다.

| 지표 | 측정하는 것 | 질문 |
|---|---|---|
| **LCP** | 로딩 성능 | 언제 주요 콘텐츠가 보이는가? |
| **CLS** | 시각적 안정성 | 페이지가 얼마나 흔들리는가? |
| **INP** | 상호작용 응답성 | 클릭/입력에 얼마나 빨리 반응하는가? |

각 지표는 구글이 실제 크롬 사용자 데이터를 기반으로 Good / Needs Improvement / Poor 기준을 정해두었다.

<!-- 이미지: Core Web Vitals 세 가지 지표 카드 형태 요약
     LCP(초록 2.5s 이하 Good), CLS(초록 0.1 이하 Good), INP(초록 200ms 이하 Good)
     각 지표별 임계값 색상 바 (Good/Needs Improvement/Poor)
     파일명: core-web-vitals-overview.png -->
![Core Web Vitals 개요](/assets/Javascript/core-web-vitals-overview.png)

<br/>

---

## LCP — Largest Contentful Paint

### 뭘 측정할까

페이지 로드 시작 시점부터 **뷰포트 안에서 가장 큰 콘텐츠 요소가 렌더링되기까지** 걸린 시간이다.

"가장 큰 요소"로 인정되는 후보는 다음과 같다.

- `<img>` 요소
- `<video>` 의 poster 이미지
- CSS `background-image`로 적용된 이미지
- 텍스트를 포함한 블록 요소 (`<p>`, `<h1>` 등)

<!-- 이미지: LCP 후보 요소 시각화
     뷰포트 안에 여러 요소가 있고 그 중 가장 큰 이미지/텍스트 블록에 하이라이트 표시
     타임라인 아래에 LCP 측정 시점 마커
     파일명: lcp-candidate-elements.png -->
![LCP 후보 요소](/assets/Javascript/lcp-candidate-elements.png)

### 기준값

| 등급 | 기준 |
|---|---|
| Good | 2.5초 이하 |
| Needs Improvement | 2.5초 ~ 4초 |
| Poor | 4초 초과 |

<br/>

### LCP가 느린 주요 원인

**1. 느린 서버 응답 (TTFB)**

브라우저가 첫 바이트를 받기 전까지는 아무것도 시작되지 않는다. TTFB가 높으면 LCP는 반드시 늦다.

**2. 렌더 블로킹 리소스**

`<head>` 안의 CSS, 동기 `<script>`가 파싱을 막으면 LCP 요소의 렌더링도 그만큼 밀린다.

**3. 느린 리소스 로드**

LCP 요소가 이미지라면 이미지 자체의 다운로드 시간이 LCP에 직결된다.

**4. 클라이언트 사이드 렌더링**

JS가 다운로드·실행된 후에야 콘텐츠가 나타나는 CSR 구조는 LCP에 불리하다.

<br/>

### Next.js에서 LCP 개선

**`next/image` + `priority`**

LCP 후보가 되는 이미지에는 `priority` 속성을 붙인다. 이 속성이 있으면 `next/image`는 해당 이미지를 `<link rel="preload">` 로 미리 로드한다.

```tsx
import Image from "next/image";

export default function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="히어로 이미지"
      width={1200}
      height={600}
      priority  // LCP 요소 → preload 처리
    />
  );
}
```

`priority` 없이 `lazy` 로딩되면 뷰포트에 들어올 때까지 요청조차 하지 않아 LCP가 크게 밀린다.

**SSR / SSG로 HTML에 콘텐츠 포함**

Next.js의 Server Component나 SSG를 활용하면 초기 HTML에 콘텐츠가 이미 담겨 있다. 브라우저가 JS를 실행하기 전에 LCP 요소를 그릴 수 있다.

```tsx
// CSR — JS 실행 후 콘텐츠 표시 → LCP 불리
"use client";
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch("/api/data").then(...) }, []);
  return <div>{data?.title}</div>;
}

// Server Component — 초기 HTML에 포함 → LCP 유리
export default async function Page() {
  const data = await fetch("/api/data").then(r => r.json());
  return <div>{data.title}</div>;
}
```

**`next/font` 로 폰트 최적화**

웹 폰트가 늦게 로드되면 텍스트 블록이 LCP 후보일 때 LCP가 밀린다. `next/font`는 빌드 타임에 폰트를 다운로드하고 `font-display: swap`을 자동 적용한다.

```tsx
import { Noto_Sans_KR } from "next/font/google";

const notoSans = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "700"] });
```

<br/>

---

## CLS — Cumulative Layout Shift

### 뭘 측정할까

페이지 라이프사이클 동안 발생하는 **예기치 않은 레이아웃 이동의 누적 점수**다.

사용자가 버튼을 누르려는 순간 광고가 나타나 버튼이 밀려 다른 것을 클릭하는 경험을 수치로 표현한 것이다.

<!-- 이미지: CLS 레이아웃 이동 예시
     왼쪽: 이미지 없이 텍스트 먼저 렌더링된 상태 (텍스트 위치 A)
     오른쪽: 이미지 로드 후 텍스트가 아래로 밀린 상태 (텍스트 위치 B)
     이동 거리와 영향 영역을 화살표와 색상 오버레이로 표시
     파일명: cls-layout-shift-example.png -->
![CLS 레이아웃 이동 예시](/assets/Javascript/cls-layout-shift-example.png)

### 점수 계산 방식

```
Layout Shift Score = Impact Fraction × Distance Fraction
```

> **Impact Fraction**: 이동한 요소가 뷰포트에서 차지하는 영역 비율 (이동 전 + 이동 후 합산)
>
> **Distance Fraction**: 가장 많이 이동한 요소의 이동 거리 / 뷰포트 크기

예를 들어 이미지 로드로 인해 뷰포트 절반(0.5)을 차지하는 텍스트가 뷰포트 높이의 25%(0.25)만큼 내려갔다면:
```
0.5 × 0.25 = 0.125 → Needs Improvement 경계
```

### 기준값

| 등급 | 기준 |
|---|---|
| Good | 0.1 이하 |
| Needs Improvement | 0.1 ~ 0.25 |
| Poor | 0.25 초과 |

<br/>

### CLS가 높은 주요 원인

**1. 크기 없는 이미지**

`width`, `height` 속성이 없는 이미지는 로드 전 공간을 차지하지 않는다. 이미지가 로드되면 그 자리를 만들기 위해 아래 요소들이 밀린다.

**2. 동적으로 삽입되는 콘텐츠**

광고, 배너, 쿠키 팝업처럼 나중에 삽입되는 요소가 기존 레이아웃을 밀어낸다.

**3. 웹 폰트 교체 (FOUT)**

fallback 폰트와 웹 폰트의 크기 차이로 텍스트 블록의 높이가 바뀌면 레이아웃이 이동한다.

**4. 애니메이션 중 `top`, `left` 변경**

`top`, `margin` 변경은 Reflow를 유발하고 주변 요소를 밀어낸다.

<br/>

### Next.js / React에서 CLS 개선

**`next/image` — 자동 크기 예약**

`next/image`는 `width`, `height`를 기반으로 `aspect-ratio`를 자동 설정해 이미지 로드 전에도 공간을 예약한다. 이미지가 로드되어도 레이아웃이 흔들리지 않는다.

```tsx
<Image
  src="/photo.jpg"
  alt="사진"
  width={800}
  height={600}  // aspect-ratio: 800/600 자동 설정
/>
```

동적 크기가 필요하면 `fill` + 부모 컨테이너에 `position: relative` + `aspect-ratio` 조합을 쓴다.

```tsx
<div style={{ position: "relative", aspectRatio: "4/3" }}>
  <Image src="/photo.jpg" alt="사진" fill style={{ objectFit: "cover" }} />
</div>
```

**스켈레톤 UI로 공간 선점**

데이터 로딩 중에 실제 콘텐츠와 동일한 크기의 스켈레톤을 먼저 렌더링하면, 데이터가 채워져도 레이아웃이 이동하지 않는다.

```tsx
function PostCard({ post }: { post: Post | null }) {
  if (!post) {
    return <div className="h-48 w-full rounded-lg bg-gray-200 animate-pulse" />;
  }
  return <article className="h-48 w-full">...</article>;
}
```

**`transform`으로 애니메이션**

위치를 이동하는 애니메이션은 `top`/`left` 대신 `transform: translate()`를 사용한다. `transform`은 Composite 단계에서만 처리되어 Reflow를 유발하지 않고 CLS에도 영향을 주지 않는다.

```css
/* 나쁨 — Reflow + CLS 유발 가능 */
.slide-in { animation: slideIn 0.3s; }
@keyframes slideIn { from { top: -20px; } to { top: 0; } }

/* 좋음 — Composite만, CLS 영향 없음 */
.slide-in { animation: slideIn 0.3s; }
@keyframes slideIn { from { transform: translateY(-20px); } to { transform: translateY(0); } }
```

<br/>

---

## INP — Interaction to Next Paint

### 뭘 측정할까

2024년 3월 FID(First Input Delay)를 대체한 새로운 지표다.

FID는 첫 번째 상호작용의 **지연 시간**만 측정했다. INP는 페이지 전체 라이프사이클에서 발생하는 **모든 클릭, 탭, 키 입력**을 추적하고, 그 중 가장 나쁜 응답 시간(상위 퍼센타일)을 점수로 삼는다.

<!-- 이미지: INP 상호작용 처리 단계 다이어그램
     가로 타임라인: 입력 발생 → Input Delay(이벤트 큐 대기) → Processing Time(이벤트 핸들러 실행) → Presentation Delay(렌더링) → 화면 업데이트
     각 구간의 이상적 시간 범위 표시
     파일명: inp-interaction-phases.png -->
![INP 상호작용 단계](/assets/Javascript/inp-interaction-phases.png)

INP는 세 구간으로 나뉜다.

```
[입력 발생]
    ↓
Input Delay       — 메인 스레드가 바빠서 이벤트가 처리를 기다리는 시간
    ↓
Processing Time   — 이벤트 핸들러 실행 시간
    ↓
Presentation Delay — 렌더링 파이프라인 완료까지 걸리는 시간
    ↓
[화면 업데이트]
```

### 기준값

| 등급 | 기준 |
|---|---|
| Good | 200ms 이하 |
| Needs Improvement | 200ms ~ 500ms |
| Poor | 500ms 초과 |

<br/>

### INP가 나쁜 주요 원인

**1. 긴 태스크 (Long Task)**

메인 스레드를 50ms 이상 점유하는 작업을 Long Task라고 한다. Long Task가 실행 중이면 사용자 입력이 들어와도 처리를 대기해야 한다 — 이것이 Input Delay다.

**2. 무거운 이벤트 핸들러**

클릭 한 번에 대규모 상태 업데이트, 복잡한 계산, 동기 DOM 조작이 일어나면 Processing Time이 늘어난다.

**3. 과도한 리렌더링**

React에서 상태 변경이 불필요하게 많은 컴포넌트를 리렌더링하면 Presentation Delay가 커진다.

<br/>

### React / Next.js에서 INP 개선

**`useTransition` — 비긴급 업데이트 분리**

React 18의 `useTransition`은 상태 업데이트를 **긴급(urgent)** 과 **비긴급(transition)** 으로 구분한다.

긴급 업데이트(입력값 반영)는 즉시 처리하고, 비긴급 업데이트(검색 결과 렌더링)는 나중에 처리함으로써 Input Delay 없이 UI가 즉각 반응하는 것처럼 느껴지게 한다.

```tsx
import { useState, useTransition } from "react";

function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value); // 긴급 — 즉시 반영

    startTransition(() => {
      setResults(heavySearch(e.target.value)); // 비긴급 — 여유 있을 때 처리
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultList items={results} />}
    </>
  );
}
```

**`useDeferredValue` — 파생 값 지연**

props나 상태에서 파생된 값을 지연시킬 때 사용한다. `useTransition`이 상태 업데이트를 지연시킨다면, `useDeferredValue`는 값을 지연시킨다.

```tsx
import { useDeferredValue } from "react";

function ProductList({ filter }: { filter: string }) {
  const deferredFilter = useDeferredValue(filter);
  // filter가 빠르게 바뀌어도 deferredFilter는 여유 있을 때 따라간다
  const filtered = expensiveFilter(products, deferredFilter);

  return <ul>{filtered.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

**Long Task 쪼개기 — `scheduler.yield()`**

무거운 동기 작업이 불가피하다면 중간에 메인 스레드를 양보해 다른 입력이 처리될 기회를 만든다.

```js
async function processLargeList(items) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);

    // 50개마다 메인 스레드 양보
    if (i % 50 === 0) {
      await scheduler.yield(); // 또는 new Promise(r => setTimeout(r, 0))
    }
  }
}
```

**불필요한 리렌더링 제거**

```tsx
// 문제: 부모 상태가 바뀔 때마다 List 전체 리렌더링
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveList items={items} /> {/* count와 무관하지만 같이 리렌더링 */}
    </>
  );
}

// 해결: memo로 리렌더링 차단
const ExpensiveList = memo(function ExpensiveList({ items }) {
  return <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
});
```

<br/>

---

## 보조 지표

Core Web Vitals 세 가지 외에도 자주 함께 보는 지표들이 있다.

### TTFB — Time to First Byte

서버에 요청을 보내고 **첫 번째 바이트**를 받기까지 걸린 시간이다. 서버 처리 속도, CDN, 네트워크 지연이 반영된다.

- **Good**: 800ms 이하

<!-- 이미지: 렌더링 전략별 TTFB 비교 타임라인
     SSG / SSR / ISR / CSR 네 줄의 가로 타임라인
     각각의 TTFB 시점, FCP 시점, LCP 시점을 마커로 표시
     SSG가 가장 빠르고 CSR이 가장 느린 구조
     파일명: ttfb-rendering-comparison.png -->
![렌더링 전략별 TTFB 비교](/assets/Javascript/ttfb-rendering-comparison.png)

**Next.js에서 TTFB 줄이기**

| 전략 | TTFB | 설명 |
|---|---|---|
| SSG | 가장 낮음 | 빌드 시 생성된 정적 HTML → CDN에서 즉시 응답 |
| ISR | 낮음 | 주기적으로 재생성. 첫 요청 후 캐시 |
| SSR | 중간 | 매 요청마다 서버 렌더링 |
| CSR | 높음 | HTML은 빠르지만 실제 콘텐츠는 JS 실행 후 |

정적 콘텐츠가 대부분인 블로그·문서 사이트라면 SSG, 자주 바뀌는 콘텐츠는 ISR, 사용자별로 다른 데이터는 SSR이 기준이 된다.

<br/>

### FCP — First Contentful Paint

브라우저가 **DOM에서 텍스트나 이미지를 처음 렌더링**한 시점이다. 사용자 입장에서 "뭔가 로딩 중이구나"를 느끼는 순간이다.

- **Good**: 1.8초 이하

FCP와 LCP 사이 간격이 크다면 FCP 이후 LCP 요소 로딩이 느리다는 뜻이다. 이미지 최적화나 preload가 필요한 신호다.

<br/>

---

## 측정 방법

### Chrome DevTools — Lighthouse

가장 쉽게 시작할 수 있는 방법이다. DevTools → Lighthouse 탭 → Analyze page load.

LCP, CLS, INP 점수와 함께 어떤 요소가 LCP인지, 어떤 이동이 CLS를 유발했는지 구체적으로 알려준다.

**주의**: Lighthouse는 **시뮬레이션 환경**(쓰로틀된 CPU/네트워크)에서 측정한다. 실제 사용자 데이터와 다를 수 있다.

### Chrome DevTools — Performance 탭

실시간 트레이스를 녹화해 LCP 타이밍, Long Task 구간, INP 후보를 프레임 단위로 분석할 수 있다.

INP 분석 시 **Interactions** 섹션에서 각 입력 이벤트의 Input Delay / Processing Time / Presentation Delay를 직접 볼 수 있다.

### web-vitals 라이브러리

실제 사용자 브라우저에서 수집한 **필드 데이터(RUM)** 가 가장 정확하다.

```bash
npm install web-vitals
```

```ts
import { onLCP, onCLS, onINP } from "web-vitals";

onLCP(console.log);
onCLS(console.log);
onINP(console.log);
```

Next.js는 `app/layout.tsx` 또는 `pages/_app.tsx`에서 `reportWebVitals` 훅을 공식 지원한다.

```ts
// pages/_app.tsx
export function reportWebVitals(metric: NextWebVitalsMetric) {
  console.log(metric); // { name, value, id, ... }
  // analytics 서비스로 전송
}
```

App Router에서는 `useReportWebVitals` 훅을 사용한다.

```tsx
"use client";
import { useReportWebVitals } from "next/web-vitals";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    console.log(metric);
  });
  return null;
}
```

<br/>

---

## 정리

| 지표 | 측정 대상 | Good 기준 | 핵심 원인 | 주요 해결책 |
|---|---|---|---|---|
| **LCP** | 주요 콘텐츠 로딩 | 2.5초 이하 | 느린 TTFB, 블로킹 리소스, 느린 이미지 | `priority` 이미지, SSR/SSG, preload |
| **CLS** | 레이아웃 안정성 | 0.1 이하 | 크기 없는 이미지, 동적 삽입 콘텐츠 | `width/height` 지정, 스켈레톤 UI |
| **INP** | 상호작용 응답성 | 200ms 이하 | Long Task, 무거운 핸들러, 과도한 리렌더링 | `useTransition`, `memo`, 태스크 분할 |
| **TTFB** | 서버 응답 속도 | 800ms 이하 | 서버 처리 지연, CDN 없음 | SSG/ISR, CDN 적용 |
| **FCP** | 첫 콘텐츠 표시 | 1.8초 이하 | 렌더 블로킹 리소스 | CSS/JS 최적화, SSR |

성능 개선은 항상 측정 먼저다. Lighthouse와 DevTools Performance 탭으로 병목 지표를 파악한 뒤, 해당 지표의 원인에 집중하는 것이 효율적이다.
