---
title: "2026 파주 K-컬처 페스티벌"
date: "2026-08"
period: "2026.07 — 2026.08"
description: "경기미래교육 파주캠퍼스 공식 행사 홈페이지 — 2026 파주 K-컬처 페스티벌 정보 제공 및 공지사항, 팝업 관리 및 등록 포함"
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
order: 4
---

## 프로젝트 개요

경기미래교육 파주캠퍼스에서 여는 **2026 K-컬처 페스티벌** 공식 홈페이지입니다.

무대·체험 프로그램, 오시는 길과 셔틀버스 안내 등 행사 정보 페이지와, 담당자가 공지·팝업을 직접 관리하고 방문 통계를 확인하는 관리자 페이지로 구성했습니다. 행사 전까지 검색으로 유입되는 방문자가 정보를 빠르게 찾는 것을 목표로 잡고, 기관 담당자 및 행사 업체와 협업하며 배포·운영까지 1인으로 진행했습니다.

| 항목 | 내용 |
| --- | --- |
| **주최 / 주관** | 경기도 / 경기미래교육 파주캠퍼스 |
| **개발 기간** | 2026.07 — 2026.08 (1개월) |
| **참여 인원** | 개발(FE + BE) 1인 |
| **관련 링크** | [kculturepaju.com](https://kculturepaju.com) |

### 기술 스택

- **FE**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TipTap 에디터, Recharts
- **BE / 인프라**: Route Handlers, Supabase, Cloudflare Workers (`@opennextjs/cloudflare`), Wrangler, Cloudflare D1

## 기술 목표

- **Vercel이 아닌 런타임에 Next.js 배포** — `@opennextjs/cloudflare` 어댑터로 Cloudflare Workers에 올려, 행사 종료 후에도 고정비가 나가지 않는 구성으로 운영
- **검색 유입 구조 설계** — 메타데이터를 상수·조합 함수·페이지 3단으로 분리해 11개 라우트에 일괄 적용, Festival 스키마 JSON-LD와 공지 상세 동적 sitemap 추가 (Search Console 구조화 데이터 검사 필수 항목 오류 0건)
- **이미지·폰트 로딩 정리** — 배경/패턴 이미지 일괄 압축으로 11.9MB → 1.7MB (-86%), 출연진 사진은 PNG → JPEG 재인코딩, 폰트 셀프호스팅으로 서드파티 렌더 블로킹 요청 2건 → 0건

## 프로젝트 아키텍처

![K-컬처 페스티벌 프로젝트 구조도 — 소스/배포(GitHub, Cloudflare Workers, 라즈베리파이), 애플리케이션((site) 공개 페이지와 admin 관리자 페이지), 데이터(D1, Supabase Storage), 외부 연동(GA4, Search Console)](/assets/CS/admin-auth-pbkdf2-hmac/kculture-project-architecture.png)

- Next.js App Router 단일 프로젝트로 페이지와 API를 함께 구성하고, `@opennextjs/cloudflare` 어댑터로 빌드 산출물을 변환해 Cloudflare Workers에 배포했습니다.
- 공개 페이지 `(site)`와 관리자 `admin/(protected)`를 라우트 그룹으로 분리하고, 세션 검증을 보호 그룹 레이아웃에서 일괄 처리하도록 구현했습니다.
- 공지·팝업 데이터는 Cloudflare D1에, 업로드 이미지와 첨부파일은 Supabase Storage에 두어 데이터와 미디어 저장소를 분리했습니다.
- 라즈베리파이 홈서버에 dev 브랜치를 따로 배포해 기관 담당자가 진행 상황을 확인할 수 있도록 하고, 실제 Production 환경과 분리했습니다.

## 주요 기능

![메인 랜딩 페이지 — 축제 키비주얼과 2026.9.12 일정, 장소·오시는 길 CTA 버튼, 우측 하단에 기간이 지정된 이벤트 팝업](/assets/projects/kculture-festival/kculture-main.webp)

**메인 랜딩** — 키비주얼과 행사 일시를 먼저 보여주고 장소·오시는 길로 바로 넘어가도록 CTA를 배치했습니다. 우측 팝업은 담당자가 관리자 페이지에서 노출 기간을 지정해 띄우는 것으로, 방문자는 "7일간 보지 않기"로 닫을 수 있습니다.

![무대 프로그램 페이지 — 특별공연·공연 배지가 붙은 출연진 카드 그리드, K-발라드·K-POP·K-매직 등 장르 라벨과 이름](/assets/projects/kculture-festival/kculture-stage.webp)

**무대 프로그램** — 출연진을 장르 라벨과 함께 카드로 배치하고, 특별공연과 일반 공연을 배지로 구분했습니다.

![체험 프로그램 페이지 — 상단에 분야별 프로그램 안내 이미지와 다운로드 버튼, 아래에 이름 검색·정렬과 32개 프로그램 카드 목록](/assets/projects/kculture-festival/kculture-experience.webp)

**체험 프로그램** — 32개 프로그램을 이름 검색과 정렬로 찾을 수 있게 하고, 사전 신청 대상만 따로 추려 보는 필터를 두었습니다. 상단에는 분야별로 정리된 안내 이미지를 내려받을 수 있습니다.

![오시는 길 페이지 — 지도와 외부 지도 앱 연결 버튼, 버스·지하철 노선별 경로 안내, 주차 및 셔틀버스 안내](/assets/projects/kculture-festival/kculture-directions.webp)

**오시는 길** — 행사장이 대중교통 접근이 쉽지 않은 곳이라, 버스·지하철 노선을 출발지별로 나눠 적고 구글·네이버·다음 지도로 각각 연결했습니다. 주차장이 협소해 셔틀버스로 연결되는 외부 주차장 주소를 함께 안내합니다.

**공지사항 / 팝업** — 담당자가 TipTap 에디터로 작성한 공지가 공개 페이지에 노출되고, 기간을 지정한 팝업을 띄울 수 있습니다.

**관리자 페이지** — 공지·팝업 CRUD와 방문 통계(GA4 연동) 확인 화면을 제공하며, 보호 라우트에서만 접근할 수 있습니다.

## 고민했던 점들

### Vercel Pro 대신 Cloudflare Workers를 고른 이유

이전 프로젝트들은 Vercel Pro 플랜으로 운영했습니다. Next.js를 만든 곳이라 Next.js 기능을 별도 설정 없이 쓸 수 있고, 트래픽이 몰려도 대응이 쉬웠기 때문입니다.

다만 Vercel 무료 플랜은 약관상 상업적 이용이 금지되어, 외주 사이트는 **Pro 플랜($20/월)** 을 써야 합니다. 트래픽과 상관없이 매달 나가는 정액제라, 사전신청 기간과 행사 당일을 빼면 방문자가 거의 없는 행사 사이트에는 맞지 않았습니다.

Cloudflare Workers는 무료 플랜에도 상업적 이용 제한이 없고, 유료 플랜도 월 $5부터 쓴 만큼만 과금됩니다. 플랜을 바꿔도 코드나 설정을 고칠 필요가 없어 필요한 기간에만 유료로 올릴 수 있었고, 엣지 서버에서 요청을 나눠 처리해 접속이 몰리는 상황에도 대비할 수 있었습니다.

대신 Workers는 Node.js 서버가 아니기에, Vercel에서 편하게 쓰던 기능을 하나씩 직접 챙겨야 했습니다.

| 기능 | Vercel에서는 | Cloudflare Workers에서 찾은 대안 |
| --- | --- | --- |
| 서버 기능 구성 | 서버 컴포넌트, API 라우트를 실행할 환경을 배포할 때 알아서 만들어 줌 | `@opennextjs/cloudflare`로 빌드 결과를 Workers용으로 변환 |
| 이미지 최적화 | `next/image`가 요청에 맞춰 크기를 줄이고 webp로 바꿔 줌 | `wrangler.jsonc`에 Cloudflare Images 바인딩(`IMAGES`) 추가 |
| 미들웨어 | `proxy.ts`가 엣지 서버에서 그대로 실행됨 | 어댑터가 아직 지원하지 않아 보호 라우트에서 세션을 직접 확인 (아래 "보안과 빌드" 참고) |
| 미리보기 배포 | 브랜치나 PR마다 확인용 주소가 생김 | 라즈베리파이 홈서버에 dev 브랜치를 따로 배포 |
| 암호화 라이브러리 | Node.js 전용 라이브러리(`bcrypt` 등)를 그대로 사용 | Web Crypto API만으로 PBKDF2, HMAC 구현 |

필요한 기능마다 대안이 있었고 **필요한 기간에만 비용을 내는 구조**가 행사 사이트와 잘 맞았기 때문에 Cloudflare Workers를 선택했습니다. 실제로 행사 기간 한 달은 유료 플랜(무료 플랜의 요청당 CPU 10ms 한도 대응)으로 운영하고, 행사 종료 후 무료 플랜으로 전환해 고정비 없이 운영하고 있습니다.

### 검색 유입 구조

행사 홈페이지는 대부분 검색으로 들어오기 때문에, 11개 페이지 모두에 제목, 설명, 대표 주소(canonical), 공유 미리보기(Open Graph)가 빠짐없이 들어가야 했습니다. 페이지마다 따로 쓰면 하나씩 빠뜨리기 쉬워서 **상수, 조합 함수, 페이지** 세 단계로 나눴습니다.

공통 값은 상수로 모으고, 페이지에서는 제목, 설명, 경로만 넘기면 나머지를 채워주는 함수를 만들었습니다. 또 행사명에 알파벳이 들어가 어떤 표기로 검색해도 사이트가 나오길 바란다는 기관 측 요청이 있어, "K-컬처", "케이컬쳐", "K Culture" 같은 표기들을 상수로 정리해 키워드와 구조화 데이터에 함께 넣었습니다.

```ts
export const SITE_URL = "https://kculturepaju.com";
export const SITE_ALTERNATE_NAMES = ["K컬처페스티벌", "케이컬처 페스티벌", "K-Culture Festival"];

export function createPageMetadata({ title, description, path }: PageMetadataOptions): Metadata {
  const url = new URL(path, SITE_URL).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, images: [SITE_OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SITE_OG_IMAGE.url] },
  };
}
```

메인 페이지에는 검색 결과에 행사 날짜와 장소가 함께 표시되도록 Festival 스키마 JSON-LD를 넣었습니다. 공지사항은 계속 새로 올라오기 때문에, sitemap을 고정 목록으로 두지 않고 요청 시점에 DB에서 공지 목록을 읽어 함께 만들도록 했습니다.

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = SITE_PATHS.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: new Date(),
  }));

  const notices = await getNotices();
  const noticeEntries = notices.map((notice) => ({
    url: new URL(`/community/notice/${notice.id}`, SITE_URL).toString(),
    lastModified: new Date(notice.updated_at),
  }));

  return [...staticEntries, ...noticeEntries];
}
```

그 결과 Search Console 구조화 데이터 검사에서 필수 항목 오류 0건을 확인했습니다.

### 보안과 빌드

Next.js 16에서 `middleware.ts`가 `proxy.ts`로 바뀌며 Node.js 런타임 강제 실행 조건이 붙었는데, `@opennextjs/cloudflare` 어댑터가 아직 이를 지원하지 않아 빌드는 되지만 배포 시 500 에러가 발생했습니다. `proxy.ts`를 제거하고 `getAdminSession()`을 각 보호 라우트에서 직접 호출하는 구조로 바꾸어 해결했습니다.

로그인 시 비밀번호 해싱은 PBKDF2로, 요청마다 도는 세션 검증은 HMAC 서명 검증(`crypto.subtle.verify`)으로 분리해 세션 체크마다 PBKDF2를 돌리지 않도록 했습니다.

### 콘텐츠 보안

저장된 공지 내용은 공개 페이지에서 `dangerouslySetInnerHTML`로 그대로 그려집니다. 관리자만 쓰는 에디터라도 외부에서 복사해 온 내용에 스크립트가 섞여 있으면 모든 방문자의 브라우저에서 실행될 수 있어(저장형 XSS), 관리자가 쓴 글이라도 똑같이 거르기로 했습니다. 미리 정해 둔 태그, 속성, 인라인 스타일만 남기고 나머지는 지웠으며, 이미지 주소는 사용 중인 Supabase Storage 도메인만 허용했습니다.

## 관련 글

- [Cloudflare Workers — K-컬처 페스티벌 배포기](/posts/DevOps/Cloudflare-Workers-—-K-컬처-페스티벌-배포기)
- [Cloudflare Workers에 어울리는 로그인 방식을 찾아보자! PBKDF2와 HMAC](/posts/CS/Cloudflare-Workers에-어울리는-로그인-방식을-찾아보자!-PBKDF2와-HMAC)