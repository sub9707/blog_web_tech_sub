---
title: "라즈베리파이 홈서버에 Next.js 블로그 배포하기"
date: "2026-04-28"
description: "라즈베리파이 홈서버에 Next.js 블로그를 자동 배포하는 환경을 구축하고 이 과정을 정리함"
tags: ["devops", "docker", "nginx", "raspberry-pi", "github-actions", "nextjs"]
thumbnail: "/assets/thumbnails/devops-raspberry-pi-thumbnail.png"
---

## 배경

기존에는 라즈베리파이에 소스를 직접 올리고 PM2로 실행하는 방식으로 배포하고 있었다.

홈서버 사용하는 프로젝트 때마다 매번 소스를 파일서버나 GIT을 통해 수동으로 밀어 넣어야 했고, 의존성 설치도 직접 해야 하는 번거로움이 있었다.

이번에는 HTTPS 사용과 CI/CD를 통해 주기적으로 소스가 업데이트되는 환경을 구성해 이 블로그를 만들고 여기 기록하였다.

아래 스택을 조합해서 **git push 하나로 끝나는 자동 배포 환경**을 구축했다.

```
Docker + Nginx + Let's Encrypt + GitHub Actions + GHCR + Watchtower
```

<br/>

## 전체 구조

![전체 배포 아키텍처](/assets/raspberry-pi-architecture.png)

```
PC (개발)
  └─ git push main

GitHub Actions (클라우드 빌드 서버)
  └─ arm64 Docker 이미지 빌드
  └─ GHCR에 이미지 업로드

라즈베리파이 (홈서버)
  ├─ blog 컨테이너        Next.js 앱 실행
  ├─ nginx 컨테이너       리버스 프록시 + SSL 처리
  ├─ watchtower 컨테이너  새 이미지 감지 → 자동 재배포
  └─ certbot              Let's Encrypt 인증서 발급/갱신
```

PC에서 push하면 Actions가 빌드하고, Watchtower가 감지해서 자동으로 재배포한다.

라즈베리파이에는 소스코드가 없다. Docker 이미지만 받아서 실행한다.

<br/>

## 기술 선택 이유

### Docker를 선택한 이유

기존 PM2 방식은 소스를 직접 서버에 올리고 `npm install`까지 서버에서 실행해야 했다.

Node.js 버전이 달라도 문제가 생기고, 의존성 설치가 실패하면 서버가 죽어버린다.

Docker는 앱 실행에 필요한 모든 것(Node.js 버전, 의존성, 설정)을 **이미지** 하나에 묶는다. 이 이미지를 어디서든 동일하게 실행할 수 있다.

```
기존: 서버에 소스 복사 → npm install → pm2 start
Docker: 이미지 pull → docker run
```

서버 환경에 의존하지 않고, 이미지 자체가 실행 환경이 된다.

### GHCR?

GHCR(GitHub Container Registry)은 GitHub에서 제공하는 Docker 이미지 저장소다.

Docker Hub와 같은 개념인데, GitHub 계정과 연동되어 있어서 별도 가입 없이 쓸 수 있고, public 레포라면 이미지도 무료로 공개 저장 가능하다.

```
이미지 주소: ghcr.io/{github유저명}/{이미지명}:latest
예시: ghcr.io/sub9707/blog:latest
```

GitHub Actions에서 빌드한 이미지를 여기 올려두고, 라즈베리파이가 여기서 pull 해온다.

### arm64 빌드가 필요한 이유

CPU 아키텍처가 다르면 같은 코드도 실행이 안 된다.

| 환경 | CPU 아키텍처 |
|---|---|
| 내 PC, GitHub Actions 서버 | x86_64 (amd64) |
| 라즈베리파이 | arm64 (aarch64) |

GitHub Actions 서버(x86_64)에서 빌드한 이미지를 라즈베리파이(arm64)에서 실행하면 오류가 난다.

devops-raspberry-pi-thumbnail.png해결 방법은 두 가지였다.

**옵션 A: 라즈베리파이에서 직접 빌드**

서버에서 `docker build`를 직접 실행한다. 별도 설정이 필요 없다.

단점은 라즈베리파이의 낮은 CPU 성능으로 빌드 시간이 매우 길고(20~30분 이상), 빌드 중 서버 부하가 크다.

**옵션 B: QEMU 크로스 컴파일 (선택)**

GitHub Actions 서버(x86_64)에서 QEMU 에뮬레이터를 사용해 arm64용 이미지를 빌드한다.

빌드 서버의 성능을 그대로 쓰고, 라즈베리파이는 완성된 이미지만 받아서 실행하면 된다.

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3
```

이 한 줄이 x86 서버에서 arm64 빌드를 가능하게 해준다. 크로스 컴파일이라 순수 arm64 빌드보다 느리지만, 라즈베리파이 직접 빌드보다는 훨씬 빠르다.

### Nginx를 선택한 이유

라즈베리파이의 공인 IP 하나로 여러 서비스를 운영할 수 있게 해주는 리버스 프록시 역할을 한다.

```
외부 요청 → Nginx → 내부 컨테이너(blog:3000)
```

Next.js를 직접 80/443 포트에 올리지 않고 Nginx를 앞에 두는 이유는 아래와 같다.

- SSL 인증서 처리를 Nginx에 맡길 수 있다
- 나중에 서비스가 추가돼도 Nginx 설정만 수정하면 된다
- 보안 헤더, gzip 압축 등을 한 곳에서 관리할 수 있다

### Watchtower를 선택한 이유

배포 자동화의 마지막 단계다.

GitHub Actions가 새 이미지를 GHCR에 올리면, 라즈베리파이가 이를 감지하고 자동으로 재배포해야 한다.

여기서 선택지가 두 가지였다.

**옵션 A: Watchtower (선택)**

컨테이너를 주기적으로 폴링해서 새 이미지가 있으면 자동으로 pull + 재시작한다. 추가 설정 없이 컨테이너 하나만 띄우면 된다. 배포가 즉시가 아닌 폴링 주기(5분)만큼 지연되지만, 블로그 특성상 문제없다.

**옵션 B: GitHub Actions에서 직접 SSH로 배포**

Actions 빌드 완료 후 SSH로 서버에 접속해서 `docker pull && restart`를 실행한다. 즉시 배포가 가능하지만, 외부 네트워크에서 라즈베리파이로 SSH 접근이 가능해야 하고 추가 설정이 필요하다.

<br/>

## 1단계 — Dockerize

### next.config.ts

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
};
```

`standalone` 모드를 사용하면 Next.js가 실행에 필요한 파일만 `.next/standalone`에 출력한다.

일반 빌드는 node_modules 전체가 필요하지만, standalone은 실제로 사용하는 파일만 추출하므로 이미지 크기가 크게 줄어든다.

### Dockerfile

3단계 멀티스테이지 빌드를 사용했다.

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

멀티스테이지 빌드란 빌드 단계와 실행 단계를 분리하는 것이다.

```
deps 스테이지    → 의존성 설치만
builder 스테이지 → 빌드만 (node_modules + 소스 전체 필요)
runner 스테이지  → 실행만 (빌드 결과물만 복사, 최소 이미지)
```

최종 이미지(runner)에는 소스코드와 node_modules 전체가 없다. 빌드 결과물만 있다.

**주의점 두 가지**

`content/` 디렉토리를 별도로 복사해야 한다. standalone 출력에는 포함되지 않기 때문에, 빠뜨리면 마크다운 파일을 읽지 못해 모든 포스트 페이지가 404가 된다.

`HOSTNAME=0.0.0.0` 설정도 필수다. 기본값으로는 컨테이너 내부 호스트명에만 바인딩되어 외부에서 접근이 안 된다.

<br/>

## 2단계 — Nginx Reverse Proxy

### docker-compose.yml

여러 컨테이너를 한 번에 정의하고 실행하는 설정 파일이다.

```yaml
services:
  blog:
    image: ghcr.io/sub9707/blog:latest
    restart: always
    networks:
      - internal

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot-www:/var/www/certbot
      - certbot-certs:/etc/letsencrypt
    depends_on:
      - blog
    networks:
      - internal

  certbot:
    image: certbot/certbot
    volumes:
      - certbot-www:/var/www/certbot
      - certbot-certs:/etc/letsencrypt

  watchtower:
    image: containrrr/watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --cleanup
    networks:
      - internal

volumes:
  certbot-www:
  certbot-certs:

networks:
  internal:
    driver: bridge
```

`blog` 컨테이너는 `ports`를 열지 않는다. internal 네트워크 안에서만 통신하고, nginx만 외부와 연결된다. 외부에서 Next.js 서버에 직접 접근하는 경로가 없어진다.

`volumes`는 컨테이너 간 또는 컨테이너와 호스트 간에 파일을 공유하는 방법이다. `certbot-certs` 볼륨을 certbot과 nginx가 함께 마운트해서, certbot이 발급한 인증서를 nginx가 읽을 수 있다.

### nginx.conf

```nginx
events {
  worker_connections 1024;
}

http {
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

  server {
    listen 80;
    server_name subdevpi.mywire.org;

    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }

    location / {
      return 301 https://$host$request_uri;
    }
  }

  server {
    listen 443 ssl;
    server_name subdevpi.mywire.org;

    ssl_certificate /etc/letsencrypt/live/subdevpi.mywire.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/subdevpi.mywire.org/privkey.pem;

    location / {
      proxy_pass http://blog:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto https;
      proxy_cache_bypass $http_upgrade;
    }
  }
}
```

80포트 서버는 두 가지 역할만 한다. Let's Encrypt 인증 파일 제공과 HTTPS 리다이렉트.

443포트 서버가 실제 서비스를 담당한다. `proxy_pass http://blog:3000`에서 `blog`는 Docker 컨테이너 서비스명이다. Docker 내부 네트워크에서는 서비스명으로 통신할 수 있다.

`proxy_set_header X-Forwarded-Proto https`는 Cloudflare나 Nginx 뒤에서 실행 중인 Next.js가 요청이 HTTPS로 들어왔음을 알 수 있게 해준다.

<br/>

## 3단계 — HTTPS (Let's Encrypt)

Let's Encrypt는 무료로 SSL 인증서를 발급해주는 CA(인증 기관)다. Certbot은 이를 자동화해주는 도구다.

인증서 발급 방식은 "이 도메인이 진짜 내 것임을 증명"하는 과정이 필요하다. Webroot 방식은 아래 흐름으로 동작한다.

```
Let's Encrypt 서버 → 내 도메인으로 특정 파일 요청
  → Nginx가 /var/www/certbot 에서 파일 제공
  → "이 서버가 도메인 소유자임을 확인" → 인증서 발급
```


nginx.conf에 인증서 경로를 설정해두면, nginx가 시작할 때 인증서 파일이 없어서 크래시가 난다. 그런데 nginx가 실행 중이어야 certbot이 인증을 받을 수 있다.

해결책은 임시 HTTP 전용 설정으로 nginx를 먼저 띄우고, 인증서를 발급받은 뒤 HTTPS 설정으로 교체하는 것이다.

**1. 임시 HTTP 전용 nginx 설정**

```nginx
server {
  listen 80;
  server_name subdevpi.mywire.org;

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    return 200 'ok';
  }
}
```

**2. nginx만 먼저 실행**

```bash
docker-compose up -d --no-deps nginx
```

`--no-deps` 옵션은 의존 컨테이너(blog 등)를 함께 시작하지 않는다. blog 이미지가 아직 없어도 nginx만 띄울 수 있다.

**3. certbot으로 인증서 발급**

```bash
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos \
  --no-eff-email \
  -d subdevpi.mywire.org
```

**4. nginx.conf를 HTTPS 설정으로 교체 후 재시작**

```bash
docker-compose restart nginx
```

**5. 인증서 자동 갱신 크론 등록**

Let's Encrypt 인증서는 90일마다 만료된다. 수동으로 갱신하는 건 잊어버리기 쉬우니 크론으로 자동화한다.

```bash
crontab -e
```

```
0 3 * * * cd /home/sub/blog && docker-compose run --rm certbot renew && docker-compose restart nginx
```

매일 새벽 3시에 갱신이 필요한지 확인하고, 만료가 30일 이내로 남으면 자동 갱신한다.

<br/>

## 4단계 — GitHub Actions

GitHub Actions는 push, PR 등 이벤트가 발생했을 때 자동으로 스크립트를 실행해주는 CI/CD 도구다. GitHub에서 무료로 제공하는 클라우드 서버에서 실행된다.

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/blog:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

각 step의 역할:

| step | 역할 |
|---|---|
| Checkout | 소스코드를 Actions 서버로 가져옴 |
| Set up QEMU | arm64 크로스 컴파일 에뮬레이터 설치 |
| Set up Docker Buildx | 멀티 플랫폼 빌드 도구 설정 |
| Login to GHCR | GHCR에 이미지를 push할 수 있도록 인증 |
| Build and push | arm64 이미지 빌드 후 GHCR 업로드 |

`cache-from / cache-to` 설정으로 이전 빌드의 레이어를 재사용한다. 소스만 변경됐을 때 의존성 설치 단계를 건너뛰어 빌드 시간을 단축할 수 있다.

GitHub Secrets에 `GHCR_TOKEN`을 등록해야 한다. PAT(Personal Access Token)를 발급할 때 `write:packages`, `workflow` 권한이 필요하다.

<br/>

## 5단계 — Watchtower 자동 배포

Watchtower는 실행 중인 컨테이너의 이미지를 주기적으로 레지스트리(GHCR)에서 확인하고, 새 버전이 있으면 자동으로 pull + 재시작한다.

```yaml
watchtower:
  image: containrrr/watchtower
  restart: always
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  command: --interval 300 --cleanup
```

`/var/run/docker.sock`을 마운트하는 이유는, Watchtower가 호스트의 Docker 데몬에 접근해서 다른 컨테이너들을 제어해야 하기 때문이다.

`--interval 300`은 5분마다 폴링, `--cleanup`은 구버전 이미지를 자동 삭제해서 디스크를 정리한다.

<br/>

## 최종 배포 흐름

```
git push main
  → GitHub Actions 트리거
  → arm64 이미지 빌드 (~5분)
  → GHCR에 latest 태그로 업로드
  → Watchtower 폴링에서 새 이미지 감지 (최대 5분)
  → 자동 pull + 재시작
```

총 10분 내외면 운영 서버에 반영된다. push 이후 서버를 건드릴 필요가 없다.

<br/>

## 트러블슈팅

### docker-compose-plugin 설치 실패

라즈베리파이에서 `sudo apt install docker-compose-plugin`이 패키지를 찾지 못하는 경우, 직접 바이너리를 다운로드한다.

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

플러그인 방식(`docker compose`)과 달리 독립 바이너리는 `docker-compose`(하이픈 포함)로 실행한다.

### nginx 크래시 (인증서 없음)

HTTPS nginx 설정에서 인증서 경로를 참조하는 상태로 nginx를 시작하면, 인증서 파일이 없어 즉시 크래시된다.

`docker-compose ps`로 확인했을 때 `Restarting`이 계속 반복된다면 이 문제일 가능성이 높다.

인증서 발급 전에는 반드시 HTTP 전용 임시 설정을 사용해야 한다.

### GHCR 이미지 경로 오류

`docker-compose.yml`에 이미지 경로를 잘못 작성하면 pull이 denied된다.

```yaml
# 잘못된 예
image: ghcr.io/kimsub/blog:latest

# 올바른 예
image: ghcr.io/sub9707/blog:latest
```

GHCR 이미지 경로는 `ghcr.io/{GitHub 유저명}/{이미지명}:태그` 형식이다. 유저명이 정확히 일치해야 한다.

### content 디렉토리 누락으로 전체 포스트 404

Dockerfile runner 스테이지에서 `content/`를 복사하지 않으면, 서버가 마크다운 파일을 찾지 못해 모든 포스트 페이지가 404가 된다.

Next.js standalone 빌드는 `public/`과 `.next/`만 포함하기 때문에, 런타임에 파일 시스템을 읽는 데이터는 별도로 복사해야 한다.

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
```

### PAT 권한 부족으로 push 거부

`.github/workflows/` 파일을 push할 때 PAT에 `workflow` 스코프가 없으면 아래 오류가 발생한다.

```
refusing to allow a Personal Access Token to create or update workflow
```

PAT 설정에서 `workflow` 권한을 추가하면 해결된다.

### 인증서 발급 실패 (Connection refused)

certbot이 도메인 소유 증명을 위해 외부에서 80포트로 접속을 시도하는데, 공유기 포트포워딩이 제대로 설정되지 않았으면 실패한다.

```
Detail: Fetching http://domain/.well-known/acme-challenge/...: Connection refused
```

공유기 관리 페이지에서 80, 443 포트를 라즈베리파이 내부 IP로 포트포워딩해야 한다.

<br/>

## 마무리

프론트엔드 개발자 입장에서 Docker나 Nginx는 "배포할 때 DevOps가 하는 것"이라는 인식이 있었다.

직접 구성해보니 개념 자체는 단순하다. Docker는 실행 환경을 이미지로 묶는 것, Nginx는 요청을 적절한 서버로 연결해주는 것. 복잡해 보이는 이유는 처음 보는 개념들이 한꺼번에 등장하기 때문이다.

한 번 구성해두면 이후에는 코드 작성하고 push하는 것 외에 서버를 건드릴 일이 없다.