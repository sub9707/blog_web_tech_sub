---
title: "Promise 심화 — 상태, 체이닝, 병렬 처리, async/await 내부 동작"
date: "2026-06-18"
description: "Promise의 상태 전이부터 all/allSettled/race/any 차이, async/await이 내부에서 어떻게 동작하는지, 에러 핸들링 패턴까지 정리함"
tags: ["javascript", "promise", "async", "await", "microtask", "error-handling"]
---
<!--thumbnail: "/assets/thumbnails/promise-deep-dive.jpg"-->

자바스크립트 비동기의 핵심은 Promise다.

`then`, `catch`, `async/await` 문법은 익숙해도, "Promise가 내부적으로 어떤 상태를 갖는지", "`Promise.all`과 `Promise.allSettled`는 어떻게 다른지", "`async/await`이 실제로 무엇인지"는 흐릿한 경우가 많다.

그 흐릿한 부분을 파고들어보자.

<br/>

## Promise의 세 가지 상태

Promise는 생성 시점부터 항상 세 상태 중 하나에 있다.

<!-- 이미지: Promise 상태 전이 다이어그램
     중앙에 Pending 박스, 왼쪽 화살표로 Fulfilled, 오른쪽 화살표로 Rejected
     Fulfilled → then 콜백, Rejected → catch 콜백 연결
     상태 전이는 단방향(되돌릴 수 없음) 강조
     파일명: promise-states.png -->
![Promise 상태 전이](/assets/Javascript/promise-states.png)

| 상태 | 의미 | 전이 가능 방향 |
|---|---|---|
| **Pending** | 초기 상태. 아직 완료/실패 결정 전 | Fulfilled 또는 Rejected |
| **Fulfilled** | 성공적으로 완료됨 | 전이 불가 (settled) |
| **Rejected** | 실패 | 전이 불가 (settled) |

한 번 settled(Fulfilled 또는 Rejected) 상태가 되면 다시 Pending으로 되돌아갈 수 없다. 즉 Promise는 **단 한 번만 결정**된다.

```js
const p = new Promise((resolve, reject) => {
  resolve("성공");
  reject("실패"); // 이미 resolve됐으므로 무시됨
});

p.then(console.log); // "성공"
```

<br/>

### executor 함수

`new Promise(executor)`에서 executor는 **동기적으로 즉시 실행**된다.

```js
console.log("1");

const p = new Promise((resolve) => {
  console.log("2"); // executor는 동기 실행
  resolve("done");
});

p.then(() => console.log("3")); // then 콜백은 마이크로태스크 큐에 등록

console.log("4");

// 출력: 1 → 2 → 4 → 3
```

`resolve`/`reject` 호출 자체는 동기지만, `.then`/`.catch` 콜백은 **항상 마이크로태스크 큐**를 거쳐 실행된다. 현재 콜스택이 비워진 뒤에 실행된다는 뜻이다.

> **마이크로태스크 큐란?**
> 이벤트 루프에서 Callback Queue(태스크 큐)보다 우선순위가 높은 큐다. Promise의 `.then`/`.catch`, `queueMicrotask`, `MutationObserver`가 여기에 쌓인다. 콜스택이 비면 태스크 큐보다 마이크로태스크 큐를 먼저 비운다. 자세한 동작은 [이벤트 루프 포스팅](/posts/Javascript/자바스크립트-이벤트-루프-동작-방식)에서 다뤘다.

<br/>

---

## Promise 체이닝

`.then`은 항상 **새로운 Promise를 반환**한다. 이 덕분에 체이닝이 가능하다.

```js
fetch("/api/user")
  .then((res) => res.json())       // Promise 반환
  .then((user) => fetchPosts(user.id)) // Promise 반환
  .then((posts) => console.log(posts))
  .catch((err) => console.error(err));
```

<!-- 이미지: Promise 체이닝 흐름 다이어그램
     각 .then이 새로운 Promise를 반환하고 다음 .then으로 연결되는 수직 흐름
     중간에 에러 발생 시 .catch로 점프하는 화살표 표시
     파일명: promise-chaining.png -->
![Promise 체이닝 흐름](/assets/Javascript/promise-chaining.png)

<br/>

### then의 반환값 규칙

`.then` 콜백의 반환값에 따라 다음 Promise의 상태가 결정된다.

```js
Promise.resolve(1)
  .then((v) => v + 1)          // 일반 값 반환 → 그 값으로 fulfilled
  .then((v) => Promise.resolve(v * 2)) // Promise 반환 → 그 Promise 따라감
  .then((v) => { throw new Error("!") }) // throw → rejected
  .catch((e) => e.message)     // "!" — catch도 값을 반환하면 fulfilled로 복구
  .then(console.log);          // "!"
```

`.catch`도 내부적으로는 `.then(undefined, onRejected)` 의 shorthand다. `.catch` 이후에도 `.then`을 연결할 수 있고, 에러를 처리했다면 다시 fulfilled 상태로 체인이 이어진다.

<br/>

### 잘못된 체이닝 패턴

```js
// 나쁨 — 중첩 Promise (콜백 지옥의 Promise 버전)
fetch("/api/user").then((res) => {
  res.json().then((user) => {         // then 안에서 then
    fetchPosts(user.id).then((posts) => {
      console.log(posts);
    });
  });
});

// 좋음 — 체인을 평탄하게 유지
fetch("/api/user")
  .then((res) => res.json())
  .then((user) => fetchPosts(user.id))
  .then(console.log);
```

`.then` 안에서 새로운 Promise를 `return` 하지 않으면 체인이 끊긴다. 내부 Promise의 에러가 외부 `.catch`에 잡히지 않는다.

<br/>

---

## Promise 정적 메서드 4가지

### Promise.all

**모두 성공**해야 resolved. **하나라도 실패**하면 즉시 rejected.

```js
const [user, posts, comments] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id),
]);
```

<!-- 이미지: Promise.all / allSettled / race / any 비교 다이어그램
     4개의 가로 타임라인. 각 라인에 P1(성공), P2(성공), P3(실패) 세 Promise
     all: P3 실패 시 전체 reject
     allSettled: 전부 완료 후 결과 배열
     race: 가장 먼저 완료된 것 하나만 반환
     any: 첫 번째 성공한 것 반환 (모두 실패 시 AggregateError)
     파일명: promise-static-methods.png -->
![Promise 정적 메서드 비교](/assets/Javascript/promise-static-methods.png)

```js
Promise.all([
  Promise.resolve(1),
  Promise.reject("에러"),
  Promise.resolve(3),
]).catch(console.error); // "에러" — 3번째 결과는 무시됨
```

서로 독립적인 병렬 요청을 모두 기다릴 때 쓴다. 하나라도 실패하면 전체를 실패로 처리하는 게 맞는 경우에 적합하다.

<br/>

### Promise.allSettled

**모두 완료될 때까지** 기다린다. 성공이든 실패든 상관없이 전부 기다린다.

```js
const results = await Promise.allSettled([
  fetchUser(1),
  fetchUser(2), // 이 요청이 실패해도
  fetchUser(3),
]);

results.forEach((result) => {
  if (result.status === "fulfilled") {
    console.log(result.value);
  } else {
    console.error(result.reason);
  }
});
```

반환값은 각 Promise의 결과를 담은 객체 배열이다.

```js
// 반환 형태
[
  { status: "fulfilled", value: user1 },
  { status: "rejected", reason: Error },
  { status: "fulfilled", value: user3 },
]
```

일부 실패해도 나머지 결과를 활용해야 할 때 쓴다. 예: 여러 서드파티 API를 동시에 호출하고 성공한 것만 렌더링.

<br/>

### Promise.race

**가장 먼저 settled된 Promise** 하나의 결과를 따른다. 성공이든 실패든 가장 빠른 것이 이긴다.

```js
const result = await Promise.race([
  fetch("/api/data"),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 5000)
  ),
]);
```

타임아웃 구현에 주로 쓴다. 5초 안에 응답이 없으면 타임아웃 에러를 내는 패턴이다.

<br/>

### Promise.any

**가장 먼저 fulfilled된 Promise** 하나를 반환한다. `race`와 달리 rejected는 무시하고 첫 성공을 기다린다.

```js
const fastest = await Promise.any([
  fetchFromServer1(),
  fetchFromServer2(),
  fetchFromServer3(),
]);
```

**모두 실패**하면 `AggregateError`가 던져진다.

```js
Promise.any([
  Promise.reject("A 실패"),
  Promise.reject("B 실패"),
]).catch((err) => {
  console.log(err instanceof AggregateError); // true
  console.log(err.errors); // ["A 실패", "B 실패"]
});
```

<br/>

### 한눈에 비교

| 메서드 | 언제 resolved | 언제 rejected |
|---|---|---|
| `all` | 전부 성공 | 하나라도 실패 |
| `allSettled` | 전부 완료(성공/실패 무관) | 절대 안 됨 |
| `race` | 가장 빠른 것이 성공 | 가장 빠른 것이 실패 |
| `any` | 가장 빠른 성공 | 전부 실패 |

<br/>

---

## async/await 내부 동작

`async/await`은 새로운 비동기 메커니즘이 아니다. **Promise 위에 얹힌 문법적 설탕(Syntactic Sugar)** 이다.

### async 함수는 항상 Promise를 반환한다

```js
async function getData() {
  return 42;
}

getData().then(console.log); // 42
// 위는 아래와 동일
function getData() {
  return Promise.resolve(42);
}
```

반환값이 Promise가 아니어도 자동으로 `Promise.resolve()`로 감싸진다.

<br/>

### await은 Promise가 settled될 때까지 실행을 일시 정지한다

```js
async function fetchUser() {
  const res = await fetch("/api/user"); // 여기서 일시 정지
  const user = await res.json();        // 이전 await 완료 후 재개
  return user;
}
```

`await` 표현식을 만나면 해당 Promise가 settled될 때까지 함수 실행이 **일시 중단**된다. 이때 메인 스레드를 블로킹하지 않는다 — 제어권을 호출자에게 돌려주고, Promise가 완료되면 마이크로태스크 큐를 통해 실행이 재개된다.

<br/>

### 제너레이터와의 관계

`async/await`은 개념적으로 **제너레이터 + Promise**의 조합이다.

```js
// async/await 버전
async function loadUser(id) {
  const res = await fetch(`/api/users/${id}`);
  const user = await res.json();
  return user;
}

// 제너레이터로 표현하면 (개념적 동치)
function* loadUser(id) {
  const res = yield fetch(`/api/users/${id}`);
  const user = yield res.json();
  return user;
}
```

> **제너레이터란?**
> `function*`으로 선언하는 함수. `yield` 키워드에서 실행을 일시 중단하고, 외부에서 `.next()`를 호출할 때마다 다음 `yield`까지 실행한다. 함수 실행을 중간에 멈췄다가 재개할 수 있다는 점이 `await`의 동작 원리와 같다.

`async` 함수 내부에서 `await`을 만날 때마다 마치 `yield`처럼 실행이 중단되고, Promise가 완료되면 중단된 지점부터 재개된다.

<br/>

### 트랜스파일 결과로 확인하기

Babel이 `async/await`을 ES5로 트랜스파일하면 실제로 제너레이터(`_regenerator`) 기반 코드가 생성된다. 이는 `async/await`이 제너레이터의 추상화임을 보여주는 근거다.

<br/>

---

## 에러 핸들링

### try/catch vs .catch

```js
// async/await — try/catch
async function loadData() {
  try {
    const res = await fetch("/api/data");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("요청 실패:", err);
    return null;
  }
}

// Promise 체인 — .catch
fetch("/api/data")
  .then((res) => res.json())
  .then((data) => data)
  .catch((err) => {
    console.error("요청 실패:", err);
    return null;
  });
```

둘은 기능적으로 동일하다. `async/await`에서 `try/catch`는 동기 코드처럼 에러를 잡기 때문에 가독성이 높다.

<br/>

### 주의: await 없이 throw하면 잡히지 않는다

```js
async function bad() {
  // await 없이 Promise를 반환하면서 내부 에러는 잡히지 않음
  try {
    return fetch("/fail"); // await이 없으므로 Promise 자체가 반환됨
  } catch (err) {
    console.error(err); // 실행되지 않음
  }
}

// 올바른 방법
async function good() {
  try {
    return await fetch("/fail"); // await이 있어야 catch가 동작
  } catch (err) {
    console.error(err);
  }
}
```

`return`과 `return await`의 차이는 에러 처리에서 드러난다. `try/catch` 안에서는 `return await`을 써야 에러가 잡힌다.

<br/>

### Promise의 unhandled rejection

`.catch`나 `try/catch`로 처리되지 않은 rejected Promise는 `unhandledrejection` 이벤트를 발생시킨다.

```js
window.addEventListener("unhandledrejection", (event) => {
  console.error("처리되지 않은 Promise 에러:", event.reason);
  event.preventDefault(); // 기본 콘솔 에러 출력 방지
});
```

프로덕션에서는 이 이벤트를 잡아 에러 모니터링 서비스로 전송하는 전역 핸들러를 두는 것이 좋다.

<br/>

### 병렬 요청의 에러 처리

```js
// 나쁨 — 에러 발생 시 어느 요청이 실패했는지 알기 어렵다
async function loadAll(ids) {
  try {
    return await Promise.all(ids.map(fetchUser));
  } catch (err) {
    console.error(err);
  }
}

// 좋음 — allSettled로 각 요청 결과를 개별 처리
async function loadAll(ids) {
  const results = await Promise.allSettled(ids.map(fetchUser));
  const users = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => r.reason);

  if (errors.length > 0) console.error("일부 요청 실패:", errors);
  return users;
}
```

<br/>

---

## 안티패턴

### Promise constructor anti-pattern

이미 Promise를 반환하는 함수를 불필요하게 `new Promise`로 감싸는 패턴이다.

```js
// 나쁨
function fetchData() {
  return new Promise((resolve, reject) => {
    fetch("/api/data")
      .then((res) => resolve(res.json()))
      .catch(reject);
  });
}

// 좋음 — fetch 자체가 Promise를 반환하므로 그냥 쓰면 된다
function fetchData() {
  return fetch("/api/data").then((res) => res.json());
}
```

### 순차 실행이 필요 없는데 await을 직렬로 쓰는 패턴

```js
// 나쁨 — user와 posts는 독립적인데 순차 실행 (총 시간 = A + B)
async function load(id) {
  const user = await fetchUser(id);
  const posts = await fetchPosts(id);
  return { user, posts };
}

// 좋음 — 병렬 실행 (총 시간 = max(A, B))
async function load(id) {
  const [user, posts] = await Promise.all([
    fetchUser(id),
    fetchPosts(id),
  ]);
  return { user, posts };
}
```

두 요청이 서로 의존하지 않는다면 `Promise.all`로 병렬 실행한다.

<br/>

---

## 정리

```
Promise 상태: Pending → Fulfilled / Rejected (단방향, 한 번만)

.then 콜백: 마이크로태스크 큐를 통해 실행 (현재 콜스택 비워진 뒤)

병렬 처리:
  all       — 전부 성공 필요 (하나 실패 → 전체 실패)
  allSettled — 전부 기다림, 개별 결과 확인
  race      — 가장 빠른 것 (성공/실패 무관)
  any       — 첫 번째 성공 (전부 실패 → AggregateError)

async/await: Promise + Generator의 syntactic sugar
  await = 마이크로태스크 큐를 통한 일시 정지 + 재개
  try/catch 내부에서는 return await 필요
```
