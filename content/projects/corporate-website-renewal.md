---
title: "기업 홈페이지 리뉴얼"
date: "2025-11"
period: "2025.11 — 2025.11"
description: "WordPress 기반 사이트를 Next.js로 전면 리뉴얼 — SEO 재설계와 자체 CMS, 검색 통계 대시보드 구축"
category: "기업 웹사이트"
thumbnail: "/assets/projects/corporate-website-renewal/corporate.png"
tags:
  - Next.js 15
  - TypeScript
  - Tailwind CSS 4
  - MySQL
  - Supabase
  - Cloudflare R2
  - Vercel
featured: true
order: 4
---

## 프로젝트 개요

기존 WordPress 기반 기업 웹사이트를 Next.js로 전면 리뉴얼한 프로젝트입니다.

검색 노출 강화를 위한 SEO 구조 개선, 모바일 UI 최적화, Contact 페이지 문의 메일, 자체 CMS 기능을 중심으로 개발했습니다. 기업 소개·연혁·작업물 목록을 가독성 높게 재구성해 정보 전달력을 개선했습니다.

| 항목 | 내용 |
| --- | --- |
| **개발 기간** | 2025.11 (1개월) |
| **참여 인원** | 개발(FE + BE) 1인 |
| **관련 링크** | [www.hdyd.co.kr](https://www.hdyd.co.kr) |

### 기술 스택

- Next.js 15, React, TypeScript, Tailwind CSS 4, Framer Motion
- MySQL, axios, Nodemailer, Supabase, Cloudflare R2
- 배포: Vercel (Pro)

## 기술 목표

- **Next.js App Router 기반 풀스택 CMS** — 작업물·연혁·설정을 포함한 관리자 콘텐츠 관리 시스템 구축
- **SEO 최적화 구조 설계** — 페이지별 Metadata API, Open Graph 이미지, sitemap.xml 자동 생성, Google / Naver 검색엔진 등록
- **문의 메일 발송 시스템** — Nodemailer SMTP + 스팸 방지 (Rate Limit + Honeypot + Sanitize)
- 클라이언트 요청 사항에 더해, 발생 가능한 문제점을 사전에 예측해 개선된 서비스를 제공하는 것

## 프로젝트 아키텍처

![기업 홈페이지 리뉴얼 아키텍처 — 사용자(방문자·기업 담당자), Vercel Pro에 배포된 Next.js 15 애플리케이션(Public 페이지·Route Handlers·Admin 페이지), 데이터·외부 연동(Vercel 연동 Supabase, Cloudflare R2, SMTP, Search Console API, 검색엔진)의 3단 구조](/assets/projects/corporate-website-renewal/corporate-architecture.webp)

- Next.js 단일 프로젝트 구조로 프론트엔드와 API를 함께 구성해 별도의 서버 없이 배포 및 관리가 가능하도록 설계했습니다.
- Public 페이지와 Admin 페이지를 분리하고, 인증 기반 접근 제어를 적용해 관리자 기능은 보호된 경로에서만 접근할 수 있도록 구현했습니다.
- Vercel Pro 플랜에 배포했고, 데이터베이스는 Vercel의 Supabase 연동으로 붙여 연결 정보와 환경 변수를 Vercel 프로젝트 설정에서 함께 관리합니다.
- Supabase로 데이터베이스를 관리하고, Cloudflare(R2)로 미디어 파일을 분리해 애플리케이션 서버와 정적 리소스 서버의 역할을 구분했습니다.
- Server Component와 정적 생성(SSG / ISR)을 적용하고, DB 기반 동적 sitemap.xml을 구성해 콘텐츠(works 게시물) 변경 사항이 검색 엔진에 주기적으로 반영되도록 설계했습니다.

## 주요 기능

![히스토리 페이지 — 연도별로 묶인 기업 행사 연혁 타임라인, 우측에 2005년부터 현재까지 연도 인덱스가 세로로 표시된다](/assets/projects/corporate-website-renewal/corporate-history.webp)

**히스토리 페이지** — 기업 행사 연혁 페이지입니다. 기존 WordPress 웹페이지에서 줄넘김, 폰트 깨짐, 모바일 미지원이었기에 해당 문제점들을 중점으로 리뉴얼했습니다. CMS를 통해 관리자가 직접 연혁을 추가할 수 있고, 우측의 연도도 자동으로 추가됩니다.

![행사 목록 페이지 — 팝업스토어·전시·팬사인회 등 카테고리 필터와 카테고리 배지가 붙은 행사 썸네일 카드 그리드](/assets/projects/corporate-website-renewal/corporate-works.webp)

**행사 목록 페이지** — 진행한 행사 정보, 프로그램 등을 살펴볼 수 있는 페이지입니다. 썸네일은 관리자가 따로 등록하고, 썸네일을 포함한 등록 이미지는 업로드 전 자동으로 1920×1080으로 리사이징해 일괄 업로드됩니다. 업로드 제한은 리사이징 이후 5MB로 두었습니다.

![Reel 페이지 — Shorts·동영상 탭과 재생 시간, 조회수, 좋아요, 게시일이 표시된 영상 썸네일 그리드](/assets/projects/corporate-website-renewal/corporate-reel.webp)

**Reel 페이지** — 기업이 운영하는 채널의 쇼츠와 동영상을 탭으로 나눠 보여줍니다. Youtube API를 활용하였고 각 항목에 재생 시간과 조회수, 좋아요, 게시일을 함께 노출해 홈페이지에서 최신 콘텐츠를 바로 확인할 수 있게 했습니다.

![연락처 페이지 — 주소·이메일·전화 정보 카드와 지도, 하단에 문의하기 폼](/assets/projects/corporate-website-renewal/corporate-contact.webp)

**연락처 페이지** — 기업 연락처, 위치 정보를 포함한 연락처 페이지입니다. 문의하기 폼을 통해 관리자 설정 페이지에서 설정한 email 주소로 문의 내역을 작성할 수 있으며, 봇 광고와 악의적 메일을 차단하기 위해 일정 횟수 제한과 honeypot 숨겨진 입력 필드, 태그 제거 Sanitize를 도입했습니다.

### 관리자 페이지

대시보드, 작업 관리, 작업 연혁, 통계, 기타 페이지 설정 등 관리자가 앱 내에서 직접 페이지를 수정·추가할 수 있도록 만든 페이지입니다. 유지보수 기간 동안 클라이언트 요청에 따라 지속적인 기능 추가·수정을 하고 있습니다.

![Works 관리 화면 — 작업 검색과 카테고리 필터, 썸네일·제목·카테고리·행사 일자·조회수 열로 구성된 목록과 수정·삭제 버튼](/assets/projects/corporate-website-renewal/corporate-admin-works.webp)

**Works 관리** — 등록한 작업을 검색·카테고리로 추리고 목록에서 바로 수정·삭제합니다. 행사 일자와 조회수를 함께 보여줘 어떤 작업이 실제로 열람되는지 확인할 수 있습니다.

![관리자 통계 화면 — 총 클릭·총 노출·평균 CTR·평균 순위 카드, 클릭·노출 추이 그래프, 검색 키워드와 인기 페이지 표](/assets/projects/corporate-website-renewal/corporate-admin-stats.webp)

**통계** — Google Search Console API로 총 클릭, 노출, CTR, 평균 순위를 모으고 7 / 30 / 90일로 기간을 바꿔 봅니다. 어떤 키워드로 들어왔는지와 어떤 페이지가 많이 노출됐는지를 표로 함께 보여줍니다.

![환경 설정 화면 — 회사소개서 PDF 업로드 카드, 메인 페이지 버튼 노출 토글, 주소·이메일·전화·팩스 연락처 정보 카드](/assets/projects/corporate-website-renewal/corporate-admin-settings.webp)

**환경 설정** — 기업 요청에 따라 회사 소개서 업로드와 메인 페이지 버튼 숨김 토글을 넣었습니다. 연락처 페이지에 노출되는 주소·이메일·전화 정보도 여기서 수정합니다.

## 고민했던 점들

### 요구사항 1 — 안전한 문의 메일과 통계

기존 홈페이지에서 광고성 스팸 메일과 악의적인 메일이 반복 수신된다는 요구사항을 파악했습니다. 동일 IP의 과도한 반복 전송을 제한하는 방식으로 중복 발송과 스팸을 차단하고, 숨겨진 입력 필드로 봇을 감지하며, 악성 코드가 포함된 입력값은 서버에서 걸러내도록 처리했습니다. 모든 입력 항목에 유효성 검사를 적용해 기업 메일로 안전하게 수신되도록 구현했습니다.

또한 방문자의 유입 경로와 검색 키워드를 확인할 수 없다는 요구사항을 파악해, Google Search Console API를 연동해 검색 클릭수, 노출수, CTR, 평균 순위 등 핵심 지표를 수집하도록 구현했습니다. 어떤 키워드로 사이트에 유입됐는지, 어떤 페이지가 가장 많이 노출됐는지 한눈에 확인할 수 있는 관리자 대시보드를 구성하고, 일별 클릭 추이를 그래프로 시각화해 7일 / 30일 / 90일 기간별 필터로 트렌드를 분석할 수 있도록 했습니다.

### 요구사항 2 — CMS와 SEO

기업 담당자가 CMS를 통해 회사 Works와 History를 직접 관리하고, 정보를 숨기거나 수정할 수 있어야 한다는 요구사항을 파악했습니다. 관리자 대시보드를 구축해 Works(프로젝트 사례) 등록·수정·삭제와 History(연혁) 항목을 직접 편집할 수 있도록 구현했고, 이미지는 Cloudflare R2에 업로드하고 콘텐츠는 Supabase에 저장하는 구조로 안정적인 데이터 관리 환경을 구성했습니다. 회사 소개서 업로드와 다운로드 버튼 숨김 토글, contact 정보 수정 등 정보 제어를 할 수 있습니다.

기존 홈페이지는 Works 상세 내용이 검색엔진에 노출되지 않아 검색을 통한 회사 소개 유입이 어렵다는 문제를 파악했습니다. Next.js의 서버 사이드 렌더링을 활용해 Works 상세 페이지의 콘텐츠가 크롤러에게 그대로 전달되도록 하고, Supabase 데이터 기반의 동적 sitemap.xml을 생성해 새로운 Works가 등록될 때 자동으로 검색엔진 색인 대상에 포함되도록 했습니다. Open Graph 태그와 메타데이터를 페이지별로 설정해 검색 결과 및 SNS 공유 시 회사 정보가 올바르게 표시되도록 구성했습니다.
