---
title: "type vs interface — 언제 뭘 써야 할까"
date: "2025-11-05"
description: "문법 차이를 넘어 선언 병합, 확장 방식, 성능, 실무 선택 기준까지 type과 interface의 차이가 뭘까"
tags: ["typescript", "type", "interface", "declaration-merging", "generics"]
thumbnail: "/assets/thumbnails/type-vs-interface.png"
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

![interface extends vs type intersection 비교](/assets/typescript/extends-vs-intersection.png)

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

![선언 병합 동작 흐름](/assets/typescript/declaration-merging.png)

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

![컴파일 성능 차이 개념도](/assets/typescript/interface-compile-cache.png)

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

## 정리

| 항목 | `interface` | `type` |
|------|-------------|--------|
| 객체 구조 정의 | O | O |
| 유니온 타입 | X | O |
| 튜플 타입 | X | O |
| 원시 타입 별칭 | X | O |
| 조건부 타입 | X | O |
| 선언 병합 | O | X |
| 클래스 implements | O | O (유니온 제외) |
| 컴파일 성능 | 유리 (캐싱) | 불리 (재계산) |
| extends 충돌 감지 | O (컴파일 에러) | X (never로 처리) |

둘의 차이를 알고 쓰는 것과 모르고 아무거나 쓰는 것은 다르다.

객체 구조 → `interface`, 그 외 → `type`이라는 기준을 가지고 시작하면, 나머지는 상황에 맞게 판단이 된다.
