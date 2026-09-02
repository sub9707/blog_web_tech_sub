---
title: "2026 파주 K-컬처 페스티벌"
date: "2026-08"
period: "2026.07 — 2026.08"
description: "경기미래교육 파주캠퍼스 공식 행사 홈페이지 — Cloudflare Workers 서버리스 배포로 유지비 없는 운영 환경 구축"
category: "공공기관 행사"
thumbnail: "/assets/projects/kculture-festival/kculture.png"
tags:
  - Next.js 16
  - React 19
  - TypeScript
  - Tailwind CSS 4
  - Cloudflare Workers
  - Supabase
featured: true
order: 1
---

## 프로젝트 개요

경기미래교육 파주캠퍼스에서 여는 **2026 K-컬처 페스티벌** 공식 홈페이지입니다.

무대·체험 프로그램, 오시는 길과 셔틀버스 안내 등 행사 정보 페이지와, 담당자가 공지·팝업을 직접 관리하고 방문 통계를 확인하는 관리자 페이지로 구성했습니다. 행사 전까지 검색으로 유입되는 방문자가 정보를 빠르게 찾는 것을 목표로 잡고, 기관 담당자 및 행사 업체와 협업하며 배포·운영까지 1인으로 진행했습니다.

- 주최 / 주관: 경기도 / 경기미래교육 파주캠퍼스
- 개발 기간: 2026.07 — 2026.08 (1개월)
- 개발 인원: FE + BE 1인
- 관련 링크: [kculturepaju.com](https://kculturepaju.com)

### 기술 스택

- **FE**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TipTap 에디터, Recharts
- **BE / 인프라**: Route Handlers, Supabase, Cloudflare Workers (`@opennextjs/cloudflare`), Wrangler, Cloudflare D1

## 기술 목표

- **Vercel이 아닌 런타임에 Next.js 배포** — `@opennextjs/cloudflare` 어댑터로 Cloudflare Workers에 올려, 행사 종료 후에도 고정비가 나가지 않는 구성으로 운영
- **검색 유입 구조 설계** — 메타데이터를 상수·조합 함수·페이지 3단으로 분리해 11개 라우트에 일괄 적용, Festival 스키마 JSON-LD와 공지 상세 동적 sitemap 추가 (Search Console 구조화 데이터 검사 필수 항목 오류 0건)
- **이미지·폰트 로딩 정리** — 배경/패턴 이미지 일괄 압축으로 11.9MB → 1.7MB (-86%), 출연진 사진은 PNG → JPEG 재인코딩, 폰트 셀프호스팅으로 서드파티 렌더 블로킹 요청 2건 → 0건

## 프로젝트 아키텍처

![K-컬처 페스티벌 프로젝트 구조도 — 소스/배포(GitHub, Cloudflare Workers, 라즈베리파이), 애플리케이션((site) 공개 페이지와 admin 관리자 페이지), 데이터(D1, Supabase Storage), 외부 연동(GA4, Search Console)](/assets/CS/admin-auth-pbkdf2-hmac/kculture-project-architecture.png)

<!-- 아키텍처 다이어그램. 기존 포스팅 자산 재사용: /assets/CS/admin-auth-pbkdf2-hmac/kculture-project-architecture.png -->

- Next.js App Router 단일 프로젝트로 페이지와 API를 함께 구성하고, `@opennextjs/cloudflare` 어댑터로 빌드 산출물을 변환해 Cloudflare Workers에 배포했습니다.
- 공개 페이지 `(site)`와 관리자 `admin/(protected)`를 라우트 그룹으로 분리하고, 세션 검증을 보호 그룹 레이아웃에서 일괄 처리하도록 구현했습니다.
- 공지·팝업 데이터는 Cloudflare D1에, 업로드 이미지와 첨부파일은 Supabase Storage에 두어 데이터와 미디어 저장소를 분리했습니다.
- 라즈베리파이 홈서버에 dev 브랜치를 따로 배포해 기관 담당자가 진행 상황을 확인할 수 있도록 하고, 실제 Production 환경과 분리했습니다.

## 주요 기능

![메인 랜딩 페이지 — 행사 키비주얼과 일정, 오시는 길 CTA가 배치된 첫 화면](/assets/projects/kculture-festival/kculture-main.png)

<!-- 메인 랜딩 페이지 스크린샷. 행사 키비주얼, 날짜, 주요 CTA 버튼. 파일명 kculture-main.png -->

- **행사 정보 페이지**: 무대·체험 프로그램 소개, 오시는 길과 셔틀버스 안내 등 방문객이 자주 찾는 정보를 검색 유입 기준으로 구성했습니다.
- **공지사항 / 팝업**: 담당자가 TipTap 에디터로 작성한 공지가 공개 페이지에 노출되고, 기간을 지정한 팝업을 띄울 수 있습니다.
- **관리자 페이지**: 공지·팝업 CRUD와 방문 통계(GA4 연동) 확인 화면을 제공하며, 보호 라우트에서만 접근할 수 있습니다.

<!-- 공지 관리 화면 스크린샷. TipTap 에디터와 공지 목록 테이블. 파일명 kculture-admin-notice.png -->
<!-- 관리자 방문 통계 대시보드 스크린샷. GA4 지표 카드와 Recharts 차트. 파일명 kculture-admin-stats.png -->

## 고민했던 점들

### 보안과 빌드

Next.js 16에서 `middleware.ts`가 `proxy.ts`로 바뀌며 Node.js 런타임 강제 실행 조건이 붙었는데, `@opennextjs/cloudflare` 어댑터가 아직 이를 지원하지 않아 빌드는 되지만 배포 시 500 에러가 발생했습니다. `proxy.ts`를 제거하고 `getAdminSession()`을 각 보호 라우트에서 직접 호출하는 구조로 바꾸어 해결했습니다.

로그인 시 비밀번호 해싱은 PBKDF2로, 요청마다 도는 세션 검증은 HMAC 서명 검증(`crypto.subtle.verify`)으로 분리해 세션 체크마다 PBKDF2를 돌리지 않도록 했습니다.

### 콘텐츠 보안

저장된 공지 콘텐츠는 공개 페이지에서 `dangerouslySetInnerHTML`로 그대로 렌더링됩니다. 관리자만 쓰는 에디터라도, 외부에서 복사해 온 콘텐츠에 스크립트나 추적 픽셀이 섞여 있으면 전체 방문자에게 그대로 실행되는 저장형 XSS가 될 가능성이 있습니다.

따라서 신뢰 주체(관리자)가 아니라 노출 대상(전체 방문자) 기준으로 태그·속성·인라인 스타일을 화이트리스트 처리하고, `img`의 `src`는 사용 중인 Supabase Storage 도메인만 허용했습니다.

## 관련 글

- [Cloudflare Workers — K-컬처 페스티벌 배포기](/posts/DevOps/Cloudflare-Workers-—-K-컬처-페스티벌-배포기)
- [Cloudflare Workers에 어울리는 로그인 방식을 찾아보자! PBKDF2와 HMAC](/posts/CS/Cloudflare-Workers에-어울리는-로그인-방식을-찾아보자!-PBKDF2와-HMAC)

<!-- 관련 글 링크 경로는 실제 라우트(slug)에 맞게 확인 필요 -->
