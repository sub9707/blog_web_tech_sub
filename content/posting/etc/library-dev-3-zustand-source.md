---
title: "라이브러리 개발기 (3) — Zustand 소스코드 해체분석"
date: "2026-07-10"
description: "zui 만들기 전에, Zustand 소스를 해체분석"
tags: ["library", "zustand", "source-code", "open-source", "devtools"]
thumbnail: "/assets/thumbnails/zui.png"
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

![StateCreator 제네릭 시그니처](/assets/etc/zustand-state-creator-type.png)

`Mis`, `Mos`가 뭔지, `StoreMutatorIdentifier`가 뭔지부터 막막했다.

처음 소스를 접할 땐 배경지식이 없으니 그냥 난해한 암호처럼 보였다.

이건 약과였다. 

타입 유틸을 따라 들어가다가 `TakeTwo`라는 타입을 마주쳤는데, 그야말로 타입 타워였다.

![TakeTwo 타입 타워](/assets/etc/zustand-type-tower.png)

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

![pub-sub 패턴](/assets/etc/pub-sub-arch.jpg)

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

![useSyncExternalStore 공식 문서](/assets/etc/use-sync-external-store-docs.png)

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

여기까지 vanilla store와 React 바인딩을 보고 나니, `create(fn)`의 `fn` 자리에 들어가는 게 어떤 모양인지, 그리고 그걸 감싸는 미들웨어가 왜 `(set, get, api) => {...}` 형태를 그대로 반환해야 하는지 감이 잡혔다.

`zui()`가 참고할 구조는 결국 `middleware/devtools.ts`다.

`src/middleware.ts` 안에 공식 미들웨어(`devtools`, `persist`, `immer`, `redux` 등)가 다 모여있는데, 이번엔 그중에서 devtools 부분만 처음부터 끝까지 따라가봤다.

일부만 보고 넘어가면 나중에 `zui()` 만들 때 분명 막힐 것 같아서다.

<br/>

### 진입점 — devtoolsImpl

```ts
const devtoolsImpl: DevtoolsImpl =
  (fn, devtoolsOptions = {}) =>
  (set, get, api) => {
    // ...
  }
```

`fn`은 Step 2에서 본 그 `createState`, 그러니까 `create((set, get) => ({ ... }))` 할 때 우리가 직접 넘기는 그 함수다.

`devtoolsOptions`는 `{ name, enabled, anonymousActionType, store }` 같은 설정 객체다.

이 `devtoolsImpl`이 반환하는 `(set, get, api) => { ... }`가 핵심이다.

얘가 바로 `StateCreator` 모양 그대로다. 그러니까 `devtools(fn)`을 호출하면, `fn`을 감싼 "또 다른 `fn`"이 나온다는 뜻이다.

전에 궁금해했던 "미들웨어 체이닝"이 코드로는 이렇게 생겼구나 싶었다.

<br/>

### DevTools Extension이 없어도 되는 이유

```ts
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

`window.__REDUX_DEVTOOLS_EXTENSION__`은 크롬 확장 프로그램이 설치되어 있으면 브라우저가 전역에 심어주는 객체다.

`enabled` 옵션을 명시 안 하면 `production` 모드가 아닐 때만 켜지도록 기본값이 잡혀 있다.

배포 환경에서 굳이 유저 브라우저에 디버깅 창을 열어줄 필요는 없으니까 당연한 처리다.

여기서 제일 마음에 든 부분은 `if (!extensionConnector) return fn(set, get, api)`다.

확장 프로그램이 없거나 프로덕션이면, devtools 관련 로직은 전부 건너뛰고 그냥 원래 `fn`을 그대로 실행해서 돌려준다.

미들웨어를 씌웠다고 해서 앱이 devtools 없이는 안 돌아가면 안 되니까, "없으면 그냥 원본처럼 동작"하는 이 fallback이 필수였던 것 같다.

<br/>

### 여러 스토어가 창 하나를 공유하는 방법 — tracked connection

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

`devtools(fn)`에 `store` 옵션을 안 주면 `untracked`. 그냥 매번 새 connection을 만든다.

`store` 옵션을 주면 `tracked`. 이땐 `options.name`을 키로 하는 `trackedConnections`(모듈 레벨 `Map`)를 먼저 뒤져본다.

같은 `name`으로 이미 등록된 connection이 있으면 그걸 재사용하고, 없으면 새로 만들어서 `Map`에 등록해둔다.

왜 `Map`이 모듈 레벨(파일 최상단)에 선언돼있는지 처음엔 의아했는데, 스토어를 여러 개 만들어도(`useUserStore`, `useCartStore` 등) 이 `Map`은 모듈이 로드될 때 딱 한 번만 만들어지고 계속 살아있어야 하기 때문이었다.

그래야 서로 다른 스토어 파일에서 `create(devtools(fn, { name: 'app', store: 'user' }))`, `create(devtools(fn, { name: 'app', store: 'cart' }))` 이렇게만 적어도 같은 `name`이면 자동으로 같은 DevTools 창 하나에 묶인다.

`Map`을 함수 안에 선언했으면 호출할 때마다 새로 만들어져서 이 공유가 아예 안 됐을 거다.

<br/>

### api.setState 재할당 — set 가로채기

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
```

여기서 눈여겨봐야 할 건 순서다. `set(state, replace)`를 제일 먼저 호출해서 **실제 상태 변경을 먼저 끝내놓고**, 그 다음에 devtools로 보낼 액션을 조립한다.

상태 갱신이 devtools 전송보다 우선이라는 뜻이다.

`nameOrAction`은 `set({ count: 1 }, false, 'increment')`처럼 우리가 세 번째 인자로 액션 이름을 직접 넘길 수도 있는 자리다.

근데 안 넘기면? `findCallerName(new Error().stack)`으로 이름을 추측한다.

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

`new Error().stack`은 지금 이 코드가 어떤 함수들을 거쳐서 호출됐는지 알려주는 문자열이다.

한 줄씩 쪼개서(`split('\n')`), `api.setState`가 적힌 줄을 찾고, 그 **바로 다음 줄**(= `api.setState`를 호출한 쪽, 즉 우리가 짠 `increment` 같은 함수)의 이름을 정규식으로 뽑아낸다.

그래서 `set(newState)`처럼 이름을 안 적어도 devtools 창에 그 값을 바꾼 함수 이름이 액션 이름으로 자동으로 뜨는 거였다.

스택 트레이스를 이렇게 실제 기능에 활용하는 코드는 처음 봤다.

<br/>

### DevTools → 앱 방향 (역방향)

```ts
connection.subscribe((message) => {
  switch (message.type) {
    case 'ACTION':
      // devtools UI에서 액션을 직접 dispatch했을 때
      // ...
      return

    case 'DISPATCH':
      switch (message.payload.type) {
        case 'RESET': // 초기 상태로 되돌리기
        case 'COMMIT': // 지금 상태를 새 기준점으로 확정
        case 'ROLLBACK': // 마지막 커밋 시점으로 되돌리기
        case 'JUMP_TO_STATE':
        case 'JUMP_TO_ACTION': // 타임라인의 특정 시점 상태로 이동
        case 'IMPORT_STATE': // 내보내둔 상태 기록을 통째로 불러오기
        case 'PAUSE_RECORDING': // isRecording 토글
      }
  }
})
```

이 부분을 보고 좀 놀랐다. 지금까지는 "우리 앱이 devtools한테 상태를 보고한다"는 방향만 생각했는데, `connection.subscribe`는 반대로 **DevTools 확장 프로그램이 우리 앱한테 메시지를 보내는** 통로였다.

`ACTION`은 devtools 창에서 개발자가 직접 액션을 만들어서 dispatch 버튼을 눌렀을 때 오는 메시지고, `DISPATCH`는 시간여행 디버깅용 명령들이다.

`JUMP_TO_STATE`로 과거 특정 시점 상태로 이동하거나, `RESET`으로 초기 상태로 되돌리거나 하는 게 전부 이 switch문 안에서 처리되고 있었다.

"시간여행 디버깅"이라는 말이 그냥 마케팅 용어인 줄 알았는데, 까보니 그냥 switch-case로 상태를 갈아끼우는 코드였다.

<br/>

### 무한 루프는 왜 안 생기나 — isRecording

```ts
const setStateFromDevtools = (...a) => {
  const originalIsRecording = isRecording
  isRecording = false
  set(...a)
  isRecording = originalIsRecording
}
```

devtools에서 `JUMP_TO_STATE` 메시지가 오면 이 `setStateFromDevtools`가 호출된다.

여기서 `isRecording`을 잠깐 꺼놓고 `set`을 호출한 다음 다시 켜놓는다.

만약 이 플래그가 없으면 어떻게 될지 따라가봤다.

devtools가 보낸 상태로 `set`을 호출 → `set`이 상태를 바꿈 → 그런데 이 `set` 호출도 결국 `api.setState`를 거치게 되면 → `connection.send`가 또 실행돼서 devtools한테 "상태 바뀌었어요"라고 다시 보고 → devtools 창은 이미 자기가 보낸 값인데 그걸 또 받아서 새 액션으로 기록... 이게 반복되면 무한루프다.

그래서 `isRecording`을 꺼둔 상태에서 `set`을 호출하면, `api.setState` 내부의 `if (!isRecording) return r` 라인에서 바로 걸러져서 `connection.send`까지 안 간다.

**devtools가 만든 변경은 다시 devtools한테 보고하지 않는다**는 거다.

솔직히 여기서 `setStateFromDevtools`가 `api.setState`가 아니라 원본 `set`을 직접 부르는 거라 애초에 `connection.send`를 안 탈 것 같은데도 굳이 `isRecording`을 껐다 켜는 걸 보면, 스토어 내부에서 유저 코드가 상태 변경 중에 또 다른 액션을 연쇄로 트리거하는 경우까지 방어하려는 게 아닐까 싶다.

이 부분은 완전히 다 이해했다고는 못 하겠고, 나중에 `zui()`에서 똑같은 무한루프 문제를 직접 만들어보면서 다시 확인해야 할 것 같다.

<br/>

### redux 미들웨어와의 관계

```ts
const shouldDispatchFromDevtools = (api) =>
  !!api.dispatchFromDevtools && typeof api.dispatch === 'function'
```

`redux` 미들웨어를 같이 쓰면 `api.dispatchFromDevtools = true`가 세팅되고, `api.dispatch`도 생긴다.

devtools 쪽에서 메시지를 받았을 때 이 조건이 참이면, 단순히 상태를 바꾸는 대신 `api.dispatch(action)`으로 리덕스 스타일 액션을 실제로 디스패치해준다.

devtools와 redux 미들웨어가 서로 존재를 모르는 채로도, `api`라는 공유 객체에 심어둔 플래그 하나로 연동되는 구조였다.

<br/>

### 추가로...

**`api.setState`를 덮어쓰는 방식과, `set`을 감싸서 새 함수를 반환하는 방식은 뭐가 다른가?**

`set`을 감싸서 새 함수를 만들면, 그 새 함수를 실제로 손에 쥔 코드만 감싸진 로직(devtools 전송)을 타게 된다.

근데 `api`는 스토어 전체에서 공유하는 단 하나의 객체라서, `api.setState` 자체를 바꿔치기해두면 그 이후로 누가 `api.setState`를 부르든(다른 미들웨어, 유저 코드, 심지어 나중에 체이닝되는 또 다른 미들웨어) 전부 자동으로 devtools 로직을 거치게 된다.

참조가 여기저기 퍼질 수 있는 상황에서는 감싸는 것보다 재할당이 훨씬 확실하게 가로챈다.

**`isRecording` 대신 메시지에 "출처"를 표시하는 방법은 안 될까?**

`set(state, replace, action)`처럼 이미 공개 API로 노출된 시그니처에 "이건 devtools가 보낸 거야" 같은 내부 플래그를 끼워 넣으려면 시그니처를 오염시키거나 별도의 채널이 필요해진다.

반면 `isRecording`은 그냥 클로저 안에 숨어있는 변수 하나로 온오프만 하면 되니 구현이 훨씬 단순하다.

`zui()`도 아마 GUI ↔ 앱 사이에서 똑같은 문제를 만날 텐데, 이 플래그 방식을 그대로 가져다 쓸 가능성이 높다.

**`trackedConnections` 없이 각 스토어가 독립적으로 connection을 만들면?**

스토어마다 `extensionConnector.connect()`를 따로 부르면 DevTools 창(혹은 탭)이 스토어 개수만큼 따로따로 뜬다.

여러 스토어의 상태 변화를 하나의 타임라인에서 같이 보면서 시간여행 디버깅을 하고 싶은 게 애초의 목적인데, connection이 쪼개지면 그게 불가능해진다.

`trackedConnections`가 있어야 같은 `name`을 공유하는 스토어들이 하나의 connection과 상태 트리를 같이 쓸 수 있다.

<br/>

여기까지 devtools.ts를 읽고 나니, `zui()`도 결국 이 구조 — `api.setState` 가로채기, 양방향 메시지 처리, `isRecording` 같은 재진입 방지 플래그 — 를 거의 그대로 참고하게 될 것 같다.

다음 글부터는 이 패턴을 참고해서 실제로 `zui()` 미들웨어 구현에 들어가볼 예정이다.
