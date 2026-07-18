---
title: "타입을 어떻게 관리하시나요?"
date: "2026-01-17"
description: "React 프로젝트에서 타입들을 관리하는 패턴들에 대해 알아보자"
tags: ["typescript", "type-management", "project-structure", "barrel-export", "patterns"]
thumbnail: "/assets/thumbnails/typescript/type-management-patterns.png"
---

타입을 사용하는 프로젝트가 점점 규모가 커지면서, 타입을 어디에 어떻게 관리해야할 지 고민하는 순간이 온다.

`User`, `Post`, `ApiResponse`... 타입이 5개일 때는 어디 있든 상관없다.

20개가 넘고 기능이 나눠지기 시작하면, 타입이 어디 있는지 찾는 데 시간이 걸리고, 어디에 새 타입을 추가해야 할지 애매해진다.

타입도 코드다. 의도적으로 구성하지 않으면 금방 흩어진다.

<br/>

## 타입을 어디에 두어야 하는가

패턴을 정하기 전에 이 질문이 먼저다.

**이 타입이 어디서 쓰이는가?**

- 특정 컴포넌트 하나에서만 쓰인다 → 그 컴포넌트 파일 근처
- 특정 기능(feature) 안에서만 쓰인다 → 그 기능 폴더 안
- 여러 곳에서 쓰인다 → 공통 타입 폴더

이 기준으로 위치를 정하면 대부분 자연스럽게 정리된다.

![타입 배치 결정 흐름도](/assets/typescript/type-management-patterns/type-placement-flow.png)

<br/>

## 패턴 1 — 컴포넌트 근처에 두기

타입이 특정 컴포넌트에서만 쓰인다면 파일 안에 두거나 바로 옆에 둔다.

```
components/
  UserCard/
    UserCard.tsx
    UserCard.types.ts
    index.ts
```

```ts
// UserCard.types.ts
export interface UserCardProps {
  user: User;
  onFollow?: (userId: number) => void;
  size?: "sm" | "md" | "lg";
}
```

파일이 짧고 props 타입 정도라면 굳이 분리하지 않고 컴포넌트 파일 안에 두는 게 더 자연스럽다.

```ts
// UserCard.tsx
interface UserCardProps {
  user: User;
  size?: "sm" | "md" | "lg";
}

export function UserCard({ user, size = "md" }: UserCardProps) {
  // ...
}
```

분리는 타입이 다른 곳에서도 참조될 때, 또는 파일이 너무 길어질 때 하는 게 맞다.

<br/>

## 패턴 2 — 기능(feature) 단위 타입 관리

기능별로 폴더를 나누는 구조에서 많이 쓰는 방식이다.

```
features/
  auth/
    types.ts
    useLogin.ts
    LoginForm.tsx
    authApi.ts
  posts/
    types.ts
    usePost.ts
    PostCard.tsx
    postApi.ts
```

```ts
// features/posts/types.ts
export interface Post {
  id: number;
  slug: string;
  title: string;
  content: string;
  author: Author;
  createdAt: string;
  tags: string[];
}

export interface PostListItem extends Omit<Post, "content"> {
  thumbnail?: string;
  viewCount: number;
}

export interface PostFilter {
  tag?: string;
  page: number;
  limit: number;
}
```

기능 안에서 쓰는 타입이 다른 기능을 참조하게 되는 순간이 온다.

`features/posts/types.ts`에서 `Author` 타입이 필요한데 `features/auth/types.ts`에 있다면, `Author`를 `types/` 공통 폴더로 끌어올리는 게 맞다.

<br/>

## 패턴 3 — 도메인별 공통 타입 폴더

여러 기능에서 쓰이는 타입들을 도메인 단위로 파일을 나눠 관리한다.

```
src/
  types/
    user.ts     ← 사용자 관련 타입
    post.ts     ← 게시글 관련 타입
    api.ts      ← API 요청/응답 타입
    common.ts   ← 공통 유틸리티 타입
```

```ts
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  hasNext: boolean;
}

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, string[]>;
};
```

```ts
// types/common.ts
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = number | string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}
```

`common.ts`에는 프로젝트 전반에서 재사용하는 작은 유틸리티 타입들을 모은다.

<br/>

## 패턴 4 — Barrel Export

도메인별로 파일을 나눴을 때, 쓰는 쪽에서 파일 경로를 매번 신경 써야 하는 문제가 생긴다.

```ts
import type { User } from "@/types/user";
import type { Post } from "@/types/post";
import type { ApiResponse } from "@/types/api";
```

`types/index.ts`에서 각 파일의 타입을 re-export하면 진입점이 하나로 통일된다.

```ts
// types/index.ts — 타입을 정의하지 않고, 각 파일에서 re-export만 한다
export type { User, UserProfile, UserRole } from "./user";
export type { Post, PostListItem, PostFilter } from "./post";
export type { ApiResponse, PaginatedResponse, ApiError } from "./api";
export type { Nullable, Optional, ID, Timestamps } from "./common";
```

사용하는 쪽에서는 어느 파일에 있는지 몰라도 된다.

```ts
import type { User, Post, ApiResponse } from "@/types";
```

![Barrel Export 구조 다이어그램](/assets/typescript/type-management-patterns/barrel-export-diagram.png)

<br/>

### Barrel Export 주의점

**트리쉐이킹**

타입은 컴파일 후 사라지므로 `export type`으로 작성된 barrel은 번들 크기에 영향이 없다.

값(함수, 상수, 클래스)을 함께 re-export하는 barrel이라면 번들러가 트리쉐이킹을 못하는 경우가 생긴다. 타입과 값을 명시적으로 분리하는 게 안전하다.

```ts
export type { User } from "./user";   // 타입
export { createUser } from "./user";  // 값은 별도
```

**순환 참조**

`user.ts`와 `post.ts`가 서로를 참조하면 `index.ts`를 통해 순환이 생긴다.

공통 기반 타입을 별도 파일로 분리해서 해결한다.

```ts
// types/base.ts
export interface Author {
  id: number;
  name: string;
  avatar?: string;
}

// types/post.ts
import type { Author } from "./base";

export interface Post {
  author: Author;
}
```

![순환 참조 vs 해결 구조 다이어그램](/assets/typescript/type-management-patterns/circular-ref-solution.png)

<br/>

## 패턴 5 — Schema-first (Zod)

API 응답처럼 런타임에 외부에서 오는 데이터는 컴파일 타임 타입만으로는 안전하지 않다. 실제 데이터가 타입과 다를 수 있기 때문이다.

Zod는 스키마를 정의하면 거기서 TypeScript 타입을 추출할 수 있다. 스키마가 검증과 타입의 단일 소스가 된다.

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

// 스키마에서 타입을 추출 — 따로 interface를 쓸 필요 없다
type User = z.infer<typeof UserSchema>;
```

API 응답을 받을 때 파싱하면 런타임에서도 타입 안전성을 보장한다.

```ts
async function getUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const json = await res.json();

  return UserSchema.parse(json); // 실패하면 에러, 성공하면 User 타입 보장
}
```

타입 따로, 검증 로직 따로 관리하던 것을 스키마 하나로 통합할 수 있다.

**언제 쓰는가**

- API 응답, 폼 입력 등 외부에서 오는 데이터를 다룰 때
- 타입과 런타임 검증을 동기화해야 할 때
- 내부 코드끼리의 타입은 일반 `interface`/`type`으로 충분하다

<br/>

## 패턴 6 — Branded Types

`number`나 `string` 같은 원시 타입은 구조가 같으면 서로 할당이 가능하다. 타입 시스템이 의미 차이를 구분하지 못한다.

```ts
function sendEmail(userId: number, postId: number) { ... }

const userId = 1;
const postId = 42;

sendEmail(postId, userId); // 순서가 바뀌었지만 타입 오류 없음
```

Branded Type은 원시 타입에 고유한 브랜드를 붙여서 구분한다.

```ts
type UserId = number & { readonly __brand: "UserId" };
type PostId = number & { readonly __brand: "PostId" };

function brandUserId(id: number): UserId {
  return id as UserId;
}

function sendEmail(userId: UserId, postId: PostId) { ... }

const userId = brandUserId(1);
const postId = brandPostId(42);

sendEmail(postId, userId); // 타입 오류
sendEmail(userId, postId); // 정상
```

런타임 비용이 없다. 브랜드는 타입 레벨에서만 존재하고 컴파일 후에는 사라진다.

**언제 쓰는가**

- 같은 원시 타입이지만 의미가 다른 값들이 혼용될 가능성이 있을 때
- 함수 인자 순서 실수를 컴파일 타임에 잡고 싶을 때
- `UserId`, `PostId`, `OrderId`처럼 ID 구분이 중요한 도메인

<br/>

## 타입 파일 네이밍 규칙

통일하지 않으면 `types.ts`, `type.ts`, `interfaces.ts`, `models.ts`가 섞인다.

어느 쪽이든 팀 내에서 하나로 통일하는 게 중요하다.

| 파일명 | 사용 상황 |
|--------|-----------|
| `types.ts` | 해당 폴더/기능의 타입 모음 |
| `[name].types.ts` | 특정 컴포넌트/모듈 전용 타입 |
| `api.ts` | API 요청/응답 관련 타입 |
| `common.ts` | 프로젝트 전역 공통 타입 |
| `index.ts` | barrel export 진입점 |

<br/>

## import type

TypeScript 3.8부터 `import type`을 쓸 수 있다.

```ts
import type { User } from "@/types";
```

타입 전용 import임을 명시하고, 컴파일 후에는 완전히 제거된다.

`isolatedModules: true`가 켜진 환경(Vite, Next.js 기본값)에서는 타입을 일반 import로 쓰면 에러가 나는 경우가 있어서 습관화하는 게 좋다.

```ts
// User가 값인지 타입인지 모호
import { User } from "@/types";

// 타입임이 명확
import type { User } from "@/types";
```

<br/>

## 실전 폴더 구조

### 소규모

```
src/
  types/
    index.ts
```

타입이 20개 미만이면 파일 하나로 충분하다.

<br/>

### 중규모

```
src/
  types/
    api.ts
    common.ts
    user.ts
    post.ts
    index.ts   ← barrel export
```

도메인별로 파일을 나누고 `index.ts`로 진입점을 통일한다.

<br/>

### 기능 중심(Feature-based)

```
src/
  features/
    auth/
      types.ts
      ...
    posts/
      types.ts
      ...
  types/
    api.ts
    common.ts
    index.ts   ← 전역 공통만
```

각 기능 폴더에 자체 타입을 두고, 여러 기능에서 쓰이는 것만 `types/`로 올린다.

![세 가지 폴더 구조 비교](/assets/typescript/type-management-patterns/folder-structure-comparison.png)

<br/>

## 정리

| 패턴 | 적합한 상황 |
|------|-----------|
| 컴포넌트 근처 | 해당 컴포넌트에서만 쓰이는 타입 |
| Feature 단위 | 기능 내부에서만 쓰이는 타입 |
| 도메인별 공통 폴더 | 여러 기능에서 공유되는 타입 |
| Barrel Export | 공통 타입 폴더의 import 경로 통일 |
| Schema-first (Zod) | 외부 데이터의 런타임 검증이 필요할 때 |
| Branded Types | 같은 원시 타입을 의미로 구분해야 할 때 |

타입 관리에 정답은 없다. 규모에 맞는 방식을 고르는 게 맞다.

작을 때는 단순하게, 커지면 나눈다.
