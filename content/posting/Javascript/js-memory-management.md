---
title: "자바스크립트의 메모리 관리"
date: "2026-01-14"
description: "자바스크립트 메모리 생명주기, 가비지 컬렉션 알고리즘, V8 엔진의 Minor/Major GC와 stop-the-world 최적화 전략까지 정리한 글"
tags: ["javascript", "memory", "garbage-collection", "v8", "performance"]
thumbnail: "/assets/thumbnails/js-memory-management.png"
---

자바스크립트는 개발자가 메모리를 직접 할당·해제하지 않아도 된다. 가비지 컬렉터가 자동으로 처리해주기 때문이다. 하지만 이 동작 원리를 모르면 메모리 누수를 만들거나 성능 문제를 놓치기 쉽다.

메모리 생명주기부터 V8 엔진의 가비지 컬렉션 전략까지 순서대로 살펴보자.

<br/>

## 메모리 생명주기

![메모리 생명주기](/assets/Javascript/memory/memory-lifecycle.png)

자바스크립트의 메모리는 세 단계를 거친다.

1. **할당 (Allocate)** — 변수·객체 선언 시 메모리 공간 확보
2. **사용 (Use)** — 값을 읽거나 쓰는 작업
3. **해제 (Release)** — 더 이상 사용하지 않는 메모리를 가비지 컬렉터가 회수

<br/>

## 스택과 힙

자바스크립트 엔진은 메모리를 **스택(Stack)** 과 **힙(Heap)** 두 영역으로 나눠 사용한다.

| 영역 | 저장 데이터 | 특징 |
|---|---|---|
| **Call Stack** | 원시값, 참조값의 주소 | 고정 크기, LIFO, 함수 종료 시 자동 해제 |
| **Heap** | 객체, 배열, 함수 | 동적 크기, GC가 관리 |

원시값(`number`, `string`, `boolean` 등)은 크기가 고정돼 있어 스택에 바로 저장한다.

객체·배열 같은 참조타입은 크기를 예측하기 어렵고 구조가 복잡해 힙에 저장하고, 스택에는 그 **주소값**만 저장한다. (→ [Deep Copy & Shallow Copy](/posts/javascript/js-deep-copy-shallow-copy)에서 이 차이가 복사 동작에 어떤 영향을 주는지 다뤘다)

<br/>

## 가비지 컬렉션 (Garbage Collection)

### Reference Counting (구방식, 현재 미사용)

초기 방식은 객체를 참조할 때마다 카운트를 올리고, 참조가 해제되면 내리는 방식이었다.

```js
let a = { name: 'obj' }; // 참조 카운트: 1
let b = a;               // 참조 카운트: 2
a = null;                // 참조 카운트: 1
b = null;                // 참조 카운트: 0 → GC 수거
```

카운트가 0이 되면 메모리를 해제한다. 단순하지만 **순환 참조** 문제가 있었다.

```js
function createCycle() {
  const a = {};
  const b = {};
  a.ref = b; // b 참조
  b.ref = a; // a 참조
  // 함수 종료 후 a, b 둘 다 접근 불가하지만
  // 서로를 참조해 카운트가 0이 되지 않음 → 메모리 누수
}
```

<br/>

### Mark & Sweep (현재 방식)

현재 모든 주요 자바스크립트 엔진이 사용하는 방식이다.

**루트(Root)** 에서 시작해 도달 가능한 객체를 전부 표시(Mark)하고, 표시되지 않은 객체를 수거(Sweep)한다.

```
루트 (전역 객체, 실행 중인 함수의 로컬 변수 등)
  └── 도달 가능한 객체 → Mark (보존)
  └── 도달 불가능한 객체 → Sweep (수거)
```

순환 참조 문제가 없다. 서로 참조하더라도 루트에서 도달할 수 없으면 수거된다.

<br/>

## V8 가비지 컬렉션

### Resident Set

프로그램 실행 시 V8은 **Resident Set**이라는 메모리 공간을 할당한다.

![Resident Set 구조](/assets/Javascript/memory/memory-resident-set.png)

Resident Set은 **New Space**와 **Old Space**로 나뉜다.

이렇게 나누는 이유는 **The Generational Hypothesis** — "대부분의 객체는 생성 직후 짧게 쓰이다 버려진다"는 가설에 기반한다. 오래 살아남은 객체일수록 계속 쓰일 가능성이 높으므로, 신생 객체와 장수 객체를 분리해 GC 비용을 줄인다.

| 영역 | 대상 | GC 종류 |
|---|---|---|
| **New Space** | 새로 할당된 객체 (생존 기간 짧음) | Minor GC (Scavenger) |
| **Old Space** | Minor GC에서 살아남은 객체 | Major GC (Mark & Sweep) |

<br/>

### Minor GC (Scavenger)

New Space는 두 개의 **Semi Space**로 구성된다.

```
1. 새 객체 → From Space에 할당
2. From Space가 가득 차면 Minor GC 발생
3. 살아있는 객체 → To Space로 이동
4. From / To 역할 교체
5. 두 번의 Minor GC에서 살아남은 객체 → Old Space로 승격
```

New Space는 크기가 작아 Minor GC는 빠르게 끝난다.

<br/>

### Major GC

Old Space가 동적으로 계산된 한계치에 도달하면 **Major GC**가 발생한다.

Mark & Sweep 방식으로 Old Space 전체를 스캔한다. New Space보다 훨씬 크기 때문에 작업 시간이 길다.

이 작업 중 JavaScript 실행이 일시 중단되는데, 이를 **stop-the-world** 현상이라고 한다. 시간이 길어질수록 로딩·렌더링이 지연되어 UX 저하로 이어진다.

<br/>

## stop-the-world 개선 전략

### Parallel GC

![Parallel GC](/assets/Javascript/memory/memory-gc-parallel.png)

메인 스레드 혼자 하던 GC 작업을 **헬퍼 스레드**와 분담해 처리한다.

- 장점: stop-the-world 시간이 크게 감소
- 단점: 스레드 간 동기화 오버헤드 발생

<br/>

### Incremental GC

![Incremental GC](/assets/Javascript/memory/memory-gc-incremental.png)

GC 작업을 잘게 쪼개 메인 스레드가 **조금씩 나눠** 처리한다.

- 장점: GC 소요 시간이 분산되어 응답성 향상
- 단점: 전체 GC 완료 시간은 증가할 수 있음

<br/>

### Concurrent GC

![Concurrent GC](/assets/Javascript/memory/memory-gc-concurrent.png)

메인 스레드는 GC를 전혀 하지 않고 **헬퍼 스레드만** GC를 수행한다.

- 장점: 메인 스레드의 stop-the-world가 사실상 없음
- 단점: 구현 복잡도 높음 (메인 스레드가 실행 중 힙 구조가 변할 수 있어 정교한 동기화 필요)

<br/>

### Idle-time GC

![Idle-time GC](/assets/Javascript/memory/memory-gc-idle.png)

메인 스레드가 **유휴 상태(idle)** 일 때만 GC를 수행한다.

크롬은 초당 60프레임을 렌더링하는데, 1프레임에 약 16ms가 소요된다. 렌더링이 16ms보다 빨리 끝나면 그 남은 시간에 GC를 수행한다.

- 장점: 메인 스레드가 일하는 중에는 GC를 하지 않아 UX 영향 최소화
- 단점: 유휴 시간이 부족하면 GC가 지연될 수 있음

실제 V8은 이 네 가지 전략을 **혼합**해서 사용한다.

<br/>

## 메모리 누수 패턴

GC가 자동으로 처리해주지만 아래 패턴에서는 누수가 발생할 수 있다.

**전역 변수 의도치 않은 생성**
```js
function leak() {
  leakedVar = 'I am global'; // var/let/const 없이 선언 → 전역 변수
}
```

**해제되지 않는 이벤트 리스너**
```js
function addHandler() {
  const data = new Array(10000).fill('x');
  document.addEventListener('click', () => console.log(data));
  // 컴포넌트가 사라져도 리스너가 남아 data를 계속 참조
}
// → removeEventListener로 명시적 해제 필요
```

**타이머 내부 참조**
```js
const data = fetchBigData();
setInterval(() => {
  process(data); // data가 계속 참조됨
}, 1000);
// → clearInterval로 해제 필요
```

**WeakMap / WeakRef로 방지**

객체를 키로 사용하면서 GC 대상에서 제외되길 원하지 않을 때 `WeakMap`을 사용한다.

```js
const cache = new WeakMap();

function process(obj) {
  if (!cache.has(obj)) {
    cache.set(obj, heavyComputation(obj));
  }
  return cache.get(obj);
}
// obj가 다른 곳에서 참조되지 않으면 WeakMap 항목도 자동 GC
```

<br/>

## 참고

<bookmark url="https://www.youtube.com/watch?v=1BoJZqxFYfQ"></bookmark>

<bookmark url="https://fe-developers.kakaoent.com/2022/220519-garbage-collection/"></bookmark>
