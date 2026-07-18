---
title: "GitHub Actions는 어떻게 알아서 동작할까"
date: "2026-06-18"
description: "push 한 번에 테스트가 돌고 배포가 되는 GitHub Actions에 대해 알아보자"
tags: ["github-actions", "ci-cd", "devops", "runner", "workflow", "automation"]
thumbnail: "/assets/thumbnails/devops/github-actions-internals.png"
---

코드를 push하면 테스트가 돌고, PR을 열면 lint가 실행되고, main에 merge되면 배포가 된다.

`.github/workflows/` 폴더에 YAML 파일을 몇 개 넣었을 뿐인데, GitHub은 어떻게 이 모든 것을 "알아서" 처리하는 걸까?

이번 포스팅에서는 그 "알아서"에 대해 원리를 알아보도록 하자.

<br/>

## 전체 구조 한 줄 요약

```
코드 push
  → GitHub이 이벤트 감지 (Webhook 내부 처리)
  → .github/workflows/ YAML 파싱
  → 조건에 맞는 Workflow 선택
  → Job을 Runner에 할당
  → Runner가 Step을 순서대로 실행
  → 결과 GitHub에 보고
```

각 단계를 하나씩 뜯어보자.

<!-- 이미지: GitHub Actions 전체 아키텍처 다이어그램
     왼쪽부터: 개발자 코드 push → GitHub.com (이벤트 감지, YAML 파싱, Job 큐) → Runner (GitHub-hosted VM) → Steps 실행 → 결과 보고
     각 컴포넌트 박스와 화살표, Actions Service와 Runner 간 통신 방향 표시
     파일명: github-actions-architecture.png -->
![GitHub Actions 전체 아키텍처](/assets/DevOps/github-actions-internals/github-actions-architecture.png)

<br/>

---

## 이벤트 감지 — trigger는 어떻게 발동될까

### GitHub 내부 Webhook

GitHub Actions의 트리거는 **GitHub 내부 이벤트 시스템** 위에서 동작한다.

외부 서비스에서 사용하는 Webhook(외부 URL로 POST 요청)과 달리, Actions의 트리거는 GitHub 플랫폼 자체의 이벤트 버스를 구독하는 방식이다.

`push`, `pull_request`, `issues` 같은 이벤트가 발생하면 GitHub 내부에서 해당 저장소에 연결된 Actions 서비스에 이벤트가 전달된다.

```yaml
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize]
  schedule:
    - cron: "0 9 * * 1"  # 매주 월요일 오전 9시
  workflow_dispatch:      # 수동 실행
```

`on` 필드에 적힌 것이 구독할 이벤트 목록이다. 이 목록에 없는 이벤트는 Workflow를 깨우지 않는다.

<br/>

### 이벤트 페이로드

이벤트가 발생하면 해당 이벤트에 대한 **페이로드(JSON 데이터)** 가 함께 전달된다. 이 페이로드가 Workflow 실행 중 `github` 컨텍스트로 접근 가능한 데이터다.

```yaml
steps:
  - name: 이벤트 정보 출력
    run: |
      echo "트리거 이벤트: ${{ github.event_name }}"
      echo "브랜치: ${{ github.ref }}"
      echo "커밋: ${{ github.sha }}"
      echo "작성자: ${{ github.actor }}"
```

`push` 이벤트의 페이로드에는 푸시된 커밋 목록, 변경된 파일, 브랜치 정보 등이 담긴다. `pull_request` 이벤트에는 PR 번호, 제목, 작성자, base/head 브랜치 등이 포함된다.

<br/>

### 필터링 — 모든 push에 반응하지 않는 방법

이벤트가 발생해도 추가 조건을 걸 수 있다.

```yaml
on:
  push:
    branches:
      - main
      - "release/**"  # release/로 시작하는 모든 브랜치
    paths:
      - "src/**"       # src 폴더 하위 파일이 변경될 때만
      - "package.json"
    paths-ignore:
      - "**.md"        # 마크다운 파일만 변경되면 무시
```

`paths` 필터는 특히 유용하다. 문서만 수정했을 때 전체 CI가 돌지 않게 막을 수 있다.

<br/>

---

## YAML 파싱과 Workflow 선택

이벤트가 발생하면 GitHub Actions 서비스는 해당 저장소의 **해당 커밋 시점 기준** `.github/workflows/` 디렉토리의 모든 YAML 파일을 읽는다.

> **"해당 커밋 시점 기준"이 중요한 이유**
> 브랜치에 push할 때, GitHub은 push된 커밋에 있는 `.github/workflows/` 파일을 기준으로 Workflow를 실행한다. 즉 YAML 파일을 수정한 커밋을 push하는 순간부터 새 Workflow가 적용된다. 이전 커밋은 이전 Workflow로 실행된다.

각 YAML 파일에서 `on` 조건을 평가해 현재 이벤트에 해당하는 Workflow만 실행 대상이 된다. 저장소에 Workflow 파일이 10개 있어도, 조건이 맞는 것만 실행된다.

<br/>

---

## Workflow 구조 심화

### Job — 실행 단위

Workflow는 하나 이상의 **Job**으로 구성된다. Job은 기본적으로 **병렬 실행**된다.

```yaml
jobs:
  test:      # Job 1
    runs-on: ubuntu-latest
    steps: [...]

  lint:      # Job 2 — test와 동시에 실행
    runs-on: ubuntu-latest
    steps: [...]

  build:     # Job 3 — test와 lint가 끝난 뒤 실행
    needs: [test, lint]
    runs-on: ubuntu-latest
    steps: [...]
```

<!-- 이미지: Job 의존성 그래프 다이어그램
     test와 lint가 병렬 실행되고, 둘 다 완료된 후 build가 실행되는 DAG(방향성 비순환 그래프) 구조
     각 Job 박스, needs 화살표, 병렬 실행 구간 강조
     파일명: github-actions-job-graph.png -->
![Job 의존성 그래프](/assets/DevOps/github-actions-internals/github-actions-job-graph.png)

`needs`로 의존성을 선언하면 해당 Job들이 모두 성공한 뒤에 실행된다. Job 간 순서와 병렬성을 이 의존성 그래프로 표현한다.

<br/>

### Step — Job 안의 순차 실행

Step은 항상 **순차 실행**된다. 앞 Step이 실패하면 기본적으로 이후 Step은 실행되지 않는다.

```yaml
steps:
  - name: 저장소 체크아웃
    uses: actions/checkout@v4

  - name: Node.js 설치
    uses: actions/setup-node@v4
    with:
      node-version: "20"

  - name: 의존성 설치
    run: npm ci

  - name: 테스트 실행
    run: npm test

  - name: 실패해도 실행 (클린업 등)
    if: always()
    run: echo "항상 실행"
```

`if: always()`는 이전 Step이 실패해도 이 Step을 실행한다. 테스트 결과 업로드, 임시 파일 정리 같은 클린업 Step에 활용한다.

<br/>

### Context — 실행 환경 정보에 접근하기

Workflow 실행 중에는 다양한 **Context 객체**로 환경 정보에 접근할 수 있다.

```yaml
steps:
  - run: |
      echo "저장소: ${{ github.repository }}"
      echo "PR 번호: ${{ github.event.pull_request.number }}"
      echo "Runner OS: ${{ runner.os }}"
      echo "Job 상태: ${{ job.status }}"
```

주요 Context:

| Context | 내용 |
|---|---|
| `github` | 이벤트 정보, 저장소, 커밋, 액터 등 |
| `env` | 환경 변수 |
| `vars` | Repository/Organization 변수 |
| `secrets` | 암호화된 비밀값 |
| `runner` | Runner 머신 정보 |
| `job` | 현재 Job 상태 |
| `steps` | 이전 Step의 output/결과 |
| `matrix` | Matrix 전략의 현재 값 |

<br/>

---

## Runner — 실제로 코드를 실행하는 주체

### Runner?

Runner는 GitHub Actions의 Job을 실제로 실행하는 **에이전트 프로세스**다.

GitHub이 관리하는 **GitHub-hosted Runner**와, 직접 운영하는 **Self-hosted Runner** 두 종류가 있다.

<!-- 이미지: GitHub-hosted vs Self-hosted Runner 비교 다이어그램
     왼쪽: GitHub 클라우드 (GitHub-hosted Runner VM들) — Actions Service와 연결
     오른쪽: 회사 서버/온프레미스 (Self-hosted Runner) — Actions Service와 HTTPS long polling으로 연결
     두 경우 모두 GitHub Actions Service를 통해 Job을 받는 구조
     파일명: github-actions-runner-types.png -->
![Runner 유형 비교](/assets/DevOps/github-actions-internals/github-actions-runner-types.png)

<br/>

### GitHub-hosted Runner 내부

`runs-on: ubuntu-latest`를 쓰면 GitHub이 **Azure 인프라 위에 새 VM을 프로비저닝**한다.

- 각 Job마다 완전히 새로운 VM에서 시작
- Job 완료 후 VM은 즉시 폐기 (다음 Job에서 재사용되지 않음)
- 약 2~3분의 프로비저닝 시간 발생

이 격리 덕분에 이전 Job에서 생성된 파일이나 상태가 다음 Job에 영향을 주지 않는다.

```yaml
runs-on: ubuntu-latest    # Ubuntu (Azure VM)
runs-on: windows-latest   # Windows Server
runs-on: macos-latest     # macOS (Apple Silicon M1)
```

macOS Runner는 Apple Silicon 하드웨어에서 실행되어 iOS/macOS 빌드가 가능하다.

<br/>

### Runner가 Job을 받아가는 방식 — Long Polling

Self-hosted Runner나 GitHub-hosted Runner 모두 동일한 방식으로 Job을 가져간다. **Long Polling** 방식이다.

```
Runner → GitHub Actions Service: "처리할 Job 있어?"
GitHub → Runner: (잠시 대기 후) "있어, 이거 처리해" (Job 정보 전달)
Runner: Job 실행
Runner → GitHub: "완료, 여기 결과"
Runner → GitHub Actions Service: "다음 Job 있어?"
(반복)
```

<!-- 이미지: Runner Long Polling 통신 다이어그램
     Runner가 주기적으로 GitHub Actions Service에 GET 요청을 보내고
     Job이 없으면 서버가 응답을 보류(hang)하다가 Job이 생기면 응답하는 흐름
     WebSocket이 아닌 HTTPS 기반 polling 구조 강조
     파일명: github-actions-long-polling.png -->
![Runner Long Polling 흐름](/assets/DevOps/github-actions-internals/github-actions-long-polling.png)

Runner는 GitHub에서 Job을 기다리는 것이 아니라, 계속 "일 있어?"라고 물어보는 구조다. 이를 통해 Runner가 방화벽 안에 있어도 (GitHub이 Runner에 접근할 수 없어도) 동작한다.

> **왜 WebSocket이나 Server-Sent Events가 아닌 Long Polling인가?**
> Self-hosted Runner는 기업 내부망에 위치하는 경우가 많다. 방화벽 정책상 서버가 클라이언트로 먼저 연결을 시도하는 것이 차단되는 경우가 흔하다. Long Polling은 Runner가 항상 먼저 연결을 시작하므로 아웃바운드 HTTPS만 허용된 환경에서도 동작한다.

<br/>

### Job 실행 흐름

Runner가 Job을 받으면 다음 순서로 실행한다.

```
1. Job 컨테이너 / VM 환경 준비
2. 환경 변수, Secret 주입
3. steps 순서대로 실행
   - uses: 외부 Action 다운로드 및 실행
   - run: 쉘 명령어 실행
4. 각 Step 결과 GitHub에 스트리밍
5. Job 완료 보고 (success / failure / cancelled)
```

Step의 로그가 실시간으로 GitHub UI에 표시되는 것은 Runner가 실행 중에 로그를 **스트리밍**으로 전송하기 때문이다.

<br/>

---

## Action — `uses:`의 실체

`uses: actions/checkout@v4` 한 줄이 저장소를 체크아웃해준다. 이 Action은 어떻게 동작하는가?

### Action의 세 가지 종류

**1. JavaScript Action**

Node.js로 작성된 Action. Runner에서 직접 실행된다.

```yaml
# action.yml (Action 정의 파일)
name: "My Action"
runs:
  using: "node20"
  main: "dist/index.js"
```

`actions/checkout`, `actions/setup-node` 같은 공식 Action 대부분이 JavaScript Action이다. Runner에 Node.js가 항상 설치되어 있으므로 별도 환경 없이 빠르게 실행된다.

**2. Docker Container Action**

Docker 이미지를 실행하는 Action. 이미지 안에 필요한 모든 의존성이 포함된다.

```yaml
runs:
  using: "docker"
  image: "Dockerfile"
```

특정 언어나 도구가 필요한 Action에 적합하다. 단점은 Docker 이미지 pull 시간이 추가된다.

**3. Composite Action**

여러 Step을 묶어 재사용 가능한 Action으로 만든다. 별도 런타임 없이 YAML로만 구성한다.

```yaml
# .github/actions/setup-and-install/action.yml
name: "Setup and Install"
runs:
  using: "composite"
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: "20"
    - run: npm ci
      shell: bash
```

저장소 내 반복되는 Step 묶음을 추출할 때 유용하다.

<br/>

### `uses: actions/checkout@v4` 내부 동작

```yaml
- uses: actions/checkout@v4
```

이 한 줄이 실행될 때 일어나는 일:

1. `actions/checkout` 저장소의 `v4` 태그에 해당하는 커밋을 GitHub에서 가져옴
2. Action의 `action.yml`을 읽어 실행 방식 확인 (JavaScript Action)
3. `dist/index.js` 실행
4. 내부적으로 `git clone` / `git fetch` + `git checkout` 실행
5. Workspace 디렉토리(`/home/runner/work/repo/repo`)에 저장소 코드 배치

`@v4`는 태그 참조다. 보안상 `@v4.1.0` 처럼 정확한 버전이나 `@커밋SHA` 형태로 고정하는 것이 권장된다. 태그는 누군가 강제 push로 다른 커밋을 가리키게 바꿀 수 있기 때문이다.

<br/>

---

## Secrets — 어떻게 안전하게 전달될까

```yaml
- name: 배포
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: ./deploy.sh
```

`secrets`는 GitHub 서버에 암호화된 형태로 저장된다. Job 실행 시 Runner에 전달되는데, 이 과정에서 몇 가지 보호 장치가 있다.

- Secret 값은 로그에 자동으로 `***`로 마스킹된다
- Fork된 저장소에서 실행되는 PR Workflow에는 기본적으로 Secret이 전달되지 않는다
- Secret은 메모리에서만 존재하고 디스크에 기록되지 않는다

```yaml
# Fork PR에서 Secret 사용이 필요한 경우 (신중하게 사용해야 함)
pull_request_target:  # pull_request 대신 pull_request_target 사용
  types: [opened]
```

`pull_request_target`은 base 브랜치의 컨텍스트에서 실행되므로 Secret에 접근 가능하지만, 악의적인 코드가 포함된 Fork PR을 머지 전에 실행할 위험이 있어 주의가 필요하다.

<br/>

---

## Matrix Strategy — 여러 환경에서 동시 실행

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

이 Workflow는 `3 × 2 = 6`개의 Job을 동시에 실행한다. 각 Job은 서로 다른 Node.js 버전과 OS 조합에서 독립적으로 동작한다.

```
ubuntu + node18
ubuntu + node20
ubuntu + node22
windows + node18
windows + node20
windows + node22
```

특정 조합을 제외하거나 추가할 수도 있다.

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [18, 20]
    exclude:
      - os: windows-latest
        node: 18  # windows + node18 조합 제외
    include:
      - os: ubuntu-latest
        node: 22  # ubuntu + node22 추가
```

<br/>

---

## 캐싱 — 매번 같은 것을 다운받지 않기 위해

Runner VM은 Job마다 새로 만들어진다. `npm install`이 매번 전체 패키지를 다운로드하면 느리다. `actions/cache`가 이를 해결한다.

```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: 의존성 설치
  run: npm ci
```

**동작 방식:**

1. `key`를 계산 (`ubuntu-node-abc123...` 형태의 해시)
2. GitHub의 캐시 저장소에서 해당 키로 캐시 검색
3. 캐시가 있으면 `path`로 복원 (cache hit)
4. 없으면 계속 진행 (cache miss)
5. Job 완료 후 `path`의 현재 상태를 `key`로 저장

`package-lock.json`의 해시를 키에 포함하므로 의존성이 변경되면 새 캐시가 만들어진다.

```yaml
# Next.js 빌드 캐시
- uses: actions/cache@v4
  with:
    path: ${{ github.workspace }}/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.ts', '**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
      ${{ runner.os }}-nextjs-
```

<br/>

---

## Workflow간 통신 — output과 artifact

### Step output

한 Step의 결과를 다음 Step에서 사용할 수 있다.

```yaml
steps:
  - name: 버전 계산
    id: version
    run: echo "value=1.2.3" >> $GITHUB_OUTPUT

  - name: 버전 사용
    run: echo "배포 버전: ${{ steps.version.outputs.value }}"
```

`$GITHUB_OUTPUT`은 Runner가 제공하는 특수 파일 경로다. 여기에 `key=value` 형태로 쓰면 이후 Step에서 `steps.<id>.outputs.<key>`로 읽을 수 있다.

<br/>

### Job output

Job 간에도 값을 전달할 수 있다.

```yaml
jobs:
  build:
    outputs:
      image-tag: ${{ steps.build.outputs.tag }}
    steps:
      - id: build
        run: echo "tag=v1.2.3" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    steps:
      - run: echo "이미지 태그: ${{ needs.build.outputs.image-tag }}"
```

<br/>

### Artifact — 파일 전달

Job 간에 파일을 공유하려면 Artifact를 쓴다.

```yaml
jobs:
  build:
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy:
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: ./deploy.sh
```

Artifact는 GitHub 서버에 임시 저장(기본 90일 보관)된다. Job들 사이의 파일 전달뿐 아니라, 빌드 결과물이나 테스트 리포트를 GitHub UI에서 직접 다운로드할 수 있게 하는 데도 쓴다.

<br/>

---

## Reusable Workflow — Workflow 자체를 재사용하기

Action이 Step을 재사용하는 단위라면, Reusable Workflow는 **Workflow 전체**를 재사용하는 단위다.

```yaml
# .github/workflows/deploy.yml (재사용 가능한 Workflow 정의)
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      deploy-key:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "배포 환경: ${{ inputs.environment }}"
```

```yaml
# .github/workflows/production.yml (호출하는 Workflow)
jobs:
  deploy-prod:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
    secrets:
      deploy-key: ${{ secrets.PROD_DEPLOY_KEY }}
```

여러 저장소에서 공통 CI/CD 파이프라인을 공유할 때 유용하다. 다른 저장소의 Reusable Workflow를 `org/repo/.github/workflows/file.yml@main` 형태로 참조할 수 있다.

<br/>

---

## 실제 동작 흐름 — push부터 완료까지

```
① git push origin main

② GitHub.com
   - push 이벤트 감지
   - .github/workflows/ 디렉토리의 YAML 파일 파싱
   - on.push.branches 조건 확인 → 해당 Workflow 선택
   - Job 목록 생성, 의존성 그래프(DAG) 계산
   - Job을 실행 큐에 등록

③ Runner (GitHub-hosted)
   - Long polling으로 "Job 있어?" 요청
   - GitHub → "있어, 이거 처리해" (Job 메타데이터 전달)
   - Azure에서 새 Ubuntu VM 프로비저닝
   - Runner 에이전트 프로세스 시작

④ Job 실행
   - 환경 변수, Secret 주입
   - Step 1: actions/checkout@v4
     - GitHub에서 Action 코드(dist/index.js) 다운로드
     - git clone 실행, workspace에 코드 배치
   - Step 2: actions/setup-node@v4
     - Node.js 버전 설치/활성화
   - Step 3: npm ci
     - 캐시 hit → node_modules 복원
   - Step 4: npm test
     - 테스트 실행, 결과 로그 스트리밍

⑤ 결과 보고
   - 각 Step 성공/실패 상태 GitHub에 전송
   - Job 완료
   - PR에 Check 결과 표시
   - VM 폐기

⑥ 의존 Job 있으면 ③으로
```

<br/>

---

## 정리

| 개념 | 역할 |
|---|---|
| **Event** | Workflow 실행을 시작시키는 트리거 |
| **Workflow** | `.github/workflows/*.yml` 하나의 파일 |
| **Job** | Runner 하나에서 실행되는 단위. 기본 병렬 |
| **Step** | Job 안의 순차 실행 단위 |
| **Action** | `uses:`로 참조하는 재사용 가능한 Step |
| **Runner** | Job을 실제 실행하는 에이전트 (VM/컨테이너) |
| **Context** | `${{ github.* }}` 형태로 접근하는 실행 환경 정보 |

"알아서 동작한다"는 것은 사실 세 가지 메커니즘의 합이다.

1. **이벤트 감지** — GitHub 내부 이벤트 버스가 push/PR 등을 감지해 Workflow를 깨운다
2. **Long Polling** — Runner가 계속 "일 있어?"라고 물어보며 Job을 가져간다
3. **격리된 VM** — Job마다 새 VM이 만들어지고 폐기되어 환경이 오염되지 않는다

이 구조를 알면 "왜 이전 Job의 파일이 다음 Job에 없는지", "Self-hosted Runner가 방화벽 안에 있어도 왜 동작하는지", "캐시가 왜 필요한지"가 자연스럽게 이해된다.
