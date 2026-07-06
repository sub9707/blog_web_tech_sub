---
title: "자바스크립트 버전별 핵심 기능 정리"
date: "2026-07-06"
description: "ES5부터 ES2023까지, 각 버전에서 추가된 굵직한 자바스크립트 기능들을 예제와 함께 정리"
tags: ["javascript", "ecmascript", "es6", "es2015", "history", "new-features"]
thumbnail: "/assets/thumbnails/js-version.png"
---

자바스크립트는 1995년 등장한 이후 ECMAScript라는 이름으로 표준화됐다.

2015년 ES6(ES2015)를 기점으로 매년 새 버전이 나오는 체계로 바뀌었고, 그 이후로는 TC39 위원회가 심사를 통과시킨 제안들을 모아 매년 새 명세를 발표하고 있다.

버전이 늘어날수록 기능은 많아지지만, 실무에서 정말 자주 쓰는 굵직한 것들은 정해져 있다.

ES5부터 ES2023까지, 버전별로 꼭 알아야 할 핵심 기능만 추려서 정리해봤다.

ES2024와 ES2025는 이미 [다른 글](/posts/Javascript/js-features-2024-2025)에서 다뤘으니 참고하면 된다.

<br/>

## 시작 전에, 용어부터 가볍게 짚고 가자

아래 다섯 개는 이 글 내내 계속 나오는 단어라 미리 알아두면 훨씬 편하다.

- **폴리필(polyfill)**: 오래된 브라우저가 지원하지 않는 최신 기능을 그 브라우저에서도 쓸 수 있도록 미리 흉내 내서 만들어둔 코드. 구형 브라우저에 `Array.prototype.includes`가 없으면, 같은 동작을 하는 함수를 직접 만들어 끼워 넣는 식이다.

- **트랜스파일(transpile)**: 새 문법으로 짠 코드를 구형 환경도 이해할 수 있는 옛날 문법으로 바꿔주는 작업. Babel이 대표적인 트랜스파일 도구다.

- **호이스팅(hoisting)**: 변수나 함수 선언이 실제로 쓰여있는 위치와 상관없이, 마치 스코프(유효 범위) 맨 위로 끌어올려진 것처럼 동작하는 자바스크립트 특유의 동작 방식.

- **클로저(closure)**: 함수가 자기가 만들어질 당시의 바깥 변수를 기억해뒀다가, 함수 실행이 끝난 뒤에도 그 변수에 계속 접근할 수 있는 현상.

- **프로토타입(prototype)**: 객체가 다른 객체의 속성이나 메서드를 물려받을 때 참조하는 원본 객체. 지금 쓰는 `class` 문법도 속을 까보면 이 프로토타입 방식으로 돌아간다.

<br/>

## ES5 (2009) — 근대 자바스크립트의 시작

ES6 이전, 지금 우리가 당연하게 쓰는 배열/객체 메서드들이 이 버전에서 처음 들어왔다.

```js
// 배열 순회 메서드
[1, 2, 3].forEach((n) => console.log(n));
[1, 2, 3].map((n) => n * 2);
[1, 2, 3].filter((n) => n % 2 === 0);
[1, 2, 3].reduce((acc, n) => acc + n, 0);

// JSON 내장 지원
JSON.parse('{"a":1}');
JSON.stringify({ a: 1 });

// strict mode
'use strict';

// 객체 프로퍼티 세밀 제어
Object.defineProperty(obj, 'key', { value: 1, writable: false });
Object.freeze(obj);
Object.keys(obj);
```

ES5 이전에는 이런 기능들을 자바스크립트가 아니라 라이브러리(Prototype.js, jQuery 등)가 폴리필로 채워줘야 했다.

ES5부터 브라우저에 네이티브로 들어오면서, 언어 자체의 기반이 비로소 다져졌다.

<br/>

## ES6 / ES2015 — 가장 큰 변화

지금 쓰는 자바스크립트 문법의 8할이 여기서 나왔다고 봐도 된다.

실무 코드에서 매일 마주치는 기능들이라 하나씩 짚어볼 만하다.

**let / const와 블록 스코프**

```js
// var는 함수 스코프, 호이스팅 문제 있음
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3, 3, 3
}

// let은 블록 스코프
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2
}
```

**화살표 함수**

```js
// this를 바인딩하지 않고 상위 스코프의 this를 그대로 사용
class Timer {
  constructor() {
    this.seconds = 0;
    setInterval(() => {
      this.seconds++; // 화살표 함수라 this가 Timer 인스턴스
    }, 1000);
  }
}
```

**템플릿 리터럴**

```js
const name = 'sub';
const greeting = `안녕, ${name}. 오늘은 ${new Date().getFullYear()}년`;
```

**구조 분해 할당**

```js
const { name, age } = user;
const [first, second] = list;

// 함수 인자에서도 사용
function greet({ name, age = 20 }) {
  console.log(`${name} (${age})`);
}
```

**클래스 문법**

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a noise.`;
  }
}

class Dog extends Animal {
  speak() {
    return `${this.name} barks.`;
  }
}
```

기존 프로토타입 기반 상속을 문법적으로 감싼 것뿐이지만, 읽고 쓰기 훨씬 편해졌다.

**Promise**

```js
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    fetch(`/api/users/${id}`)
      .then((res) => res.json())
      .then(resolve)
      .catch(reject);
  });
}
```

콜백 지옥(callback hell)을 해결하려고 도입됐고, 이후 async/await(ES2017)의 기반이 된다.

**모듈 시스템 (import / export)**

```js
// math.js
export const add = (a, b) => a + b;
export default function multiply(a, b) { return a * b; }

// main.js
import multiply, { add } from './math.js';
```

CommonJS(`require`) 없이도 브라우저와 Node 양쪽에서 표준화된 모듈 시스템을 쓸 수 있게 됐다.

**그 외 굵직한 것들**

```js
// 스프레드 / rest
const merged = [...arr1, ...arr2];
function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }

// 기본 매개변수
function greet(name = 'Guest') { console.log(name); }

// Map / Set
const map = new Map([['a', 1]]);
const set = new Set([1, 2, 2, 3]); // {1, 2, 3}

// Symbol — 항상 고유한 값을 만들어주는 원시 타입. 주로 객체 프로퍼티 키 충돌을 막는 용도로 쓴다
const id = Symbol('id');

// Generator — 함수 실행을 중간에 멈췄다가(yield) 필요할 때 이어서 실행할 수 있게 해주는 특수 함수
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
```

<br/>

## ES2016 (ES7) — 작지만 자주 쓰는 것

```js
// 배열 포함 여부 확인
[1, 2, 3].includes(2); // true (NaN도 정확히 찾음, indexOf는 못 찾음)

// 거듭제곱 연산자
2 ** 10; // 1024, 기존엔 Math.pow(2, 10)
```

<br/>

## ES2017 (ES8) — async/await

Promise 체이닝을 동기 코드처럼 작성할 수 있게 됐다.

지금 실무에서 가장 많이 쓰는 비동기 문법이다.

```js
// Promise 체이닝
function getUser(id) {
  return fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then((user) => fetch(`/api/posts?userId=${user.id}`))
    .then((res) => res.json());
}

// async/await
async function getUser(id) {
  const userRes = await fetch(`/api/users/${id}`);
  const user = await userRes.json();
  const postsRes = await fetch(`/api/posts?userId=${user.id}`);
  return postsRes.json();
}
```

에러 처리도 `try/catch`로 자연스럽게 묶인다.

```js
async function getUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    return await res.json();
  } catch (err) {
    console.error(err);
  }
}
```

`Object.values()`, `Object.entries()`, 문자열 `padStart`/`padEnd`도 이 버전에 같이 추가됐다.

```js
Object.entries({ a: 1, b: 2 }); // [['a', 1], ['b', 2]]
'5'.padStart(3, '0'); // '005'
```

<br/>

## ES2018 (ES9) — 객체 스프레드와 비동기 이터레이션

```js
// 객체 스프레드/rest
const { a, ...rest } = { a: 1, b: 2, c: 3 };
const merged = { ...obj1, ...obj2 };

// 비동기 반복 (for await...of)
async function process(asyncIterable) {
  for await (const item of asyncIterable) {
    console.log(item);
  }
}

// Promise.finally
fetchData()
  .then((data) => render(data))
  .catch((err) => showError(err))
  .finally(() => hideLoadingSpinner());
```

정규식 관련 기능(named capture groups, `s` flag)도 이때 추가됐다.

```js
const re = /(?<year>\d{4})-(?<month>\d{2})/;
const match = re.exec('2026-07');
match.groups.year; // '2026'
```

<br/>

## ES2019 (ES10) — 배열/객체 유틸리티 보강

```js
// 배열 평탄화
[1, [2, 3, [4, 5]]].flat(2); // [1, 2, 3, 4, 5]
[1, 2, 3].flatMap((n) => [n, n * 2]); // [1, 2, 2, 4, 3, 6]

// Object.fromEntries — entries의 반대
Object.fromEntries([['a', 1], ['b', 2]]); // { a: 1, b: 2 }

// 문자열 트림
'  hi  '.trimStart(); // 'hi  '
'  hi  '.trimEnd();   // '  hi'

// optional catch binding
try {
  doSomething();
} catch {
  // 에러 객체가 필요 없으면 () 생략 가능
  console.log('failed');
}
```

<br/>

## ES2020 (ES11) — 안전한 접근의 시대

실무에 가장 큰 영향을 준 버전 중 하나다.

null/undefined 체크가 훨씬 간결해졌다.

```js
// Optional chaining — 중첩 객체 접근 시 에러 방지
const city = user?.address?.city;
user?.getName?.(); // 메서드 존재 여부까지 체크

// Nullish coalescing — null/undefined일 때만 기본값
const count = data.count ?? 0; // count가 0이어도 그대로 유지 (|| 는 0도 fallback됨)

// BigInt — Number.MAX_SAFE_INTEGER를 넘는 정수 처리
const big = 9007199254740993n;

// Promise.allSettled — 하나가 실패해도 전체 결과 확인 가능
const results = await Promise.allSettled([p1, p2, p3]);
// [{ status: 'fulfilled', value }, { status: 'rejected', reason }, ...]

// 동적 import
const module = await import('./module.js');

// globalThis — 환경(브라우저/Node) 상관없이 전역 객체 참조
globalThis.setTimeout(() => {}, 1000);
```

<br/>

## ES2021 (ES12) — 문자열/논리 연산자 보강

```js
// String.replaceAll — 기존엔 정규식 g 플래그가 필요했음
'a-b-c'.replaceAll('-', '_'); // 'a_b_c'

// 논리 할당 연산자
a ||= b; // a가 falsy면 a = b
a &&= b; // a가 truthy면 a = b
a ??= b; // a가 null/undefined면 a = b

// 숫자 구분자 — 가독성용
const billion = 1_000_000_000;

// Promise.any — 하나라도 성공하면 resolve
const fastest = await Promise.any([fetchFromCDN1(), fetchFromCDN2()]);

// WeakRef — 가비지 컬렉션을 방해하지 않는 참조
const ref = new WeakRef(largeObject);
```

<br/>

## ES2022 (ES13) — 클래스 필드와 배열 탐색

```js
// 클래스 필드 선언 — constructor 없이 바로 필드 정의
class Counter {
  count = 0;              // public 필드
  #privateCount = 0;      // private 필드
  static instances = 0;   // static 필드

  increment() {
    this.count++;
    this.#privateCount++;
  }

  #privateMethod() {      // private 메서드
    return this.#privateCount;
  }
}

// 배열 뒤에서부터 탐색
[1, 2, 3, 4].at(-1); // 4, 기존엔 arr[arr.length - 1]

// 객체에 특정 키 존재 여부 (in 연산자보다 프로토타입 체인 영향 없음)
Object.hasOwn(obj, 'key');

// top-level await — 모듈 최상단에서 await 사용 가능
const data = await fetch('/api/config').then((r) => r.json());
export default data;

// 정규식 매치 인덱스
const re = /\d+/d;
const match = re.exec('abc123');
match.indices; // 매치된 위치 정보
```

<br/>

## ES2023 (ES14) — 배열 탐색 보강

```js
// findLast / findLastIndex — 배열을 뒤에서부터 탐색
const users = [{ id: 1, active: false }, { id: 2, active: true }, { id: 3, active: true }];
users.findLast((u) => u.active);      // { id: 3, active: true }
users.findLastIndex((u) => u.active); // 2

// hashbang 문법 — Node 스크립트 shebang을 표준으로 인정
#!/usr/bin/env node
console.log('script');

// WeakMap 키 확장 — Symbol도 WeakMap의 키로 사용 가능
const wm = new WeakMap();
const sym = Symbol('key');
wm.set(sym, 'value');
```

<br/>

## 왜 이렇게 바뀌어왔을까

버전이 그냥 하나씩 늘어난 게 아니다.

각 시대마다 뚜렷한 문제의식이 있었고, 그걸 이해하면 지금 자바스크립트가 왜 이런 모양인지도 자연스럽게 보인다.

**ES5까지 — 언어의 빈틈을 라이브러리가 메우던 시기**

브라우저마다 구현이 제각각이었고, 배열/객체를 다루는 표준 메서드조차 부족했다.

그 빈틈을 `jQuery`, `Prototype.js`, `Underscore` 같은 라이브러리들이 대신 메워주고 있었다.

ES5는 그중 가장 시급했던 것들(배열 메서드, JSON, strict mode)을 언어 자체로 흡수한 버전이다.

**ES6 — 진짜 프로그래밍 언어로 인정받기 시작한 순간**

ES5까지의 자바스크립트는 "브라우저에서 DOM이나 조작하는 스크립트"라는 인식이 강했다.

ES6는 클래스, 모듈, Promise, 블록 스코프를 도입하면서 Node.js 서버와 대규모 SPA도 감당할 수 있는 언어로 발돋움했다.

이 무렵 Babel과 트랜스파일 생태계가 폭발적으로 커진 것도 우연이 아니다.

브라우저 지원이 따라오기 전까지, 개발자들은 새 문법으로 코드를 쓰고 옛날 문법으로 변환해서 배포하는 식으로 버텼다.

**ES2017 async/await — 콜백 지옥을 완전히 걷어낸 문법**

`Promise`가 콜백 지옥을 많이 줄여주긴 했지만, `.then()` 체이닝도 길어지면 결국 읽기 힘들어진다.

async/await는 비동기 코드를 마치 동기 코드처럼 위에서 아래로 읽히게 만들어줬다.

단순히 문법이 예뻐진 게 아니라, 비동기 로직을 대하는 개발자들의 사고방식 자체가 바뀐 셈이다.

**ES2020 Optional chaining / Nullish coalescing — 방어 코드를 언어가 대신 처리**

`user && user.address && user.address.city` 같은 방어 코드는 실무에서 정말 지겹도록 반복되던 패턴이었다.

이전에는 lodash의 `_.get()` 같은 유틸 함수가 이 문제를 대신 해결해주고 있었는데, ES2020이 아예 언어 레벨에서 흡수해버리면서 굳이 라이브러리를 쓸 이유가 하나 줄었다.

<br/>

## 그래서 DX(개발자 경험)는 어떻게 달라졌나

- **타입 안정성에 대한 요구가 커졌다**: ES6의 클래스/모듈 문법이 자리잡으면서 코드베이스 규모가 커졌고, 자연스럽게 TypeScript 채택도 늘었다. 자바스크립트 자체는 여전히 타입이 없지만, 문법이 정돈될수록 그 위에 타입 시스템을 얹기가 쉬워졌다.
- **트랜스파일/폴리필 부담이 줄었다**: 브라우저가 알아서 자동 업데이트되는 환경(Evergreen 브라우저)이 자리잡으면서, Babel 설정이나 core-js 폴리필을 일일이 신경 쓸 일이 예전보다 줄었다. `browserslist`로 타겟만 명확히 정의하면 나머지는 빌드 도구가 알아서 해준다.
- **비동기 코드가 훨씬 읽기 쉬워졌다**: 콜백 → Promise → async/await로 넘어오면서 디버깅 난이도가 크게 낮아졌다. 스택 트레이스가 명확해지고, 에러 처리도 `try/catch`로 통일됐다.
- **방어 코드가 줄었다**: Optional chaining과 Nullish coalescing 덕분에 null 체크용 보일러플레이트가 줄었다. 코드 리뷰에서 "이 방어 코드 진짜 필요해?"를 따지는 일도 줄었다.

<br/>

## 이 변화들 때문에 무엇을 버리고 무엇을 새로 골랐나

언어가 바뀌면 그 위에서 쓰던 도구와 관습도 같이 바뀐다.

실제로 이런 전환들이 있었다.

| 이전 선택 | 이후 선택 | 이유 |
|---|---|---|
| jQuery의 DOM/AJAX 유틸 | 네이티브 `fetch`, `querySelector` | ES5/ES6 이후 표준 API가 충분히 강력해짐 |
| Underscore/lodash의 배열 유틸 전반 | 네이티브 배열 메서드(`map`, `flat`, `at` 등) | ES6~ES2022에서 언어가 직접 흡수 |
| `moment.js` | `date-fns`, `Temporal`(제안) | moment는 무겁고 mutable, 네이티브 대안이 발전 |
| 콜백 기반 비동기 라이브러리(`async.js`) | Promise, async/await | 언어 레벨 지원으로 별도 라이브러리 불필요 |
| CommonJS(`require`) | ESM(`import`/`export`) | 브라우저/Node 모두 지원하는 표준 모듈 시스템 |
| `var`와 함수 스코프 관습 | `let`/`const`와 블록 스코프 | 클로저 버그(반복문 안 setTimeout 등) 원천 차단 |
| Babel + core-js 풀폴리필 | 타겟 브라우저 기준 선택적 폴리필 | 최신 문법의 네이티브 지원 확대 |

lodash는 지금도 쓰이지만, 위상이 좀 달라졌다.

"일단 설치하고 보는" 필수 라이브러리에서 "네이티브로 안 되는 부분만 골라 쓰는" 보조 도구 쪽으로 옮겨간 느낌이다.

jQuery는 신규 프로젝트에서는 사실상 후보군에서 빠졌다.

<br/>

## 정리

| 버전 | 연도 | 핵심 |
|---|---|---|
| ES5 | 2009 | forEach/map/filter, JSON, strict mode |
| ES6 (ES2015) | 2015 | let/const, 화살표 함수, 클래스, Promise, 모듈, 구조분해, 스프레드 |
| ES2016 | 2016 | `includes()`, `**` 연산자 |
| ES2017 | 2017 | async/await, `Object.entries/values` |
| ES2018 | 2018 | 객체 스프레드/rest, `for await...of`, `Promise.finally` |
| ES2019 | 2019 | `flat`/`flatMap`, `Object.fromEntries`, optional catch binding |
| ES2020 | 2020 | Optional chaining(`?.`), Nullish coalescing(`??`), BigInt, `Promise.allSettled` |
| ES2021 | 2021 | `replaceAll`, 논리 할당 연산자(`||=`, `&&=`, `??=`), `Promise.any` |
| ES2022 | 2022 | 클래스 필드/private 멤버, `Array.at()`, top-level await |
| ES2023 | 2023 | `findLast`/`findLastIndex` |
| ES2024~ | 2024~ | [별도 포스트](/posts/Javascript/js-features-2024-2025) 참고 |

버전 하나하나를 외울 필요는 없다.

다만 지금 프로젝트가 타겟으로 하는 브라우저나 Node 버전이 어디까지 지원하는지, 그리고 지금 쓰는 문법이 언제 표준에 들어왔는지 정도는 알아두면 좋다.

트랜스파일 설정(Babel, tsconfig target)이나 폴리필이 정말 필요한지 판단할 때 바로 도움이 된다.

<br/>

## 참고

<bookmark url="https://tc39.es/process-document/"></bookmark>

<bookmark url="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference"></bookmark>

<bookmark url="https://github.com/tc39/proposals/blob/main/finished-proposals.md"></bookmark>
