---
title: "이벤트 루프와 비동기 처리"
date: "2025-04-15"
description: "Call Stack, Web APIs, Task Queue, Microtask Queue의 동작 방식을 이해합니다."
tags: ["javascript", "event-loop", "async"]
---

## 자바스크립트는 싱글 스레드

자바스크립트는 싱글 스레드 언어입니다. 한 번에 하나의 작업만 처리합니다.

그렇다면 setTimeout, fetch 같은 비동기 작업은 어떻게 동작할까요?

## 구성 요소

```
Call Stack       Web APIs         Task Queue
──────────       ────────         ──────────
main()           setTimeout  →    callback
fetch()          fetch       →    callback
```

### Call Stack

함수 호출 시 스택에 쌓이고, 반환 시 제거됩니다.

### Web APIs

브라우저(또는 Node.js)가 제공하는 비동기 API입니다. 타이머, HTTP 요청, DOM 이벤트 등이 여기서 처리됩니다.

### Task Queue (Macrotask)

`setTimeout`, `setInterval`, `I/O` 콜백이 여기로 옵니다.

### Microtask Queue

`Promise.then`, `queueMicrotask`, `MutationObserver`가 여기로 옵니다.

**Microtask는 Macrotask보다 우선 처리됩니다.**

## 실행 순서 예시

```js
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

console.log('4');
```

출력 순서: `1` → `4` → `3` → `2`

- 동기 코드 먼저 (`1`, `4`)
- Microtask Queue 처리 (`3`)
- Task Queue 처리 (`2`)

## async/await

`async/await`은 Promise를 기반으로 합니다. `await` 이후 코드는 Microtask Queue로 들어갑니다.

```js
async function main() {
  console.log('A');
  await Promise.resolve();
  console.log('B'); // microtask로 예약됨
}

main();
console.log('C');

// A → C → B
```
