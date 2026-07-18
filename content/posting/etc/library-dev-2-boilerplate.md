---
title: "라이브러리 개발기 (2) — 보일러 플레이트 생성"
date: "2026-06-30"
description: "ZUI 프로젝트의 모노레포 구조를 어떻게 잡았는지, 각 라이브러리를 왜 선택했는지 정리함"
tags: ["library", "monorepo", "pnpm", "tsup", "vite", "boilerplate"]
thumbnail: "/assets/thumbnails/etc/zui.png"
---

주제를 정했으니 이제 실제 구현으로 넘어가야 하는데, 가장 먼저 부딪힌 게 "프로젝트 구조를 어떻게 잡지?" 였다.

앱 개발이야 기존의 프레임워크나 사용하던 앱 보일러플레이트로 시작하면 어느 정도 틀이 잡히지만, 라이브러리는 마땅히 해본 적도, 기준이 없으니까 막막했다.

이번 기회가 배워볼 절호의 기회였다..

이번 글에서는 ZUI의 보일러플레이트를 어떻게 구성했는지, 왜 이 선택들을 했는지 정리해보려 한다.

<br/>

## 전체 패키지 구조

```
z-ui/
├── packages/
│   ├── core/       # Zustand 미들웨어 + WebSocket 서버 (npm 배포 대상)
│   └── gui/        # 시각화 GUI (React + Vite, 별도 서버로 실행)
├── examples/
│   └── basic/      # 실제 사용 예시 앱
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

크게 세 영역으로 나뉜다.

- `packages/core` — 사용자 앱에 설치되는 라이브러리 본체
- `packages/gui` — GUI 앱
- `examples/basic` — 라이브러리가 실제로 잘 동작하는지 검증하는 예시 앱

<br/>

## 왜 모노레포로 해야할까?

처음에는 레포 두 개를 따로 만들까 생각했다.

하나는 라이브러리 코드, 하나는 GUI 코드. 근데 이 둘은 서로 긴밀하게 연결되어 있다.

 `core`에서 WebSocket으로 상태를 쏘고, `gui`에서 이를 받아서 렌더링한다.

따로 분리하면 개발할 때마다 `core`를 빌드하고 npm에 올리고 `gui`에서 설치하고... 하는 흐름이 된다. 

이 과정이 꽤나 번거롭다.

모노레포로 묶으면 `workspace:*` 참조 하나로 로컬에서 바로 한 큐에 연결된다. 

개발 사이클이 훨씬 빠르다.

<br/>

## 패키지 관리 방법 선택

모노레포를 쓰기로 결정했으니 다음 과정은 **"이 패키지를 관리할 방법"**이 된다.

선택지는 크게 두 종류로 정리된다. 

<br/>

**워크스페이스 관리** (pnpm/npm/yarn workspace)

와 

**빌드 오케스트레이션 도구** (Turborepo, Nx, Lerna)

<br/>

### 빌드 오케스트레이션...?

패키지가 많아지면 다음과 같은 고민거리가 생긴다.

- `core` → `gui` → `example` 순서로 빌드해야 하는데, 의존 관계를 자동으로 파악해서 올바른 순서로 실행해줄 수 있을까?
- `core`를 수정하지 않았는데 매번 다시 빌드해야 할까? 결과를 캐싱할 순 없나?
- 의존 관계 없는 패키지들은 동시에 병렬로 빌드할 수 있지 않을까?

이런 문제를 자동으로 해결해주는 게 빌드 오케스트레이션 도구다.

<br/>

### Turborepo

![turborepo](/assets/etc/zui/turborepo.png)

<bookmark url="https://turbo.build/repo"></bookmark>

Vercel이 개발한 고성능 모노레포 빌드 시스템이며 현재 가장 많이 쓰인다.

여러 패키지와 앱을 하나의 저장소에서 효율적이고 빠르게 관리-빌드하도록 돕는다.

**핵심 기능**

- **캐싱** — 입력(소스 코드, 환경변수 등)이 같으면 이전 빌드 결과를 그대로 재사용한다. 변경 없는 패키지는 빌드를 건너뛴다.
- **병렬 실행** — 의존 관계가 없는 태스크는 동시에 실행한다.
- **Remote Cache** — Vercel 서버나 자체 서버에 캐시를 올려두면 팀원 간 또는 CI 환경에서도 캐시를 공유할 수 있다.

**특징**

- 설정이 단순하다. `turbo.json` 하나로 파이프라인을 정의한다.
- 기존 pnpm/npm/yarn workspace 위에 얹어서 쓴다. 워크스페이스 관리는 패키지 매니저에 맡기고, Turborepo는 태스크 실행만 담당한다.
- JS, TS 기반 프로젝트를 위한 시스템이며 특히 Next.js와의 궁합이 좋다 (Vercel).

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

`"^build"` 는 "이 패키지가 의존하는 패키지들의 build가 먼저 끝나야 한다"는 의미다.

<br/>

### Nx

![nx-nrwl](/assets/etc/zui/nx-nrwl.png)

<bookmark url="https://nx.dev"></bookmark>


Nrwl이 만든 도구로, 가장 기능이 많기에 초기 높은 진입장벽과 과도한 플러그인, 개발자가 신경써야하는 보일러플레이트 코드가 많다는 정평이 있다.

**핵심 기능**

- Turborepo처럼 캐싱, 병렬 실행, 의존 그래프 분석을 모두 제공한다.
- **코드 생성기** — `nx generate` 명령으로 컴포넌트, 라이브러리, 앱 등의 보일러플레이트를 자동 생성한다.
- **영향 분석** — 변경된 파일 기준으로 영향을 받는 패키지만 골라서 테스트/빌드를 실행한다.
- **모노레포 시각화** — 패키지 간 의존 그래프를 브라우저에서 시각적으로 확인할 수 있다.

**특징**

- Angular, React, Node 등 다양한 프레임워크용 플러그인이 존재한다.
- 대규모 팀, 대규모 모노레포에서 빛을 발한다.
- 마이크로서비스나 풀스택 모노레포처럼 패키지가 수십 개 이상인 환경에 적합하다.
- 빌드 가속 성능과 캐싱 효율은 매우 정교하고 빠르다.
- 근래에는 복잡한 플러그인이나 고유 설정을 걷어내며 단순 빌드 캐싱 셔틀로만 사용하도록 발전하고 있다.

<br/>

개발자 수가 많고 FE+BE 구조, 무분별한 참조로 코드가 엉키지않게 아키텍쳐 경계를 통제하는 경우에 알맞은 툴이기에 굳이 선택할 필요는 없었다.

### Lerna

![lerna](/assets/etc/zui/lerna.png)

<bookmark url="https://lerna.js.org"></bookmark>

모노레포 도구의 원조. 오랫동안 사실상 표준이었지만, 현재는 nrwl(Nx 팀)이 인수해서 유지보수 중이다.


**핵심 기능**

- 여러 패키지의 버전 관리와 npm 퍼블리싱 자동화가 원래 강점이었다.
- 현재는 내부적으로 Nx를 사용해서 캐싱, 병렬 실행도 지원한다.

**특징**

- 예전에는 워크스페이스 관리까지 직접 했지만, 지금은 pnpm/yarn workspace에 그 역할을 넘기고 버전 관리 + 퍼블리싱에 집중하는 형태로 역할이 바뀌었다.
- 새 프로젝트에서 굳이 선택할 이유는 줄었다. Turborepo나 Nx를 쓰면 충분히 커버된다.

---

### 세 도구 비교

| | Turborepo | Nx | Lerna |
|---|---|---|---|
| 학습 비용 | 낮음 | 높음 | 중간 |
| 캐싱 | 있음 | 있음 | 있음 (Nx 기반) |
| 코드 생성기 | 없음 | 있음 | 없음 |
| 퍼블리싱 자동화 | 없음 | 없음 | 있음 |
| 적합한 규모 | 중소규모 | 대규모 | 패키지 배포 중심 |

---

<br/>

처음에는 Turborepo로 생각했는데, 솔직히 이 규모에서 그 정도 빌드 오케스트레이션이 필요한지 모르겠어서 일단 보류했다.

워크스페이스 관리만 있으면 충분하다는 생각을 했고, 그래서 단순하게 npm workspace, yarn workspace, pnpm workspace 중 뭘 쓸지 고민을 했다.

익숙한 yarn과 npm 워크스페이스를 두고 pnpm을 선택하였다.

각 장단점을 찾아보고 선택한 이유는 세 가지로 도출됐다.

<br/>

**유령 의존성 문제가 없다**

npm과 yarn(v1)은 `node_modules`를 최상위에 몰아서 설치한다.

패키지 A가 패키지 B를 의존하면, B도 루트 `node_modules`에 올라오게된다. 

덕분에 `package.json`에 명시하지 않은 패키지도 코드에서 `import`할 수 있다.

이게 유령 의존성(phantom dependency)현상이다... 

지금 당장은 동작해도 언젠가 A가 B를 제거하는 순간이 온다면.. 여기저기서 코드가 울부짖게 된다. 

라이브러리 프로젝트에서는 특히 위험하다.

pnpm은 각 패키지가 `package.json`에 명시한 의존성만 접근할 수 있도록 구조 자체를 격리한다. 

명시하지 않은 패키지는 import 자체가 안 된다.

개발할 때 순간이 아닌 이후 패키지 구조를 넘어 수정하는 순간을 고려한다면 이 구조가 적합할 것이다.

<br/>

**디스크 공간 효율**

pnpm은 패키지를 전역 스토어에 한 번만 저장하고, 각 프로젝트에는 하드링크 방식(파일을 복사하지 않고 공유)으로 연결한다. 

같은 버전의 패키지를 여러 프로젝트에서 쓰더라도 디스크에 한 번만 존재한다. 

모노레포처럼 패키지가 여러 개일수록 차이가 커진다.

<br/>

**`workspace:*` 프로토콜**

로컬 패키지 간 참조를 `workspace:*`로 명시한다. 

gui에서 core 패키지를 가져와 사용하려할 때, 전역 스토어를 뒤지려하지말고 지정한 프로젝트 워크스페이스에서 연결하도록 지시하는 것이다.

버전 번호 대신 로컬 경로를 바라보기 때문에, `core`를 수정하면 별도 빌드나 재설치 없이 `gui`에 즉시 반영된다.


<bookmark url="https://pnpm.io/workspaces"></bookmark>

pnpm workspace는 별도 설정 파일이 거의 없고 `pnpm-workspace.yaml` 하나면 끝난다.

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "examples/*"
```

이게 세팅의 끝이다.. 

패키지 간 참조도 매우 간단하다.

```json
// packages/gui/package.json
"dependencies": {
  "@z-ui/core": "workspace:*"
}
```

작은 프로젝트에선 이 정도 연결이면 충분하다고 판단했다.

<br/>

## tsconfig.base.json — 공유 TypeScript 설정

패키지마다 TypeScript 설정을 따로 쓰다 보면 패키지마다 설정이 달라지는 문제가 생긴다.

루트 경로에 `tsconfig.base.json`을 하나 두고, 각 패키지의 `tsconfig.json`에서 이걸 extends 해서 모든 매키지가 이를 일관되게 사용하는 방식을 택했다.

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "isolatedModules": true
  }
}
```

`strict: true` 는 기본이고, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` 같은 옵션도 켰다.

라이브러리는 사용자가 어떤 환경에서 쓸지 모르기 때문에 타입이 느슨하면 나중에 의도치 않은 런타임 오류가 사용자 앱에서 터질 수 있다. 처음부터 타입을 엄격하게 잡기로 했다.

`isolatedModules: true`는 각 파일을 독립적으로 트랜스파일링 할 수 있도록 강제한다.

이 라이브러리는 아래에서 다룰 **tsup**으로 번들링하는데, tsup은 내부적으로 esbuild를 사용한다. esbuild는 `tsc` 처럼 전체 타입 검사를 하지 않고, 파일을 하나씩 독립적으로 변환한다. 덕분에 속도는 빠르지만, 다른 파일의 타입 정보를 참조해야 하는 패턴(`const enum`, type-only import 미명시 등)은 제대로 처리하지 못한다.

`isolatedModules: true`를 켜두면 TypeScript가 이런 패턴을 빌드 타임에 에러로 잡아줘서, tsup(esbuild)으로 번들링할 때 런타임 오류 없이 안전하게 동작한다.

<br/>

## packages/core — tsup으로 번들링

`core`는 npm에 배포될 라이브러리 본체 패키지이다.

사용자가 `npm install @z-ui/core`를 입력해 설치하면 이 패키지가 설치된다.

번들러로 **tsup**을 썼다.

<bookmark url="https://tsup.egoist.dev"></bookmark>

처음엔 Rollup이나 esbuild를 직접 설정할까 했는데, tsup이 이 둘을 내부적으로 wrapping해서 훨씬 간단하게 쓸 수 있다.

```ts
// packages/core/tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["zustand"],
});
```

중요한 옵션들을 하나씩 보면,

**`format: ["esm", "cjs"]`**  

ESM과 CommonJS 두 포맷으로 동시에 빌드한다. 

사용자 환경이 어느 쪽인지 알 수 없으니 둘 다 제공하는 게 안전하다. 

`package.json`의 `exports` 필드로 각각 연결한다.

```json
"exports": {
  ".": {
    "import": "./dist/index.js",   // ESM
    "require": "./dist/index.cjs", // CJS
    "types": "./dist/index.d.ts"
  }
}
```

**`dts: true`**  
타입 선언 파일(`.d.ts`)을 자동으로 생성한다. 이게 없으면 TypeScript 사용자가 타입 추론을 못 받는다.

**`external: ["zustand"]`**  
zustand를 번들에 포함하지 않고 외부 의존성으로 처리한다. 라이브러리를 쓰는 앱에는 이미 zustand가 설치되어 있을 테니, 번들에 또 포함시키면 중복이 된다. `peerDependencies`에 명시해두고 외부로 빼는 게 맞다.

<br/>

## packages/gui — Vite + React + @xyflow/react

`gui`는 별도로 실행되는 GUI 앱이다. 

npm에 배포하지 않으니 Vite로 간단하게 구성했다.

핵심 의존성은 세 가지다.

**React + Vite**  
GUI 앱이라 React가 자연스러운 선택이었다. 

Vite는 dev server 속도가 빠르고 설정도 간단해서 선택했다.

**@xyflow/react**  
상태 트리를 노드-엣지 그래프로 그려야 하는데, 이걸 직접 구현하면 너무 복잡하다.

<bookmark url="https://reactflow.dev"></bookmark>

React Flow(현재 패키지명 `@xyflow/react`)는 이런 노드 기반 UI를 만드는 데 특화된 라이브러리다. 드래그, 줌, 엣지 연결 같은 인터랙션이 기본 제공되고, 커스텀 노드도 그냥 React 컴포넌트로 만들면 된다. 

상태 트리를 노드 그래프로 시각화하는 데 안성맞춤이다.

<br/>

## examples/basic — 통합 검증용 앱

라이브러리를 개발하다 보면 실제로 잘 동작하는지, 혹은 라이브러리를 접했을 때 동작 방식을 이해할 예제가 필요하다.

`examples/basic`은 실제 사용자 앱처럼 `@z-ui/core`를 설치해서 쓰는 예제 앱이다. 

`workspace:*` 덕분에 로컬 `core` 패키지를 그대로 참조하므로, 개발 중에 `core`를 수정하고 여기서 바로 결과를 확인할 수 있다.

<br/>

## 정리

결과적으로 보일러플레이트에서 핵심 사항은 두 가지였다.

1. **모노레포** — 서로 연결된 패키지를 하나의 레포에서 관리해 개발 사이클을 단순하게 유지
2. **tsup** — 라이브러리 번들링에 필요한 ESM/CommonJS 이중 출력과 타입 선언을 간단하게 처리

<br/><br/>

처음 구조를 짤 때도 바닥부터 시작하려니 막막했다. 

구글링과 라이브러리 개발 기록 블로그들과 AI 검색, 대화 등을 통해 구조를 잡고 나서야 비로소 "이제 실제 코드를 짤 수 있겠다"는 느낌이 들었다.

구현은 AI-페어프로그래밍보다는 AI가 스텝을 먼저 잡고, 메인 기능을 과제처럼 직접 개발하며 이를 AI가 리팩토링, 피드백하는 식으로 진행하려한다.

이후 성능은 리팩토링 과정에서 함께 진행하여 기록할 예정이다.
