---
title: "Deep Copy와 Shallow Copy로 알아보는 JS의 메모리 사용 방식"
date: "2026-03-28"
description: "자바스크립트에서 원시타입과 참조타입이 메모리에 저장되는 방식, 깊은 복사와 얕은 복사의 차이, 그리고 객체를 안전하게 복사하는 방법 정리"
tags: ["javascript", "deep-copy", "shallow-copy", "memory", "reference-type"]
thumbnail: "/assets/thumbnails/js-deep-copy-shallow-copy.png"
---

자바스크립트에서 변수나 객체를 복사할 때, 복사본을 수정했는데 원본까지 바뀌어버린 경험이 있을 것이다.

이건 버그가 아니라 JS가 타입에 따라 메모리를 다르게 다루기 때문이다. 어떤 경우에 깊은 복사, 얕은 복사가 일어나는지 알아보자.

<br/>

## 문제 상황

**원시타입 복사**

![원시타입 복사 코드](/assets/Javascript/deep-copy/copy-primitive-code.png)

`name`에 `'Kim'`을 할당하고, `name2 = name`으로 복사한 뒤 `name2`에 새 값을 부여했다.

![원시타입 복사 결과](/assets/Javascript/deep-copy/copy-primitive-result.png)

결과: `name`은 그대로이고 `name2`만 바뀐다.

<br/>

**참조타입 복사**

![객체 복사 코드](/assets/Javascript/deep-copy/copy-object-code.png)

이번엔 객체를 복사하고 복사본의 `name` 필드만 바꿨다.

![객체 복사 결과](/assets/Javascript/deep-copy/copy-object-result.png)

결과: 원본과 복사본이 **함께** 바뀐다. 원시타입과 왜 다를까?

<br/>

## 원인: 스택과 힙의 저장 방식 차이

![스택과 힙 메모리 구조](/assets/Javascript/deep-copy/copy-stack-heap.png)

자바스크립트는 타입에 따라 저장 위치가 다르다.

**원시타입 (Primitive)** — `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`

- 값 자체를 **Call Stack**에 저장한다
- 고정된 크기로 메모리 예측이 쉬워 스택에 적합하다
- 복사 시 **값 자체를 새로운 주소에 복사** → 수정해도 원본에 영향 없음 → **깊은 복사(Deep Copy)**

**참조타입 (Reference)** — `Object`, `Array`, `Function`

- 실제 데이터를 **Heap**에 저장하고, **그 주소값만** Stack에 저장한다
- 크기가 유동적이고 구조가 복잡해 힙에 저장하는 것이 효율적이다
- 복사 시 **주소값만 복사** → 같은 Heap 객체를 가리킴 → 수정 시 원본도 변경 → **얕은 복사(Shallow Copy)**

```
Stack                   Heap
──────────────────      ────────────────────
name  → 'Kim'           (원시값은 힙 사용 안 함)
──────────────────
item  → [주소 0x001] →  { name: 'sword', price: 10000 }
copy  → [주소 0x001] →  (같은 객체 참조)
──────────────────
```

`item`과 `copy`가 같은 Heap 주소를 가리키기 때문에, 어느 쪽을 수정해도 같은 객체가 바뀐다.

<br/>

## 객체를 안전하게 복사하는 방법

### 방법 1: Object.assign()

```js
const source = { b: 4, c: 5 };
const copy = Object.assign({}, source);

copy.b = 10;
console.log(source); // { b: 4, c: 5 } — 원본 유지
console.log(copy);   // { b: 10, c: 5 }
```

1단계 프로퍼티는 깊은 복사된다. 단, **중첩 객체는 여전히 주소값만 복사**된다.

<br/>

### 방법 2: Spread Operator

```js
const Item = { name: 'sword', price: 10000, color: 'white' };
const newItem = { ...Item };
newItem.name = 'shield';

console.log(Item);    // { name: 'sword', ... }
console.log(newItem); // { name: 'shield', ... }
```

![Spread 복사 결과](/assets/Javascript/deep-copy/copy-spread-result.png)

`Object.assign()`과 마찬가지로 **1단계 프로퍼티만 복사**된다.

```js
const Item = { name: 'sword', stats: { attack: 10 } };
const newItem = { ...Item };
newItem.stats.attack = 99;

console.log(Item.stats.attack); // 99 — 중첩 객체는 함께 변한다
```

중첩 객체 `stats`는 주소값만 복사되어 여전히 같은 객체를 참조한다.

<br/>

### 방법 3: JSON.stringify + JSON.parse

```js
const Item = {
  name: 'sword',
  color: { one: 'red', two: 'blue' },
};

const newItem = JSON.parse(JSON.stringify(Item));
newItem.color.one = 'black';

console.log(Item.color.one);    // 'red' — 원본 유지
console.log(newItem.color.one); // 'black'
```

![JSON 복사 결과](/assets/Javascript/deep-copy/copy-json-result.png)

중첩 객체까지 완전한 깊은 복사가 된다.

**단점**: `function`, `undefined`, `Symbol`, `Date`, `RegExp` 등은 직렬화되지 않아 손실된다.

```js
const obj = { fn: () => 'hello', date: new Date() };
const copy = JSON.parse(JSON.stringify(obj));
console.log(copy.fn);   // undefined (함수 소실)
console.log(copy.date); // string으로 변환됨
```

<br/>

### 방법 4: structuredClone() (ES2022, 권장)

```js
const Item = {
  name: 'sword',
  color: { one: 'red', two: 'blue' },
  createdAt: new Date(),
};

const newItem = structuredClone(Item);
newItem.color.one = 'black';

console.log(Item.color.one);    // 'red'
console.log(newItem.createdAt); // Date 객체 유지
```

`Date`, `Map`, `Set`, `ArrayBuffer` 등 JSON이 처리하지 못하는 타입도 올바르게 복사한다. 브라우저와 Node.js 18+ 모두 기본 지원한다.

**단점**: `function`은 복사되지 않는다.

<br/>

### 방법 5: Lodash cloneDeep

![Lodash cloneDeep](/assets/Javascript/deep-copy/copy-lodash.png)

```js
import _ from 'lodash';

const newItem = _.cloneDeep(Item);
```

가장 보편적인 방법으로, 함수를 제외한 거의 모든 타입을 올바르게 복사한다.

<br/>

## 복사 방법 비교

| 방법 | 중첩 객체 | Date/Map/Set | 함수 | 비고 |
|---|---|---|---|---|
| `Object.assign()` | 얕은 복사 | O | O | 1단계만 깊은 복사 |
| Spread `{...}` | 얕은 복사 | O | O | 1단계만 깊은 복사 |
| `JSON.stringify` | 깊은 복사 | X (변환됨) | X (소실) | 단순 데이터 전용 |
| `structuredClone` | 깊은 복사 | O | X | ES2022, 기본 내장 |
| `_.cloneDeep` | 깊은 복사 | O | X | 외부 라이브러리 |

단순한 1단계 객체라면 Spread나 `Object.assign()`으로 충분하다. 중첩 구조라면 `structuredClone()`을 먼저 고려하고, 함수 포함이나 레거시 환경이면 Lodash를 사용한다.

<br/>

## 참고

<bookmark url="https://lodash.com/docs/#cloneDeep"></bookmark>
