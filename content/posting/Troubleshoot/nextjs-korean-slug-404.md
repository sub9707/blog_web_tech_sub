---
title: "Next.js 한글 슬러그 404 트러블슈팅"
date: "2026-05-26"
description: "Next.js App Router에서 한글 타이틀 기반 슬러그로 라우팅 시 404가 발생한 원인과 해결 과정 정리"
tags: ["troubleshoot", "nextjs", "routing", "nginx", "docker"]
---

## 배경

Next.js 16 App Router 기반 블로그를 구축하던 중, 마크다운 파일의 타이틀을 기반으로 URL 슬러그를 생성하는 방식으로 포스트 라우팅을 구현했다.

슬러그 생성 함수 `slugify()`는 타이틀에서 공백을 `-`로 치환하는 단순한 로직이었다.

```ts
// lib/markdown.ts
export function slugify(text: string): string {
  return text
    .trim()
    .replace(/[?#&=+/\\%<>'"]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

예를 들어 `TypeScript 제네릭 실전 가이드` 라는 타이틀은 `TypeScript-제네릭-실전-가이드`라는 슬러그가 되고, URL은 아래와 같다.

```
/posts/TypeScript/TypeScript-제네릭-실전-가이드
```

로컬에서 링크를 클릭하면 브라우저 주소창에는 인코딩된 URL이 표시된다.

```
/posts/TypeScript/TypeScript-%EC%A0%9C%EB%84%A4%EB%A6%AD-%EC%8B%A4%EC%A0%84-%EA%B0%80%EC%9D%B4%EB%93%9C
```

<br/>

## 문제

해당 URL로 접근하면 **404**가 반환됐다.

로컬에서 `next dev`를 돌려도, 프로덕션 Docker 환경에서도 동일하게 404.

<br/>

## 원인 분석

### 1. params 인코딩 문제

`[category]/[slug]/page.tsx` 에서 params를 받아 `getPost(category, slug)`를 호출한다.

```ts
const { category, slug } = await params;
const post = await getPost(category, slug);
```

`getPost` 내부에서는 마크다운 파일을 읽고 타이틀을 `slugify()`로 변환해 `slug`와 비교했다.

```ts
if (slugify(title) === slug) { ... }
```

여기서 핵심 문제가 있다.

브라우저가 URL에 한글이 포함된 경우, 네트워크 요청 시 자동으로 퍼센트 인코딩한다.

```
TypeScript-제네릭-실전-가이드
→ TypeScript-%EC%A0%9C%EB%84%A4%EB%A6%AD-%EC%8B%A4%EC%A0%84-%EA%B0%80%EC%9D%B4%EB%93%9C
```

Next.js 16에서는 이 인코딩된 값이 `params.slug`로 그대로 넘어오는 경우가 있다.

반면 `slugify(title)`은 항상 디코딩된 한글 문자열을 반환한다.

결국 비교하는 두 값이 달라져 `getPost`가 `null`을 반환하고, 페이지에서 `notFound()`가 호출된다.

```
slugify("TypeScript 제네릭 실전 가이드")
→ "TypeScript-제네릭-실전-가이드"

params.slug (Next.js 16에서 실제로 넘어온 값)
→ "TypeScript-%EC%A0%9C%EB%84%A4%EB%A6%AD-%EC%8B%A4%EC%A0%84-%EA%B0%80%EC%9D%B4%EB%93%9C"

"TypeScript-제네릭-실전-가이드" === "TypeScript-%EC%A0%9C..." → false
```

<br/>

## 해결 과정

### getPost에서 slug를 먼저 디코딩

`params.slug`가 인코딩 상태로 넘어올 수 있으니, 비교 전에 `decodeURIComponent()`로 먼저 디코딩한다.

```ts
// services/posts/getPost.ts
export async function getPost(category: string, slug: string): Promise<Post | null> {
  const categoryDir = path.join(CONTENT_DIR, category);
  if (!fs.existsSync(categoryDir)) return null;

  const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.md'));

  const decodedSlug = decodeURIComponent(slug); // 핵심 수정

  for (const file of files) {
    const filePath = path.join(categoryDir, file);
    const source = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(source);
    const title = data.title ?? file.replace(/\.md$/, '');

    if (slugify(title) === decodedSlug) { // 디코딩된 값과 비교
      return {
        slug: decodedSlug,
        category,
        title,
        ...
      };
    }
  }

  return null;
}
```

`decodeURIComponent()`는 이미 디코딩된 문자열에는 아무 영향을 주지 않으므로, 로컬과 프로덕션 환경 모두에서 안전하게 동작한다.

이후 `next build`에서 정적 생성 경로 확인:

```
● /posts/[category]/[slug]
  ├ /posts/TypeScript/TypeScript-제네릭-실전-가이드
  ├ /posts/Javascript/클로저(Closure)-완벽-이해
  ├ /posts/React/React-Hooks-완전-정복
  └ [+3 more paths]
```

로컬에서는 정상 동작 확인.

<br/>

## 정리

| 구분 | 내용 |
|------|------|
| 원인 | Next.js 16에서 한글 URL params가 퍼센트 인코딩된 채로 넘어와 slugify 결과와 불일치 |
| 해결 | `getPost`에서 `decodeURIComponent(slug)` 처리 후 비교 |

<br/>

- **비 ASCII 문자(한글, 중국어 등)를 URL에 포함할 경우** 항상 퍼센트 인코딩을 고려해야 한다. 서버에서 params를 받을 때는 `decodeURIComponent()`를 습관적으로 적용하거나, 처음부터 ASCII 기반 슬러그(파일명 등)를 사용하는 것이 안전하다.

