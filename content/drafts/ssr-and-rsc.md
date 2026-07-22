---
title: "SSR과 RSC는 같은 말이 아니다"
date: "2026-07-21"
description: "서버 렌더링(SSR)과 서버 컴포넌트(RSC)를 같은 개념으로 착각했던 이유, 그리고 둘이 실제로 어떤 축에서 다른지 정리"
tags: ["nextjs", "react", "ssr", "rsc", "server-components", "rendering"]
thumbnail: "/assets/thumbnails/nextjs/ssr-and-rsc.png"
---

App Router로 넘어오면서 `page.tsx`에 아무것도 안 붙였는데 서버에서 실행된다는 걸 알고, 그냥 "아 이게 SSR이구나"라고 생각하고 넘어간 시절이 있었다.

그러다 페이지 안에서 링크를 눌러 다른 라우트로 이동했는데, 네트워크 탭에 찍힌 응답이 이상했다.

HTML이 아니었다. `1:HL["...",...]` 같은 낯선 텍스트가 스트림으로 찍혀 있었다.

<!-- 이미지 설명: 브라우저 개발자 도구 네트워크 탭에서 App Router 클라이언트 사이드 네비게이션 시 응답으로 오는 RSC Payload 텍스트를 캡처한 스크린샷 -->
![네트워크 탭에 찍힌 RSC Payload](/assets/NextJS/ssr-and-rsc/rsc-payload-network-tab.png)

이때 처음으로 "SSR과 RSC가 같은 게 아니구나"를 체감했다.

둘 다 "서버"라는 단어가 들어가서 자꾸 하나로 뭉뚱그려지는데, 사실 이 둘은 완전히 다른 질문에 대한 답이다.

- SSR은 **"언제(요청 시점에) 렌더링해서 HTML을 만드는가"** 에 대한 답이고
- RSC는 **"어디서 실행되고, 그 결과가 클라이언트 번들에 포함되는가"** 에 대한 답이다.

이번 포스팅에서는 이 둘을 각각 역사부터 따라가보고, 두 개념이 실제로 어떻게 겹치고 어떻게 갈라지는지 정리해보려 한다.

<br/>

## 먼저 용어 몇 개만 짚고 가자

- **번들(bundle)**: 브라우저가 다운로드해서 실행하는 JS 묶음. 번들이 커질수록 초기 로딩과 파싱/실행 시간이 늘어난다.
- **직렬화(serialization)**: 메모리 상의 객체나 트리 구조를 전송 가능한 문자열/바이너리 형태로 변환하는 것.
- **워터폴(waterfall)**: 작업이 병렬로 처리되지 못하고 하나가 끝나야 다음이 시작되는 순차 실행 패턴. [Suspense 포스팅](/posts/React/suspense)에서 데이터 패칭 워터폴을 자세히 다뤘다.
- **하이드레이션(hydration)**: 서버가 만든 정적 HTML에 React가 이벤트 핸들러를 연결해서 인터랙션 가능한 상태로 만드는 과정. 자세한 내용은 [Hydration 파헤치기](/posts/NextJS/hydration)에 정리해뒀다.
- **리컨실리에이션(reconciliation)**: React가 새로 계산된 트리와 기존 트리를 비교해서 실제로 바뀐 부분만 반영하는 과정.
- **모듈 그래프(module graph)**: 어떤 파일이 어떤 파일을 import하는지를 나타내는 의존성 트리. 번들러가 이 그래프를 따라가면서 최종 번들을 만든다.

이 정도만 알고 가면 충분하다. 나머지는 필요할 때마다 풀어서 설명하겠다.

<br/>

## SSR부터 정리하자

SSR(Server Side Rendering)은 이름 그대로 서버에서 React 컴포넌트를 실행해 HTML을 완성한 뒤 브라우저로 보내는 방식이다. CSR과의 차이는 이미 [Hydration 파헤치기](/posts/NextJS/hydration)에서 다뤘으니, 여기서는 SSR 자체가 어떻게 발전해왔는지에 집중한다.

### renderToString — 통짜 렌더링의 시대

React가 서버 렌더링을 지원하기 시작했을 때 제공한 API는 `renderToString`이었다.

```jsx
import { renderToString } from "react-dom/server";

const html = renderToString(<App />);
// html은 완성된 HTML 문자열 하나
```

이 API의 특징은 단순하다. 트리 전체를 렌더링해서 **문자열 하나를 통째로** 반환한다. 트리 어딘가에서 느린 데이터를 기다리고 있어도, 그 부분이 끝날 때까지 나머지도 같이 기다려야 한다.

<!-- 이미지 설명: renderToString이 트리 전체를 한 번에 렌더링해서 HTML 문자열 하나로 반환하는 흐름을 보여주는 다이어그램 (느린 컴포넌트 하나 때문에 전체 응답이 지연되는 모습 강조) -->
![renderToString 통짜 렌더링](/assets/NextJS/ssr-and-rsc/render-to-string-blocking.png)

트리가 깊고 데이터가 많아질수록 TTFB(Time To First Byte, 서버가 응답의 첫 바이트를 보내기까지 걸리는 시간)가 그대로 늘어난다는 게 문제였다. 그리고 서버가 보낸 HTML은 인터랙션이 안 되는 상태라, 클라이언트 JS가 전부 다운로드되고 실행될 때까지 하이드레이션도 시작되지 않았다.

<br/>

### renderToPipeableStream — 스트리밍 SSR

React 18에서 `renderToPipeableStream`이 등장하면서 SSR의 방식이 바뀌었다.

```jsx
import { renderToPipeableStream } from "react-dom/server";

const { pipe } = renderToPipeableStream(<App />, {
  onShellReady() {
    pipe(response); // 준비된 부분부터 먼저 스트리밍 전송
  },
});
```

핵심은 `Suspense`와의 결합이다. 느린 컴포넌트를 `Suspense`로 감싸두면, React는 그 부분을 fallback으로 먼저 채워서 나머지 HTML을 먼저 전송하고, 느린 부분이 준비되는 대로 추가 HTML을 스트리밍으로 이어 보낸다.

```jsx
<Suspense fallback={<CommentsSkeleton />}>
  <Comments />
</Suspense>
```

이 부분의 내부 동작(Promise를 throw하고 Suspense Boundary 단위로 렌더링이 멈췄다 재개되는 과정)은 [Suspense는 로딩 컴포넌트가 아니다](/posts/React/suspense)에서 훨씬 자세히 다뤘다.

<!-- 이미지 설명: renderToString(전체 완성 후 한 번에 전송)과 renderToPipeableStream(준비된 부분부터 순차 스트리밍 전송)을 나란히 비교하는 타임라인 다이어그램 -->
![통짜 렌더링과 스트리밍 렌더링 비교](/assets/NextJS/ssr-and-rsc/ssr-streaming-comparison.png)

<br/>

### Next.js에서 SSR은 어떻게 다뤄왔나

Pages Router 시절에는 렌더링 시점을 함수 단위로 명시적으로 골랐다.

```jsx
// getServerSideProps — 요청이 올 때마다 서버에서 실행
export async function getServerSideProps() {
  const data = await fetchData();
  return { props: { data } };
}

// getStaticProps — 빌드 시점에 미리 실행 (SSG)
export async function getStaticProps() {
  const data = await fetchData();
  return { props: { data }, revalidate: 60 };
}
```

`getServerSideProps`를 쓰면 SSR, `getStaticProps`를 쓰면 SSG(Static Site Generation)였다. 페이지 하나를 통째로 둘 중 하나로 고르는 구조였고, 이 선택은 라우트 단위였다.

App Router로 오면서 이 경계가 컴포넌트 단위로 훨씬 세밀해졌는데, 이 부분은 뒤에서 RSC와 엮어서 다시 이야기한다.

여기까지가 SSR의 핵심이다. **"요청이 들어온 시점에 서버에서 React를 실행해 HTML을 만든다"** 는 것. 이건 실행 위치(서버)와 실행 시점(요청 시)에 대한 이야기지, 컴포넌트가 클라이언트 번들에 포함되는지 여부와는 아직 아무 관련이 없다.

<br/>

## RSC는 왜 등장했나

React Server Components는 2020년 12월, Dan Abramov와 Sebastian Markbåge가 "Zero-Bundle-Size React Server Components"라는 이름으로 처음 공개했다.

<bookmark url="https://legacy.reactjs.org/blog/2020/12/21/data-fetching-with-react-server-components.html"></bookmark>

당시 제기했던 문제의식은 SSR이 풀지 못하는 다른 종류의 문제였다.

**1. 서버 데이터를 다시 클라이언트에서 가져오는 워터폴**

SSR로 초기 HTML은 채워도, 이후 클라이언트에서 데이터를 다시 요청해야 하는 구조가 반복됐다. `useEffect` 안에서 fetch하고, 그 결과를 기다리는 동안 로딩 스피너가 돈다.

**2. 무거운 서버 전용 라이브러리도 번들에 포함돼야 했다**

마크다운 파서, 이미지 리사이징 라이브러리처럼 서버에서만 실행해도 되는 무거운 패키지를 컴포넌트 안에서 쓰면, 그 패키지 코드 전체가 클라이언트 번들에 그대로 포함됐다. 실제로 브라우저에서 실행될 일이 없는 코드인데도 다운로드는 해야 했다.

```jsx
// 클래식 SPA 방식: 이 무거운 파서가 클라이언트 번들에 그대로 포함된다
import MarkdownParser from "heavy-markdown-parser";

function Post({ raw }) {
  return <div>{MarkdownParser.parse(raw)}</div>;
}
```

**3. API 계층을 따로 만들어야 하는 번거로움**

서버 데이터를 쓰려면 REST든 GraphQL이든 엔드포인트를 만들고, 클라이언트에서 다시 fetch하는 계층을 하나 더 얹어야 했다. 데이터가 이미 서버에 있는데도 한 번 왕복이 더 필요했다.

RSC는 이 문제들을 한 문장으로 압축해서 풀었다.

> **"컴포넌트를 서버에서만 실행하고, 그 컴포넌트 코드 자체는 클라이언트로 아예 보내지 말자."**

```jsx
// Server Component: 무거운 파서를 써도 클라이언트 번들 크기에 영향이 없다
import MarkdownParser from "heavy-markdown-parser";

async function Post({ id }) {
  const raw = await db.posts.find(id); // DB 접근도 서버에서 바로
  return <div>{MarkdownParser.parse(raw)}</div>;
}
```

이 컴포넌트는 서버에서 실행되고, 실행된 **결과만** 클라이언트로 전달된다. `heavy-markdown-parser`도, `db` 클라이언트도 브라우저에 내려가지 않는다. 이게 "Zero-Bundle-Size"라는 이름이 붙은 이유다.

<!-- 이미지 설명: Client Component만 있는 번들과, Server Component를 쓴 경우의 번들을 나란히 비교해서 무거운 서버 전용 라이브러리가 번들에서 빠지는 모습을 보여주는 다이어그램 -->
![Zero-Bundle-Size 개념도](/assets/NextJS/ssr-and-rsc/zero-bundle-size-comparison.png)

<br/>

## RSC Payload — HTML이 아니다

앞서 네트워크 탭에서 봤던 그 낯선 텍스트가 바로 **RSC Payload**다.

Next.js 공식 문서는 이걸 이렇게 설명한다.

> RSC Payload는 렌더링된 React Server Components 트리를 압축된 형태로 표현한 데이터다. 클라이언트의 React가 브라우저 DOM을 갱신하는 데 이 데이터를 사용한다.

RSC Payload에는 대략 이런 정보가 담긴다.

- Server Component가 렌더링된 결과
- Client Component가 들어갈 자리의 표시(placeholder)와, 그 컴포넌트의 JS 파일 참조
- Server Component에서 Client Component로 전달된 props

중요한 건 이게 **HTML도 아니고 JSON도 아니라는 점**이다. React가 클라이언트에서 트리를 조립하기 위해 만든 자체 포맷이고, 사람이 읽기 위한 포맷이 아니다.

```
Server Component 트리
      ↓
서버에서 실행 (DB 조회, 파일 읽기 등)
      ↓
RSC Payload로 직렬화
      ↓
클라이언트로 전송
      ↓
React가 Payload를 읽어 트리 구성
      ↓
Client Component 자리에는 실제 JS 컴포넌트를 꽂아 넣음
```

<!-- 이미지 설명: RSC Payload 안에 담기는 세 가지 정보(서버 컴포넌트 렌더링 결과, 클라이언트 컴포넌트 placeholder, 전달된 props)를 구조적으로 보여주는 다이어그램 -->
![RSC Payload 구성](/assets/NextJS/ssr-and-rsc/rsc-payload-structure.png)

<br/>

## 그래서 최초 로드에서는 SSR과 RSC가 같이 일어난다

App Router에서 페이지에 처음 접속하면 이런 순서로 일이 벌어진다.

```
1. 서버에서 Server Component 실행 → RSC Payload 생성
2. 그 Payload를 바탕으로 HTML을 함께 생성 (이 부분이 SSR)
3. 브라우저가 HTML을 표시 (사용자는 여기서 화면을 본다)
4. JS 다운로드 & 실행
5. RSC Payload로 Client/Server 트리를 조합(reconcile)
6. Client Component만 하이드레이션 → 인터랙션 가능
```

여기까지만 보면 "결국 RSC도 SSR 위에서 도는 거 아닌가"라고 생각하기 쉽다. 최초 로드에서는 맞는 말이다. 둘이 같은 요청 안에서 함께 일어난다.

<br/>

## 하지만 갈라지는 지점이 있다 — 클라이언트 사이드 네비게이션

바로 여기가 이 포스팅의 핵심이다.

App Router 안에서 `<Link>`로 다른 라우트로 이동하면, 서버는 **새 HTML을 만들지 않는다.** 대신 그 라우트의 RSC Payload만 다시 만들어서 응답으로 보낸다.

```
1. 사용자가 Link 클릭
2. 서버는 해당 라우트의 Server Component만 다시 실행
3. RSC Payload만 응답으로 전송 (HTML 없음)
4. 브라우저는 이미 붙어있는 React 트리에 새 Payload를 반영
5. 화면 갱신 (전체 페이지 리로드 없이)
```

내가 네트워크 탭에서 봤던 그 이상한 텍스트가 바로 이 순간의 응답이었다. HTML이 없었던 이유가 여기 있었다.

이 순간을 한 문장으로 정리하면 이렇다.

> **이 네비게이션은 RSC는 쓰지만, SSR은 아니다.**

RSC Payload를 만드는 건 여전히 서버지만, 그 결과로 완성된 HTML 문서를 새로 만드는 과정(SSR)은 이 요청에서 일어나지 않는다. React는 이미 브라우저에 떠 있는 트리 위에 새로 받은 정보를 리컨실리에이션할 뿐이다.

<!-- 이미지 설명: 최초 페이지 로드(HTML + RSC Payload가 함께 만들어짐)와 이후 클라이언트 사이드 네비게이션(RSC Payload만 만들어지고 HTML은 새로 생성되지 않음)을 나란히 비교하는 다이어그램 -->
![최초 로드와 이후 네비게이션의 차이](/assets/NextJS/ssr-and-rsc/initial-load-vs-navigation.png)

이게 SSR과 RSC를 서로 다른 축으로 봐야 하는 이유다.

- SSR은 **"이 요청에서 서버가 HTML을 새로 만드는가"** 의 문제고
- RSC는 **"이 컴포넌트가 서버에서 실행되고, 그 코드가 클라이언트 번들에 없는가"** 의 문제다.

최초 로드에서는 두 축이 겹치지만, 네비게이션 시점에서는 RSC 축만 작동하고 SSR 축은 빠진다.

<br/>

## use client — 서버/클라이언트 모듈 그래프의 경계선

`"use client"`는 파일 상단에 적는 지시어(directive)로, 이 파일부터 시작하는 모듈 그래프 전체를 클라이언트 번들에 포함시키라는 표시다.

```jsx
"use client";

import { useState } from "react";

export default function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{liked ? "♥" : "♡"}</button>;
}
```

여기서 자주 헷갈리는 부분이 있다. `"use client"`를 붙인 파일이 import하는 자식 컴포넌트들도 전부 자동으로 클라이언트 번들에 포함된다는 것이다. 그래서 인터랙션이 필요한 최소 단위에만 `"use client"`를 붙이는 게 번들 크기 관리에 유리하다.

<!-- 이미지 설명: 모듈 그래프 상에서 "use client" 지시어를 기준으로 서버 전용 모듈과 클라이언트 번들에 포함되는 모듈이 나뉘는 경계선을 보여주는 다이어그램 -->
![use client 모듈 그래프 경계](/assets/NextJS/ssr-and-rsc/use-client-boundary.png)

반대로, Client Component 안에서 Server Component를 직접 import해서 쓸 수는 없다. 이걸 시도하면 에러가 난다.

```jsx
"use client";

import ServerOnlyWidget from "./ServerOnlyWidget"; // 에러

export default function Panel() {
  return <ServerOnlyWidget />;
}
```

이유는 명확하다. Client Component 파일이 클라이언트 번들에 포함된다는 건, 그 안에서 import하는 모든 것도 함께 포함돼야 한다는 뜻인데, Server Component 안에는 DB 접근 코드나 비밀 키처럼 클라이언트로 새어나가면 안 되는 코드가 들어있을 수 있다. React는 이 조합 자체를 아예 막아둔다.

대신 `children`이나 props로 Server Component를 "완성된 결과물"로 넘기는 패턴을 쓴다.

```jsx
// Client Component
"use client";

export default function Modal({ children }) {
  const [open, setOpen] = useState(false);
  return open && <div className="modal">{children}</div>;
}

// Server Component (부모)
import Modal from "./Modal";
import Cart from "./Cart"; // Server Component

export default function Page() {
  return (
    <Modal>
      <Cart /> {/* 서버에서 미리 렌더링된 결과가 슬롯으로 꽂힌다 */}
    </Modal>
  );
}
```

이러면 `Cart`는 서버에서 미리 렌더링되고, `Modal`은 그 결과를 그냥 `children`으로 받아서 보여주기만 한다. `Modal` 코드 안에는 `Cart`를 import하는 구문 자체가 없으니 번들 경계가 깨지지 않는다.

<br/>

## Server Actions — RSC가 데이터를 쓰는 방향까지 확장됐다

여기까지는 전부 "서버 → 클라이언트"로 데이터가 흐르는 이야기였다. React 19에서 정식화된 Actions는 반대 방향, 즉 클라이언트에서 서버로 데이터를 보내는 흐름까지 RSC 생태계 안으로 끌어들였다.

```jsx
"use server";

export async function likePost(postId) {
  await db.posts.incrementLikes(postId);
}
```

```jsx
"use client";

import { likePost } from "./actions";

export default function LikeButton({ postId }) {
  return <form action={() => likePost(postId)}><button>좋아요</button></form>;
}
```

`"use server"`가 붙은 함수는 클라이언트에서 호출한 것처럼 보이지만, 실제로는 서버에서 실행되는 원격 프로시저 호출(RPC)에 가깝다. React가 이 호출을 위한 네트워크 요청, 직렬화, 에러 처리를 대신 관리해준다. 예전에는 별도 API 엔드포인트를 만들고 `fetch`로 호출하던 걸, 함수 하나로 대체한 셈이다. 이 부분과 `useActionState`, `useOptimistic` 같은 훅들은 [리액트 버전별 핵심 변화](/posts/React/react-version-history)에서 좀 더 다뤘다.

<br/>

## 자주 헷갈리는 지점들

**Server Component는 왜 `useState`를 못 쓰나**

Server Component는 서버에서 딱 한 번 실행되고 그 결과(RSC Payload)만 전송된 뒤 끝난다. 클라이언트에 상태를 들고 있을 인스턴스 자체가 없다. 상태가 필요한 순간 그 부분만 Client Component로 분리해야 하는 이유가 여기 있다.

**App Router = SSR이라고 봐도 되나**

정확하지 않다. App Router의 기본 렌더링 방식이 "요청마다 서버에서 실행"이라는 점에서 SSR과 겹치는 경우가 많지만, 빌드 시점에 미리 렌더링해두는 정적 생성도 여전히 가능하고, 하나의 페이지 안에서 정적인 부분과 동적인 부분이 함께 스트리밍되는 구조(Partial Prerendering)도 있다. "App Router는 항상 SSR이다"보다는 "컴포넌트 단위로 정적/동적을 섞을 수 있고, 그중 동적으로 처리되는 부분이 SSR과 같은 성격을 가진다"는 쪽이 더 정확하다.

**RSC는 무조건 빠른가**

아니다. Server Component도 요청마다 서버에서 실행 비용이 든다. DB 조회가 느리면 그대로 응답이 느려진다. 그래서 캐싱 전략이 항상 같이 따라붙는다. 결과를 오래 재사용해도 되는 데이터라면 캐시하고, 특정 이벤트가 발생했을 때만 그 캐시를 무효화하는 방식으로 접근한다.

**RSC Payload와 하이드레이션은 같은 건가**

다르다. 하이드레이션은 이미 그려진 HTML에 이벤트 핸들러를 붙이는 과정이고, RSC Payload를 읽어서 트리를 조합하는 건 리컨실리에이션에 가깝다. 최초 로드에서는 이 둘이 거의 동시에 일어나서 헷갈리기 쉽지만, 클라이언트 사이드 네비게이션에서는 하이드레이션 없이 RSC Payload 반영(리컨실리에이션)만 일어난다는 걸 생각하면 구분이 좀 더 명확해진다.

<br/>

## 정리

| 구분 | SSR | RSC |
|---|---|---|
| 답하는 질문 | 언제(요청 시점) 서버가 HTML을 만드는가 | 어디서 실행되고 번들에 포함되는가 |
| 등장 목적 | 초기 로딩 속도, SEO | 번들 크기 축소, 데이터 패칭 단순화 |
| 결과물 | 완성된 HTML | RSC Payload(React 전용 직렬화 포맷) |
| 클라이언트 사이드 네비게이션 시 | 일어나지 않음(새 HTML 없음) | 계속 일어남(Payload는 계속 오감) |
| 관련 API | `renderToString`, `renderToPipeableStream` | Server Component, `"use client"`, `"use server"` |

두 개념을 한 문장으로 정리하면, SSR은 "언제 그리는가"의 문제고 RSC는 "무엇이 클라이언트까지 오는가"의 문제다.

App Router에서 이 둘이 최초 로드 시점에는 겹쳐 보이니까 같은 개념으로 오해하기 쉽지만, 페이지를 이동하는 순간 두 축이 갈라지는 걸 보면 이 둘이 애초에 다른 문제를 풀기 위해 나온 개념이라는 게 훨씬 분명해진다.

<br/>

## 참고

<bookmark url="https://react.dev/reference/rsc/server-components"></bookmark>

<bookmark url="https://legacy.reactjs.org/blog/2020/12/21/data-fetching-with-react-server-components.html"></bookmark>
