---
title: "CSS Grid 레이아웃 마스터하기"
date: "2025-03-20"
description: "Grid Container, Grid Item 속성부터 반응형 레이아웃까지 실무에서 바로 쓰는 CSS Grid를 정리합니다."
tags: ["css", "grid", "layout"]
---

## Grid 기본

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

`1fr`은 사용 가능한 공간을 균등하게 분배합니다.

## grid-template-columns

```css
/* 고정 + 유동 */
grid-template-columns: 200px 1fr;

/* auto-fill vs auto-fit */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
```

- `auto-fill`: 남은 공간에 빈 트랙 생성
- `auto-fit`: 남은 공간을 기존 아이템이 채움

## 아이템 배치

```css
.item {
  grid-column: 1 / 3;   /* 1번 라인부터 3번 라인까지 */
  grid-row: 1 / 2;
}

/* span 사용 */
.item {
  grid-column: span 2;  /* 2칸 차지 */
}
```

## grid-area

```css
.container {
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

## 반응형 그리드

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
```

미디어 쿼리 없이도 반응형 레이아웃이 됩니다.

## align / justify

```css
.container {
  justify-items: center;   /* 인라인 축 (가로) */
  align-items: center;     /* 블록 축 (세로) */
  place-items: center;     /* 단축 */

  justify-content: space-between; /* 트랙 전체 가로 정렬 */
  align-content: start;           /* 트랙 전체 세로 정렬 */
}
```
