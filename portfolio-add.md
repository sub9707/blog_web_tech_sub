Portfolio 페이지 추가 기획서 & 구현 프롬프트

1. 목적

기존 subdev.log 기술 블로그 프로젝트에 새로운 /portfolio 페이지를
추가한다.

이번 작업은 기존 프로젝트와 별개의 시스템을 만드는 것이 아니다.

현재 블로그가 Markdown 파일 + Frontmatter/Metadata + 기존 Content 처리
파이프라인을 사용하고 있다면, Portfolio 역시 동일한 콘텐츠 관리
방식을 사용한다.

즉, Portfolio 프로젝트 정보를 TS/JS 파일에 하드코딩하지 않는다.

Markdown
   ↓
기존 Metadata / Frontmatter
   ↓
기존 Content Parser
   ↓
기존 데이터 가공 함수
   ↓
Portfolio 목록 / Carousel / 상세 페이지

가장 중요한 목표는:

기존 코드, 컴포넌트, 함수, 상수, 스타일, 콘텐츠 처리 시스템을 최대한
재활용하면서 최소한의 신규 코드로 Portfolio를 추가하는 것

이다.

2. 최우선 원칙

구현 전에 반드시 기존 프로젝트를 분석한다.

재사용 우선순위는 다음과 같다.

기존 Markdown 콘텐츠 구조

기존 Frontmatter / Metadata 구조

기존 Markdown parser / loader

기존 content 조회 함수

기존 컴포넌트

기존 함수 / utility

기존 변수 / 상수

기존 데이터 타입

기존 스타일 / CSS

기존 스타일 변수 / 디자인 토큰

기존 이미지 처리

기존 라우팅

기존 애니메이션

기존 상태 관리

정말 필요한 부분만 신규 구현

기존에 동일하거나 유사한 기능이 존재한다면 새로 만들지 않는다.

3. 기존 블로그 콘텐츠 시스템 반드시 재사용

현재 블로그 포스팅은 Markdown 파일과 Metadata를 기반으로 관리되고 있다.

Portfolio 역시 동일한 철학으로 구현한다.

기존 시스템 분석

구현 전에 반드시 다음을 찾아본다.

Markdown 파일 위치

Frontmatter 구조

Metadata 타입

Markdown parser

MDX 사용 여부

Content loader

slug 생성 방식

파일 검색 방식

게시물 목록 조회 함수

게시물 상세 조회 함수

날짜 처리

카테고리 처리

이미지 처리

정렬 방식

정적 생성 방식

generateStaticParams

generateMetadata

기존 Post 상세 페이지 구현 방식

중요한 원칙

Portfolio 전용 Markdown parser를 만들지 않는다.

기존 블로그에서 사용하는 parser / loader / metadata 처리 함수가 있다면
반드시 먼저 재사용 가능성을 검토한다.

4. Portfolio도 Markdown + Metadata 방식으로 관리

Portfolio 프로젝트 하나를 하나의 Markdown 문서로 관리한다.

예상 구조는 다음과 같다.

기존 content 구조
      │
      ├── posts/
      │   ├── post-1.md
      │   └── post-2.md
      │
      └── projects/
          ├── project-1.md
          ├── project-2.md
          └── project-3.md

단, 실제 디렉터리 구조는 새롭게 정하지 않는다.

기존 프로젝트의 content 구조와 naming convention을 먼저 확인하고
동일한 패턴을 따른다.

이미 content collection이나 다른 구조가 존재한다면 그 구조를 우선
사용한다.

5. Project Markdown Metadata

Portfolio 프로젝트 Markdown의 Metadata는 기존 블로그 Frontmatter 구조를
최대한 재사용한다.

예시:

---
title: "모두하나대축제 웹 서비스"
description: "공사 현장의 드론 경로와 데이터를 3D 환경에서 시각화한 웹 기반 프로젝트"
date: "2024-11"
category: "행사 / 이벤트용 웹앱"
thumbnail: "/images/projects/project-01.webp"
technologies:
  - Next.js
  - Three.js
  - Cesium
  - TypeScript
featured: true
order: 1
---

# 모두하나대축제 웹 서비스

## 프로젝트 소개

...

## 담당 업무

...

## 주요 기능

...

## 기술적 구현

...

## 결과

...

위 필드는 예시일 뿐이다.

실제 구현에서는 반드시 기존 블로그에서 사용하는 Frontmatter / Metadata
필드를 먼저 확인한다.

기존에 동일한 의미의 필드가 있다면 새 필드를 만들지 않는다.

예를 들어 기존에:

thumbnail:

이 있다면:

projectImage:

를 새로 만들지 않는다.

기존 필드를 재활용한다.

6. Metadata와 본문 역할 분리

Portfolio에서는 Metadata와 Markdown 본문의 역할을 명확하게 분리한다.

Metadata

목록 및 UI에서 빠르게 필요한 정보를 담당한다.

예:

title
description
date
category
thumbnail
technologies
featured
order
slug

단, 실제 필드명은 기존 시스템을 따른다.

Markdown 본문

프로젝트 상세 페이지의 Case Study 콘텐츠를 담당한다.

예:

프로젝트 소개
문제
해결 방법
주요 기능
기술적 구현
아키텍처
성과
회고

즉:

Metadata
   ↓
Portfolio Grid
Arc Carousel
Category Filter
SEO
Project Summary

Markdown Body
   ↓
Project Detail
Case Study
상세 설명
이미지
코드 / 기술 설명

7. Portfolio 목록은 Metadata 기반으로 생성

Portfolio 메인 페이지에서 프로젝트 목록을 별도의 배열로 하드코딩하지
않는다.

금지

const projects = [
  {
    title: "...",
    image: "...",
    category: "...",
  },
  ...
];

기존 Markdown 콘텐츠에서 Metadata를 가져와 생성한다.

개념적으로:

projects/*.md
      ↓
기존 content loader
      ↓
metadata
      ↓
filter
      ↓
sort
      ↓
Portfolio UI

기존 블로그에서 이미 getPosts(), getPostBySlug() 등 유사한 함수를
사용한다면 이를 분석하여 재사용하거나 최소한으로 확장한다.

동일한 content parsing 로직을 다시 작성하지 않는다.

8. Portfolio Category Filter

카테고리 필터 역시 Metadata를 기준으로 동작한다.

카테고리:

전체
행사 / 이벤트용 웹앱
축제 웹사이트
기업 웹사이트
etc

사용자가 카테고리를 선택하면 Markdown Metadata의 category를 기준으로
필터링한다.

가능하면 기존 블로그의 category filtering 함수를 재사용한다.

새로운 filtering utility를 만들지 않는다.

9. Arc Loop Carousel

Portfolio의 핵심 UI는 반원형 Arc Loop Carousel이다.

일반적인 좌우 Carousel이 아니다.

프로젝트 카드가 반원형 궤도를 따라 배치된다.

                    [ CENTER ]
                 ┌─────────────┐
              ╭──│             │──╮
            ╭─╯  │   ACTIVE    │  ╰─╮
          ╭─╯    └─────────────┘    ╰─╮
       [05]                           [02]
    [04]                                 [03]

카드 상태

중앙:

scale: 1
opacity: 1
rotation: 0
z-index: highest

좌우:

scale ↓
opacity ↓
rotation ↑
z-index ↓

카드가 반원형 궤도를 따라 이동하는 느낌을 유지한다.

과도한 3D 효과는 사용하지 않는다.

10. Carousel 데이터 역시 Metadata 기반

Arc Carousel에 들어가는 프로젝트도 별도의 배열을 만들지 않는다.

예:

projects/*.md
      ↓
metadata
      ↓
featured / order / category
      ↓
Arc Carousel

featured가 기존 metadata에 이미 존재한다면 재사용한다.

없다면 기존 metadata 설계를 분석한 후 최소한의 확장만 한다.

Portfolio Carousel을 위해 별도의 프로젝트 데이터 파일을 만드는 것은
금지한다.

11. Featured Project

Carousel의 중앙 프로젝트는 현재 active project다.

Metadata에 Featured 개념이 이미 있다면 그대로 사용한다.

없다면 기존 콘텐츠 정렬 방식과 충돌하지 않는 최소한의 필드 추가를
검토한다.

예:

featured: true

단, 이것은 기존 시스템을 분석한 후 결정한다.

12. Project 상세 페이지

각 Portfolio 프로젝트는 Markdown 기반 상세 페이지를 가진다.

예:

/portfolio/[slug]

실제 route 구조는 기존 프로젝트의 routing convention을 따른다.

상세 페이지는 기존 Blog Post 상세 페이지와 최대한 동일한 콘텐츠 렌더링
구조를 사용한다.

예:

Project Metadata
        ↓
Project Header
        ↓
Markdown Body
        ↓
기존 Markdown Renderer
        ↓
Project Detail

Portfolio 전용 Markdown Renderer를 만들지 않는다.

기존 Blog의 Markdown/MDX renderer를 재활용한다.

13. 상세 페이지 구성

예시:

← PORTFOLIO


모두하나대축제 웹 서비스

행사 / 이벤트용 웹앱

Next.js · Three.js · Cesium · TypeScript

2024.04 — 2024.11


[ HERO IMAGE ]


프로젝트 소개

...


담당 업무

...


주요 기능

...


기술적 구현

...


아키텍처

...


성과

...


회고

이 중 실제 콘텐츠 구조는 Markdown 파일에서 관리한다.

React 컴포넌트에 긴 프로젝트 설명을 직접 작성하지 않는다.

14. 기존 Markdown Renderer 재활용

현재 블로그에서 Markdown을 다음과 같이 처리한다면:

remark

rehype

MDX

custom renderer

syntax highlighting

image component

code block

heading anchor

등을 그대로 재사용한다.

Portfolio 때문에:

PortfolioMarkdownRenderer
ProjectMarkdownRenderer

같은 새로운 renderer를 만들지 않는다.

기존 renderer를 그대로 사용하거나 필요한 경우 최소한의 확장만 한다.

15. 기존 컴포넌트 재활용

다음 컴포넌트가 기존 프로젝트에 있는지 먼저 확인한다.

Header

Navigation

Container

Section

Typography

Button

Link

Image

Tag

Category

Card

Post Card

Content Renderer

Pagination

Footer

기존 컴포넌트가 존재한다면 Portfolio에서도 재사용한다.

다음과 같은 중복 컴포넌트 생성을 금지한다.

PortfolioHeader
PortfolioButton
PortfolioImage
PortfolioContainer
PortfolioTag
PortfolioTypography

기존 컴포넌트로 해결할 수 있다면 새로 만들지 않는다.

16. 신규 컴포넌트 생성 기준

Portfolio 전용으로 정말 필요한 핵심 UI만 신규 컴포넌트로 분리한다.

가장 대표적인 신규 컴포넌트:

PortfolioArcCarousel

필요하다면:

ProjectGrid

등을 만들 수 있다.

하지만 기존 Blog Post Card와 구조가 유사하다면 먼저 기존 컴포넌트
재활용을 검토한다.

17. 기존 함수 / Utility 재활용

다음 기능이 기존 프로젝트에 있다면 반드시 재사용한다.

Markdown parsing

Metadata parsing

Content loading

slug

date formatting

category filtering

sorting

image URL

image optimization

route generation

SEO

debounce

throttle

viewport detection

animation

navigation

동일한 함수를 새로 만들지 않는다.

18. 기존 변수 / 상수 재활용

기존에 존재하는 다음 상수를 우선 사용한다.

categories

routes

navigation

breakpoints

colors

spacing

typography

animation duration

easing

z-index

image configuration

동일한 의미의 상수를 중복 선언하지 않는다.

19. 기존 스타일 재활용

현재 subdev.log의 Editorial / Magazine 디자인을 그대로 유지한다.

우선순위:

기존 CSS
↓
기존 CSS Variable
↓
기존 Tailwind token
↓
기존 SCSS variable
↓
기존 component style
↓
정말 필요한 신규 style

임의의 디자인 값을 반복 작성하지 않는다.

예:

color: #123456;

같은 값을 새로 작성하기 전에 기존 design token을 확인한다.

20. 디자인 방향

Portfolio는 다음 분위기를 유지한다.

Minimal

Editorial

Magazine

Typography-driven

Spacious

Clean

Modern

Content-first

지양:

Glassmorphism

과도한 Gradient

Glow

Neon

과도한 Shadow

과도한 border-radius

AI SaaS 스타일

과도한 3D

Arc Carousel 자체가 충분히 개성 있는 UI이므로 나머지 UI는 절제한다.

21. Portfolio 전체 구조

Portfolio
│
├── Intro
│
├── Arc Loop Carousel
│   ├── Project Metadata
│   ├── Project Image
│   ├── Active Project Information
│   └── Navigation
│
├── Category Filter
│
└── Project Grid
    └── Metadata 기반 프로젝트 목록

22. Project Grid

Grid 역시 Markdown Metadata에서 생성한다.

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    IMAGE     │  │    IMAGE     │  │    IMAGE     │
└──────────────┘  └──────────────┘  └──────────────┘

Project 01       Project 02       Project 03
Category         Category         Category
Technology       Technology       Technology

Grid 카드에 필요한 정보만 Metadata에서 가져온다.

상세 설명은 Markdown 본문에서 관리한다.

23. 성능

이번 구현에서 가장 중요한 요구사항 중 하나다.

Content

Portfolio 목록에서는 전체 Markdown 본문을 불필요하게 렌더링하지 않는다.

가능하면:

Metadata만 조회
      ↓
Grid / Carousel

상세 페이지에서만:

Markdown Body
      ↓
Renderer

를 수행한다.

즉 Portfolio 목록에서 각 프로젝트의 전체 Markdown을 읽고 파싱하는 방식은
피한다.

기존 content API가 metadata-only 조회를 지원한다면 재사용한다.

24. Server / Client 분리

Portfolio 전체를 Client Component로 만들지 않는다.

가능하면:

Portfolio Page
│
├── Server
│   ├── Metadata 조회
│   ├── Category 처리
│   └── Project Grid
│
└── Client
    └── Arc Loop Carousel

처럼 인터랙션이 필요한 Carousel만 Client Component로 분리한다.

기존 프로젝트의 Server / Client 패턴이 있다면 그 패턴을 우선한다.

25. Carousel 성능

가능한 한 다음 속성으로 애니메이션한다.

transform
opacity

지속적으로 다음 값을 변경하는 방식은 피한다.

top
left
width
height
margin
padding

가능한 경우 transform 기반으로 구현한다.

26. React 렌더링 최적화

Carousel 이동 시 페이지 전체가 다시 렌더링되지 않도록 한다.

필요한 경우:

React.memo
useMemo
useCallback

을 사용할 수 있다.

그러나 무조건 적용하지 않는다.

실제 렌더링 비용이 있는 부분에만 적용한다.

27. 이벤트 처리

Pointer / Wheel / Resize 이벤트를 사용하는 경우:

기존 debounce / throttle utility 재사용

passive listener 검토

cleanup

requestAnimationFrame 검토

불필요한 state 변경 방지

를 적용한다.

특히 pointer move마다 React state를 과도하게 업데이트하지 않는다.

28. 이미지

기존 이미지 처리 방식을 사용한다.

Next/Image

기존 Image component

기존 loader

CDN

object storage

responsive image

등이 있다면 그대로 재사용한다.

Grid 이미지는 lazy loading을 고려한다.

첫 화면의 active project 이미지는 LCP를 고려한다.

29. Responsive

Desktop

Arc Loop Carousel의 반원형 인터랙션을 적극적으로 보여준다.

Tablet

표시 카드 수와 scale을 줄인다.

Mobile

성능과 가독성을 우선한다.

필요하면 Arc 효과를 단순화한다.

[ 이전 ]   [ 현재 프로젝트 ]   [ 다음 ]

복잡한 3D transform을 억지로 유지하지 않는다.

30. 접근성

Carousel은 마우스 전용으로 만들지 않는다.

가능하면:

keyboard navigation

aria-label

focus 상태

active 상태

reduced motion

을 지원한다.

prefers-reduced-motion: reduce에서는 애니메이션을 최소화한다.

31. 라우팅 / SEO

기존 routing 및 metadata 패턴을 그대로 사용한다.

Portfolio 상세 페이지에서도 기존 Blog의:

generateMetadata

static params

slug

canonical

Open Graph

title / description

등의 구조를 재사용한다.

새로운 SEO 시스템을 만들지 않는다.

32. 구현 전 조사 결과를 먼저 작성

코드를 수정하기 전에 다음을 먼저 확인하고 간단하게 보고한다.

[기존 Content 시스템]

Markdown 위치:
...

Metadata 타입:
...

Content loader:
...

Markdown renderer:
...

Post 목록 조회:
...

Post 상세 조회:
...

Category 처리:
...

Image 처리:
...


[재사용 가능한 컴포넌트]

- ...
- ...
- ...


[재사용 가능한 함수]

- ...
- ...
- ...


[재사용 가능한 상수]

- ...
- ...
- ...


[재사용 가능한 스타일]

- ...
- ...
- ...


[신규 구현이 필요한 부분]

- PortfolioArcCarousel
- ...

이 분석이 끝난 후 구현한다.

33. 코드 중복 금지

다음과 같은 중복 구현을 하지 않는다.

잘못된 예

const portfolioProjects = [...]

기존 Markdown content가 존재하는데 별도 프로젝트 배열을 생성

잘못된 예

function getPortfolioProjects() {
  // 기존 getPosts()와 동일한 로직
}

잘못된 예

function parseProjectMarkdown() {
  // 기존 Markdown parser와 동일한 로직
}

잘못된 예

const portfolioCategories = [...]

기존 category 상수와 동일한 의미

잘못된 예

--portfolio-accent: ...

기존 accent token으로 해결 가능함에도 신규 token 생성

34. 기존 코드 수정 시 원칙

기존 코드를 수정해야 하는 경우 기존 페이지가 깨지지 않는지 반드시
확인한다.

가장 선호하는 방식:

기존 함수
   ↓
기능 확장
   ↓
Blog + Portfolio에서 공유

또는:

기존 컴포넌트
   ↓
props 확장
   ↓
Blog + Portfolio에서 공유

Portfolio 때문에 기존 Blog의 API나 컴포넌트를 불필요하게 복잡하게 만들지
않는다.

35. 신규 Dependency

새로운 dependency 설치는 최대한 피한다.

먼저 확인:

현재 package.json
기존 carousel library
기존 animation library
기존 utility library
기존 Markdown library

기존 dependency로 구현할 수 있다면 새 dependency를 추가하지 않는다.

특히 Arc Carousel 때문에 무거운 3D library를 추가하지 않는다.

CSS transform + 기존 animation system으로 충분한지 먼저 검토한다.

36. 완료 후 검증

Content

Portfolio 프로젝트가 Markdown으로 관리됨

기존 Metadata / Frontmatter 구조 재사용

기존 Markdown parser 재사용

기존 content loader 재사용

프로젝트 목록 하드코딩 없음

프로젝트 상세 내용 하드코딩 없음

Metadata와 본문 역할 분리

Category가 Metadata 기반으로 동작

slug가 기존 방식과 동일

코드

기존 Layout 재사용

기존 Header 재사용

기존 Image 재사용

기존 Link 재사용

기존 Button 재사용

기존 Card 재사용 가능성 검토

기존 utility 재사용

기존 상수 재사용

기존 타입 재사용

중복 parser 없음

중복 함수 없음

중복 상수 없음

중복 컴포넌트 없음

스타일

기존 Typography 재사용

기존 color token 재사용

기존 spacing 재사용

기존 breakpoint 재사용

기존 animation token 재사용

기존 CSS variable 재사용

새로운 디자인 시스템 없음

성능

목록에서 Markdown 본문을 불필요하게 파싱하지 않음

Metadata 기반 목록 생성

Carousel만 필요한 경우 Client Component

불필요한 dependency 없음

불필요한 re-render 없음

transform / opacity 기반 애니메이션

pointer / wheel / resize 이벤트 최적화

listener cleanup

이미지 lazy loading

Mobile 성능 확인

UX

중앙 카드가 명확한 Active 상태

반원형 Arc 형태 유지

무한 Loop

navigation 동작

pagination 동작

keyboard 접근 가능

reduced motion 대응

Mobile에서 적절히 단순화

37. 최종 지시

이번 작업의 성공 기준은 단순히 예쁜 Portfolio 페이지를 만드는 것이
아니다.

다음 구조를 유지하는 것이 핵심이다.

기존 Blog Content System
          │
          ├── Markdown Posts
          │
          └── Markdown Projects
                    │
                    ↓
          기존 Metadata / Parser
                    │
                    ↓
             기존 Content Logic
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
       Blog UI          Portfolio UI
                              │
                     ┌────────┴────────┐
                     ↓                 ↓
                Arc Carousel       Project Grid

Portfolio 프로젝트를 별도의 데이터 시스템으로 만들지 않는다.

기존 Markdown + Metadata 기반 콘텐츠 시스템을 그대로 확장한다.

새로운 코드가 필요하다면 반드시 기존 코드로 해결할 수 없는 이유를 먼저
확인한다.

최종 목표는:

기존 subdev.log의 콘텐츠 관리 시스템과 디자인 시스템을 그대로
활용하면서, Portfolio라는 새로운 콘텐츠 타입과 Arc Loop Carousel이라는
핵심 인터랙션만 최소한으로 추가하는 것.

특히 Markdown / Metadata / Content Parser / Content Loader / 기존
컴포넌트 / 기존 utility / 기존 상수 / 기존 스타일을 중복 구현하지 않는
것을 최우선으로 한다.