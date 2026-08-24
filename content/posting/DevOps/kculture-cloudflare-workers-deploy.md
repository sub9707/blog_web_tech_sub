---
title: "Cloudflare Workers — K-컬처 페스티벌 배포기"
date: "2026-08-23"
description: "Vercel, cafe24, 홈랩 라즈베리파이로 편하게 배포해오다가 처음으로 Cloudflare Workers를 선택하며 겪은 시행착오 정리"
tags: ["cloudflare", "workers", "opennext", "wrangler", "nextjs", "devops", "배포"]
thumbnail: "/assets/thumbnails/nextjs/kculturepaju-seo-performance.jpg"
relatedPosts:
  - "구글 검색 결과에 웹사이트를 노출시키자 - Next.js SEO 최적화 시도"
  - "라즈베리파이 홈서버에 Next.js 블로그 배포하기"
---

지금까지 배포는 늘 편한 쪽을 골라왔다.

개인 프로젝트는 그냥 Vercel에 붙이면 끝이었고, 예전에 맡았던 소규모 사이트는 cafe24 호스팅에 올렸다. 

이 블로그는 홈랩 라즈베리파이에 Docker로 직접 컨테이너를 띄워 운영하고 있다. 

([라즈베리파이 홈서버에 Next.js 블로그 배포하기](/posts/DevOps/라즈베리파이-홈서버에-Next.js-블로그-배포하기) 참고) 

세 곳 다 "일단 프로젝트를 올리면 알아서 돌아간다"는 공통점이 있어서 딱히 배포 자체를 고민할 일이 없었다.

이번에 외주로 진행한 '2026 파주 K-컬처 페스티벌' 홈페이지에서 처음으로 Cloudflare Workers를 선택했다.

<bookmark url="https://kculturepaju.com/"></bookmark>

써보니 "Vercel이 대신 해주던 걸 하나씩 직접 챙겨야 하는" 경험의 연속에서 마주친 개념 

V8 isolate, Wrangler, OpenNext, 바인딩(binding) 등 모두 생소했기에, 이번 기회에 하나씩 제대로 정리해보려 한다.

<br/>

## 이번엔 왜 Cloudflare로?

이 프로젝트는 배포 대상이 하나가 아니었다. 

Cloudflare Workers를 1차 배포처(main 브랜치, production 환경)로 두고, 라즈베리파이(pm2 dev 브랜치, development 환경)를 2차 개발 환경 배포처로 고려해 설계했다.

이 사이트는 관공서 행사 페이지라 트래픽이 특정 시기(사전신청, 행사 당일)에 몰릴 수 있는데, 그 순간에 홈 네트워크 회선과 라즈베리파이 한 대에만 의존하는 건 보안적으로나 기본적으로나 맞지 않는 판단이었다(당연히 홈서버로 외주하면 안됨). 

Cloudflare Workers는 요청이 몰려도 전 세계 엣지의 분산 처리를 지원한다.

여기서 엣지(edge)란 사용자와 가장 가까운 위치에 있는 서버를 뜻한다. 보통 서버 하나가 요청을 전부 처리하는 것과 달리, Cloudflare는 전 세계 수백 개 도시에 본인들 서버를 깔아두고 요청이 오면 거리 상 가장 가까운 서버가 대신 처리하게 한다. 그래서 한국 방문자든 해외 방문자든 각자 가까운 서버로 요청이 갈리기 때문에, 트래픽이 몰려도 한 지점에 몰리지 않는다. 

Cloudflare Workers는 이 엣지 서버들 위에서 그대로 실행되므로, 요청이 몰려도 전 세계 엣지에서 분산 처리되고, 무료 티어 한도 안에서도 이 정도 규모의 이벤트 사이트는 충분히 감당한다(대략 1-2만명을 수용 가능).

문제는 "한 코드베이스로 두 런타임(prod, dev)에서 동일하게 돌아가야 한다"는 제약이 따라온다는 점이었다. 

이번엔 배포 플랫폼을 하나 고른 게 아니라, "여러 런타임에서 동시에 살아남는 코드"를 짜야 했던 셈이다. 

그리고 그 두 런타임이 얼마나 다른 환경인지를 몸으로 배운 게 이 포스팅이다.

<br/>

## 상업적 이용과 비용 — Vercel Pro vs Cloudflare Workers

기술적인 이유를 다 걷어내도, 이 프로젝트엔 애초에 Vercel의 무료 플랜(Hobby)을 쓸 수 없는 사정이 있었다. 이건 성능이나 기능의 문제가 아니라 **약관의 문제**였다.

### Vercel Hobby는 상업적 이용이 원천 금지다

Vercel의 Fair Use Guidelines엔 "상업적 이용(Commercial usage)"의 정의가 이렇게 못박혀 있다.

> Commercial usage is defined as any Deployment that is used for the purpose of financial gain of **anyone** involved in **any part of the production** of the project, including a paid employee or consultant writing the code.
>
> 상업적 사용(Commercial usage)은 프로젝트의 제작 과정에 어떤 형태로든 참여한 사람 중 누구라도 금전적 이익을 얻을 목적으로 이루어지는 모든 배포(Deployment)를 의미한다.
>
> - Receiving payment to create, update, or host the site

즉 "돈을 받고 사이트를 만들거나 호스팅해주는 것" 자체가 상업적 이용의 정의에 들어간다. 이 프로젝트는 외주로 돈을 받고 만드는 사이트니, 트래픽이 하루 10명이든 방문자가 0명이든 상관없이 Hobby 플랜은 이용약관상 처음부터 후보에서 제외되는 대상이었다. 실제로 Vercel은 이런 위반을 적발하면 경고 후 배포를 일시 중지시킨다.

<bookmark url="https://vercel.com/docs/limits/fair-use-guidelines"></bookmark>

그래서 Vercel을 쓰려면 최소 **Pro 플랜, $20/월**이 고정비로 깔린다. 이 비용은 트래픽과 무관하게 매달 청구되는 정액제다. 행사 페이지 특성상 사전신청 기간과 행사 당일 며칠을 빼면 트래픽이 거의 없는데, 그 한산한 기간에도 $20은 똑같이 나간다.

모두하나대축제 당시에는 트래픽이 몰릴 것에 대비하여 이 Vercel pro 플랜을 구입하였다.

### Cloudflare Workers는 무료 플랜부터 상업적 이용 제한이 없다

반대로 Cloudflare Workers의 공식 요금 문서 어디에도 "비상업적 용도로만 사용 가능"이라는 문구가 없다. 무료 플랜(Free)도 상업 서비스에 그대로 쓸 수 있다.

<bookmark url="https://developers.cloudflare.com/workers/platform/pricing/"></bookmark>

| | Free | Paid |
|---|---|---|
| 월 비용 | $0 | $5부터 |
| 요청 한도 | 100,000회/일 | 1,000만 회/월 포함, 초과분 $0.30/100만 회 |
| CPU 시간 | 요청당 10ms | 3,000만 CPU-ms/월 포함, 초과분 $0.02/100만 CPU-ms |
| 상업적 이용 제한 | 없음 | 없음 |
| 과금 단위 | — | 사용량 기준 (시트/인원 개념 없음) |

### 이 프로젝트에 어느 쪽이 더 적합할까

행사 사이트는 트래픽이 균일하지 않고 특정 시기에만 몰릴 것으로 판단했다. 

Vercel Pro는 시트 단위 정액비가 먼저 깔리고 그 위에 사용량이 얹히는 구조라, 트래픽이 없는 달에도 고정비를 계속 지불해야 한다. Cloudflare는 처음부터 사용량 기준이라 한산한 기간엔 무료 한도 안에서 끝나고, 트래픽이 몰리는 기간에만 실제 사용한 만큼 비용이 붙는다. 외주로 한 번 납품하고 끝나는 사이트에 매달 $20짜리 SaaS 구독을 클라이언트에게 지우는 것도 부담스러운 그림이라, 저비용-상업적 이용 제한 없음 조건 모두에서 Cloudflare가 이 프로젝트 성격에 더 맞았다.

### 플랜 이전은 둘 다 어렵지 않다

트래픽이 늘어서 무료 한도를 넘기더라도, 두 플랫폼 다 "한도를 넘으면 사이트가 죽는" 방식이 아니라 상위 플랜/종량제로 자연스럽게 넘어가는 구조다.

- **Vercel**: 대시보드에서 팀을 Pro로 업그레이드하고 결제 수단만 등록하면 끝난다. 코드나 배포 설정을 바꿀 필요가 없다.
- **Cloudflare**: 대시보드에서 계정을 Workers Paid로 전환하면 끝난다. `wrangler.jsonc`나 코드를 건드릴 필요가 없고, 무료 플랜에서 쓰던 바인딩·설정이 그대로 유지된다.

차이는 "언제부터 비용이 발생하느냐"에 있다. Vercel은 상업적 이용이 확인되는 순간(트래픽 여부와 무관하게) Pro로 올라가야 하고, Cloudflare는 실제로 무료 한도(하루 10만 요청)를 넘어서는 시점부터 자연스럽게 Paid로 넘어가면 된다. 이 프로젝트처럼 저·중간 트래픽의 외주 사이트에는 후자가 훨씬 자연스러운 확장 경로였다.

### 실제로 지금 얼마나 쓰고 있을까

말로만 "충분하다"고 하기보다, 실제 대시보드 수치를 보는 게 정확하다.

![Cloudflare Workers 대시보드 — 최근 24시간 지표. 자산 요청 10.16k, 호출 9.14k, Cache 적중률 97.87%, 오류 16건(0.2%)](/assets/DevOps/kculture-cloudflare-workers-deploy/cloudflare-workers-dashboard-metrics.png)

지난 24시간 기준으로 자산 요청은 10.16k, 실제 Worker 호출은 9.14k이었다. 무료 플랜의 하루 요청 한도가 10만 회이니, 지금 이 사이트가 쓰고 있는 양은 그 한도의 대략 **1/10 수준**이다. 심지어 Cache 적중률이 97.87%라, 정적 자산 요청 대부분은 Worker를 아예 거치지 않고 엣지 캐시에서 바로 응답되고 있다는 뜻이라 실제 부하는 이 숫자보다도 더 여유롭다. 사전신청이나 행사 당일처럼 트래픽이 몇 배 튀는 순간이 오더라도, 무료 한도 안에서 충분히 커버될 것으로 보인다.

<br/>

## Next.js가 Vercel 위에서만 편한 이유

Next.js는 Vercel이 만든 프레임워크다. Vercel에 올리면 SSR, ISR, 이미지 최적화, 미들웨어 같은 기능이 별도 설정 없이 그냥 동작하는데, Vercel이 자기 인프라를 Next.js 전용으로 맞춰뒀기 때문이다(커뮤니티에서 말이 가장 많음).

<bookmark url="https://nextjs.org/docs/app/guides/deploying-to-platforms"></bookmark>

Next.js 공식 문서에도 이 구조가 그대로 설명돼 있다. 

Next.js를 돌리는 데 필요한 최소 요건은 사실 Node.js 서버 하나뿐이지만, ISR·PPR(Partial Prerendering)·Server Actions 같은 기능이 원래 성능대로 동작하려면 스트리밍 지원과 공유 캐시 같은 추가 인프라가 필요하다고 못박아 둔다. 

그리고 그 "추가 인프라"를 프레임워크 제작사가 자기 인프라에 이미 맞춰둔 곳이 Vercel이다. 

같은 문서에 Cloudflare, AWS, Fastly 같은 다른 플랫폼들이 각자 어떤 방식으로 이 요건을 채울 수 있는지도 표로 정리돼 있는데, 이게 바로 OpenNext 같은 어댑터들이 메워야 하는 부분이다.

- SSR/ISR용 서버리스 함수(요청이 올 때만 필요한 만큼 떠서 코드를 실행하고 끝나는 서버)를 개발자가 직접 서버를 만들 필요 없이 Vercel이 배포 시점에 알아서 만들어서 붙여준다 (이걸 "프로비저닝"이라 부르는데, 인프라를 사람이 직접 세팅하는 대신 시스템이 필요할 때 자동으로 준비해주는 것을 의미한다.)
- `next/image` 요청이 들어오면 Vercel의 이미지 최적화 서버가 즉석에서 리사이징·포맷 변환
- 미들웨어는 Vercel Edge Network 위에서 그대로 실행된다. 앞서 설명한 "엣지" 개념을 Vercel도 자체적으로 구축해둔 것으로, Vercel이 전 세계에 깔아둔 자체 엣지 서버 네트워크를 부르는 이름이 Vercel Edge Network다

Next.js 코드를 짤 때 "이 함수는 Node.js 서버에서 실행된다"는 전제가 프레임워크 곳곳에 깔려 있다. 그 전제가 성립하는 곳이 Vercel이다 보니, 다른 플랫폼에 올리려면 그 전제가 깨지는 지점을 하나씩 찾아서 메워야 한다.

<br/>

## Cloudflare Workers는 Node.js 서버가 아니다

여기서부터 생소한 용어가 쏟아지기 시작했는데, 하나씩 짚어보자.

### Workers, 그리고 V8 isolate

Cloudflare Workers는 "코드를 올리면 전 세계 Cloudflare 엣지 서버에서 실행해주는 서버리스 플랫폼"이다. 여기까지는 AWS Lambda 같은 서버리스 서비스와 비슷하게 보이지만, '실행 방식'이 근본적으로 다르다.

Lambda 같은 전통적 서버리스는 요청이 올 때마다(또는 필요 시) **컨테이너**를 하나 띄운다. 컨테이너 안에는 OS, 언어 런타임, 의존성이 통째로 들어있어서, 처음 뜰 때(콜드 스타트, cold start) 이 전체를 부팅하는 데 수백 ms~1초 이상 걸릴 수 있다.

Workers는 컨테이너 대신 **V8 isolate**라는 서비스를 사용한다. 

V8은 Chrome과 Node.js가 공통으로 쓰는 JS 엔진인데, 이 V8 위에 "격리된 실행 컨텍스트"를 여러 개 띄우는 게 isolate다. 

비유하자면, 컨테이너가 "집을 통째로 하나씩 새로 짓는 것"이라면, isolate는 "이미 지어진 건물 안에 격리된 방을 하나씩 배정하는 것"에 가깝다. 방마다 메모리는 완전히 분리되지만, 건물(V8 런타임 프로세스) 자체는 미리 켜져서 공유되고 있으니 방을 하나 새로 배정하는 비용이 훨씬 싸다.

결과를 보자면, Workers의 cold start는 5ms 미만인 반면, 컨테이너 기반 플랫폼은 보통 200ms~1초대에 가깝다. 

isolate 하나의 기본 메모리 오버헤드도 약 2MB 수준으로, 컨테이너(보통 30~50MB부터 시작)보다 훨씬 가볍다. (메모리 오버헤드: 실행 단위 하나를 띄워두는 데도 기본으로 잡아먹는 메모리 비용. 작을수록 서버 한 대에 더 많이 동시에 띄울 수 있다.)

<bookmark url="https://developers.cloudflare.com/workers/reference/how-workers-works/"></bookmark>

### Node.js가 아닌데..

문제는 V8이 Node.js의 엔진이긴 하지만, **Node.js 자체는 아니라는** 점이다.

Workers는 V8만 가져다 쓰고 그 위에 Node.js가 아닌 자체 API 셋을 얹었다.

그래서 Workers 환경에는 기본적으로 다음이 없다.

- 파일 시스템 (`fs` 모듈 자체가 없음 — Workers엔 "디스크"라는 개념이 없다)
- Node 전용 내장 모듈 (`crypto`, `buffer`, `stream` 등은 기본으로는 접근 불가)
- 요청 사이에 살아남는 전역 변수나 백그라운드 타이머 (isolate는 요청이 끝나면 그대로 정리된다. `setTimeout`이 요청 생명주기를 넘어 살아남지 않는다)

Next.js 빌드 산출물은 이런 것들이 당연히 있다고 가정하고 만들어지기 때문에, `next build` 결과를 Workers에 그냥 올리면 실행 자체가 안 된다.

<br/>

## OpenNext — Next.js를 Vercel 밖에서 돌리기 위한 변환기

여기서 어댑터가 필요해진다. **OpenNext**(`@opennextjs/cloudflare`)가 그 역할을 한다.

OpenNext는 원래 "Next.js를 AWS Lambda 위에서 돌리기 위한 프로젝트"로 시작해서, 이후 Cloudflare Workers를 포함한 여러 비-Vercel 인프라로 대상을 넓힌 오픈소스이다. 

**`next build`가 만든 결과물(Vercel 인프라 전제로 짜인 서버 코드)을, 목표 플랫폼이 이해할 수 있는 형태로 한 번 더 변환한다.**

<bookmark url="https://opennext.js.org/cloudflare"></bookmark>

이 프로젝트 `package.json`에는 이런 스크립트가 있다.

```json
"scripts": {
  "cf:build": "opennextjs-cloudflare build",
  "cf:preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "cf:deploy": "opennextjs-cloudflare build && wrangler deploy"
}
```

이를 풀어보면 다음과 같다.

```txt
1. next build                        → Vercel 전제로 빌드된 결과물 (.next/)
2. opennextjs-cloudflare build        → 그 결과물을 Workers가 실행 가능한 형태로 변환 (.open-next/)
3. wrangler deploy                    → 변환된 결과물을 실제로 Cloudflare에 업로드
```

변환 결과물은 `.open-next/worker.js`라는 단일 진입점으로 모인다. `wrangler.jsonc`의 `main` 필드가 바로 이 파일을 가리킨다.

```jsonc
{
  "main": ".open-next/worker.js"
}
```

Cloudflare 입장에서는 "무슨 프레임워크였는지" 알 필요가 없다. 

그저 `worker.js` 하나를 실행하는 것뿐이고, 그 안에 Next.js 서버 로직 전체가 Workers가 이해하는 형태로 이미 눌려 담겨 있는 것이다. 

OpenNext가 하는 일은 결국 "Next.js 서버 → 하나의 Worker 스크립트"로 눌러 담는 변환기 역할이다.

<br/>

## Wrangler — Cloudflare 개발자 플랫폼의 CLI

`wrangler deploy`가 실제로 업로드를 담당한다고 썼는데, **Wrangler**가 뭔지부터 짚고 넘어가는 게 맞을 것 같다.

Wrangler는 Cloudflare Developer Platform 전용 커맨드라인 도구다. `git`이 Git 저장소를 다루는 CLI이듯, Wrangler는 Cloudflare Workers 프로젝트를 다루는 CLI라고 보면 된다.

<bookmark url="https://developers.cloudflare.com/workers/wrangler/"></bookmark>

이 프로젝트에서 실제로 사용한 기능만 추려보자.

| 명령 | 역할 |
|---|---|
| `wrangler dev` | 로컬에서 Workers 런타임을 흉내내며 개발 서버 실행 |
| `wrangler deploy` | 코드와 설정을 실제 Cloudflare 엣지에 배포 |
| `wrangler d1 execute ...` | D1(Cloudflare의 SQLite 기반 DB) 콘솔 명령 실행 |

그리고 이 모든 설정의 중심에 `wrangler.jsonc` 파일이 있다. 프로젝트 이름, 진입점, 호환성 설정, 그리고 뒤에서 다룰 바인딩까지 전부 여기서 선언한다.

```jsonc
// wrangler.jsonc
{
  "name": "k-culture-festival",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-08-08",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "images": {
    "binding": "IMAGES"
  }
}
```

이 파일이 사실상 이번 포스팅에서 다루는 내용의 지도에 해당한다.

<br/>

## compatibility_flags

`nodejs_compat`는 Workers에서 일부 Node.js 내장 API(`node:crypto`, `node:buffer`, `node:stream` 등)를 쓸 수 있게 열어주는 호환성 플래그다. Workers 런타임 자체가 Node.js가 된다는 뜻이 아니라, Node 전용 모듈을 임포트했을 때 나는 "그런 모듈 없음" 에러를 줄여주는 호환 레이어에 가깝다.

이 플래그는 최근 성격이 바뀌었다. 2026년 8월 4일부터, `compatibility_date`가 그 날짜 이후인 Workers는 `nodejs_compat`가 **기본으로 켜진 상태로 시작**한다. 이 프로젝트의 `compatibility_date`는 `2026-08-08`이라 이미 그 기준을 넘겼고, 그래서 `wrangler.jsonc`에 명시한 `"compatibility_flags": ["nodejs_compat"]`는 사실 지금은 있으나 없으나 동작에 차이가 없는 상태다. Wrangler가 이런 중복 플래그는 조용히 무시하도록 만들어져 있어서 에러가 나진 않는다.

<bookmark url="https://developers.cloudflare.com/workers/configuration/compatibility-flags/"></bookmark>

<br/>

## 발목잡힌 문제 1 — 미들웨어 부재

가장 크게 발목을 잡은 건 인증이었다. 이 프로젝트가 쓰는 Next.js 16부터는 예전 `middleware.ts` 컨벤션이 사라지고 `proxy.ts`로 이름이 바뀌었는데, 여기서 조건이 하나 붙는다. **`proxy.ts`는 항상 Node.js 런타임에서만 실행된다.** Edge 런타임으로 돌리지 못하고 고정시킨 것이다.

그런데 `@opennextjs/cloudflare` 어댑터는 아직 이 `proxy.ts`(Node.js 런타임 강제)를 지원하지 않는다. 빌드는 되더라도, Node 전용 모듈을 임포트하려다 500 에러가 나는 식으로 터진다. Cloudflare `workers-sdk` 저장소에 이 문제가 정확히 "Version Trap"이라는 이름으로 이슈가 올라와 있다.

<bookmark url="https://github.com/cloudflare/workers-sdk/issues/13755"></bookmark>

원래 이 프로젝트는 관리자 페이지 인증을 `proxy.ts` 하나로 처리했다.

```ts
// src/proxy.ts (삭제됨)
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  // ... 세션 쿠키 검증 후 통과/리다이렉트
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

`/admin`이나 `/api/admin` 아래로 들어오는 모든 요청이 이 파일 하나를 반드시 거치는 구조였다. 편했지만, Cloudflare Workers 위에서는 이 파일이 존재하는 것 자체가 배포 실패 원인이 됐다.

해결 방법은 우회하는 것이었다. 

미들웨어라는 "공통 관문" 구조를 없애고, 세션 검증 로직을 `getAdminSession()` 함수 하나로 뽑아낸 뒤, 이 함수를 **보호가 필요한 지점마다 직접 호출**하는 방식으로 바꿨다.

어드민 기능도 그리 많지 않고 확장이 더 이상 없을 것이라 판단해 이렇게 했다.

```ts
// src/lib/auth.ts
export async function getAdminSession(): Promise<SessionPayload | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token, secret);
}
```

```ts
// src/app/admin/(protected)/layout.tsx
const session = await getAdminSession();
if (!session) redirect("/admin/login");
```

`/api/admin/*` 라우트 핸들러들도 각자 최상단에서 같은 함수를 호출해 401을 직접 응답하도록 바꿨다. 전역 미들웨어가 사라진 대신, 보호 대상 라우트마다 이 체크를 빼먹지 않고 넣어야 하는 책임이 생긴 셈이다. 편의성과 안전성을 맞바꾼 것이 되었는데, 지금 이 플랫폼 조합(Next.js 16 + OpenNext Cloudflare 어댑터)에서는 다른 선택지가 없었다.

인증 로직 자체도 Web Crypto API(`crypto.subtle`)만으로 짜게 되었다. Node 전용 `crypto` 모듈이나 `bcrypt`을 고대로 썼다면 Workers에서 아예 실행조차 되지 않았을 것이다..

<br/>

## 실전에서 걸린 문제 2 — 이미지 바인딩

두 번째는 이미지 최적화였다. Vercel에서는 `next/image`가 알아서 요청 헤더를 보고 webp로 변환하고, 화면에 필요한 크기로 리사이징해서 내려준다. 이걸 처리하는 이미지 최적화 서버가 Vercel 인프라에 이미 붙어있기 때문이다.

솔직히 말하면 이전까진 `next/image`만 쓰면 Next.js가 알아서 이미지를 최적화해주는 줄 알았다. 그게 Vercel의 이미지 최적화 서버가 뒤에서 대신 해주고 있던 일이었다는 걸 몰랐던 것이다. 프레임워크 기능이라고 믿었던 것 중 상당수가 사실 배포 플랫폼의 지원이었다는 걸 이번에 제대로 알게 됐다.

Workers에는 이 서버가 없다. 그 자리를 대신하는 게 **Cloudflare Images 바인딩**이다.

### 바인딩(binding)?

여기서 "바인딩"이라는 Cloudflare 특유의 개념을 짚어야 한다. 바인딩은 Worker 코드가 D1, R2, KV, Images 같은 Cloudflare 리소스에 접근하는 통로인데, 일반적인 REST API 호출과는 결이 다르다.

REST API를 쓴다면 코드에서 `fetch("https://api.cloudflare.com/...")`처럼 네트워크 요청을 직접 날려야 한다. 바인딩은 그 대신 `wrangler.jsonc`에 리소스를 선언해두면, 런타임이 그 리소스를 코드 안 `env` 객체에 **미리 연결된 객체로 주입**해준다. 코드 입장에서는 네트워크 너머의 API를 부르는 게 아니라, 이미 손에 쥐어진 로컬 객체의 메서드를 호출하는 것처럼 느껴진다. (지연 시간이나 인증 토큰 관리를 신경 쓸 필요가 없다는 뜻이다.)

이 프로젝트가 D1을 바인딩이 아니라 REST API로 접근하도록 짠 이유도 이 지점과 맞닿아 있다. 네이티브 바인딩은 Cloudflare Workers 런타임 안에서만 존재하는 개념이라, 같은 코드가 라즈베리파이의 순수 Node.js 환경에서는 애초에 성립하지 않는다. 이식성을 포기할 수 없어서 일부러 더 느리고 번거로운 REST API 경로를 선택한 것이다. 반면 이미지 최적화는 Cloudflare 전용 배포 경로에서만 의미가 있는 기능이라 바인딩으로 붙여도 문제가 없었다.

### images.binding: "IMAGES"

`wrangler.jsonc`에 이 세 줄을 추가하면 된다.

```jsonc
{
  "images": {
    "binding": "IMAGES"
  }
}
```

이 설정이 있어야 `@opennextjs/cloudflare`가 제공하는 `next/image` 호환 최적화 API가 실제로 Cloudflare Images 서비스를 거쳐 리사이징·포맷 변환을 수행한다. 바인딩이 없으면 `/_next/image` 요청이 들어와도 원본 파일이 그대로 반환된다 — 에러가 나는 게 아니라, **최적화가 조용히 아무것도 안 하고 원본을 그대로 흘려보내는** 방식으로 실패한다는 점이 까다로웠다.

<bookmark url="https://opennext.js.org/cloudflare/howtos/image"></bookmark>

실제로 이 프로젝트에서도 이 바인딩이 한동안 빠져 있었다. SEO·성능 작업을 정리한 [이전 포스팅](/posts/NextJS/구글-검색-결과에-웹사이트를-노출시키자-Next.js-SEO-최적화-시도)에서는 "지금 배포 설정엔 이 바인딩이 빠져 있어서 원본이 그대로 반환된다"고 정직하게 적어뒀던 상태였는데, 이번에 바인딩을 추가하면서 그 구멍을 메웠다.

```diff
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
+ },
+ "images": {
+   "binding": "IMAGES"
  }
```

프로젝트 당시에는 배경·패턴 이미지 원본 자체를 압축·리사이징해서 커밋하는 방식으로 우회했었다. 

그건 그것대로 유효한 최적화지만, `next/image`의 자동 파이프라인이 하는 일과는 별개였다. 

바인딩을 붙인 지금은 두 방식이 같이 동작한다. 

원본 자체도 가볍고, 그 위에 요청 시점 리사이징·포맷 변환까지 얹히는 구조다.

<br/>

## 결과 정리

| 항목 | Vercel / 홈랩 | Cloudflare Workers |
|---|---|---|
| SSR/ISR | 인프라가 알아서 처리 | OpenNext가 변환한 Worker가 처리 |
| 이미지 최적화 | 자동 (별도 서버 내장) | `images.binding: "IMAGES"` 명시 필요 |
| 미들웨어(`proxy.ts`) | 그대로 동작 | 현재 어댑터에서 미지원, 라우트별 수동 체크로 대체 |
| DB 접근 | 라이브러리/네이티브 드라이버 자유 | 이식성 위해 D1도 REST API 경유 |
| 인증 암호화 | Node `crypto` 등 자유 | Web Crypto API로 제한 |
| 실행 단위 | 컨테이너/Node 프로세스 | V8 isolate |
| Cold start | 수백 ms 이상 | 5ms 미만 |

정리하고 보니, 이번 작업의 본질은 "Cloudflare가 어렵다"보다는 "**Vercel이 대신 해주던 걸 하나하나 눈에 보이게 직접 쥐어야 한다**"는 것에 가까웠다.

미들웨어도, 이미지 최적화도, DB 접근 방식도 전부 Vercel 위에서는 신경 쓸 필요가 없었던 것들이다. 
 
Cloudflare Workers는 그 편의를 걷어내는 대신, 5ms 미만의 cold start와 전 세계 엣지 분산, 그리고 무료 티어로도 감당되는 비용을 준다.

동시에 개발 커뮤니티에서 왜 NextJS와 Vercel이 독단적 생태계로 악명이 자자한지 맛볼 수 있었다..

<br/>

## 참고 자료

<bookmark url="https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/"></bookmark>

<bookmark url="https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/"></bookmark>
