---
title: "자바스크립트 Scope와 Closure"
date: "2025-12-09"
description: "자바스크립트의 스코프 체인, 렉시컬 스코프, 클로저 개념과 실제 활용 방식을 정리한 글"
tags: ["javascript", "scope", "closure", "lexical-scope", "execution-context"]
thumbnail: "https://media.calibraint.com/calibraint-wordpress/wp-content/uploads/2021/07/11105314/Closures-In-JavaScript-Calibraint.webp"
---

자바스크립트에서 변수가 어디서 접근 가능한지, 그리고 함수가 종료된 뒤에도 변수를 기억하는 방법이 무엇인지 — 이 두 가지를 이해하는 핵심 개념이 **Scope**와 **Closure**다.

<br/>

## Scope란

```js
function add(a, b) {
  return a + b;
}

console.log(a, b); // ReferenceError
```

**스코프(Scope)** 는 변수가 유효한 범위를 의미한다.

더 정확히 말하면, 변수·함수·클래스 같은 **식별자가 선언된 위치에 따라 다른 코드에서 참조될 수 있는지 결정되는 규칙**이다.

스코프는 크게 **전역 스코프**와 **지역 스코프**로 구분된다.

<br/>

## 스코프 체인 (Scope Chain)

![스코프 체인 구조](/assets/Javascript/scope-chain.png)

함수는 중첩될 수 있고, 중첩될수록 각 함수의 지역 스코프도 중첩된다.

이렇게 스코프가 계층적으로 연결된 구조를 **스코프 체인**이라고 한다.

```js
const globalVar = "I am global!";

function outerFunction() {
  const outerVar = "I am outer!";

  function innerFunction() {
    const innerVar = "I am inner!";
    const globalVar = "I am inner global!"; // 전역 변수를 가림 (shadowing)
    console.log(innerVar);   // "I am inner!"
    console.log(globalVar);  // "I am inner global!" (가장 가까운 스코프)
    console.log(outerVar);   // "I am outer!" (상위 스코프에서 참조)
  }

  innerFunction();
}
```

자바스크립트 엔진은 변수를 참조할 때 **현재 스코프부터 상위 스코프 방향으로** 체인을 따라 탐색한다.

전역 스코프까지 올라가도 찾지 못하면 `ReferenceError`를 발생시킨다.

> 반대 방향(하위 스코프)으로는 참조할 수 없다. 탐색은 항상 안에서 바깥 방향이다.

<br/>

## 블록 레벨 스코프 vs 함수 레벨 스코프

스코프는 어떤 블록이 새로운 범위를 만드는지에 따라 두 종류로 나뉜다.

| 구분 | 설명 | 해당 키워드 |
|---|---|---|
| **함수 레벨 스코프** | 함수 블록만 스코프를 만듦 | `var` |
| **블록 레벨 스코프** | `{}` 블록 모두 스코프를 만듦 | `let`, `const` |

```js
// var — 함수 레벨 스코프
if (true) {
  var a = 1;
}
console.log(a); // 1 (if 블록을 벗어나도 접근 가능)

// let — 블록 레벨 스코프
if (true) {
  let b = 2;
}
console.log(b); // ReferenceError (블록 밖에서 접근 불가)
```

<br/>

## 렉시컬 스코프 (Lexical Scope)

함수의 상위 스코프가 결정되는 기준은 두 가지다.

- **동적 스코프** — 함수가 **호출**되는 시점에 상위 스코프 결정
- **정적 스코프 (렉시컬 스코프)** — 함수가 **정의**되는 시점에 상위 스코프 결정

자바스크립트는 **렉시컬 스코프**를 따른다.

```js
var x = 1;

function foo() {
  var x = 10;
  bar(); // bar를 호출하지만...
}

function bar() {
  console.log(x);
}

foo(); // 1
bar(); // 1
```

`bar`는 전역에서 정의됐기 때문에 상위 스코프는 **전역 스코프**다. `foo` 안에서 호출되더라도 `foo`의 `x = 10`은 참조하지 않는다.

"어디서 호출했는지"가 아니라 **"어디서 정의됐는지"** 가 기준이다.

<br/>

## Closure란

렉시컬 스코프를 이해하면 클로저도 자연스럽게 따라온다.

```js
function outer() {
  const name = 'I have a Name';

  function inner() {
    console.log(name);
  }

  return inner;
}

const test = outer();
test(); // 'I have a Name'
```

`outer` 함수는 `inner`를 반환하면서 실행 컨텍스트 스택에서 제거된다. 생명 주기가 끝난 것이다.

그런데 `test()`를 호출하면 `outer`의 지역 변수 `name`이 여전히 출력된다.

![클로저와 렉시컬 환경](/assets/Javascript/closure-lexical-env.png)

이게 가능한 이유는, `inner` 함수가 **내부 슬롯(`[[Environment]]`)에 자신이 정의된 시점의 렉시컬 환경(outer의 스코프)을 참조**하고 있기 때문이다.

`outer`의 실행 컨텍스트는 스택에서 제거됐지만, `inner`가 렉시컬 환경을 참조하는 한 가비지 컬렉터가 메모리를 회수하지 않는다.

**한 중첩 함수가 상위 스코프의 식별자를 참조하고, 외부 함수보다 더 오래 살아있다면 그 중첩 함수가 클로저다.**

<br/>

## 클로저의 실용적 활용

### 1. 상태 은닉

외부에서 직접 접근할 수 없는 private 변수를 구현할 수 있다.

```js
function makeCounter() {
  let count = 0; // 외부에서 직접 접근 불가

  return {
    increment() { count++; },
    decrement() { count--; },
    getCount() { return count; },
  };
}

const counter = makeCounter();
counter.increment();
counter.increment();
console.log(counter.getCount()); // 2
console.log(counter.count);      // undefined (직접 접근 불가)
```

<br/>

### 2. 함수 팩토리

같은 로직이지만 다른 설정을 가진 함수를 동적으로 만들 수 있다.

```js
function multiply(multiplier) {
  return (num) => num * multiplier;
}

const double = multiply(2);
const triple = multiply(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

<br/>

### 3. React useState

React의 `useState`도 클로저로 구현되어 있다. 컴포넌트가 리렌더링되어도 이전 상태값을 기억할 수 있는 이유가 클로저 덕분이다.

```js
// 단순화한 useState 구현
function useState(initialValue) {
  let state = initialValue;

  function getState() { return state; }
  function setState(newValue) { state = newValue; }

  return [getState, setState];
}
```

<br/>

## 클로저 사용 시 주의점

클로저는 참조하는 렉시컬 환경을 메모리에 유지시킨다. 클로저가 많아지거나 무거운 데이터를 참조하면 **메모리 누수**로 이어질 수 있다.

```js
// 주의 — 이벤트 리스너에 클로저가 쌓이는 경우
function addHandler() {
  const heavyData = new Array(10000).fill('data');

  document.addEventListener('click', () => {
    console.log(heavyData.length); // heavyData를 계속 참조
  });
}
```

더 이상 필요하지 않은 클로저는 `null`로 참조를 해제하거나, 이벤트 리스너를 `removeEventListener`로 정리해야 한다.

<br/>

## 정리

| 개념 | 핵심 |
|---|---|
| **스코프** | 식별자가 유효한 범위. 안에서 바깥 방향으로만 참조 가능 |
| **스코프 체인** | 중첩 스코프가 계층적으로 연결된 구조 |
| **렉시컬 스코프** | 호출 위치가 아닌 정의 위치 기준으로 상위 스코프 결정 |
| **클로저** | 외부 함수의 렉시컬 환경을 기억하는 내부 함수 |

<br/>

## 참고

<bookmark url="https://www.youtube.com/watch?v=PVYjfrgZhtU"></bookmark>

<bookmark url="https://www.youtube.com/watch?v=5KbLzwf9xC0"></bookmark>
