---
title: "함수 타입, 다시 쓰지 않아도 된다! — ReturnType, Parameters, Awaited"
date: "2025-11-24"
description: "함수의 반환 타입이나 매개변수 타입을 다시 작성하고 있다면, 이미 있는 타입을 활용할 수 있다. ReturnType, Parameters, Awaited를 이용해 함수에서 타입을 추출하는 방법을 알아보자"
tags: ["typescript", "ReturnType", "Parameters", "Awaited", "utility-types", "type-inference"]
thumbnail: "/assets/thumbnails/returntype-parameters-awaited.png"
---

언젠가 타입을 이렇게 쓰고 있는 코드를 본 적이 있다.

```ts
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

// 함수가 있는데 반환 타입을 따로 또 선언
type FetchUserReturn = User;
type FetchUserParams = [id: number];
```

`fetchUser`가 바뀌면 `FetchUserReturn`과 `FetchUserParams`도 손으로 바꿔야 한다. 변경이 두 곳에 존재한다. 빠뜨리면 타입이 실제 함수와 어긋난다.

`ReturnType`, `Parameters`, `Awaited`를 쓰면 함수 자체에서 타입을 꺼낼 수 있다. 정의는 한 곳, 나머지는 자동으로 따라온다.

<br/>

## ReturnType\<T\> — 함수 반환 타입을 꺼낸다

```ts
function getUser() {
  return {
    id: 1,
    name: "Kim",
    email: "kim@example.com",
  };
}

type User = ReturnType<typeof getUser>;
// {
//   id: number;
//   name: string;
//   email: string;
// }
```

함수 선언과 타입 정의가 완전히 동기화된다. `getUser`에 필드를 추가하면 `User`도 자동으로 바뀐다.

<br/>

### 왜 typeof가 필요한가

`ReturnType`은 타입을 받는다. 함수 값 자체를 넘기면 오류가 난다.

```ts
function getUser() { ... }

type A = ReturnType<getUser>;         // 오류: 'getUser'는 값, 타입이 아님
type B = ReturnType<typeof getUser>;  // 정상
```

`typeof getUser`는 함수 `getUser`의 타입, 즉 `() => { id: number; name: string; email: string }`를 반환한다.

<br/>

### 실전 — 외부 라이브러리 함수 반환 타입

라이브러리 타입이 직접 export되지 않는 경우 자주 쓰인다.

```ts
import { createTheme } from "@mui/material/styles";

// 라이브러리가 반환 타입을 export하지 않을 때
type Theme = ReturnType<typeof createTheme>;

function applyTheme(theme: Theme) {
  // ...
}
```

라이브러리 소스를 뒤지거나 `any`를 쓸 필요 없이 정확한 타입을 얻는다.

<br/>

### 실전 — useRef, useState 반환 타입

React hook의 반환 타입을 재사용할 때.

```ts
import { useRef } from "react";

type InputRef = ReturnType<typeof useRef<HTMLInputElement>>;
// MutableRefObject<HTMLInputElement | undefined>
```

<br/>

### 실전 — 팩토리 함수 패턴

```ts
function createApiClient(baseUrl: string) {
  return {
    get: (path: string) => fetch(`${baseUrl}${path}`),
    post: (path: string, body: unknown) =>
      fetch(`${baseUrl}${path}`, { method: "POST", body: JSON.stringify(body) }),
  };
}

type ApiClient = ReturnType<typeof createApiClient>;

function useApi(client: ApiClient) {
  // ...
}
```

`createApiClient`의 반환 구조가 바뀌면 `ApiClient`가 자동으로 따라온다.

![ReturnType 동작 원리](/assets/typescript/returntype-extract.png)

<br/>

## Parameters\<T\> — 함수 파라미터 타입을 꺼낸다

```ts
function createUser(name: string, age: number, role: "admin" | "member") {
  // ...
}

type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number, role: "admin" | "member"]
```

반환 타입은 튜플이다. 파라미터 순서와 이름이 보존된다.

<br/>

### 특정 파라미터만 꺼내기

인덱스로 접근하면 특정 파라미터만 꺼낼 수 있다.

```ts
function createUser(name: string, age: number, role: "admin" | "member") {}

type NameParam = Parameters<typeof createUser>[0]; // string
type AgeParam  = Parameters<typeof createUser>[1]; // number
type RoleParam = Parameters<typeof createUser>[2]; // "admin" | "member"
```

<br/>

### 실전 — 함수를 래핑할 때 파라미터 타입 재사용

외부 함수를 래핑하거나 미들웨어를 만들 때 유용하다.

```ts
declare function sendEvent(
  eventName: string,
  payload: Record<string, unknown>,
  options?: { retry: boolean; timeout: number }
): void;

// 래퍼 함수: 동일한 파라미터를 받고 로깅 추가
function sendEventWithLogging(...args: Parameters<typeof sendEvent>) {
  console.log("이벤트 발송:", args[0]);
  sendEvent(...args);
}
```

`sendEvent`의 시그니처가 바뀌면 `sendEventWithLogging`의 파라미터도 자동으로 따라온다.

<br/>

### 실전 — 함수 파라미터 타입을 다른 곳에서 재사용

```ts
async function login(
  credentials: { username: string; password: string },
  options?: { rememberMe: boolean }
) {
  // ...
}

// 첫 번째 파라미터 타입만 꺼내서 재사용
type LoginCredentials = Parameters<typeof login>[0];
// { username: string; password: string }

type LoginOptions = Parameters<typeof login>[1];
// { rememberMe: boolean } | undefined
```

`login` 함수 파라미터 타입을 폼 컴포넌트나 다른 함수에서 재사용할 수 있다.

![Parameters 동작 원리](/assets/typescript/parameters-extract.png)

<br/>

## Awaited\<T\> — Promise를 벗겨낸다

`Awaited<T>`는 `Promise`의 내부 타입을 꺼낸다. 중첩 `Promise`도 모두 벗겨낸다.

```ts
type A = Awaited<Promise<string>>;          // string
type B = Awaited<Promise<Promise<number>>>; // number (중첩도 처리)
type C = Awaited<string>;                   // string (Promise가 아니면 그대로)
```

<br/>

### 왜 Awaited가 필요한가

`ReturnType`으로 비동기 함수의 반환 타입을 꺼내면 `Promise<T>`가 나온다.

```ts
async function fetchUser(id: number) {
  const res = await fetch(`/api/users/${id}`);
  return res.json() as User;
}

type A = ReturnType<typeof fetchUser>; // Promise<User>
```

실제로 필요한 건 `User`인 경우가 많다. `Awaited`로 벗겨낸다.

```ts
type B = Awaited<ReturnType<typeof fetchUser>>; // User
```

<br/>

### 실전 — 비동기 함수 반환 타입 추출

```ts
async function getPostWithComments(id: number) {
  const [post, comments] = await Promise.all([
    fetchPost(id),
    fetchComments(id),
  ]);
  return { post, comments };
}

type PostWithComments = Awaited<ReturnType<typeof getPostWithComments>>;
// {
//   post: Post;
//   comments: Comment[];
// }
```

함수 구조가 복잡해져도 타입은 함수에서 자동으로 추론된다.

<br/>

### 실전 — Promise.all 결과 타입

```ts
const promises = [
  fetch("/api/users").then(r => r.json() as User[]),
  fetch("/api/posts").then(r => r.json() as Post[]),
] as const;

type Results = Awaited<typeof promises[number]>;
// User[] | Post[]
```

<br/>

### Awaited vs Promise\<T\>\["then"\]

`Awaited`는 단순히 `Promise<T>` 제네릭 파라미터를 꺼내는 게 아니다. `then` 메서드를 가진 thenable 객체도 처리한다.

```ts
type CustomThenable = {
  then(onfulfilled: (value: string) => void): void;
};

type A = Awaited<CustomThenable>; // string
```

`await`가 실제로 처리하는 방식과 동일하게 동작한다.

![Awaited 동작 원리](/assets/typescript/awaited-unwrap.png)

<br/>

## 셋을 조합하는 실전 패턴

### 패턴 1 — 비동기 함수 완전 타입 추출

```ts
async function searchUsers(
  query: string,
  filters: { role?: string; active?: boolean },
  pagination: { page: number; size: number }
) {
  // ...
  return { users: [] as User[], total: 0 };
}

type SearchUsersParams = Parameters<typeof searchUsers>;
type SearchUsersResult = Awaited<ReturnType<typeof searchUsers>>;

// 첫 번째 파라미터만
type SearchQuery = Parameters<typeof searchUsers>[0]; // string

// 두 번째 파라미터만
type SearchFilters = Parameters<typeof searchUsers>[1]; // { role?: string; active?: boolean }
```

### 패턴 2 — 함수 시그니처 복제

외부 라이브러리 함수와 완전히 같은 시그니처를 가진 래퍼를 만들 때.

```ts
declare const thirdPartyFn: (
  config: ComplexConfig,
  options: ComplexOptions
) => Promise<ComplexResult>;

// 정확히 같은 파라미터, 정확히 같은 반환 타입
async function wrappedFn(
  ...args: Parameters<typeof thirdPartyFn>
): Promise<Awaited<ReturnType<typeof thirdPartyFn>>> {
  console.log("호출됨");
  return thirdPartyFn(...args);
}
```

타입을 직접 찾아 복붙하지 않아도 된다. 라이브러리가 업데이트되면 자동으로 따라온다.

<br/>

### 패턴 3 — 훅 반환 타입 재사용

```ts
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return { user, loading, error, refetch: () => {} };
}

type UseUserDataReturn = ReturnType<typeof useUserData>;
// { user: User | null; loading: boolean; error: Error | null; refetch: () => void }

// 반환 타입의 일부만 꺼내서 다른 곳에서 사용
type UserDataState = Pick<UseUserDataReturn, "user" | "loading" | "error">;
```

<br/>

## 주의사항

### 오버로딩된 함수

오버로딩된 함수에서는 마지막 시그니처의 타입이 추출된다.

```ts
function process(x: string): string;
function process(x: number): number;
function process(x: any): any { return x; }

type A = ReturnType<typeof process>; // any (마지막 구현 시그니처)
type B = Parameters<typeof process>; // [x: any] (마지막 구현 시그니처)
```

오버로딩된 함수에서 특정 시그니처의 타입을 꺼내려면 다른 접근이 필요하다.

### 제네릭 함수

제네릭 파라미터가 고정되지 않은 경우 `unknown`으로 추론된다.

```ts
function identity<T>(x: T): T {
  return x;
}

type A = ReturnType<typeof identity>; // unknown
```

특정 타입으로 고정하려면 타입 인자를 명시한다.

```ts
type B = ReturnType<typeof identity<string>>; // string (TypeScript 4.7+)
```

<br/>

## 정리

| 유틸리티 타입 | 추출하는 것 | 주요 사용처 |
|-------------|-----------|-----------|
| `ReturnType<T>` | 함수 반환 타입 | 함수 결과 타입 재사용, 라이브러리 타입 추출 |
| `Parameters<T>` | 함수 파라미터 튜플 | 래퍼 함수, 파라미터 타입 재사용 |
| `Awaited<T>` | Promise 내부 타입 | 비동기 함수 결과 타입 |

세 가지 모두 "이미 존재하는 것에서 타입을 꺼낸다"는 공통점이 있다. 함수가 정의되어 있다면 거기서 꺼내 쓰면 된다. 타입을 두 번 쓸 필요가 없다.
