---
title: "클로저(Closure) 완벽 이해"
date: "2025-05-10"
description: "클로저가 무엇인지, 왜 중요한지, 실제 어디서 활용되는지 예제로 설명합니다."
tags: ["javascript", "closure", "scope"]
---

## 클로저란

함수가 자신이 선언될 당시의 렉시컬 환경을 기억하는 것입니다.

```js
function makeCounter() {
  let count = 0;
  return function () {
    return ++count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

`makeCounter`가 반환한 내부 함수는 `count` 변수를 계속 참조합니다.

## 왜 동작하는가

자바스크립트에서 함수는 실행될 때 스코프 체인을 생성합니다. 내부 함수는 외부 함수의 스코프를 캡처합니다.

외부 함수가 종료되어도 내부 함수가 참조하는 한 변수는 GC되지 않습니다.

## 실전 활용

### 1. 모듈 패턴

```js
const cart = (() => {
  const items = [];

  return {
    add: (item) => items.push(item),
    remove: (id) => items.filter((i) => i.id !== id),
    getItems: () => [...items],
  };
})();
```

### 2. 부분 적용(Partial Application)

```js
function multiply(a) {
  return (b) => a * b;
}

const double = multiply(2);
const triple = multiply(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

### 3. 이벤트 핸들러에서의 캡처

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 0, 1, 2 (let은 블록 스코프라 각 이터레이션마다 새 바인딩)
```

`var`였다면 모두 3이 출력됩니다.

## 주의사항

클로저는 메모리를 점유합니다. 더 이상 필요없는 클로저가 큰 객체를 캡처하고 있다면 메모리 누수가 될 수 있습니다.
