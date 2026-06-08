---
title: "enum을 쓰는 게 맞을까?"
date: "2026-01-24"
description: "enum을 쓰면 편한데 뭔가 찜찜하다는 느낌이 든다면 맞을지도..? 컴파일 결과물, 트리쉐이킹, const enum 그리고 왜 유니온 타입 대체까지 알아보자."
tags: ["typescript", "enum", "const-enum", "union-types", "tree-shaking"]
thumbnail: "/assets/thumbnails/enum-should-you-use-it.png"
---

TypeScript를 처음 배울 때 enum은 꽤 매력적으로 보인다.

또는 왜 굳이 이런 객체를 사용하는 것일까 의문이 들기도 한다.

```ts
enum Direction {
  Up,
  Down,
  Left,
  Right,
}
```

우선 enum으로 깔끔하고, 자동완성도 되고, 관련 값들을 하나로 묶을 수 있다.

근데 실무에서 쓰다 보면 "이거 그냥 안 쓰는 게 낫지 않나"라는 생각이 드는 순간이 온다.


<br/>

## enum이 뭘까

TypeScript의 enum은 이름 있는 상수 집합을 정의하는 방법이다.

```ts
enum Status {
  Pending,
  Active,
  Inactive,
}
```

기본적으로 순서 숫자가 할당된다. 

`Pending = 0`, `Active = 1`, `Inactive = 2`.

문자열로도 만들 수 있다.

```ts
enum Status {
  Pending = "PENDING",
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}
```

사용할 때는 이렇게 쓴다.

```ts
function updateUser(status: Status) {
  // ...
}

updateUser(Status.Active);
```

`Status.Active`라고 쓰면 자동완성이 나온다. 오타를 낼 수 없다.

<br/>

## 다른 언어에서의 enum

enum은 TypeScript만의 개념이 아니다. 대부분의 언어에서 비슷한 구조를 제공한다.

**Java**는 enum이 거의 클래스다. 필드, 메서드, 생성자까지 가질 수 있다.

```java
enum Planet {
  MERCURY(3.303e+23, 2.4397e6),
  VENUS(4.869e+24, 6.0518e6);

  private final double mass;
  private final double radius;

  Planet(double mass, double radius) {
    this.mass = mass;
    this.radius = radius;
  }
}
```

**C#**의 enum은 TypeScript 숫자 enum과 거의 동일하다. 기본값이 `int`이고, 비트 플래그 패턴도 흔하다.

```csharp
enum Direction { Up, Down, Left, Right }
```

**Python**은 표준 라이브러리 `enum` 모듈로 제공한다.

```python
from enum import Enum

class Status(Enum):
    PENDING = "pending"
    ACTIVE  = "active"
```


TypeScript의 `as const` 객체 패턴과 개념이 비슷하다. 

언어 내장 기능 대신 기존 구조를 조합해 enum을 흉내낸다.

정리하면, enum은 "관련 상수를 하나로 묶는다"는 공통 목적을 가지지만 언어마다 구현 방식이 다르다. TypeScript의 enum이 논란이 되는 이유는 그 구현 방식이 나머지 타입 시스템과 이질적이기 때문이고, 다른 언어에서는 대체로 문제가 적다.

<br/>

## 컴파일하면 뭐가 나올까

TypeScript는 컴파일하면 `.js` 파일이 나온다.

타입 정보는 전부 사라지는데, **enum은 사라지지 않는다.**

```ts
enum Status {
  Pending = "PENDING",
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}
```

이게 컴파일되면 이렇게 변환된다.

```js
var Status;
(function (Status) {
  Status["Pending"] = "PENDING";
  Status["Active"] = "ACTIVE";
  Status["Inactive"] = "INACTIVE";
})(Status || (Status = {}));
```

즉시 실행 함수(IIFE)로 감싸진 객체가 생성된다.

**enum은 런타임에 실제로 존재하는 객체다.**

TypeScript의 다른 타입 구조들(interface, type alias)은 컴파일 후 완전히 사라지는데, enum은 남는다.

이게 문제의 시작이다.

![enum 컴파일 전후 비교](/assets/typescript/compile-before-after.png)

### IIFE가 남으면 뭐가 문제인가
<br/>

**1. 사이드 이펙트로 취급된다**
<br/>

번들러는 트리쉐이킹을 할 때 "이 코드를 제거해도 안전한가"를 판단한다.

IIFE는 즉시 실행되는 함수다. 모듈이 로드되는 순간 실행되기 때문에 번들러 입장에서 이 코드가 외부에 어떤 영향을 주는지 정적으로 확신할 수 없다.

결과적으로 사용하지 않는 enum도 번들에 포함되는 경우가 생긴다.

프로젝트에 영향을 줄 정도는 아니지만, 번들러 사이즈에 영향을 주는 것은 사실이다.

```ts
// utils.ts
export enum Status { ... }  // 사용됨
export enum Direction { ... }  // 사용 안 됨
```

`Direction`을 import하지 않아도 IIFE 특성상 번들러가 안전하게 제거하지 못할 수 있다.
<br/><br/>

**2. 런타임 메모리를 점유한다**

interface나 type alias는 컴파일 후 흔적 없이 사라진다.

enum은 런타임에 실제 객체로 존재한다. 작은 enum 몇 개라면 체감이 없지만, 대규모 코드베이스에서 enum을 남발하면 런타임에 불필요한 객체가 상주하게 된다.
<br/><br/>

**3. `var` 선언이 나온다**

컴파일 결과를 보면 `const`가 아니라 `var`다.

```js
var Status;  // let도 const도 아닌 var
(function (Status) { ... })(Status || (Status = {}));
```

`var`는 함수 스코프를 갖는다. 현대 JavaScript에서는 `const`/`let`을 쓰는 게 기본인데, enum 컴파일 결과물은 의도치 않게 오래된 패턴을 만들어낸다.
<br/><br/>

**4. 병합이 가능해진다**

IIFE 패턴의 특성 때문에 같은 이름의 enum을 여러 곳에서 선언해 합칠 수 있다.

```ts
enum Status {
  Pending = "PENDING",
}

enum Status {
  Active = "ACTIVE",
}

// Status.Pending과 Status.Active가 모두 존재
```

편리해 보이지만 코드베이스 전체를 뒤져야 어떤 값이 있는지 알 수 있는 상황이 생긴다. 예측 가능성이 떨어진다.

<br/>

## 숫자 enum의 역방향 매핑

역방향 매핑(reverse mapping)이란 키로 값을 찾는 것뿐 아니라, 값으로 키를 거꾸로 찾을 수 있는 구조다.

```ts
enum Direction {
  Up,
  Down,
  Left,
  Right,
}
```

컴파일 결과:

```js
var Direction;
(function (Direction) {
  Direction[Direction["Up"] = 0] = "Up";
  Direction[Direction["Down"] = 1] = "Down";
  Direction[Direction["Left"] = 2] = "Left";
  Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));
```

`Direction[0]`으로 `"Up"`을 꺼낼 수 있다. 역방향 매핑이 자동으로 생긴다.

```ts
console.log(Direction[0]); // "Up"
console.log(Direction.Up); // 0
```

편해 보이지만, 이 때문에 이상한 일이 가능해진다.

```ts
function move(dir: Direction) {
  console.log(dir);
}

move(0);      // 정상 — Direction.Up이니까
move(999);    // 오류 없음 — 숫자면 다 들어감
```

숫자 enum은 타입이 사실상 `number`다. 임의의 숫자를 넘겨도 컴파일 에러가 없다.

타입 안전성이 있는 척하지만 실제로는 없다.

<br/>

## 트리쉐이킹이 안 된다

번들러(Webpack, Rollup, esbuild 등)는 사용하지 않는 코드를 제거하는 트리쉐이킹을 한다.

```ts
// utils.ts
export enum Status {
  Pending = "PENDING",
  Active = "ACTIVE",
}

export enum Direction {
  Up = "UP",
  Down = "DOWN",
}
```

```ts
// app.ts
import { Status } from "./utils";

const s = Status.Active;
// Direction은 import하지도 않음
```

`Direction`을 쓰지 않으니 번들에서 빠질 것 같지만, IIFE 구조 때문에 번들러가 사이드 이펙트가 있는 코드로 인식하는 경우가 있다.

특히 `sideEffects: false`를 설정하지 않은 패키지나, 번들러 설정에 따라 enum 전체가 번들에 포함된다.

라이브러리 규모에서 enum을 많이 쓰면 번들 사이즈에 영향이 생긴다.

<br/>

## const enum — 문제를 해결하려다 더 큰 문제를

`const enum`은 이 문제를 해결하려고 만들어졌다.

```ts
const enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

const dir = Direction.Up;
```

컴파일 결과:

```js
const dir = "UP";
```

IIFE가 생성되지 않는다. 사용한 값이 인라인으로 대체된다.

런타임 객체가 없으니 번들 사이즈 문제도 없다.

**그러나 함정이 있다.**

<br/>

### isolatedModules와의 충돌

Next.js, Vite, esbuild 등 현대 빌드 도구들은 파일을 개별적으로 트랜스파일한다(`isolatedModules: true`).

`const enum`은 컴파일러가 다른 파일의 enum 정의를 알고 있어야 인라이닝이 가능하다.

개별 파일 트랜스파일 환경에서는 이게 불가능하다.

```ts
// direction.ts
export const enum Direction {
  Up = "UP",
}

// app.ts
import { Direction } from "./direction";
const dir = Direction.Up; // isolatedModules에서 에러
```

```
오류: 'const' 열거형 멤버에 대한 참조는 isolatedModules를 사용하는 경우 허용되지 않습니다.
```

Next.js나 Vite 프로젝트에서 `const enum`을 쓰면 이 에러가 난다.

`tsconfig.json`의 `isolatedModules: true`가 기본값인 환경이 많아지면서 `const enum`은 사실상 쓸 수 없는 상황이 됐다.

![const enum과 isolatedModules 충돌 원리](/assets/typescript/transpile-file-entire.png)

<br/>

### declare const enum — 더 심한 함정

외부 라이브러리의 `.d.ts`에 `declare const enum`이 있으면 런타임에 값이 없다.

```ts
// lib.d.ts
declare const enum Status {
  Active = "ACTIVE",
}
```

```ts
// app.ts
import { Status } from "lib";
console.log(Status.Active); // 컴파일은 됨
```

컴파일은 되지만 런타임에 `Status` 객체가 없어서 에러가 난다.

`skipLibCheck: true`와 함께 쓰면 컴파일 타임에도 못 잡는다.

TypeScript 팀도 `const enum`을 라이브러리에서 export하지 말라고 권고한다.

<br/>

## 네임스페이스로서의 enum

enum은 값이기도 하고 타입이기도 하다.

```ts
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

// 타입으로 쓸 때
function update(status: Status) { ... }

// 값으로 쓸 때
update(Status.Active);

// 타입 꺼내기
type ActiveStatus = Status.Active; // "ACTIVE"
```

이 이중성이 때로는 편리하다.

enum 이름 자체가 네임스페이스처럼 동작해서 관련 상수들을 묶어준다.

```ts
namespace HTTP {
  export enum Status {
    Ok = 200,
    NotFound = 404,
    InternalServerError = 500,
  }
}

// HTTP.Status.Ok
```

namespace와 enum을 조합하면 계층적 구조를 만들 수 있다.

하지만 `namespace`도 현대 TypeScript에서는 쓰지 않는 방향으로 가고 있다. ES 모듈이 그 역할을 대체하기 때문이다.

<br/>

## 유니온 타입으로 대체하기

요즘 TypeScript 커뮤니티에서 enum 대신 많이 쓰는 패턴이다.

```ts
// enum 대신
type Status = "PENDING" | "ACTIVE" | "INACTIVE";

const Status = {
  Pending: "PENDING",
  Active: "ACTIVE",
  Inactive: "INACTIVE",
} as const;

type Status = (typeof Status)[keyof typeof Status];
```

`as const`를 붙이면 값이 리터럴 타입으로 좁혀진다.

```ts
const Status = {
  Pending: "PENDING",
  Active: "ACTIVE",
  Inactive: "INACTIVE",
} as const;

// typeof Status는
// {
//   readonly Pending: "PENDING";
//   readonly Active: "ACTIVE";
//   readonly Inactive: "INACTIVE";
// }

type Status = (typeof Status)[keyof typeof Status];
// "PENDING" | "ACTIVE" | "INACTIVE"
```

`Status.Active`로 접근도 되고, `Status` 타입으로 타입 선언도 된다.

컴파일 후에는 그냥 일반 객체가 된다.

```js
const Status = {
  Pending: "PENDING",
  Active: "ACTIVE",
  Inactive: "INACTIVE",
};
```

IIFE 없이 평범한 객체이며 트리쉐이킹도 잘 된다.

![enum vs as const 컴파일 결과 비교](/assets/typescript/enum-vs-asconst.png)

<br/>

### 리터럴 유니온만 쓰는 경우

객체가 필요 없고 타입만 필요하다면 더 간단하다.

```ts
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

function move(direction: Direction) {
  // ...
}

move("UP");    // 정상
move("DIAG");  // 오류
```

자동완성도 된다. IDE에서 `""`을 입력하면 가능한 값이 나온다.

enum처럼 `Direction.Up`으로 접근은 안 되지만, 문자열을 직접 써도 타입 안전성은 동일하다.

<br/>

## enum이 여전히 유용한 경우

enum이 타입스크립트 프로젝트에서 단점만 나열될 정도로 무조건 나쁜 건 아니다.

### 숫자 값이 의미 있을 때

```ts
enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

function log(level: LogLevel, message: string) {
  if (level >= LogLevel.Warn) {
    // warn 이상만 출력
  }
}
```

`LogLevel.Warn >= LogLevel.Info` 같은 비교 연산이 필요할 때는 숫자 enum이 자연스럽다.

`as const` 객체로도 가능하지만 코드가 늘어난다.

<br/>

### 비트 플래그

```ts
enum Permission {
  None  = 0,
  Read  = 1 << 0,  // 1
  Write = 1 << 1,  // 2
  Admin = 1 << 2,  // 4
}

const userPermission = Permission.Read | Permission.Write; // 3

function hasPermission(user: number, perm: Permission) {
  return (user & perm) === perm;
}

hasPermission(userPermission, Permission.Read);  // true
hasPermission(userPermission, Permission.Admin); // false
```

비트 연산을 활용한 권한 시스템에서 숫자 enum이 유용하다.

<br/>

### 외부 API나 DB의 고정 코드값

```ts
enum OrderStatus {
  Pending   = 1,
  Confirmed = 2,
  Shipped   = 3,
  Delivered = 4,
  Cancelled = 5,
}
```

데이터베이스에 숫자로 저장되고, API 응답도 숫자로 오는 경우 enum이 의미를 부여하는 역할을 한다.

다만 이 경우도 `as const` 객체로 대체 가능하다.

<br/>

## 요즘 트렌드

TypeScript 5.0 이후 커뮤니티의 방향은 꽤 명확하다.

**string enum → `as const` 객체 + 유니온 타입으로 대체**가 주류가 됐다.

이유:

- `isolatedModules` 환경이 기본이 되면서 `const enum`이 거의 쓸 수 없어졌다
- 번들러 최적화 관점에서 IIFE보다 일반 객체가 낫다
- React, Next.js 생태계에서 `as const` 패턴이 사실상 표준이 됐다
- TypeScript 팀도 공식 문서에서 유니온 타입과 `as const`를 더 많이 소개하는 방향으로 가고 있다

ESLint의 `@typescript-eslint` 플러그인에는 `no-enum` 규칙도 있다.

```json
{
  "rules": {
    "@typescript-eslint/no-enum": "warn"
  }
}
```

<br/>

## 정리 — 결국 쓰는 게 맞을까

| 상황 | 추천 |
|------|------|
| 문자열 상수 집합 | `as const` 객체 + 유니온 타입 |
| 타입만 필요할 때 | 리터럴 유니온 타입 |
| 숫자 비교가 필요할 때 | 숫자 enum 또는 `as const` 객체 |
| 비트 플래그 | 숫자 enum |
| Next.js / Vite 프로젝트 | enum 피하기 (isolatedModules 충돌) |
| `const enum` | 거의 쓸 상황 없음 |

새 프로젝트를 시작한다면 처음부터 `as const` + 유니온 타입으로 가는 게 낫다.

기존 코드베이스에 enum이 이미 있다면 굳이 다 바꿀 필요는 없다. 문자열 enum은 그 자체로 동작하는 데 문제가 없고, 단지 컴파일 결과물이 더 크고 트리쉐이킹이 불리할 뿐이다.
