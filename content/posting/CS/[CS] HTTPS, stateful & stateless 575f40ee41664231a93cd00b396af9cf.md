---
title: "[CS] HTTPS, Stateful & Stateless, URI vs URL"
date: "2025-11-18"
description: "HTTPS의 보안 구조와 SSL/TLS 핸드셰이크, Stateful·Stateless 설계 차이, URI와 URL의 개념 정리"
tags: ["cs", "http", "https", "ssl", "tls", "stateless", "uri", "url"]
thumbnail: "https://www.globalsign.com/application/files/3916/0397/8810/iStock-833750208.png"
---

HTTP 통신을 공부하다 보면 반드시 마주치는 개념들이다. HTTPS가 어떻게 보안을 보장하는지, 왜 HTTP는 Stateless인지, URI와 URL은 어떻게 다른지 순서대로 정리해보자.

<br/>

## HTTPS

**HTTPS(HTTP Secure)** 는 HTTP에 **SSL/TLS** 보안 레이어를 추가한 프로토콜이다.

클라이언트와 서버 사이의 데이터를 암호화해 전송하기 때문에, 중간에서 패킷을 가로채도 내용을 해독할 수 없다. 인터넷 뱅킹, 로그인, 결제 등 민감한 정보를 다루는 모든 서비스에서 필수로 사용된다.

<br/>

### HTTPS의 세 가지 보안 목표

| 목표 | 설명 |
|---|---|
| **도청 방지** | 통신 내용을 암호화해 제3자가 내용을 볼 수 없게 한다 |
| **변조 방지** | 메시지 다이제스트(해시값)를 비교해 데이터 위·변조를 감지한다 |
| **위장 방지** | SSL 인증서로 서버의 신원을 검증해 가짜 서버에 속지 않게 한다 |

<br/>

## SSL/TLS 핸드셰이크

HTTPS 연결은 TCP 커넥션 이후 **SSL/TLS 핸드셰이크**를 통해 수립된다.

이 과정에서 클라이언트와 서버는 서로를 신뢰할 수 있는지 확인하고, 이후 통신에 사용할 암호화 키를 교환한다.

![SSL/TLS 핸드셰이크 과정](/assets/CS/https-stateful-stateless/https-tls-handshake.png)

핸드셰이크는 크게 4단계로 진행된다.

**1. 암호화 방식 결정**

클라이언트가 지원하는 SSL/TLS 버전, 암호화 알고리즘 목록을 서버에 전달하고, 서버가 사용할 방식을 선택해 응답한다.

**2. 통신 상대 인증**

서버가 SSL 인증서를 클라이언트에게 전달한다. 클라이언트는 인증서가 신뢰할 수 있는 인증 기관(CA)에서 발급된 것인지 검증한다.

**3. 키 교환**

실제 데이터 암호화에 사용할 **세션 키**를 교환한다. 공개키 암호화 방식으로 키를 안전하게 전달한 뒤, 이후 통신은 더 빠른 대칭키 암호화로 진행된다.

**4. 핸드셰이크 완료**

양쪽이 같은 세션 키를 갖고 있음을 확인하고 암호화 통신을 시작한다.

<br/>

### HTTP vs HTTPS 비교

| 항목 | HTTP | HTTPS |
|---|---|---|
| 포트 | 80 | 443 |
| 암호화 | 없음 | SSL/TLS |
| 인증서 | 불필요 | 필요 (CA 발급) |
| 속도 | 빠름 | 핸드셰이크 오버헤드 있음 |
| SEO | 불리 | 유리 (구글 랭킹 반영) |

<br/>

## Stateful & Stateless

### 개념 비교

**Stateful** 은 서버가 클라이언트의 상태를 기억하고 유지하는 방식이다.

이전 요청의 맥락을 서버가 보존하고 있어 다음 요청에 반영할 수 있다. 로그인 상태 유지가 대표적인 예다.

**Stateless** 는 서버가 이전 요청에 대한 정보를 전혀 유지하지 않는 방식이다.

각 요청은 완전히 독립적으로 처리되며, 필요한 정보는 매 요청마다 클라이언트가 직접 담아서 보내야 한다.

<br/>

### 왜 HTTP는 Stateless인가

![일대일 vs 다대일 통신 구조](/assets/CS/https-stateful-stateless/stateful-stateless-1to1.png)

일대일 통신에서는 상태를 유지해도 부담이 크지 않다.

그러나 수많은 클라이언트가 접속하는 웹 서비스에서 Stateful 방식을 사용하면, 서버는 모든 클라이언트의 상태를 기억하고 관리해야 한다. 서버 한 대가 감당하기 어렵고, 서버를 교체하거나 확장할 때도 상태 이전 문제가 생긴다.

![Stateless 설계의 수평 확장](/assets/CS/https-stateful-stateless/stateful-stateless-scalability.png)

Stateless 설계에서는 서버가 상태를 저장하지 않으므로 **어느 서버가 요청을 받아도 동일하게 처리**할 수 있다. 이 덕분에 서버를 수평으로 확장(Scale-out)하기 쉽고, 특정 서버 장애가 전체 서비스에 영향을 주지 않는다.

HTTP가 Stateless인 이유가 바로 여기에 있다.

> 로그인 상태처럼 상태 유지가 필요한 경우, 쿠키·세션·JWT 등을 이용해 클라이언트가 매 요청마다 인증 정보를 직접 포함시키는 방식으로 해결한다.

<br/>

## URI vs URL

**URI(Uniform Resource Identifier)** 와 **URL(Uniform Resource Locator)** 은 모두 인터넷 자원을 식별하는 문자열이지만, 포함 관계가 다르다.

![URI와 URL의 포함 관계](/assets/CS/https-stateful-stateless/uri-url-diagram.png)

**URI** 는 자원의 이름 또는 위치를 나타내는 **식별자** 의 상위 개념이다.

**URL** 은 자원의 **위치(경로)** 를 나타내는 URI의 한 종류다. 프로토콜(`https://`)을 포함해 어디서 자원을 가져올 수 있는지 명시한다.

```
example.co.kr           → URI (이름만 식별, 위치 정보 없음)
https://example.co.kr   → URI이자 URL (위치까지 포함)
```

**모든 URL은 URI지만, 모든 URI가 URL은 아니다.**

예를 들어 `urn:isbn:9788966261840` 같은 URN(Uniform Resource Name)은 URI이지만 URL이 아니다. 책의 ISBN 번호처럼 자원을 식별하지만, 어디서 가져올지는 알려주지 않는다.

| 구분 | 역할 | 예시 |
|---|---|---|
| **URI** | 자원 식별 (이름 또는 위치) | `example.co.kr`, `urn:isbn:...` |
| **URL** | 자원의 위치 지정 | `https://example.co.kr/posts/1` |
| **URN** | 자원의 이름 지정 (위치 무관) | `urn:isbn:9788966261840` |
