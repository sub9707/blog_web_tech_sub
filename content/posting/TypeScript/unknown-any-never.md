---
title: "unknown vs any vs never — 그동안 막 썼다면"
date: "2025-11-17"
description: "TypeScript 타입 시스템의 극단에 위치한 세 가지 타입, any·unknown·never가 각각 어떤 의미를 갖고 언제 써야 하는지 정리함"
tags: ["typescript", "unknown", "any", "never", "type-safety", "type-system"]
thumbnail: "/assets/thumbnails/unknown-any-never.png"
---

TypeScript 타입 시스템에는 세 가지 특이한 타입이 있다.

`any`, `unknown`, `never`.

셋 다 "일반적인 타입"과는 다르게 동작한다. 초보 때는 대충 넘어가고, 익숙해지면 무심코 `any`를 남발하다가, 어느 순간 이 셋이 타입 시스템의 핵심이라는 걸 깨닫는다.

이 세 가지가 실제로 어떤 의미를 갖는지, 타입 시스템에서 각각 어디에 위치하는지, 그리고 실무에서 어떤 기준으로 선택해야 하는지 정리한다.

<br/>

## 타입 계층(Type Hierarchy)부터 이해하기

TypeScript의 타입들은 계층 구조를 이룬다.

```
         unknown  (Top Type)
            |
    ┌───────┴───────┐
  string          number    ...모든 타입
    |
  "hello"  (리터럴 타입)

         never  (Bottom Type)
```

- **`unknown`** 은 최상위(Top Type)다. 모든 타입은 `unknown`에 할당될 수 있다.
- **`never`** 는 최하위(Bottom Type)다. `never`는 어떤 타입에도 할당될 수 있지만, `never`에는 아무것도 할당할 수 없다.
- **`any`** 는 이 계층을 무시한다. 규칙 밖에 있다.

![TypeScript 타입 계층 다이어그램](/assets/typescript/type-hierarchy.png)

<br/>

## any — 타입 검사를 끈다

```ts
let x: any = "hello";
x = 42;
x = { name: "Kim" };
x.foo.bar.baz(); // 에러 없음
x();             // 에러 없음
```

`any`를 쓰면 TypeScript가 해당 값에 대한 모든 타입 검사를 포기한다.

어떤 타입에 할당해도 되고, 어떤 타입에서 가져와도 된다. `.foo()`를 호출해도, `[0]`으로 인덱싱해도 에러가 없다.

```ts
let a: any = getExternalData();

let b: string = a;  // 에러 없음 (실제로는 위험)
let c: number = a;  // 에러 없음 (실제로는 위험)
```

`any`는 TypeScript를 JavaScript처럼 쓰겠다는 선언이다.

<br/>

### any의 전염성

`any`의 가장 위험한 특성은 **전염된다**는 것이다.

```ts
function processData(data: any) {
  return data.value; // 반환 타입도 any
}

const result = processData(apiResponse);
result.toUpperCase(); // 에러 없음 — result도 any이기 때문
```

`any`에서 무언가를 꺼내면 그것도 `any`가 된다. 타입 안전성이 연쇄적으로 무너진다.

![any 전염 흐름 다이어그램](/assets/typescript/any-infection.png)

<br/>

### any를 써야 하는 경우

`any`가 정당화되는 상황은 제한적이다.

**1. 점진적 마이그레이션**

JavaScript → TypeScript 전환 초기에 임시로 쓸 수 있다. 단, 주석으로 이유를 명시해야 한다.

```ts
// TODO: API 응답 타입 정의 후 제거
const response: any = await legacyFetchData();
```

**2. 정말 타입을 알 수 없는 경우**

써드파티 라이브러리에 타입이 없고, `@types`도 없고, 선언 파일도 작성하기 어려운 경우. 이 상황도 `unknown`으로 먼저 시도해야 한다.

**3. ESLint `@typescript-eslint/no-explicit-any` 규칙**

프로젝트에 이 규칙을 적용하면 `any` 남용을 방지할 수 있다.

<br/>

## unknown — 안전한 any

`unknown`은 "어떤 타입인지 모른다"는 점에서 `any`와 비슷하지만, 사용하기 전에 반드시 타입을 좁혀야 한다.

```ts
let x: unknown = getExternalData();

x.toUpperCase();           // 오류: unknown에는 직접 접근 불가
x();                       // 오류
const y: string = x;      // 오류: unknown은 string에 할당 불가
```

`any`와 달리 `unknown`은 아무것도 할 수 없다. 사용하려면 타입을 좁혀야 한다.

```ts
let x: unknown = getExternalData();

if (typeof x === "string") {
  x.toUpperCase(); // 이제 가능 — x가 string임을 확인했으므로
}
```

![any vs unknown 동작 비교](/assets/typescript/any-vs-unknown.png)

<br/>

### unknown이 빛나는 곳 — 에러 처리

TypeScript 4.0 이후 `catch` 절의 에러 타입이 `unknown`으로 바뀌었다.

```ts
try {
  await fetchData();
} catch (error) {
  // error는 unknown 타입
  console.log(error.message); // 오류: unknown에 직접 접근 불가
}
```

왜 `unknown`인가? `throw`는 어떤 값이든 던질 수 있기 때문이다.

```ts
throw new Error("message");  // Error 객체
throw "something went wrong"; // 문자열
throw 42;                      // 숫자
throw { code: 500 };           // 객체
```

`catch`에서 에러가 반드시 `Error` 인스턴스라는 보장이 없다. 그래서 `unknown`이 맞다.

올바른 처리 방법:

```ts
try {
  await fetchData();
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message); // 안전
  } else {
    console.log(String(error));
  }
}
```

<br/>

### unknown이 적합한 상황

```ts
// 1. 외부 API 응답
async function fetchUser(): Promise<unknown> {
  const response = await fetch("/api/user");
  return response.json();
}

// 사용하는 쪽에서 타입 검증 책임
const data = await fetchUser();
if (isUser(data)) {
  console.log(data.name);
}

// 2. 타입 가드와 함께 런타임 검증
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as any).name === "string"
  );
}
```

`unknown`은 외부 경계(API 응답, 파일 파싱, localStorage 등)에서 타입 안전성을 유지하는 올바른 방법이다.

<br/>

## never — 절대 존재할 수 없는 타입

`never`는 "값이 절대 존재할 수 없음"을 표현한다.

```ts
function throwError(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {}
}
```

이 함수들은 정상적으로 반환되지 않는다. 반환 타입이 `never`다.

<br/>

### never가 자동으로 등장하는 곳

**1. 불가능한 타입 교차**

```ts
type A = string & number; // never — string이면서 number인 값은 없다
```

**2. 좁힘이 완료된 후**

```ts
function process(value: string | number) {
  if (typeof value === "string") {
    // 여기서 value: string
  } else if (typeof value === "number") {
    // 여기서 value: number
  } else {
    // 여기서 value: never — 가능한 경우를 모두 소진했다
    const exhausted: never = value;
  }
}
```

`else` 블록에서 `value`는 `never`다. 더 이상 가능한 타입이 없기 때문이다.

<br/>

### never로 완전성 검사 (Exhaustive Check)

`never`의 가장 실용적인 활용이다.

```ts
type Shape = "circle" | "square" | "triangle";

function getArea(shape: Shape): number {
  switch (shape) {
    case "circle":
      return Math.PI;
    case "square":
      return 1;
    default:
      const exhaustiveCheck: never = shape;
      throw new Error(`처리되지 않은 Shape: ${exhaustiveCheck}`);
  }
}
```

`"triangle"`을 추가했는데 `switch`에 case가 없으면 `default`에서 `shape`가 `"triangle"`이 되고, `never`에 할당할 수 없으므로 컴파일 에러가 발생한다.

나중에 `Shape`에 타입이 추가될 때 처리를 빠뜨리면 컴파일 단계에서 잡힌다.

```ts
type Shape = "circle" | "square" | "triangle" | "hexagon"; // 추가

// getArea에서 "hexagon" case가 없으면 default의 never 할당에서 에러
// → 런타임 전에 누락을 발견할 수 있다
```

![Exhaustive Check 동작 원리](/assets/typescript/exhaustive-check-never.png)

<br/>

### never의 할당 규칙

```ts
// never는 모든 타입에 할당 가능
const a: string = (null as never); // 가능
const b: number = (null as never); // 가능

// 어떤 타입도 never에 할당 불가
let n: never;
n = "hello";  // 오류
n = 42;       // 오류
n = null;     // 오류
```

`never`는 모든 타입의 서브타입이다. 그래서 어느 자리에나 들어갈 수 있다. 하지만 `never` 타입의 값은 만들 수 없다.

<br/>

## 세 타입 비교

| | `any` | `unknown` | `never` |
|--|-------|-----------|---------|
| 어디서 나오나 | 명시적 선언 | 명시적 선언, catch | 불가능한 타입, 완전한 좁힘 |
| 할당받을 수 있는 것 | 모든 타입 | 모든 타입 | 아무것도 없음 |
| 할당할 수 있는 곳 | 모든 타입 | `unknown`, `any`만 | 모든 타입 |
| 타입 검사 | 없음 | 좁힘 필요 | 해당 없음 |
| 메서드 접근 | 허용 | 불가 | 불가 |
| 타입 안전성 | 없음 | 있음 | 해당 없음 |
| 주요 용도 | 탈출구(최후 수단) | 외부 경계 처리 | 불가능 표현, 완전성 검사 |

<br/>

## 실무 판단 기준

**`any`를 쓰고 싶다면 먼저 `unknown`을 고려한다.**

"타입을 모르겠다" → `unknown`  
"타입 검사를 피하고 싶다" → 이유가 타당한지 다시 생각한다

**외부 경계는 `unknown`으로 받는다.**

API 응답, 파일 파싱, `JSON.parse`, localStorage에서 읽은 값은 전부 `unknown`으로 시작해서 검증 후 좁힌다.

```ts
const raw: unknown = JSON.parse(storedData);
if (isValidConfig(raw)) {
  applyConfig(raw); // 안전
}
```

**`never`는 직접 쓰기보다 TypeScript가 추론하게 두는 경우가 많다.**

단, Exhaustive Check에서는 명시적으로 쓴다. 미래의 타입 추가를 컴파일 타임에 강제로 잡아주는 가장 확실한 방법이다.

<br/>

## 정리

`any`는 타입 시스템에서의 탈출구다. 탈출구는 쓸 수 있지만, 남발하면 TypeScript를 쓰는 의미가 없다.

`unknown`은 "모르는 것을 모른다고 표현하되, 쓰기 전에 확인하라"는 TypeScript의 요구다. `any` 대신 `unknown`을 쓰면 그 확인 책임이 사용하는 쪽으로 이전된다.

`never`는 "이 상황은 절대 일어날 수 없다"는 선언이다. 타입 좁힘의 끝에서 나타나고, 완전성 검사에서 활용된다.

세 가지를 구분해서 쓰면 타입 시스템이 실제로 버그를 잡아주기 시작한다.
