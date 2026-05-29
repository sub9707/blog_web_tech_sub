---
title: "Hydration 파헤치기"
date: "2026-05-30"
description: "NextJS의 hydration에 대해 알아보자"
tags: ["nextjs", "react", "hydration", "ssr", "csr", "rsc"]
thumbnail: "/assets/thumbnails/ccd8ceb2-382a-4b47-bd5b-21b1134ba839.png"
---

처음 ReactJS로만 화면 개발을 시작할 때, NextJS라는 ReactJS 프레임워크를 접하게 되었고,

NextJS에 대해 왜 이 프레임워크를 사용하고 SSR을 적절히 사용하지 못하던 때가 있었다.

동작하지 않는 컴포넌트에 use client 떡칠을 하며 클라이언트 컴포넌트만 찍어내는 "React스러운" 개발만을 아둔하게 하는 동안

자주 마주하는 오류가 있었다.

![Hydration-error](/assets/NextJS/Hydration-error.png)

`Hydration Failed 에러`였다.

당시에는 ReactJS대로 제대로 개발을 했는데 대체 왜 이런 에러가 발생하는지 몰랐고,

에러를 숨기거나 제거하는데에만 급급해 근본적인 원인이나 원리를 파악하지 않으려했던 부끄러운 시간이 있었다.

이번 포스팅에서는 NextJS의 Hydration에 대해 알아보고, NextJS는 왜 이 기능을 사용하는건지, 무엇을 위해 존재하는 것인지 파헤쳐보자.

<br />

## 먼저 SSR을 이해해야 한다

Hydration을 이해하려면 SSR(Server Side Rendering)이 왜 등장했는지부터 보는 게 빠르다.

기본적인 React SPA는 이런 흐름으로 동작한다.

```txt
브라우저 접속
→ JS 다운로드
→ React 실행
→ 화면 생성
```

브라우저가 직접 React를 실행해서 화면을 만드는 방식이다. 이걸 **CSR(Client Side Rendering)** 이라고 한다.

![CSR 흐름](/assets/NextJS/csr-flow.png)

<br />

### CSR의 문제점

초기 React SPA는 구조가 단순하고 개발하기도 편했다. 그런데 실서비스로 쓰기엔 몇 가지 뚜렷한 단점이 있었다.

**1. 초기 로딩이 느리다**

브라우저가 JS를 전부 다운로드하고 실행해야 화면이 나타난다. 번들 사이즈가 커질수록 그 시간도 길어진다.

**2. SEO가 약하다**

초기 HTML 자체가 거의 비어있다.

```html
<body>
  <div id="root"></div>
</body>
```

검색 엔진 크롤러 입장에서는 콘텐츠를 읽을 수가 없다. 블로그나 커머스처럼 검색 노출이 중요한 서비스라면 치명적인 문제다.

<br />

## 그래서 나온 게 SSR이다

SSR은 서버에서 먼저 HTML을 완성해서 브라우저로 보내는 방식이다.

```txt
서버에서 React 렌더링
→ 완성된 HTML 생성
→ 브라우저에 전달
```

사용자는 JS가 실행되기 전에도 화면을 바로 볼 수 있다.

예를 들어 이런 컴포넌트가 있다면:

```jsx
export default function Page() {
  return <h1>Hello Next.js</h1>;
}
```

서버는 이걸 실행해서 아래 HTML을 만들어 브라우저에 내려준다.

```html
<h1>Hello Next.js</h1>
```

화면이 훨씬 빠르게 보이고, 크롤러도 콘텐츠를 읽을 수 있게 된다.

![SSR 흐름](/assets/NextJS/ssr-flow.png)

<br />

## 그런데 문제가 하나 생긴다

서버가 HTML을 만들어줬지만, 그 HTML은 사실 그냥 **정적인 문자열**에 가깝다.

React가 브라우저에서 아직 실행된 상태가 아니기 때문에:

- 버튼 클릭
- state 변경
- 이벤트 처리

이런 React 기능들은 아직 동작하지 않는다.

화면은 보이는데, 아무것도 클릭이 안 되는 상태라고 보면 된다.

<br />

## 여기서 Hydration이 등장한다

Hydration은 한 마디로 이렇게 설명할 수 있다.

> 서버가 만든 HTML 위에 React가 다시 연결되는 과정

브라우저에서 React가 실행되면서:

- 이벤트 핸들러 연결
- 상태(state) 초기화
- Fiber 트리 생성
- Virtual DOM 연결

을 수행하고, 그제서야 진짜 "동작하는 React 앱"이 된다.

<br />

### Hydration 흐름 요약

```txt
1. 서버에서 HTML 생성
2. 브라우저가 HTML 표시  ← 사용자가 화면을 본다
3. JS 다운로드
4. React 실행
5. 기존 HTML과 React 트리 비교 + 연결
6. 인터랙션 가능 상태가 됨  ← 이제 클릭도 된다
```

이 전체 과정이 Hydration이다.

![Hydration 흐름](/assets/NextJS/hydration-flow.png)

<br />

### 이름이 왜 Hydration일까

직역하면 "수분 공급"이다. 조금 뜬금없어 보이지만 나름 적절한 비유다.

React 팀은 정적인 HTML에 "생명"을 불어넣는 느낌으로 이 용어를 사용했다.

```txt
정적 HTML + React 연결 = 살아있는 UI
```

말라있던 것에 물을 주는 것처럼, 동작 없던 HTML에 React 기능을 채워 넣는다는 뜻이다.

<br />

## Hydration은 새로 렌더링하는 게 아니다

여기서 많이 헷갈리는 부분이 있다.

Hydration은 DOM을 다시 만드는 과정이 아니다.

서버가 이미 만든 DOM이 있고, React는 브라우저에서 컴포넌트를 다시 실행한 결과와 그 DOM을 **비교**한다.

> "내가 렌더링하면 이렇게 나와야 하는데, 서버 DOM도 그렇게 되어 있나?"

일치하면 DOM을 건드리지 않고 이벤트만 붙인다. 기존 DOM을 최대한 재사용하는 방식이다.


![Hydration 비교 과정](/assets/NextJS/hydration-compare.png)

<br />

## Hydration Mismatch

드디어 맨 처음 그 에러 이야기다.

**Hydration Mismatch**는 서버가 렌더링한 HTML과 클라이언트에서 React가 렌더링한 결과가 다를 때 발생한다.

```txt
서버 렌더링 결과 ≠ 클라이언트 렌더링 결과  →  Hydration Failed
```

React가 비교를 했더니 두 결과가 달라서, 어디에 이벤트를 붙여야 할지 알 수 없는 상황이 된 것이다.

<br />

### 자주 발생하는 케이스

**1. 날짜 / 시간 사용**

```jsx
export default function Page() {
  return <p>{new Date().toLocaleString()}</p>;
}
```

서버에서 렌더링된 시간과 클라이언트에서 React가 실행된 시간이 다르다. 당연히 mismatch가 난다.

**2. `Math.random()` 같은 무작위 값**

```jsx
export default function Page() {
  return <p>{Math.random()}</p>;
}
```

서버와 클라이언트에서 값이 달라진다.

**3. `window`, `localStorage` 등 브라우저 전용 API**

```jsx
export default function Page() {
  return <p>{window.innerWidth}</p>;
}
```

서버에는 `window`가 없다. 서버에서 렌더링할 때 에러가 나거나, 클라이언트와 다른 결과를 만든다.

**4. 잘못된 HTML 구조**

```jsx
// p 태그 안에 div는 HTML 스펙상 허용되지 않는다
<p>
  <div>내용</div>
</p>
```

브라우저가 HTML을 파싱하면서 구조를 수정하면, React가 예상한 DOM과 달라져서 mismatch가 생긴다.

<br />

## 어떻게 해결할까

**`useEffect`로 클라이언트 전용 로직 분리**

```jsx
'use client';

import { useEffect, useState } from 'react';

export default function Page() {
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleString());
  }, []);

  return <p>{time}</p>;
}
```

서버에서는 빈 문자열로 렌더링하고, 클라이언트에서 마운트된 후에 값을 채운다. 서버/클라이언트 결과가 일치한다.

**`suppressHydrationWarning` 옵션**

정말 어쩔 수 없이 서버/클라이언트 결과가 다를 수밖에 없는 경우, 해당 요소에만 경고를 억제할 수 있다.

```jsx
<p suppressHydrationWarning>{new Date().toLocaleString()}</p>
```

다만 이 옵션은 부분적으로만 동작하고, 근본적인 해결책은 아니다. 남발하면 안 된다.

<br />

## 정리

Hydration이 처음엔 낯설고 왜 에러가 나는지 이해가 안 됐는데, 흐름을 알고 나면 생각보다 단순하다.

| 단계 | 설명 |
|------|------|
| SSR | 서버에서 HTML 완성 |
| 전달 | 브라우저가 HTML 표시 |
| Hydration | React가 HTML과 연결 |
| 완료 | 인터랙션 가능 상태 |

핵심은 **서버와 클라이언트의 렌더링 결과가 일치해야 한다**는 것이다.

그 결과가 다를 때 Hydration Mismatch가 발생하고, 원인은 대부분 날짜/시간, 랜덤값, 브라우저 전용 API 중 하나다.

Next.js를 처음 쓸 때 `use client`를 달아서 해결했던 경험이 있다면, 사실 그건 Hydration을 아예 건너뛴 것에 가깝다. 이 개념을 이해하고 나면 어디에 서버 컴포넌트를 쓰고, 어디서 클라이언트로 내려야 하는지 판단이 훨씬 자연스러워진다.
