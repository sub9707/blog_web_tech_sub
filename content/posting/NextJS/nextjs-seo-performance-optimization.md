---
title: "구글 검색 결과에 웹사이트를 노출시키자 - Next.js SEO 최적화 시도"
date: "2026-08-15"
description: "정적 페이지로 구성된 웹사이트 프로젝트 경기미래교육 파주캠퍼스 'K-컬처 페스티벌' 홈페이지(kculturepaju.com) 외주 제작 과정에서 진행한 Next.js SEO·성능 작업 기록"
tags: ["nextjs", "seo", "structured-data", "metadata", "performance", "image-optimization", "core-web-vitals"]
thumbnail: "/assets/thumbnails/nextjs/kculturepaju-seo-performance.jpg"
---

'2026 파주 K-컬처 페스티벌' 홈페이지를 외주로 제작하면서, 기능 구현만큼 신경 쓴 부분이 SEO와 성능이었다.

<bookmark url="https://kculturepaju.com/"></bookmark>

행사 홈페이지는 관공서 공지·이벤트 서비스 등을 통해 링크가 직접 뿌려지기도 하지만, 그 경로를 놓친 사용자는 결국 검색으로 찾아 들어온다. "파주 K컬처 페스티벌", "경기미래교육 파주캠퍼스 축제" 같은 검색어로 들어오는 유입이 상당한 비중을 차지하고, SNS 공유 미리보기나 구글 리치 카드 노출 여부가 곧 클릭률로 직결된다.

정보 제공이 목적인 "웹사이트"인 만큼, 기획 단계에서부터 "속도감"을 체감시키는 걸 목표로 잡았다. 방문자가 원하는 정보(일정, 오시는 길, 셔틀버스)를 클릭 한두 번 안에, 지연 없이 받아볼 수 있어야 한다고 판단했고, 이 기준을 SEO뿐 아니라 리팩토링 전반의 방향으로 삼았다. 그래서 기능 개발이 어느 정도 마무리된 뒤, 메타데이터부터 구조화 데이터, 이미지·폰트 최적화까지 한 번에 정리해서 진행했다.

이 포스팅은 그 작업을 실제로 무엇을 바꿨고, 무엇이 실측으로 확인됐고, 무엇이 아직 예상 단계인지 구분해서 기록한다.

<br/>

## 1. 메타데이터 계층화

작업 전에는 페이지마다 title/description을 개별적으로 하드코딩하고 있었다. 문구를 하나 바꾸려면 여러 파일을 돌아다녀야 했고, 사이트명이 바뀌면 어디서 누락됐는지 찾기도 번거로웠다.

값의 단일 소스와 조합 함수를 분리하는 3단 구조로 정리했다.

```txt
src/constants/site.ts   → SITE_NAME, SITE_HOME_TITLE, SITE_DESCRIPTION, SITE_KEYWORDS ...
src/lib/metadata.ts     → createPageMetadata({ title, description, path })  ← 서브페이지 11곳이 호출
                           rootMetadata                                      ← 루트 레이아웃/홈이 사용
```

title은 `default`/`template`로 분리했다.

- 홈: `SITE_HOME_TITLE` = **"2026 파주 K-컬처 페스티벌 공식 홈페이지"** — "공식 홈페이지" 검색어와 직접 매칭되도록 홈에만 전체 문구를 노출
- 서브페이지: `%s | 2026 파주 K-컬처 페스티벌` — 페이지 고유 주제가 앞에 오도록 짧게 유지해 구글 SERP(검색 결과 페이지, Search Engine Result Page)에서 제목이 잘리는 걸 방지

`SITE_NAME`에도 연도("2026")와 지역("파주")을 추가했다. 기존엔 "K-컬처 페스티벌"만 있어서 지역 검색어와의 매칭이 약했다.

정적 페이지 10곳과 공지사항 상세(`generateMetadata`로 동적 생성)까지, 라우트 모두 `createPageMetadata()`를 거치도록 통일했다.

<br/>

## 2. 구조화 데이터 (JSON-LD)

JSON-LD(JSON for Linking Data)는 검색엔진이 페이지 내용을 이해할 수 있도록, 사람이 읽는 HTML과 별개로 `<script type="application/ld+json">` 태그에 기계가 읽을 구조화된 데이터를 심어두는 방식이다. 구글은 이 데이터를 근거로 일반 링크 대신 별점·가격·행사 일정 같은 정보가 붙은 리치 결과(rich result)를 보여줄 수 있다.

빌더 함수와 렌더 컴포넌트를 분리해서, 필요한 페이지가 필요한 스키마만 조합해 쓰도록 설계했다.

| 스키마 | 빌더 | 삽입 위치 |
|---|---|---|
| `WebSite` | `buildWebSiteJsonLd()` | 루트 레이아웃 — 전 페이지 공통 |
| `Organization` | `buildOrganizationJsonLd()` | 루트 레이아웃 — 전 페이지 공통 |
| `Festival` (Event 하위 타입) | `buildFestivalEventJsonLd()` | 홈페이지 전용 |

**구현**: `JsonLd`는 객체 하나 또는 배열을 받아서 각각 `<script type="application/ld+json">` 태그로 펼쳐주는 얇은 래퍼 컴포넌트다.

```tsx
// src/components/json-ld.tsx
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
```

`WebSite`와 `Organization`은 전 페이지에 공통으로 필요해서 루트 레이아웃의 `<head>`에 배열로 한 번에 넣었고, `Festival`은 홈페이지에만 의미가 있어서 홈 컴포넌트 안에 따로 넣었다.

```tsx
// src/app/layout.tsx
<head>
  <JsonLd data={[buildWebSiteJsonLd(), buildOrganizationJsonLd()]} />
</head>

// src/app/(site)/page.tsx
<main>
  <JsonLd data={buildFestivalEventJsonLd()} />
  {/* ... */}
</main>
```

여기서 원칙이 있다. **근거 없는 값은 넣지 않는다.** 

Event 스키마에 들어가는 장소·좌표·주최기관 정보는 전부 기존에 이미 서비스에 노출돼 있던 값(오시는 길 페이지의 실측 좌표, 푸터의 주최기관명)을 `site.ts`로 통합해 재사용했다. 

반대로 정확한 시작·종료 **시각**과 **입장료(offers)** 는 클라이언트 측에서 전달받은 정보가 없기에 임의로 비워뒀다.

결과와 유효성은 Google Search Console의 URL 검사 도구로 확인할 수 있다. 

이 도구는 실제 배포된 페이지에서 구글 크롤러가 파싱한 JSON-LD를 그대로 읽어와서, schema.org 스펙에 정의된 필드가 채워졌는지를 항목별로 검사해 보여준다. 

여기서 "통과"는 검색 순위를 보장한다는 뜻이 아니라, 이 페이지가 리치 결과(rich result — 링크 텍스트 대신 별점·가격·행사 일정처럼 부가 정보가 붙은 검색 결과) 후보로 고려될 자격을 갖췄다는 뜻이라고 한다. 실제로 리치 카드 형태로 그려질지, 얼마나 자주 노출될지는 구글이 크롤링 이후 별도로 판단한다.

![Search Console URL 검사 — Festival 구조화 데이터 검증 결과. 중요한 문제 0개, 선택 항목 경고 3개(performer, endDate, offers)](/assets/NextJS/seo/search-console-structured-data.png)

검사 결과에서 두 종류의 이슈가 구분돼 있다.

- **필수 필드 에러(빨간색)**: 하나라도 있으면 이 페이지는 아예 리치 결과 후보에서 제외된다.
- **선택 필드 경고(주황색, "중요하지 않은 문제")**: `performer`, `endDate`, `offers` 3개가 떴는데, 전부 값을 채우지 않은 선택 필드라 예정된 경고였다.

`type: Festival`로 정상 인식됐고 name/description/startDate/location/organizer 같은 필수 필드는 전부 채워져 있어서 초록색 체크로 통과했다. 즉 이 페이지는 리치 결과 후보 자격을 갖췄다는 것까지는 실측으로 확인됐고, 실제로 그 카드가 그려지느냐는 다음 단계다.

**기대 효과**: 구글이 이 페이지를 이벤트로 이해해 검색 결과에 날짜·장소가 붙은 리치 카드로 노출될 가능성이 생긴다. 다만 실제 리치 결과 적용 여부는 크롤링 이후 반영되는 영역이라 100% 보장되진 않는다.

구글의 웹사이트 노출 처리는 시간이 좀 걸리기에 현재 결과는 바로 확인할 수 없다. 

따라서 리치 결과가 실제로 SERP에서 어떤 모습으로 뜨는지 참고 삼아 예시를 하나 붙여둔다. 아래는 제품 페이지의 리치 결과로, 일반 링크였다면 텍스트 세 줄로 끝났을 자리에 별점·리뷰 수·가격·재고 상태까지 한눈에 들어온다. 지금 작업한 Festival 스키마도 통과했을 뿐 이런 형태로 노출되기까지는 크롤링을 거쳐야 하니, 목표로 삼고 있는 결과물이라고 보면 된다.

![구글 SERP에 노출된 리치 결과 예시 — 제품 링크에 별점, 리뷰 수, 가격, 재고 상태가 함께 표시된다. 출처: Search Engine Land](/assets/NextJS/seo/rich-result-example.png)

*이미지 출처: [Search Engine Land — 10 facts about rich results all SEOs should know](https://searchengineland.com/10-facts-rich-results-seos-know-289078)*

Search Engine Land에 SEO 담당자라면 알아야 할 리치 결과 관련 사실 22가지를 정리한 글이 있어 참고했다. 기억할 만한 것 몇 가지만 꼽으면: JSON-LD가 구글이 권장하는 포맷이라는 것, 필수 속성이 하나라도 빠지면 아예 노출되지 않는다는 것, 다 갖춰도 노출을 보장하진 않는다는 것. 이 외에도 SEO 최적화에 관련된 좋은 내용이 22개 항목으로 정리돼 있으니 한 번 훑어보는 것을 권한다.

<bookmark url="https://searchengineland.com/10-facts-rich-results-seos-know-289078"></bookmark>

<br/>

## 3. 검색어 표기 변형 대응 — alternateName

공식 명칭은 "2026 파주 K-컬처 페스티벌"로 고정돼 있지만, 실제 사용자가 검색창에 치는 표기는 제각각일 것이다.

"K 컬쳐", "K-컬쳐", "케이 컬쳐", "케이컬처"처럼 스펠링(컬처/컬쳐)과 한글/영문 표기가 갈린다.

이 변형들에서도 검색엔진이 전부 같은 대상으로 인식하게 만드는 게 목표였다.

다만 화면에 노출되는 로고나 히어로 섹션의 h1("파주 K-컬처 페스티벌")은 건드리지 않았다. 

공식 병기가 아직 확정되지 않은 상태에서, 특정 표기 하나를 "진짜 이름"처럼 화면에 노출시키는 건 성급한 것일 수 있다. 

그래서 이 작업은 전부 검색엔진만 읽는 메타/구조화 데이터 레이어에서 처리했다.

```ts
// src/constants/site.ts
export const SITE_ALTERNATE_NAMES = [
  "K컬처페스티벌",
  "K 컬쳐 페스티벌",
  "K컬쳐페스티벌",
  "케이 컬쳐 페스티벌",
  "케이컬처 페스티벌",
  "케이컬쳐페스티벌",
  "K Culture Festival",
  "K-Culture Festival",
];
```

하이픈-띄어쓰기 차이는 검색엔진이 토큰화 단계에서 대체로 정규화해주기 때문에 나열하지 않고, 실제로 값 자체가 달라지는 스펠링(컬처/컬쳐)과 한글/영문 계열만 대표로 등록했다.

이 배열을 두 곳에 그대로 흘려보냈다.

- **구조화 데이터**: `buildWebSiteJsonLd()`, `buildFestivalEventJsonLd()`에 `alternateName: SITE_ALTERNATE_NAMES`를 추가했다. schema.org가 "이 명칭으로도 불린다"를 명시하는 정식 필드라, 화면 텍스트를 안 건드리고도 검색엔진에 직접 전달된다. 
- **메타 키워드**: `SITE_KEYWORDS`에 `...SITE_ALTERNATE_NAMES`로 스프레드했다. 구글은 메타 키워드를 사실상 무시하지만, 네이버 등 일부 검색엔진엔 미세하게라도 참고되는 값이라 얹었다.

<br/>

## 4. sitemap 동적화

sitemap은 사이트에 어떤 URL이 있는지 크롤러에게 미리 알려주는 XML 형식이다. 

기획 단계에서의 사이트맵은 페이지의 목록을 다이어그램으로 표현하는 용어이지만, 검색 엔진 등록에서는 비슷하지만 다른 방식으로 사용되는 용어이다.

링크를 타고 들어가야만 발견되는 페이지도 sitemap에 있으면 더 빠르게 찾아가 색인할 수 있다.

기존 sitemap은 정적 페이지 10개만 등록돼 있었고, 공지사항 상세 페이지(`/community/notice/[id]`)는 아예 빠져 있었다. 크롤러가 이 페이지를 발견하려면 목록 페이지를 거쳐 링크를 타고 들어가는 수밖에 없었다.

`getNotices()`로 공지 목록을 조회해서 상세 URL을 sitemap에 동적으로 포함시켰고, `lastModified`도 빌드 시각 대신 공지의 실제 `updated_at`을 쓰도록 바꿨다.

```txt
이전: 정적 10개 URL 고정
이후: 정적 10개 + 공지 상세 N개(자동, 공지 등록될 때마다 다음 재생성 시 반영)
```

공지가 늘어날수록 sitemap에 자동으로 URL이 추가되는 구조라, 앞으로 공지가 쌓여도 sitemap을 따로 손볼 일은 없다.

<br/>

## 5. 성능 — 이미지 경량화 · 우선순위 로딩 · 로컬 호스팅

정보 전달용 페이지에서 가장 무거운 리소스는 대부분 이미지들이다. 

배경 패턴, 일러스트, 프로그램 안내 사진까지 실제 서비스 화면의 절반 이상이 이미지로 채워져 있어서, 여기서부터 손을 댔다.

**로컬 호스팅**: 모든 이미지를 `/public/assets`에 직접 담아 같은 origin에서 서빙한다. s3나 클라우드플레어 오브젝트 스토리지를 통해 외부 이미지 CDN을 붙일까 초기에 고민했으나, 더 빠른 방법을 찾았을 때, 그리 많지 않고 변화가 적은 정적인 이미지였기에 이 방식을 선택했다.

`next/image`는 요청 헤더에 맞춰 webp로 자동 변환해준다. 다만 이건 파이프라인이 켜져 있을 때 이야기고, 그마저도 확장자만 바꿔줄 뿐 원본 사진이 4000×3000처럼 쓸데없이 크게 찍혀 있으면 그 큰 원본을 그대로 내려받은 다음 화면에서 작게 욱여넣는 것과 같다. 그래서 배경·패턴 이미지들처럼 원본 자체가 필요 이상으로 큰 경우엔, 포맷 변환과 별개로 원본 크기부터 줄여야 했다.

**이미지 리사이징/압축**: 이전에 실무에서 쓸 때 만들어뒀던 이미지 일괄 압축 배치 파일을 재활용했다. 
폴더째로 넣으면 지정한 비율로 리사이징·압축까지 한 번에 처리해주는 스크립트라, 배경·패턴류 PNG/JPEG들을 한 번에 밀어 넣고 돌렸다. 그 결과 총 용량이 약 11.9MB → 1.7MB로 줄었다(-86%). 

그중 감소 폭이 컸던 파일들이다.

| 파일 | 이전 | 이후 | 감소율 |
|---|---|---|---|
| mountain.png | 2.20MB | 220KB | -90% |
| bibimbap.png | 1.40MB | 190KB | -87% |
| cloud-1.png | 1.00MB | 30KB | -97% |
| background-left-bottom.png | 1.57MB | 407KB | -75% |
| pattern-2.png | 950KB | 52KB | -95% |

출연진 사진 쪽은 포맷 자체를 바꿨다. 무손실 PNG로 올라와 있던 사진들을 JPEG로 재인코딩해서 교체했는데, 뉴벤트 사진은 1.70MB → 207KB, 오투 사진은 2.77MB → 109KB로 줄었다. 사진처럼 색 정보가 많은 콘텐츠에는 PNG의 무손실 압축이 사실상 낭비였던 셈이라, 포맷 전환만으로 대부분의 용량이 빠졌다.

**우선순위 로딩**: 히어로 섹션과 K-마크 그래픽처럼 최초 진입 시 바로 보이는 이미지 19개엔 `priority`를 명시적으로 붙였다. `next/image`는 기본적으로 뷰포트 밖 이미지를 지연 로딩하는데, 반대로 스크롤 없이 처음부터 화면에 보이는 영역(above the fold, 흔히 "접힘 위"로 번역된다 — 예전 신문을 반으로 접었을 때 위쪽에 있어 바로 보이는 기사에서 유래한 표현)의 이미지까지 지연 로딩 대상이 되면 LCP(최대 콘텐츠풀 페인트)가 늦어진다. 히어로 배경의 렌더링 크기도 `w-105 → w-88`처럼 한 단계씩 줄여서, 실제 화면에 필요한 크기보다 크게 그려지는 것도 같이 막았다.

**정직하게 짚어야 할 부분**: 이 프로젝트는 `@opennextjs/cloudflare`로 Cloudflare Workers에 배포되는데, `next/image`의 자동 리사이징·포맷 변환은 `wrangler.jsonc`에 Cloudflare Images 바인딩(`images.binding: "IMAGES"`)이 있어야 동작한다. 지금 배포 설정엔 이 바인딩이 빠져 있어서 `/_next/image` 요청이 들어와도 원본 파일이 그대로 반환된다. 즉 이번 성능 개선의 실체는 next/image의 자동 최적화가 아니라, 커밋 단위로 직접 압축해 넣은 원본 파일 자체였다.

<br/>

## 6. 성능 — 폰트 셀프호스팅

Core Web Vitals는 구글이 공식적으로 밝힌 랭킹 신호 중 하나라, 성능도 SEO 작업 범위에 포함했다.

**변경 전**: CDN에서 Pretendard 폰트를 동기 로드하고 있었다.

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/.../pretendardvariable.min.css" />
```

**변경 후**: `next/font/local`로 셀프호스팅했다.

```ts
const pretendard = localFont({
  src: "../../public/fonts/pretendard/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});
```

**예상 효과**: 외부 에셋을 활용하면서 다른 도메인(cdn.jsdelivr.net)에 처음 접속할 때는 브라우저가 그 주소를 IP로 바꾸는 DNS 조회, 그리고 암호화 연결을 트는 TLS handshake(브라우저와 서버가 "이 키로 암호화해서 통신하자"고 몇 차례 주고받는 협상 과정)를 거쳐야 하는데, 이 왕복이 전부 지연 시간으로 쌓인다. 

셀프호스팅으로 이 도메인 자체가 없어지면서 그만큼 FCP·LCP가 개선될 여지가 생긴다.

부수적으로 로컬에 받아두고 있던 Pretendard 웨이트별 폰트 패키지(otf/ttf/woff/subset 전체, 약 65MB) 중 실제 쓰는 가변폰트 파일 1개(2.0MB)만 남기고 정리했다. 대략 63MB 규모의 불필요한 에셋이 저장소에 들어가는 걸 미리 막을 수 있었다.

<br/>

## 7. PWA manifest 동적화

PWA manifest는 이 사이트가 "앱처럼" 동작하는 데 필요한 정보(이름, 아이콘, 테마 색상, 홈 화면에 추가했을 때 뜨는 이름 등)를 담은 JSON 파일이다. 모바일에서 "홈 화면에 추가"를 누르면 브라우저가 이 파일을 읽어서 아이콘과 앱 이름을 채워준다.

정적 `manifest.json`을 `manifest.ts`로 바꿔서, `name`/`short_name`/`description`이 전부 `site.ts` 상수를 그대로 참조하도록 했다.

이전엔 `name`이 옛 사이트명("K-컬처 페스티벌")으로 고정돼 있었고 `description` 필드 자체가 없었다. 이제는 사이트명이 바뀌면 manifest도 같이 바뀐다.

값이 두 곳에서 따로 노는 문제를 깔끔하게 정리하고 싶었다.

<br/>

## 8. 결과 정리

작업을 마치고 나서, "실제로 확인된 것"과 "앞으로 확인해야 할 것"을 구분해뒀다. 

SEO는 코드를 배포한 시점과 검색 결과에 반영되는 시점 사이에 시차가 있어서, 이 구분을 명확히 해두고자 했다.

| 항목 | 상태 | 근거 |
|---|---|---|
| 구조화 데이터 필수 필드 오류 | **0건** | Search Console 구조화 데이터 검사 |
| 서드파티 렌더 블로킹 요청 | **2개 → 0개** | 네트워크 탭 확인, 빌드 결과물 확인 |
| sitemap 등록 URL | **정적 10개 → 10개 + 공지 상세 N개 자동** | `sitemap.ts` 코드 확인 |
| 배경/패턴 이미지 10개 용량 | **약 11.9MB → 1.7MB (-86%)** | 이미지 리사이징 커밋 전후 비교 |
| 출연진 사진 포맷 전환 | **PNG → JPEG, 파일당 최대 -96%** | 커밋 전후 바이너리 크기 비교 |
| LCP 대상 이미지 우선 로딩 | **19개 `priority` 적용** | 히어로/K-마크 섹션 코드 확인 |
| 저장소 불필요 자산 | **약 65MB → 2.0MB** | 폰트 디렉토리 정리 전후 비교 |
| 메타데이터 일관 적용 페이지 | **11개 라우트 전체** | `createPageMetadata()` 호출부 확인 |
| 표기 변형 alternateName 반영 | **UI 변화 0건, 수정 파일 2개** |  |
| 리치 카드 실제 노출 | 예상 | 크롤링 이후 반영, 보장 안 됨 |
| 지역·연도 키워드 순위 개선 | 예상 | Search Console 실적 리포트로 수일~수주 후 확인 필요 |
| FCP/LCP 개선 폭 | 예상 | 네트워크 환경별 편차 커서 배포 후 실측 필요 |

정리하고 보니, 이번 작업에서 "확실히 좋아졌다"고 말할 수 있는 부분은 대부분 **빌드 타임에 검증 가능한 구조적 개선**이었다.

반면 "검색 순위가 오를 것이다", "리치 카드가 뜰 것이다" 류의 효과는 크롤링·재색인이라는 구글 쪽에 달려 있어서 배포 시점엔 증명할 수 없다. 

이 부분은 Search Console 실적 리포트를 계속 관찰하면서 살펴봐야한다.


![Chrome DevTools Lighthouse SEO 감사 결과 100점, 통과 항목 10개](/assets/NextJS/seo/lighthouse-seo-score.png)

*구글 devtools lighthouse SEO 측정결과*