---
title: "[React] Suspense는 로딩 컴포넌트가 아니다"
date: "2026-06-04"
description: "Promise를 throw 한다는 것의 의미, Fiber 내부 동작, Concurrent React·Streaming SSR까지 Suspense의 진짜 정체를 파헤쳐보자"
tags: ["react", "suspense", "fiber", "concurrent", "streaming-ssr", "react18"]
thumbnail: "/assets/thumbnails/react/suspense.png"
---

대부분 Suspense를 "로딩 UI를 보여주는 컴포넌트" 정도로 알고 있다.

틀린 말은 아니지만, 그게 전부라고 생각하면 절반만 이해한 것이다.

실제 Suspense는 React Fiber, Concurrent Rendering, Streaming SSR, Server Components까지 연결되는 React 18 렌더링 모델의 핵심 기반이다.

이번 포스팅에서는 Suspense가 왜 등장했는지부터 내부에서 어떤 일이 일어나는지까지 순서대로 파헤쳐보자.

<br/>

## 기존 React의 비동기 처리 방식

React는 오랫동안 비동기 작업을 직접 처리하지 않았다.

데이터를 가져오는 코드는 대부분 이런 모양이었다.

```tsx
function UserPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser);
  }, []);

  if (!user) return <Spinner />;

  return <UserProfile user={user} />;
}
```

동작은 한다. 하지만 이 방식에는 구조적인 문제가 있다.

<br/>

### Waterfall 문제

Waterfall이란 작업들이 병렬로 처리되지 못하고 순서대로 하나씩 기다리며 실행되는 패턴을 말한다. 폭포수처럼 위에서 아래로 순차적으로 흐른다는 의미에서 붙은 이름이다.

```
컴포넌트 렌더링
      ↓
useEffect 실행
      ↓
API 요청 시작
      ↓
응답 대기 (블로킹)
      ↓
상태 업데이트
      ↓
재렌더링
```

데이터 요청이 렌더링 이후에 시작된다는 게 핵심 문제다.

컴포넌트가 먼저 마운트되고, 그 다음에 데이터를 요청하기 때문에 사용자는 항상 불필요한 대기 시간을 겪는다. 컴포넌트가 중첩될수록 이 waterfall은 더 깊어진다.

![기존 데이터 패칭 흐름](/assets/React/suspense/traditional-fetch-waterfall.png)

<br/>

## Suspense의 핵심 아이디어

Suspense는 매우 단순한 아이디어에서 출발한다.

> **"데이터가 준비되지 않았다면 렌더링을 잠시 멈추자."**

기존에는 개발자가 직접 조건문으로 로딩 상태를 처리했다.

```tsx
if (!user) return <Loading />;
```

Suspense는 이 판단을 React가 대신 처리한다. 개발자는 데이터가 항상 있다고 가정하고 UI를 작성하면 된다.

<br/>

## Promise를 Throw 한다는 의미

Suspense를 이해하는 핵심 개념이다.

React는 Promise를 기다리지 않는다. 대신 **Promise를 던진다(throw).**

```tsx
function UserProfile() {
  const user = resource.read(); // 데이터 없으면 throw promise

  return <div>{user.name}</div>;
}
```

`resource.read()`는 데이터가 아직 없으면 Promise를 throw한다.

처음 보면 이상하게 느껴진다. 왜 throw를 쓸까?

이유는 간단하다. React의 렌더링 루프가 예외를 감지하는 구조를 이미 갖고 있기 때문이다. throw는 렌더링을 즉시 중단하고 상위로 제어권을 넘기는 가장 확실한 방법이다.

<br/>

## Suspense가 Promise를 만났을 때

React는 렌더링 중 예외를 이렇게 처리한다.

```tsx
try {
  renderComponent();
} catch (value) {
  if (isPromise(value)) {
    // Suspense 처리
  } else {
    // Error Boundary 처리
  }
}
```

throw된 값이 Promise라면 오류가 아니라 "아직 준비되지 않은 상태"로 판단한다.

그리고 가장 가까운 Suspense Boundary(Suspense로 감싼 범위)의 fallback(로딩 중 대신 보여줄 UI)을 렌더링한다.

```tsx
<Suspense fallback={<Loading />}>
  <UserProfile />
</Suspense>
```

Promise가 resolve(비동기 작업이 성공적으로 완료)되면 React는 자동으로 UserProfile을 다시 렌더링한다.

![Suspense Promise 처리 흐름](/assets/React/suspense/suspense-promise-flow.png)

```
UserProfile render
      ↓
resource.read() 호출
      ↓
Promise throw
      ↓
React catch
      ↓
Fallback 표시
      ↓
Promise resolve
      ↓
Retry render
      ↓
실제 UI 표시
```

<br/>

## Suspense 직접 구현해보기

실제 React 내부 구현은 캐싱, 에러 처리, 중복 요청 방지 등 복잡한 로직이 얽혀 있어 소스만 봐서는 핵심 원리를 파악하기 어렵다. 그래서 핵심만 뽑아 직접 구현해보는 것이 이해에 더 빠르다.

실제 React와 거의 동일한 원리다.

```tsx
function createResource<T>(promise: Promise<T>) {
  let status: "pending" | "success" = "pending";
  let result: T;

  const suspender = promise.then((value) => {
    status = "success";
    result = value;
  });

  return {
    read() {
      if (status === "pending") throw suspender;
      return result;
    },
  };
}
```

사용하면 이렇게 된다.

```tsx
const userResource = createResource(fetchUser());

function UserProfile() {
  const user = userResource.read();
  return <h1>{user.name}</h1>;
}
```

`read()`를 호출했을 때 데이터가 없으면 suspender(Promise)를 throw하고, 있으면 데이터를 반환한다. Suspense의 본질이 여기에 담겨 있다.

<br/>

## Fiber 내부에서는 무슨 일이 일어날까

Promise가 throw되면 React는 현재 Fiber를 **Suspended** 상태로 변경한다.

```
Fiber Tree

App
 ├ Header
 ├ UserProfile  ← Suspended
 └ Footer
```

중요한 점은 전체 앱이 멈추는 게 아니라는 것이다.

React는 Suspense Boundary 단위로 처리한다. Boundary 내부 컴포넌트만 fallback으로 대체되고, 나머지 트리는 그대로 유지된다.

![Fiber Tree Suspense Boundary 격리](/assets/React/suspense/fiber-suspense-boundary.png)

```tsx
<Suspense fallback={<Loading />}>
  <UserProfile />  {/* 이 부분만 중단 */}
</Suspense>
```

<br/>

## React 소스코드에서는 어떻게 구현될까

실제 React 내부에는 `throwException()` 함수가 있다.

렌더링 도중 Promise가 throw되면 이 함수가 호출되어 해당 Fiber를 Suspended 상태로 표시한다.

```
beginWork  ← Fiber 하나의 렌더링을 시작하는 React 내부 진입점
    ↓
Component render
    ↓
throw Promise
    ↓
throwException()
    ↓
markSuspenseBoundary
    ↓
Fallback render
    ↓
Promise resolve
    ↓
Retry render
```

Promise가 resolve되면 React는 해당 Fiber를 다시 스케줄링(언제 실행할지 예약)해 재렌더링을 시도한다.

이 과정을 **Retry Render**라고 부른다.

<br/>

## Concurrent React와 Suspense

Suspense가 진짜 강력해지는 지점이다.

Concurrent React에서는 낮은 우선순위 렌더링을 중단하고 fallback UI를 빠르게 표시할 수 있다. 그 사이에도 사용자 인터랙션은 계속 처리된다.

```
Render 시작
    ↓
Promise throw
    ↓
Fallback 표시
    ↓
사용자 인터랙션 가능  ← 기존 방식과의 핵심 차이
    ↓
Promise resolve
    ↓
Retry render
    ↓
실제 UI 표시
```

Suspense는 Concurrent React와 함께 설계된 기능이다. React 18 이전의 Suspense는 기능이 제한적이었고, Concurrent React가 도입되면서 본래 의도대로 동작하기 시작했다.

![Concurrent Rendering vs 기존 렌더링 비교](/assets/React/suspense/concurrent-vs-legacy-rendering.png)

<br/>

## Streaming SSR과 Suspense

Suspense는 서버 렌더링도 바꿨다.

기존 SSR(Server Side Rendering, 서버에서 HTML을 미리 만들어 브라우저에 전송하는 방식)은 모든 데이터가 준비될 때까지 기다렸다가 HTML을 한 번에 전송했다.

```
모든 데이터 완료
      ↓
HTML 전체 생성
      ↓
클라이언트 전송
```

Suspense를 사용하면 준비된 부분부터 먼저 전송할 수 있다.

```
Header 완료 → HTML 전송
      ↓
UserData 대기 중 → 로딩 UI 전송
      ↓
UserData 완료 → 추가 HTML 스트리밍
      ↓
Footer 완료 → 추가 HTML 스트리밍
```

사용자는 전체 페이지가 완성될 때까지 기다리지 않아도 된다. TTFB(Time To First Byte)가 줄어들고, 체감 성능이 크게 개선된다.

![Streaming SSR vs 기존 SSR 비교](/assets/React/suspense/streaming-ssr-comparison.png)

<br/>

## 정리

Suspense는 로딩 컴포넌트가 아니다.

React가 비동기 작업을 렌더링 과정 안으로 끌어들이기 위해 만든 메커니즘이다.

| 개념 | 설명 |
| --- | --- |
| throw promise | 데이터 미준비 시 React에 신호를 보내는 방법 |
| Suspense Boundary | fallback 범위를 결정하는 경계 |
| Suspended Fiber | Promise가 throw된 Fiber의 상태 |
| Retry Render | Promise resolve 후 다시 시도하는 렌더링 |
| Concurrent + Suspense | 중단 가능한 렌더링으로 인터랙션 유지 |
| Streaming SSR | 준비된 HTML부터 순차 전송 |

Suspense를 이해하면 React 18 이후의 렌더링 모델이 왜 이런 구조를 가지는지 훨씬 깊게 파악할 수 있다.
