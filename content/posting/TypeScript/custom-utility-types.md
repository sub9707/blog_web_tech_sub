---
title: "내장 유틸리티만으론 부족할 때 — 커스텀 유틸리티"
date: "2026-06-06"
description: "타입을 다루다 보면 Partial이나 Readonly만으로 해결되지 않는 경우가 있다. DeepPartial, DeepReadonly 같은 커스텀 유틸리티 타입을 직접 구현하면서 알게 된 내용을 정리했다."
tags: ["typescript", "utility-types", "mapped-types", "conditional-types", "deep-partial"]
thumbnail: "/assets/thumbnails/custom-utility-types.png"
---

TypeScript 내장 유틸리티 타입을 쓰다 보면 벽에 부딪히는 순간이 온다.

`Partial`은 최상위 프로퍼티만 optional로 만들고, 중첩 객체는 그대로 둔다. `Readonly`도 마찬가지다.<br/>
`NonNullable`은 `null | undefined`를 제거하지만 객체 내부 프로퍼티에는 적용되지 않는다.

이런 상황에서 커스텀 유틸리티 타입이 필요해진다. <br/>
내장 유틸리티 타입을 만드는 데 쓰인 것과 같은 도구, Mapped Type과 조건부 타입으로 직접 만들 수 있다.

<br/>

## 먼저 알아야 할 것 — Mapped Type

Mapped Type은 기존 타입의 각 프로퍼티를 변환해서 새 타입을 만드는 방법이다.

```ts
type Stringify<T> = {
  [K in keyof T]: string;
};

interface User {
  id: number;
  name: string;
  active: boolean;
}

type StringifiedUser = Stringify<User>;
// {
//   id: string;
//   name: string;
//   active: string;
// }
```

`[K in keyof T]`는 `T`의 모든 키를 순회한다. 각 키에 대해 값 타입을 변환한다.

내장 `Partial`, `Required`, `Readonly`가 모두 이 방식으로 구현되어 있다.

```ts
type Partial<T>  = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };
```

`?`를 붙이면 optional, `-?`는 optional 제거, `readonly`는 읽기 전용이다.

<br/>

## DeepPartial — 중첩까지 모두 optional로

내장 `Partial`의 한계부터 확인한다.

```ts
interface Config {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
    name: string;
  };
}

type PartialConfig = Partial<Config>;
// {
//   server?: { host: string; port: number };   ← server는 optional이지만
//   database?: { url: string; name: string };  ← 내부는 여전히 required
// }
```

`PartialConfig`에서 `server`를 넘길 때 `host`만 있고 `port`를 빼면 에러가 난다.

`DeepPartial`로 해결한다.

```ts
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
```

- `T`가 객체면: 각 프로퍼티를 optional로 만들고, 값 타입에도 재귀적으로 `DeepPartial` 적용
- `T`가 원시 타입이면: 그대로 반환

```ts
type DeepPartialConfig = DeepPartial<Config>;
// {
//   server?: {
//     host?: string;
//     port?: number;
//   };
//   database?: {
//     url?: string;
//     name?: string;
//   };
// }
```

이제 `server.host`만 있어도 된다.

![DeepPartial vs Partial 비교](/assets/typescript/deep-partial-vs-partial.png)

<br/>

### DeepPartial 실전

```ts
function mergeConfig(
  defaults: Config,
  overrides: DeepPartial<Config>
): Config {
  return {
    server: { ...defaults.server, ...overrides.server },
    database: { ...defaults.database, ...overrides.database },
  };
}

// host만 오버라이드 가능
mergeConfig(DEFAULT_CONFIG, {
  server: { host: "prod.server.com" },
});
```

<br/>

## DeepReadonly — 중첩까지 모두 읽기 전용

같은 패턴으로 `DeepReadonly`를 만든다.

```ts
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

```ts
interface State {
  user: {
    name: string;
    settings: {
      theme: string;
    };
  };
}

type ImmutableState = DeepReadonly<State>;

const state: ImmutableState = {
  user: { name: "Kim", settings: { theme: "dark" } },
};

state.user.name = "Lee";               // 오류: readonly
state.user.settings.theme = "light";   // 오류: readonly (중첩도 적용)
```

Redux 상태나 불변 설정 객체에서 실수로 값을 바꾸는 걸 컴파일 타임에 막는다.

<br/>

## NonNullableProperties — 객체 내 모든 프로퍼티에서 null 제거

내장 `NonNullable<T>`는 타입 하나에만 적용된다. 객체 내부 프로퍼티 전체에 적용하려면 직접 만들어야 한다.

```ts
type NonNullableProperties<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};
```

```ts
interface UserInput {
  name: string | null;
  email: string | undefined;
  age: number | null | undefined;
}

type ValidatedUser = NonNullableProperties<UserInput>;
// {
//   name: string;
//   email: string;
//   age: number;
// }
```

유효성 검사를 통과한 데이터 타입을 표현할 때 유용하다.

```ts
function validateUser(input: UserInput): ValidatedUser {
  if (!input.name || !input.email || input.age == null) {
    throw new Error("유효하지 않은 입력");
  }
  return input as ValidatedUser;
}
```

<br/>

## PickByValue — 값 타입으로 프로퍼티 선택

키가 아닌 값 타입 기준으로 프로퍼티를 고르는 유틸리티 타입이다.

```ts
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
```

`as` 절로 키를 조건부로 필터링한다. `T[K]`가 `V`의 서브타입이 아닌 키는 `never`로 제거된다.

```ts
interface Form {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  score: number;
}

type StringFields = PickByValue<Form, string>;
// { name: string; email: string }

type NumberFields = PickByValue<Form, number>;
// { age: number; score: number }
```

![PickByValue 동작 원리](/assets/typescript/pick-by-value.png)

<br/>

### 실전 — 특정 타입 프로퍼티만 초기화

```ts
function resetStringFields<T>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (typeof result[key] === "string") {
      (result as any)[key] = "";
    }
  }
  return result;
}
```

이런 함수에 `PickByValue` 기반 타입을 조합하면 타입 안전성을 높일 수 있다.

<br/>

## OmitByValue — 값 타입으로 프로퍼티 제거

```ts
type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};
```

`PickByValue`와 반대로 조건을 뒤집는다.

```ts
type NonStringFields = OmitByValue<Form, string>;
// { age: number; isActive: boolean; score: number }
```

<br/>

## Nullable — null을 붙인다

```ts
type Nullable<T> = T | null;

type NullableString = Nullable<string>; // string | null
```

단순하지만 자주 쓰인다. 특히 객체 프로퍼티에 일관성 있게 적용할 때.

```ts
type NullableProperties<T> = {
  [K in keyof T]: Nullable<T[K]>;
};

interface User {
  name: string;
  email: string;
  deletedAt: Date;
}

type SoftDeletedUser = NullableProperties<Pick<User, "deletedAt">> & Omit<User, "deletedAt">;
// {
//   name: string;
//   email: string;
//   deletedAt: Date | null;
// }
```

<br/>

## Prettify — 복잡한 교차 타입을 보기 좋게

여러 유틸리티 타입을 조합하다 보면 타입 미리보기가 지저분해진다.

```ts
type A = { name: string };
type B = { age: number };
type C = A & B;
// 타입 미리보기: A & B (내부 구조가 안 보임)
```

`Prettify`로 펼쳐서 보이게 만든다.

```ts
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
```

```ts
type PrettifiedC = Prettify<A & B>;
// { name: string; age: number }
```

타입 자체가 바뀌는 게 아니라 IDE의 타입 미리보기가 펼쳐서 보이는 것이다. 복잡한 타입을 디버깅할 때 유용하다.

![Prettify IDE 미리보기 비교](/assets/typescript/prettify-ide-preview.png)

<br/>

## Paths — 중첩 객체의 경로 타입

중첩 객체에서 점 표기법으로 접근 가능한 모든 경로를 타입으로 표현한다.

```ts
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Paths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
    : `${Prefix}${K}`;
}[keyof T & string];
```

```ts
interface Config {
  server: {
    host: string;
    port: number;
  };
  debug: boolean;
}

type ConfigPaths = Paths<Config>;
// "server" | "server.host" | "server.port" | "debug"
```

```ts
function getConfigValue(config: Config, path: Paths<Config>) {
  // path는 실제 존재하는 경로만 허용
}

getConfigValue(config, "server.host"); // 정상
getConfigValue(config, "server.url");  // 오류: 존재하지 않는 경로
```

form 라이브러리의 필드 경로, i18n 번역 키 같은 곳에서 응용된다.

<br/>

## KeysOfType — 특정 타입의 값을 가진 키만 추출

```ts
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
```

값이 `never`인 키는 인덱스 접근 시 자동으로 제거된다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
}

type StringKeys = KeysOfType<User, string>;
// "name" | "email"

type NumberKeys = KeysOfType<User, number>;
// "id" | "age"
```

`PickByValue`의 키만 버전이다. 값 타입이 아닌 키 유니온이 필요할 때 쓴다.

<br/>

## 커스텀 유틸리티 타입 설계 원칙

### 단순하게 시작한다

처음부터 재귀적이고 복잡한 타입을 만들려고 하면 디버깅이 어렵다. 단순한 케이스부터 만들고 점진적으로 확장한다.

```ts
// 1단계: 단순 버전
type PartialV1<T> = {
  [K in keyof T]?: T[K];
};

// 2단계: 깊은 버전
type DeepPartialV2<T> = T extends object
  ? { [K in keyof T]?: DeepPartialV2<T[K]> }
  : T;
```

### 엣지 케이스를 확인한다

원시 타입, 배열, `null`, `undefined`, 함수 타입이 입력으로 들어올 때 어떻게 동작하는지 확인한다.

```ts
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// 배열은?
type A = DeepPartial<string[]>; // (string | undefined)[] — 배열 요소도 optional이 됨
// 의도한 동작인지 확인 필요
```

배열을 제외하려면 조건을 추가한다.

```ts
type DeepPartialSafe<T> = T extends Array<infer E>
  ? Array<DeepPartialSafe<E>>
  : T extends object
  ? { [K in keyof T]?: DeepPartialSafe<T[K]> }
  : T;
```

### 이름을 명확하게 짓는다

```ts
// 나쁜 예
type MyType<T> = ...
type Helper<T, K> = ...

// 좋은 예
type DeepPartial<T> = ...
type PickByValue<T, V> = ...
type KeysOfType<T, V> = ...
```

이름만 봐도 무엇을 하는 타입인지 알 수 있어야 한다.

<br/>

## 정리

| 커스텀 유틸리티 타입 | 하는 일 |
|-------------------|---------|
| `DeepPartial<T>` | 중첩 포함 모든 프로퍼티 optional |
| `DeepReadonly<T>` | 중첩 포함 모든 프로퍼티 readonly |
| `NonNullableProperties<T>` | 객체 내 모든 프로퍼티에서 null/undefined 제거 |
| `PickByValue<T, V>` | 값 타입이 V인 프로퍼티만 선택 |
| `OmitByValue<T, V>` | 값 타입이 V인 프로퍼티 제거 |
| `Nullable<T>` | null 추가 |
| `Prettify<T>` | 교차 타입을 펼쳐서 보이게 |
| `Paths<T>` | 중첩 객체의 모든 접근 경로 |
| `KeysOfType<T, V>` | 값 타입이 V인 키 유니온 |

내장 유틸리티 타입은 출발점이다. Mapped Type과 조건부 타입이라는 도구를 이해하면, 필요한 유틸리티 타입을 직접 만드는 게 어렵지 않다. 만들고 나면 프로젝트 전역에서 재사용할 수 있다.
