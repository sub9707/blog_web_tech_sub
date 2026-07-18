---
title: "라이브러리 개발기 (3) — Zustand 소스코드 해체분석"
date: "2026-07-10"
description: "zui 만들기 전에, Zustand 소스를 해체분석"
tags: ["library", "zustand", "source-code", "open-source", "devtools"]
thumbnail: "/assets/thumbnails/etc/zui.png"
---

보일러플레이트까지 다 잡아놓고 나니, 이제 진짜 코드를 짤 차례였다.

근데 막상 구현부를 만들려고 하니 손이 안갔다. 

Zustand의 `create`, `subscribe`, `setState`가 내부적으로 어떻게 동작하는지도 모르면서 그 위에 미들웨어를 얹겠다는 게 앞뒤가 안 맞는기도 했다.

또한 훌륭한 라이브러리를 뜯어보는 것도 좋은 경험이라 생각했다.

그래서 이번 글은 구현에 앞서, Zustand 소스코드를 직접 뜯어보는 기록으로 남기기로 했다.

GitHub 레포에서 봐도 되고 설치된 `node_modules/zustand/src`에 IDE로 바로 열어도 된다.

<bookmark url="https://github.com/pmndrs/zustand"></bookmark>

<br/>

## Step 1. 전체 구조 파악

무작정 파일 하나부터 열기 전에, 먼저 `src` 안에 뭐가 있는지부터 훑어봤다. 

각 디렉토리와 파일의 역할을 대충이라도 알아야 어디부터 읽어야 할지 감이 잡힐 것 같았다.

- **`vanilla.ts`** — React 없이 순수 JS로 상태를 관리하는 핵심 로직. `createStore`가 여기 있다.
- **`react.ts`** — `vanilla.ts`의 store를 `useSyncExternalStore`로 감싸서 React 훅(`useStore`, `create`)으로 만드는 파일.
- **`index.ts`** — 사용자가 `import { create } from 'zustand'` 할 때 실제로 불러오는 진입점. `react.ts`에 있는 `create`를 그대로 가져와서 내보내주기만 한다.
- **`middleware/`** — `devtools`, `persist`, `immer`, `subscribeWithSelector`, `combine`, `redux` 같은 공식 미들웨어들이 모여 있는 폴더.
- **`shallow.ts`** — 얕은 비교(shallow equal) 함수. selector가 객체나 배열을 반환할 때, 내용이 같으면 리렌더링을 막아주는 용도로 쓰인다.
- **`traditional.ts`** — `useStoreWithEqualityFn`이라는 훅이 있는 파일. "값이 바뀐 걸로 칠지 말지"를 `Object.is` 말고 직접 만든 비교 함수로 정할 수 있게 해준다. 레거시 zustand를 쓰던 사람들을 위해 남겨둔 훅이라고 한다.
- **`context.ts`** — store를 React Context로 넘기던 옛 API. 지금은 `createStore` + Context를 직접 조합하는 걸 권장해서 레거시에 가깝다.

정리하고 보니 `vanilla.ts`가 핵심 로직이고, 나머지는 전부 그 위에 얹힌 얇은 레이어라는 게 보였다. 

따라서 `vanilla.ts`부터 하나씩 순서대로 읽기로 했다.

<br/>

## 시작하자마자...

`vanilla.ts`를 열자마자 타입에, 제네릭 범벅인 시그니처를 보고 잠깐 멈췄다.

![StateCreator 제네릭 시그니처](/assets/etc/zui/zustand-state-creator-type.png)

`Mis`, `Mos`가 뭔지, `StoreMutatorIdentifier`가 뭔지부터 막막했다.

처음 소스를 접할 땐 배경지식이 없으니 그냥 난해한 암호처럼 보였다.

이건 약과였다. 

타입 유틸을 따라 들어가다가 `TakeTwo`라는 타입을 마주쳤는데, 그야말로 타입 타워였다.

![TakeTwo 타입 타워](/assets/etc/zui/zustand-type-tower.png)

삼항 연산자가 이렇게 계단식으로 몇 단이나 쌓인 걸 처음 봤다.

몇 단인지 세다가 포기했다. 이걸 보고 처음엔 그냥 절망했다.

여기서 방향을 바꿨다. 

**타입은 일단 안 보이는 셈 치고, 실제로 실행되는 로직만 따라가기로 했다.** `StateCreator<T, Mis, Mos>` 이런 부분은 눈으로 흘려보내고, 함수 본문 안에서 어떤 변수가 선언되고 어떤 순서로 실행되는지만 쫓아갔다. 

그러니 오히려 구조가 눈에 들어왔다. 

타입은 "이 값이 나중에 어떤 모양이어야 하는지"를 컴파일러에게 알려주는 주석 같은 것이지, 런타임에 실제로 도는 로직이 아니니 처음 읽을 때는 굳이 다 이해하지 않아도 된다는 걸 이번에 체감했다.

소스는 이렇게 쫄지 않고 읽어도 되는구나, 하고 타입은 참고용으로, 거침없이 스킵하고 로직에 집중했다.

<br/>

## Step 2. vanilla.ts — Zustand의 코어

`createStore`는 실제로 `createStoreImpl`이라는 이름으로 구현되어 있었고, 대략 이런 모양이다.

```ts
const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void

  let state: TState
  const listeners: Set<Listener> = new Set()

  const setState: StoreApi<TState>['setState'] = (partial, replace) => {
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state)
        : partial

    if (!Object.is(nextState, state)) {
      const previousState = state
      state =
        (replace ?? (typeof nextState !== 'object' || nextState === null))
          ? (nextState as TState)
          : Object.assign({}, state, nextState)
      listeners.forEach((listener) => listener(state, previousState))
    }
  }

  const getState: StoreApi<TState>['getState'] = () => state
  const getInitialState: StoreApi<TState>['getInitialState'] = () => initialState

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const destroy: StoreApi<TState>['destroy'] = () => {
    listeners.clear()
  }

  const api = { setState, getState, getInitialState, subscribe, destroy }
  const initialState = (state = createState(setState, getState, api))
  return api as any
}
```

본격적으로 로직을 따라가기 전에, `createStoreImpl`이라는 이름부터 잠깐 짚고 넘어가려 한다. 이 `xxxImpl` 패턴이 `react.ts`의 `createImpl`, `devtools.ts`의 `devtoolsImpl`에서도 계속 반복해서 나오길래 궁금해서 알아봤다.

<br/>

> **`Impl`...? 그냥 쓰면 안되나..?**
>
> `createStoreImpl`, `createImpl`, `devtoolsImpl`처럼 실제 로직 함수엔 전부 `Impl`이 붙어있고, 정작 `export`되는 건 따로 있다.
>
> 왜 굳이 실제 기능 함수와 export 하는 함수를 따로 구분짓는 것일까?
>
> ```ts
> const createStoreImpl: CreateStoreImpl = (createState) => { /* 진짜 로직 */ }
>
> export const createStore = (<T>(createState) =>
>   createState ? createStoreImpl(createState) : createStoreImpl) as CreateStore
> ```
>
> `createStoreImpl`은 "인자 하나 받아서 store를 만드는" 단순한 함수인데, 밖으로 노출되는 `createStore`는 커링 형태(`createStore<State>()(...)`)까지 지원해야 해서 시그니처가 복잡해진다.
>
> 그래서 진짜 로직은 `Impl`에 단순하게 몰아넣고, `export`되는 쪽은 그 위에 분기만 얇게 씌운 다음 `as CreateStore`로 원하는 공개 타입을 붙인다.
>
> `setState`처럼 "이렇게 부르면 이 타입, 저렇게 부르면 저 타입"으로 호출 형태별 타입을 여러 벌 선언해둔 걸 오버로드라고 하는데, zustand는 이런 걸 `Impl` 함수 안에서 다 맞추려 하지 않는다. 그냥 느슨한 타입으로 편하게 구현해놓고, 마지막에 `as CreateStore`로 "이 함수는 이런 타입이야"라고 한 번에 못박아버린다. 구현은 편하게, 타입은 깔끔하게 분리한 셈이다.

<br/>

차근차근 선언부를 확인해보자.

확인할 때는 타입 선언을 제거한 js로 보며 로직을 확인할 것이다.

`state`는 그냥 `TState` 타입 변수, `listeners`는 `Set`으로 선언되어 있다.

```ts
const setState = (partial, replace) => {
  const nextState = typeof partial === 'function' ? partial(state) : partial

  if (!Object.is(nextState, state)) {
    const previousState = state
    
    state = replace ? nextState : Object.assign({}, state, nextState)
    
    listeners.forEach((listener) => listener(state, previousState))
  }
}
```
여기서 `partial`과 `replace`가 뭔지부터 짚고 가야 했다.

`partial`은 우리가 컴포넌트에서 `set({ count: 1 })`이나 `set((state) => ({ count: state.count + 1 }))`처럼 호출할 때 넘기는 그 인자다. 객체를 바로 넘길 수도 있고, 이전 state를 받아서 다음 state를 반환하는 함수를 넘길 수도 있다는 뜻이다.

`replace`는 두 번째 인자로, "상태를 통째로 갈아끼울지, 기존 값이랑 합칠지"를 정하는 옵션이다. 평소에 `set({ count: 1 })`만 쓸 땐 신경 쓸 일이 없어서 존재조차 몰랐다.

<br/>

`setState`의 흐름을 순서대로 따라가보면,

1. `partial`이 함수면 실행해서 다음 상태를 얻고, 함수가 아니면 그대로 `nextState`로 쓴다.
2. `Object.is`로 현재 `state`와 `nextState`가 같은지 비교한다. 같으면 아무 일도 안 하고 끝난다.
3. 다르면 `previousState`에 현재 `state`를 저장해둔다.
4. `replace` 여부(정확히는 `replace ?? (원시값이거나 null인지)`)에 따라 통째로 교체하거나, `Object.assign`으로 기존 state와 합친다.
5. 마지막에 `listeners`를 순회하면서 구독 컴포넌트에 변경을 알린다.

<br/>

```ts
state =
  (replace ?? (typeof nextState !== 'object' || nextState === null))
    ? (nextState as TState)
    : Object.assign({}, state, nextState)
```

여기서 처음 봤을 땐 "`replace`가 `true`면 교체, `false`면 병합"이라고 단순하게 이해했는데, 다시 보니 `replace`를 아예 안 넘기는 경우(`undefined`)까지 고려한 코드였다.

`nextState`가 객체가 아니거나 `null`이면 `replace`를 명시 안 해도 자동으로 전체 교체로 처리된다. 그러니까 상태가 숫자나 문자열 같은 원시값이면 병합을 시도하지 않고 그냥 통째로 바뀐다는 뜻이다.

`??`(nullish coalescing) 하나에 이런 분기가 숨어있는 걸 처음엔 놓쳤다.

<br/>

```ts
const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
```

`subscribe`는 `listeners`에 `listener`라는 콜백을 추가하고,

 `() => listeners.delete(listener)`를 반환한다.

subscibe 선언으로 구독 컴포넌트를 등록하고, 이것을 호출하면 반횐된 delete 함수가 호출되어 구독이 해지된다. 

마치 `useEffect`의 클린업 함수처럼 쓸 수 있는 구조다.

<br/>

```ts
const getInitialState= () => initialState
...
const initialState = (state = createState(setState, getState, api))
```

`getInitialState()`는 처음엔 "스토어 생성 시 초기 상태를 반환할 때 쓰는 것" 정도로만 이해했는데, 핵심은 그게 아니었다.

`state`는 `setState`가 호출될 때마다 계속 재할당되면서 바뀌지만, `initialState`는 스토어가 처음 만들어질 때의 값을 그대로 들고 있다. 

따라서 `store.setState(store.getInitialState(), true)`처럼 **리셋 기능**을 구현할 때 쓰인다.

상태 관리 라이브러리라면 리셋은 당연히 필요한 기능이다..!

여담으로 마지막 줄 `const initialState = (state = createState(...))` 이 부분도 눈여겨봐야했다. 

`getInitialState`가 이 줄보다 **먼저** 정의되는데도 정상 동작한다.

처음엔 이게 호이스팅 때문인가 싶었는데, `var`나 `function` 호이스팅이 아니라 클로저가 변수 자체를 참조하고 있어서였다. `getInitialState`가 실제로 호출되는 시점(스토어 생성이 다 끝난 뒤)에는 이미 `initialState`가 할당되어 있으니 문제가 없는 것.

함수 선언 순서와 실행 순서를 헷갈리면 안 된다는 걸 다시 깨달았다.

<br/>

![pub-sub 패턴](/assets/etc/zui/pub-sub-arch.jpg)

> **알아둘 개념 — Pub/Sub 패턴**
>
> `subscribe`와 `listeners.forEach` 구조를 보면서 처음 접한 개념이다.
>
> 구독자(Subscriber)가 미리 등록해두면, 발행자(Publisher)가 이벤트가 생겼을 때 등록된 구독자 전부에게 알려주는 패턴이다. 핵심은 발행자가 구독자를 몰라도 된다는 **느슨한 결합**이다.
>
> Zustand에 대입하면 `subscribe(listener)`가 구독, `setState` 끝의 `listeners.forEach(...)`가 발행이다. `setState`는 누가 구독 중인지 몰라도 되고, 구독자가 늘든 줄든 구현은 그대로다.
>
> 그럼 평소 쓰던 `element.addEventListener('click', cb)`나 `emitter.on('message', cb)`랑은 뭐가 다를까 찾아봤는데, 메커니즘은 사실상 같다. 둘 다 리스너 목록을 들고 있다가 이벤트 발생 시 순회하며 호출하는 옵저버 패턴이다.
>
> 차이는 두 가지다. `on`/`addEventListener`는 이벤트 이름으로 여러 종류를 구분하지만 zustand는 "상태 변경" 딱 하나뿐이고, `emit`은 아무 값이나 실어 보낼 수 있지만 zustand는 항상 `(새 state, 이전 state)`만 넘긴다.
>
> 그래서 "Pub/Sub"이라 부르지만 실제로는 옵저버 패턴에 더 가깝고, `addEventListener`/`on`도 같은 뿌리에서 나온 다른 이름이라고 이해하고 넘어갔다.

### 추가로..

**listeners는 왜 Set인가?** <br/>
Set을 쓰면 같은 리스너가 중복으로 등록되는 걸 막을 수 있고, `Set.delete`는 배열처럼 인덱스를 찾아 순회할 필요 없이 O(1)로 제거된다. 구독/해지가 잦은 구조에서는 배열보다 Set이 합리적인 선택이다.


<br/>

## Step 3. react.ts — React와 연결되는 지점

`react.ts`를 열어보니 생각보다 분량이 짧았다. 크게 `useStore`, `createImpl`, `create` 세 부분으로 나눠서 봤다.

```ts
export function useStore<TState, StateSlice>(
  api: ReadonlyStoreApi<TState>,
  selector: (state: TState) => StateSlice = identity as any,
) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector]),
  )
  React.useDebugValue(slice)
  return slice
}

const createImpl = <T>(createState: StateCreator<T, [], []>) => {
  const api = createStore(createState)

  const useBoundStore: any = (selector?: any) => useStore(api, selector)

  Object.assign(useBoundStore, api)

  return useBoundStore
}

export const create = (<T>(createState: StateCreator<T, [], []> | undefined) =>
  createState ? createImpl(createState) : createImpl) as Create
```

<br/>

### useStore

타입을 걷어내고 로직만 보면 이렇다.

```js
function useStore(api, selector = identity) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    () => selector(api.getState()),
    () => selector(api.getInitialState()),
  )
  React.useDebugValue(slice)
  return slice
}
```

`useSyncExternalStore`는 처음엔 "React 스토어 시스템과 외부 스토어를 연결할 때 쓰는 API인가보다" 정도로만 추측했는데, 실제로 맞는 방향이었다.

![useSyncExternalStore 공식 문서](/assets/etc/zui/use-sync-external-store-docs.png)

<bookmark url="https://ko.react.dev/reference/react/useSyncExternalStore"></bookmark>

React 18에 도입된 훅으로, React state가 아닌 **외부 스토어를 구독해서 리렌더링을 트리거**하는 공식 API였다.

인자를 하나씩 뜯어보면,

- 1번째 인자(`subscribe`) — Step 2에서 본 그 `subscribe`. React가 이 함수로 리스너를 등록해두고, `setState`가 호출되면 React한테 "리렌더링해도 되는지 확인해봐"라는 신호가 간다.
- 2번째 인자(`getSnapshot`) — `selector(api.getState())`. 현재 상태에서 selector로 뽑아낸 값을 반환한다. React가 렌더링마다 호출해서 이전 값과 `Object.is`로 비교하고, 다르면 리렌더링한다.
- 3번째 인자(`getServerSnapshot`) — `selector(api.getInitialState())`. SSR용 스냅샷이다. 서버는 항상 초기 상태를 기준으로 렌더링해야 하니까, `getInitialState`는 언제 필요한가에 대한 답이 된다.

`selector`는 처음엔 역할 자체를 몰랐는데, 코드를 보고 나서야 이해가 됐다.

**스토어 전체 상태 중 컴포넌트가 실제로 필요한 조각만 뽑아내는 함수**이다.

- selector를 안 넘기면 기본값 `identity`(받은 값 그대로 반환)가 쓰여서 스토어 상태 전체가 반환된다. 즉 스토어의 어떤 부분이 바뀌든 간에 이 컴포넌트는 리렌더링 대상이 된다.
- selector를 넘기면(`state => state.count`처럼) 필요한 값만 뽑아낸다. `useSyncExternalStore`가 이 뽑아낸 값을 `Object.is`로 비교하기 때문에, selector가 뽑은 부분이 안 바뀌면 리렌더링 자체가 안 일어난다.

즉 selector는 그냥 편의 문법이 아니라 **불필요한 리렌더링을 막는 최적화 지점**이자, "필요한 부분만 구독한다"는 Zustand의 설계 철학이 실제로 구현된 자리였다.

Context API를 쓸 때 값 하나만 바뀌어도 컴포넌트 하위를 포함해 Provider로 감싼 전체 트리가 리렌더링되는 문제를 겪어봤던 터라, 왜 selector 패턴을 만들었는지 체감이 됐다.. ㅠㅠ

정리하면 `useStore`는 **vanilla store를 React 컴포넌트가 구독할 수 있게 이어주는 훅**이다.

<br/>

### createImpl

 `create`의 실질적 구현인 `createImpl`는 내부 함수가 대부분의 일을 한다.

```ts
const createImpl = (createState) => {
  const api = createStore(createState)

  const useBoundStore = (selector) => useStore(api, selector)

  Object.assign(useBoundStore, api)

  return useBoundStore
}
```

`createStore(createState)`는 Step 2에서 본 그 `createStoreImpl`이다. 

여기서 진짜 `api`(`setState`, `getState`, `subscribe` 등)를 만든다.

그 다음이 좀 신기했는데, `useBoundStore`라는, `selector`를 받아서 `useStore(api, selector)`를 호출하는 **함수**를 하나 만들어놓고, 그 함수에다 `Object.assign(useBoundStore, api)`로 `api`를 통째로 합쳐버린다.

우리가 `useCounterStore()`라고 훅처럼 쓰는 그 변수가, 사실은 **함수이면서 동시에 `getState`, `setState`, `subscribe` 같은 메서드도 달고 있는 객체**였던 것이다.

`useCounterStore()`는 컴포넌트 안에서 훅으로 쓰고, `useCounterStore.getState()`는 컴포넌트 바깥 어디서든 편하게 함수처럼 부를 수 있는 이유가 여기 있었다. 

<br/>

### create

```ts
export const create = (<T>(createState: StateCreator<T, [], []> | undefined) =>
  createState ? createImpl(createState) : createImpl) as Create
```

이 마지막 줄은 처음 보고 뭐 하는 건가 싶었다.

AI와 검색을 십분 활용해 용도를 알아야했다.

핵심은 **두 가지 호출 방식**을 모두 지원하기 위해서다.

```ts
create((set) => ({ ... }))
create<State>()((set) => ({ ... }))
```

`createState`가 있으면 바로 `createImpl(createState)`를 실행하고, 없으면 `createImpl` 함수를 반환한다.

이렇게 두 번 호출하는 이유는 **TypeScript의 제네릭 추론 한계** 때문이다.

`create<State>((set) => ({ ... }))`처럼 상태 타입만 직접 지정하면 `set`, `get` 타입 추론이 깨질 수 있다.

그래서 `create<State>()`로 상태 타입만 먼저 확정하고, 두 번째 호출에서 `(set) => ({ ... })`를 넘겨 나머지 타입은 TypeScript가 추론하도록 만든 것이다.

즉, 커링(curried) 형태의 호출을 지원해 TypeScript의 제네릭 추론 한계를 우회한 구조이다.

<br/>


*이 코드는 일반 호출과 커링 형태의 호출을 모두 지원하면서, TypeScript의 제네릭 추론을 유지하기 위한 분기 역할을 한다.*

<br/>

## Step 4. middleware/devtools.ts

`zui()`가 참고할 구조는 `middleware/devtools.ts`다.

굳이 devtools.ts까지 이렇게 깊게 살펴보는 이유는, zui가 하려는 작업도 결국 devtools랑 구조가 같기 때문이다. 

zui는 상태를 GUI에서 실시간으로 **조회**하고, GUI에서 값을 바꾸면 앱에 그대로 **주입**해야 한다. 

devtools도 앱 → 패널로 상태를 실시간 보고하고(조회), 패널 → 앱으로 시간여행/상태 주입 메시지를 보낸다(편집). 방향만 다를 뿐 똑같은 양방향 통신 문제고, 그 과정에서 겪었을 무한루프, 여러 스토어 공유 같은 문제들도 이미 여기 다 풀려있다. 

그래서 devtools.ts를 zui의 설계도 삼아 읽어보기로 했다.

<br/>

`src/middleware.ts` 안에 공식 미들웨어(`devtools`, `persist`, `immer`, `redux` 등)가 다 모여있는데, 이번엔 그중에서 devtools 부분만 처음부터 끝까지 따라가봤다.
<br/><br/>

### devtoolsImpl - 진입점

```ts
const devtoolsImpl: DevtoolsImpl =
  (fn, devtoolsOptions = {}) =>
  (set, get, api) => {
    // ...
  }
```
188-424 라인까지 차지하는 방대한 분량이다.

인자부터 보도록하자.

`fn`은 Step 2에서 본 그 `createState`, 즉 `create((set, get) => ({ ... }))` 할 때 우리가 직접 넘기는 그 함수가 된다.

`devtoolsOptions`는 `{ name, enabled, anonymousActionType, store }` 같은 설정 객체이다.

결국에는 이 `devtoolsImpl`이 반환하는 `(set, get, api) => { ... }`가 핵심이다.

이 반환체가 바로 `StateCreator` 모양 그대로가 되는데, `devtools(fn)`을 호출하면, `fn`을 감싼 "또 다른 `fn`"이 나오는 것이다.

전에 궁금해했던 "미들웨어 체이닝"이 코드로는 이렇게 생겼구나 싶었다.

<br/>

### extensionConnector - 확장 프로그램 유무 체크

```ts
const { enabled, anonymousActionType, store, ...options } = devtoolsOptions

let extensionConnector
try {
  extensionConnector =
    (enabled ?? import.meta.env?.MODE !== 'production') &&
    window.__REDUX_DEVTOOLS_EXTENSION__
} catch {
  // ignored
}

if (!extensionConnector) {
  return fn(set, get, api)
}
```

내부를 보면 먼저 devtoolsOptions를 구조분해할당해 사용하기 쉽도록 꺼낸다.

extensionConnector를 선언하고, 있는지 없는지부터 체크한다.

`window.__REDUX_DEVTOOLS_EXTENSION__`은 redux devtools 크롬 확장 프로그램이 설치되어 있으면 브라우저가 전역에 심어주는 객체다.

`enabled` 옵션을 명시 안 하면 `production` 모드가 아닐 때만 켜지도록 기본값이 잡혀 있다.

배포 환경에서 굳이 유저 브라우저에 디버깅 창을 열어줄 필요는 없으니 이렇게 처리한 것이다.

 `if (!extensionConnector) return fn(set, get, api)`를 보자.

확장 프로그램이 없거나 프로덕션 환경이면, devtools 관련 로직은 전부 건너뛰고 그냥 원래 `fn`을 그대로 실행해서 돌려준다.

미들웨어를 씌웠다고 해서 앱이 devtools 없이는 안 돌아가면 안 되니, "없으면 그냥 원본처럼 동작"하는 이 fallback이 필수였던 것 같다.

<br/>

### tracked connection - 스토어 창 공유

```ts
const trackedConnections = new Map()

const extractConnectionInformation = (store, extensionConnector, options) => {
  if (store === undefined) {
    return { type: 'untracked', connection: extensionConnector.connect(options) }
  }
  const existingConnection = trackedConnections.get(options.name)
  if (existingConnection) {
    return { type: 'tracked', store, ...existingConnection }
  }
  const newConnection = { connection: extensionConnector.connect(options), stores: {} }
  trackedConnections.set(options.name, newConnection)
  return { type: 'tracked', store, ...newConnection }
}
```

인자 세 개부터 짚고 가면, 

`store`는 `devtools(fn, { store: 'user' })`처럼 이 스토어를 구분할 이름표다.

 `extensionConnector`는 앞서 확인한 그 `window.__REDUX_DEVTOOLS_EXTENSION__` 객체이다.(실제로 connection을 생성). 
 
 `options`는 `devtoolsOptions`에서 `enabled`, `anonymousActionType`, `store`를 뺀 나머지, 즉 `{ name, ... }` 같은 설정값이다.

여기서 "창"이라고 부르는 것의 개념을 짚고 가면, 크롬 확장 프로그램 Redux DevTools를 설치하면 브라우저 개발자도구 안에 State/Diff/Action 같은 탭이 있는 패널이 하나 생기는데, 그 패널 하나(인스턴스 하나)를 의미한다. 

상태 트리랑 액션 로그가 실시간으로 찍히는 화면이다.

![Redux DevTools 확장 프로그램 패널](/assets/etc/zui/redux-devtools-panel.png)

<br/>

여기서 `name`의 역할도 헷갈렸는데, `name`은 **패널과 짝지어지는 `connection`을 구분하는 키**다. 패널이 눈에 보이는 UI라면, `connection`은 그 패널과 통신하기 위해 코드가 들고 있는 객체(손잡이)다.

같은 `name`을 쓰는 스토어들끼리만 `trackedConnections`에서 같은 connection을 나눠 쓴다. 

반면 `store`는 그렇게 합쳐진 창 안에서 "어떤 스토어인지" 표시하는 이름표 역할을 한다. 

`name`이 창을 정하고, `store`가 그 창 안의 자리를 정하는 셈이다.

그러면 여기서 계속 나오는 `connection`은 정확히 뭘까. 

`extensionConnector.connect(options)`가 반환하는 값인데, Redux DevTools 확장 프로그램이 만들어주는 **채널 객체**이다. 

`connect()`를 부르는 순간 브라우저 확장 프로그램 쪽에 이 앱 전용 탭(혹은 인스턴스)이 하나 열리고, 그 탭과 통신할 수 있는 손잡이가 `connection`으로 돌아온다.

이 `connection`이 들고 있는 메서드들이 지금까지 본 코드 전체를 관통한다. `connection.send(action, state)`로 앱 → DevTools 방향으로 상태를 보고하고, `connection.init(state)`로 DevTools 트리의 최초 상태를 세팅하고, `connection.subscribe(listener)`로 반대로 DevTools → 앱 방향 메시지를 받는다. 

즉 `connection` 하나가 devtools 미들웨어와 브라우저 확장 프로그램 사이를 잇는 유일한 통로였다.

<br/>

`devtools(fn)`에 `store` 옵션을 안 주면 `untracked`. 그냥 매번 새 connection을 만든다.

`store` 옵션을 주면 `tracked`, 이땐 `options.name`을 키로 하는 `trackedConnections`를 먼저 뒤져본다.

같은 `name`으로 이미 등록된 connection이 있으면 그걸 재사용하고, 없으면 새로 만들어서 `Map`에 등록해둔다.

왜 `Map`이 최상단 범위에 선언돼있는지 의아했는데, 스토어를 여러 개 만들어도(`useUserStore`, `useCartStore` 등) 이 `Map`은 모듈이 로드될 때 딱 한 번만 만들어지고 계속 살아있어야 하기 때문이었다.

그래야 서로 다른 스토어 파일에서 `create(devtools(fn, { name: 'app', store: 'user' }))`, `create(devtools(fn, { name: 'app', store: 'cart' }))` 이렇게만 적어도 같은 `name`이면 자동으로 같은 DevTools 창 하나에 묶인다.

<br/>

### api.setState - set 가로채기

```ts
let isRecording = true

api.setState = (state, replace, nameOrAction) => {
  const r = set(state, replace)
  if (!isRecording) return r

  const action =
    nameOrAction === undefined
      ? { type: anonymousActionType || findCallerName(new Error().stack) || 'anonymous' }
      : typeof nameOrAction === 'string'
        ? { type: nameOrAction }
        : nameOrAction

  if (store === undefined) {
    connection?.send(action, get())
    return r
  }
  connection?.send(
    { ...action, type: `${store}/${action.type}` },
    { ...getTrackedConnectionState(options.name), [store]: api.getState() },
  )
  return r
}

api.devtools = {
  cleanup: () => {
    if (connection && typeof connection.unsubscribe === 'function') {
      connection.unsubscribe()
    }
    removeStoreFromTrackedConnections(options.name, store)
  },
}
```

여기서 순서를 눈여겨보자. 

`set(state, replace)`를 제일 먼저 호출해서 **실제 상태 변경을 먼저 끝내놓고**, 그 다음에 devtools로 보낼 액션을 준비한다.

상태 갱신이 devtools 전송보다 우선이라는 뜻이라고한다.


```ts
nameOrAction === undefined
      ? { type: anonymousActionType || findCallerName(new Error().stack) || 'anonymous' }
```
`nameOrAction`은 `set({ count: 1 }, false, 'increment')`처럼 우리가 세 번째 인자로 액션 이름을 직접 넘길 수도 있는 자리다.

안 넘기면 `findCallerName(new Error().stack)`으로 이름을 추측한다.

`new Error().stack`은 지금 이 코드가 어떤 함수들을 거쳐서 호출됐는지 알려주는 문자열이다.
<br/>

```ts
function findCallerName(stack) {
  if (!stack) return undefined
  const traceLines = stack.split('\n')
  const apiSetStateLineIndex = traceLines.findIndex((line) => line.includes('api.setState'))
  if (apiSetStateLineIndex < 0) return undefined
  const callerLine = traceLines[apiSetStateLineIndex + 1]?.trim() || ''
  return v8StackLineRe.exec(callerLine)?.[1] || geckoStackLineRe.exec(callerLine)?.[1]
}
```
findCallerName을 살펴보자.

이름에서부터 호출자 이름 찾기인데, 깃허브 소스 기준 174라인에 선언돼있다.

한 줄씩 쪼개서(`split('\n')`), `api.setState`가 적힌 줄을 찾고, 그 **바로 다음 줄**(= `api.setState`를 호출한 쪽, 가장 내부인 현 인덱스는 현재 실행중인 곳임 그래서 index+1)의 이름을 정규식으로 뽑아낸다.

그래서 `set(newState)`처럼 이름을 안 적어도 devtools 창에 그 값을 바꾼 함수 이름이 액션 이름으로 자동으로 뜨는 것이다.


```ts
api.devtools = {
  cleanup: () => {
    if (connection && typeof connection.unsubscribe === 'function') {
      connection.unsubscribe()
    }
    removeStoreFromTrackedConnections(options.name, store)
  },
}
```

바로 이어서 붙는 `api.devtools = { cleanup: ... }`도 보자. 

`cleanup`은 connection 구독을 끊고, `removeStoreFromTrackedConnections`로 이 스토어를 `trackedConnections`에서 빼주는 역할이다. 

스토어 하나를 다 쓰고 정리할 때, 등록해뒀던 흔적도 같이 지워주는 짝이다.

<br/>

### isRecording - 무한 루프 방지

```ts
const setStateFromDevtools = (...a) => {
  const originalIsRecording = isRecording
  isRecording = false
  set(...a)
  isRecording = originalIsRecording
}
```

이 함수가 `api.setState` 바로 다음, `initialState`를 계산하기도 전에 미리 선언되어 있었다. 뒤에 나올 두 곳(초기 상태 계산, devtools 메시지 처리)에서 공통으로 쓰이기 때문이었다.

devtools에서 `JUMP_TO_STATE`(타임머신) 같은 메시지가 오면 이 `setStateFromDevtools`가 호출된다. 여기서 `isRecording`을 잠깐 꺼놓고 `set`을 호출한 다음 다시 켜놓는다.

만약 이 플래그가 없으면 어떻게 될지 에이전트에 물어봤다.

devtools가 보낸 상태로 `set`을 호출 → `set`이 상태를 바꿈 → 그런데 이 `set` 호출도 결국 `api.setState`를 거치게 되면 → `connection.send`가 또 실행돼서 devtools에 "상태 바뀜"을 다시 보고 → devtools 창은 이미 자기가 보낸 값인데 그걸 또 받아서 새 액션으로 기록... 이게 반복되면 무한루프에 빠진다...

devtool로 상태변경하고, 앱의 상태변경을 하고, 앱을 보고 또 devtool은 상태변경하고... 난장판이 되는 것이다..

그래서 `isRecording`을 꺼둔 상태에서 `set`을 호출하면, `api.setState` 내부의 `if (!isRecording) return r` 라인에서 바로 걸러져서 `connection.send`까지 가지 않게 된다.

**devtools가 만든 변경은 다시 devtools한테 보고하지 않는**것이 루프를 막는 원칙이다.

<br/>

### connection.init - 초기 상태 계산

```ts
const initialState = fn(api.setState, get, api)

if (connectionInformation.type === 'untracked') {
  connection?.init(initialState)
} else {
  connectionInformation.stores[connectionInformation.store] = api
  connection?.init(
    Object.fromEntries(
      Object.entries(connectionInformation.stores).map(([key, store]) => [
        key,
        key === connectionInformation.store ? initialState : store.getState(),
      ]),
    ),
  )
}
```

`fn(api.setState, get, api)`를 호출하는 부분을 보자.

Step 2에서 본 `createState(setState, getState, api)`와 같은 모양인데, 여기선 원본 `set`이 아니라 방금 만든 **devtools 로직이 붙은 `api.setState`**를 넘긴다. 

그래야 유저가 스토어 정의 안에서 `set(...)`을 호출할 때도 devtools 로그가 남는다고 한다.

`untracked`(store 전달이 안된 상태)면 간단하다. 

`connection.init(initialState)`로 자기 상태만 넘기고 끝이다.

`tracked`면 다른데, `connectionInformation.stores`(tracked connection의 공유 `Map` 안의 `stores` 객체)에 자기 자신(`api`- set, get, subscribe 등이 있는 객체)을 먼저 등록해두고, 등록된 스토어 전부를 순회하면서 "자기 자신이면 방금 계산한 `initialState`, 자신이 아니면 그 store의 `getState()`"로 합쳐서 하나의 객체로 `connection.init`에 넘긴다.

여러 스토어가 DevTools 창 하나에서 `{ user: {...}, cart: {...} }` 이런 식으로 함께 뜰 수 있는 이유가 이것이다!

<br/>

### redux - 미들웨어 연동

```ts
const shouldDispatchFromDevtools = (api) =>
  !!api.dispatchFromDevtools && typeof api.dispatch === 'function'

if (shouldDispatchFromDevtools(api)) {
  let didWarnAboutReservedActionType = false
  const originalDispatch = api.dispatch
  api.dispatch = (...args) => {
    if (args[0].type === '__setState' && !didWarnAboutReservedActionType) {
      console.warn('"__setState" action type is reserved. Avoid using it.')
      didWarnAboutReservedActionType = true
    }
    originalDispatch(...args)
  }
}
```

`redux` 미들웨어를 같이 쓰면 `api.dispatchFromDevtools = true`가 세팅되고, `api.dispatch`도 생긴다.

`__setState`는 devtools가 상태를 직접 주입할 때 예약해둔 액션 이름이다. 

유저가 redux 미들웨어를 쓰면서 실수로 이 이름으로 액션을 dispatch하면 충돌이 날 수 있어서, `api.dispatch`를 한 번 감싸서 그 이름이 쓰이면 콘솔에 경고를 띄워준다. 

`didWarnAboutReservedActionType`으로 경고는 플래그로써 한 번만 뜨게 했다.

devtools와 redux 미들웨어가 서로 존재를 모르는 채로도, `api`라는 공유된 객체에 심어둔 플래그 하나로 연동되는 구조였다.

<br/>

### connection.subscribe

지금까지 "앱이 devtools한테 상태를 보고한다"는 방향만 봤는데, `connection.subscribe`는 반대로 **DevTools 확장 프로그램이 우리 앱한테 메시지를 보내는** 방향이었다.

```ts
connection.subscribe((message) => {
  switch (message.type) {
    case 'ACTION':
      if (typeof message.payload !== 'string') return
      return parseJsonThen(message.payload, (action) => {
        if (action.type === '__setState') {
          setStateFromDevtools(action.state)
          return
        }
        if (shouldDispatchFromDevtools(api)) {
          api.dispatch(action)
        }
      })

    case 'DISPATCH':
      switch (message.payload.type) {
        case 'RESET':
          setStateFromDevtools(initialState)
          return connection?.init(api.getState())

        case 'COMMIT':
          return connection?.init(api.getState())

        case 'ROLLBACK':
          return parseJsonThen(message.state, (state) => {
            setStateFromDevtools(state)
            connection?.init(api.getState())
          })

        case 'JUMP_TO_STATE':
        case 'JUMP_TO_ACTION':
          return parseJsonThen(message.state, (state) => {
            setStateFromDevtools(state)
          })

        case 'IMPORT_STATE': {
          const { nextLiftedState } = message.payload
          const lastComputedState = nextLiftedState.computedStates.slice(-1)[0]?.state
          if (!lastComputedState) return
          setStateFromDevtools(lastComputedState)
          connection?.send(null, nextLiftedState)
          return
        }

        case 'PAUSE_RECORDING':
          return (isRecording = !isRecording)
      }
  }
})
```


하나씩 짚어봤다.

**`ACTION`** — DevTools 창의 "Dispatch" 탭에서 개발자가 직접 JSON 액션을 만들어서 보냈을 때 온다. `__setState`라는 예약된 타입이면 상태를 통째로 갈아끼우고, 아니면(진짜 redux 액션이면) `shouldDispatchFromDevtools(api)`가 참일 때만 `api.dispatch(action)`으로 실제 리덕스 액션을 흘려보낸다.

**`RESET`** — 스토어가 처음 만들어질 때 계산해둔 `initialState`로 되돌리고, DevTools 쪽 기록도 그 값으로 다시 `init`해서 새 기준점을 잡는다.

**`COMMIT`** — 지금 상태를 그대로 다시 `connection.init`에 넘겨서 "여기가 새 기준점"이라고 알려주기만 한다. 상태 자체는 바뀌지 않는다.

**`ROLLBACK`** — `message.state`(JSON 문자열)를 파싱해서 그 값으로 되돌리고, 역시 새 기준점으로 `init`한다.

**`JUMP_TO_STATE` / `JUMP_TO_ACTION`** — DevTools 타임라인에서 과거 특정 지점을 클릭했을 때 온다. `message.state`를 그 시점 값으로 파싱해서 `setStateFromDevtools`로 바꾸기만 한다. `RESET`/`ROLLBACK`과 다르게 `connection.init`을 다시 안 부르는데, 지금 시점을 "새 기준점"으로 확정 짓는 게 아니라 그냥 잠깐 과거를 보여주는 것뿐이라 그런 것 같다.

**`IMPORT_STATE`** — 미리 내보내둔 전체 기록(`nextLiftedState`)을 통째로 불러올 때다. `computedStates` 배열의 마지막 항목이 가장 최신 상태라서 그걸 꺼내 적용하고, 불러온 기록 전체를 다시 `connection.send`로 DevTools에 돌려준다.

**`PAUSE_RECORDING`** — `isRecording`을 그냥 토글한다. DevTools 창의 일시정지 버튼을 누르면 이게 호출된다.

이 하나하나를 다 외울 필요는 없겠지만, "시간여행 디버깅"이라는 게 결국 `message.state`에 저장된 과거 값을 스위칭 케이스에 따라 바꿔끼우며 `setStateFromDevtools`로 되돌리는 것뿐이었다는 것을 알자.

<br/>

> **JSON으로 직렬화해서 주고받는 이유가 뭘까?**
>
> `connection`은 확장 프로그램과 웹페이지, 즉 메모리를 공유하지 않는 서로 다른 실행 컨텍스트를 잇는 채널이다. 참조를 그대로 넘길 수 없으니, 값을 문자열로 직렬화해서 보내고 받는 쪽이 다시 파싱해서 복원해야 한다. `message.payload`나 `message.state`가 JSON 문자열로 오고 `parseJsonThen`으로 파싱하는 이유가 여기 있다.

<br/>

### 추가로...

**`api.setState`를 덮어쓰는 방식과, `set`을 감싸서 새 함수를 반환하는 방식은 뭐가 다른가?**

`set`을 감싸서 새 함수를 만들면, 그 새 함수를 실제로 손에 쥔 코드만 감싸진 로직(devtools 전송)을 타게 된다.

그러나 `api`는 스토어 전체에서 공유하는 단 하나의 객체이기에, `api.setState` 자체를 바꿔치기해두면 그 이후로 누가 `api.setState`를 부르든(다른 미들웨어, 유저 코드, 심지어 나중에 체이닝되는 또 다른 미들웨어) 전부 자동으로 devtools 로직을 거치게 된다.

참조가 여기저기 퍼질 수 있는 상황에서는 감싸는 것보다 재할당이 훨씬 확실하게 가로챈다고 한다.

**`isRecording` 대신 메시지에 "출처"를 표시하는 방법은 안 될까?**

`set(state, replace, action)`처럼 이미 공개 API로 노출된 시그니처에 "이건 devtools가 보낸 거야" 같은 내부 플래그를 끼워 넣으려면 시그니처를 오염시키거나 별도의 채널이 필요해진다.

반면 `isRecording`은 클로저 안에 숨어있는 변수 하나로 온오프만 하면 되니 구현이 훨씬 단순하다.

`zui()`도 아마 GUI ↔ 앱 사이에서 똑같은 문제를 만날 텐데, 이 플래그 방식을 그대로 가져다 쓰면 될 듯하다.

<br/>

여기까지 devtools.ts를 읽고 나니, `zui()`도 결국 이 구조 — `api.setState` 가로채기, 양방향 메시지 처리, `isRecording` 같은 재진입 방지 플래그 — 를 거의 그대로 참고하게 될 것 같다.

<br/>

>다음 포스팅부터는 이 패턴을 참고해서 실제로 `zui()` 미들웨어 구현에 들어가볼 예정이다.
>
>아직 라이브러리를 비롯해 상태 관리를 다루는 수준이 부족하기에, 혼자서 무턱대고 만들다간 시간이 매우 오래걸릴 것이라 판단했다.
>
>따라서, AI 에이전트를 활용하되, 모든 구현과 기능 개발을 맡기지 않고, 스텝과 가이드를 나누게 하여 마치 과제를 내주듯 지시하여 이를 채우며, 리팩토링하고 코드리뷰 등 페어 프로그래밍 할 예정이다.
