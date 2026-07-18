---
title: "Discriminated Union으로 상태 모델링하기"
date: "2025-11-08"
description: "불가능한 상태를 타입으로 원천 차단하는 Discriminated Union 패턴, 실전 상태 모델링, React와의 조합까지"
tags: ["typescript", "discriminated-union", "state-modeling", "type-safety", "react"]
thumbnail: "/assets/thumbnails/typescript/discriminated-union.png"
---

버그 중 상당수는 "있어서는 안 되는 상태"가 존재하기 때문에 발생한다.

```ts
// 이 상태 조합들이 실제로 가능한가?
const state = {
  isLoading: true,
  data: { name: "Kim" }, // 로딩 중인데 데이터가 있다?
  error: "서버 오류",    // 로딩 중인데 에러도 있다?
};
```

boolean 플래그를 여러 개 조합하면 논리적으로 불가능한 상태가 타입 시스템에서 허용된다. TypeScript가 막아주지 않으면 런타임에서 터진다.

**Discriminated Union**은 이 문제를 근본적으로 해결한다. 가능한 상태만 타입으로 표현하고, 불가능한 상태는 컴파일 단계에서 원천 차단한다.

<br/>

## Discriminated Union이란

세 가지 요소로 구성된다.

1. **공통 리터럴 타입 프로퍼티 (판별자, Discriminant)** — 각 타입을 구분하는 고유한 필드
2. **여러 타입의 유니온** — 가능한 상태 각각을 타입으로 정의
3. **TypeScript의 Narrowing** — 판별자를 기준으로 자동으로 타입을 좁힘

```ts
type LoadingState = { status: "loading" };
type SuccessState = { status: "success"; data: string };
type ErrorState   = { status: "error"; message: string };

type FetchState = LoadingState | SuccessState | ErrorState;
```

`status` 필드가 판별자다. 값이 `"loading"`, `"success"`, `"error"` 중 하나로 고정되어 있고, 각 값마다 다른 타입이 대응된다.

![Discriminated Union 구조 다이어그램](/assets/typescript/discriminated-union/discriminated-union-structure.png)

<br/>

## 불가능한 상태를 타입으로 막는다

### 기존 방식의 문제

```ts
// 나쁜 예 — boolean 플래그 조합
interface FetchState {
  isLoading: boolean;
  data: string | null;
  error: string | null;
}
```

이 타입에서 허용되는 조합:

| isLoading | data | error | 의미 |
|-----------|------|-------|------|
| true | null | null | 로딩 중 (정상) |
| false | "..." | null | 성공 (정상) |
| false | null | "..." | 에러 (정상) |
| true | "..." | null | 로딩 중인데 데이터가 있다 (비정상) |
| true | null | "..." | 로딩 중인데 에러가 있다 (비정상) |
| false | "..." | "..." | 성공이면서 에러 (비정상) |
| true | "..." | "..." | 셋 다 있다 (비정상) |

7가지 조합이 모두 타입적으로 유효하다. 비정상 조합이 4가지나 된다. 이 중 하나라도 코드에서 실수로 만들어지면 버그다.

<br/>

### Discriminated Union으로 해결

```ts
// 좋은 예 — 상태마다 명확한 타입
type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; message: string };
```

가능한 상태: 정확히 4가지. 비정상 조합: 0가지.

```ts
function render(state: FetchState) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <Spinner />;
    case "success":
      // state: { status: "success"; data: string }
      // data 프로퍼티에 안전하게 접근 가능
      return <Content data={state.data} />;
    case "error":
      // state: { status: "error"; message: string }
      return <Error message={state.message} />;
  }
}
```

TypeScript가 `status` 값에 따라 자동으로 타입을 좁혀준다. `state.data`에 접근할 때 `status === "success"`인 경우에만 해당 프로퍼티가 있다는 걸 컴파일러가 안다.

![boolean 플래그 vs Discriminated Union 비교](/assets/typescript/discriminated-union/boolean-flags-vs-du.png)

<br/>

## 판별자(Discriminant) 설계

판별자는 **리터럴 타입**이어야 한다.

```ts
// 좋은 판별자 — 리터럴 타입
type State =
  | { kind: "a"; value: string }
  | { kind: "b"; count: number };

// 나쁜 판별자 — 리터럴 타입이 아니면 좁혀지지 않는다
type BadState =
  | { kind: string; value: string }  // string이면 모든 string이 해당됨
  | { kind: string; count: number };
```

판별자로 자주 쓰는 필드명:

- `type`
- `kind`
- `status`
- `tag`
- `variant`

팀에서 일관성 있게 하나를 정해서 쓰는 게 좋다.

<br/>

### 여러 판별자 조합

하나의 공통 필드가 아니라 여러 필드 조합으로 유니온을 구성할 수도 있다. 하지만 TypeScript는 단일 판별자 필드가 있을 때 가장 잘 동작한다.

```ts
// 권장 — 단일 판별자
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset"; value: number };

// 복잡 — 여러 필드로 구분 (피하는 게 낫다)
type ComplexState =
  | { isLoading: true; isError: false }
  | { isLoading: false; isError: true; error: string }
  | { isLoading: false; isError: false; data: string };
```

두 번째 방식은 TypeScript가 이해하긴 하지만, 단일 판별자보다 Narrowing 추론이 복잡해질 수 있다.

<br/>

## 실전 패턴 1 — 비동기 데이터 상태

API 호출 결과를 상태로 모델링하는 가장 흔한 사례다.

```ts
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

// 제네릭으로 재사용 가능
type UserState = AsyncState<User>;
type PostsState = AsyncState<Post[]>;
```

제네릭과 조합하면 어떤 데이터 타입에도 재사용할 수 있다.

```ts
function useAsync<T>(fetchFn: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });

  const execute = async () => {
    setState({ status: "loading" });
    try {
      const data = await fetchFn();
      setState({ status: "success", data });
    } catch (error) {
      setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
    }
  };

  return { state, execute };
}
```

<br/>

## 실전 패턴 2 — Redux/useReducer 액션

Redux 스타일의 액션 타입 정의에 Discriminated Union이 딱 맞는다.

```ts
type CounterAction =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset" }
  | { type: "set"; payload: number };

function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case "increment":
      return state + 1;
    case "decrement":
      return state - 1;
    case "reset":
      return 0;
    case "set":
      // action: { type: "set"; payload: number }
      return action.payload;
  }
}
```

`action.payload`는 `type === "set"`인 경우에만 존재한다. 다른 case에서 `action.payload`에 접근하려 하면 컴파일 에러가 난다.

![useReducer + Discriminated Union 흐름](/assets/typescript/discriminated-union/reducer-discriminated-union.png)

<br/>

## 실전 패턴 3 — 폼 유효성 상태

```ts
type ValidationState =
  | { valid: true; value: string }
  | { valid: false; error: string };

function validateEmail(input: string): ValidationState {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(input)) {
    return { valid: true, value: input };
  }
  return { valid: false, error: "올바른 이메일 형식이 아닙니다" };
}

const result = validateEmail(userInput);
if (result.valid) {
  // result: { valid: true; value: string }
  submitForm(result.value);
} else {
  // result: { valid: false; error: string }
  showError(result.error);
}
```

<br/>

## 실전 패턴 4 — 역할 기반 UI

```ts
type UserRole =
  | { role: "guest" }
  | { role: "member"; userId: string; name: string }
  | { role: "admin"; userId: string; name: string; permissions: string[] };

function renderNavigation(user: UserRole) {
  switch (user.role) {
    case "guest":
      return <GuestNav />;
    case "member":
      return <MemberNav name={user.name} />;
    case "admin":
      return <AdminNav name={user.name} permissions={user.permissions} />;
  }
}
```

역할마다 사용 가능한 프로퍼티가 달라진다. `guest`에서 `user.name`에 접근하면 컴파일 에러다.

<br/>

## 완전성 검사 (Exhaustive Check)

새 상태가 추가될 때 처리 누락을 컴파일 타임에 잡는다.

```ts
function assertNever(value: never): never {
  throw new Error(`처리되지 않은 케이스: ${JSON.stringify(value)}`);
}

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    default:
      return assertNever(shape); // 모든 케이스를 처리했다면 never
  }
}
```

여기서 `Shape`에 `| { kind: "triangle"; base: number; height: number }`를 추가하면, `default`에서 `shape`가 `{ kind: "triangle"; ... }`이 되고 `never`에 할당할 수 없으므로 컴파일 에러가 발생한다.

![Exhaustive Check 동작 원리](/assets/typescript/discriminated-union/exhaustive-check-du.png)

<br/>

## React 상태 관리에 적용하기

### useState와 조합

```ts
type ModalState =
  | { isOpen: false }
  | { isOpen: true; title: string; content: React.ReactNode };

function App() {
  const [modal, setModal] = useState<ModalState>({ isOpen: false });

  return (
    <>
      <button onClick={() => setModal({ isOpen: true, title: "확인", content: <p>정말요?</p> })}>
        열기
      </button>
      {modal.isOpen && (
        // modal: { isOpen: true; title: string; content: ReactNode }
        <Modal title={modal.title} content={modal.content} />
      )}
    </>
  );
}
```

`modal.isOpen`이 `true`인 블록에서 TypeScript는 `modal.title`과 `modal.content`가 존재함을 안다.

<br/>

### useReducer와 조합

```ts
type PageState =
  | { phase: "list"; items: Item[] }
  | { phase: "detail"; selectedId: string; item: Item }
  | { phase: "edit"; selectedId: string; draft: Partial<Item> };

type PageAction =
  | { type: "SELECT_ITEM"; id: string; item: Item }
  | { type: "START_EDIT" }
  | { type: "BACK_TO_LIST"; items: Item[] }
  | { type: "UPDATE_DRAFT"; field: keyof Item; value: string };

function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case "SELECT_ITEM":
      return { phase: "detail", selectedId: action.id, item: action.item };
    case "START_EDIT":
      if (state.phase !== "detail") return state;
      return { phase: "edit", selectedId: state.selectedId, draft: { ...state.item } };
    case "BACK_TO_LIST":
      return { phase: "list", items: action.items };
    case "UPDATE_DRAFT":
      if (state.phase !== "edit") return state;
      return { ...state, draft: { ...state.draft, [action.field]: action.value } };
  }
}
```

페이지의 각 단계를 명확히 모델링하고, 각 단계에서 가능한 데이터와 액션을 타입으로 제한한다.

<br/>

## Discriminated Union의 한계와 주의점

### 지나치게 세분화하지 않기

```ts
// 과한 예 — 판별자가 너무 많으면 오히려 복잡해진다
type OverEngineeredState =
  | { status: "idle" }
  | { status: "loading_users" }
  | { status: "loading_posts" }
  | { status: "loading_comments" }
  | { status: "users_success"; users: User[] }
  | { status: "posts_success"; posts: Post[] }
  | ...
```

이 경우 각각의 독립된 상태를 별도로 관리하는 게 낫다.

```ts
// 각 자원마다 독립적인 상태
type UserState = AsyncState<User[]>;
type PostState = AsyncState<Post[]>;
type CommentState = AsyncState<Comment[]>;
```

<br/>

### 중첩된 Discriminated Union

여러 상태가 독립적으로 변한다면 중첩보다 조합이 낫다.

```ts
// 나쁜 예 — 모든 조합을 일일이 나열
type State =
  | { userStatus: "loading"; postStatus: "loading" }
  | { userStatus: "loading"; postStatus: "success"; posts: Post[] }
  | { userStatus: "success"; users: User[]; postStatus: "loading" }
  | ...

// 좋은 예 — 독립적으로 관리
type AppState = {
  users: AsyncState<User[]>;
  posts: AsyncState<Post[]>;
};
```

독립적으로 변하는 상태는 독립적인 타입으로 관리한다.

<br/>

## 정리

Discriminated Union은 "가능한 상태만 표현하고 불가능한 상태는 타입으로 막는다"는 원칙의 구체적인 구현이다.

핵심을 정리하면:

| 패턴 | 판별자 | 주요 사용처 |
|------|--------|------------|
| 비동기 상태 | `status` | API 호출, 데이터 로딩 |
| 액션 | `type` | reducer, event |
| 역할 | `role` | 권한 기반 UI |
| 단계 | `phase` | 멀티스텝 폼, 페이지 흐름 |
| 유효성 | `valid` | 폼 검증 |

boolean 플래그를 여러 개 조합해서 상태를 표현하고 있다면, 그 조합들을 Discriminated Union으로 정리할 수 있는지 생각해보자.

불가능한 상태가 타입에서 사라지는 순간, 그 상태를 처리하는 방어 코드도 사라지고, 버그 가능성도 줄어든다.

TypeScript에서 가장 강력한 도구 중 하나다.
