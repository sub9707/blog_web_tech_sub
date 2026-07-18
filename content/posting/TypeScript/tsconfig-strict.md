---
title: "`strict: true`에서 에러가 쏟아질 때... — tsconfig 컴파일러 옵션 파헤치기"
date: "2025-12-23"
description: "strict 하나로 뭘 켜는 건지, noImplicitAny랑 strictNullChecks가 따로 있는 이유가 뭔지. tsconfig 컴파일러 옵션을 하나씩 뜯어보자"
tags: ["typescript", "tsconfig", "strict", "compiler-options", "strictNullChecks"]
thumbnail: "/assets/thumbnails/typescript/tsconfig-strict.png"
---

TypeScript 프로젝트 세팅할 때 `strict: true` 한 줄 적고 넘어가는 경우가 많다.

그런데 이게 정확히 뭘 켜는 건지 관심 갖기엔 힘들 수 있다.

우선 `strict`는 하나의 옵션이 아니다. 

여러 엄격 검사 옵션을 한 번에 켜는 플래그다. 

각각 뭘 하는지 알아야 에러가 왜 나는지 이해하고, 상황에 맞게 조율할 수 있다.

<br/>

## strict가 켜는 옵션들

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

이 한 줄이 아래를 전부 켠다.

```json
{
  "strictNullChecks": true,
  "noImplicitAny": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "alwaysStrict": true,
  "useUnknownInCatchVariables": true
}
```

하나씩 뭘 하는지 보자

![strict 플래그 분해 다이어그램](/assets/typescript/tsconfig-strict/strict-setting.png)

<br/>

## strictNullChecks — 가장 중요한 옵션

`strict` 중에서 실질적인 영향이 가장 크다.

이걸 끄면 `null`과 `undefined`가 모든 타입에 할당 가능해진다.

```ts
// strictNullChecks: false (꺼진 상태)
let name: string = null;      // 오류 없음
let age: number = undefined;  // 오류 없음
```

켜면 `null`과 `undefined`는 명시적으로 허용한 타입에만 들어갈 수 있다.

```ts
// strictNullChecks: true (켜진 상태)
let name: string = null;          // 오류
let name: string | null = null;   // 정상
```

이게 켜져 있어야 TypeScript가 실제로 null 안전성을 보장한다. 

꺼진 상태에서는 "사용 전에 null 체크를 해줘" 같은 보장이 없다.

```ts
function getUser(id: number): User | null {
  // ...
}

const user = getUser(1);
console.log(user.name); // strictNullChecks: true면 오류
                        // — user가 null일 수 있음
```

<br/>

## noImplicitAny — 타입 추론 실패를 막는다

TypeScript가 타입을 추론하지 못하면 암묵적으로 `any`가 된다. 

이 옵션을 켜면 그 상황에서 에러가 난다.

```ts
// noImplicitAny: false (꺼진 상태)
function process(data) { // data: any — 오류 없음
  return data.value;
}

// noImplicitAny: true (켜진 상태)
function process(data) { // 오류: 'data'에 암묵적으로 'any' 형식이 포함됨
  return data.value;
}
```

파라미터 타입을 명시하지 않으면 에러가 난다. 

`any`를 쓰고 싶으면 명시적으로 써야 한다.

```ts
function process(data: any) { // 명시적 any — 오류 없음
  return data.value;
}
```

암묵적 `any`를 막는 것이지, `any` 자체를 금지하는 건 아니다.

<br/>

## strictFunctionTypes — 함수 파라미터 반공변성

### 공변과 반공변이란

타입 간의 관계가 상속 방향과 **같은 방향으로 흐르면 공변**, **반대로 흐르면 반공변**이다.

**공변 (Covariance)** — 반환값은 공변적이다.

```ts
class Animal {}
class Dog extends Animal {}

type Producer<T> = () => T;

const dogProducer: Producer<Dog> = () => new Dog();
const animalProducer: Producer<Animal> = dogProducer; // OK
```

`Dog extends Animal`이면 `Producer<Dog>`도 `Producer<Animal>`에 할당 가능하다. 

방향이 같다.

"더 구체적인 걸 반환해도 괜찮다" — Dog는 Animal이기 때문이다.

**반공변 (Contravariance)** — 매개변수는 반공변적이다.

```ts
type Consumer<T> = (arg: T) => void;

const animalConsumer: Consumer<Animal> = (a: Animal) => {};
const dogConsumer: Consumer<Dog> = animalConsumer; // OK
```

`Dog extends Animal`인데 `Consumer<Animal>`이 `Consumer<Dog>`에 할당 가능하다. 

단, 방향이 반대다.

"더 넓은 타입을 처리할 수 있으면, 좁은 타입도 당연히 처리 가능하다" — Dog도 Animal이기에...

---

### strictFunctionTypes가 하는 일

이 옵션이 꺼져 있으면 함수 파라미터가 **이변적(bivariant)** 으로 검사된다. 

즉, 공변과 반공변 둘 다 허용된다.

```ts
type Handler<T> = (value: T) => void;

const handleString: Handler<string> = (s) => console.log(s.toUpperCase());

const handler: Handler<string | number> = handleString;
// strictFunctionTypes: false → 오류 없음
// strictFunctionTypes: true  → 오류
```

`Handler<string | number>`는 `number`도 받을 수 있어야 한다.

그런데 `handleString`은 `string`만 처리한다. 

`handler(42)`를 호출하면 런타임 에러가 난다.

옵션을 켜면 파라미터를 반공변적으로 검사해서 이런 잘못된 할당을 컴파일 타임에 잡아낸다.

단, 메서드 선언(`:` 방식이 아닌 `()` 방식)에는 적용되지 않는다.

하위 호환성 때문이다.

<br/>

## strictPropertyInitialization — 클래스 프로퍼티 초기화 강제

클래스 프로퍼티가 생성자에서 초기화되지 않으면 에러가 난다.

```ts
class UserService {
  private db: Database; // 오류: 생성자에서 초기화되지 않음

  constructor() {
    // db를 초기화하지 않음
  }
}
```

초기화를 보장해야 한다.

```ts
class UserService {
  private db: Database;

  constructor(db: Database) {
    this.db = db; // 정상
  }
}

// 또는 definite assignment assertion
class UserService {
  private db!: Database; // !로 "나중에 확실히 초기화됨"을 명시

  init(db: Database) {
    this.db = db;
  }
}
```

`!`는 TypeScript에게 "내가 책임지겠다"는 신호다. 

실제로 초기화를 안 하면 런타임 에러가 날 수 있으니 남용은 피하는 게 맞다.

<br/>

## useUnknownInCatchVariables — catch 변수를 unknown으로

TypeScript 4.4부터 `strict` 안에 포함됐다.

```ts
try {
  // ...
} catch (error) {
  // useUnknownInCatchVariables: false → error: any
  // useUnknownInCatchVariables: true  → error: unknown
  
  console.log(error.message); // true면 오류: unknown에 직접 접근 불가
}
```

`throw`는 어떤 값이든 던질 수 있으니 `catch` 변수가 `unknown`인 게 맞다.

직접 접근하려면 타입을 좁혀야 한다.

```ts
catch (error) {
  if (error instanceof Error) {
    console.log(error.message); // 안전
  }
}
```

<br/>

## strict 외의 유용한 옵션들

`strict`에 포함되지 않지만 켜두면 도움이 되는 옵션들이 있다.

### noUncheckedIndexedAccess

배열 인덱스 접근과 객체 인덱스 시그니처 접근의 반환 타입에 `undefined`를 포함시킨다.

```ts
// noUncheckedIndexedAccess: false (기본값)
const arr: string[] = ["a", "b"];
const first: string = arr[0]; // 정상 — 범위 밖이어도 타입은 string

// noUncheckedIndexedAccess: true
const first: string | undefined = arr[0]; // undefined도 포함
```

```ts
const map: Record<string, number> = {};
const value = map["key"]; // string | undefined
```

배열이나 객체에서 값을 꺼낼 때마다 `undefined` 가능성이 생긴다. 

조금 번거롭지만 실제로는 안전하다.

<br/>

### noImplicitReturns

함수의 모든 코드 경로가 값을 반환하는지 검사한다.

```ts
// noImplicitReturns: true
function getLabel(status: string): string {
  if (status === "active") return "활성";
  // 오류: 일부 경로에서 반환값이 없음
}
```

`if`에만 `return`이 있고 `else`에 없으면 에러가 난다.

<br/>

### noFallthroughCasesInSwitch

`switch` 문에서 `break` 없이 다음 case로 떨어지는 걸 막는다.

```ts
switch (status) {
  case "loading":
    console.log("로딩 중");
    // 오류: fallthrough — break가 없음
  case "done":
    console.log("완료");
    break;
}
```

<br/>

### exactOptionalPropertyTypes

선택적 프로퍼티에 `undefined`를 명시적으로 할당하는 것을 막는다.

```ts
interface Config {
  theme?: "light" | "dark";
}

// exactOptionalPropertyTypes: false (기본값)
const config: Config = { theme: undefined }; // 정상

// exactOptionalPropertyTypes: true
const config: Config = { theme: undefined }; // 오류: undefined는 허용값이 아님
```

`theme?`는 "없어도 된다"는 뜻이지, "undefined를 넣어도 된다"는 뜻이 아니다. 

이 옵션이 그 차이를 강제한다.

<br/>

## 실전 tsconfig 권장 구성

### Next.js / React 프로젝트

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 기존 JS 프로젝트를 TS로 마이그레이션 중일 때

`strict`를 한 번에 켜면 에러가 너무 많이 나온다. 점진적으로 올리는 순서가 있다.

```json
{
  "compilerOptions": {
    // 1단계 — 먼저 이것만
    "noImplicitAny": true,

    // 2단계 — 어느 정도 정리되면
    "strictNullChecks": true,

    // 3단계 — 마지막에
    "strict": true
  }
}
```

`noImplicitAny`부터 켜고 `any`를 하나씩 제거한다. 

그 다음 `strictNullChecks`로 null 관련 에러를 잡는다. 

마지막에 `strict: true`로 나머지를 전부 켠다.

<br/>

## skipLibCheck — 언제 써야 하나

라이브러리의 `.d.ts` 파일에 대한 타입 검사를 건너뛴다.

```json
{
  "skipLibCheck": true
}
```

라이브러리들끼리 타입 충돌이 나거나, 오래된 `@types` 패키지가 에러를 뿜을 때 이걸 켜면 해결되는 경우가 많다.

단점은 라이브러리 타입 오류를 못 잡는다는 것이다. 

하지만 대부분의 실용적인 프로젝트에서는 내가 쓰는 라이브러리 소스가 잘못된 건 내가 고칠 수 없으니 켜두는 게 낫다. 


<br/>

## 정리

| 옵션 | 하는 일 | 우선순위 |
|------|---------|---------|
| `strictNullChecks` | null/undefined 할당 제한 | 최우선 |
| `noImplicitAny` | 암묵적 any 금지 | 최우선 |
| `strictFunctionTypes` | 함수 파라미터 반공변성 검사 | strict 포함 |
| `strictPropertyInitialization` | 클래스 프로퍼티 초기화 강제 | strict 포함 |
| `useUnknownInCatchVariables` | catch 변수를 unknown으로 | strict 포함 |
| `noUncheckedIndexedAccess` | 인덱스 접근에 undefined 포함 | 권장 |
| `noImplicitReturns` | 모든 경로 반환 강제 | 권장 |
| `exactOptionalPropertyTypes` | optional 프로퍼티 엄격화 | 선택적 |

`strict: true`는 출발점이다. 

거기서 `noUncheckedIndexedAccess`랑 `noImplicitReturns` 정도 더 켜두면 대부분의 실수를 컴파일 타임에 잡을 수 있다.
