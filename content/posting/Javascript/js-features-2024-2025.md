---
title: "2024, 2025년에 추가된 자바스크립트 신기능"
date: "2026-06-04"
description: "ES2024와 ES2025에서 추가된 자바스크립트 핵심 신기능들 — 불변 배열 메서드, Iterator Helpers, Explicit Resource Management, Promise.try() 등을 예제와 함께 정리"
tags: ["javascript", "es2024", "es2025", "ecmascript", "new-features"]
thumbnail: "/assets/thumbnails/js-features-2024-2025.png"
---

자바스크립트는 매년 ECMAScript 표준을 통해 새로운 기능을 추가한다. TC39 위원회에서 Stage 4에 도달한 제안이 해당 연도의 명세에 포함된다.

ES2024(ES15)와 ES2025(ES16)에서 실무에 바로 쓸 수 있는 핵심 기능들을 정리한다.

<br/>

## ES2024 (ES15)

<br/>

### Array 불변 메서드 — toSorted / toReversed / toSpliced / with

기존 `sort()`, `reverse()`, `splice()` 는 **원본 배열을 직접 변경**했다.

![기존 배열 뮤테이션 문제](/assets/Javascript/js-features/array-mutation-problem.png)

사이드 이펙트를 막으려면 매번 원본을 복사한 뒤 메서드를 호출해야 했다. ES2024부터 원본을 건드리지 않는 불변 버전이 추가됐다.

**toSorted**

```js
const numbers = [3, 1, 5, 2, 4];
const sorted = numbers.toSorted();

console.log(sorted);  // [1, 2, 3, 4, 5]
console.log(numbers); // [3, 1, 5, 2, 4] — 원본 유지
```

기존 `sort()`와 동일하게 비교 함수를 인수로 전달할 수 있다.

**toReversed**

```js
const arr = [1, 2, 3, 4, 5];
const reversed = arr.toReversed();

console.log(reversed); // [5, 4, 3, 2, 1]
console.log(arr);      // [1, 2, 3, 4, 5]
```

**toSpliced**

```js
const arr = [1, 2, 3, 4, 5];
const spliced = arr.toSpliced(2, 2, 'a', 'b');

console.log(spliced); // [1, 2, 'a', 'b', 5]
console.log(arr);     // [1, 2, 3, 4, 5]
```

기존 `splice()`는 제거한 요소를 반환하지만, `toSpliced()`는 **변경된 전체 배열**을 반환한다.

**with**

특정 인덱스의 요소를 교체한 새 배열을 반환한다.

```js
const languages = ['JavaScript', 'TypeScript', 'CoffeeScript'];
const updated = languages.with(2, 'WebAssembly');

console.log(updated);   // ['JavaScript', 'TypeScript', 'WebAssembly']
console.log(languages); // ['JavaScript', 'TypeScript', 'CoffeeScript']
```

<br/>

### Object.groupBy

배열을 특정 기준으로 그룹화해 객체로 반환한다.

```js
const people = [
  { name: 'sub', age: 27 },
  { name: 'kim', age: 30 },
  { name: 'lee', age: 27 },
];

const grouped = Object.groupBy(people, (person) => person.age);
```

![Object.groupBy 결과](/assets/Javascript/js-features/groupby-result.png)

```js
// 결과
{
  27: [{ name: 'sub', age: 27 }, { name: 'lee', age: 27 }],
  30: [{ name: 'kim', age: 30 }]
}
```

`Map.groupBy`도 함께 추가됐다. 키로 원시값이 아닌 객체를 사용할 때 유용하다.

```js
const map = Map.groupBy(people, (person) => person.age);
```

<br/>

### Promise.withResolvers()

기존 Promise는 `resolve`와 `reject`를 콜백 내부에서만 호출할 수 있었다.

```js
// 기존 방식 — resolve/reject가 콜백 밖으로 나오기 어렵다
let externalResolve;
const promise = new Promise((resolve) => {
  externalResolve = resolve; // 꺼내려면 이런 꼼수가 필요했음
});
```

`Promise.withResolvers()`는 `promise`, `resolve`, `reject`를 한 번에 반환한다.

```js
const { promise, resolve, reject } = Promise.withResolvers();

// 어디서든 자유롭게 호출 가능
setTimeout(() => resolve('done'), 1000);

promise.then(console.log); // 'done'
```

이벤트 기반 코드나 스트림 처리에서 Promise를 외부에서 제어할 때 유용하다.

<br/>

### New Set Methods

Set에 집합 연산 메서드들이 추가됐다.

![Set 메서드 목록](/assets/Javascript/js-features/set-methods.png)

```js
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

a.union(b);        // Set {1, 2, 3, 4}       — 합집합
a.intersection(b); // Set {2, 3}             — 교집합
a.difference(b);   // Set {1}               — 차집합 (a - b)
a.symmetricDifference(b); // Set {1, 4}     — 대칭 차집합
a.isSubsetOf(b);   // false                 — 부분집합 여부
a.isSupersetOf(b); // false                 — 상위집합 여부
a.isDisjointFrom(b); // false               — 서로소 여부
```

기존에는 직접 반복문으로 구현해야 했던 집합 연산을 간결하게 처리할 수 있다.

<br/>

### Temporal API

![Temporal API vs Date 비교](/assets/Javascript/temporal-vs-date.png)

`Date` 객체의 고질적인 문제들을 해결하는 새 날짜/시간 API다.

**기존 Date의 문제점**

```js
new Date().getMonth();  // 0부터 시작 (1월 = 0)
new Date('2024-02-30'); // 잘못된 날짜도 에러 없이 처리
// 타임존 처리가 복잡하고 일관성 없음
// 불변(immutable)이 아니라 직접 변경됨
```

**Temporal 주요 타입**

```js
// 현재 날짜 (타임존 없음)
const today = Temporal.PlainDate.today();
console.log(today.toString()); // '2026-06-04'

// 날짜 연산
const nextWeek = today.add({ days: 7 });
console.log(nextWeek.toString()); // '2026-06-11'

// 날짜 비교
Temporal.PlainDate.compare(today, nextWeek); // -1

// 타임존 포함 시각
const now = Temporal.ZonedDateTime.from({
  timeZone: 'Asia/Seoul',
  year: 2026,
  month: 6,
  day: 4,
  hour: 12,
});
```

모든 객체가 **불변(immutable)** 이고, 월이 1부터 시작하며, 잘못된 날짜를 엄격하게 검증한다.

현재 대부분의 브라우저에서 폴리필로 사용 가능하며, 정식 지원이 점진적으로 확대되고 있다.

<br/>

### JSON Modules & Import Attributes

번들러 없이 네이티브 자바스크립트에서 JSON 파일을 import할 수 있다.

```js
// 기존 — 번들러(Webpack, Vite)에서만 가능
import data from './data.json';

// ES2024 — with 구문으로 타입 명시
import data from './data.json' with { type: 'json' };
```

CSS, WebAssembly 등 다른 파일 타입도 같은 방식으로 확장 가능하다.

```js
import styles from './styles.css' with { type: 'css' };
import wasm from './module.wasm' with { type: 'webassembly' };
```

<br/>

### Decorators

클래스, 메서드, 프로퍼티에 추가 기능을 선언적으로 적용하는 문법이다.

```js
@defineElement('my-button')
class MyButton extends HTMLElement {
  @reactive accessor label = 'Click me';

  @memoize
  computeExpensiveValue() { /* ... */ }
}
```

TypeScript에서는 이미 오래 사용했던 패턴이다. 클래스 기반 프레임워크(Angular, Lit 등)에서 특히 유용하다.

<br/>

---

## ES2025 (ES16)

<br/>

### Iterator Helpers

![Iterator Helpers 체이닝 흐름](/assets/Javascript/iterator-helpers-chain.png)

배열에서만 가능하던 `map()`, `filter()` 같은 연산을 **모든 이터레이터**에서 직접 사용할 수 있게 됐다.

```js
// 기존 — 배열로 변환 후 처리해야 했음
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}

const result = [...range(0, 100)]
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .slice(0, 5);
// → 100개 전부 배열로 만든 다음 처리

// ES2025 — 이터레이터에서 직접 체이닝, 필요한 만큼만 소비
const result = range(0, 100)
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .take(5)
  .toArray();
// → [0, 4, 16, 36, 64]
```

사용 가능한 메서드:

| 메서드 | 설명 |
|---|---|
| `.map(fn)` | 각 요소 변환 |
| `.filter(fn)` | 조건 필터링 |
| `.take(n)` | 앞에서 n개만 |
| `.drop(n)` | 앞에서 n개 건너뜀 |
| `.flatMap(fn)` | 변환 후 평탄화 |
| `.toArray()` | 배열로 변환 |
| `.every(fn)` | 모두 만족 여부 |
| `.some(fn)` | 하나라도 만족 여부 |
| `.find(fn)` | 조건 만족하는 첫 요소 |
| `.forEach(fn)` | 각 요소 순회 |

중간 배열 생성 없이 **지연 평가(lazy evaluation)** 로 처리되어 메모리 효율이 높다.

<br/>

### Promise.try()

동기 함수와 비동기 함수를 구별 없이 Promise로 래핑할 수 있다.

```js
// 기존 — 동기 에러가 Promise 체인 밖으로 튀어나올 수 있었음
function riskyOperation() {
  throw new Error('sync error');
}

// Promise 체인에서 동기 에러 처리 누락 가능
somePromise
  .then(() => riskyOperation()) // try 없으면 catch로 안 잡힘
  .catch(handleError);

// ES2025
Promise.try(riskyOperation)
  .then(result => console.log(result))
  .catch(err => console.error(err)); // 동기/비동기 에러 모두 catch
```

함수가 동기인지 비동기인지 모르는 상황(콜백, 플러그인 시스템 등)에서 안전하게 처리할 수 있다.

<br/>

### Explicit Resource Management — using / await using

리소스(파일, DB 연결, 소켓 등)를 블록 범위가 끝날 때 자동으로 정리한다. TypeScript 5.2에서 먼저 도입됐고 ES2025에 정식 포함됐다.

```js
// 기존 — try/finally로 직접 정리
function processFile() {
  const file = openFile('data.txt');
  try {
    return file.read();
  } finally {
    file.close(); // 항상 실행되도록 보장
  }
}

// ES2025 — using 키워드
function processFile() {
  using file = openFile('data.txt'); // 블록 종료 시 자동 close()
  return file.read();
}
```

`[Symbol.dispose]()` 메서드를 구현한 모든 객체에 사용할 수 있다.

```js
class FileHandle {
  constructor(path) { this.handle = openNativeFile(path); }
  read() { return this.handle.read(); }
  [Symbol.dispose]() { this.handle.close(); } // using과 연동
}

{
  using fh = new FileHandle('data.txt');
  console.log(fh.read());
} // 블록 종료 → [Symbol.dispose]() 자동 호출
```

비동기 리소스는 `await using`과 `[Symbol.asyncDispose]()`를 사용한다.

```js
async function query() {
  await using conn = await getDbConnection();
  return conn.execute('SELECT * FROM users');
} // 자동으로 await conn.close()
```

<br/>

### RegExp.escape()

문자열을 정규식 패턴에 안전하게 사용할 수 있도록 특수문자를 이스케이프한다.

```js
// 기존 — 직접 이스케이프 함수를 만들어야 했음
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ES2025
const userInput = 'hello.world (test)';
const pattern = new RegExp(RegExp.escape(userInput));
// → /hello\.world \(test\)/
```

사용자 입력을 그대로 정규식에 쓸 때 발생하는 ReDoS(정규식 서비스 거부) 공격도 방지할 수 있다.

<br/>

### Error.isError()

값이 `Error` 인스턴스인지 안전하게 확인한다.

```js
// 기존 — instanceof는 다른 영역(iframe, VM)에서 생성된 Error를 못 잡는다
try {
  throw new Error('oops');
} catch (e) {
  console.log(e instanceof Error); // 다른 realm이면 false가 될 수 있음
}

// ES2025
try {
  throw new Error('oops');
} catch (e) {
  console.log(Error.isError(e)); // 항상 정확하게 판별
}
```

특히 `iframe`, `vm.runInNewContext`, `cross-realm` 환경에서 신뢰도가 높다.

<br/>

### Math.sumPrecise()

부동소수점 오차 없이 숫자 이터러블의 합계를 계산한다.

```js
// 기존 — 부동소수점 오차 발생
[0.1, 0.2, 0.3].reduce((a, b) => a + b, 0);
// → 0.6000000000000001

// ES2025
Math.sumPrecise([0.1, 0.2, 0.3]);
// → 0.6
```

금융 계산, 통계 처리처럼 정밀도가 중요한 곳에서 유용하다.

<br/>

### import defer — 지연 모듈 로딩

![import defer 타이밍 비교](/assets/Javascript/import-defer-timing.png)

모듈을 즉시 평가하지 않고, 실제로 사용될 때까지 실행을 미룬다.

```js
// 기존 — 페이지 로드 시 즉시 모듈 평가
import { Chart } from './chart.js';

// ES2025 — 모듈을 다운로드하되 실행은 첫 사용 시점으로 미룸
import defer * as Chart from './chart.js';

// Chart는 아래 코드가 실행될 때 처음 평가됨
document.getElementById('btn').addEventListener('click', () => {
  const chart = new Chart.BarChart(); // 이 시점에 모듈 초기화
});
```

`lazy import`와 달리 번들에는 포함되지만 초기 실행 비용을 줄일 수 있다. 초기 로딩 성능 최적화에 효과적이다.

<br/>

## 정리

| 기능 | 연도 | 핵심 |
|---|---|---|
| 불변 배열 메서드 (`toSorted` 등) | ES2024 | 원본 배열 변경 없이 새 배열 반환 |
| `Object.groupBy` | ES2024 | 배열을 기준 함수로 그룹화 |
| `Promise.withResolvers()` | ES2024 | resolve/reject를 외부에서 제어 |
| New Set Methods | ES2024 | 합집합, 교집합 등 집합 연산 |
| Temporal API | ES2024+ | Date의 완전한 대체 날짜/시간 API |
| Iterator Helpers | ES2025 | 모든 이터레이터에 map/filter/take 등 |
| `Promise.try()` | ES2025 | 동기/비동기 함수 안전하게 Promise 래핑 |
| `using` / `await using` | ES2025 | 리소스 자동 정리 |
| `RegExp.escape()` | ES2025 | 문자열을 정규식 패턴으로 안전하게 변환 |
| `Error.isError()` | ES2025 | 크로스 영역에서 Error 정확히 판별 |
| `Math.sumPrecise()` | ES2025 | 부동소수점 오차 없는 합산 |
| `import defer` | ES2025 | 모듈 실행 지연 로딩 |

<br/>

## 참고

<bookmark url="https://tc39.es/proposal-temporal/docs/"></bookmark>

<bookmark url="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set"></bookmark>

<bookmark url="https://github.com/tc39/proposal-decorators"></bookmark>
