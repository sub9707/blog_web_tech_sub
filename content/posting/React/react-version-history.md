---
title: "리액트 버전별 핵심 변화와 개발 문화의 전환"
date: "2026-07-06"
description: "React 0.3부터 19까지, 버전별 정리"
tags: ["react", "history", "hooks", "concurrent", "server-components", "new-features"]
thumbnail: "/assets/thumbnails/react-version.png"
---

React는 2013년 공개 이후 API를 크게 세 번 갈아엎었다.

클래스 컴포넌트에서 Hooks로, 동기 렌더링에서 Concurrent Rendering으로, 클라이언트 전용에서 Server Components로.

각 전환은 그 당시 방식이 어디서 한계에 부딪혔는지에 대한 나름의 답이었다.

버전 번호를 외우는 것보다는 이 흐름을 이해하는 게 훨씬 중요하다.

왜 바뀌었고, 그 결과 개발자의 일상 코드가 어떻게 달라졌고, 무엇을 버리고 무엇을 새로 채택하게 됐는지를 버전 순서대로 정리해봤다.

<br/>

## 시작 전에, 용어부터 가볍게 짚고 가자

- **Virtual DOM**: 실제 브라우저 DOM을 직접 조작하는 대신, 자바스크립트 객체로 UI 구조를 먼저 만들어두고 이전 상태와 비교해서 바뀐 부분만 실제 DOM에 반영하는 방식. 매번 화면 전체를 다시 그리는 것보다 훨씬 효율적이다.
- **mixin**: 여러 컴포넌트에서 공통으로 쓰는 로직을 하나로 묶어 여러 컴포넌트에 섞어 넣는 초기 React의 코드 재사용 방식. 여러 mixin을 동시에 쓰면 어떤 mixin이 어떤 값을 바꿨는지 추적하기 어려워지는 문제가 있었다.
- **HOC(Higher-Order Component)**: 컴포넌트를 인자로 받아서, 기능이 추가된 새 컴포넌트를 반환하는 함수. 컴포넌트를 감싸는 함수라고 생각하면 된다.
- **Render Props**: 컴포넌트가 자신의 상태나 로직을 자식에게 넘겨줄 때, `children`이나 `render`라는 이름의 prop에 함수를 전달해서 쓰는 패턴.
- **wrapper hell**: HOC나 Render Props를 여러 겹 겹쳐 쓰다 보면, 실제 화면에는 나타나지도 않는 컴포넌트 래퍼(감싸는 컴포넌트)들이 트리 구조 안에 계속 쌓이는 현상. 디버깅할 때 진짜 컴포넌트를 찾기 어려워진다.
- **Suspense**: 데이터를 아직 다 불러오지 못한 컴포넌트가 있을 때, 그 부분만 로딩 중 화면(fallback)으로 대신 보여주도록 React에게 알려주는 기능.
- **Concurrent Rendering(동시성 렌더링)**: 화면을 그리는 작업에도 우선순위를 매겨서, 급한 작업(예: 타이핑 반응)이 급하지 않은 작업(예: 목록 갱신)보다 먼저 처리되도록 하는 렌더링 방식.
- **낙관적 업데이트(optimistic update)**: 서버 응답을 기다리지 않고 일단 성공할 거라고 가정하고 화면부터 업데이트하는 방식. 실제로 실패하면 다시 원래대로 되돌린다.

<br/>

## React 0.3 ~ 0.14 (2013~2015)

2013년 JSConf US에서 Facebook의 Jordan Walke가 React를 처음 공개했을 때 반응은 냉담했다.

HTML을 JS 안에 섞어 쓰는 JSX가 안티 패턴처럼 보였기 때문이다.

![2013년 JSConf US, Jordan Walke의 React 첫 발표 캡쳐 - Youtube](/assets/React/jsconf-2013-react-reveal.png)

<bookmark url="https://www.youtube.com/watch?v=5fG_lyNuEAw"></bookmark>

```jsx
// 초기 React — createClass 방식
var Counter = React.createClass({
  getInitialState: function () {
    return { count: 0 };
  },
  increment: function () {
    this.setState({ count: this.state.count + 1 });
  },
  render: function () {
    return React.createElement('button', { onClick: this.increment }, this.state.count);
  },
});
```

**왜 등장했을까**

당시 Backbone.js, AngularJS의 양방향 바인딩은 애플리케이션이 커질수록 무엇이 무엇을 바꿨는지 추적하기 어려워지는 문제가 있었다(AngularJS의 Dirty Checking 성능 문제도 한몫했다).

React는 `UI = f(state)`라는 단순한 원칙과 Virtual DOM으로 이 문제를 풀었다.

상태가 바뀌면 전체를 다시 그리듯 선언하고, 실제 DOM에는 React가 알아서 최소한의 변경만 반영하는 방식이다.

**DX 변화**

처음엔 오히려 나빠졌다.

JSX를 쓰려면 별도 빌드 파이프라인(초기엔 JSTransform, 이후 Babel)이 필요했고, `createClass`의 `this` 바인딩도 장황했다.

<br/>

## React 15 (2016) — ES6 클래스 시대

`React.createClass` 대신 ES6 `class` 문법이 권장 방식이 됐다.

```jsx
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this); // 수동 바인딩 필요
  }
  increment() {
    this.setState({ count: this.state.count + 1 });
  }
  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}
```

**왜 바뀌었을까**

ES6가 표준화되면서 자바스크립트 자체에 클래스 문법이 생겼다.

`createClass`가 제공하던 자동 바인딩이나 mixin 같은 기능은 동작이 눈에 잘 안 보인다는(명시적이지 않다는) 비판을 받았고, React 팀은 표준 클래스 문법 쪽으로 방향을 틀었다.

**버려진 것**: `createClass`와 mixin 패턴.

mixin은 이름 충돌이 잦고 어떤 mixin이 상태를 바꾸는지 추적하기 어려워서 결국 밀려났고, 그 자리를 HOC(Higher-Order Component)와 Render Props가 대신했다.

```jsx
// HOC 패턴 — mixin의 대안으로 떠오름
function withLoading(Component) {
  return function WrappedComponent({ isLoading, ...props }) {
    if (isLoading) return <Spinner />;
    return <Component {...props} />;
  };
}

// Render Props 패턴
function DataFetcher({ render }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetchData().then(setData); }, []);
  return render(data);
}
```

<br/>

## React 16 (2017) — Fiber, 아키텍처의 전면 재작성

React 16은 렌더링 엔진 자체를 새로 짰는데, 이 새 아키텍처의 이름이 **Fiber**다.

**왜 바뀌었을까**

기존(Stack) 렌더러는 한 번 렌더링을 시작하면 중간에 멈출 수 없었다.

그래서 컴포넌트 트리가 깊어지면 메인 스레드를 오래 붙잡아버려서 애니메이션이 끊기고 입력이 밀리는 문제가 있었다.

Fiber는 렌더링 작업을 작은 단위로 쪼개서, 우선순위가 높은 작업(사용자 입력)이 중간에 끼어들 수 있게 만들었다.

이때부터 React는 언젠가 비동기로 렌더링할 수 있는 구조적 기반을 갖췄고, 이 기반이 훗날 React 18의 Concurrent Rendering으로 이어진다.

같은 버전에서 실무에 바로 영향을 준 기능들도 같이 들어왔다.

```jsx
// Fragment — 불필요한 wrapper div 없이 여러 요소 반환
function Item() {
  return (
    <>
      <dt>Term</dt>
      <dd>Description</dd>
    </>
  );
}

// Error Boundary — 하위 트리 에러가 앱 전체를 무너뜨리지 않게
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <FallbackUI />;
    return this.props.children;
  }
}

// Portal — DOM 트리 밖으로 렌더링(모달 등에 필수)
ReactDOM.createPortal(<Modal />, document.getElementById('modal-root'));
```

**DX 변화**

렌더링 에러 하나가 앱 전체를 하얗게 만드는 일이 줄었다.

모달/툴팁을 구현할 때 겪던 `z-index` 전쟁이나 DOM 트리 위치 문제도 Portal 덕분에 한결 정리됐다.

<br/>

## React 16.3~16.8 (2018) — Context 정식화와 Hooks의 등장

**Context API 재설계 (16.3)**

기존 Context는 공식 문서에 "쓰지 마세요"라고 적혀 있을 정도로 불안정했다.

16.3에서 `createContext`/`useContext` 기반의 새 API가 나오면서, Props Drilling(필요하지도 않은 중간 컴포넌트들이 하위 컴포넌트에 값을 전달하려고 props를 계속 받아서 넘겨주기만 하는 문제)에 처음으로 공식적인 해법이 생겼다.

```jsx
const ThemeContext = React.createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}
```

**Hooks (16.8) — React 역사상 가장 큰 API 전환**

2018년 10월 Dan Abramov가 React Conf에서 Hooks를 발표했을 때, 이번엔 청중의 반응이 뜨거웠다.

```jsx
// 클래스 컴포넌트
class Counter extends React.Component {
  state = { count: 0 };
  componentDidMount() { document.title = `Count: ${this.state.count}`; }
  componentDidUpdate() { document.title = `Count: ${this.state.count}`; }
  render() {
    return <button onClick={() => this.setState((s) => ({ count: s.count + 1 }))}>{this.state.count}</button>;
  }
}

// Hooks로 전환
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = `Count: ${count}`; }, [count]);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

**왜 등장했을까**

클래스 컴포넌트에는 세 가지 고질적인 문제가 있었다.

1. **로직 재사용의 어려움**: 상태 관련 로직을 재사용하려면 HOC나 Render Props를 써야 했는데, 둘 다 컴포넌트 트리에 불필요한 depth를 추가했다(wrapper hell).
2. **거대해지는 생명주기 메서드**: 서로 관련 없는 로직들이 `componentDidMount` 하나에 뒤섞였다. 구독 설정, 데이터 패칭, 로깅이 한 메서드 안에 같이 있는 식이다.
3. **`this` 바인딩의 혼란**: 클래스 필드 문법이 나오기 전에는 메서드마다 `.bind(this)`를 해줘야 했고, 깜빡하기 쉬웠다.

Hooks는 함수 컴포넌트 안에서 상태와 생명주기를 다룰 수 있게 하면서 이 세 문제를 한 번에 해결했다.

특히 **커스텀 훅**은 상태 로직을 컴포넌트에서 완전히 분리해서 재사용할 수 있게 해줬다.

```jsx
// 커스텀 훅 — HOC/Render Props가 하던 일을 훨씬 단순하게 대체
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}
```

**버려진 것 / 새로 선택한 것**

| 이전 | 이후 | 이유 |
|---|---|---|
| 클래스 컴포넌트 + 생명주기 메서드 | 함수 컴포넌트 + Hooks | 로직 재사용, 코드 응집도 |
| HOC / Render Props | 커스텀 훅 | wrapper depth 없이 로직 재사용 |
| mixin(이미 16 이전에 폐기) | 커스텀 훅 | 명시적 의존성, 충돌 없음 |
| Enzyme의 `shallow` 렌더링 | React Testing Library | 구현 세부사항이 아닌 사용자 관점 테스트 지향과 맞물려 확산 |

**DX 변화**

컴포넌트 파일이 짧아졌고, "이 로직을 재사용하려면 구조를 어떻게 짜야 하나"라는 고민이 커스텀 훅 하나로 단순해졌다.

다만 `useEffect`의 의존성 배열은 의존성 누락, 무한 루프 같은 새로운 종류의 버그를 만들어내는 원인이 되기도 했다.

<br/>

## React 16.6 — Lazy, Suspense(초기), memo

```jsx
// 코드 스플리팅
const ProfilePage = React.lazy(() => import('./ProfilePage'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProfilePage />
    </Suspense>
  );
}

// 불필요한 리렌더링 방지
const Row = React.memo(function Row({ item }) {
  return <li>{item.name}</li>;
});
```

이때의 Suspense는 코드 스플리팅(지연 로딩)만 지원했다.

데이터 패칭까지 지원하는 건 React 18에 가서였다.

<br/>

## React 17 (2020) — "새 기능 없는" 업그레이드

React 17은 의도적으로 새 기능을 거의 넣지 않았다.

React 팀이 밝힌 목표는 점진적 업그레이드(gradual upgrade)를 가능하게 만드는 것이었고, 한 페이지 안에서 여러 React 버전이 공존할 수 있도록 이벤트 위임 방식을 `document`에서 루트 DOM 컨테이너로 옮겼다.

**왜 바뀌었을까**

대규모 앱(마이크로 프론트엔드 등)에서는 React를 한 번에 전체 업그레이드하기가 현실적으로 어려웠다.

기능 추가보다는 미래의 전환을 쉽게 만들어두는 인프라성 릴리스였던 셈이다.

<br/>

## React 18 (2022) — Concurrent Rendering, 두 번째 혁명

Fiber가 5년 전에 깔아둔 기반이 여기서 실제로 쓰이기 시작했다.

**Automatic Batching — 모든 상태 업데이트를 배치 처리**

```jsx
// React 17 이전: setTimeout/Promise 안에서는 배치 처리 안 됨(리렌더링 2번)
setTimeout(() => {
  setCount((c) => c + 1);
  setFlag((f) => !f);
  // React 17: 리렌더링 2번 / React 18: 자동으로 배치되어 리렌더링 1번
}, 1000);
```

**Transitions — 긴급/비긴급 업데이트 구분**

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    setQuery(e.target.value); // 긴급: 입력창은 즉시 반응
    startTransition(() => {
      setSearchResults(search(e.target.value)); // 비긴급: 결과 목록은 늦게 반영돼도 됨
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultList />}
    </>
  );
}
```

**Suspense for Data Fetching / SSR 스트리밍**

```jsx
// 서버에서 스트리밍 렌더링 — 느린 부분이 전체를 막지 않음
<Suspense fallback={<CommentsSkeleton />}>
  <Comments />
</Suspense>
```

**Strict Mode 이중 실행**: 개발 모드에서 컴포넌트를 일부러 두 번 마운트한다.

`useEffect`의 클린업이 제대로 구현됐는지 미리 드러내기 위해서다.

**왜 바뀌었을까**

React 17까지의 렌더링은 시작하면 끝까지 멈추지 않고 진행됐다.

그래서 데이터가 많거나 트리가 깊으면 사용자 입력이 밀렸고, 서버 사이드 렌더링도 전체 HTML이 완성될 때까지 클라이언트에 아무것도 보낼 수 없었다.

Concurrent Rendering은 렌더링에 우선순위라는 개념을 도입해서, 급한 작업(타이핑)이 급하지 않은 작업(검색 결과 리스트 갱신)을 가로챌 수 있게 만들었다.

**DX 변화**

`useTransition`, `useDeferredValue` 덕분에 느린 렌더링을 최적화하는 방법이 달라졌다.

예전엔 `useMemo`/`React.memo`를 억지로 끼워맞췄다면, 이제는 렌더링 우선순위를 직접 표현하는 쪽으로 옮겨간 것이다.

반면 Strict Mode의 이중 실행은 기존 코드에 숨어있던 `useEffect` 버그(구독 중복 등)를 대거 드러내면서, 마이그레이션 초반에 적잖은 혼란을 줬다.

**버려진 것 / 새로 선택한 것**

| 이전 | 이후 | 이유 |
|---|---|---|
| `ReactDOM.render()` | `ReactDOM.createRoot()` | Concurrent 기능을 쓰려면 새 루트 API 필수 |
| `componentWillMount` 등 Unsafe 생명주기 | `getDerivedStateFromProps` 등 | Concurrent 렌더링과 호환되지 않는 생명주기 단계적 제거 |
| renderToString만 지원하는 SSR | 스트리밍 SSR(`renderToPipeableStream`) | 느린 데이터를 기다리지 않고 먼저 그릴 수 있는 부분부터 전송 |

<br/>

## React 19 (2024) — Server Components 정식화와 Actions

**Actions — 폼 제출과 비동기 상태 전이의 표준화**

```jsx
function ContactForm() {
  const [state, formAction, isPending] = useActionState(async (prevState, formData) => {
    const result = await submitContactForm(formData);
    return result;
  }, null);

  return (
    <form action={formAction}>
      <input name="email" />
      <button disabled={isPending}>{isPending ? '전송 중...' : '전송'}</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

**useOptimistic — 낙관적 업데이트 전용 훅**

```jsx
function LikeButton({ post }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(post.likes, (likes, amount) => likes + amount);

  async function handleLike() {
    addOptimisticLike(1);
    await likePost(post.id);
  }

  return <button onClick={handleLike}>{optimisticLikes} Likes</button>;
}
```

**`use` 훅 — 조건부로 Promise/Context를 읽는다**

```jsx
function PostDetail({ postPromise }) {
  const post = use(postPromise); // Suspense와 함께 동작
  return <article>{post.title}</article>;
}
```

**그 외**: `forwardRef` 없이도 함수 컴포넌트가 `ref`를 일반 prop처럼 받을 수 있게 됐고, `<title>`/`<meta>` 같은 문서 메타데이터 태그를 컴포넌트 안에서 바로 렌더링할 수 있게 됐다(React가 알아서 `<head>`로 끌어올려준다).

**왜 바뀌었을까**

React 18까지도 서버에서 데이터를 가져와 클라이언트 상태로 옮겨 담는 작업은 여전히 `useEffect` + `useState` 조합이거나 TanStack Query 같은 라이브러리에 기대야 했다.

React 19는 Server Components를 정식 지원하면서 데이터 패칭 자체를 렌더링 트리 안으로 통합했다.

폼 제출, 로딩 상태, 에러 처리처럼 프로젝트마다 제각각 구현하던 반복 패턴을 Actions라는 이름으로 표준화한 것도 같은 맥락이다.

**DX 변화**

폼을 다룰 때 `isSubmitting` 상태를 직접 관리하고 `try/catch`로 감싸던 보일러플레이트가 `useActionState` 하나로 줄었다.

대신 "이 컴포넌트에 `use client`가 필요한가"처럼 Server Component와 Client Component의 경계를 매번 판단해야 하는 새로운 고민거리가 생겼다.

**버려진 것 / 새로 선택한 것**

| 이전 | 이후 | 이유 |
|---|---|---|
| `useEffect` + `useState`로 직접 구현한 폼 제출 로직 | `useActionState`, `<form action={fn}>` | 로딩/에러/pending 상태 표준화 |
| PropTypes | TypeScript | 런타임 검증보다 컴파일 타임 검증 선호, 대규모 코드베이스 확산과 맞물림 |
| `defaultProps`(함수 컴포넌트) | 매개변수 기본값(`function Foo({ name = 'Guest' })`) | ES6 문법으로 대체 가능해지며 공식적으로 deprecated(앞으로 제거될 예정이니 쓰지 말라는 표시) 처리 |
| Redux로 서버 데이터까지 관리 | TanStack Query/SWR + Server Components | [상태 관리의 역사](/posts/React/state-management-history)에서 다룬 "서버 상태와 클라이언트 상태 분리" 흐름과 직결 |

<br/>

## 전체 흐름 정리

| 버전 | 연도 | 핵심 변화 | 왜 |
|---|---|---|---|
| 0.x | 2013 | Virtual DOM, JSX, 단방향 데이터 흐름 | 양방향 바인딩의 추적 불가능성 해결 |
| 15 | 2016 | ES6 클래스 컴포넌트 | 표준 문법 채택, mixin 폐기 |
| 16 | 2017 | Fiber, Fragment, Error Boundary, Portal | 렌더링 중단/재개 가능한 아키텍처 확보 |
| 16.3~16.8 | 2018 | Context 재설계, Hooks | Props Drilling과 로직 재사용 문제 해결 |
| 17 | 2020 | 이벤트 위임 변경(기능 없음) | 점진적 업그레이드 인프라 마련 |
| 18 | 2022 | Concurrent Rendering, Transitions, 스트리밍 SSR | 렌더링 우선순위 도입, 입력 지연 해소 |
| 19 | 2024 | Server Components 정식화, Actions, `use` | 데이터 패칭/폼 로직의 표준화 |

React가 바뀌어온 순서는 항상 비슷하다.

특정 패턴이 실무에서 반복적으로 고통을 유발하면(mixin 충돌, wrapper hell, 입력 지연, 폼 보일러플레이트), 커뮤니티에서 임시방편 라이브러리가 먼저 나오고(HOC, Redux, TanStack Query), 그중 검증된 아이디어를 React 코어가 나중에 흡수한다.

그러니 지금 유행하는 서드파티 라이브러리가 있다면, 몇 년 뒤 그 문제의식이 React 자체의 기능으로 들어올 가능성이 꽤 높다.

<br/>

## 참고

<bookmark url="https://react.dev/blog"></bookmark>

<bookmark url="https://react.dev/blog/2024/12/05/react-19"></bookmark>

<bookmark url="https://legacy.reactjs.org/docs/hooks-intro.html"></bookmark>
