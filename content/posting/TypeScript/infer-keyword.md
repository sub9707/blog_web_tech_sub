---
title: "ReturnType이 어떻게 동작하는지 궁금했다면 — infer 키워드 완전 분석"
date: "2026-06-06"
description: "ReturnType, Parameters 같은 유틸리티 타입을 보다 보면 infer가 자주 등장한다. 조건부 타입 안에서 infer가 어떤 역할을 하는지 살펴보자"
tags: ["typescript", "infer", "conditional-types", "utility-types", "type-system"]
thumbnail: "/assets/thumbnails/infer-keyword.png"
---

`ReturnType<T>`, `Parameters<T>`, `Awaited<T>`.

자주 쓰는 유틸리티 타입들인데, 어떻게 동작하는지 들여다본 적이 없다면 한 번쯤 의문이 생긴다.

"어떻게 함수 타입에서 반환 타입만 뽑아내는 거지?"

답은 `infer`다. TypeScript 조건부 타입 안에서 패턴 매칭으로 타입을 추출하는 키워드다. 이걸 이해하면 내장 유틸리티 타입의 구현이 보이고, 직접 만들 수도 있게 된다.

<br/>

## 조건부 타입 복습

`infer`는 조건부 타입 안에서만 쓸 수 있다. 먼저 조건부 타입을 짚고 넘어간다.

```ts
type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>; // "yes"
type B = IsString<number>; // "no"
```

`T extends string ? A : B` 형태다. `T`가 `string`의 서브타입이면 `A`, 아니면 `B`를 반환한다.

이것만으로는 타입을 "추출"할 수 없다. 조건을 만족하는지 판단하는 것뿐이다.

<br/>

## infer — 조건 안에서 타입을 캡처한다

`infer`는 조건부 타입의 `extends` 절 안에서만 쓸 수 있다. 패턴에서 특정 위치의 타입을 캡처해서 이름을 붙인다.

```ts
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

읽는 방법:
- `T`가 `(...args: any[]) => infer R` 패턴에 맞는가?
- 맞는다면 반환 타입 위치의 타입을 `R`로 캡처
- `R`을 반환
- 맞지 않으면 `never`

```ts
type A = GetReturnType<() => string>;        // string
type B = GetReturnType<(x: number) => boolean>; // boolean
type C = GetReturnType<string>;              // never (함수가 아님)
```

이게 `ReturnType<T>`의 실제 구현이다. TypeScript 표준 라이브러리에 그대로 정의되어 있다.

![infer 패턴 매칭 흐름](/assets/typescript/infer-pattern-matching.png)

<br/>

## infer로 배열 요소 타입 추출

```ts
type ElementType<T> = T extends (infer E)[] ? E : never;

type A = ElementType<string[]>;  // string
type B = ElementType<number[]>;  // number
type C = ElementType<boolean[]>; // boolean
type D = ElementType<string>;    // never (배열이 아님)
```

`(infer E)[]` 패턴에서 배열 요소 타입 위치를 `E`로 캡처한다.

중첩 배열도 한 단계씩 처리할 수 있다.

```ts
type FlatOne<T> = T extends (infer E)[] ? E : T;

type A = FlatOne<string[][]>; // string[]
type B = FlatOne<string[]>;   // string
type C = FlatOne<string>;     // string (배열이 아니면 그대로)
```

<br/>

## infer로 함수 파라미터 타입 추출

```ts
type GetParameters<T> = T extends (...args: infer P) => any ? P : never;

type A = GetParameters<(x: string, y: number) => void>; // [string, number]
type B = GetParameters<() => void>;                      // []
```

`...args: infer P`로 파라미터 전체를 튜플 타입으로 캡처한다.

이게 `Parameters<T>`의 실제 구현이다.

<br/>

### 특정 위치의 파라미터만 추출

```ts
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

type A = FirstParam<(x: string, y: number) => void>; // string
type B = FirstParam<(x: number) => void>;             // number
type C = FirstParam<() => void>;                      // never
```

<br/>

## infer로 Promise 내부 타입 추출

```ts
type Unwrap<T> = T extends Promise<infer U> ? U : T;

type A = Unwrap<Promise<string>>; // string
type B = Unwrap<Promise<number>>; // number
type C = Unwrap<string>;          // string (Promise가 아니면 그대로)
```

중첩 Promise도 처리하려면 재귀가 필요하다.

```ts
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T;

type A = DeepUnwrap<Promise<Promise<string>>>; // string
type B = DeepUnwrap<Promise<number>>;          // number
```

이 패턴을 조금 더 다듬은 것이 TypeScript 4.5부터 내장된 `Awaited<T>`다.

<br/>

## infer로 객체 값 타입 추출

```ts
type ValueOf<T> = T extends { [K in keyof T]: infer V } ? V : never;

type Obj = { a: string; b: number; c: boolean };
type Values = ValueOf<Obj>; // string | number | boolean
```

`infer V`가 모든 값 타입을 수집해 유니온으로 만든다.

<br/>

## 분산 조건부 타입과 infer

유니온 타입에 조건부 타입을 적용하면 각 멤버에 개별적으로 적용된다.

```ts
type ToArray<T> = T extends any ? T[] : never;

type A = ToArray<string | number>;
// string[] | number[] — 각각 적용됨
// string | number 전체를 감싸는 (string | number)[]이 아님
```

이 분산 동작을 막고 싶으면 `T`를 튜플로 감싼다.

```ts
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type A = ToArrayNonDist<string | number>; // (string | number)[]
```

`infer`와 조합할 때 분산 여부를 의식해야 한다.

![분산 조건부 타입 동작 비교](/assets/typescript/distributive-conditional.png)

<br/>

## 여러 위치에서 infer 동시에 사용

하나의 조건부 타입에서 여러 위치를 동시에 캡처할 수 있다.

```ts
type SplitFunction<T> = T extends (...args: infer P) => infer R
  ? { params: P; return: R }
  : never;

type A = SplitFunction<(x: string, y: number) => boolean>;
// {
//   params: [string, number];
//   return: boolean;
// }
```

<br/>

## 실전 활용 패턴

### 패턴 1 — 라이브러리 함수 반환 타입에서 특정 타입 추출

외부 라이브러리 함수의 반환 타입에서 필요한 부분만 꺼낼 때.

```ts
// 라이브러리 함수 (수정 불가)
declare function createStore<S>(reducer: (state: S) => S): { getState(): S };

type StoreState<T extends (...args: any) => any> =
  ReturnType<T> extends { getState(): infer S } ? S : never;

type MyState = StoreState<typeof createStore>;
```

<br/>

### 패턴 2 — 이벤트 핸들러에서 이벤트 타입 추출

```ts
type EventType<T> = T extends (event: infer E) => any ? E : never;

type ClickEventType = EventType<React.MouseEventHandler>; // React.MouseEvent<...>
type ChangeEventType = EventType<React.ChangeEventHandler<HTMLInputElement>>; // React.ChangeEvent<HTMLInputElement>
```

<br/>

### 패턴 3 — 중첩 객체에서 특정 키의 타입 추출

```ts
type PropType<T, K extends keyof T> = T extends { [P in K]: infer V } ? V : never;

interface User {
  name: string;
  age: number;
}

type NameType = PropType<User, "name">; // string
type AgeType = PropType<User, "age">;   // number
```

이 패턴보다는 `User["name"]` 인덱스 접근이 더 간단하다. `infer`는 동적으로 키를 계산해야 할 때 진가를 발휘한다.

<br/>

## TypeScript 표준 유틸리티 타입 구현 살펴보기

표준 라이브러리에 실제로 어떻게 구현되어 있는지 확인하면 `infer`가 더 명확해진다.

```ts
// ReturnType
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

// Parameters
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

// InstanceType
type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;

// Awaited
type Awaited<T> =
  T extends null | undefined ? T :
  T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ?
    F extends ((value: infer V, ...args: infer _) => any) ?
      Awaited<V> :
      never :
  T;
```

`Awaited`는 `infer`를 중첩해서 `then` 메서드의 파라미터 타입을 추적한다. 복잡해 보이지만 같은 패턴의 반복이다.

<br/>

## infer의 제약

### 조건부 타입 밖에서는 쓸 수 없다

```ts
type Bad<T> = infer R; // 오류: 'infer' declarations are only permitted in the 'extends' clause
```

`infer`는 반드시 `T extends ... ? ... : ...` 형태 안의 `extends` 절에서만 쓸 수 있다.

### 같은 이름의 infer를 여러 위치에서 쓰면 유니온이 된다

```ts
type GetAllReturnTypes<T> =
  T extends { [K in keyof T]: () => infer R } ? R : never;

type Obj = {
  a: () => string;
  b: () => number;
};

type A = GetAllReturnTypes<Obj>; // string | number
```

같은 `R`이 여러 위치에서 캡처되면 유니온으로 합쳐진다.

<br/>

## 정리

`infer`는 조건부 타입 안에서 타입 패턴의 특정 위치를 캡처하는 키워드다.

- 함수 반환 타입: `T extends (...args: any) => infer R`
- 함수 파라미터: `T extends (...args: infer P) => any`
- 배열 요소: `T extends (infer E)[]`
- Promise 내부: `T extends Promise<infer U>`

`ReturnType`, `Parameters`, `Awaited` 같은 내장 유틸리티 타입이 모두 이 패턴으로 만들어져 있다. 이 구조를 이해하면 직접 유틸리티 타입을 만드는 것도 멀지 않다.
