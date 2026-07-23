---
title: "SSR과 RSC의 관계"
date: "2026-07-21"
description: "서버 사이드 렌더링(SSR)과 서버 컴포넌트(RSC)을 정리함"
tags: ["nextjs", "react", "ssr", "rsc", "server-components", "rendering"]
thumbnail: "/assets/thumbnails/nextjs/ssr-and-rsc.png"
---

SSAFY에서 최종 프로젝트를 진행할 때, 우리의 기술 스택 결정은 아주 단순했다.

"React는 해봤으니까, 요즘 트렌드인 Next.js 써서 적용해보자!"

의기양양하게 시작했지만, 개발이 진행될수록 이상한 이질감이 들었다. 분명 SSR을 지원한다는 Next.js를 쓰고 있는데, 정작 코드와 페이지 체감은 예전 React 프로젝트를 할 때와 다르지 않았다. Next.js라는 도구를 쥐고도 그냥 파일 기반 라우터로만 소비했던 셈이다.

앞서 Hydration 포스팅에서도 `use client`를 아무 데나 붙여가며 껍데기만 Next.js인 프로젝트를 만들었던 이야기를 꺼낸 적이 있다.

이 경험을 지나고 나서야 알았다. 그때 헷갈렸던 건 사실 SSR 하나가 아니라, SSR과 RSC 두 개였다는 것을. "서버"라는 단어가 들어간다는 이유만으로 둘을 하나로 뭉뚱그려 이해하고 있었을 뿐, 실제로는 완전히 다른 질문에 대한 답이었다.

이번 포스팅에서는 이 둘의 개념을 명확히 하여 정확한 SSR 활용을 목표로, 하나씩 짚어보려 한다.

<br/>

## 용어 설명

들어가기 앞서 알아둬야할 용어들을 정리하고 가자

- **번들(bundle)**: 브라우저가 다운로드해서 실행하는 JS 묶음. 번들이 커질수록 초기 로딩과 파싱/실행 시간이 늘어난다.
- **직렬화(serialization)**: 메모리 상의 객체나 트리 구조를 전송 가능한 문자열/바이너리 형태로 변환하는 것.
- **waterfall**: 작업이 병렬로 처리되지 못하고 하나가 끝나야 다음이 시작되는 순차 실행 패턴.
- **hydration**: 서버가 만든 정적 HTML에 React가 이벤트 핸들러를 연결해서 인터랙션 가능한 상태로 만드는 과정.
- **reconciliation**: React가 새로 계산된 트리와 기존 트리를 비교해서 실제로 바뀐 부분만 반영하는 과정.
- **모듈 그래프(module graph)**: 어떤 파일이 어떤 파일을 import하는지를 나타내는 의존성 트리. 번들러가 이 그래프를 따라가면서 최종 번들을 만든다.


<br/>

## SSR부터 정리하자

SSR(Server Side Rendering)은 이름 그대로 서버에서 React 컴포넌트를 실행해 HTML을 완성한 뒤 브라우저로 보내는 방식이다. 여기서는 SSR 자체가 어떻게 발전해왔는지에 집중한다.

### renderToString — 통으로 렌더링 때리자

React가 서버 렌더링을 지원하기 시작했을 때 제공한 API는 `renderToString`이었다.

DOCS에서는 이를 "HTML 문자열로 React 트리를 렌더한다"로 정의한다.

```jsx
import { renderToString } from "react-dom/server";

const html = renderToString(<App />);
// html은 완성된 HTML 문자열 하나
```
<bookmark url="https://react.dev/reference/react-dom/server/renderToString"></bookmark>


이 API의 특징은 단순하다. 

React 트리 전체를 동기적으로 렌더링해서 **문자열 하나를 통째로** 반환한다. 

스트리밍을 지원하지 않기 때문에, 트리 전체가 완성되기 전까지는 단 한 바이트도 클라이언트로 보낼 수 없다.

Suspense도 온전히 지원하지는 않는다. 

트리 안에 아직 준비되지 않은 컴포넌트(비동기로 데이터를 가져오거나 `lazy`로 정의된 컴포넌트)가 있어도 `renderToString`은 그 데이터를 기다려주지 않는다. 

대신 가장 가까운 Suspense 경계의 fallback을 그 자리에 그대로 HTML로 박아 넣고 끝내버린다. 

그 fallback은 클라이언트에서 JS가 로드되어 다시 렌더링되기 전까지는 실제 콘텐츠로 바뀌지 않는다.

![renderToString 렌더링](/assets/NextJS/ssr-and-rsc/render-to-string-blocking.png)

그래서 서버에서 데이터까지 채워진 완성된 HTML을 받으려면, 렌더링을 시작하기 전에 필요한 데이터를 전부 미리 가져와서 props로 넘겨줘야 했다. 

트리가 깊고 복잡할수록 이 동기 렌더링 자체가 끝나기까지 걸리는 시간이 그대로 TTFB(Time To First Byte, 서버가 응답의 첫 바이트를 보내기까지 걸리는 시간)에 반영된다는 것도 문제였다. 

그리고 서버가 보낸 HTML은 인터랙션이 안 되는 상태라, 클라이언트 JS가 전부 다운로드되고 실행될 때까지 hydration도 시작되지 않았다.

React가 로드되어야 HTML에 이벤트같은 생기를 불어넣을 수 있는 것이기에.

<br/>

### renderToPipeableStream — 스트리밍 SSR

위와 같은 여러 문제점을 안으며 SSR을 시도하며, 드디어 React 18에서 `renderToPipeableStream`이 등장하면서 SSR의 방식이 바뀌었다.

<bookmark url="https://react.dev/reference/react-dom/server/renderToPipeableStream"></bookmark>

```jsx
import { renderToPipeableStream } from "react-dom/server";

const { pipe } = renderToPipeableStream(<App />, {
  onShellReady() {
    pipe(response); // 준비된 부분부터 먼저 스트리밍 전송
  },
});
```

핵심은 `Suspense`와의 결합이다.

이전 `renderToString`에서 가까운 Suspense만을 활용해 fallback을 HTML에 넣기만하고 렌더링을 끝난 데에 반해,

`renderToPiprableStream`에서 느린 컴포넌트를 `Suspense`로 감싸두면, React는 그 부분을 fallback으로 먼저 채워서 나머지 HTML을 먼저 전송하고, 느린 부분이 준비되는 대로 추가적인 HTML을 스트리밍으로 이어 보낸다.

```jsx
<Suspense fallback={<CommentsSkeleton />}>
  <Comments />
</Suspense>
```

이 내부 동작은 Promise를 throw하고 Suspense Boundary 단위로 렌더링이 멈췄다 재개되는 방식으로 이뤄진다.

<!-- 이미지 설명: renderToString(전체 완성 후 한 번에 전송)과 renderToPipeableStream(준비된 부분부터 순차 스트리밍 전송)을 나란히 비교하는 타임라인 다이어그램 -->
![통 렌더링과 스트리밍 렌더링 비교](/assets/NextJS/ssr-and-rsc/ssr-streaming-comparison.png)

<br/>

### Next.js에서 SSR은 어떻게 다뤄왔을까

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

`getServerSideProps`를 쓰면 SSR, `getStaticProps`를 쓰면 SSG(Static Site Generation)였다. 

페이지 하나를 통째로 둘 중 하나로 고르는 구조였고, 이 선택은 라우트 단위였다.

App Router로 오면서 이 경계가 컴포넌트 단위로 훨씬 세밀해졌는데, 이 부분은 뒤에서 RSC와 엮어서 다시 살펴보자.

여기까지가 SSR의 핵심이다. 

**"요청이 들어온 시점에 서버에서 React를 실행해 HTML을 만든다"**. 

이건 실행 위치(서버)와 실행 시점(요청 시)에 대한 이야기지, 컴포넌트가 클라이언트 번들에 포함되는지 여부와는 아직 아무 관련이 없다.

<br/>

## RSC는 어떻게 등장한걸까?

React Server Components는 2020년 12월, Dan Abramov, Lauren Tan, Joseph Savona, Sebastian Markbåge가 "Zero-Bundle-Size React Server Components"라는 이름으로 처음 공개했다.

<bookmark url="https://legacy.reactjs.org/blog/2020/12/21/data-fetching-with-react-server-components.html"></bookmark>

당시 제기했던 문제점은 SSR이 풀지 못하는 다른 종류의 문제였다.

**1. 서버 데이터를 다시 클라이언트에서 가져오는 워터폴**

SSR로 초기 HTML은 채워도, 이후 클라이언트에서 데이터를 다시 요청해야 하는 구조가 반복됐다. `useEffect` 안에서 fetch하고, 그 결과를 기다리는 동안 로딩 스피너가 돈다.

**2. 무거운 서버 전용 라이브러리도 번들에 포함돼야 했다**

마크다운 파서, 이미지 리사이징 라이브러리처럼 "서버에서만 실행해도 되는" 무거운 패키지를 컴포넌트 안에서 쓰면, 그 패키지 코드 전체가 클라이언트 번들에 그대로 포함됐다. 실제로 브라우저에서 실행될 일이 없는 코드인데도 다운로드는 해야 했다.

```jsx
// 클래식 SPA 방식: 이 무거운 파서가 클라이언트 번들에 그대로 포함된다
import MarkdownParser from "heavy-markdown-parser";

function Post({ raw }) {
  return <div>{MarkdownParser.parse(raw)}</div>;
}
```

**3. API 계층을 따로 만들어야 하는 번거로움**

서버 데이터를 쓰려면 REST든 GraphQL이든 엔드포인트를 만들고, 클라이언트에서 다시 fetch하는 계층을 하나 더 얹어야 했다. 데이터가 이미 서버에 있는데도 한 번 왕복이 더 필요했다.

여기서 다음과 같은 방향을 잡게 된다.

> **"컴포넌트를 서버에서만 실행하고, 그 컴포넌트 코드 자체는 클라이언트로 아예 보내지 말자."**

```jsx
// Server Component: 무거운 파서를 써도 클라이언트 번들 크기에 영향이 없다
import MarkdownParser from "heavy-markdown-parser";

async function Post({ id }) {
  const raw = await db.posts.find(id); // DB 접근도 서버에서 바로
  return <div>{MarkdownParser.parse(raw)}</div>;
}
```

이 컴포넌트는 서버에서 실행되고, 실행된 **결과만** 클라이언트로 전달된다. 

`heavy-markdown-parser`도, `db` 클라이언트도 브라우저에 내려가지 않는다. 

이게 "Zero-Bundle-Size"라는 이름이 붙은 이유다.

서버에서만 최대한 컴포넌트를 굴리고 구현해서 클라이언트의 부담을 줄여주자는 것이다.

![Zero-Bundle-Size 개념도](/assets/NextJS/ssr-and-rsc/zero-bundle-size-comparison.png)

<br/>

## RSC Payload — HTML이 아니다

App Router에서 `<Link>`로 다른 라우트를 이동할 때 네트워크 탭을 한 번 열어보자. 요청 목록에 `?_rsc=1e2mu` 같은 낯선 쿼리 파라미터가 붙은 `fetch` 요청들이 찍혀 있는 걸 볼 수 있다.

![네트워크 탭에 찍힌 _rsc 요청](/assets/NextJS/ssr-and-rsc/rsc-payload-network-tab.png)

이 `_rsc`는 아무 의미 없는 문자열이 아니다. 

Next.js는 클라이언트 라우터가 페이지를 이동할 때 `rsc`라는 요청 헤더를 함께 보내서 "이번엔 HTML 대신 RSC Payload를 달라"고 서버에 알리고, `_rsc` 쿼리 파라미터는 그 요청 변형을 캐시 상에서 구분하기 위한 해시값이다. 

즉 같은 라우트라도 최초 진입(HTML 요청)과 이후 이동(RSC 요청)은 서버 입장에서 아예 다른 응답을 만드는 별개의 요청, 별개의 이정표라는 뜻이다.

<bookmark url="https://nextjs.org/docs/app/guides/cdn-caching"></bookmark>

<br/>

이 `_rsc` 요청들의 응답 본문이 바로 **RSC Payload**다.

Next.js 공식 문서는 이걸 이렇게 설명한다.

> RSC Payload는 렌더링된 React Server Components 트리를 간결한 바이너리 형태로 표현한 데이터다. 클라이언트의 React가 브라우저 DOM을 갱신하는 데 이 데이터를 사용한다.

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

![RSC Payload 구성](/assets/NextJS/ssr-and-rsc/rsc-payload-structure.png)

실제로 그 `_rsc` 요청의 Response 탭을 열어보면 이런 식으로 찍혀 있다.

![네트워크 탭에서 확인한 실제 RSC Payload 응답 본문](/assets/NextJS/ssr-and-rsc/rsc-payload-response-body.png)

`1:I[...]`, `:HL[...]` 같은 번호가 매겨진 줄들이 쭉 나열돼 있는데, 각 줄이 트리의 한 조각이다. 

`I[...]`는 어떤 모듈(주로 Client Component)을 `/_next/static/chunks/...js` 경로에서 가져와야 하는지 알려주는 참조고, `:HL[...]`은 그 청크를 미리 로드(preload)하라는 의미이다. 

그리고 `$React.suspense`, `$React.fragment`처럼 `$`로 시작하는 값들은 React가 트리를 구성할 때 알아볼 수 있는 특수 마커라고 한다. 

사람이 눈으로 읽으라고 만든 포맷이 아닌 오로지 React가 이해하기 위한 포맷이다.

<br/>

## 최초 로드에서는 SSR과 RSC가 같이 일어난다

App Router에서 페이지에 처음 접속하면 이런 순서로 일이 벌어진다.

```
1. 서버에서 Server Component 실행 → RSC Payload 생성
2. 그 Payload를 바탕으로 HTML을 함께 생성 (이 부분이 SSR)
3. 브라우저가 HTML을 표시 (사용자는 여기서 화면을 본다)
4. JS 다운로드 & 실행
5. RSC Payload로 Client/Server 트리를 조합(reconcile)
6. Client Component만 하이드레이션 → 인터랙션 가능
```

<br/>

여기까지만 보면 RSC과 SSR 모두 같은 요청 안에서 함께 일어난다.

<br/>

## 갈라지는 지점 - 클라이언트 사이드 네비게이션

바로 여기가 이 포스팅의 핵심이다.

App Router 안에서 `<Link>`로 다른 라우트로 이동하면, 서버는 **새 HTML을 만들지 않는다.** 대신 그 라우트의 RSC Payload만 다시 만들어서 응답으로 보낸다.

```
1. 사용자가 Link 클릭
2. 서버는 해당 라우트의 Server Component만 다시 실행
3. RSC Payload만 응답으로 전송 (HTML 없음)
4. 브라우저는 이미 붙어있는 React 트리에 새 Payload를 반영
5. 화면 갱신 (전체 페이지 리로드 없이)
```

<br/>

앞서 살펴본 `?_rsc=` 요청이 바로 이 때 받았던 응답이다. 

애초에 HTML을 요청한 게 아니었으니, 응답에 HTML이 없었던 이유가 밝혀졌다.

이 순간을 한 문장으로 정리하면 이렇다.

> **이 네비게이션은 RSC는 쓰지만, SSR은 아니다.**

RSC Payload를 만드는 건 여전히 서버지만, 그 결과로 완성된 HTML 문서를 새로 만드는 과정(SSR)은 이 요청에서 일어나지 않는다. React는 이미 브라우저에 떠 있는 트리 위에 새로 받은 정보를 `reconcilation`할 뿐이다.

이게 SSR과 RSC를 서로 다른 축으로 봐야 하는 이유다.

- SSR은 **"이 요청에서 서버가 HTML을 새로 만드는가"** 의 문제고
- RSC는 **"이 컴포넌트가 서버에서 실행되고, 그 코드가 클라이언트 번들에 없는가"** 의 문제다.

최초 로드에서는 두 축이 겹치지만, 네비게이션 시점에서는 RSC 축만 작동하고 SSR 축은 빠진다.

<br/>

## use client — 서버/클라이언트 모듈 그래프의 경계선

`"use client"`는 파일 상단에 적는 지시어(directive)로, 이 파일부터 시작하는 모듈 그래프 전체를 클라이언트 번들에 포함시키라는 표시다.

쉽게, "여기서부터 시작하는 아래 컴포넌트들은 모조리 클라이언트 사이드 렌더링을 하겠다"라는 지시문이다.

SSR과 RSC를 잘 이해하지 못해 왜 이벤트를 넣는 곳마다, 혹은 모듈을 붙이는 곳마다 use client를 붙이라고 지시하는거지 하고 엉망으로 코드를 짜던 때가 있었는데, 피드백을 달게 받고 나서부턴 제대로 인식하고 분류하게 된 범위가 이곳이다..

```jsx
"use client";

import { useState } from "react";

export default function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{liked ? "♥" : "♡"}</button>;
}
```

여기서 주의깊게 봐야할 점은 `"use client"`를 붙인 파일이 import하는 자식 컴포넌트들도 전부 자동으로 클라이언트 번들에 포함된다는 것이다. 

그래서 인터랙션이 필요한 최소 단위에만, 애먼 자식 컴포넌트들이 줄줄이 달리지 않는 범위를 잡고 `"use client"`를 붙이는 게 번들 크기 관리에 유리하다.

반대로, Client Component 안에서 Server Component를 직접 import해서 쓰는 건 지원되지 않는다.

```jsx
"use client";

import ServerOnlyWidget from "./ServerOnlyWidget"; // 문제 발생

export default function Panel() {
  return <ServerOnlyWidget />;
}
```

이유는 명확하다. `"use client"` 파일의 모듈 그래프에 포함된 모듈은 전부 클라이언트 번들에 포함되어 브라우저에서도 그대로 실행되는데, Server Component 쪽에는 이걸 버틸 수 없는 코드가 섞여 있는 경우가 많다.

- Server Component 안에는 DB 접근 코드나 비밀 키처럼 브라우저에 존재하지 않거나 새어나가면 안 되는 코드.
- Server Component는 컴포넌트 본문에서 곧바로 `await`를 쓸 수 있지만, Client Component에서는 지원되지 않는 방식

그래서 이런 경우에는 빌드 에러나 런타임 에러로 이어지는 경우가 많다.

대신 `children`이나 props로 Server Component를 "완성된 결과물"로 넘기는 패턴을 쓴다.

```jsx
// Client Component
"use client";

import { useState } from "react";

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

이러면 `Cart`는 서버에서 미리 렌더링되고, `Modal`은 그 결과를 바로 `children`에 받아서 보여주기만 한다. 

`Modal` 코드 안에는 `Cart`를 import하는 구문 자체가 없으니 번들 경계가 깨지지 않는다.

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

`"use server"`가 붙은 함수는 클라이언트에서 호출한 것처럼 보이지만, 실제로는 서버에서 실행되는 원격 프로시저 호출(RPC)에 가깝다.

React가 이 호출을 위한 네트워크 요청, 직렬화, 에러 처리를 대신 관리해준다. 

예전에는 별도 API 엔드포인트를 만들고 `fetch`로 호출하던 것들을 함수 하나로 대체한 셈이다.

<br/>

## 자주 헷갈리는 지점들

아래는 AI 에이전트와 검색을 통해 궁금했던 질문들에 답변을 받은 것들이다.

**Server Component는 왜 `useState` hook를 못 쓸까**

Server Component는 서버에서 딱 한 번 실행되고 그 결과(RSC Payload)만 전송된 뒤 끝난다. 클라이언트에 상태를 들고 있을 인스턴스 자체가 없다. 상태가 필요한 순간 그 부분만 Client Component로 분리해야 하는 이유가 여기 있다.

**App Router = SSR이라고 봐도 되는걸까?**

정확하지 않다. 

App Router의 기본 렌더링 방식이 "요청마다 서버에서 실행"이라는 점에서 SSR과 겹치는 경우가 많지만, 빌드 시점에 미리 렌더링해두는 정적 생성도 여전히 가능하고, 하나의 페이지 안에서 정적인 부분과 동적인 부분이 함께 스트리밍되는 구조(Partial Prerendering)도 있다. 

"App Router는 항상 SSR이다"보다는 "컴포넌트 단위로 정적/동적을 섞을 수 있고, 그중 동적으로 처리되는 부분이 SSR과 같은 성격을 가진다"는 쪽이 더 정확하다.

**RSC는 무조건 빠른건가?**

아니다. Server Component도 요청마다 서버에서 실행 비용이 든다. DB 조회가 느리면 그대로 응답이 느려진다. 그래서 캐싱 전략이 항상 같이 따라붙는다. 결과를 오래 재사용해도 되는 데이터라면 캐시하고, 특정 이벤트가 발생했을 때만 그 캐시를 무효화하는 방식으로 접근한다.

**RSC Payload와 하이드레이션은 같은 과정이라고 봐도 될까?**

다르다. 

하이드레이션은 이미 그려진 HTML에 이벤트 핸들러를 붙이는 과정이고, RSC Payload를 읽어서 트리를 조합하는 건 React의 `Reconcilation`에 가깝다.

 최초 로드에서는 이 둘이 거의 동시에 일어나서 헷갈리기 쉽지만, 클라이언트 사이드 네비게이션에서는 하이드레이션 없이 RSC Payload 반영(Reconcilation)만 일어난다는 걸 생각하면 구분이 좀 더 명확해진다.

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
