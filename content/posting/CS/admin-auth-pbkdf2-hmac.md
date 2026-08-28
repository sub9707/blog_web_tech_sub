---
title: "Cloudflare Workers에 어울리는 로그인 방식을 찾아보자! PBKDF2와 HMAC"
date: "2026-08-27"
description: "Web Crypto만을 위해 구현한 K-컬처 페스티벌 프로젝트 관리자 로그인 방식"
tags: ["cs", "security", "auth", "pbkdf2", "hmac", "hashing", "session", "jwt", "nextjs", "cloudflare"]
thumbnail: "/assets/thumbnails/nextjs/kculturepaju-seo-performance.jpg"
relatedPosts:
  - "Cloudflare Workers 무료 플랜의 한계"
  - "Cloudflare Workers — K-컬처 페스티벌 배포기"
  - "[CS] HTTPS, Stateful & Stateless, URI vs URL"
---

'2026 파주 K-컬처 페스티벌' 홈페이지에는 운영자가 공지사항이나 팝업 정보를 관리하는 `/admin` 페이지가 있다.

관리자는 한두 명이고, 하는 일도 글 몇 개 수정하는 정도다. 거창한 회원 시스템이 필요한 게 아니라서 처음엔 늘 하던 대로 JWT 라이브러리나 DB 세션을 떠올렸다. 

이번엔 늘 쓰던 방식 말고, 안전한 로그인을 조금 다른 구조로 직접 만들어보고 그 장점을 확인해보고 싶었다. 

마침 이 프로젝트의 배포 구조가 그쪽으로 등 떠밀기도 했다.

이 사이트는 dev 테스트 환경은 홈랩 라즈베리파이(pm2), production은 Cloudflare Workers로 실행 환경이 둘로 갈려 있고, 둘은 서로 독립된 환경이다.

![K-컬처 페스티벌 프로젝트 구조도 — 소스/배포(GitHub, Cloudflare Workers, 라즈베리파이), 애플리케이션((site) 공개 페이지와 admin 관리자 페이지), 데이터(D1, Supabase Storage), 외부 연동(GA4, Search Console)](/assets/CS/admin-auth-pbkdf2-hmac/kculture-project-architecture.png)

이 글에서 다루는 건 가운데 애플리케이션 블록의 **"세션 기반 접근 제어"** 부분이다.

인증 코드가 양쪽에서 똑같이 돌아야 하니 `bcrypt` 같은 네이티브 라이브러리는 못 쓰고, 두 인스턴스가 같이 바라볼 세션 저장소(Redis 등)를 두는 것도 부담이었다. 

`bcrypt`는 C로 컴파일된 모듈이라 Node에선 돌아가는데, V8 아이솔레이트로 도는 Workers엔 아예 올라가질 않는다(bcrypt 넣었다 박치기 하고 에러를 마주해 알아버렸다..). 

세션 저장소는 라즈베리파이와 Cloudflare가 **물리적으로 떨어진 별개 환경**이라, 둘 다 네트워크로 붙는 외부 DB를 하나 세우고 관리해야 한다. 

관리자 한두명 로그인에 그만한 인프라를 얹는 건 과하다고 판단했다.

게다가 CPU 성능을 생각해 매 요청마다 도는 세션 검증은 무조건 가벼워야 했다(결국은 paid를 질렀지만...).

상태를 서버에 두지 않는 무상태 방식, 표준 Web Crypto API만 사용, 무거운 해싱은 로그인할 때만 돌리기. 

이게 AI 에이전트와 프로젝트 구조를 두고 플랜을 짜면서 낸 결론이었다.

구체적으로는 비밀번호를 PBKDF2로 해싱하고, 세션은 JWT를 라이브러리 없이 축소한 HMAC 서명 토큰으로 직접 만들었다. 

라이브러리에 가려 잘 안 보이던 부분(왜 PBKDF2인지, 서명이 뭘 보장하는지)을 짜보면서 확인하고 싶었던 것도 있다.

위 내용과 과정, 결과에 대해 아래에서 설명해보고자 한다.

---

# 1. 기본 개념

이미 알고 있는 내용도 온전히 소화하기 위해 한 번 더 알아보자.

## 해시 함수

**해시 함수(hash function)** 는 어떤 입력을 넣어도 정해진 길이의 뒤죽박죽 문자열로 바꿔주는 함수를 의미한다.

해시 함수에는 세 가지 성질이 있다.

- **같은 입력이면 항상 같은 출력.** `"1234"`를 넣으면 언제 넣어도 똑같은 결과가 나온다.
- **출력만 보고 입력을 추측하기란 불가능하다.**
- **입력이 조금만 달라져도 출력은 완전히 달라진다.**

```txt
"1234" → a1b2c3d4e5f6...
"1235" → f9e8d7c6b5a4...   (딱 한 글자 바꿔도 전혀 다른 값이 된다)
```

가장 널리 쓰이는 해시 함수가 **SHA-256**이다. 

뭘 넣든 256비트(64자리 16진수) 길이의 결과가 나온다.

<br/>

## 비밀번호를 해시로 저장하는 이유

비밀번호를 DB에 **원문 그대로** 저장하면, 누군가 DB를 통째로 털었을 때 모든 사용자의 비밀번호가 그대로 노출된다. 사람들은 같은 비밀번호를 여러 사이트에 돌려쓰기 때문에, 줄줄이 소세지마냥 털릴 위험이 생긴다.

따라서 비밀번호는 해시값만 저장해야 한다.

```txt
사용자가 입력한 비밀번호:  mypassword123
DB에 저장되는 값:          ef92b778bafe771e89245b89ecbc...
```

로그인할 때는 다음과 같이 검증한다.

1. 사용자가 입력한 비밀번호를 똑같은 해시 함수에 넣는다
2. 그 결과가 DB에 저장된 해시값과 같으면 → 비밀번호가 맞다고 판단

DB가 털려도 공격자 손에 들어가는 건 해시값뿐이고, 그것만으론 원래 비밀번호를 추측할 수 없다.

<br/>

## SHA-256만으로는 부족하다

문제는 SHA-256 같은 일반 해시 함수가 **너무 빠르다**는 것이다. 

기본적으로 파일 무결성 검사 같은 목적이기에, 빠른 속도가 장점이다.

일반 GPU 한 대로 SHA-256을 **초당 수십억 번** 계산할 수 있다. 

공격자는 이걸 악용한다.

- 흔한 비밀번호 목록(`123456`, `password`, `qwerty`...)을 수억 개 준비한다
- 전부 SHA-256으로 돌려서 "비밀번호 → 해시값" 대응표를 만든다 (이걸 **레인보우 테이블**이라고 한다)
- 털어온 DB의 해시값을 이 표에서 찾는다. 있으면 원래 비밀번호를 알아낸 것

빠른 해시는 이 "다 돌려보기(brute force)" 공격에 무력하다.

![비밀번호 저장 방식](/assets/CS/admin-auth-pbkdf2-hmac/sha256-vs-bcrypt-argon2.png)

<bookmark url="https://www.youtube.com/watch?v=riXbmo1Tq_g&t=1s"></bookmark>


위 영상에서 관련 내용을 아주 깔끔하게 다루고 있으니 참고하자.



<br/>

## 방어 방법 1 — salt

**salt**는 비밀번호를 해시하기 전에 붙이는 **사용자마다 다른 랜덤값**이다.

뜬금없지만 왜 하필 salt라는 이름이 붙었는지 궁금해 찾아봤다.

흔히 알려진 유래는 해시브라운처럼 음식을 '다진다'는 뜻의 hash가 문자열을 으깨고, salt는 음식에 소금을 쳐서 맛을 바꾸고 보존력을 높인다는 설이 있다.

또다른 추측으로는 무작위 값을 조금 더해 결과를 완전히 바꾸는 '소금(NaCl)'의 화학적/요리적 성질에서 왔다는 설,

재밌는 다른 설로는 고대 전쟁에서 사람들이 우물이나 농지에 소금을 뿌려 환경을 박살내던 관습에서 가져왔을 것이라는 이야기가 있다.

<bookmark url="https://stackoverflow.com/questions/244903/why-is-a-password-salt-called-a-salt"></bookmark>


```txt
salt 없음:
  "password" → 5e884898da28... 

salt 있음:
  "password" + "x7fa92..." → 8c1a...  (사용자 A)
  "password" + "b3e011..." → 4f9d...  (사용자 B)
```

같은 비밀번호를 써도 salt가 다르면 저장되는 해시값이 완전히 달라진다.

공격자를 혼란에 빠트리는 조미료 변수가 된다.

<br/>

- **미리 만들어둔 레인보우 테이블이 무용지물이 된다.** 

공격자는 salt를 안 뒤에야 표를 만들 수 있고, 그마저도 사용자 한 명당 새로 만들어야 한다. 레인보우 테이블은 비밀번호 크래킹을 위해 암호화 해시 함수의 출력을 캐싱하는 미리 계산된 테이블을 의미한다.
- **같은 비밀번호를 쓴 두 사용자가 DB에서 티가 안 난다.**

salt는 비밀값이 아니다. 해시값 옆에 함께 저장하는 값이다. 

목적은 "숨기기"가 아니라 "매번 다르게 만들기위함"이다.

<br/>

## 방어 방법 2 — PBKDF2

salt로 레인보우 테이블은 막았지만, 해시가 워낙 빠르기에 공격자가 특정 사용자 하나를 노리고 salt를 붙여서 계속 돌려보는 건 여전히 가능하다. 

**PBKDF2**(Password-Based Key Derivation Function 2)는 이 해시 계산을 **일부러 수만 번 반복**해서 일부러 느리게 만든 방식이다.

```txt
SHA-256 1번:        약 0.000001초
PBKDF2 (10만 번):   약 0.05~0.1초
```

정상 사용자 입장에서 0.1초는 로그인 버튼 누르고 눈 깜짝할 시간이다. 하지만 공격자에게는 엄청난 스노우볼이 된다.

```txt
빠른 해시로 후보 10억 개 대입:   몇 초
PBKDF2로 후보 10억 개 대입:      몇 년
```

같은 일을 10만 배 느리게 만들어버리니, 공격을 하기에는 경제성이 무너져버린다.


PBKDF2에 들어가는 재료는 세 가지다.

- **비밀번호** — 사용자가 입력한 값
- **salt** — 사용자마다 다른 랜덤값
- **반복 횟수(iterations)** — 몇 번 돌릴지. 클수록 안전하지만 느리다. 보통 10만~60만

같은 계열의 더 현대적인 함수로 **scrypt**, **Argon2**, **bcrypt**가 있다. 이들은 CPU뿐 아니라 메모리도 많이 쓰게 만들어서 GPU 대량 공격에 더 강하다. 다만 실행 환경을 좀 탄다는 특징이 있다.

<br/>

## 로그인 이후  로그인 여부를 기억하는 방식

비밀번호 검증은 로그인 버튼을 누르는 그 순간 딱 한 번 일어난다. 그런데 로그인에 성공한 뒤 관리자가 페이지를 이리저리 옮겨 다니는 동안, 서버는 매 요청마다 로그인을 했는지 계속 확인해야 한다.

HTTP는 **stateless**다. 

요청 하나하나가 서로를 전혀 모른다. 

방금 로그인한 사람이 다음 페이지를 열어도, 서버 입장에선 어리둥절... 처음 보는 요청이다.

([HTTP가 왜 stateless인지는 이 글을 참고하자](/posts/CS/[CS]-HTTPS,-Stateful-Stateless,-URI-vs-URL))

따라서 로그인에 성공하면 서버가 **"출입증"** 을 하나 발급해서 브라우저에 쥐여준다. 

이후 브라우저는 요청할 때마다 이 출입증을 지참해서 같이 보내고, 서버는 출입증만 확인하면 된다. 이 출입증을 담아 보내는 그릇이 **쿠키(cookie)** 이고, 출입증이 가리키는 로그인 "상태"를 **세션(session)** 이라고 부른다.

<br/>

출입증을 만드는 방식은 크게 두 가지가 있다.

**방식 A — 서버가 기억 (상태 저장 세션)**

출입증에는 랜덤 문자열(세션 ID)만 적어서 준다. 진짜 정보(누가, 언제까지 유효)는 서버 쪽 저장소(DB, Redis 등)에 둔다. 요청이 오면 세션 ID로 저장소를 조회한다.

- 장점: 로그아웃/강제 만료가 가능하고 즉시 이루어진다. (저장소에서 세션을 지우면 됨)
- 단점: 매 요청마다 저장소 조회가 필요하다

**방식 B — 출입증 자체에 다 적기 (상태 비저장 토큰)**

출입증에 `{ 사용자ID, 이름, 만료시각 }` 등(민감 정보나 상세 정보는 담으면 안됨)을 직접 적는다. 서버는 아무것도 저장하지 않는다. 요청이 오면 출입증에 적힌 내용만 보고 판단한다.

- 장점: 저장소 조회가 없다. 서버가 여러 대여도 상관없다
- 단점: 발급한 출입증을 만료 전에 취소시키기 어렵다

방식 B가 바로 **JWT**(JSON Web Token) 방식이다. 그런데 이 방식에는 치명적인 약점이 하나 있다.

<br/>

## JWT의 약점 — 위조

출입증에 `{ 사용자ID: 5, 이름: "guest" }`라고 적혀 있는데, 이걸 받은 사람이 조작하여 `{ 사용자ID: 1, 이름: "admin" }`으로 고쳐서 다시 보내면 어떻게 될까.

서버는 저장해둔 게 없으니 대조할 원본도 없기에 고쳐진 출입증을 고대로 믿어버린다.

그래서 JWT에는 **위조를 감지하는 장치**가 반드시 필요하다.

<br/>

## HMAC

**HMAC**(Hash-based Message Authentication Code)은 "이 데이터는 진짜 우리 서버가 만든 거고, 중간에 안 바뀐건 없다"를 증명하는 장치이다.

구현은 매우 간단하다. **데이터 + 비밀키**를 함께 해시하면 된다. 단, 이 비밀키는 서버만 알고 있어야 하는 값이다.

```txt
payload   = {"sub":1,"username":"admin","exp":1789...}
signature = HMAC_SHA256(payload, 서버_비밀키)

출입증 = payload.signature   ← 이 둘을 붙여서 쿠키에 저장
```

검증할 때는 받은 payload를 서버 비밀키로 **다시 HMAC** 해서, 같이 온 signature와 일치하는지 비교한다.


여기서 두 가지를 짚고가자.

**HMAC은 암호화가 아니다.** 

payload는 까면 볼 수 있는 키밸류 집합이다.

위 예시의 payload를 [Base64](https://ko.wikipedia.org/wiki/Base64) 디코딩하면 사용자 정보가 그대로 읽힌다. HMAC이 막는 건 "읽기"가 아닌 "고치기" 공격이다. 

그래서 토큰에 비밀번호나 민감정보를 넣으면 안 된다.

**HMAC은 PBKDF2와 정반대로 빠르다.** PBKDF2는 일부러 몇십만 번 반복해 돌리지만, HMAC은 SHA-256을 딱 한 번 돌리고 끝이다.PBKDF2는 "느려야" 목적을 달성하고, HMAC은 "빨라도" 목적을 달성한다.

<br/>

## 정리 — PBKDF2와 HMAC은 역할이 다르다

| | PBKDF2 | HMAC |
|---|---|---|
| 목적 | 비밀번호를 안전하게 저장·검증 | 세션 출입증이 위조됐는지 확인 |
| 핵심 성질 | 일부러 느림 (반복 수만 번) | 원래 빠름 (해시 1회) |
| 비밀 재료 | salt (비밀이 아닌 랜덤) | 서버 비밀키 (비밀) |
| 실행 빈도 | 로그인할 때 딱 한 번 | 보호된 페이지 열 때마다 |

이 표의 마지막 줄을 보면 왜 둘을 나누어 쓰는지 알 수 있다. 

이 프로젝트에서 로그인은 어쩌다 한 번이라 0.1초 걸려도 괜찮지만, 관리자 페이지는 클릭할 때마다 세션을 확인해야 한다. 

매 클릭마다 PBKDF2를 10만 번씩 돌리면 서버에 부담이 갈 것이다.

<br/>

---

# 2. 프로젝트 적용

<br/>

## 제약 조건

이 프로젝트에서 개발환경은 홈랩 라즈베리파이(Node.js)에서 돌리고, 운영은 Cloudflare Workers에 올린다.

([Workers로 옮긴 이야기](/posts/DevOps/Cloudflare-Workers-—-K-컬처-페스티벌-배포기) / [무료 플랜 CPU 한도에 데인 이야기](/posts/Troubleshoot/Cloudflare-Workers-무료-플랜의-한계))

문제는 인증 코드가 이 두 환경에서 **똑같이** 동작해야 한다는 것이다.

- `bcrypt`, `argon2` 같은 라이브러리는 순수 JavaScript가 아니다. 속도가 중요한 부분을 C/C++로 짜서 **미리 컴파일해둔 실행 파일**을 Node가 불러다 쓰는 구조인데(이를 네이티브 바인딩이라고 한다), Cloudflare Workers는 Node가 아니라 V8 isloate라는 JS 전용 샌드박스에서 돌기 때문에 그 실행 파일을 못 읽는다.
- Node.js 전용 `crypto` 모듈도 Workers에서는 일부만 지원된다.

따라서 **Web Crypto API**(`crypto.subtle`)만 쓰기로 했다. 

브라우저 표준 API인데 Node.js 18+와 Workers 양쪽 다 포함돼있다. 

또한 bcrypt를 못 쓰니 비밀번호 해싱은 **PBKDF2**로 구현했다. Web Crypto가 기본 제공하는 KDF(Key Derivation Function)가 PBKDF2다.

```ts
// src/lib/auth.ts
const PBKDF2_ITERATIONS = 100_000;
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7일
```

**Cloudflare Workers의 Web Crypto PBKDF2는 반복 횟수 상한이 100,000**이기에 그 값에 맞추어 반복 횟수를 설정했다. 

그 이상을 넘기면 Workers에서 에러가 발생한다. 관리자 계정 한두 개 + salt + 짧지 않은 비밀번호라는 조건에서 감당 가능하다고 판단했다.

<br/>

## 라우트 구조가 곧 보안 경계

인증 로직을 짜기 전에 폴더 구조부터 정했다. App Router에서는 **파일을 어느 폴더에 두느냐가 그대로 보호 여부**가 되게 만들 수 있다.

```txt
src/app/
├── (site)/                     ← 공개. 행사 소개, 공지 열람 등 방문자용 페이지
│   ├── page.tsx
│   ├── community/notice/...
│   └── ...
│
└── admin/
    ├── page.tsx                ← 게이트 밖. /admin 접근 시 /admin/notices로 redirect만
    ├── login/page.tsx          ← 게이트 밖. 로그인 폼
    │
    └── (protected)/            ← 게이트 안
        ├── layout.tsx          ← 여기서 세션을 확인. 통과 X시 /admin/login으로
        ├── notices/page.tsx
        ├── notice-popups/page.tsx
        └── stats/page.tsx
```

`(site)`와 `(protected)`는 소괄호로 감싼 **라우트 그룹(Route Groups)**이라 URL에는 안 나온다(`/admin/(protected)/notices`가 아니라 `/admin/notices`로 나옴). URL 경로는 그대로 두면서 레이아웃만 다르게 씌우는 장치다.

Next.js 공식 문서는 라우트 그룹의 용도로 세 가지를 들고있다. 팀/관심사/기능별로 라우트 묶기, 여러 개의 root layout 두기, 그리고 **같은 폴더 계층에 있는 라우트 중 일부에만 공통 `layout.tsx`를 씌우고 나머지는 빼는 것**.

마지막 용도가 이 프로젝트에서 필요한 목적이다.

`/admin` 아래에는 페이지가 다섯 개가 존재한다.

```txt
/admin               → /admin/notices로 리다이렉트     (레이아웃 필요 없음)
/admin/login         → 로그인 폼                       (로그인 기능, 인증 X)
/admin/notices       → 공지 관리                       (인증 필요)
/admin/notice-popups → 팝업 관리                       (인증 필요)
/admin/stats         → 통계                            (인증 필요)
```

`layout.tsx`는 **자기 폴더 아래 모든 페이지**를 감싸 적용한다. 

그래서 `admin/layout.tsx`에 세션 검사를 넣으면 로그인 페이지까지 같이 걸리고, 로그인하러 들어온 사람이 로그인 페이지 접근을 거부당하는 모순이 생긴다.

그렇다고 인증이 필요한 세 개만 `admin/protected/` 같은 폴더로 묶으면 URL이 `/admin/protected/notices`로 바뀌어버린다.

`(protected)`처럼 **소괄호로 묶으면** URL은 `/admin/notices` 그대로 두면서, `(protected)/layout.tsx`가 그 안의 세 페이지만 감싼다. 밖에 있는 `login`과 `page.tsx`는 이 레이아웃과 무관해진다.

주의할 점도 문서에 있다. 서로 다른 그룹의 라우트가 같은 URL로 겹치면 에러가 난다(`(a)/about/page.tsx`와 `(b)/about/page.tsx`는 둘 다 `/about`이라 충돌). 그룹은 어디까지나 폴더 정리 규칙일 뿐이지, URL을 새로 파는게 아니라는 점만 기억하자.

<bookmark url="https://nextjs.org/docs/app/api-reference/file-conventions/route-groups"></bookmark>

핵심은 `admin/(protected)/layout.tsx` 한 곳이 그 그룹 전체의 문지기라는 것이다. 나중에 관리자 페이지를 추가할 때 `(protected)/` 안에 파일만 만들면 인증이 자동으로 걸린다. 인증 코드를 페이지마다 붙여넣지 않아도 된다.

<br/>

## middleware 쓰면 되잖아?

Next.js에는 파일 하나로 **모든 요청을 가로채서** 인증을 거는 방식이 있다. 흔한 패턴인데 이 프로젝트에는 그 파일이 없다. 

대신, 위에서 본 것처럼 `(protected)/layout.tsx`(페이지)와 `requireAdmin()`(API 라우트) 두 지점에서 직접 확인한다.

참고로, 이 프로젝트가 사용하는 Next.js 16부터 **`middleware`가 `proxy`로 이름이 바뀌었다.** `middleware.ts` 컨벤션은 deprecated 되고 `proxy.ts`로 넘어갔다. 기능은 그대로인데, 공식 설명이 "이름에 목적을 더 잘 비추기 위해" 바꿨다고 한다. 이건 **요청 프록시** 계층이지 인증 계층이 아니라는 걸 이름으로 못박은 것이다.

문서도 대놓고 이렇게 적혀 있다.

> While Proxy can be helpful for optimistic checks such as permission-based redirects, it should not be used as a full session management or authorization solution.

> Proxy는 권한 기반 리다이렉트 같은 낙관적(optimistic) 체크에는 유용할 수 있지만, 완전한 세션 관리나 인가(authorization) 솔루션으로 쓰여서는 안 된다.

<bookmark url="https://nextjs.org/docs/app/api-reference/file-conventions/proxy#execution-order"></bookmark>

그래서 인증은 proxy가 아니라 실제로 보호할 지점(레이아웃, API 핸들러)에 두는 게 Next.js가 권하는 방향이기도 하다. 여기에 이 프로젝트 사정 두 가지가 더 붙는다.

- **proxy는 matcher로 좁히지 않으면 프로젝트의 모든 라우트에서 실행된다.** 

matcher는 `proxy.ts`가 `config`로 내보내는 경로 필터다(예: `matcher: '/admin/:path*'`). 이 값을 안 주면 정적 파일까지 포함해 거의 모든 요청이 proxy 함수를 거친다.

OpenNext로 Workers에 올리면 그만큼 실행 경로가 하나 더 붙는 셈이라, [CPU 예산이 빠듯했던(?) 초기 프로젝트](/posts/Troubleshoot/Cloudflare-Workers-무료-플랜의-한계)에서는 보호 대상이 아닌 요청까지 인증 코드를 거치게 하고 싶지 않았다.

- **보호 대상이 `admin/(protected)/*`와 `/api/admin/*`로 이미 명확하다.** 

굳이 전역에서 걸러낼 게 아니라, 보호가 필요한 그 파일 안에 인증 호출을 같이 두는 편이 "이 라우트는 로그인이 필요하다"는 걸 코드에서 바로 알 수 있게 한다.

물론 그에따른 대가는 있다. 새 API 라우트를 만들 때 `requireAdmin()` 호출을 깜빡하면 고대로 뚫려버린다. 페이지 쪽은 그룹 레이아웃이 한 번에 처리해주지만, API 라우트는 핸들러마다 첫 줄에 직접 써야 한다. 이건 규칙이나 컨벤션으로 강제해야 한다...

<br/>

## 비밀번호 — hashPassword / verifyPassword

이제 비밀번호 뭉갠 방식과 검증했던 방식을 살펴보자.

PBKDF2 호출부분은 이 함수에 하나로 모아뒀다.

```ts
async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256, // 256비트(32바이트) 출력
  );
}
```

1. `importKey`로 비밀번호 문자열을 PBKDF2가 쓸 수 있는 형태로 감싼다.
2. `deriveBits`가 그 비밀번호에 `salt`를 섞어 SHA-256을 10만 번 돌리고, 결과에서 256비트를 잘라 돌려준다.

이 256비트가 "이 비밀번호의 지문" 역할을 한다. 같은 비밀번호 + 같은 salt면 항상 같은 값이 나오고, salt가 바뀌면 완전히 달라진다.


<br/>

**저장할 때** — 관리자 계정을 처음 만들 때 한 번 쓴다.

```ts
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)); // 16바이트 랜덤 salt
  const hash = await pbkdf2(password, salt);
  return `${toHex(salt)}:${toHex(hash)}`; // "salt(hex):hash(hex)"
}
```

결과는 `"3f9a...(32자) : 8c1b...(64자)"` 형태의 문자열 하나다. salt와 해시를 콜론으로 이어 붙여서 D1(Cloudflare의 SQLite) admin 테이블의 `password_hash` 컬럼에 그대로 넣는다. 검증할 때 salt가 다시 필요하니 함께 저장한다.

**검증할 때** — 로그인 요청마다 한 번.

```ts
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const hash = await pbkdf2(password, fromHex(saltHex)); // 저장된 salt로 다시 계산
  return timingSafeEqual(toHex(hash), hashHex);
}
```

저장해둔 salt를 꺼내서, 사용자가 방금 입력한 비밀번호에 붙여 PBKDF2를 다시 돌린다. 그 결과가 저장된 해시와 같으면 비밀번호가 맞은 것이다.

<br/>

## timing-safe 비교

해시 비교를 왜 `===`로 안 하고 `timingSafeEqual`이라는 함수로 할까.

```ts
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i); // 다르면 비트가 켜짐
  }
  return result === 0; // 끝까지 다 돈 뒤에 판정
}
```

일반적인 문자열 비교(`===`)는 **첫 글자가 다르면 그 지점에서 즉시 멈춘다**.

빠른 이유는 그 때문이다.

```txt
정답: "abcdef..."
시도: "x......"  → 1글자만 비교하고 반환 (엄청 빠름)
시도: "abcde.."  → 6글자까지 비교하고 반환 (아주 살짝 느림)
```

공격자가 응답 시간을 정밀하게 측정하면 "앞 몇 글자가 맞았는지"를 추론할 수 있다. 이걸 한 글자씩 좁혀가면 이론상 해시 전체를 알아낼 수 있다. 이런 걸 **타이밍 공격**이라고 한다.

`timingSafeEqual`은 어디서 틀리든 상관없이 **항상 문자열 전체를 끝까지 비교**한 뒤에 결과를 낸다. 그래서 비교에 걸리는 시간이 입력과 무관하게 일정하다. 이 프로젝트에선 Node.js 기본 내장 `crypto.timingSafeEqual`이 있지만 Workers 호환을 위해 직접 구현했다.

<br/>

## 로그인 라우트

`POST /api/admin/auth/login`의 핵심부는 아래와 같다.

```ts
// src/app/api/admin/auth/login/route.ts
const secret = process.env.ADMIN_SESSION_SECRET;
if (!secret) {
  return NextResponse.json({ error: "...ADMIN_SESSION_SECRET이 설정되지 않았습니다." }, { status: 500 });
}

const admins = await d1Query<AdminRow>(
  "SELECT id, username, password_hash FROM admins WHERE username = ?",
  [username],
  { noStore: true }, // 로그인 조회는 캐시하지 않는다
);
const admin = admins[0];

const valid = admin ? await verifyPassword(password, admin.password_hash) : false;

if (!admin || !valid) {
  return NextResponse.json(
    { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
    { status: 401 },
  );
}
```

또 몇가지 적용된 사항들을 보자.

- **비밀키가 없으면 500으로 즉시 중단한다.** "설정이 빠졌으면 통과시키지 말고 실패시킨다(fail closed)"는 원칙에 따른다.
- **아이디가 있든 없든 같은 메시지, 같은 상태코드(401)를 준다.** `"아이디가 존재하지 않습니다"`처럼 나눠서 응답하면, 공격자가 유효한 아이디 목록을 수집할 수 있다. 뭉뚱그려서 추측조차 힘들게 해야한다.
- **DB 조회에 `noStore: true`를 붙인다.** 이 프로젝트의 `d1Query`는 기본적으로 SELECT 결과를 60초 캐시하는데, 로그인 조회가 캐시되면 곤란하므로 매번 강제로 최신화한다.

위 방법들론 완벽하진 않다. 아이디가 없으면 `verifyPassword`(PBKDF2 10만 회)를 **건너뛰기** 때문에 응답이 눈에 띄게 빠르다. 앞서 말한 타이밍 공격과 같은 원리로, 응답 속도만 재도 "이 아이디가 존재하는지"를 추측할 수 있다. 제대로 막으려면 아이디가 없을 때도 더미 해시를 한 번 돌려서 응답 시간을 맞춰줘야 한다. 관리자 아이디가 고정된 소규모 운영이라 지금은 감수하고 있는 부분이다.

로그인 폼(`LoginForm`)은 `"use client"`지만 하는 일은 `fetch` 호출과 에러 표시, 성공 시 `router.push` + `router.refresh()`뿐이다. 검증 로직은 한 줄도 클라이언트에 없다. `router.refresh()`가 중요한데, 이게 있어야 서버 컴포넌트 트리가 새 쿠키를 들고 다시 실행된다. 로그아웃도 대칭으로 두 상태 모두 `delete` 후 `router.refresh()`를 불러 화면을 로그인 상태에 맞춘다.

<br/>

## 세션 발급 — createSessionToken

비밀번호가 맞으면 로그인 API가 이 함수로 출입증을 만든다.

```ts
export type SessionPayload = {
  sub: number;       // 관리자 ID
  username: string;
  exp: number;       // 만료 시각 (epoch ms)
};

export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">, // SessionPayload에서 exp만 빼고!
  secret: string,
  maxAgeSeconds = SESSION_COOKIE_MAX_AGE,
): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };

  const payloadB64 = base64UrlEncode(JSON.stringify(full));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));

  return `${payloadB64}.${base64UrlEncode(signature)}`;
}
```

순서대로 흐름에 맞게 보자.

1. payload에 만료 시각(`exp`)을 박는다. 지금부터 7일 뒤 만료되도록 했다.
2. payload를 JSON 문자열로 만들고 **Base64URL**로 인코딩한다.
3. 그 문자열을 **서버 비밀키로 HMAC 서명**한다.
4. `payload.signature` 형태로 이어 붙여 반환한다.

이 문자열이 `admin_session`이라는 이름의 쿠키에 담겨 브라우저로 간다. 

![브라우저 개발자도구 Application 탭에 저장된 admin_session 쿠키 — payload.signature 형태의 값과 HttpOnly, Secure, SameSite=Lax 속성이 보인다](/assets/CS/admin-auth-pbkdf2-hmac/admin-session-cookie-devtools.png)

쿠키 옵션은 아래와 같이 설정한다.

```ts
cookieStore.set(SESSION_COOKIE_NAME, token, {
  httpOnly: true,       // JS(document.cookie)에서 접근 불가 → XSS로 토큰 탈취 방지
  secure: isHttps,      // HTTPS 요청일 때만 전송
  sameSite: "lax",      // 다른 사이트가 유발한 요청엔 원칙적으로 안 실림 (CSRF 완화)
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE, // 7일
});
```

`secure`를 `true`로 고정하지 않고 `isHttps`라는 변수로 준 이유가 있다. 운영은 Cloudflare 프록시 뒤에 있어서 Worker가 받는 `request.url`의 프로토콜이 클라이언트의 실제 연결(HTTPS)과 다를 수 있다. 그래서 `x-forwarded-proto` 헤더(프록시가 "원래 클라이언트는 http/https 중 뭘로 붙었다"고 뒷단 서버에 알려주는 표준 헤더)를 먼저 보고 HTTPS 여부를 판단한다. 이렇게 안 하면 로컬 `http://localhost`에서 `secure` 쿠키가 아예 안 붙어 로그인이 안 되거나, 반대로 운영에서 프로토콜을 잘못 읽는 문제가 생긴다.

`sameSite`는 `strict`가 아니라 `lax`다. `strict`면 외부 링크나 북마크로 `/admin`에 들어왔을 때 첫 요청에 쿠키가 안 실려서 로그인 화면으로 튕긴다. 상태를 바꾸는 동작은 전부 `fetch`(POST + JSON)로만 이뤄지고 폼 전송이 없어서, `lax`로도 폼 기반 CSRF 위험은 낮다고 봤다.

이 방식은 JWT를 안 쓰고 직접 만든 축소판이다. JWT는 `header.payload.signature` 3토막 속에 알고리즘 정보 등이 들어가지만, 여기선 알고리즘이 HMAC-SHA256으로 고정이라 header를 생략하고 `payload.signature` 2토막으로 줄였다.

서버 비밀키는 `ADMIN_SESSION_SECRET` 환경변수로 주입한다. 이게 유출되면 누구나 admin 출입증을 찍어낼 수 있으므로, 코드에 하드코딩하지 않고 Workers Secrets와 `.dev.vars`로만 관리한다.

<br/>

## 세션 검증 — verifySessionToken

```ts
export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecodeToBuffer(sigB64),
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) return null; // 서명 불일치 = 위조됐거나 다른 키로 만든 것

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
    if (payload.exp < Date.now()) return null; // 만료됨
    return payload;
  } catch {
    return null;
  }
}
```

세션토큰 검증과정이다. 순서대로 보자.

1. **토큰을 `.` 기준으로 자른다** → `payloadB64`(내용), `sigB64`(서명) 두 조각. 둘 중 하나라도 없으면 형식이 깨진 거라 바로 `null`로 리턴 때린다.
2. **서명 키 생성** — 서버 비밀키(`secret`)로 HMAC 검증용 키 객체를 준비한다.
3. **서명 대조** — `crypto.subtle.verify`가 `payloadB64`를 서버 비밀키로 다시 HMAC 해서, 토큰에 붙어온 `sigB64`와 동일한지 대조한다. 동일하지않으면 위조됐거나 다른 키로 만든 토큰이므로 즉시 `null`처리한다.
4. **payload를 읽는다** — 서명이 통과한 뒤에 `payloadB64`를 디코딩·JSON 파싱한다. (이 과정에서 깨진 JSON이면 `catch`로 떨어져 `null`로 방출)
5. **만료를 확인한다** — `exp`가 현재 시각보다 이전이면 만료된 토큰이라 `null` 처리한다.

> **`SubtleCrypto.verify()`** 에 대해 짧게 보고 가자
>
> 이 메서드는 디지털 서명을 검증한다.
>
> 인자로 알고리즘별 매개변수, 서명을 검증할 키, 서명, 그리고 원본 데이터를 받는다. 서명이 유효한지를 나타내는 불리언 값으로 이행되는 `Promise`를 반환한다.
>
> ```js
> verify(algorithm, key, signature, data)
> ```
>
> - **`algorithm`** — 사용할 알고리즘을 지정하는 문자열 또는 객체. 여기 넘기는 값은 대응하는 `sign()` 호출에 넘긴 값과 일치해야 한다. HMAC을 쓰려면 문자열 `"HMAC"` 또는 `{ "name": "HMAC" }`를 넘긴다.
> - **`key`** — 서명 검증에 쓸 `CryptoKey`. 대칭 알고리즘에서는 비밀키, 공개키 방식에서는 공개키에 해당하는 키값이다.
> - **`signature`** — 검증할 서명이 담긴 `ArrayBuffer`.
> - **`data`** — 서명을 검증할 대상 데이터가 담긴 `ArrayBuffer`.
>
> **반환값** — boolean으로 이행되는 `Promise`. 서명이 유효하면 `true`, 아니면 `false`.

<bookmark url="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify"></bookmark>


여기선 PBKDF2가 나오지 않는다. 
DB 조회 또한 없다. 비밀번호를 다시 확인하는 게 아닌, "이 쿠키가 우리가 발급한 게 맞나"만 체크하는 거라, HMAC 검증 한 번이면 충분하다.

<br/>

## 실제 활용

**보호된 페이지 그룹** — `/admin/(protected)` 라우트 그룹의 레이아웃에서 한 번 막는다.

```tsx
// src/app/admin/(protected)/layout.tsx
export default async function AdminProtectedLayout({ children }: LayoutProps<"/admin">) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
    </div>
  );
}
```

`getAdminSession`은 쿠키에서 토큰을 꺼내 `verifySessionToken`으로 넘기는 얇은 래퍼다.

```ts
export async function getAdminSession(): Promise<SessionPayload | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token, secret);
}
```

**API 라우트** — `/api/admin/*` 핸들러 맨 앞에서 가드로 쓴다.

```ts
export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return session;
}

// 호출부
const session = await requireAdmin();
if (session instanceof NextResponse) return session; // 401이면 그대로 반환
// 여기부터 session은 SessionPayload
```

`redirect`(페이지)와 `401 JSON`(API)의 차이만 있고, 안쪽은 둘 다 `getAdminSession` → `verifySessionToken` → HMAC 검증 한 줄이다.

<br/>

## 전체 흐름

```txt
[로그인]  POST /api/admin/auth/login
  │  아이디로 D1에서 admin 행 조회
  │  verifyPassword(입력 비번, 저장된 "salt:hash")   ← PBKDF2 10만 회 (여기서만)
  │  일치하면 createSessionToken({ sub, username })   ← HMAC 서명 1회
  └─ Set-Cookie: admin_session=payload.signature  (HttpOnly, SameSite=Lax, 7일)

[이후 모든 관리자 요청]  GET /admin/notices  등
  │  layout.tsx → getAdminSession()
  │  쿠키에서 토큰 꺼냄 → verifySessionToken()          ← HMAC 검증 1회 (DB 조회 없음)
  ├─ 유효 → 페이지 렌더
  └─ 무효/없음 → redirect("/admin/login")

[로그아웃]  POST /api/admin/auth/logout
  └─ cookieStore.delete("admin_session")  ← 이게 전부. 서버엔 지울 상태가 없음
```

무거운 연산(PBKDF2)은 로그인 순간에 격리돼 있고, 자주 실행되는 경로(매 페이지)에는 가벼운 HMAC 검증만 남는다. [무료 플랜 CPU 한도에 데였던](/posts/Troubleshoot/Cloudflare-Workers-무료-플랜의-한계) 이 프로젝트에서, 만약 매 요청마다 PBKDF2를 10만 번씩 돌렸다면 관리자 페이지는 열 때마다 CPU 시간 초과로 죽었을 것이다. 실제로 그 사건 원인을 분석할 때 "비밀번호 해싱(PBKDF2)이 CPU를 먹는 것 아니냐"는 의심이 나왔는데, 로그인 경로에서만 돌고 일반 요청 경로와 무관하다는 걸 확인하고 원인에서 제외했다.

<br/>

## 그동안 쓰던 방식과 비교 — DB 세션, JWT

지금까지 로그인은 대부분 둘 중 하나로 붙였다. 서버에 세션을 저장하는 **DB 세션**, 아니면 라이브러리로 발급하는 **JWT**. 이번 방식은 사실상 JWT를 라이브러리 없이 축소해 만든 것이라, 셋을 나란히 두면 차이가 분명해진다.

### DB 세션 (전통적인 세션 방식)

쿠키에는 의미 없는 랜덤 문자열(세션 ID)만 넣는다. 진짜 정보(누가, 언제까지, 권한)는 서버 저장소(DB, Redis)에 두고, 요청이 올 때마다 세션 ID로 그 저장소를 조회한다.

- **강제 로그아웃이 쉽다.** 저장소에서 레코드만 지우면 그 세션은 그 즉시 죽는다. "다른 기기에서 로그아웃", "비밀번호 변경 시 전체 세션 종료" 같은 플로우가 빠릿하고 자연스러워진다.
- **세션 내용을 언제든 갱신**할 수 있다. 권한이 바뀔 때, DB에서 값만 고치면 다음 요청부터 반영된다.
- 대신 **매 요청마다 저장소 I/O**가 든다. 서버가 여러 대면 저장소를 공유해야 하고(그래서 보통 Redis를 둔다), 그 저장소가 죽으면 로그인도 같이 죽는다.

<br/>

### JWT (라이브러리로 발급)

`header.payload.signature` 3토막 문자열. `jsonwebtoken`, `jose` 같은 라이브러리로 만든다. 서버는 아무것도 저장하지 않고, 토큰에 적힌 내용과 서명만 보고 판단한다.

- **저장소 조회가 없다.** 서명 검증 한 번이면 끝이라 서버를 몇 대로 늘려도 잘 돌아간다.
- **표준(RFC 7519)이고 생태계가 크다.** `iss` / `aud` / `exp` 같은 표준 클레임이 정해져 있고, OAuth·OIDC를 비롯해 남이 발급한 토큰을 검증하는 시나리오까지 라이브러리가 다 커버한다.
- 대신 **즉시 무효화가 어렵다.** 한 번 발급하면 만료 전까지 유효해서, 강제 로그아웃을 하려면 결국 서버에서 블랙리스트(=작은 DB 세션)를 또 따로 둬야 한다.
- `alg: none` 우회처럼 **JWT 특유의 함정**이 있어서, 라이브러리를 최신으로 유지하고 알고리즘을 고정하는 등의 주의가 필요하다.

<br/>

### 이번 프로젝트 사용 방식

JWT에서 군더더기를 걷어낸 형태다. `header`를 없애고 알고리즘을 HMAC-SHA256으로 **코드에 고정**한 뒤, `payload.signature` 2토막만 남겼다. 누차 강조하지만, 사용자가 매우 적고 접근이 제한된 관리자 로그인이라 가능한 방식이다.

- **무상태라는 점은 JWT와 똑같다.** 저장소 조회 없음, 수평 확장 자유, 즉시 무효화 불가, 페이로드는 그냥 읽힌다. 장단점은 JWT와 다를바 없다.
- **의존성이 0개다.** `jsonwebtoken`은 Node `crypto`에 묶여 Workers에서 안 돌아가고, `jose`는 Workers에서 돌지만 이 프로젝트가 쓰는 기능은 "HMAC 서명/검증" 하나뿐이라 WEB crypto만 쓰는 여기선 표준 JWT 스펙 대부분이 오버스펙이었다.
- **`alg: none` 같은 함정이 원천 봉쇄된다.** JWT는 토큰 헤더에 "이 토큰은 무슨 알고리즘으로 검증해"라는 `alg` 값이 들어있는데, 공격자가 이걸 `none`으로 바꾸고 서명을 떼버리면 허술한 검증기는 "서명 검사 안 함"으로 통과시켜 버린다. 이번 방식은 토큰에서 알고리즘을 읽지 않는다. 검증 코드가 항상 HMAC-SHA256으로 고정돼 있어서, 공격자가 만질 `alg` 값 자체가 없다. 대신 표준이 아니라 이 토큰을 다른 시스템이 검증할 수는 없다.

<br/>

### 정리

| | DB 세션 | JWT | 이번 방식 |
|---|---|---|---|
| 쿠키에 담기는 것 | 세션 ID (랜덤) | 페이로드 + 서명 | 페이로드 + 서명 |
| 서버 저장소 | 필요 (매 요청 조회) | 불필요 | 불필요 |
| 요청당 비용 | 저장소 I/O 1회 | 서명 검증 1회 | HMAC 검증 1회 |
| 즉시 로그아웃 | 쉬움 (레코드 삭제) | 어려움 (블랙리스트 필요) | 어려움 (동일) |
| 서버 수평 확장 | 저장소 공유 필요 | 바로 됨 | 바로 됨 |
| 페이로드 비밀 유지 | 됨 (서버에만) | 안 됨 (base64, 누구나 읽음) | 안 됨 (동일) |
| 의존성 | 세션 미들웨어 + 저장소 | JWT 라이브러리 | 없음 (Web Crypto) |
| 표준 · 생태계 | 프레임워크마다 다름 | RFC 7519, OIDC 등 | 없음 (자체 포맷) |

<br/>

### 각각 어디서 쓰는게 좋을까

- **즉시 무효화가 중요하면 DB 세션.** 금융 서비스, 다중 기기 세션 관리, 관리자가 사용자를 강제 로그아웃시켜야 하는 경우.
- **여러 서비스가 토큰을 공유하거나 외부 인증(OAuth/OIDC)과 엮이면 JWT.** 이때는 직접 만들지 말고 검증된 라이브러리를 쓰는 게 맞다.
- **단일 앱 + 관리자 소수 + 무상태를 원하면** 이번처럼 축소한 서명 토큰으로 충분하다.

실무에서 흔한 절충안은 **하이브리드** 방식이다. 짧은 수명(15분)의 JWT를 access token으로 쓰고, 그걸 갱신하는 refresh token은 DB 세션으로 관리한다. 무상태의 이점을 살리면서 무효화 구멍도 메우는 방식인데, 이 프로젝트는 거기까지 갈 규모가 아니라서 7일짜리 단일 토큰으로 멈췄다.

<br/>

## 보류 사항들

관리자 한두 명 규모이기에 이에 맞춰 의도적으로 뺀 것들을 보자. 

규모가 커지면 [Auth.js](https://authjs.dev/)나 [Lucia](https://lucia-auth.com/) 같은 검증된 라이브러리로 갈아타야 한다.

- **토큰 강제 무효화 없음.** 상태 비저장 방식이라 발급된 토큰은 7일 만료 전까지 유효하다. 비밀번호를 바꿔도 기존 세션은 안 끊긴다. 로그아웃도 서버에서 하는 일은 쿠키 삭제뿐이라, 그 전에 토큰이 복사된 적이 있으면 만료까지 계속 유효하다. (해결책은 비밀키 교체를 통한 전체 세션 무효화, 또는 서버에 무효화 목록 두기 등이 있다)
- **refresh token / 세션 회전 없음.** 7일짜리 단일 토큰이다.
- **로그인 시도 rate limiting은 앱 레벨에 없다.** 무차별 대입 방어는 Cloudflare WAF 쪽에서 다룰 사안으로 미뤄뒀다. ([같은 글의 존 요금제 부분에 정리](/posts/Troubleshoot/Cloudflare-Workers-무료-플랜의-한계))

<br/>

## 끝으로..

이 간단한 admin 로그인 하나에도 서로 다른 목적의 암호 도구 두 개가 들어간다.

- **비밀번호 저장·검증에는 PBKDF2** — salt로 레인보우 테이블을 막고, 반복 10만 회로 무차별 대입을 방대한 양의 쓴맛으로 바꾼다. 로그인할 때만 돈다.
- **세션 출입증에는 HMAC** — 서버 비밀키로 서명해서 위조를 막는다. 내용을 숨기는 게 아닌 다른 엄한 손을 안 탔다는 걸 보증하는 역할이다. 매 요청마다 돌지만 가볍다.

이 둘을 나누는 판단 기준은 **실행 빈도**이다. 자주 실행되는 곳(세션 검증)은 가볍게, 드물게 실행되는 곳(비밀번호 검증)에만 무거운 걸 쓴다. Cloudflare Workers처럼 요청당 CPU를 신경써야하는 환경에서는 이 분리가 특히 중요했다.

세션 방식 자체는 그동안 쓰던 JWT에서 군더더기만 걷어낸 것이고, DB 세션과 비교하면 "즉시 무효화를 포기하는 대신 저장소를 없앤" 맞바꿈이다. 규모가 커지면 이 선택은 다시 바꿔야겠지만, 관리자 한두 명짜리 admin에는 이 정도가 적당했다.
