---
title: "실행 컨텍스트에 대해"
date: "2026-06-18"
description: "실행 컨텍스트의 구조와 생성 과정, 렉시컬 환경, 스코프 체인이 만들어지는 원리, 호이스팅과 클로저를 실행 컨텍스트 관점에서 알아보자"
tags: ["javascript", "execution-context", "scope", "hoisting", "closure", "lexical-environment"]
---
<!--thumbnail: "/assets/thumbnails/execution-context.jpg" -->

자바스크립트에서 스코프, 호이스팅, 클로저는 따로따로 외우는 개념처럼 느껴진다.

하지만 이 세 가지는 모두 하나의 메커니즘에서 비롯된다. **실행 컨텍스트(Execution Context)** 다.

실행 컨텍스트를 이해하면 "왜 호이스팅이 일어나는지", "클로저가 왜 외부 변수를 기억하는지", "스코프 체인이 어떻게 만들어지는지"가 자연스럽게 연결된다.

<br/>

## 실행 컨텍스트란

자바스크립트 엔진이 **코드를 실행하기 위해 필요한 환경 정보를 담은 객체**다.

코드가 실행될 때마다 해당 코드를 위한 실행 컨텍스트가 만들어지고, 콜스택에 쌓인다.

> **콜스택과 실행 컨텍스트의 관계**
> 콜스택은 함수 호출을 추적하는 자료구조다. 정확히는 "실행 컨텍스트의 스택"이다. 함수를 호출하면 실행 컨텍스트가 생성되어 콜스택에 올라가고, 함수가 return되면 해당 컨텍스트가 제거된다.

<!-- 이미지: 실행 컨텍스트 스택 다이어그램
     콜스택 박스 안에 아래부터 Global EC, foo EC, bar EC 순으로 쌓인 구조
     함수 호출 시 새 컨텍스트가 추가되고, return 시 제거되는 흐름 화살표
     파일명: execution-context-stack.png -->
![실행 컨텍스트 스택](/assets/Javascript/execution-context-stack.png)

<br/>

실행 컨텍스트의 종류는 세 가지다.

- **전역 실행 컨텍스트 (Global EC)**: 프로그램 시작 시 한 번 생성. `window`(브라우저) 또는 `global`(Node.js)이 전역 객체가 됨
- **함수 실행 컨텍스트 (Function EC)**: 함수가 호출될 때마다 새로 생성
- **eval 실행 컨텍스트**: `eval()` 호출 시 생성. 사용 비권장

<br/>

---

## 실행 컨텍스트의 구성

실행 컨텍스트는 두 단계로 생성된다.

1. **생성 단계 (Creation Phase)**: 코드를 실행하기 전에 환경을 준비한다
2. **실행 단계 (Execution Phase)**: 코드를 한 줄씩 실행한다

각 실행 컨텍스트는 내부적으로 세 가지 컴포넌트로 이루어진다.

```
ExecutionContext {
  LexicalEnvironment,   // 현재 스코프의 변수/함수 바인딩
  VariableEnvironment,  // var 선언을 위한 환경 (초기에는 LexicalEnvironment와 동일)
  ThisBinding           // this 값
}
```

<br/>

---

## 렉시컬 환경 (Lexical Environment)

실행 컨텍스트의 핵심이다. 두 부분으로 구성된다.

```
LexicalEnvironment {
  EnvironmentRecord,  // 현재 스코프의 식별자(변수, 함수) 저장
  OuterReference      // 외부(상위) 렉시컬 환경을 가리키는 참조
}
```

<!-- 이미지: 렉시컬 환경 구조 다이어그램
     전역 렉시컬 환경 박스 (EnvironmentRecord: {x, fn}, OuterReference: null)
     함수 렉시컬 환경 박스 (EnvironmentRecord: {y}, OuterReference → 전역 렉시컬 환경)
     두 박스를 OuterReference 화살표로 연결
     파일명: lexical-environment-structure.png -->
![렉시컬 환경 구조](/assets/Javascript/lexical-environment-structure.png)

<br/>

### EnvironmentRecord

현재 스코프에 속한 **식별자 바인딩**을 저장하는 공간이다.

- `var` 선언: 초기값 `undefined`로 등록
- `let`/`const` 선언: 등록은 되지만 초기화되지 않은 상태(uninitialized)로 등록 → **TDZ(Temporal Dead Zone)**
- 함수 선언식: 함수 객체 전체가 즉시 등록

```js
function outer() {
  // 생성 단계에서 EnvironmentRecord에 등록되는 것:
  // x → undefined (var)
  // y → uninitialized (let) — TDZ
  // inner → function() {...} (함수 선언식)

  console.log(x);     // undefined (var — 호이스팅됨)
  console.log(y);     // ReferenceError (let — TDZ)
  console.log(inner); // function (함수 선언식 — 전체 호이스팅)

  var x = 1;
  let y = 2;
  function inner() {}
}
```

<br/>

### OuterReference — 스코프 체인의 실체

`OuterReference`는 **함수가 선언된 위치의 렉시컬 환경**을 가리킨다.

이것이 스코프 체인의 실체다. 변수를 현재 EnvironmentRecord에서 찾지 못하면, OuterReference가 가리키는 외부 렉시컬 환경에서 찾는다. 계속 타고 올라가 전역 렉시컬 환경까지 도달한다.

```js
const globalVar = "전역";

function outer() {
  const outerVar = "외부";

  function inner() {
    const innerVar = "내부";
    console.log(innerVar);  // inner EnvironmentRecord에서 발견
    console.log(outerVar);  // inner에 없음 → outer EC로 이동 → 발견
    console.log(globalVar); // inner, outer에 없음 → Global EC → 발견
    console.log(notExist);  // 전역까지 없음 → ReferenceError
  }

  inner();
}
```

<!-- 이미지: 스코프 체인 시각화 다이어그램
     inner EC의 LexicalEnv (innerVar) → OuterRef → outer EC의 LexicalEnv (outerVar) → OuterRef → Global EC (globalVar) → OuterRef → null
     체인 방향이 명확한 화살표, 변수 탐색 경로를 점선으로 표시
     파일명: scope-chain.png -->
![스코프 체인 탐색 경로](/assets/Javascript/scope-chain.png)

<br/>

### 렉시컬 스코프 (정적 스코프)

`OuterReference`는 **함수가 호출된 위치**가 아닌 **함수가 선언된 위치**에 따라 결정된다. 이를 **렉시컬 스코프(Lexical Scope)** 또는 정적 스코프라고 한다.

```js
const x = "전역";

function foo() {
  console.log(x);
}

function bar() {
  const x = "bar 내부";
  foo(); // foo는 bar 안에서 호출되지만
}

bar(); // "전역" — foo의 OuterReference는 선언 위치(전역)를 기준으로 설정됨
```

`foo`가 `bar` 안에서 호출됐어도, `foo`의 OuterReference는 `foo`가 **선언된** 전역 환경을 가리킨다. 따라서 `x`는 전역의 `"전역"`이 출력된다.

<br/>

---

## 호이스팅 — 실행 컨텍스트 관점

호이스팅은 "선언이 위로 끌어올려진다"고 설명되는 경우가 많다. 하지만 실제로 코드가 이동하는 것은 아니다.

**생성 단계에서 EnvironmentRecord에 식별자가 먼저 등록되기 때문에** 선언보다 앞선 줄에서 접근이 가능한 것이다.

```js
// 실제 코드 순서
console.log(a); // undefined
console.log(b); // ReferenceError
console.log(c); // function

var a = 1;
let b = 2;
function c() {}
```

생성 단계에서 각 식별자에 일어나는 일:

```
var a   → EnvironmentRecord에 { a: undefined } 등록
let b   → EnvironmentRecord에 { b: <uninitialized> } 등록 (TDZ)
function c → EnvironmentRecord에 { c: function(){} } 등록 (전체 호이스팅)
```

`var`는 초기값 `undefined`로 등록되므로 선언 전에 읽어도 `undefined`가 나온다. `let`/`const`는 등록은 되지만 초기화되지 않은 상태라 선언 전에 접근하면 TDZ 에러가 발생한다.

<br/>

### 함수 선언식 vs 함수 표현식

```js
// 함수 선언식 — 전체가 호이스팅
sayHello(); // "Hello"

function sayHello() {
  console.log("Hello");
}

// 함수 표현식 — 변수만 호이스팅 (var이면 undefined, let이면 TDZ)
sayHi(); // TypeError: sayHi is not a function

var sayHi = function () {
  console.log("Hi");
};
```

함수 선언식은 생성 단계에서 함수 객체 전체가 EnvironmentRecord에 등록된다. 함수 표현식은 변수 바인딩 규칙을 따른다.

<br/>

---

## 클로저 — 실행 컨텍스트 관점

클로저는 **함수가 자신이 선언된 렉시컬 환경을 기억하는 현상**이다.

```js
function makeCounter() {
  let count = 0;

  return function () {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

`makeCounter`가 return된 후 `makeCounter`의 실행 컨텍스트는 콜스택에서 제거된다. 하지만 `count`는 여전히 살아있다. 왜?

<!-- 이미지: 클로저와 렉시컬 환경 참조 다이어그램
     makeCounter EC가 콜스택에서 제거된 이후에도
     반환된 함수의 [[Environment]] 슬롯이 makeCounter의 LexicalEnvironment를 참조하고 있는 구조
     LexicalEnvironment의 count 변수가 GC되지 않고 유지되는 것을 표현
     파일명: closure-lexical-environment.png -->
![클로저와 렉시컬 환경 참조](/assets/Javascript/closure-lexical-environment.png)

반환된 함수는 내부적으로 **`[[Environment]]`** 라는 슬롯을 갖는다. 이 슬롯이 함수가 생성될 당시의 렉시컬 환경(`makeCounter`의 렉시컬 환경)을 참조한다.

`makeCounter`의 실행 컨텍스트가 콜스택에서 제거되어도, 반환된 함수의 `[[Environment]]`가 `makeCounter`의 렉시컬 환경을 참조하는 한, 가비지 컬렉터는 그 환경(과 안의 `count`)을 해제하지 않는다.

```
counter 함수
  └── [[Environment]] → makeCounter의 LexicalEnvironment
                          └── EnvironmentRecord: { count: 2 }
```

`counter()`를 호출할 때마다 새 실행 컨텍스트가 생성되고, `count`를 찾기 위해 OuterReference를 타고 `makeCounter`의 렉시컬 환경을 참조한다.

<br/>

### 루프에서 클로저가 의도와 다르게 동작하는 이유

```js
// 문제 코드
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 출력: 3, 3, 3 (0, 1, 2가 아님)
```

`var`는 블록 스코프가 없어 루프 안의 `i`가 전부 같은 전역 렉시컬 환경의 `i`를 공유한다. setTimeout 콜백들의 `[[Environment]]`가 모두 같은 `i`를 가리키므로, 콜백이 실행되는 시점(루프 종료 후)의 `i` 값인 3이 출력된다.

```js
// 해결 1: let 사용 — 매 이터레이션마다 새로운 블록 스코프 렉시컬 환경 생성
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 출력: 0, 1, 2

// 해결 2: IIFE로 새 렉시컬 환경 만들기 (let 이전의 방법)
for (var i = 0; i < 3; i++) {
  ((j) => {
    setTimeout(() => console.log(j), 100);
  })(i);
}
// 출력: 0, 1, 2
```

`let`은 루프 이터레이션마다 **새로운 렉시컬 환경**을 만든다. 각 콜백의 `[[Environment]]`가 각자의 `i`를 가진 독립된 환경을 참조하게 된다.

<br/>

---

## this 바인딩

실행 컨텍스트의 세 번째 컴포넌트인 `ThisBinding`은 실행 컨텍스트 **생성 시점**에 결정된다.

`this`가 무엇을 가리키는지는 함수가 **어떻게 호출됐는지**에 따라 달라진다.

```js
const obj = {
  name: "Alice",

  // 일반 함수 — 호출 방식에 따라 this 결정
  greet() {
    console.log(this.name); // obj.greet()로 호출 → this = obj → "Alice"
  },

  // 화살표 함수 — 선언 시점의 외부 this를 캡처 (ThisBinding 없음)
  greetArrow: () => {
    console.log(this.name); // 전역 this → undefined (strict mode)
  },
};

obj.greet();      // "Alice"
obj.greetArrow(); // undefined
```

화살표 함수는 자체적인 `ThisBinding`을 갖지 않는다. 선언 위치의 외부 실행 컨텍스트에서 `this`를 찾는다. 이는 `[[Environment]]`로 외부 렉시컬 환경을 참조하는 것과 같은 원리다.

<br/>

---

## 전체 흐름 정리

```js
const x = 1;

function outer() {
  const y = 2;

  function inner() {
    const z = 3;
    console.log(x, y, z); // 1, 2, 3
  }

  inner();
}

outer();
```

실행 순서:

```
① 전역 EC 생성
   - 생성 단계: EnvironmentRecord = { x: undefined, outer: fn }
   - 실행 단계: x = 1, outer 함수 선언 완료

② outer() 호출 → outer EC 생성
   - 생성 단계: EnvironmentRecord = { y: undefined, inner: fn }
                OuterReference → 전역 LexicalEnvironment
   - 실행 단계: y = 2, inner 함수 선언 완료

③ inner() 호출 → inner EC 생성
   - 생성 단계: EnvironmentRecord = { z: undefined }
                OuterReference → outer LexicalEnvironment
   - 실행 단계: z = 3
     console.log(x, y, z)
       z → inner EnvironmentRecord에서 발견 (3)
       y → inner에 없음 → outer EnvironmentRecord에서 발견 (2)
       x → inner, outer에 없음 → 전역 EnvironmentRecord에서 발견 (1)

④ inner return → inner EC 제거
⑤ outer return → outer EC 제거
⑥ 프로그램 종료 → 전역 EC 제거
```

실행 컨텍스트, 렉시컬 환경, 스코프 체인, 호이스팅, 클로저는 따로 존재하는 개념이 아니다. 모두 "엔진이 코드를 실행하기 위해 환경을 준비하고 탐색하는 과정"의 서로 다른 측면이다.
