---
title: "브라우저 렌더링과 자바스크립트 내부 동작 구조"
date: "2026-06-18"
description: "브라우저가 HTML을 받아 화면에 그리기까지의 과정과, 그 과정에서 자바스크립트 엔진이 어떻게 동작하는지 알아보자"
tags: ["javascript", "browser", "rendering", "v8", "performance", "reflow", "repaint"]
thumbnail: "/assets/thumbnails/browser-rendering-js-internals.jpg"
---

브라우저 주소창에 URL을 입력하고 엔터를 누른다. 화면이 뜨기까지 수백 밀리초 사이에 무슨 일이 벌어지는 걸까?

이 흐름을 모르면 "왜 느리지?", "왜 깜빡이지?", "왜 레이아웃이 흔들리지?" 같은 성능 문제의 원인을 찾기 어렵다.

이번 포스팅에서 브라우저가 HTML을 받아 픽셀로 그려내는 **Critical Rendering Path**와, 그 중심에 있는 **자바스크립트 엔진(V8)의 내부 구조**를 파고들어보자.

<br/>

## Critical Rendering Path

브라우저가 화면을 그리기까지 거치는 일련의 단계를 **Critical Rendering Path(CRP)** 라고 부른다.

<!-- 이미지: 브라우저 렌더링 파이프라인 전체 흐름도
     HTML → DOM, CSS → CSSOM, DOM+CSSOM → Render Tree → Layout → Paint → Composite 
     각 단계를 좌우 화살표로 연결한 수평 다이어그램
     파일명: browser-rendering-pipeline.png -->
![브라우저 렌더링 파이프라인](/assets/Javascript/browser-rendering-pipeline.png)

전체 흐름은 다음 순서로 이루어진다.

```
HTML 파싱 → DOM 생성
CSS 파싱  → CSSOM 생성
           ↓
      Render Tree 생성
           ↓
         Layout
           ↓
         Paint
           ↓
       Composite
```

각 단계를 하나씩 살펴보자.

<br/>

### 1. HTML 파싱과 DOM 생성

브라우저는 서버로부터 HTML 바이트 스트림을 받는다. 이 바이트를 문자열로 변환한 뒤 **토크나이징(Tokenizing)** 을 거쳐 트리 구조로 만든다. 결과물이 **DOM(Document Object Model)** 이다.

> **토크나이징이란?**
> 텍스트를 의미 단위(토큰)로 쪼개는 작업이다. `<div class="box">` 같은 HTML 문자열을 브라우저가 이해할 수 있는 데이터 조각으로 분류하는 과정이다.

```html
<html>
  <body>
    <h1>Hello</h1>
    <p>World</p>
  </body>
</html>
```

위 HTML은 파싱 후 아래와 같은 트리가 된다.

```
Document
└── html
    └── body
        ├── h1 ("Hello")
        └── p ("World")
```

파싱 중 `<script>` 태그를 만나면 **파싱이 즉시 중단**된다. 스크립트를 다운로드하고 실행을 마칠 때까지 DOM 생성이 멈춘다. 이를 **파서 블로킹(Parser Blocking)** 이라고 한다.

<br/>

### 2. CSS 파싱과 CSSOM 생성

HTML과 마찬가지로 CSS도 파싱 후 트리 구조로 만들어진다. 이것이 **CSSOM(CSS Object Model)** 이다.

```css
body { font-size: 16px; }
h1 { font-size: 2em; color: black; }
p { font-size: 1em; }
```

CSSOM은 DOM과 달리 **cascade(계단식 상속)** 가 반영된다. `body`에 `font-size: 16px`를 지정하면 자식 요소들이 이를 상속하므로, CSSOM에는 계산된 최종 스타일이 담긴다.

> **CSS가 렌더링을 블로킹하는 이유**
> 브라우저는 CSSOM이 완성되기 전까지 Render Tree를 만들지 않는다. 스타일이 확정되지 않은 상태에서 화면을 그리면 나중에 스타일이 적용될 때 화면이 다시 그려지기 때문이다. 이 현상을 **FOUC(Flash of Unstyled Content)** 라고 한다.

<br/>

### 3. Render Tree 생성

DOM과 CSSOM이 완성되면 이 둘을 합쳐 **Render Tree** 를 만든다.

<!-- 이미지: DOM + CSSOM → Render Tree 병합 다이어그램
     왼쪽에 DOM 트리, 오른쪽에 CSSOM 트리, 가운데 화살표로 합쳐져 Render Tree가 되는 구조
     display:none 노드는 Render Tree에서 제외되는 것을 점선으로 표시
     파일명: dom-cssom-render-tree.png -->
![DOM + CSSOM → Render Tree](/assets/Javascript/dom-cssom-render-tree.png)

Render Tree 생성 시 중요한 규칙이 있다.

- `display: none` 요소는 Render Tree에 **포함되지 않는다**
- `visibility: hidden` 요소는 공간을 차지하므로 **포함된다**
- `<head>`, `<script>`, `<meta>` 같은 비시각적 요소는 제외된다

```html
<div style="display: none">보이지 않음 — Render Tree 제외</div>
<div style="visibility: hidden">투명하지만 공간 차지 — Render Tree 포함</div>
```

<br/>

### 4. Layout (Reflow)

Render Tree가 완성되면 각 요소의 **정확한 위치와 크기**를 계산한다. 이 단계를 **Layout** 또는 **Reflow** 라고 부른다.

뷰포트 크기를 기준으로 각 요소의 `x, y, width, height`를 계산한다. `%`, `em`, `vw` 같은 상대 단위가 이 단계에서 픽셀로 변환된다.

> **Reflow는 비싸다**
> 한 요소의 크기가 바뀌면 연쇄적으로 주변 요소들의 위치를 다시 계산해야 할 수 있다. DOM의 앞쪽 요소를 변경할수록 영향 범위가 넓어진다.

<br/>

### 5. Paint

Layout에서 계산된 위치/크기 정보를 바탕으로 실제 픽셀을 채우는 단계다. 색상, 텍스트, 그림자, 테두리 등 시각적 속성이 여기서 처리된다.

Paint는 레이어 단위로 이루어진다. 브라우저는 성능 최적화를 위해 요소들을 여러 레이어로 나누고, 변경이 있을 때 해당 레이어만 다시 그린다.

<br/>

### 6. Composite

여러 레이어를 합쳐 최종 화면을 완성하는 단계다. GPU가 이 작업을 담당하며, CPU가 처리하는 Layout/Paint와 달리 **합성 단계는 비교적 저렴하다**.

`transform`, `opacity` 같은 속성은 Layout과 Paint를 건너뛰고 Composite 단계에서만 처리된다. 애니메이션에 이 속성들을 사용하면 성능이 좋은 이유다.

| 속성 변경 | Layout | Paint | Composite |
|---|:---:|:---:|:---:|
| width, margin, padding | O | O | O |
| color, background | X | O | O |
| transform, opacity | X | X | O |

<br/>

---

## 자바스크립트 엔진 내부 구조 (V8)

자바스크립트 코드는 어떻게 실행될까? Chrome과 Node.js에서 사용하는 **V8 엔진**을 기준으로 살펴본다.

<!-- 이미지: V8 엔진 파이프라인 다이어그램
     소스코드 → Parser → AST → Ignition(Interpreter) → Bytecode → TurboFan(JIT) → Optimized Machine Code
     각 단계 박스와 화살표, TurboFan에서 Deoptimization 화살표가 Ignition으로 다시 돌아오는 구조
     파일명: v8-engine-pipeline.png -->
![V8 엔진 파이프라인](/assets/Javascript/v8-engine-pipeline.png)

<br/>

### 1. 파싱과 AST 생성

자바스크립트 코드가 엔진에 들어오면 먼저 **파싱** 단계를 거친다.

**렉서(Lexer)** 가 소스코드를 토큰으로 분리하고, **파서(Parser)** 가 이 토큰들로 **AST(Abstract Syntax Tree)** 를 만든다.

> **AST(추상 구문 트리)란?**
> 소스코드의 구조를 트리 형태로 표현한 자료구조다. 코드의 실제 실행과는 무관하게, "어떤 구문이 어떤 관계로 이루어져 있는지"를 나타낸다. 컴파일러와 린터 등이 모두 이 AST를 사용한다.

```js
const x = 1 + 2;
```

위 코드의 AST는 대략 이런 형태다.

```
VariableDeclaration (const)
└── VariableDeclarator
    ├── Identifier (x)
    └── BinaryExpression (+)
        ├── NumericLiteral (1)
        └── NumericLiteral (2)
```

AST는 [astexplorer.net](https://astexplorer.net)에서 직접 확인해볼 수 있다.

<br/>

V8은 파싱 비용을 줄이기 위해 두 가지 파싱 전략을 쓴다.

- **Eager Parsing (전체 파싱)**: 즉시 실행되는 코드에 적용. 전체 AST를 생성한다.
- **Lazy Parsing (지연 파싱)**: 함수 선언처럼 나중에 호출될 코드는 일단 건너뛴다. 실제 호출 시점에 파싱한다.

```js
// 이 함수는 선언 시점에 파싱되지 않는다 (Lazy)
function heavyTask() {
  // ...
}

// 즉시 실행 — Eager 파싱 대상
(function init() {
  // ...
})();
```

<br/>

### 2. Ignition — 인터프리터

AST는 **Ignition(이그니션)** 인터프리터에 의해 **바이트코드(Bytecode)** 로 변환된다.

> **바이트코드란?**
> 사람이 읽는 고수준 코드와, CPU가 직접 실행하는 기계어(Machine Code) 사이의 중간 형태다. 플랫폼에 종속되지 않으며, V8의 가상 머신이 이 바이트코드를 해석해 실행한다.

바이트코드는 기계어보다 추상적이지만, 소스코드를 직접 실행하는 것보다 훨씬 빠르다. 또한 최적화 여부를 판단하기 위한 **프로파일링 정보(타입, 호출 횟수 등)** 를 수집하는 역할도 한다.

<br/>

### 3. TurboFan — JIT 컴파일러

Ignition이 코드를 실행하면서 특정 함수가 **자주 호출(핫 코드, Hot Code)** 된다고 판단되면, **TurboFan(터보팬)** 이 그 코드를 최적화된 **기계어**로 컴파일한다.

> **JIT 컴파일(Just-In-Time Compilation)이란?**
> 실행 전에 미리 전부 컴파일하는 AOT(Ahead-of-Time)와 달리, 실행 중에 필요한 부분만 컴파일하는 방식이다. 자주 실행되는 코드는 기계어로 바꿔 속도를 높이고, 드물게 실행되는 코드는 인터프리터가 처리한다.

<!-- 이미지: JIT 컴파일 흐름 다이어그램
     바이트코드 → 프로파일링 → Hot Code 판단 → TurboFan 최적화 → 기계어
     Deoptimization 화살표로 기계어에서 바이트코드로 되돌아가는 흐름 포함
     파일명: v8-jit-compilation.png -->
![V8 JIT 컴파일 흐름](/assets/Javascript/v8-jit-compilation.png)

<br/>

#### Deoptimization (역최적화)

TurboFan은 **타입 가정**을 기반으로 최적화한다. 함수에 항상 숫자만 들어왔다면, 숫자 연산에 최적화된 기계어를 생성한다.

그런데 어느 순간 문자열이 들어오면? TurboFan이 만든 기계어는 무효가 된다. 이때 엔진은 최적화를 버리고 다시 Ignition의 바이트코드로 돌아간다. 이를 **Deoptimization** 이라고 한다.

```js
function add(a, b) {
  return a + b;
}

// 100번 숫자로 호출 → TurboFan이 숫자 연산으로 최적화
add(1, 2);
add(3, 4);
// ...

// 갑자기 문자열 → Deoptimization 발생
add("hello", "world");
```

이 때문에 **타입을 일관되게 유지하는 것**이 성능에 중요하다.

<br/>

### 4. Hidden Class

자바스크립트 객체는 동적으로 프로퍼티를 추가할 수 있다. 이 유연성 때문에 일반 해시맵으로 구현하면 느리다. V8은 이를 해결하기 위해 **Hidden Class** 라는 개념을 사용한다.

객체 생성 시 V8은 내부 Hidden Class를 할당하고, 프로퍼티가 추가될 때마다 새로운 Hidden Class로 전환(transition)한다. 같은 순서로 프로퍼티를 추가한 객체들은 동일한 Hidden Class를 공유하게 되어, 정적 언어처럼 빠른 프로퍼티 접근이 가능해진다.

```js
// 좋음 — 동일한 Hidden Class 공유
const a = { x: 1, y: 2 };
const b = { x: 3, y: 4 };

// 나쁨 — Hidden Class가 달라짐
const c = {};
c.x = 1;
c.y = 2;

const d = {};
d.y = 4; // y를 먼저 추가 → c와 다른 Hidden Class
d.x = 3;
```

객체 리터럴로 한 번에 선언하고, 프로퍼티 추가 순서를 일관되게 유지하는 것이 중요한 이유다.

<br/>

### 5. 가비지 컬렉션 (Garbage Collection)

V8은 더 이상 참조되지 않는 메모리를 자동으로 해제한다. 이 과정이 **가비지 컬렉션(GC)** 이다.

V8은 **세대별 GC(Generational GC)** 전략을 사용한다.

<!-- 이미지: V8 메모리 힙 구조 다이어그램
     Heap을 Young Generation(New Space)과 Old Generation(Old Space)으로 나눈 구조
     Young Gen 내부의 From Space와 To Space, Scavenge GC 화살표
     Old Gen의 Mark-and-Sweep/Mark-and-Compact 표시
     파일명: v8-heap-structure.png -->
![V8 힙 메모리 구조](/assets/Javascript/v8-heap-structure.png)

**Young Generation (신세대 영역)**

새로 생성된 객체들이 이 영역에 들어온다. 크기가 작고 GC가 자주, 빠르게 실행된다. 이 GC를 **Scavenge** 라고 부른다.

- `From Space`와 `To Space` 두 영역으로 나뉜다
- 살아있는 객체를 `To Space`로 복사하고 `From Space`를 통째로 비운다
- Scavenge를 여러 번 생존하면 Old Generation으로 승격된다

**Old Generation (구세대 영역)**

오래 살아남은 객체들이 모인 곳. 크기가 크고 GC가 덜 자주 실행된다. **Mark-and-Sweep** 방식을 사용한다.

1. **Mark**: 루트(전역 변수, 스택 등)에서 도달 가능한 객체를 표시
2. **Sweep**: 표시되지 않은 객체(도달 불가능한 객체)를 해제
3. **Compact**: 메모리 단편화를 줄이기 위해 살아있는 객체를 한쪽으로 모음

> **메모리 누수가 발생하는 패턴**
> ```js
> // 전역 변수에 누적되는 데이터
> const cache = {};
> function addToCache(key, value) {
>   cache[key] = value; // 한 번 추가되면 절대 GC되지 않음
> }
> 
> // 해제되지 않는 이벤트 리스너
> element.addEventListener("click", handler);
> // element가 DOM에서 제거될 때 리스너도 같이 제거해야 함
> element.removeEventListener("click", handler);
> ```

<br/>

---

## JS가 렌더링을 막는 방식

### 파서 블로킹 (Parser Blocking)

HTML 파서가 `<script>` 태그를 만나면 **즉시 파싱을 중단**한다.

<!-- 이미지: 파서 블로킹 타임라인 다이어그램
     가로 시간축에 HTML 파싱 → script 다운로드 + 실행(블로킹 구간 표시) → HTML 파싱 재개 → DOM 완성 순서
     파일명: parser-blocking-timeline.png -->
![파서 블로킹 타임라인](/assets/Javascript/parser-blocking-timeline.png)

```html
<!-- 나쁨: <head>의 블로킹 스크립트 -->
<head>
  <script src="heavy.js"></script> <!-- 다운로드+실행 완료 전까지 파싱 중단 -->
</head>
```

이 문제를 해결하는 방법이 `async`와 `defer`다.

<br/>

### async vs defer

<!-- 이미지: async / defer / 기본 스크립트 비교 타임라인 다이어그램
     세 줄의 가로 타임라인 (일반, async, defer)
     각각 HTML 파싱 구간, 스크립트 다운로드 구간(파싱과 병렬인지 여부), 스크립트 실행 시점을 색상으로 구분
     파일명: async-defer-comparison.png -->
![async vs defer 비교](/assets/Javascript/async-defer-comparison.png)

```html
<!-- 기본: 파싱 중단 → 다운로드 → 실행 → 파싱 재개 -->
<script src="app.js"></script>

<!-- async: 다운로드는 병렬, 완료 즉시 파싱 중단 후 실행 -->
<script async src="analytics.js"></script>

<!-- defer: 다운로드는 병렬, DOM 완성 후 실행 (순서 보장) -->
<script defer src="app.js"></script>
```

| 속성 | 다운로드 | 실행 시점 | 실행 순서 |
|---|---|---|---|
| 없음 | 파싱 중단 | 즉시 | 순서 보장 |
| `async` | 병렬 | 다운로드 완료 즉시 | 보장 안 됨 |
| `defer` | 병렬 | DOM 완성 후 | 순서 보장 |

서로 의존성이 없는 독립적인 스크립트(광고, 분석 도구)는 `async`, 순서가 중요하거나 DOM을 조작하는 스크립트는 `defer`가 적합하다.

<br/>

### DOMContentLoaded vs load

```js
// DOM 파싱 완료 + defer 스크립트 실행 완료 시점
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM 준비 완료");
});

// 이미지, CSS, 폰트 등 모든 리소스 로드 완료 시점
window.addEventListener("load", () => {
  console.log("모든 리소스 로드 완료");
});
```

`DOMContentLoaded`는 DOM만 필요한 초기화 로직에, `load`는 이미지 크기나 외부 리소스에 의존하는 로직에 사용한다.

<br/>

---

## Reflow와 Repaint

### Reflow

DOM이나 스타일이 변경되어 **레이아웃을 다시 계산**해야 하는 상황이다. 계산량이 많고 비싼 작업이다.

Reflow를 유발하는 대표적인 작업들:

```js
// 크기/위치 관련 스타일 변경
element.style.width = "200px";
element.style.margin = "10px";

// 크기/위치 값 읽기 — 브라우저가 최신 값을 반환하기 위해 강제로 Reflow
const height = element.offsetHeight;
const rect = element.getBoundingClientRect();

// DOM 구조 변경
parent.appendChild(child);
parent.removeChild(child);
```

> **왜 값을 읽기만 해도 Reflow가 발생하나?**
> 브라우저는 성능 최적화를 위해 DOM 변경을 즉시 반영하지 않고 큐에 모아두었다가 일괄 처리한다. 그런데 `offsetHeight` 같은 값을 요청하면 "현재 정확한 값"을 반환해야 하므로, 큐에 쌓인 변경 사항을 즉시 Flush하고 Reflow를 실행한다.

<br/>

### Layout Thrashing

Reflow를 유발하는 **쓰기 작업**과 값을 읽는 **읽기 작업**을 번갈아 반복하는 패턴을 **Layout Thrashing** 이라고 한다.

<!-- 이미지: Layout Thrashing 타임라인 다이어그램
     나쁜 예시: Write → 강제 Reflow → Write → 강제 Reflow 반복 패턴
     좋은 예시: Read 모두 먼저 → Write 모두 나중에
     가로 타임라인으로 Reflow 구간을 빨간색으로 강조
     파일명: layout-thrashing.png -->
![Layout Thrashing 패턴](/assets/Javascript/layout-thrashing.png)

```js
// 나쁨 — 읽기와 쓰기 반복 → Reflow 반복 발생
const boxes = document.querySelectorAll(".box");
boxes.forEach((box) => {
  const width = box.offsetWidth; // 읽기 → 강제 Reflow
  box.style.width = width * 2 + "px"; // 쓰기
});

// 좋음 — 읽기를 먼저 모두 끝낸 뒤 쓰기
const widths = Array.from(boxes).map((box) => box.offsetWidth); // 읽기만 먼저
boxes.forEach((box, i) => {
  box.style.width = widths[i] * 2 + "px"; // 쓰기만 나중에
});
```

<br/>

### Repaint

레이아웃에는 영향을 주지 않는 시각적 속성(색상, 배경, 그림자 등)이 변경될 때 일어난다. Reflow보다는 저렴하지만 여전히 비용이 있다.

```js
element.style.color = "red";        // Repaint
element.style.backgroundColor = "blue"; // Repaint
element.style.boxShadow = "...";    // Repaint
```

<br/>

---

## 성능 최적화 전략

### requestAnimationFrame

DOM 변경이나 애니메이션 로직을 `requestAnimationFrame(rAF)`으로 감싸면, 브라우저의 **다음 렌더링 프레임** 직전에 실행된다. 불필요한 중간 계산을 건너뛰고 화면 주사율에 맞게 실행되어 부드러운 애니메이션이 가능하다.

```js
// 나쁨 — 프레임 주기와 무관하게 즉시 실행 반복
setInterval(() => {
  box.style.left = getNextPosition() + "px";
}, 16);

// 좋음 — 프레임 직전에 한 번 실행
function animate() {
  box.style.left = getNextPosition() + "px";
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

<br/>

### transform과 opacity 활용

CSS 애니메이션에서 `width`, `height`, `top`, `left` 대신 `transform`과 `opacity`를 사용하면 Layout과 Paint 단계를 건너뛰고 Composite만 발생한다.

```css
/* 나쁨 — Layout 유발 */
.box {
  transition: left 0.3s, top 0.3s;
}

/* 좋음 — Composite만 발생 */
.box {
  transition: transform 0.3s, opacity 0.3s;
}
```

<br/>

### DocumentFragment

여러 DOM 노드를 한 번에 추가할 때 `DocumentFragment`를 사용하면 Reflow 횟수를 줄일 수 있다.

```js
// 나쁨 — 루프마다 DOM 삽입 → Reflow 반복
items.forEach((item) => {
  const li = document.createElement("li");
  li.textContent = item;
  ul.appendChild(li); // 매번 Reflow
});

// 좋음 — Fragment에 모아서 한 번에 삽입
const fragment = document.createDocumentFragment();
items.forEach((item) => {
  const li = document.createElement("li");
  li.textContent = item;
  fragment.appendChild(li);
});
ul.appendChild(fragment); // Reflow 1회
```

<br/>

### will-change

특정 요소에 곧 변경이 있을 것임을 브라우저에 알려 **미리 레이어를 분리**시킨다. 애니메이션 시작 전 적용하고, 끝나면 해제하는 것이 이상적이다.

```css
/* 애니메이션 전에 힌트 제공 */
.animating {
  will-change: transform;
}
```

남용하면 오히려 메모리 소모가 커지므로, 실제로 복잡한 애니메이션이 있는 요소에만 적용한다.

<br/>

---

## 전체 흐름 정리

```
URL 입력
  ↓
HTML 수신 → 파싱 → DOM 생성
              ↓ (script 태그 만나면 중단)
CSS 수신 → 파싱 → CSSOM 생성
              ↓
         Render Tree 생성
              ↓
           Layout (Reflow)
              ↓
            Paint
              ↓
          Composite
              ↓
          화면 출력

JS 엔진 내부:
소스코드 → 파싱 → AST → Ignition(바이트코드) → TurboFan(기계어)
                                    ↑ Deoptimization 시 복귀
```

브라우저 렌더링과 JS 엔진 동작을 이해하면, 막연하게 "느리다"고 느끼던 문제들이 **어느 단계에서 병목이 발생하는지** 구체적으로 보이기 시작한다.

성능 최적화는 측정 없이 시작하지 않는다. Chrome DevTools의 **Performance 탭**으로 Reflow/Paint/Scripting 시간을 먼저 확인하고, 병목 지점에 집중하는 것이 효과적이다.
