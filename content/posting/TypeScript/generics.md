---
title: "TypeScript 제네릭 실전 가이드"
date: "2025-05-15"
description: "제네릭의 기본부터 제약 조건, 유틸리티 타입 활용까지 실무 관점에서 정리합니다."
tags: ["typescript", "generics", "type-system"]
---

## 제네릭이란

타입을 파라미터처럼 다루는 기능입니다. 재사용 가능한 타입 안전한 코드를 작성할 수 있습니다.

```ts
function identity<T>(value: T): T {
  return value;
}

identity<string>('hello'); // 'hello'
identity<number>(42);      // 42
```

## 실용적인 예시

### API 응답 래퍼

```ts
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

async function fetchUser(): Promise<ApiResponse<User>> {
  const res = await fetch('/api/user');
  return res.json();
}
```

### 배열 유틸리티

```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}
```

## 제약 조건 (Constraints)

`extends` 키워드로 제네릭 타입을 제한할 수 있습니다.

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Kim', age: 30 };
getProperty(user, 'name'); // string
getProperty(user, 'age');  // number
// getProperty(user, 'email'); // 컴파일 에러
```

## 유틸리티 타입

TypeScript 내장 유틸리티 타입들도 제네릭으로 구현되어 있습니다.

```ts
type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Required<T> = {
  [P in keyof T]-?: T[P];
};

type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};
```

## 조건부 타입

```ts
type NonNullable<T> = T extends null | undefined ? never : T;

type IsArray<T> = T extends any[] ? true : false;

type IsArray<string[]>; // true
type IsArray<string>;   // false
```

## infer

조건부 타입에서 추론된 타입을 추출합니다.

```ts
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function fetchData(): Promise<string> { /* ... */ }
type Result = ReturnType<typeof fetchData>; // Promise<string>
```
