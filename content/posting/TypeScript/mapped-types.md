---
title: "`Mapped Type이 생소하다면?"
date: "2025-12-10"
description: "Partial이 어떻게 만들어지는지, Readonly가 왜 그런 문법인지 궁금했다면 Mapped Type을 알면 된다. keyof, in, as 이 세 가지가 전부이다."
tags: ["typescript", "mapped-types", "keyof", "utility-types", "type-system"]
thumbnail: "/assets/thumbnails/mapped-types.png"
---

`Partial<T>` 구현을 한 번이라도 들여다봤다면 이런 코드를 봤을 것이다.

```ts
type Partial<T> = {
  [P in keyof T]?: T[P];
};
```

처음 보면 "이게 뭔 문법이지?" 싶다. `in`이 왜 여기 있고, `keyof`가 뭘 하는 건지.

근데 이걸 이해하면 `Partial`, `Required`, `Readonly`, `Record`가 전부 같은 패턴으로 만들어졌다는 게 보인다. 

TypeScript 내장 유틸리티 타입의 절반이 이 구조에서 나온다.

<br/>

## keyof — 객체 타입에서 키만 뽑는다

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

type UserKeys = keyof User;
// "id" | "name" | "email"
```

`keyof`는 객체 타입의 키를 유니온 리터럴 타입으로 꺼낸다. 

프로퍼티 이름들이 타입이 된다.

활용하면 이렇다.

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: 1, name: "Kim", email: "kim@example.com" };

getProperty(user, "name");  // 정상, 반환 타입: string
getProperty(user, "age");   // 오류: "age"는 keyof User가 아님
```

존재하지 않는 키를 넘기면 컴파일 에러가 난다. 

`obj[key]` 접근도 타입 안전하다.

<br/>

## [K in keyof T] — 키를 순회한다

Mapped Type의 핵심 문법이다.

```ts
type Copy<T> = {
  [K in keyof T]: T[K];
};
```

`K in keyof T`는 `T`의 모든 키를 하나씩 순회한다는 뜻이다. 

각 키 `K`에 대해 값 타입을 `T[K]`로 그대로 가져온다.

결과는 `T`와 완전히 똑같은 타입이 된다. 여기에 수식어를 붙여서 변형한다.

```ts
// ? 붙이면 Partial
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// readonly 붙이면 Readonly
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// -? 붙이면 Required (? 제거)
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

// -readonly 붙이면 Mutable (readonly 제거)
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

`-`는 기존 수식어를 제거하는 연산자다. 

`Required`가 `Partial`의 반대인 이유가 여기에 있다.

<!-- 이미지: Mapped Type 수식어 조합 정리표
     - 행: [K in keyof T]?, [K in keyof T]-?, readonly [K in keyof T], -readonly [K in keyof T]
     - 열: 수식어, 하는 일, 해당 내장 유틸리티
     - 각 조합이 어떤 결과를 만드는지 한눈에 비교하는 표 형태 -->

<br/>

## 값 타입도 바꿀 수 있다

키만 순회하는 게 아니라 값 타입도 변환할 수 있다.

```ts
// 모든 값을 string으로
type Stringify<T> = {
  [K in keyof T]: string;
};

// 모든 값을 배열로
type Arrayify<T> = {
  [K in keyof T]: T[K][];
};

interface User {
  id: number;
  name: string;
}

type StringUser = Stringify<User>;
// { id: string; name: string }

type ArrayUser = Arrayify<User>;
// { id: number[]; name: string[] }
```

<br/>

## as — 키 이름도 바꾼다

TypeScript 4.1부터 `as` 절로 키 이름을 변환할 수 있다.

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  id: number;
  name: string;
}

type UserGetters = Getters<User>;
// {
//   getId: () => number;
//   getName: () => string;
// }
```

`Capitalize`는 첫 글자를 대문자로 만드는 내장 유틸리티 타입이다. 

Template Literal Type과 조합해서 키 이름을 동적으로 생성한다.

<br/>

### as never — 키를 제거한다

`as never`를 쓰면 해당 키가 아예 제거된다.

```ts
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Mixed {
  name: string;
  age: number;
  email: string;
  active: boolean;
}

type StringFields = OnlyStrings<Mixed>;
// { name: string; email: string }
```

`T[K]`가 `string`이 아닌 키는 `never`로 교체되면서 결과 타입에서 사라진다. 

앞에서 만든 `PickByValue`가 바로 이 패턴이다.

<!-- 이미지: as 절로 키 필터링 동작 원리
     - Mixed 인터페이스의 4개 필드를 나열
     - T[K] extends string 조건 검사 흐름
     - string인 필드(name, email): K 유지 → 결과 타입에 포함
     - string이 아닌 필드(age, active): never → 결과 타입에서 제거
     - 최종 { name: string; email: string } 결과 표시 -->

<br/>

## Record\<K, V\> — 키와 값 타입을 지정해서 만든다

`Record`도 Mapped Type이다.

```ts
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```

`keyof T`가 아닌 직접 지정한 키 유니온으로 순회한다.

```ts
type Role = "admin" | "member" | "guest";

type RoleLabel = Record<Role, string>;
// {
//   admin: string;
//   member: string;
//   guest: string;
// }

const labels: RoleLabel = {
  admin: "관리자",
  member: "회원",
  guest: "비회원",
};
```

키를 빠뜨리면 컴파일 에러가 난다. 

새 Role이 추가되면 `labels`도 채워야 한다는 걸 컴파일러가 강제한다.

<br/>

### 실전 — 상태별 UI 매핑

```ts
type Status = "idle" | "loading" | "success" | "error";

type StatusConfig = Record<Status, {
  label: string;
  color: string;
}>;

const STATUS_CONFIG: StatusConfig = {
  idle:    { label: "대기",   color: "gray" },
  loading: { label: "처리중", color: "blue" },
  success: { label: "완료",   color: "green" },
  error:   { label: "오류",   color: "red" },
};
```

`Status`에 새 값이 추가되면 `STATUS_CONFIG`에서 빠진 항목이 컴파일 에러로 잡힌다.

<br/>

## 조건부 타입과 조합

Mapped Type 안에서 조건부 타입을 써서 값 타입을 동적으로 바꿀 수 있다.

```ts
type Flatten<T> = {
  [K in keyof T]: T[K] extends Array<infer E> ? E : T[K];
};

interface Response {
  id: number;
  tags: string[];
  scores: number[];
  name: string;
}

type FlatResponse = Flatten<Response>;
// {
//   id: number;
//   tags: string;    ← string[] → string
//   scores: number;  ← number[] → number
//   name: string;
// }
```

배열이면 요소 타입으로, 아니면 그대로.

<br/>

## 분산 Mapped Type

유니온 타입에 Mapped Type을 적용하면 각 멤버에 개별로 적용된다.

```ts
type ToRecord<T> = T extends string ? Record<T, boolean> : never;

type A = ToRecord<"a" | "b" | "c">;
// Record<"a", boolean> | Record<"b", boolean> | Record<"c", boolean>
// 즉: { a: boolean } | { b: boolean } | { c: boolean }
```

전체를 하나로 합치고 싶다면 `Record<"a" | "b" | "c", boolean>`처럼 직접 쓰는 게 맞다.

<br/>

## 정리

Mapped Type의 구성요소를 한 줄씩 뜯어보면 별거 없다.

```ts
type Example<T> = {
  [K in keyof T]?: T[K]; // K: 각 키, T[K]: 해당 값 타입
};
//  ↑          ↑
// 키 순회   수식어
```

- `keyof T` — 키 유니온 추출
- `[K in ...]` — 키 순회
- `T[K]` — 해당 키의 값 타입 접근
- `?`, `readonly`, `-?`, `-readonly` — 수식어
- `as` — 키 이름 변환 또는 제거

`Partial`, `Required`, `Readonly`, `Record`, `Pick`, `Omit`이 전부 이 조합으로 만들어졌다. 구현을 직접 읽어보면 생각보다 별거 없다는 걸 알게 된다.
