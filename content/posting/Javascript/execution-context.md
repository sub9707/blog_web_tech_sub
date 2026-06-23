---
title: "실행 컨텍스트에 대해 알아보자"
date: "2026-06-18"
description: "실행 컨텍스트의 구조와 생성 과정, 렉시컬 환경, 스코프 체인이 만들어지는 원리, 호이스팅과 클로저를 실행 컨텍스트 관점에서 알아보자"
tags: ["javascript", "execution-context", "scope", "hoisting", "closure", "lexical-environment"]
---
<!--thumbnail: "/assets/thumbnails/execution-context.jpg" -->

자바스크립트에서 스코프, 호이스팅, 클로저만 들으면 용어의 개념만 이해한채로 구분짓고 익히기 쉽다.

하지만 이 세 가지는 모두 하나의 개념에서 비롯된다. 

바로, **실행 컨텍스트(Execution Context)** 다.

실행 컨텍스트는 추상적으로 다가올 수 있기에, 원리를 익히는 것이 중요하다.

이를 이해하면 개발하면서 내 코드 속에서

"왜 호이스팅이 일어나는지"

"클로저가 왜 외부 변수를 기억하는지"

"스코프 체인이 어떻게 만들어지는지"가 자연스럽게 이해할 수 있다.

<br/>

## 실행 컨텍스트란

실행 컨텍스트에 대해 주로 정의를 내리는 방식은,

자바스크립트 엔진이 `코드를 실행하기 위해 필요한 환경 정보를 담은 객체` 라고들 설명한다.

문장을 놓고 봤을 땐, 추상적이고 너무 투박한 설명이다.

<br/>

쉽게 설명하면, `함수가 '실행'될 때 엔진이 만드는 임시 공간`이다.

코드를 실행하기 전, 엔진은 먼저 세 가지를 챙긴다.

- 이 안에 어떤 변수와 함수가 있는가
- 가까운 위치에서 변수를 못 찾으면 어디서 찾을 것인가
- 지금 `this`는 무엇인가

이 세 가지를 담아둔 정보 덩어리가 실행 컨텍스트이고, 함수를 호출할 때마다 하나씩 만들어진다.

<br/>

자바스크립트에서는 코드가 실행(함수가 실행)될 때마다 해당 코드를 위한 실행 컨텍스트가 만들어지고, 콜스택에 쌓인다.

함수가 종료되면 실행 컨텍스트가 스택에서 제거되는 방식이다.


![실행 컨텍스트 스택](/assets/Javascript/execution-context-stack.png)

<br/>

실행 컨텍스트의 종류는 총 세 가지이다.

- **전역 실행 컨텍스트 (Global EC)**: 프로그램 시작 시(스크립트 로드 시) 최초 한 번 생성된다. `window`(브라우저) 또는 `global`(Node.js)이 전역 객체가 된다. 스택의 제일 바닥에 위치하게 된다.
- **함수 실행 컨텍스트 (Function EC)**: 함수가 호출될 때마다 새로 생성된다.
- **eval 실행 컨텍스트**: `eval()` 호출 시 생성. 실무에서는 보안 상의 이유로 금기시되는 존재다..


<br/>



## 실행 컨텍스트의 구성

우선 자바스크립트가 위쪽에서부터 하나씩 코드가 수행된다고 생각하기 쉬울 것이다.

그러나 실제로 우리가 쓴 스크립트는 총 두번의 과정을 거친다.

1. **생성 단계 (Creation Phase)**: 코드를 실행하기 전에 전체를 쭉 훑어 환경을 준비한다
2. **실행 단계 (Execution Phase)**: 코드를 한 줄씩 실행한다

각 실행 컨텍스트는 내부적으로 세 가지 컴포넌트로 이루어진다.

```
ExecutionContext {
  LexicalEnvironment,   // 현재 스코프의 변수/함수 바인딩
  VariableEnvironment,  // var 선언을 위한 환경 (초기에는 LexicalEnvironment와 동일)
  ThisBinding           // this 값
}
```

일단 무작정 외우기보단, 실행 컨텍스트라는 것이 이 세가지로 이루어져있다는 것에 주목하자.

<br/>

### VariableEnvironment vs LexicalEnvironment

초기에는 `VariableEnvironment`와 `LexicalEnvironment`가 동일한 내용을 가진다. 

코드와 함수의 실행이 진행되면서 `LexicalEnvironment`는 그 값과 상태가 업데이트되지만, `VariableEnvironment`는 생성 시점의 초기 상태를 그대로 유지한다.

실질적인 차이는 `var`에서 드러난다. 

`var` 선언은 `VariableEnvironment`에 등록된다. 

블록 내부에서 `var`를 선언해도 함수 스코프 전체에서 유효한 이유가 여기 있다.

생성 단계에서 `var`는 `VariableEnvironment`에, `let`/`const`는 `LexicalEnvironment`에 각각 등록된다.

```js
function test() {
  if (true) {
    var x = 1; // VariableEnvironment에 등록 → 함수 스코프
    let y = 2; // LexicalEnvironment에 등록 → 블록 스코프
  }
  console.log(x); // 1 (var는 블록을 벗어나도 살아있음)
  console.log(y); // ReferenceError (let은 블록 스코프)
}
```

`let`/`const`는 `LexicalEnvironment`에만 등록되고, 블록이 끝나면 해당 블록의 `LexicalEnvironment`가 스코프에서 벗어난다.

<br/>


> **var를 안쓰는데 요즘은?**
>
> ES2022 이후 ECMAScript 명세에서 `VariableEnvironment`는 `LexicalEnvironment`로 통합되는 방향으로 정리됐다. 최신 명세 문서에서는 두 환경을 별도 필드로 구분하지 않고, `var` 스코프 처리를 `LexicalEnvironment` 안에서 설명한다. 어차피 현대 JavaScript에서는 `var` 자체를 거의 쓰지 않으므로, 실무 관점에서는 `LexicalEnvironment`만 이해해도 충분하다.

<br/>



## 렉시컬 환경 (Lexical Environment)

실행 컨텍스트의 핵심이다. 두 부분으로 구성된다.

```
LexicalEnvironment {
  EnvironmentRecord,  // 현재 스코프의 식별자(변수, 함수) 저장
  OuterReference      // 외부(상위, 스택으로 보면 아래) 렉시컬 환경을 가리키는 참조
}
```

![렉시컬 환경 구조](/assets/Javascript/lexical-environment-structure.png)

<br/>

### EnvironmentRecord

현재 스코프 안에서 선언된 **변수와 함수를 이름과 값의 쌍으로 저장**하는 공간이다.

- `var` 선언: 초기값 `undefined`로 등록
- `let`/`const` 선언: 등록은 되지만 초기화되지 않은 상태(uninitialized)로 등록 → **TDZ(Temporal Dead Zone)**(암만 참조해도 Reference Error 발생함)
- 함수 선언식: 함수 객체 전체가 즉시 등록
- 함수 표현식: 변수 선언 규칙을 따름 (`var`면 `undefined`, `let`/`const`면 TDZ)

```js
function outer() {
  // 생성 단계에서 EnvironmentRecord에 등록되는 것:
  // x       → undefined       (var)
  // y       → uninitialized   (let) — TDZ
  // inner   → function() {...} (함수 선언식 — 전체 등록)
  // exprVar → undefined       (var 함수 표현식)
  // exprLet → uninitialized   (let 함수 표현식) — TDZ

  console.log(x);       // undefined      (var — 호이스팅)
  console.log(y);       // ReferenceError (let — TDZ)
  console.log(inner);   // function       (함수 선언식 — 전체 호이스팅)
  console.log(exprVar); // undefined      (var — 변수만 호이스팅)
  console.log(exprLet); // ReferenceError (let — TDZ)

  var x = 1;
  let y = 2;
  function inner() {}
  var exprVar = function () {}; // 변수(var)만 호이스팅 → 함수는 실행 단계에서 할당
  let exprLet = function () {}; // TDZ → 선언 전 접근 불가
}
```

<br/>

### OuterReference — 스코프 체인의 실체

`OuterReference`는 **함수가 선언된 위치의 렉시컬 환경**을 가리킨다.

이것이 스코프 체인이 돌아갈 수 있는 수단이다.

변수를 현재 EnvironmentRecord에서 찾지 못하면, OuterReference가 가리키는 외부 렉시컬 환경에서 찾는다. 

계속 타고 올라가 전역 렉시컬 환경까지 도달하다가 없으면 Reference Error를 뱉는다.

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
![스코프 체인 탐색 경로](/assets/Javascript/scope-chain.png)

<br/>

### 렉시컬 스코프 (정적 스코프)

`OuterReference`는 **함수가 '호출'된 위치**가 아닌, **함수가 '선언'된 위치**에 따라 결정된다. 

이를 **렉시컬 스코프(Lexical Scope)** 또는 정적 스코프라고 한다.

"정적"이라는 말이 붙은 이유는, 스코프가 **코드를 작성하는 시점에 이미 확정**되기 때문이다. 

함수를 어디서 호출하든 상관없이, 함수를 어디에 적었느냐만 보면 된다. 

런타임에 바뀌지 않으니 "정적"이다.

아래 예제를 보면 "이거 당연한게 아닌가" 라는 생각이 들 정도로 우리에게 당연한 흐름처럼 보이며, 왜 정적인지도 빠르게 캐치될 것이다.

```js
const x = "전역";

function foo() {
  console.log(x); // 나(foo)는 여기서 작성됐어
}

function bar() {
  const x = "bar 내부";
  foo(); // foo는 bar 안에서 호출되지만
}

bar(); // "전역" — foo의 OuterReference는 선언 위치(전역)를 기준으로 설정됨
```

`foo`가 `bar` 안에서 호출됐어도, `foo`의 OuterReference는 `foo`가 **선언된** 전역 환경을 가리킨다. 따라서 `x`는 전역의 `"전역"`이 출력된다.

<br/>

**여기서, 다른 세계선으로 보자.**

<br/>
아래와 같이 `bar` 내부에서 선언되었다면, `foo`의 OuterReference는 전역 환경이 아닌 바로 상위 스코프인 `bar`를 가리킨다.

```js
const x = "전역";

function bar() {
  const x = "bar 내부"; // 전역 x와 이름이 같지만 별개의 변수

  function foo() {
    // foo는 bar 안에서 선언됐으므로 OuterReference → bar의 LexicalEnvironment
    console.log(x); // x를 찾아해매다 bar의 x를 먼저 발견 → "bar 내부"
  }

  foo();
}

bar(); // "bar 내부"
```

이처럼 안쪽 스코프에 바깥 스코프와 **같은 이름의 변수**가 있으면, 안쪽 변수가 바깥 변수를 가리는 현상이 생긴다. 이를 **변수 쉐도잉(Variable Shadowing)** 이라고 한다.

변수 쉐도잉은 자바스크립트 언어가 의도적으로 허용하는 동작이다. 

OuterReference를 타고 올라가기 전에 현재 EnvironmentRecord에서 이름을 먼저 찾기 때문에, 안쪽 변수가 발견되는 순간 탐색이 멈추고 바깥 변수에는 접근하지 않는다.


<br/>



## 호이스팅 — 실행 컨텍스트 관점

호이스팅은 "선언이 위로 끌어올려진다"고 설명되는 경우가 많다. 

하지만 실제로 코드가 이동하는 것은 아니다.

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

`var`는 초기값 `undefined`로 등록되므로 선언 전에 읽어도 `undefined`가 나온다. 

`let`/`const`는 등록은 되지만 초기화되지 않은 상태라 선언 전에 접근하면 TDZ 에러가 발생한다.

<br/>

### "let은 호이스팅이 안 된다"는 오해

`let`은 호이스팅이 된다. 

다만 `var`와 다르게 동작할 뿐이다.

`var`는 생성 단계에서 `undefined`로 초기화되지만, `let`/`const`는 생성 단계에서 EnvironmentRecord에 등록만 되고 초기화는 실제 선언문에 도달했을 때 이루어진다. 

등록된 이후 초기화되기 전까지의 구간이 TDZ다.

아래 코드를 살펴보자.

```js
let x = "전역";

{
  console.log(x); // ReferenceError: Cannot access 'x' before initialization
  let x = "블록";
}
```

만약 `let`이 호이스팅되지 않는다면, 블록 안의 `console.log(x)`는 바깥 스코프의 `"전역"`을 출력해야 한다.

그런데 ReferenceError가 발생한다. 

이는 블록 내부의 `let x` 선언이 생성 단계에서 이미 EnvironmentRecord에 등록되었고, 그 결과 바깥 스코프의 `x`가 가려졌기(변수 쉐도잉) 때문이다. 

등록은 됐지만 초기화 전이라 TDZ 에러가 뜨는 것이다.

```
생성 단계에서 블록 EnvironmentRecord:
  x → <uninitialized>   ← 호이스팅은 됐다, 초기화만 안 됐을 뿐

실행 단계:
  console.log(x) → TDZ (초기화 전 접근) → ReferenceError
  let x = "블록" → 이 시점에 초기화 완료
```

호이스팅이 없었다면 바깥 `x`를 찾았을 것이다. ReferenceError 자체가 호이스팅의 증거다.

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

함수 선언식은 생성 단계에서 **함수 객체 전체**가 EnvironmentRecord에 등록된다. 

함수 표현식은 변수 바인딩 규칙을 따른다.

<br/>



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

`makeCounter`가 return된 후 `makeCounter`의 실행 컨텍스트는 콜스택에서 제거된다. 

하지만 `count`는 여전히 살아있다. 

왜 제거되지않고 남아있는걸까?

<br/>

![클로저와 렉시컬 환경 참조](/assets/Javascript/closure-lexical-environment.png)

반환된 함수는 내부적으로 **`[[Environment]]`** 라는 슬롯을 갖는다. 

이 슬롯이 함수가 '생성'될 당시의 렉시컬 환경(`makeCounter`의 렉시컬 환경)을 참조한다.

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

<br/>

### 규칙 1 — 기본 바인딩 (Default Binding)

아무 컨텍스트 없이 단독으로 함수를 호출하면 `this`는 전역 객체다.

```js
function show() {
  console.log(this);
}
show(); // 브라우저: window / Node.js: global
```

단, strict mode에서는 `undefined`다.

```js
"use strict";
function show() {
  console.log(this); // undefined
}
show();
```

<br/>

### 규칙 2 — 암묵적 바인딩 (Implicit Binding)

객체의 메서드로 호출되면 `this`는 그 객체다.

```js
const obj = {
  name: "Sub",
  greet() {
    console.log(this.name);
  },
};
obj.greet(); // "Sub" — this = obj
```

주의할 점은 메서드를 변수에 꺼내서 호출하면 암묵적 바인딩이 깨진다.

```js
const fn = obj.greet;
fn(); // undefined — 기본 바인딩으로 떨어짐 (this = window)
```

콜백으로 넘길 때도 마찬가지다. `setTimeout(obj.greet, 100)`처럼 넘기면 `obj.greet`는 단순 함수 참조로 전달되어 `this`를 잃는다.

<br/>

### 규칙 3 — 명시적 바인딩 (Explicit Binding)

`call`, `apply`, `bind`로 `this`를 직접 지정한다.

```js
function greet(greeting) {
  console.log(`${greeting}, ${this.name}`);
}
const user = { name: "Sub" };

greet.call(user, "Hello");     // "Hello, Sub" — 인수를 쉼표로 나열
greet.apply(user, ["Hello"]);  // "Hello, Sub" — 인수를 배열로 전달
```

`call`과 `apply`는 즉시 실행한다는 점은 같다. 차이는 인수를 넘기는 방식뿐이다.

`bind`는 즉시 실행하지 않고 `this`가 고정된 새 함수를 반환한다.

```js
const bound = greet.bind(user);
bound("Hello"); // "Hello, Sub" — 나중에 호출해도 this가 user로 고정
```

<br/>

### 규칙 4 — new 바인딩 (new Binding)

`new`로 함수를 호출하면 엔진이 빈 객체를 만들고, 그 객체가 `this`가 된다.

```js
function Person(name) {
  this.name = name;
}
const p = new Person("Sub");
console.log(p.name); // "Sub"
```

내부적으로 일어나는 일:

1. 빈 객체 `{}` 생성
2. `Person.prototype`을 새 객체의 프로토타입으로 연결
3. `this`를 새 객체로 바인딩한 채로 `Person` 실행
4. 함수가 객체를 명시적으로 return하지 않으면 새 객체를 자동 반환

<br/>

### 화살표 함수 — ThisBinding 없음

화살표 함수는 자체적인 `ThisBinding`을 갖지 않는다. 선언 위치의 외부 실행 컨텍스트에서 `this`를 찾는다. 이를 **렉시컬 this**라고 한다.

```js
const obj = {
  name: "Sub",
  greet() {
    setTimeout(function () {
      console.log(this.name); // undefined — 기본 바인딩 (this = window)
    }, 100);

    setTimeout(() => {
      console.log(this.name); // "Sub" — greet()의 this를 그대로 캡처
    }, 100);
  },
};
obj.greet();
```

화살표 함수는 `call`/`apply`/`bind`로도 `this`를 바꿀 수 없다. `ThisBinding` 자체가 없기 때문이다.

```js
const arrow = () => console.log(this);
arrow.call({ name: "Sub" }); // 여전히 바깥 스코프의 this (변경 불가)
```

이게 React 클래스 컴포넌트 시절에 생성자에서 `this.handleClick = this.handleClick.bind(this)`를 해야 했던 이유고, 이후 화살표 함수로 자연스럽게 해결된 이유다.

<br/>

---

## ES3에서 ES5로 — 실행 컨텍스트 명세의 변화

지금까지 다룬 `LexicalEnvironment`, `EnvironmentRecord`, `OuterReference` 개념은 ES5(2009) 이후의 명세다. ES3 시절에는 실행 컨텍스트를 전혀 다른 용어로 정의했다.

<br/>

### ES3 (1999) — Variable Object와 Scope Chain

ES3의 실행 컨텍스트는 세 요소로 구성됐다.

```
ExecutionContext (ES3) {
  Variable Object (VO),  // 현재 스코프의 변수/함수/arguments 보관
  Scope Chain,           // VO들의 배열 — 현재 VO부터 전역 VO까지
  thisValue              // this
}
```

**Variable Object (VO)** 는 현재 컨텍스트의 변수, 함수 선언, `arguments`를 저장하는 객체다.

- 전역 컨텍스트: Global Object(`window`) 자체가 VO 역할
- 함수 컨텍스트: **Activation Object (AO)** 가 VO 역할 — 함수 호출 시 생성

**Scope Chain** 은 VO들을 담은 배열이었다. 변수를 탐색할 때 배열 앞에서부터 순서대로 찾았다.

```
// foo()가 실행 중일 때 Scope Chain
[
  foo의 AO,   // { x: 1, arguments: {...} }
  전역 VO     // { globalVar: "전역", ... }
]
```

<br/>

### ES5 (2009) — LexicalEnvironment와 명세 정비

ES5에서 실행 컨텍스트 명세가 전면 재정의됐다.

| ES3 | ES5 |
|-----|-----|
| Variable Object / Activation Object | Environment Record |
| Scope Chain (배열) | OuterReference (체인) |
| thisValue | ThisBinding |

ES3의 Scope Chain은 VO들을 담은 평탄한 배열이었지만, ES5의 OuterReference는 환경 객체들이 서로를 참조하는 연결 구조다. 용어뿐 아니라 모델 자체가 더 정교해졌다.

**strict mode 도입** 이 ES5의 핵심 변화다.

```js
"use strict";
```

strict mode가 바꾼 것들:

- `this` 기본 바인딩: 전역 객체 → `undefined`로 변경
  ```js
  function show() {
    console.log(this); // ES3: window / ES5 strict: undefined
  }
  show();
  ```
- `with` 문 금지 (`with`는 Scope Chain에 임의 객체를 삽입해 예측 불가한 동작을 유발했음)
- `arguments.callee` 접근 금지
- 선언 없이 변수 사용 금지 (ES3에서는 암묵적 전역 변수 생성이 가능했음)
  ```js
  undeclaredVar = 1; // ES3: 전역 변수로 암묵적 생성 / ES5 strict: ReferenceError
  ```

<br/>

### ES6 (2015) — 블록 스코프와 TDZ

ES6이 실행 컨텍스트 동작에 가장 큰 실질적 변화를 가져왔다.

**`let`/`const` 추가**로 블록 스코프가 생겼다. `{}` 블록마다 새로운 `LexicalEnvironment`가 생성된다. ES3/ES5에서는 `var`만 있었기 때문에 블록 내부 선언도 항상 함수 스코프에 귀속됐다.

TDZ는 이때 등장한 개념이다. ES3/ES5에서는 선언 전 접근이 항상 `undefined`였다(var 호이스팅). ES6부터 `let`/`const`는 생성 단계에서 등록은 되지만 초기화되지 않은 상태로 유지되어 TDZ가 발생한다.

**화살표 함수** 추가로 `ThisBinding`이 없는 함수가 생겼다. 클래스 컴포넌트에서 `bind(this)`가 필요했던 문제가 화살표 함수로 해결된 것도 ES6의 결과다.

```
ES3 (1999) — var만, this 기본 = 전역 객체, Scope Chain 배열, with 허용
ES5 (2009) — 명세 정비, strict mode, this 기본 strict = undefined, with 금지
ES6 (2015) — let/const, 블록 스코프, TDZ, 화살표 함수(렉시컬 this)
```

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
