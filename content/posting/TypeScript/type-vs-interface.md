---
title: "type vs interface — 언제 뭘 써야 할까"
date: "2025-11-05"
description: "문법 차이를 넘어 선언 병합, 확장 방식, 성능, 실무 선택 기준까지 type과 interface의 차이가 뭘까"
tags: ["typescript", "type", "interface", "declaration-merging", "generics"]
thumbnail: "/assets/thumbnails/typescript/type-vs-interface.png"
---

TypeScript를 쓰다 보면 한 번쯤 멈추는 지점이 있다.

"여기서 `type`을 써야 하나, `interface`를 써야 하나?"

공식 문서는 둘 다 쓸 수 있다고 말한다. 팀마다 컨벤션이 다르고, 의견도 갈린다. 하지만 두 가지가 완전히 동일하진 않다.

표면적인 문법 차이는 금방 정리된다. 진짜 문제는 **어떤 상황에서 어느 쪽이 더 적합한가**다.

<br/>

## 문법 차이부터 정리

```ts
// interface
interface User {
  id: number;
  name: string;
}

// type
type User = {
  id: number;
  name: string;
};
```

객체 형태를 정의하는 것만 보면 차이가 없다. 둘 다 같은 역할을 한다.

하지만 `type`은 객체 외에도 다양한 것을 표현할 수 있다.

```ts
type ID = string | number;
type Point = [number, number];
type Callback = () => void;
type Nullable<T> = T | null;
```

`interface`는 이런 표현이 불가능하다. 오직 객체 형태만 정의할 수 있다.

<br/>

## 확장 방식의 차이

### interface — extends

```ts
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}
```

`extends`는 상속 구조가 명확하고, 컴파일러가 충돌을 감지한다.

```ts
interface A {
  value: string;
}

interface B extends A {
  value: number; // 오류: 'number'는 'string'에 할당 불가
}
```

충돌이 있으면 명시적으로 에러가 난다. 안전하다.

<br/>

### type — & (Intersection)

```ts
type Animal = {
  name: string;
};

type Dog = Animal & {
  breed: string;
};
```

Intersection은 두 타입을 합친다. 확장보다 조합에 가깝다.

주의할 점이 있다. 같은 키가 충돌하면 에러가 나지 않고 `never`가 된다.

```ts
type A = { value: string };
type B = { value: number };

type C = A & B;
// C.value는 string & number → never
```

에러 없이 `never`가 되기 때문에 조용히 버그로 이어질 수 있다.

![interface extends vs type intersection 비교](/assets/typescript/type-vs-interface/extends-vs-intersection.png)

<br/>

## 선언 병합 (Declaration Merging)

`interface`에만 있는 기능이다.

같은 이름의 `interface`를 여러 번 선언하면 자동으로 합쳐진다.

```ts
interface Config {
  debug: boolean;
}

interface Config {
  timeout: number;
}

// 실제로는 이 타입이 된다
// interface Config {
//   debug: boolean;
//   timeout: number;
// }
```

`type`으로 같은 이름을 두 번 선언하면 에러다.

```ts
type Config = { debug: boolean };
type Config = { timeout: number }; // 오류: 중복 식별자
```

<br/>

### 선언 병합이 쓸모 있는 상황

라이브러리 타입을 확장할 때 자주 활용된다.

```ts
// express의 Request 타입에 user 프로퍼티 추가
declare namespace Express {
  interface Request {
    user?: AuthUser;
  }
}
```

라이브러리 소스를 건드리지 않고 타입을 주입할 수 있다. `interface`이기 때문에 가능한 패턴이다.

반대로 라이브러리 내부에서도 의도적으로 `interface`를 쓰는 이유가 여기에 있다. 사용자가 타입을 확장할 수 있게 열어두는 것이다.

![선언 병합 동작 흐름](/assets/typescript/type-vs-interface/declaration-merging.png)

<br/>

## 제네릭과의 조합

둘 다 제네릭을 지원한다.

```ts
interface ApiResponse<T> {
  data: T;
  status: number;
}

type ApiResponse<T> = {
  data: T;
  status: number;
};
```

기능 차이는 없다. 하지만 조건부 타입은 `type`에서만 가능하다.

```ts
type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>; // "yes"
type B = IsString<number>; // "no"
```

`interface`는 조건부 타입 자체를 표현할 수 없다.

<br/>

## Mapped Types — `type`만 가능한 영역

제네릭보다 더 강력한 표현이 필요할 때 Mapped Types가 등장한다.

`[K in keyof T]` 문법으로 기존 타입의 각 키를 순회하며 새 타입을 만드는 방식이다.

```ts
type OptionsFlags<T> = {
  [K in keyof T]: boolean;
};

type Features = {
  darkMode: () => void;
  newUserProfile: () => void;
};

type FeatureOptions = OptionsFlags<Features>;
// { darkMode: boolean; newUserProfile: boolean; }
```

`interface`로는 이 문법을 쓸 수 없다.

```ts
// 오류: interface는 mapped type 문법 지원 안 함
interface OptionsFlags<T> {
  [K in keyof T]: boolean; // Error
}
```

컴파일러 제약이다. 의견의 문제가 아니다.

modifier를 붙여 기존 타입을 변환하는 것도 `type`만 가능하다.

```ts
// readonly 제거
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

// optional 제거
type Required<T> = {
  [K in keyof T]-?: T[K];
};

// 키 이름 변환 (as로 remapping)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

이 계열의 작업은 모두 `type`이 담당한다.

<br/>

## 유틸리티 타입과 함께 쓸 때

`Pick`, `Omit`, `Partial`, `Required`, `Readonly`, `Record` 같은 내장 유틸리티 타입은 `type`과 `interface` 모두 입력으로 받는다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;          // 동작
type PickedUser = Pick<User, 'id'|'name'>; // 동작
type OmitUser = Omit<User, 'email'>;       // 동작
```

주의할 점은 유틸리티 타입의 **결과는 항상 `type`**이라는 것이다.

그 결과를 다시 `interface extends`로 확장하고 싶다면 중간 `type`을 거쳐야 한다.

```ts
type PartialUser = Partial<User>;

interface AdminUser extends PartialUser {
  role: string;
}
```

### 인덱스 시그니처 — 미묘한 차이

`Record<string, string>` 같은 타입에 할당할 때 `interface`와 `type`이 다르게 동작하는 경우가 있다.

```ts
interface Named { name: string }
type NamedType = { name: string }

const a: Record<string, string> = {} as Named;      // 오류
const b: Record<string, string> = {} as NamedType;  // 동작
```

`interface`는 명시적으로 인덱스 시그니처를 선언하지 않으면 암묵적인 인덱스 시그니처를 갖지 않는다. `type`은 갖는다. 제네릭 함수나 유틸리티 타입과 조합할 때 예상치 못한 오류로 이어질 수 있다.

<br/>

## 재귀 타입

둘 다 재귀 타입을 지원하지만, 역사적으로 `type`이 더 유연했다.

```ts
type TreeNode = {
  value: number;
  children: TreeNode[];
};

interface TreeNode {
  value: number;
  children: TreeNode[];
}
```

현재 TypeScript(4.1 이후)에서는 둘 다 잘 동작한다. 그러나 복잡한 재귀 구조에서는 `type`이 더 직관적인 경우가 많다.

<br/>

## 클래스와의 관계

`interface`는 클래스가 구현해야 할 계약(contract)을 정의하는 데 어울린다.

```ts
interface Serializable {
  serialize(): string;
  deserialize(data: string): void;
}

class UserStore implements Serializable {
  serialize() {
    return JSON.stringify(this);
  }
  deserialize(data: string) {
    Object.assign(this, JSON.parse(data));
  }
}
```

`type`도 `implements`에 사용할 수 있다. 하지만 유니온 타입은 클래스가 구현할 수 없다.

```ts
type StringOrNumber = string | number;

class Foo implements StringOrNumber {} // 오류
```

클래스 계약을 표현할 때는 `interface`가 명확하다.

<br/>

## 성능 차이

TypeScript 공식 팀의 언급이 있다.

> interface는 캐시가 가능한 named type이다. type alias는 항상 확장 시 재계산된다.

실제로 복잡한 타입 계층에서 `interface extends`는 컴파일러가 결과를 캐싱할 수 있어 더 빠르다. `type &` Intersection은 매번 재계산이 필요하다.

대부분의 프로젝트에서 체감할 수 있는 차이는 아니다. 하지만 타입 수백 개가 얽힌 대형 프로젝트에서는 `interface` 기반이 컴파일 속도에 유리하다.

![컴파일 성능 차이 개념도](/assets/typescript/type-vs-interface/interface-compile-cache.png)

<br/>

## 실무에서 어떤 기준으로 선택할까

정리하면 이렇게 나뉜다.

| 상황 | 권장 |
|------|------|
| 객체 구조 정의 (확장 가능성 있음) | `interface` |
| 유니온, 튜플, 원시 타입 별칭 | `type` |
| 클래스 계약 (implements) | `interface` |
| 조건부 타입, 매핑 타입 | `type` |
| 라이브러리 타입 확장 | `interface` |
| 복잡한 타입 조합 / 유틸리티 | `type` |
| 함수 타입 | `type` (더 간결) |

<br/>

### 실무 팁

팀 컨벤션이 없다면 이 기준이 가장 실용적이다.

**기본 객체 구조는 `interface`로 시작한다.**

확장 가능성이 있고, 선언 병합이 필요할 수 있는 공개 API나 라이브러리 코드는 `interface`가 맞다.

**유니온이나 조건부 타입이 필요한 순간 `type`으로 간다.**

`interface`로 표현이 안 되는 순간이 분명히 온다. 그 순간 `type`을 쓰면 된다.

```ts
// interface로 시작
interface ButtonProps {
  label: string;
  onClick: () => void;
}

// 유니온이 필요하면 type
type ButtonVariant = "primary" | "secondary" | "danger";

// 조건부가 필요하면 type
type ExtractProps<T> = T extends React.ComponentType<infer P> ? P : never;
```

<br/>

## 실제로 둘이 혼용되는 게 맞다

어떤 팀은 "전부 `interface`", 어떤 팀은 "전부 `type`"으로 통일하기도 한다.

둘 다 나쁘지 않다. 일관성이 있으면 된다.

하지만 TypeScript 팀의 공식 권장은 **객체 타입에는 `interface`를 먼저 고려하고, `interface`로 표현이 안 될 때 `type`을 쓰라**는 것이다.

이유는 단순하다. `interface`가 에러 메시지를 더 명확하게 보여주고, 선언 병합이라는 확장 가능성을 열어두기 때문이다.

<br/>

## 공식 문서의 입장

TypeScript 공식 핸드북은 아래와 같이 명시한다.

> "For the most part, you can choose based on personal preference, and TypeScript will tell you if it needs something to be the other kind of declaration. If you would like a heuristic, use `interface` until you need to use features from `type`."

<bookmark url="https://www.typescriptlang.org/docs/handbook/2/everyday-types.html" />

핵심은 두 가지다.

- `interface`를 기본으로 시작한다
- `interface`로 표현이 안 되는 순간 `type`으로 간다

이렇게 권장하는 이유는 `interface`가 에러 메시지를 더 명확하게 보여주고, 선언 병합을 통해 외부에서 타입을 확장할 수 있는 가능성을 열어두기 때문이다.

Mapped Types 공식 문서:

<bookmark url="https://www.typescriptlang.org/docs/handbook/2/mapped-types.html" />

<br/>

## 커뮤니티 의견 종합

---

### Total TypeScript — "Type vs Interface: Which Should You Use?"

<bookmark url="https://www.totaltypescript.com/type-vs-interface-which-should-you-use" />

**원글 주제:** 객체 타입을 선언할 때 `interface`와 `type alias` 중 어떤 걸 써야 하는가.

공식 핸드북과 반대로, `type`을 기본으로 쓸 것을 주장한다.

> "You should use types by default until you need a specific feature of interfaces, like 'extends'."

> "Interfaces are still my recommendation for object inheritance, but I'd recommend you use `type` by default. It's a little more flexible and a little less surprising."

두 가지 근거를 든다.

**선언 병합은 footgun이다.** 같은 이름의 `interface`를 두 번 선언하면 조용히 합쳐진다. 의도하지 않은 병합은 원인을 추적하기 어려운 버그로 이어진다. `type`은 중복 선언 시 즉시 컴파일 에러가 난다.

**`interface`는 암묵적 인덱스 시그니처가 없다.** `Record<string, unknown>`에 `interface`를 할당하면 `Index signature for type 'string' is missing in type 'x'` 오류가 난다. 동일한 구조를 `type`으로 선언하면 동작한다. 제네릭 패턴에서 예상치 못한 오류로 이어지는 지점이다.

![Matt Pocock type vs interface](/assets/typescript/mattpocockuk-type-vs-interface.png)

<br/>

---

### TypeScript Playground 공식 예제 — "Types vs Interfaces"

<bookmark url="https://www.typescriptlang.org/play/typescript/language-extensions/types-vs-interfaces.ts.html" />

**원글 주제:** TypeScript 팀이 직접 관리하는 예제 페이지. 두 선언자의 공통점과 차이점을 코드로 설명한다.

입장은 `interface` 기본이다.

> "Use **interfaces** for publicly exposed types due to better error messages and the flexibility of declaration merging."

두 가지 핵심 차이를 명시한다.

**에러 메시지:** `interface`는 에러를 간결하게 보여준다. `type`은 구조 전체를 펼쳐서 표시하기 때문에 복잡한 타입일수록 읽기 어렵다.

**열린 타입 vs 닫힌 타입:** `interface`는 재선언으로 확장할 수 있다(open). `type`은 선언 이후 변경이 불가능하다(closed). 라이브러리나 공개 API에서는 이 차이가 의미 있다.

```ts
// interface — 열려 있음
interface Kitten { purrs: boolean }
interface Kitten { colour: string }
// Kitten = { purrs: boolean; colour: string }

// type — 닫혀 있음
type Puppy = { color: string }
type Puppy = { toys: number } // Error: Duplicate identifier 'Puppy'
```

이 페이지에서 직접 참조하는 StackOverflow 스레드:

<bookmark url="https://stackoverflow.com/questions/37233735/typescript-interfaces-vs-types/52682220#52682220" />

**원 질문:** "Interfaces vs Types in TypeScript" — TypeScript에서 `interface`와 `type`의 차이가 무엇인지, 언제 각각 써야 하는지를 묻는 질문이다. 약 2,000개 이상의 추천을 받은 StackOverflow의 대표적인 TypeScript 스레드다.

상위 답변들의 공통 흐름:
- TypeScript 2.x 시절에는 `interface`가 훨씬 강력했다
- 3.x 이후 `type`의 표현력이 대부분 따라잡으면서 실질적 차이가 줄었다
- 현재는 "객체 구조는 `interface`, 나머지는 `type`"이 가장 많이 지지받는 기준이다

![StackOverflow interfaces vs types thread](/assets/typescript/stackoverflow-type-vs-interface.png)

<br/>

---

### DEV Community — "TypeScript: Interface or Type? Hint: it's in the name"

<bookmark url="https://dev.to/manuartero/my-take-on-interface-vs-type-hc8" />

**원글 주제:** 왜 TypeScript는 비슷한 두 개념을 제공하면서 공식적인 가이드를 주지 않는가. 저자가 자신의 입장 변화 과정을 서술한다.

저자는 세 단계를 거쳐 `type` 기본으로 정착했다고 밝힌다.

1. "`interface`를 권장했다"
2. "어느 쪽이든 상관없다"
3. "`type`을 기본으로 쓴다"

변화의 계기는 `Record<string, unknown>` 호환성 문제를 직접 겪은 것이다.

> "It's called TypeScript not InterfaceScript."

> "I've turned to using types -almost- exclusively."

**댓글 반응:**

Michael Ayres는 `interface Profile extends Record<string, unknown>`으로 회피할 수 있다는 대안을 제시하면서도, 개인적으로는 IntelliSense 가독성 때문에 `interface`를 선호한다고 덧붙였다.

Brian Morearty는 이렇게 반응했다.

> "it's very frustrating that the language has these two concepts that are so similar that no one knows which one to use."

저자는 Matt Pocock도 동일한 입장 변화 과정을 겪었다고 언급한다.

![DEV Community interface vs type discussion](/assets/typescript/dev-manuartero-type-vs-interface.png)

<br/>

---

### DEV Community — "TypeScript: Interface is Not Always Recommended Over Type"

<bookmark url="https://dev.to/jesterxl/typescript-interface-is-not-always-recommended-over-type-k0c" />

**원글 주제:** `interface`를 성능상의 이유로 권장하는 조언들이 과도하게 단순화되어 있다는 반론. 선택 기준을 패러다임으로 나눠야 한다고 주장한다.

> "Interface is recommended for Object Oriented Developers — interface melds nicely with classes, and inheritance, and design patterns."

> "I recommend using the Type keyword knowing the TypeScript compiler performance overhead; the trade off is stricter types and more readable compiler messages."

핵심 논지는 이렇다. 함수형 프로그래밍에서 intersection(`&`)은 상속이 아니라 판별 유니온(discriminated union) 패턴을 위한 문법적 편의다. `Polygon`을 `Point | Vector | Rectangle`로 모델링하면 switch 문에서 컴파일러가 누락된 케이스를 잡아낸다. 이 패턴에서는 `type`이 자연스럽다.

OOP 코드베이스라면 `interface`, 함수형 스타일이라면 `type`. 컴파일 성능 오버헤드를 감수하면서도 `type`을 선택하는 이유는 엄밀함과 가독성이다.

<br/>

---

### LogRocket — "Types vs. Interfaces in TypeScript"

<bookmark url="https://blog.logrocket.com/types-vs-interfaces-typescript/" />

**원글 주제:** TypeScript에서 가장 자주 묻는 질문 중 하나 — "interface를 써야 하나 type을 써야 하나?" 를 사용 사례별로 정리한다.

> "The answer depends on the specific use case."

실용적인 결정 기준을 제시한다.

- 원시 타입 별칭, 유니온, 튜플, 함수 타입, Mapped Types, 조건부 타입 → `type`
- 선언 병합이 필요할 때, OOP 상속 패턴, 공개 라이브러리 API → `interface`

성능에 대해서도 언급한다. TypeScript는 `interface extends`의 결과를 내부적으로 캐싱한다. `type &` 교차 타입은 참조될 때마다 재계산된다. 대형 모노레포에서는 의미 있는 차이다.

저자의 최종 입장:

> "I lean towards using types simply because of the amazing type system."

`type`을 기본으로, 선언 병합이 필요한 상황에서만 `interface`를 쓰는 혼용 전략을 권장한다.

<br/>

---

### r/typescript 커뮤니티 반응

Reddit의 r/typescript에서도 이 주제는 주기적으로 올라오는 단골 논쟁이다. 검색어 `type vs interface` 또는 `type alias vs interface`로 직접 스레드를 찾을 수 있다.

전반적인 흐름:

- TypeScript 2.x 시절 → "`interface`가 훨씬 강력, 당연히 `interface`"
- 3.x 이후 → "실질적 차이가 많이 줄었다. 팀 컨벤션 따르면 된다"
- 현재 → "`type` 기본이 편하다"는 쪽으로 무게추가 이동하는 중

![r/typescript type vs interface discussion](/assets/typescript/reddit-rts-type-vs-interface.png)

<br/>

## 정리

| 항목 | `interface` | `type` |
|------|-------------|--------|
| 객체 구조 정의 | O | O |
| 유니온 타입 | X | O |
| 튜플 타입 | X | O |
| 원시 타입 별칭 | X | O |
| 조건부 타입 | X | O |
| Mapped Types (`[K in keyof T]`) | X | O |
| 선언 병합 | O | X |
| 클래스 implements | O | O (유니온 제외) |
| 컴파일 성능 | 유리 (캐싱) | 불리 (재계산) |
| extends 충돌 감지 | O (컴파일 에러) | X (never로 처리) |
| 암묵적 인덱스 시그니처 | X | O |
| 유틸리티 타입 입력 | O | O |

둘의 차이를 알고 쓰는 것과 모르고 아무거나 쓰는 것은 다르다.

객체 구조 → `interface`, 그 외 → `type`이라는 기준을 가지고 시작하면, 나머지는 상황에 맞게 판단이 된다.
