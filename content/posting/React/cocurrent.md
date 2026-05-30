---
title: "[React] 10,000개를 렌더링하는데 어떻게 입력은 안 끊길까?"
date: "2026-05-31"
description: "React 18의 Concurrent 렌더링 방식과 왜 등장했는지 알아보자"
tags: ["react", "concurrent", "rendering", "react18", "scheduler", "fiber"]
thumbnail: "/assets/thumbnails/6121df5b-8385-4bb8-9262-5b8a045965c3.png"
---

프로젝트에서 검색 필터 기능을 만들다가 이상한 경험을 한 적이 있다.

리스트 아이템이 수천 개쯤 되는 화면에서 검색창에 타이핑을 하면, 입력이 한 박자씩 늦게 따라왔다.

코드 어디가 잘못된 건지 한참을 뒤졌다. 로직도 단순하고, 불필요한 리렌더링도 없었다.

그런데 문제는 로직이 아니었다.

React가 필터링 결과를 다시 그리느라 바빠서, 내 키 입력을 처리할 여유가 없었던 것이다.

당시에는 `useMemo`로 감싸거나 가상화 라이브러리를 붙이는 식으로 임시방편을 쓰고 넘어갔다.

근본적으로 왜 그런 현상이 발생하는지, React가 내부적으로 어떻게 작업을 처리하는지는 제대로 이해하지 못한 채로.

이번 포스팅에서는 그 답이 되는 Concurrent React가 무엇인지, 왜 등장했는지 정리해보려 한다.

<br/>

## 왜 Concurrent React가 필요했을까

React 17까지는 렌더링이 시작되면 끝날 때까지 중단할 수 없었다.

이 방식을 **동기 렌더링(Synchronous Rendering)** 이라고 한다.

렌더링해야 할 컴포넌트가 많아질수록 React는 오랜 시간 CPU를 점유하게 된다.

문제는 React가 작업하는 동안 브라우저가 다른 일을 처리하지 못한다는 점이다.

사용자는 다음과 같은 현상을 경험할 수 있다.

* 입력창이 버벅거림
* 버튼 클릭이 늦게 반응함
* 스크롤이 끊김
* 애니메이션이 멈춘 것처럼 보임

<br/>

![기존 React 렌더링 방식](/assets/React/synchronous-rendering-timeline.png)

<br/>

React 자체가 느린 것이 아니라 브라우저에게 제어권을 넘겨주지 못하는 것이 문제였다.

<br/>

## Concurrent React란

Concurrent React는 렌더링 작업을 여러 개의 작은 작업으로 나누어 처리하는 방식이다.

React는 일정량의 작업을 수행한 뒤 브라우저에게 잠시 제어권을 넘긴다.

브라우저는 그 시간 동안 다음 작업을 수행할 수 있다.

* 사용자 입력 처리
* 스크롤 처리
* 애니메이션 처리
* 화면 그리기(Paint)

그 후 React는 남은 작업을 이어서 수행한다.

<br/>

![Concurrent Rendering 개념](/assets/React/concurrent-rendering-overview.png)

<br/>

이 방식 덕분에 사용자는 화면이 멈춘 것처럼 느끼지 않게 된다.

<br/>

### Concurrent는 멀티스레드가 아니다

Concurrent라는 이름 때문에 오해하기 쉬운 부분이 있다.

Concurrent React는 멀티스레드 기술이 아니다.

여전히 JavaScript는 하나의 스레드에서 동작한다.

CPU 코어를 여러 개 사용하는 것도 아니다.

<br/>

![Concurrent vs Multi Thread](`/assets/React/concurrent-vs-multithread.png`)

<br/>

Concurrent React는 작업을 동시에 수행하는 것이 아니라 작업 순서를 효율적으로 조정하는 기술에 가깝다.

<br/>

## 핵심 메커니즘

### Interruptible Rendering

Concurrent React의 핵심 기능이다.

React는 렌더링 도중 더 중요한 작업이 발생하면 현재 작업을 잠시 멈출 수 있다.

이것을 **Interruptible Rendering** 이라고 한다.

<br/>

예를 들어 검색 결과 10,000개를 렌더링하고 있다고 가정해보자.

렌더링 도중 사용자가 검색창에 새로운 문자를 입력했다.

React는 현재 작업을 잠시 멈춘 뒤 입력 처리를 먼저 수행한다.

이후 남은 렌더링 작업을 이어서 진행한다.

<br/>

![Interruptible Rendering](`/assets/React/interruptible-rendering.png`)

<br/>

사용자가 체감하는 반응성이 좋아지는 이유가 바로 여기에 있다.

<br/>

<interactive-demo
  src="/assets/React/concurrent-rendering-demo.html"
  title="Legacy vs Concurrent 렌더링 체험"
  caption="Legacy(동기) 렌더링과 Concurrent 렌더링의 차이를 직접 체험해보자"
/>

### Fiber

Concurrent React는 React Fiber 구조 위에서 동작한다.

Fiber는 React 16에서 도입된 새로운 렌더링 엔진이다.

React는 컴포넌트를 Fiber Node라는 단위로 관리한다.

<br/>

![Fiber Tree 구조](/assets/React/fiber-tree-structure.png)

<br/>

React는 Fiber Tree를 순회하면서 작업을 수행한다.

Concurrent React는 이 Fiber 단위로 작업을 쪼개어 관리한다.

<br/>

### Priority

Concurrent React는 모든 작업을 동일하게 취급하지 않는다.

작업마다 우선순위를 부여한다.

예를 들어 사용자의 입력은 매우 중요하다.

반면 검색 결과를 렌더링하는 작업은 잠시 늦어져도 큰 문제가 없다.

<br/>

![Priority Scheduling](/assets/React/priority-scheduling.png)

<br/>

이러한 우선순위 시스템 덕분에 중요한 작업이 먼저 처리된다.

<br/>

### Scheduler

Concurrent React 내부에는 Scheduler라는 시스템이 존재한다.

Scheduler는 어떤 작업을 먼저 수행해야 하는지 판단한다.

쉽게 말하면 작업 관리자 역할을 한다.

<br/>

![React Scheduler](/assets/React/react-scheduler-flow.png)

<br/>

Scheduler는 현재 상황을 보고 작업 순서를 결정한다.

이를 통해 React는 사용자 경험을 개선할 수 있다.

<br/>

## React 18 API

### startTransition

React 18에서는 낮은 우선순위 작업을 명시적으로 지정할 수 있다.

이를 위해 제공되는 API가 `startTransition` 이다.

```tsx
import { startTransition } from "react";

function handleChange(value: string) {
  setInput(value);

  startTransition(() => {
    setSearchResult(value);
  });
}
```

<br/>

위 코드에서 입력창 업데이트는 즉시 처리된다.

반면 검색 결과 업데이트는 낮은 우선순위 작업으로 처리된다.

사용자는 입력이 끊기지 않는 것처럼 느끼게 된다.

<br/>

![startTransition 동작](/assets/React/start-transition-flow.png)

<br/>

### useTransition

`startTransition` 을 상태로 관리할 수 있도록 만든 Hook이다.

```tsx
const [isPending, startTransition] = useTransition();
```

<br/>

`isPending` 을 통해 현재 Transition 작업이 진행 중인지 확인할 수 있다.

<br/>

```tsx
{isPending && <Loading />}
```

<br/>

대규모 리스트 렌더링 상황에서 로딩 UI를 보여줄 때 자주 사용된다.

<br/>

## Concurrent React가 중요한 이유

Concurrent React의 목적은 렌더링 속도를 높이는 것이 아니다.

사용자가 느끼는 반응성을 높이는 것이다.

React는 이제 모든 작업을 한 번에 처리하지 않는다.

대신 다음과 같은 질문을 스스로 던진다.

> 지금 가장 중요한 작업은 무엇인가?

그리고 그 작업을 먼저 수행한다.

<br/>

## 정리

Concurrent React는 React 18에서 도입된 새로운 렌더링 방식이다.

핵심은 다음과 같다.

* 작업을 여러 개로 나누어 수행한다.
* 렌더링 도중 작업을 중단할 수 있다.
* 사용자 입력을 우선 처리한다.
* Scheduler가 작업 우선순위를 관리한다.
* startTransition으로 낮은 우선순위 작업을 지정할 수 있다.
* 더 빠른 React가 아니라 더 반응성 좋은 React를 만드는 기술이다.

Concurrent React를 이해하면 이후 학습하게 될 Fiber, Scheduler, Lane, Transition API를 훨씬 쉽게 이해할 수 있다.

<br/>
