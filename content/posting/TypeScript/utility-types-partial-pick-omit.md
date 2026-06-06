---
title: "타입을 또 새로 정의할 필욘없다 — Partial, Pick, Omit에 대해"
date: "2026-06-06"
description: "비슷한 타입을 반복해서 만들고 있다면 유틸리티 타입을 살펴보자. Partial, Required, Pick, Omit이 실제로 어느 상황에서 필요한지 정리하였음"
tags: ["typescript", "utility-types", "partial", "pick", "omit", "required"]
thumbnail: "/assets/thumbnails/utility-types-partial-pick-omit.png"
---

프로젝트 TypeScript를 쓰다가 타입을 누적해서 자꾸 쓰다보면 비슷하게 생긴 타입을 여러 개 만드는 상황이 찾아오곤한다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
}

interface UserProfile {
  name: string;
  email: string;
}
```

`User`에서 조금씩 변형한 타입들을 별도로 정의하고, `User`가 바뀌면 관련 타입을 하나씩 찾아가며 수정한다. 당연히 빠뜨리는 게 생긴다.

TypeScript에는 이 문제를 위한 내장 유틸리티 타입이 있다.

<br/>

## Partial\<T\> — 모든 프로퍼티를 선택적으로

`Partial<T>`는 타입 `T`의 모든 프로퍼티를 `?` (optional)로 바꾼다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// {
//   id?: number;
//   name?: string;
//   email?: string;
// }
```

<br/>

### 실전 — PATCH API 요청 타입

REST API에서 `PATCH`는 일부 필드만 보내도 된다. 이때 `Partial`이 딱 맞다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
}

async function updateUser(id: number, data: Partial<Omit<User, "id">>) {
  return fetch(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// name만 보내도 되고
updateUser(1, { name: "Kim" });

// email만 보내도 된다
updateUser(1, { email: "kim@example.com" });
```

`User`가 바뀌어도 `updateUser`의 파라미터 타입은 자동으로 따라온다.

<br/>

### 실전 — 상태 업데이트 함수

```ts
interface FormState {
  name: string;
  email: string;
  age: number;
  agreed: boolean;
}

function updateFormState(
  current: FormState,
  updates: Partial<FormState>
): FormState {
  return { ...current, ...updates };
}

const next = updateFormState(current, { name: "Kim", agreed: true });
```

변경할 필드만 넘기면 된다. 나머지는 기존 값을 유지한다.

<br/>

### Partial의 한계 — 얕은 변환

`Partial`은 최상위 프로퍼티만 optional로 만든다. 중첩 객체는 그대로다.

```ts
interface Config {
  server: {
    host: string;
    port: number;
  };
  debug: boolean;
}

type PartialConfig = Partial<Config>;
// {
//   server?: {       ← server는 optional이 됐지만
//     host: string;  ← 내부 host, port는 여전히 required
//     port: number;
//   };
//   debug?: boolean;
// }
```

중첩까지 모두 optional로 만들려면 재귀 타입이 필요하다. 이건 커스텀 유틸리티 타입 포스팅에서 다룬다.

<br/>

## Required\<T\> — 모든 프로퍼티를 필수로

`Required<T>`는 `Partial`의 반대다. 모든 `?`를 제거한다.

```ts
interface Config {
  host?: string;
  port?: number;
  debug?: boolean;
}

type StrictConfig = Required<Config>;
// {
//   host: string;
//   port: number;
//   debug: boolean;
// }
```

<br/>

### 실전 — 기본값 적용 후 완성된 설정 타입

```ts
interface UserConfig {
  theme?: "light" | "dark";
  language?: string;
  notifications?: boolean;
}

const DEFAULT_CONFIG: Required<UserConfig> = {
  theme: "light",
  language: "ko",
  notifications: true,
};

function applyConfig(input: UserConfig): Required<UserConfig> {
  return { ...DEFAULT_CONFIG, ...input };
}
```

`applyConfig`가 반환하는 값은 모든 필드가 채워져 있다는 걸 타입으로 보장한다. 이후 코드에서 `?.` 없이 접근할 수 있다.

<br/>

### 실전 — 유효성 검사 통과 후 타입

```ts
interface FormInput {
  name?: string;
  email?: string;
}

function validate(input: FormInput): input is Required<FormInput> {
  return !!input.name && !!input.email;
}

function submit(input: FormInput) {
  if (!validate(input)) throw new Error("입력값이 부족합니다");

  // 여기서 input: Required<FormInput>
  sendToServer(input.name, input.email); // non-null 보장
}
```

<br/>

## Pick\<T, K\> — 필요한 프로퍼티만 골라낸다

`Pick<T, K>`는 타입 `T`에서 키 `K`에 해당하는 프로퍼티만 가져온다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

type UserProfile = Pick<User, "id" | "name" | "email">;
// {
//   id: number;
//   name: string;
//   email: string;
// }
```

![Pick 동작 원리](/assets/typescript/pick-operation.png)

<br/>

### 실전 — API 응답에서 화면에 필요한 필드만

```ts
interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
  publishedAt: Date;
  views: number;
  internalNote: string; // 내부용, 노출 금지
}

type PostCard = Pick<Post, "id" | "title" | "publishedAt" | "views">;

function renderPostCard(post: PostCard) {
  // internalNote에 실수로 접근하면 컴파일 에러
}
```

<br/>

### 실전 — 컴포넌트 props 조합

```ts
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size: "sm" | "md" | "lg";
  variant: "primary" | "ghost";
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// 아이콘 없는 단순 버튼 타입
type SimpleButtonProps = Pick<ButtonProps, "label" | "onClick" | "disabled" | "size">;
```

`ButtonProps`에 필드가 추가돼도 `SimpleButtonProps`는 자동으로 동기화된다.

<br/>

## Omit\<T, K\> — 특정 프로퍼티를 제거한다

`Omit<T, K>`는 `Pick`의 반대다. 타입 `T`에서 키 `K`를 제거한 나머지를 반환한다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Omit<User, "password">;
// {
//   id: number;
//   name: string;
//   email: string;
// }
```

![Omit 동작 원리](/assets/typescript/omit-operation.png)

<br/>

### Pick vs Omit — 언제 어느 걸 쓸까

제거할 게 적으면 `Omit`, 가져올 게 적으면 `Pick`.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// 1개만 제거 → Omit이 간결
type CreateUserPayload = Omit<User, "id">;

// 2개만 선택 → Pick이 간결
type UserSummary = Pick<User, "id" | "name">;
```

필드가 10개인데 9개를 `Pick`으로 나열하는 건 실수다. 그 상황엔 `Omit`이 맞다.

<br/>

### 실전 — 생성/수정 payload 타입

```ts
interface Article {
  id: number;
  title: string;
  content: string;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
}

// 생성 시: id, createdAt, updatedAt은 서버가 채움
type CreateArticlePayload = Omit<Article, "id" | "createdAt" | "updatedAt">;

// 수정 시: id, authorId, createdAt은 변경 불가
type UpdateArticlePayload = Partial<Omit<Article, "id" | "authorId" | "createdAt">>;
```

`Article`에 필드가 추가될 때 payload 타입이 자동으로 따라온다.

<br/>

## 조합해서 쓰기

유틸리티 타입은 중첩해서 쓸 수 있다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "admin" | "member";
  createdAt: Date;
}

// 비밀번호 제외하고, 수정 가능한 필드만, 전부 optional로
type PatchUserPayload = Partial<Omit<User, "id" | "password" | "createdAt">>;
// {
//   name?: string;
//   email?: string;
//   role?: "admin" | "member";
// }
```

읽는 방향은 안쪽에서 바깥쪽이다. `Omit`으로 필드를 제거하고, 그 결과에 `Partial`을 씌운다.

<br/>

### 복잡해질 땐 이름을 붙인다

```ts
// 단계별로 이름 붙이기
type UserEditableFields = Omit<User, "id" | "password" | "createdAt">;
type PatchUserPayload = Partial<UserEditableFields>;
```

중간 타입에 이름을 붙이면 각 단계가 무엇을 의미하는지 명확해진다.

<br/>

## 실수하기 쉬운 것들

### Omit은 유니온 타입에서 예상과 다르게 동작한다

```ts
type A = { kind: "a"; value: string };
type B = { kind: "b"; count: number };

type AB = A | B;

type OmittedAB = Omit<AB, "kind">;
// 예상: { value: string } | { count: number }
// 실제: { }  ← 두 타입의 공통 프로퍼티만 남음
```

유니온 타입에 직접 `Omit`을 쓰면 원하는 결과가 나오지 않는다. 이 경우 분산 조건부 타입이 필요하다.

```ts
type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

type OmittedAB = DistributiveOmit<AB, "kind">;
// { value: string } | { count: number }
```

<br/>

### Pick의 키는 타입에 존재하는 키여야 한다

```ts
interface User {
  name: string;
  email: string;
}

type Bad = Pick<User, "name" | "age">; // 오류: 'age'는 User에 없음
```

존재하지 않는 키를 `Pick`에 넣으면 컴파일 에러가 난다. 실수를 미리 잡아준다.

<br/>

## 정리

| 유틸리티 타입 | 하는 일 | 주요 사용처 |
|-------------|---------|-----------|
| `Partial<T>` | 모든 프로퍼티를 optional | PATCH payload, 상태 업데이트 |
| `Required<T>` | 모든 optional 제거 | 기본값 적용 후, 검증 통과 후 |
| `Pick<T, K>` | K에 해당하는 프로퍼티만 선택 | 화면 표시용 타입, props 조합 |
| `Omit<T, K>` | K에 해당하는 프로퍼티 제거 | 생성/수정 payload, 민감 정보 제거 |

비슷한 타입을 반복해서 만들고 있다면, 원본 타입 하나를 잘 정의하고 유틸리티 타입으로 파생시키는 게 맞다. 원본이 바뀌면 파생 타입은 자동으로 따라온다.
