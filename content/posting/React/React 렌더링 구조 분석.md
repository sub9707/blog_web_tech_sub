---
title: "React 렌더링 구조 분석"
date: "2026-06-01"
description: "함수 컴포넌트의 실행 모델부터 Fiber 아키텍처, Render/Commit Phase, 리렌더링 조건, React 19 Compiler까지 React 렌더링의 내부 동작을 정리"
tags: ["react", "rendering", "fiber", "hooks", "react19", "performance"]
thumbnail: "/assets/thumbnails/react_rendering_thumbnail.png"
---

React로 개발하다 보면 이 컴포넌트가 왜 다시 렌더링되는지, 최적화를 어디서 해야 하는지 부딪히는 순간이 온다.
이 질문들에 답하기 위해선 React가 내부에서 어떻게 동작하는지, 즉 렌더링 구조를 근본적으로 이해해야 한다.

---

# 함수 컴포넌트란 무엇인가

## 클래스 컴포넌트와의 차이

React 초기에는 클래스 컴포넌트가 상태와 생명주기를 관리하는 유일한 방법이었다.
함수 컴포넌트는 단순히 props를 건네받아 JSX를 반환하는 순수 함수에 불과했다.

React 16.8에서 Hooks가 도입되면서 함수 컴포넌트의 위치는 완전히 달라졌다.
`useState`, `useEffect`, `useContext` 등을 함수 안에서 모두 처리할 수 있게 됐고, 현재 React 생태계의 표준이 됐다.

<br/>

## 함수 컴포넌트의 실행 모델

함수 컴포넌트의 핵심은 매우 단순한 구조다.

```jsx
function Counter({ initialValue }) {
  const [count, setCount] = useState(initialValue);

  return (
    <div>
      <p>현재 값: {count}</p>
      <button onClick={() => setCount(count + 1)}>증가</button>
    </div>
  );
}
```

'렌더링'한다는 것은 아주 짧게 말해, 함수를 통째로 호출하는 개념이다.
`Counter` 컴포넌트를 렌더링한다는 것은 곧 `Counter` 함수를 호출하는 것이다.

클래스 컴포넌트에서 `render()` 메서드만 다시 실행하던 것과 달리, 함수 컴포넌트는 함수 본문 전체를 재실행한다.

이 특성 때문에 두 가지를 명확히 알고 있어야 한다.

1. **함수 컴포넌트 안의 변수와 함수는 렌더링마다 새로 생성된다.**
2. **`useState`처럼 Hooks가 반환하는 값은 React 내부 저장소(Fiber)에 의해 렌더링 간 유지된다.**

```jsx
function Example() {
  const [count, setCount] = useState(0);

  // 이 함수는 렌더링마다 새로 생성된다
  const handleClick = () => {
    console.log(count); // 현재 렌더링의 count를 클로저로 캡처한다
  };

  console.log('Example 렌더링됨'); // 렌더링마다 출력

  return <button onClick={handleClick}>클릭</button>;
}
```

메모이제이션된 컴포넌트에 props로 함수를 내려줄 때,
그 함수는 부모 컴포넌트에서 렌더링마다 새로 생성되므로 자식 컴포넌트의 메모이제이션이 무력화된다.

`count` 변수 자체는 렌더링마다 새로 선언되지만, 그 안에 담기는 값은 Fiber 노드의 `memoizedState`에서 꺼내온다.
`useState`를 호출할 때마다 각 컴포넌트의 Fiber 객체에 있는 `memoizedState` 연결 리스트에 순서대로 쌓이는 구조다.

![useState와 Fiber memoizedState 구조](/assets/React/image_20260519193144.png)

`useState(0)`의 초기값 `0`은 첫 렌더링에만 사용되고 이후에는 무시된다.
컴포넌트 함수가 매번 새로 실행되어도 상태가 초기화되지 않는 이유가 이것이다.
실제 값은 함수 스코프 바깥의 Fiber에 보관되어 있기 때문이다.

<br/>

## 순수 함수로서의 함수 컴포넌트

React는 함수 컴포넌트가 **순수 함수(pure function)** 처럼 동작하기를 기대한다.

순수 함수란, 동일한 입력에 항상 동일한 출력을 반환하고, 함수 외부 환경을 변경하지 않는 함수를 말한다.

- 동일한 props와 state가 주어지면 **항상 동일한 JSX**를 반환해야 한다.
- 렌더링 중에 외부 상태를 변경하는 부수효과를 발생시키지 않아야 한다.

```jsx
// 잘못된 예시 — 렌더링 중 외부 변수 변경
let renderCount = 0;

function BadComponent() {
  renderCount += 1; // 렌더링 중 부수효과 발생 — 순수성 위반
  return <div>렌더링 횟수: {renderCount}</div>;
}

// 올바른 예시 — ref 사용
function GoodComponent() {
  const renderCount = useRef(0);
  renderCount.current += 1; // ref는 렌더링 결과에 영향을 주지 않는다
  return <div>렌더링 횟수: {renderCount.current}</div>;
}
```

<br/>

여기서 헷갈리는 점이 생길 수 있다.

> "useRef로 DOM을 조작하면 순수 함수가 아니지 않나?"

**렌더링 중에 ref로 DOM을 변경하는 건 순수성 위반이지만, `useEffect`나 이벤트 핸들러 안에서 하는 건 괜찮다.**

React는 부수효과를 "렌더링 중이냐 아니냐"로 구분한다.

```jsx
// 렌더링 중 DOM 변경 → 순수성 위반
function Example() {
  const ref = useRef(null);
  ref.current.style.color = 'red'; // Render Phase에서 외부(DOM)를 변경
  return <div ref={ref}>텍스트</div>;
}
```

```jsx
// useEffect 안에서 DOM 변경 → 괜찮음
function Example() {
  const ref = useRef(null);

  // Commit Phase 이후에 실행되므로 렌더링과 분리됨
  useEffect(() => {
    ref.current.style.color = 'red';
  }, []);

  return <div ref={ref}>텍스트</div>;
}
```

이벤트 핸들러나 `useEffect` 내부처럼 부수효과를 허용하는 곳에서는 렌더링 과정을 건드리지 않으므로 문제없다.

이 순수성 요건은 이후에 다룰 React 19 Compiler 최적화의 핵심 전제 조건이기도 하다.

---

# JSX에서 React Element로

## JSX는 문법 설탕이다

JSX와 HTML을 비슷한 것으로 이해하는 경우가 많지만, 실제로는 JS 함수 호출로 변환되는 문법적 단축 표현이다.

```jsx
const element = (
  <div className="container">
    <h1>제목</h1>
    <p>내용</p>
  </div>
);
```

위와 같은 코드를 작성하면, Babel이나 SWC가 다음과 같이 변환한다.

```js
// React 17 이전 (Classic Transform)
const element = React.createElement(
  'div',
  { className: 'container' },
  React.createElement('h1', null, '제목'),
  React.createElement('p', null, '내용')
);

// React 17 이후 (Automatic Transform)
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';

const element = _jsxs('div', {
  className: 'container',
  children: [
    _jsx('h1', { children: '제목' }),
    _jsx('p', { children: '내용' })
  ]
});
```

React 17 이후에는 `import React from 'react'`를 파일 상단에 작성하지 않아도 되는 이유가
바로 이 Automatic Transform 덕분이다.

<br/>

## React Element의 구조

`React.createElement` 또는 `jsx` 함수 호출의 결과물이 **React Element**다.
이것은 단순한 JavaScript 객체다.

```js
{
  $$typeof: Symbol(react.element), // React 내부 식별자
  type: 'div',                     // 'div' 또는 MyComponent 함수 참조
  key: null,
  ref: null,
  props: {
    className: 'container',
    children: [
      { $$typeof: ..., type: 'h1', props: { children: '제목' }, ... },
      { $$typeof: ..., type: 'p',  props: { children: '내용' }, ... }
    ]
  }
}
```

`type` 필드가 문자열(`'div'`, `'span'`, `'h1'` 등)이면 HTML 기본 요소이고,
함수 참조(`MyComponent`)이면 사용자 정의 컴포넌트다.

<br/>

### 컴포넌트 타입에 따른 처리 차이

```jsx
// type이 문자열인 경우 — 호스트 엘리먼트
<div className="box">내용</div>
// → { type: 'div', props: { className: 'box', children: '내용' } }

// type이 함수인 경우 — 컴포넌트 엘리먼트
<MyComponent value={42} />
// → { type: MyComponent, props: { value: 42 } }
```

`type`이 함수인 경우 React는 해당 함수를 호출해서 반환된 React Element를 재귀적으로 처리한다.
이 재귀적 처리가 컴포넌트 트리 전체를 순회하는 방식이다.

<br/>

### Element는 불변이다

React Element는 생성된 이후 변경되지 않는다. 특정 시점의 UI 스냅샷이라고 할 수 있다.

UI를 업데이트하려면 새로운 Element를 생성해서 React에 전달해야 한다.
React가 이 새로운 Element 트리와 이전 트리를 비교(Diffing)해서 실제 DOM에 반영할 변경사항을 계산한다.

---

# Render Phase — 무엇을 그려야 할지 계산하는 단계

React의 업데이트 과정은 크게 두 단계로 나뉜다. **Render Phase**와 **Commit Phase**다.

이 구분을 명확히 아는 것이 성능 최적화와 Hooks 사용 원칙을 이해하는 핵심이다.

<br/>

## Render Phase의 정의

Render Phase는 React가 "다음 UI가 어떻게 생겨야 하는가?"를 계산하는 단계다.

- 변경된 상태나 props를 기반으로 어떤 컴포넌트를 다시 실행해야 하는지 결정한다.
- 해당 컴포넌트 함수를 호출해서 새로운 React Element 트리를 만든다.
- 이전 트리(Fiber 트리)와 새로운 트리를 비교(Reconciliation, 재조정)한다.
- 실제 DOM에 적용해야 할 변경 사항 목록(effect list)을 만든다.

Render Phase는 순수하게 계산만 수행한다. DOM을 직접 건드리지 않는다.

<br/>

## Fiber 아키텍처와의 관계

React 16에서 도입된 Fiber 아키텍처는 Render Phase를 중단 가능한(interruptible) 작업 단위로 분할했다.
각 컴포넌트에 대응하는 Fiber 노드가 존재하고, React는 이 노드들을 순회하면서 작업한다.

Render Phase 동안 React는 **Work-in-Progress(WIP) 트리**라는 새로운 Fiber 트리를 만든다.
현재 화면에 표시된 트리(Current 트리)와 비교하면서 변경이 필요한 Fiber 노드에 플래그를 표시한다.

<br/>

## Reconciliation — 무엇이 바뀌었는가

Render Phase의 핵심 작업인 Reconciliation(재조정)은 이전 Fiber 트리와 새 React Element 트리를 비교하는 과정이다.

React는 두 가지 기준으로 비교한다.

<br/>

### 타입이 같으면 업데이트, 다르면 언마운트 후 새로 마운트

```jsx
// 이전 렌더링
<div className="old">내용</div>

// 새 렌더링 — type이 같으므로 props만 업데이트
<div className="new">내용</div>
```

```jsx
// 이전 렌더링
<div>내용</div>

// 새 렌더링 — type이 달라졌으므로 div를 제거하고 span을 새로 생성
<span>내용</span>
```

<br/>

### 리스트에서는 key를 기준으로 동일성 판단

```jsx
// key가 없는 경우 — 순서 기반 비교, 리스트 중간 삽입/삭제 시 비효율적
{items.map((item) => <li>{item.name}</li>)}

// key가 있는 경우 — 고유 식별자 기반 비교, 효율적
{items.map((item) => <li key={item.id}>{item.name}</li>)}
```

key를 지정하지 않으면 순서 기반으로 비교하게 되어, 중간에 요소가 삽입/삭제될 경우
이후 요소들을 모두 변경된 것으로 인식해 불필요한 재렌더링이나 state 꼬임이 발생한다.

React가 어떤 요소가 유지되고, 추가되고, 삭제되었는지 정확히 판단할 수 있도록 고유한 `key`를 사용해야 한다.

<br/>

### Render Phase는 여러 번 실행될 수 있다

Fiber 아키텍처의 특성상 Render Phase는 중단되었다가 재시작될 수 있다.
즉, 컴포넌트 함수가 렌더링 한 번에 여러 번 호출될 수 있다는 뜻이다.
React 18의 Concurrent Mode에서는 이 동작이 더 명확하게 나타난다.

이것이 컴포넌트 함수 내부에서 부수효과를 발생시키면 안 되는 이유다.
함수가 몇 번 호출되더라도 결과가 동일해야 한다(순수성).

개발 모드에서 `React.StrictMode`를 사용하면 이 특성을 의도적으로 강조하기 위해
컴포넌트 함수를 두 번 호출한다. 개발 중 콘솔 로그가 두 번씩 찍히는 것이 이 때문이다.

---

# Commit Phase — 계산 결과를 실제 DOM으로

Render Phase에서 "무엇이 바뀌어야 하는가"를 계산했다면,
**Commit Phase는 그 계산 결과를 실제 DOM에 반영하는 단계**다.

<br/>

## Commit Phase의 세 단계

Commit Phase는 내부적으로 세 단계로 나뉜다.

**1. Before Mutation Phase**

DOM이 변경되기 전에 실행된다. 변경 전의 DOM 정보를 읽어온다.
클래스 컴포넌트의 `getSnapshotBeforeUpdate` 생명주기가 여기서 호출된다.

**2. Mutation Phase**

실제 DOM 조작이 발생하는 단계다.
Render Phase에서 계산한 변경 사항(삽입, 업데이트, 삭제)을 실제 DOM에 적용한다.
`ref`도 이 시점에 DOM 노드에 연결된다.

**3. Layout Phase**

DOM 변경이 완료된 직후, 브라우저가 화면을 다시 그리기 전에 실행된다.
`useLayoutEffect`의 콜백이 여기서 동기적으로 실행된다.
DOM 측정이 필요한 작업(스크롤 위치, 요소 크기 등)을 여기서 처리한다.

```jsx
function Example() {
  const ref = useRef(null); // Mutation Phase 때 DOM 노드에 연결됨

  // Layout Phase에서 동기적으로 실행
  useLayoutEffect(() => {
    const height = ref.current.getBoundingClientRect().height;
    console.log('DOM 높이:', height); // 정확한 DOM 크기를 얻을 수 있다
  });

  // 브라우저 paint 이후 비동기적으로 실행
  useEffect(() => {
    console.log('useEffect 실행'); // useLayoutEffect보다 나중에 실행
  });

  return <div ref={ref}>측정 대상</div>;
}
```

<br/>

## Render Phase vs Commit Phase

| 구분 | Render Phase | Commit Phase |
| :---: | :---: | :---: |
| 하는 일 | UI 계산, Fiber 트리 비교 | 실제 DOM 조작 |
| DOM 접근 | 없음 | 있음 |
| 중단 가능 여부 | 가능 (Concurrent) | 불가능 (동기적) |
| 순수성 요건 | 필수 | 부수효과 허용 |
| 관련 Hook | 없음 (렌더 함수 자체) | useLayoutEffect, useEffect |

<br/>

## Commit Phase 이후 — useEffect

Commit Phase가 모두 완료되고 브라우저가 화면을 그린 후,
`useEffect`의 콜백들이 비동기적으로 실행된다.
이것은 Commit Phase 바깥의 동작이지만 React가 스케줄링하는 후속 작업이다.

---

# Re-render 구조

React 컴포넌트가 다시 렌더링되기 위한 조건은 4가지다.

<br/>

## 1. state 변경

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  // setCount 호출 → Counter 리렌더링 트리거
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

<br/>

## 2. 부모 컴포넌트의 리렌더링

부모가 리렌더링되면 **기본적으로 모든 자식 컴포넌트도 리렌더링된다.**

React는 부모 Fiber가 업데이트되면 하위 Fiber들도 순회하며 컴포넌트 함수를 다시 실행해
새로운 UI 결과를 계산하기 때문이다. props가 변경되지 않았더라도 마찬가지다.
이를 위한 설계가 메모이제이션이다.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>부모 state 변경</button>
      <Child /> {/* props가 없어도 Parent가 리렌더링될 때 함께 리렌더링 */}
    </div>
  );
}

function Child() {
  console.log('Child 렌더링'); // Parent state 변경 시에도 출력됨
  return <div>자식</div>;
}
```

<br/>

## 3. Context 값 변경

```jsx
const ThemeContext = createContext('light');

function ThemedButton() {
  const theme = useContext(ThemeContext); // context를 구독
  // context 값이 변경되면 이 컴포넌트가 리렌더링된다
  return <button className={theme}>버튼</button>;
}
```

`useContext`는 특정 Context를 구독한다.
Provider의 value가 변경되면, 해당 Context를 구독 중인 컴포넌트는 다시 렌더링된다.

React가 Context 변경을 감지하면 해당 Context에 의존하고 있는 Fiber들을 업데이트 대상으로 표시하기 때문이다.

Redux, Zustand 같은 외부 상태 관리 라이브러리도 본질적으로는 동일하다.
전역 상태가 변경되면 해당 상태를 구독 중인 컴포넌트들이 다시 렌더링된다.
다만 Context와 달리 selector 기반으로 필요한 상태 조각만 구독하여, 불필요한 리렌더링을 더 세밀하게 줄일 수 있다.

<br/>

## 4. forceUpdate (클래스 컴포넌트에서만)

함수 컴포넌트에서는 해당 없다.

---

## Re-render는 항상 DOM 변경을 의미하지 않는다

**컴포넌트가 리렌더링된다는 것은 함수가 재실행되어 React Element 트리를 새로 계산한다는 뜻이다.**
이 계산 결과가 이전과 동일하다면 Commit Phase에서 실제 DOM은 변경되지 않는다.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>{count}</button>
      <StaticContent /> {/* 항상 동일한 결과를 반환 */}
    </div>
  );
}

function StaticContent() {
  console.log('StaticContent 렌더링'); // 함수는 실행됨
  return <p>변하지 않는 내용</p>;     // 하지만 DOM은 변경되지 않음
}
```

React의 최적화는 두 레벨에서 이루어진다.

- **리렌더링 자체를 막는 것**: `React.memo`, `useMemo`, `useCallback`
- **리렌더링이 일어나더라도 DOM 변경을 최소화하는 것**: Reconciliation

<br/>

## 상태 업데이트의 일괄 처리 (Batching)

React는 여러 상태 업데이트를 하나의 리렌더링으로 묶어 처리한다. 이를 배치 처리(Batching)라고 한다.

```jsx
function BatchExample() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  const handleClick = () => {
    setCount(c => c + 1); // 리렌더링 트리거 X
    setFlag(f => !f);     // 리렌더링 트리거 X
    // 이 함수가 끝난 후 한 번만 리렌더링됨
  };

  return <button onClick={handleClick}>클릭</button>;
}
```

React 18 이전에는 이벤트 핸들러 내부에서만 배치 처리가 되었고,
`setTimeout`이나 Promise 콜백에서는 배치 처리가 되지 않았다.
React 18부터는 어디서든 **자동 배치 처리(Automatic Batching)**가 적용된다.

```js
// React 18 이전 — 두 번 리렌더링
setTimeout(() => {
  setCount(c => c + 1); // 리렌더링 1
  setFlag(f => !f);     // 리렌더링 2
}, 1000);

// React 18 이후 — 한 번 리렌더링
setTimeout(() => {
  setCount(c => c + 1); // 배치 처리됨
  setFlag(f => !f);     // 배치 처리됨
}, 1000);
```

---

# React 19 Compiler — 자동 최적화의 원리

React 18까지는 불필요한 리렌더링을 막기 위해 개발자가 직접 최적화 코드를 작성해야 했다.
이 방식은 몇 가지 문제를 가지고 있었다.

- **의존성 배열 관리 실수**: `useMemo`와 `useCallback`의 의존성 배열을 잘못 작성하면 버그가 생긴다.
- **과도한 보일러플레이트**: 최적화 코드가 비즈니스 로직보다 더 많아진다.
- **잘못된 최적화**: 필요하지 않은 곳에 최적화를 적용하거나, 반대로 필요한 곳을 놓친다.

<br/>

## React Compiler의 접근 방식

React 19에서 공식적으로 통합된 **React Compiler**는 이 문제를 빌드 타임에 해결한다.
컴파일러가 소스 코드를 정적 분석하여 메모이제이션이 필요한 위치를 자동으로 파악하고,
빌드 결과물에 최적화 코드를 삽입한다.

<br/>

## Compiler가 최적화할 수 있는 조건

React Compiler가 안전하게 자동 최적화를 적용하려면 **컴포넌트가 순수 함수처럼 동작해야 한다.**
컴파일러는 "동일한 입력 → 동일한 출력"이 보장될 때만 결과를 캐싱할 수 있기 때문이다.

```jsx
// React Compiler가 최적화할 수 없는 패턴

// 1. 렌더링 중 외부 상태 읽기/쓰기
let counter = 0;
function ImproperComponent() {
  counter++; // 순수성 위반 — 컴파일러가 안전하게 캐싱 불가
  return <div>{counter}</div>;
}

// 2. 렌더링 중 Date.now() 같은 비결정적 값 사용
function DateComponent() {
  const now = Date.now(); // 호출마다 달라짐 — 순수성 위반
  return <div>{now}</div>;
}
```

앞서 함수 컴포넌트의 순수성에서 살펴본 내용과 동일하다.
React Compiler가 자동으로 최적화하게 하려면 아래와 같은 구조여야 한다.

```jsx
// React Compiler가 최적화할 수 있는 패턴

// 1. props/state만을 기반으로 JSX 반환
function PureComponent({ name, value }) {
  return <div>{name}: {value}</div>;
}

// 2. 파생 데이터 계산
function FilterList({ items, query }) {
  const filtered = items.filter(item => item.name.includes(query));
  return (
    <ul>
      {filtered.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}
```

---

# React 19에서 달라지는 개발 방식

React Compiler가 안정화되면서 개발 방식이 다음과 같이 변화한다.

<br/>

**기존 방식 (React 18 이하)**

- `React.memo`로 자식 컴포넌트 감싸기
- 이벤트 핸들러에 `useCallback` 적용
- 계산 비용이 큰 로직에 `useMemo` 적용

**새로운 방식 (React 19 Compiler 사용)**

- 컴포넌트를 순수 함수로 작성하는 데 집중
- 컴파일러가 메모이제이션을 자동 처리
- `useMemo`와 `useCallback`은 컴파일러가 처리하지 못하는 특수한 경우에만 사용

<br/>

다만 React Compiler는 기존 코드베이스에 점진적으로 도입할 수 있다.
`// @react-compiler-skip` 주석으로 특정 컴포넌트를 최적화 대상에서 제외할 수 있다.

아래의 React 컨퍼런스 영상에서 React Compiler에 대한 소개를 하고 있으니 살펴보자.
