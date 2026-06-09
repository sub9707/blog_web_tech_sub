---
title: "JavaScript 모든 파싱을 알아보자"
date: "2026-01-31"
description: "parseInt부터 JSON.parse, URL, DOMParser, TextDecoder까지. JS에서 '읽고 변환'하는 함수들을 전부 알아보았다."
tags: ["javascript", "parsing", "JSON", "URL", "fetch", "DOMParser"]
thumbnail: "/assets/thumbnails/js-parsing-functions.png"
---

어딘가에서 데이터가 들어오고, 그걸 쓸 수 있는 형태로 바꾸는 가공의 시간이 항상 찾아온다.

문자열에서 숫자를 뽑거나, API 응답을 객체로 바꾸거나, URL에서 쿼리스트링을 꺼내거나.

이 모든 작업이 파싱이다.

JavaScript에는 생각보다 많은 파싱 함수와 API가 있다. 한 번에 정리해보자.

<br/>

## 숫자 파싱

### parseInt

문자열을 정수로 변환한다.

```js
parseInt("42");        // 42
parseInt("42.9");      // 42 — 소수점 이하 버림
parseInt("42px");      // 42 — 숫자 아닌 문자 나오면 중단
parseInt("px42");      // NaN — 시작이 숫자가 아니면
parseInt("  42  ");    // 42 — 앞 공백은 무시
parseInt("");          // NaN
```

두 번째 인자로 진법(radix)을 지정할 수 있다.

```js
parseInt("ff", 16);    // 255 — 16진수
parseInt("11", 2);     // 3  — 2진수
parseInt("17", 8);     // 15 — 8진수
parseInt("42", 10);    // 42 — 10진수 (명시 권장)
```

**radix를 항상 명시하는 게 좋다.** 생략하면 "0x"로 시작하는 문자열을 16진수로 해석하는 등 예상치 못한 동작이 생길 수 있다.

```js
parseInt("010");    // 브라우저마다 8 또는 10 — 명시하지 않으면 위험
parseInt("010", 10); // 10 — 명확
```

<br/>

### parseFloat

문자열을 부동소수점 숫자로 변환한다.

```js
parseFloat("3.14");       // 3.14
parseFloat("3.14abc");    // 3.14 — 숫자 이후 문자 무시
parseFloat(".5");         // 0.5
parseFloat("1e3");        // 1000 — 지수 표기 지원
parseFloat("Infinity");   // Infinity
parseFloat("abc");        // NaN
```

`parseInt`와 다르게 진법 인자가 없다. 항상 10진수로 파싱한다.

<br/>

### Number()

더 엄격한 숫자 변환이다.

```js
Number("42");       // 42
Number("42.5");     // 42.5
Number("42px");     // NaN — parseInt와 달리 중간에 문자 있으면 NaN
Number("");         // 0  — 빈 문자열은 0
Number("  ");       // 0  — 공백만 있어도 0
Number(true);       // 1
Number(false);      // 0
Number(null);       // 0
Number(undefined);  // NaN
Number("0xff");     // 255 — 16진수 리터럴 지원
```

`parseInt("42px")`는 `42`를 반환하지만 `Number("42px")`는 `NaN`이다.

어떤 걸 쓸지는 용도에 따라 다르다.

- 단위가 붙은 CSS 값 파싱 → `parseInt` / `parseFloat`
- 폼 입력값 검증 → `Number()` (더 엄격)

<br/>

### Number.isNaN vs isNaN

```js
isNaN("hello");         // true  — 문자열을 숫자로 변환 시도 후 NaN이면 true
isNaN(undefined);       // true  — undefined도 NaN 취급
isNaN(NaN);             // true

Number.isNaN("hello");  // false — 타입 변환 없음, 실제로 NaN인지만 확인
Number.isNaN(undefined);// false
Number.isNaN(NaN);      // true
```

`isNaN`은 타입 변환이 일어나서 예상과 다른 결과가 나온다.

`Number.isNaN`이 더 예측 가능하다.

<br/>

### Number.parseInt, Number.parseFloat

`parseInt`, `parseFloat`와 동일한 함수다. `Number` 네임스페이스에도 있다.

```js
Number.parseInt === parseInt;   // true
Number.parseFloat === parseFloat; // true
```

모듈화된 코드에서 전역 함수 대신 `Number.parseInt`를 쓰는 스타일도 있다.

![parseInt / parseFloat / Number() 비교표](/assets/Javascript/number-parse.png)

<br/>

## JSON 파싱

### JSON.parse

JSON 문자열을 JavaScript 값으로 변환한다.

```js
JSON.parse('{"name":"Kim","age":30}');
// { name: "Kim", age: 30 }

JSON.parse('[1, 2, 3]');
// [1, 2, 3]

JSON.parse('"hello"');
// "hello"

JSON.parse('42');
// 42

JSON.parse('true');
// true
```

잘못된 JSON이면 `SyntaxError`를 던진다. 반드시 try-catch로 감싸야 한다.

```js
try {
  const data = JSON.parse(text);
} catch (e) {
  console.error("유효하지 않은 JSON:", e.message);
}
```

<br/>

### reviver 함수

두 번째 인자로 reviver를 넘기면 각 키/값 쌍을 변환할 수 있다.

```js
const json = '{"name":"Kim","createdAt":"2024-01-15T00:00:00Z"}';

const data = JSON.parse(json, (key, value) => {
  if (key === "createdAt") {
    return new Date(value); // 문자열 → Date 객체로 변환
  }
  return value;
});

data.createdAt instanceof Date; // true
```

API 응답의 날짜 문자열을 `Date` 객체로 자동 변환할 때 유용하다.

<br/>

### JSON.stringify

JavaScript 값을 JSON 문자열로 변환한다. 파싱의 반대 방향이지만 함께 알아야 한다.

```js
JSON.stringify({ name: "Kim", age: 30 });
// '{"name":"Kim","age":30}'

JSON.stringify({ name: "Kim", age: 30 }, null, 2);
// 들여쓰기 2칸
// {
//   "name": "Kim",
//   "age": 30
// }
```

JSON으로 직렬화할 수 없는 값은 무시된다.

```js
JSON.stringify({
  name: "Kim",
  fn: () => {},      // 함수 — 제거됨
  sym: Symbol("s"),  // Symbol — 제거됨
  undef: undefined,  // undefined — 제거됨
});
// '{"name":"Kim"}'
```

**replacer 함수**로 직렬화 방식을 커스텀할 수 있다.

```js
const obj = { name: "Kim", password: "secret123", age: 30 };

JSON.stringify(obj, (key, value) => {
  if (key === "password") return undefined; // 비밀번호 제외
  return value;
});
// '{"name":"Kim","age":30}'
```

<br/>

## URL 파싱

### URL 클래스

URL 문자열을 구조화된 객체로 파싱한다.

```js
const url = new URL("https://example.com:8080/posts?page=2&tag=js#section1");

url.protocol;   // "https:"
url.hostname;   // "example.com"
url.port;       // "8080"
url.pathname;   // "/posts"
url.search;     // "?page=2&tag=js"
url.hash;       // "#section1"
url.host;       // "example.com:8080"
url.origin;     // "https://example.com:8080"
```

상대 URL도 파싱할 수 있다.

```js
const url = new URL("/posts/123", "https://example.com");
url.href; // "https://example.com/posts/123"
```

<br/>

### URLSearchParams

쿼리스트링을 파싱하고 다루는 API다.

```js
const params = new URLSearchParams("page=2&tag=js&tag=react");

params.get("page");       // "2"
params.get("tag");        // "js" — 첫 번째 값
params.getAll("tag");     // ["js", "react"] — 전부
params.has("page");       // true
params.has("sort");       // false

// 순회
for (const [key, value] of params) {
  console.log(key, value);
}
// page 2
// tag js
// tag react
```

`URL` 객체와 함께 쓰는 경우가 많다.

```js
const url = new URL("https://example.com/posts?page=2&tag=js");
url.searchParams.get("page"); // "2"
url.searchParams.set("page", "3");
url.href; // "https://example.com/posts?page=3&tag=js"
```

Next.js에서 `searchParams`를 다룰 때 자주 쓰게 된다.

```js
// 쿼리스트링 직접 만들기
const params = new URLSearchParams();
params.append("page", "1");
params.append("limit", "20");
params.append("tag", "js");
params.toString(); // "page=1&limit=20&tag=js"

fetch(`/api/posts?${params}`);
```

![URL 파싱 구조도](/assets/Javascript/url-parsing.png)

<br/>

## fetch API 응답 파싱

`fetch`의 `Response` 객체는 여러 파싱 메서드를 제공한다.

```js
const res = await fetch("/api/data");
```

<br/>

### response.json()

JSON 응답을 파싱한다. 가장 많이 쓰는 메서드.

```js
const data = await res.json();
```

내부적으로 `res.text()`를 먼저 읽고 `JSON.parse()`를 적용한다.

응답이 JSON이 아닌 경우 `SyntaxError`를 던진다.

<br/>

### response.text()

응답을 문자열로 읽는다.

```js
const html = await res.text();
const csv = await res.text();
```

HTML 파싱이나 CSV 처리, 일반 텍스트 응답에 쓴다.

<br/>

### response.blob()

응답을 `Blob`으로 읽는다. 이미지, 파일 다운로드에 쓴다.

```js
const blob = await res.blob();
const imageUrl = URL.createObjectURL(blob);
```

<br/>

### response.arrayBuffer()

응답을 `ArrayBuffer`로 읽는다. 바이너리 데이터 처리에 쓴다.

```js
const buffer = await res.arrayBuffer();
const view = new DataView(buffer);
```

<br/>

### response.formData()

응답을 `FormData`로 읽는다. `multipart/form-data` 응답 처리에 쓴다.

```js
const formData = await res.formData();
formData.get("username");
```

<br/>

**주의:** `Response` 바디는 한 번만 읽을 수 있다.

```js
const res = await fetch("/api/data");
await res.json(); // 읽음
await res.text(); // TypeError: body is already used
```

두 번 읽어야 한다면 `res.clone()`을 써야 한다.

```js
const res = await fetch("/api/data");
const clone = res.clone();

const json = await res.json();
const text = await clone.text();
```

![fetch Response 파싱 메서드 비교](/assets/Javascript/response-parsing.png)

<br/>

## 날짜 파싱

### Date.parse

날짜 문자열을 Unix 타임스탬프(밀리초)로 변환한다.

```js
Date.parse("2024-01-15");                    // 1705276800000
Date.parse("2024-01-15T12:00:00Z");          // 1705320000000
Date.parse("January 15, 2024");             // 브라우저마다 다름
```

`NaN`을 반환하면 유효하지 않은 날짜 문자열이다.

ISO 8601 형식(`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ssZ`) 외의 형식은 파싱 결과가 브라우저마다 다를 수 있다.

<br/>

### new Date(string)

날짜 문자열로 `Date` 객체를 만든다.

```js
new Date("2024-01-15");
new Date("2024-01-15T12:00:00Z");
new Date("2024-01-15T12:00:00+09:00"); // 타임존 포함
```

내부적으로 `Date.parse`를 쓴다.

API 응답에서 날짜 문자열을 받으면 `new Date()`로 변환해서 쓰는 경우가 많다.

```js
const post = await res.json();
const createdAt = new Date(post.createdAt);
createdAt.getFullYear(); // 2024
```

**날짜 문자열 포맷 주의:** `"2024-01-15"`는 UTC 기준으로 파싱된다. 로컬 시간 기준이 필요하면 `"2024-01-15T00:00:00"`처럼 시간을 명시해야 한다.

<br/>

## 문자열 파싱

### split

문자열을 구분자로 나눈다.

```js
"a,b,c".split(",");          // ["a", "b", "c"]
"2024-01-15".split("-");     // ["2024", "01", "15"]
"hello".split("");           // ["h", "e", "l", "l", "o"]
"a,,b".split(",");           // ["a", "", "b"] — 빈 문자열도 포함
```

두 번째 인자로 최대 개수를 제한할 수 있다.

```js
"a,b,c,d".split(",", 2);    // ["a", "b"]
```

정규식도 사용 가능하다.

```js
"camelCaseString".split(/(?=[A-Z])/);
// ["camel", "Case", "String"]
```

<br/>

### match / matchAll

정규식으로 문자열을 파싱한다.

```js
// 첫 번째 매칭
"price: $42.5".match(/\$[\d.]+/);
// ["$42.5", index: 7, ...]

// 캡처 그룹
"2024-01-15".match(/(\d{4})-(\d{2})-(\d{2})/);
// ["2024-01-15", "2024", "01", "15", ...]

// g 플래그로 전체 매칭
"a1 b2 c3".match(/[a-z]\d/g);
// ["a1", "b2", "c3"]
```

`matchAll`은 모든 매칭 결과를 이터레이터로 반환한다. 캡처 그룹과 함께 쓸 때 유용하다.

```js
const str = "color: #ff0000; background: #00ff00;";
const regex = /#([0-9a-f]{6})/gi;

for (const match of str.matchAll(regex)) {
  console.log(match[0]); // "#ff0000", "#00ff00"
  console.log(match[1]); // "ff0000", "00ff00" — 캡처 그룹
}
```

<br/>

### 이름 있는 캡처 그룹

```js
const dateStr = "2024-01-15";
const { groups } = dateStr.match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);

groups.year;  // "2024"
groups.month; // "01"
groups.day;   // "15"
```

인덱스 대신 이름으로 접근할 수 있어 가독성이 높아진다.

<br/>

## 바이너리 파싱

### TextDecoder / TextEncoder

바이너리 데이터를 문자열로, 문자열을 바이너리로 변환한다.

```js
// ArrayBuffer → 문자열
const decoder = new TextDecoder("utf-8");
const text = decoder.decode(buffer);

// 문자열 → Uint8Array
const encoder = new TextEncoder();
const bytes = encoder.encode("hello");
// Uint8Array [104, 101, 108, 108, 111]
```

WebSocket 바이너리 메시지, 파일 읽기 등에서 쓰인다.

```js
const ws = new WebSocket("wss://example.com");
ws.binaryType = "arraybuffer";

ws.onmessage = (event) => {
  const decoder = new TextDecoder();
  const text = decoder.decode(event.data);
};
```

<br/>

### DataView

`ArrayBuffer`를 바이트 단위로 읽고 쓴다.

```js
const buffer = new ArrayBuffer(4);
const view = new DataView(buffer);

view.setUint8(0, 0x41);  // 첫 번째 바이트에 0x41 ('A') 쓰기
view.getUint8(0);         // 65

// 다양한 타입으로 읽기
view.getInt16(0);         // 2바이트 정수
view.getFloat32(0);       // 4바이트 부동소수점
```

네트워크 프로토콜, 파일 포맷 파싱 등 바이트 단위 제어가 필요할 때 쓴다.

<br/>

## DOM 파싱

### DOMParser

HTML 또는 XML 문자열을 파싱해서 DOM 트리를 만든다.

```js
const parser = new DOMParser();

// HTML 파싱
const doc = parser.parseFromString("<h1>Hello</h1><p>World</p>", "text/html");
doc.querySelector("h1").textContent; // "Hello"

// XML 파싱
const xmlDoc = parser.parseFromString("<root><item>1</item></root>", "application/xml");
xmlDoc.querySelector("item").textContent; // "1"

// SVG 파싱
const svgDoc = parser.parseFromString("<svg>...</svg>", "image/svg+xml");
```

서버에서 HTML 문자열을 받아 특정 요소를 뽑아낼 때 쓴다.

```js
const html = await fetch("/page").then((r) => r.text());
const doc = new DOMParser().parseFromString(html, "text/html");
const title = doc.querySelector("title").textContent;
```

<br/>

### XMLSerializer

DOM 트리를 다시 문자열로 직렬화한다. `DOMParser`의 반대 방향.

```js
const serializer = new XMLSerializer();
const str = serializer.serializeToString(document.querySelector("svg"));
```

<br/>

## 인코딩/디코딩

### atob / btoa

Base64 인코딩과 디코딩이다.

```js
btoa("hello");          // "aGVsbG8="
atob("aGVsbG8=");       // "hello"
```

API 응답에서 Base64 인코딩된 이미지나 파일을 다룰 때 자주 쓴다.

```js
// Base64 이미지 → Blob
const base64 = "iVBORw0KGgo...";
const binary = atob(base64);
const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
const blob = new Blob([bytes], { type: "image/png" });
```

한국어 등 비ASCII 문자는 `btoa`로 직접 인코딩할 수 없다. `TextEncoder`와 조합해야 한다.

```js
// 올바른 한국어 Base64 인코딩
function encodeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}
```

<br/>

### encodeURIComponent / decodeURIComponent

URL에 포함될 수 없는 문자를 인코딩/디코딩한다.

```js
encodeURIComponent("한국어 검색");
// "%ED%95%9C%EA%B5%AD%EC%96%B4%20%EA%B2%80%EC%83%89"

decodeURIComponent("%ED%95%9C%EA%B5%AD%EC%96%B4%20%EA%B2%80%EC%83%89");
// "한국어 검색"

// 쿼리스트링에 사용
const query = encodeURIComponent("TypeScript 입문");
fetch(`/api/search?q=${query}`);
```

`encodeURI`는 URL 전체를 인코딩하고, `encodeURIComponent`는 쿼리 파라미터처럼 URL의 일부를 인코딩한다. 대부분의 경우 `encodeURIComponent`가 맞다.

<br/>

## API 응답 실전 파싱

실무에서 API 응답을 받아 쓸 때의 패턴.

### 날짜 자동 변환

```js
function parseApiResponse(json) {
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  return JSON.parse(json, (key, value) => {
    if (typeof value === "string" && ISO_DATE.test(value)) {
      return new Date(value);
    }
    return value;
  });
}
```

JSON reviver로 ISO 날짜 문자열을 `Date` 객체로 자동 변환한다.

<br/>

### 중첩 JSON 문자열

API가 JSON 안에 JSON 문자열을 담아 보내는 경우가 있다.

```js
// API 응답
{
  "id": 1,
  "metadata": "{\"tags\":[\"js\",\"react\"],\"views\":100}"
}
```

```js
const data = await res.json();
const metadata = JSON.parse(data.metadata);
metadata.tags; // ["js", "react"]
```

<br/>

### 숫자 문자열 변환

API 응답에서 숫자가 문자열로 오는 경우.

```js
// API가 { "count": "42", "price": "3.14" } 를 보낼 때
const { count, price } = await res.json();

Number(count);         // 42
parseFloat(price);     // 3.14
parseInt(count, 10);   // 42
+count;                // 42 — 단항 + 연산자도 숫자 변환
```

<br/>

### CSV 파싱

라이브러리 없이 간단한 CSV를 파싱할 때.

```js
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
}

const csv = `name,age,email
Kim,30,kim@example.com
Lee,25,lee@example.com`;

parseCSV(csv);
// [
//   { name: "Kim", age: "30", email: "kim@example.com" },
//   { name: "Lee", age: "25", email: "lee@example.com" },
// ]
```

따옴표나 개행이 포함된 필드는 직접 구현이 복잡해진다. 그런 경우엔 `papaparse` 같은 라이브러리를 쓰는 게 낫다.

<br/>

## 정리

| 함수 / API | 입력 | 출력 | 용도 |
|-----------|------|------|------|
| `parseInt(str, radix)` | 문자열 | 정수 | 정수 변환, 진법 변환 |
| `parseFloat(str)` | 문자열 | 부동소수점 | 소수 변환 |
| `Number(str)` | 문자열 | 숫자 | 엄격한 숫자 변환 |
| `JSON.parse(str, reviver?)` | JSON 문자열 | 객체/배열 | API 응답, 설정 파일 |
| `JSON.stringify(val, replacer?)` | 값 | JSON 문자열 | 직렬화 |
| `new URL(str)` | URL 문자열 | URL 객체 | URL 분해 |
| `new URLSearchParams(str)` | 쿼리스트링 | 파라미터 객체 | 쿼리스트링 파싱/생성 |
| `Date.parse(str)` | 날짜 문자열 | 타임스탬프 | 날짜 변환 |
| `response.json()` | fetch 응답 | 객체 | API 응답 파싱 |
| `response.text()` | fetch 응답 | 문자열 | HTML, CSV 응답 |
| `response.blob()` | fetch 응답 | Blob | 파일, 이미지 다운로드 |
| `response.arrayBuffer()` | fetch 응답 | ArrayBuffer | 바이너리 데이터 |
| `str.match(regex)` | 문자열 + 정규식 | 매칭 결과 | 패턴 추출 |
| `new DOMParser()` | HTML/XML 문자열 | Document | HTML 파싱 |
| `new TextDecoder()` | ArrayBuffer | 문자열 | 바이너리 → 텍스트 |
| `atob(str)` | Base64 문자열 | 디코딩된 문자열 | Base64 디코딩 |
| `decodeURIComponent(str)` | 인코딩된 URL | 원본 문자열 | URL 디코딩 |
