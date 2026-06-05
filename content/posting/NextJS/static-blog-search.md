---
title: "정적 블로그에 검색 기능 구현하기 — 빌드 타임 인덱스 + Fuse.js"
date: "2026-06-06"
description: "서버 없이 Next.js 정적 블로그에 전문 검색을 붙이는 방법. API Route, Algolia, 빌드 타임 인덱스를 비교하고 최적화 과정에서 발생한 문제들을 기록한다."
tags: ["nextjs", "search", "fuse.js", "performance", "static-site"]
---

이 블로그에 검색 기능을 붙이려고 했을 때, 처음 든 생각은 "뭘로 검색하지?"였다.

보통 검색은 DB가 있는 환경에서 자연스럽게 해결된다. <br/>
쿼리 한 줄이면 된다. <br/>
그런데 요 블로그는 DB가 없다.<br/>
포스트는 전부 public 아래에 있는 md 파일이고, 여기서 끌어와 렌더링하는 구조다.

DB가 없으니 검색 인덱스도 어딘가에 파일로 두면 된다고 생각했다. <br/>
`public/`에 JSON으로 뽑아두면 정적 에셋으로 서빙되고, 클라이언트에서 fetch해서 쓰면 된다. <br/>
그 방향으로 접근하니 선택지가 좁혀졌다.

이 포스팅은 그 과정에서 고민했던 것들, 최종적으로 빌드 타임 인덱스 + Fuse.js를 선택한 이유, 구현 흐름, 그리고 중간에 발생한 문제들을 기록한다.

<br />

## 어떤 방식이 있나

### 1. API Route 방식

```txt
사용자 검색
→ /api/search?q=keyword 요청
→ 서버에서 md 파일 읽기
→ 결과 반환
```

요청마다 서버에서 파일을 읽고 파싱한다. 항상 최신 데이터를 보장한다는 장점이 있지만, 요청이 올 때마다 파일 읽기가 발생한다.

포스트가 많아질수록 느려지고, Vercel 같은 서버리스 환경에선 콜드 스타트(함수가 처음 실행될 때 초기화 시간)도 고려해야 한다.

### 2. Algolia / 외부 검색 서비스

완성도 높은 전문 검색 엔진을 외부 서비스로 붙이는 방식이다. 형태소 분석(단어를 의미 단위로 쪼개서 검색), 동의어 처리, 오타 교정까지 지원한다.

다만 기술 블로그 수준에선 명백한 오버엔지니어링이다. 무료 플랜 한계도 있고, 외부 의존성이 생긴다.

### 3. 빌드 타임 인덱스 + 클라이언트 검색

```txt
빌드 시
md 파일 → 파싱 → search-index.json 생성

런타임
페이지 마운트 → JSON fetch → 메모리에 올려두고 검색
```

서버 요청이 없다. <br/>
JSON을 한 번 받아두면 이후 검색은 전부 클라이언트에서 처리된다. <br/>
브라우저 캐시도 활용된다.

<br />

## 왜 빌드 타임 인덱스를 선택했나

비교하면 이렇게 정리된다.

| 방식 | 서버 비용 | 응답 속도 | 구현 복잡도 | 실시간 반영 |
|------|-----------|-----------|-------------|-------------|
| API Route | 요청마다 발생 | 느림 | 중간 | 가능 |
| Algolia | 외부 의존 | 빠름 | 높음 | 가능 |
| 빌드 타임 인덱스 | 없음 | 빠름 | 낮음 | 배포 시 |

기술 블로그는 포스트 수가 많지 않고, 글이 올라가면 배포가 따라온다.
실시간 반영이 없어도 무방하다.

<br />

서버 비용 0, 즉각 응답, 구현이 단순한 빌드 타임 인덱스가 이 상황에 가장 맞는 선택이다.

<br />

## 구현 구조

```txt
scripts/
  build-search-index.js     ← 빌드 시 실행되는 Node.js 스크립트

public/
  search-index.json         ← 생성된 검색 인덱스

src/
  types/
    search.ts               ← SearchItem 타입
  features/
    search/
      SearchClient.tsx      ← 검색 UI + Fuse.js 검색 로직
      SearchResultItem.tsx  ← 개별 결과 카드 + 하이라이트
  app/
    search/
      page.tsx              ← Server Component 래퍼
```

Server Component가 검색 페이지의 껍데기를 담당하고, 인터랙션이 필요한 부분만 Client Component로 분리했다.

<br />

## 검색 인덱스 생성

`scripts/build-search-index.js`는 `content/posting` 디렉토리를 순회하며 md 파일을 파싱한다.

```js
const { data } = matter(source);

index.push({
  slug: slugify(title),
  category,
  title,
  date: data.date ?? '',
  description: data.description ?? '',
  tags: data.tags ?? [],
});
```

`gray-matter`는 마크다운 파일 상단 `---`로 감싼 메타데이터(frontmatter)를 파싱해주는 라이브러리다. <br/>
여기선 title, date, description, tags만 꺼내면 되니까 `data`만 쓴다. 본문은 인덱스에 포함하지 않는다.

빌드 시에는 `prebuild` 훅으로 자동 실행된다.

```json
{
  "scripts": {
    "build:index": "node scripts/build-search-index.js",
    "prebuild": "npm run build:index",
    "build": "next build"
  }
}
```

dev 환경에서는 `concurrently`로 next dev와 watch 모드를 함께 띄운다.

```json
{
  "dev": "concurrently \"next dev\" \"node scripts/build-search-index.js --watch\""
}
```

스크립트에 `--watch` 플래그를 주면 Node.js 내장 `fs.watch`로 `content/posting`을 감시한다.
md 파일이 생성되거나 수정되면 300ms debounce 후 인덱스를 자동으로 재빌드한다.

```js
if (process.argv.includes('--watch')) {
  let debounceTimer = null;
  fs.watch(CONTENT_DIR, { recursive: true }, (_, filename) => {
    if (!filename?.endsWith('.md')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      build();
    }, 300);
  });
}
```

외부 패키지 없이 Node.js 내장만 사용했다. <br/>
`concurrently`는 두 프로세스를 같은 터미널에서 병렬로 실행하기 위해서만 추가했다.

<br />

## Fuse.js로 검색

Fuse.js는 자바스크립트 퍼지 검색 라이브러리다. <br/>
퍼지 검색이란 정확히 일치하지 않아도 비슷한 결과를 찾아주는 방식으로, 오타가 있어도 어느 정도 찾아준다.

```ts
const FUSE_OPTIONS: IFuseOptions<SearchItem> = {
  keys: [
    { name: 'title', weight: 0.6 },
    { name: 'tags', weight: 0.3 },
    { name: 'description', weight: 0.1 },
  ],
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.35,
  minMatchCharLength: 2,
};
```

`weight`로 필드별 검색 우선순위를 지정했다. 제목 매칭이 가장 높고, 태그, 설명 순이다.

`includeMatches: true`는 매칭된 위치의 인덱스 정보를 같이 반환해준다. 하이라이팅에 이걸 사용한다.

<br />

## 성능 최적화

### 1. Fuse.js 동적 임포트

Fuse.js는 초기 페이지 로드에 필요하지 않다. Search 페이지에 진입했을 때만 필요하다.

```ts
Promise.all([
  import('fuse.js'),                                          // 동적 임포트
  fetch('/search-index.json').then(r => r.json()),
]).then(([{ default: Fuse }, data]) => {
  fuseRef.current = new Fuse(data, FUSE_OPTIONS);
  setReady(true);
});
```

`import('fuse.js')`로 번들에서 분리해 초기 JS 크기를 줄인다.
검색 인덱스 fetch와 Fuse.js 로드를 `Promise.all`로 병렬 처리해서 대기 시간도 최소화했다.

<!-- 이미지: Chrome DevTools Network 탭에서 search-index.json과 fuse.js 청크가 동시에 로드되는 모습 캡처 -->

### 2. 검색 debounce

debounce는 연속으로 이벤트가 발생할 때 마지막 이벤트만 처리하는 기법이다. <br/>
적용하지 않으면 키 입력마다 검색이 실행된다.

```ts
const t = setTimeout(() => {
  const fuseResults = fuseRef.current!.search(query, { limit: 20 });
  // ...
}, 250);
return () => clearTimeout(t);
```

250ms debounce로 타이핑이 멈춘 뒤에만 검색이 실행되도록 했다.

### 3. Fuse 인스턴스를 ref로 유지

Fuse 인스턴스는 `useState`가 아닌 `useRef`로 관리한다.
state로 관리하면 인스턴스가 바뀔 때마다 리렌더링이 발생한다.
검색 결과를 state로, Fuse 인스턴스는 ref로 분리하는 게 맞다.

```ts
const fuseRef = useRef<FuseType<SearchItem> | null>(null);
const dataRef = useRef<SearchItem[]>([]);
```

<br />

## 하이라이팅 구현

Fuse.js `includeMatches: true`로 받은 매칭 인덱스를 활용한다.

```ts
function renderHighlighted(text: string, match?: FuseResultMatch) {
  const indices = match?.indices;
  if (!indices?.length) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const [start, end] of indices) {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <span key={start} className="bg-black text-white">
        {text.slice(start, end + 1)}
      </span>,
    );
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}
```

`indices`는 `[start, end][]` 형태다.
텍스트를 순회하면서 매칭 구간은 `bg-black text-white` span으로 감싼다.
regex 없이 O(n)으로 처리된다.

태그는 배열이기 때문에 Fuse가 `arrayIndex`로 어느 태그가 매칭됐는지 알려준다.

```ts
const matchedTagIndices = new Set(
  matches
    ?.filter(m => m.key === 'tags')
    .map(m => (m as FuseResultMatch & { arrayIndex?: number }).arrayIndex) ?? [],
);
```

매칭된 태그는 칩 전체를 반전시킨다.

<!-- 이미지: 검색 결과 화면 캡처 — 제목/설명/태그에 검은 배경 흰 텍스트로 하이라이팅된 모습 -->

<br />

## 발생했던 문제들

### 문제 1 — 본문 전체를 인덱스에 포함했다가 제거

초기에는 본문 전체를 `plainContent`로 인덱스에 포함했다.

```js
plainContent: stripMarkdown(content),
```

의도는 본문 안의 키워드도 검색되게 하는 것이었는데, 생각해보면 기술 블로그에서 그 방식으로 검색하는 경우는 거의 없다. <br/>
대부분 "React", "TypeScript" 같은 주제 키워드로 찾는다. <br/>
title, tags, description 세 필드로 이미 충분히 커버된다.

반면 비용은 명확하다. 포스트가 쌓일수록 `search-index.json`이 계속 커지고, 클라이언트가 매번 그걸 받아야 한다.

**해결:** `plainContent` 제거. 인덱스에는 title, tags, description만 포함한다. 파일 크기가 대폭 줄고 Fuse.js가 처리할 데이터도 줄어든다.

<br />

### 문제 2 — 긴 문장 검색 시 결과가 나오지 않음

"여러 상태가 독립적으로 변한다면 중첩보다 조합이 낫다"처럼 본문에 실제로 존재하는 문장을 검색해도 결과가 나오지 않는 경우가 있었다.

원인은 Fuse.js의 기본 동작이었다. <br/>
Fuse.js는 기본적으로 문자열 앞부분에서 패턴을 찾으려 한다. <br/>
`location` 옵션이 기본값 0이라 앞쪽에서 멀수록 매칭 점수가 낮아지고, threshold를 넘지 못하면 결과에서 제외된다.

**해결 1:** `ignoreLocation: true` 추가

```ts
const FUSE_OPTIONS = {
  // ...
  ignoreLocation: true, // 추가
};
```

문자열 어느 위치에 있든 동일하게 매칭한다.

**해결 2:** `includes()` 폴백 추가

Fuse.js의 퍼지 알고리즘 자체가 긴 패턴에서 실패하는 경우를 대비해, Fuse 결과에 없는 포스트를 `includes()`로 보완한다.

```ts
const fuseResults = fuseRef.current!.search(query, { limit: 20 });
const fuseKeys = new Set(fuseResults.map(r => `${r.item.category}/${r.item.slug}`));

const fallback = exactSearch(dataRef.current, query).filter(
  r => !fuseKeys.has(`${r.item.category}/${r.item.slug}`),
);

setResults([...fuseResults, ...fallback].slice(0, 20));
```

Fuse 결과를 우선 표시하고, 빠진 것만 정확 매칭으로 채운다. <br/>
Fuse 결과와 중복 없이 합쳐진다.

<!-- 이미지: 문제 발생 전후 비교 — 검색어 입력 시 결과가 없는 상태 vs 결과가 나오는 상태 캡처 -->

<br />

### 문제 3 — TypeScript 타입 오류

**오류 1:** `as const`로 선언한 옵션 객체가 Fuse 옵션 타입과 충돌

```
Argument of type '{ readonly keys: readonly [...] }' is not assignable
to parameter of type 'IFuseOptions<SearchItem>'.
Types of property 'keys' are incompatible.
```

`as const`로 선언하면 배열이 `readonly`가 되는데, Fuse가 요구하는 타입은 mutable 배열이었다.

```ts
// 문제
const FUSE_OPTIONS = { keys: [...] } as const;

// 해결
const FUSE_OPTIONS: IFuseOptions<SearchItem> = { keys: [...] };
```

**오류 2:** `FuseResultMatch`에 `arrayIndex` 프로퍼티가 없음

```
Property 'arrayIndex' does not exist on type 'FuseResultMatch'
```

Fuse.js는 배열 필드에 매칭이 있을 때 런타임에 `arrayIndex`를 포함해서 반환하지만, TypeScript 타입 정의에는 없다.

```ts
// 해결
(m as FuseResultMatch & { arrayIndex?: number }).arrayIndex
```

<br />

## 이 방식의 한계

솔직히 말하면 이 방식은 DB를 파일로 흉내낸 것이다.

`search-index.json`이 DB고, Fuse.js가 쿼리 엔진이다. <br/>
빌드 타임에 스냅샷(그 시점의 데이터를 그대로 찍어둔 것)을 만들어두고, 런타임에 그 스냅샷에서 검색한다. <br/>
진짜 DB였다면 당연히 가능한 것들이 여기선 안 된다.

<!-- 이미지: "진짜 DB 검색 흐름 vs 이 방식 흐름" 비교 다이어그램 -->

<br />

### 실시간 반영이 없다

글을 써도 배포 전까지 검색에 잡히지 않는다. <br/>
인덱스는 빌드 시점의 스냅샷이기 때문이다.

<br />

### 본문 검색이 안 된다

인덱스에는 title, tags, description만 들어간다. <br/>
글 내용 안의 특정 문장이나 코드를 검색할 수 없다. <br/>
처음엔 본문 전체를 포함했는데, 인덱스 크기 문제로 결국 제거했다.

<br />

### 포스트가 쌓이면 JSON이 커진다

지금은 괜찮지만 글이 수백 개가 되면 <br/>
클라이언트가 처음 검색할 때 받아야 하는 파일 크기가 부담이 된다.

<br />

### 한국어 퍼지 검색 품질이 낮다

Fuse.js는 영어 기준 알고리즘이고, 한국어 형태소 분석을 하지 않는다. <br/>
"리액트"로 검색했을 때 "React"가 나오게 하려면 별도 처리가 필요하다.

<!-- 이미지: "리액트" 검색 시 결과 없음 vs "React" 검색 시 결과 있음 비교 캡처 -->

<br />

---

그럼에도 이 방식을 선택한 건, 전제 조건이 그렇게 만들었기 때문이다.

DB가 없다. 서버도 없다. <br/>
md 파일이 전부인 정적 블로그에서 선택할 수 있는 방법은 많지 않다. <br/>
API Route를 써도 결국 요청마다 파일을 읽는 방식이고, Algolia 같은 외부 서비스는 이 규모에서 오버엔지니어링이다.

그리고 위에서 나열한 한계들이 이 블로그에서는 실제 문제가 되지 않는다. <br/>
글은 자주 올라오지 않고, 올라오면 배포가 따라온다. <br/>
본문 전체 검색이 필요한 상황도 없다. <br/>
포스트가 수백 개가 될 시점은 한참 나중이다.

지금 규모에서 지금 구조로 가장 단순하게 동작하는 방법이 이것이었다. <br/>
나중에 규모가 달라지면 그때 가서 바꾸면 된다.

<br />

## 최종 흐름 정리

```txt
npm run dev
  → predev 훅: node scripts/build-search-index.js
  → public/search-index.json 생성

사용자 → /search 접근
  → SearchPage (Server Component) 렌더
  → SearchClient (Client Component) 마운트
  → Promise.all: Fuse.js 동적 임포트 + search-index.json fetch (병렬)
  → Fuse 인스턴스 생성, ready = true

사용자 → 검색어 입력
  → 250ms debounce
  → Fuse.js 퍼지 검색 (limit: 20)
  → includes() 폴백으로 누락 보완
  → 결과 렌더 + 하이라이팅
```

<!-- 이미지: 전체 아키텍처 다이어그램 — 빌드 타임(스크립트 → JSON 생성)과 런타임(fetch → Fuse → 결과) 흐름을 구분한 도식 -->

<br />

## 정리

정적 블로그 규모에서 검색 구현의 핵심은 단순함을 유지하면서 사용자 경험을 해치지 않는 것이다.

빌드 타임 인덱스 방식은 서버가 없어도 되고, 응답이 빠르고, 구현이 단순하다. <br/>
단점인 "실시간 반영 불가"는 배포 주기로 커버된다.

Fuse.js의 기본 동작을 그냥 믿으면 안 된다는 것도 이번에 배웠다. <br/>
`ignoreLocation` 하나로 검색 품질이 달라졌고, 퍼지 검색이 실패하는 케이스는 `includes()` 폴백으로 보완하는 것이 현실적이다.
