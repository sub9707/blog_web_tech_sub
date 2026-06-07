---
title: "타입 안에 타입있고 그 타입 안에 타입이 있.."
date: "2025-12-17"
description: "중첩이 몇 단계인지 모르는 구조를 타입으로 표현해야 할 때, 재귀 타입 말고 다른 방법이란 찾기 어렵다. JSON, 트리, 중첩 객체 등 타입스크립트와 함께 실제로 쓰는 패턴들을 알아보자"
tags: ["typescript", "recursive-types", "json", "tree", "conditional-types"]
thumbnail: "/assets/thumbnails/recursive-types.png"
---

아... 막 `any`를 쓰고 싶어지는 순간이 있다.

JSON 데이터를 다룰 때가 그렇다.

```ts
function parseJson(str: string): any {
  return JSON.parse(str);
}
```

JSON은 중첩이 몇 단계인지 모른다. 

숫자일 수도 있고, 문자열일 수도 있고, 배열이나 객체일 수도 있다. 

그 안에 또 객체가 있을 수 있는데, 이를 타입으로 표현하려면 타입이 자기 자신을 참조해야 한다.

<br/>

## 타입이 자기 자신을 참조한다

재귀 타입은 타입 정의 안에 자기 자신이 등장하는 구조다.

```ts
type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
```

`Json` 타입 안에 `Json`이 또 있다. 배열의 요소도 `Json`이고, 객체의 값도 `Json`이다.

이게 바로 재귀이다.

```ts
const data: Json = {
  name: "Kim",
  age: 30,
  tags: ["typescript", "react"],
  address: {
    city: "Seoul",
    zip: {
      code: "04524",
    },
  },
};
```

중첩이 몇 단계든 타입이 맞다. `any` 없이 JSON을 표현할 수 있다.

![Json 재귀 타입 구조 시각화](/assets/typescript/json-recursive.png)

<br/>

## 트리 구조

파일 시스템, 댓글 스레드, 메뉴 구조 등 계층 구조를 가진 데이터는 거의 모두 트리이다.

```ts
interface TreeNode {
  id: number;
  label: string;
  children: TreeNode[]; // 자기 자신을 참조
}
```

`children`이 `TreeNode[]`이기 때문에 각 자식들도 다시 `children`을 가질 수 있다.

```ts
const menu: TreeNode = {
  id: 1,
  label: "설정",
  children: [
    {
      id: 2,
      label: "계정",
      children: [
        { id: 3, label: "프로필 수정", children: [] },
        { id: 4, label: "비밀번호 변경", children: [] },
      ],
    },
    {
      id: 5,
      label: "알림",
      children: [],
    },
  ],
};
```

<br/>

### 재귀 함수와 타입이 맞닿는 지점

재귀 타입은 재귀 함수와 짝이 된다.

```ts
function findNode(tree: TreeNode, id: number): TreeNode | null {
  if (tree.id === id) return tree;

  for (const child of tree.children) {
    const found = findNode(child, id); // 재귀 호출
    if (found) return found;
  }

  return null;
}
```

타입과 함수 구조가 같은 재귀 패턴을 따른다. 

데이터 구조가 재귀면 그걸 처리하는 함수도 자연스럽게 재귀가 된다.

<br/>

## 선택적 자식 — 리프 노드 구분

자식이 없는 노드(리프)를 타입으로 구분하고 싶을 때.

```ts
type TreeNode =
  | { type: "leaf"; id: number; value: string }
  | { type: "branch"; id: number; children: TreeNode[] };
```

Discriminated Union과 조합하면 리프인지 브랜치인지 타입으로 강제할 수 있다.

```ts
function render(node: TreeNode): string {
  if (node.type === "leaf") {
    return node.value; // node.children 접근 불가 — 컴파일 에러
  }
  return node.children.map(render).join(", ");
}
```

<br/>

## 중첩 객체 타입

깊이를 모르는 중첩 객체 구조.

```ts
type NestedObject = {
  [key: string]: string | number | NestedObject;
};
```

설정 파일이나 다국어 번역 파일처럼 중첩 키를 가진 구조에 맞다.

```ts
const i18n: NestedObject = {
  common: {
    save: "저장",
    cancel: "취소",
  },
  error: {
    network: {
      timeout: "연결 시간 초과",
      offline: "오프라인 상태",
    },
  },
};
```

<br/>

## 재귀 조건부 타입

조건부 타입과 재귀를 조합하면 타입 수준의 알고리즘을 만들 수 있다.

### 배열 평탄화 타입

```ts
type Flatten<T> = T extends Array<infer E> ? Flatten<E> : T;

type A = Flatten<string>;             // string
type B = Flatten<string[]>;           // string
type C = Flatten<string[][]>;         // string
type D = Flatten<string[][][]>;       // string
```

`T`가 배열이면 요소 타입으로 재귀, 배열이 아니면 그대로.

<br/>

### Promise 완전 언래핑

`Awaited<T>`와 같은 동작이다.

```ts
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;

type A = DeepAwaited<Promise<Promise<Promise<string>>>>; // string
```

<br/>

### 중첩 배열을 튜플로

```ts
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;
type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;

type H = Head<[string, number, boolean]>; // string
type T = Tail<[string, number, boolean]>; // [number, boolean]
```

튜플을 분해하는 재귀 패턴이다. 

타입 수준 연결리스트처럼 동작한다.

![재귀 조건부 타입 동작 흐름](/assets/typescript/flatten-diagram.png)

<br/>

## 재귀 깊이 제한

TypeScript는 재귀 타입의 깊이가 너무 깊어지면 에러를 낸다.

```ts
// 이렇게 쓰면 컴파일러가 무한 재귀를 감지하고 에러
type Bad<T> = T extends object ? { [K in keyof T]: Bad<T[K]> } : T;
```

실제로는 특정 깊이 이상으로 중첩된 데이터는 없으니까 크게 문제가 되진 않는다.

하지만 재귀 타입을 과도하게 중첩하면 컴파일 성능에 영향을 준다.

<br/>

### 깊이 제한 패턴

재귀 깊이를 명시적으로 제한하고 싶을 때.

```ts
type DeepPartial<T, Depth extends number = 5> = Depth extends 0
  ? T
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K], Prev[Depth]> }
  : T;

// 카운터 배열 (튜플로 -1 구현)
type Prev = [never, 0, 1, 2, 3, 4, 5, ...number[]];
```

깊이 카운터를 튜플 인덱스로 감소시키는 패턴이다. 

자주 쓸 일은 많지 않지만, 라이브러리의 타입에서 자주 등장한다.

<br/>

## 실전 — 번역 파일 타입에서 키 경로 뽑기

앞서 커스텀 유틸리티 타입 포스팅에서 나온 `Paths<T>`가 재귀 타입이었다.

```ts
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Paths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
    : `${Prefix}${K}`;
}[keyof T & string];

const translations = {
  common: {
    save: "저장",
    cancel: "취소",
  },
  error: {
    network: "네트워크 오류",
  },
} as const;

type TranslationKey = Paths<typeof translations>;
// "common" | "common.save" | "common.cancel" | "error" | "error.network"

function t(key: TranslationKey): string {
  // key는 실제 존재하는 경로만 허용
}

t("common.save");   // 정상
t("common.delete"); // 오류
```

번역 키를 잘못 입력하면 컴파일 에러가 난다.

<br/>

## 정리

재귀 타입은 깊이를 모르는 구조를 표현할 때 쓴다.

- **JSON**: `string | number | boolean | null | Json[] | { [key: string]: Json }`
- **트리**: `children: TreeNode[]`
- **중첩 객체**: `{ [key: string]: string | NestedObject }`
- **재귀 조건부**: 배열 평탄화, Promise 언래핑, 튜플 조작

`any`를 쓰고 싶은 순간에 대부분은 재귀 타입으로 해결된다. 구조가 재귀면 타입도 재귀가 맞다.
