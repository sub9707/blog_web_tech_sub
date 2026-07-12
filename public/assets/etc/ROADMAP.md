# Z-UI 개발 과제집

> 답은 없다. 완료 기준을 충족했을 때만 다음으로 넘어가라.
> 각 기능은 **콘솔 검증 → 데이터 연결 → UI 구현** 순서로 나뉜다.
> UI를 먼저 만들려고 하지 마라. 데이터가 흐르는 걸 먼저 눈으로 확인하고 UI를 붙여라.

---

---

# 시작 전 배경 지식

> 웹 앱 개발과 라이브러리 개발은 다르다.
> 이 섹션을 건너뛰면 Phase 1에서 "왜 이렇게 되어 있지?" 하는 상황이 계속 생긴다.
> 코드를 한 줄도 작성하지 않는다. 읽고, 찾아보고, 이해하는 단계다.

---

## 배경 지식 1. 앱과 라이브러리의 차이

### 네가 지금까지 만든 것 (앱)
```
내 코드 → 브라우저/서버에서 직접 실행
결과물: index.html, bundle.js → 사용자가 브라우저로 접속
```

### 이번에 만드는 것 (라이브러리)
```
내 코드 → 다른 개발자의 코드 안에서 실행
결과물: dist/index.js → 다른 개발자가 npm install 후 import해서 사용
```

핵심 차이:
- 앱은 **최종 사용자**가 쓴다
- 라이브러리는 **다른 개발자**가 쓴다
- 라이브러리는 어떤 환경에서도 동작해야 한다 (React 버전이 달라도, Node.js에서도)

### 이 프로젝트의 구조
```
@z-ui/core (라이브러리, npm에 배포)
  └─ Zustand 미들웨어 + Vite 플러그인(WebSocket 서버만 시작)
     사용자는 이것만 설치하면 앱 쪽 연결이 끝난다

@z-ui/gui (독립 실행형 CLI 앱, npm에 배포, clone 불필요)
  └─ GUI React 앱 소스 + CLI 런처(bin). 빌드 결과물을 자체 dist/에 보관
     사용자가 `npx z-ui` 로 직접 실행하는 별도 프로세스.
     스토리북처럼 앱의 dev 서버와 완전히 분리되어 자체 포트에서 뜬다.

examples/basic (앱, 테스트용)
  └─ @z-ui/core가 올바르게 동작하는지 검증용
```

**핵심:** 사용자는 `@z-ui/core`를 설치하고 Vite 플러그인을 추가하면 앱 쪽에서
WebSocket 서버(`ws://localhost:3274`)가 자동으로 뜬다.
GUI는 별도 터미널에서 `npx z-ui`로 실행하며, 자체 포트(예: `http://localhost:4275`)에서
독립적으로 열려 WebSocket으로 앱에 연결한다. 앱의 dev 서버가 GUI를 서빙하지 않는다 —
앱을 안 띄운 상태에서도 GUI 프로세스 자체는 켤 수 있고, 여러 앱을 번갈아 붙여서 볼 수도 있다.
(단, 앱을 **동시에 두 개 이상** 띄우려면 WS 포트가 겹치지 않게 `zuiPlugin({ port })`로
각각 다른 포트를 줘야 한다 — 과제 1-6 참고. 번갈아 하나씩 붙이는 것만으로 충분하면 신경 쓸 필요 없다.)

### 탐구 질문
- npm에서 아무 패키지나 하나 설치하고 `node_modules/패키지명/` 폴더를 열어봐라. 어떤 파일들이 있는가?
- `package.json`의 `main`, `module`, `exports` 필드는 각각 언제 쓰이는가?

---

## 배경 지식 2. 모듈 시스템 (ESM vs CJS)

웹 앱만 만들었다면 `import/export`가 당연한 것처럼 보이지만, 실제로 JS 모듈 시스템은 역사적으로 두 가지가 공존한다.

### CJS (CommonJS)
```js
// 오래된 방식. Node.js 초기부터 사용
const fs = require('fs')
module.exports = { myFunc }
```
- Node.js가 기본적으로 오랫동안 사용한 방식
- `require()`는 동기적으로 즉시 실행됨
- 파일 확장자: `.js`, `.cjs`

### ESM (ES Modules)
```js
// 현대적 방식. 브라우저와 최신 Node.js에서 표준
import { something } from './module'
export const myFunc = () => {}
```
- 브라우저 네이티브 지원
- 비동기 로드 가능, tree-shaking 최적화 가능
- 파일 확장자: `.js`(package.json에 `"type": "module"`), `.mjs`

### 왜 라이브러리는 둘 다 제공해야 하는가?

라이브러리를 만들 때 문제:
- CJS만 제공하면 → ESM 환경(최신 Vite 앱 등)에서 최적화 불가
- ESM만 제공하면 → 오래된 Node.js 환경이나 CJS를 쓰는 프로젝트에서 에러

zustand처럼 모든 환경을 지원해야 하는 라이브러리는 둘 다 제공한다.

### 그런데 `@z-ui/core`는?

`@z-ui/core`는 **Vite 기반 모던 프로젝트만 타겟**하는 개발 전용 도구다. Vite는 ESM 네이티브이므로 `"type": "module"`로 ESM을 기본으로 간다. tsup은 예외 대응용으로 `.cjs`도 함께 빌드하지만, 패키지 기본값은 ESM이다.

```
dist/index.js   → ESM 버전 (기본)
dist/index.cjs  → CJS 버전 (예외 대응용)
```

`packages/core/package.json`의 `exports` 필드를 보면 환경에 따라 어떤 파일을 불러올지 지정되어 있다.

### 탐구 질문
- `packages/core/package.json`의 `exports` 필드를 찾아봐라. `import`와 `require` 각각 어떤 파일을 가리키는가?
- `"type": "module"`이 없는 package.json에서 `.js` 파일은 CJS로 처리된다. 이게 왜 문제가 될 수 있는가?
- `package.json`의 `"type": "module"`이 무슨 의미인지 찾아봐라

### 학습 키워드
- `ESM vs CommonJS`
- `package.json exports field`
- `dual package (ESM+CJS)`

---

## 배경 지식 3. 번들러와 tsup

### 번들러가 하는 일
웹 앱에서는 Vite나 Webpack이 코드를 번들링한다.
라이브러리에서는 목적이 다르다:

| 구분 | 웹 앱 번들러 | 라이브러리 번들러 |
|------|-------------|-----------------|
| 목적 | 브라우저에서 빠르게 실행 | 다른 코드에서 import 가능하게 |
| 출력 | 파일 1개 (bundle.js) | 여러 형식 (ESM, CJS) |
| 외부 패키지 | 포함 (번들에 넣음) | 제외 (peerDependency로 남김) |
| 타입 | 필요 없음 | `.d.ts` 파일 생성 필수 |

### tsup이란?
`packages/core/tsup.config.ts`를 열어봐라.

tsup은 라이브러리용 번들러다. 설정이 간단하고 TypeScript를 자동으로 처리한다.

```ts
// tsup.config.ts의 의미
entry: ["src/index.ts"]   // 진입점 파일
format: ["esm", "cjs"]    // ESM과 CJS 둘 다 생성
dts: true                 // TypeScript 타입 선언 파일(.d.ts) 생성
external: ["zustand"]     // zustand는 번들에 포함하지 않음 (peerDep)
```

### external이 왜 중요한가?

`zustand`를 `external`로 설정하지 않으면:
- 라이브러리 번들 안에 zustand 코드가 통째로 들어감
- 사용자 앱에도 zustand가 있으면 **zustand가 2개** 존재
- 두 zustand가 서로 다른 인스턴스 → 상태 공유 안 됨 → 버그

`peerDependencies`란 "나는 이 패키지를 사용하는데, 설치는 네가 해라"는 의미다.

### 탐구 질문
- `pnpm build` 실행 후 `dist/` 폴더를 열어봐라. 어떤 파일들이 생겼는가?
- `dist/index.d.ts`를 열어봐라. TypeScript가 자동으로 생성한 타입 선언이다. 어떻게 생겼는가?
- `peerDependencies`와 `devDependencies`의 차이는 무엇인가?

### 학습 키워드
- `tsup 공식 문서`
- `peerDependencies vs devDependencies`
- `TypeScript declaration file (.d.ts)`

---

## 배경 지식 4. pnpm과 모노레포

### 모노레포란?
하나의 git 저장소 안에 여러 패키지를 두는 방식.

이 프로젝트는:
```
Z-UI/ (하나의 git 저장소)
├── packages/core/    → 패키지 1 (@z-ui/core)
├── packages/gui/     → 패키지 2 (@z-ui/gui)
└── examples/basic/   → 패키지 3 (@z-ui/example-basic)
```

왜 하나의 저장소에 두는가?
- `core`를 수정하면 `gui`에 즉시 반영됨 (npm 배포 없이)
- 공통 TypeScript 설정을 한 곳에서 관리
- 전체 빌드/테스트를 한 번에 실행 가능

### pnpm workspace

`pnpm-workspace.yaml`을 열어봐라:
```yaml
packages:
  - "packages/*"
  - "examples/*"
```

이 파일이 "이 폴더들을 하나의 workspace로 묶어라"고 pnpm에 알려준다.

### workspace:* 의 의미

`packages/gui/package.json`을 열어봐라:
```json
"dependencies": {
  "@z-ui/core": "workspace:*"
}
```

`workspace:*`는 npm에서 받는 게 아니라 **로컬 packages/core를 그대로 사용**한다는 뜻이다.
`core`를 수정하면 `gui`에서 즉시 반영된다.

### pnpm vs npm 핵심 차이

| 구분 | npm/yarn | pnpm |
|------|----------|------|
| 저장 방식 | 프로젝트마다 복사 | 전역 1회 저장 후 링크 |
| 디스크 사용 | 많음 | 적음 |
| 유령 의존성 | 발생 가능 | 차단 |
| 속도 | 보통 | 빠름 |

**유령 의존성(phantom dependency)이란?**
A가 B를 의존하고, B가 C를 의존할 때,
npm/yarn에서는 내 코드에서 C를 직접 import해도 동작한다 (C를 설치하지 않았는데도).
pnpm은 이를 차단한다 — 직접 설치한 패키지만 import 가능.

### 자주 쓰는 pnpm 명령어

```bash
pnpm install                         # 전체 의존성 설치
pnpm --filter @z-ui/core build       # core 패키지만 빌드
pnpm --filter @z-ui/gui dev          # gui만 dev 서버 실행
pnpm -r build                        # 모든 패키지 빌드 (recursive)
pnpm --parallel dev                  # 모든 패키지 동시 실행
pnpm --filter @z-ui/core add ws      # core에 ws 패키지 추가
```

### 탐구 질문
- `pnpm install` 후 루트의 `node_modules/` 와 `packages/core/node_modules/`를 비교해봐라. 뭐가 다른가?
- `workspace:*` 대신 `workspace:^1.0.0` 을 쓰면 어떤 의미인가?

### 학습 키워드
- `pnpm workspace 공식 문서`
- `monorepo 개념`
- `phantom dependency`

---

## 배경 지식 5. TypeScript 설정 (tsconfig)

### tsconfig.base.json을 열어봐라

```json
{
  "compilerOptions": {
    "target": "ES2020",           // 어떤 JS 버전으로 컴파일할지
    "module": "ESNext",           // 모듈 시스템 (import/export 방식)
    "moduleResolution": "bundler",// 모듈 경로 찾는 방식
    "strict": true,               // 엄격 타입 검사 모드
    "exactOptionalPropertyTypes": true,  // 옵셔널 필드를 더 엄격하게
    "noUncheckedIndexedAccess": true,    // 배열/객체 접근 시 undefined 가능성 체크
    "declaration": true,          // .d.ts 타입 선언 파일 생성
    "declarationMap": true,       // .d.ts에서 원본 소스로 이동 가능하게
    "isolatedModules": true       // 파일 단위 컴파일 (Vite, tsup 호환)
  }
}
```

### 라이브러리 개발에서 중요한 설정

**`declaration: true`**
TypeScript로 만든 라이브러리를 JavaScript로 쓰는 사람도 타입 힌트를 받을 수 있게,
별도의 `.d.ts` 파일을 생성한다.

**`strict: true`**
아래 옵션들을 한 번에 켠다:
- `strictNullChecks` — null/undefined를 명시적으로 처리
- `noImplicitAny` — 타입 추론 안 되면 에러
- 등 7가지 이상

**`noUncheckedIndexedAccess`**
```ts
const arr = [1, 2, 3]
const val = arr[10]  // strict 없으면 number, 이 옵션 있으면 number | undefined
```

### extends로 설정 상속

각 패키지의 `tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",  // 부모 설정 상속
  "compilerOptions": {
    "rootDir": "src",   // 소스 파일 루트
    "outDir": "dist"    // 컴파일 결과 위치
  }
}
```

### 탐구 질문
- `strict: true`를 끄면 어떤 코드가 허용되는가? 예시를 찾아봐라
- `moduleResolution: "bundler"`와 `"node"`의 차이는 무엇인가?
- `isolatedModules: true`가 없으면 어떤 TypeScript 기능을 쓸 수 없는가?

### 학습 키워드
- `TypeScript tsconfig 공식 문서`
- `TypeScript strict mode`
- `TypeScript declaration files`

---

## 배경 지식 6. Node.js와 브라우저의 차이

웹 앱만 만들었으면 JS가 브라우저에서만 돈다고 생각할 수 있다.
`@z-ui/core`는 **Node.js 환경**에서 실행된다.

### 브라우저 JS에는 있고 Node.js에는 없는 것
```
window, document, fetch(구버전), localStorage, navigator ...
```

### Node.js에는 있고 브라우저에는 없는 것
```
require(), process, __dirname, __filename
fs (파일 시스템), path, http, net, os ...
```

### core 패키지에서 주의할 것

`@z-ui/core`는 사용자의 React 앱에 설치된다.
React 앱은 브라우저에서 실행되지만, 개발 서버(Node.js)에서도 일부 코드가 실행된다.

WebSocket 서버는 Node.js에서만 실행해야 한다:
```ts
// 이런 코드가 브라우저에서 실행되면 에러
import { WebSocketServer } from 'ws'  // 브라우저에 ws 패키지 없음
```

**어떻게 해결하는가?**
- 라이브러리 사용자가 개발 서버 실행 시에만 서버가 뜨게 해야 한다
- 번들러(Vite, webpack)가 서버 코드를 브라우저 번들에서 제외하는 방법을 찾아봐라

### 탐구 질문
- `process.env.NODE_ENV`는 무엇이고, 라이브러리에서 어떻게 활용할 수 있는가?
- Vite에서 특정 코드가 브라우저 번들에 포함되지 않게 하는 방법은?

### 학습 키워드
- `Node.js vs Browser environment`
- `process.env.NODE_ENV`
- `Vite conditional import`

---

## 배경 지식 7. WebSocket 기초

### WebSocket이란?

HTTP는 단방향이다: 클라이언트가 요청 → 서버가 응답. 끝.
WebSocket은 양방향이다: 한 번 연결하면 서버가 먼저 메시지를 보낼 수 있다.

```
HTTP:   클라이언트 → (요청) → 서버 → (응답) → 클라이언트  [연결 종료]

WebSocket:
연결:   클라이언트 ←──────────────────────→ 서버  [연결 유지]
이후:   서버 → 클라이언트 (언제든 가능)
        클라이언트 → 서버 (언제든 가능)
```

### Z-UI에서 WebSocket이 하는 역할

```
[앱 내부 Zustand] → state 변화 감지
        ↓
[core observe (subscribe)] → WebSocket 서버에 메시지 전송
        ↓
[WebSocket 서버 (localhost:3274)] → 연결된 모든 GUI에 브로드캐스트
        ↓
[GUI 브라우저] → 메시지 수신 → React 상태 업데이트 → 화면 갱신
```

### 브라우저 WebSocket API (기본)

```js
// 브라우저에서 연결
const ws = new WebSocket('ws://localhost:3274')

ws.onopen    = () => console.log('연결됨')
ws.onmessage = (event) => console.log('수신:', event.data)
ws.onclose   = () => console.log('연결 해제')
ws.onerror   = (err) => console.error('에러:', err)

ws.send('메시지')  // 서버로 전송
ws.close()         // 연결 해제
```

### Node.js WebSocket 서버 (`ws` 패키지)

```js
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 3274 })

wss.on('connection', (ws) => {
  // ws: 개별 클라이언트 연결
  ws.on('message', (data) => console.log('수신:', data.toString()))
  ws.send('환영합니다')
})
```

### 탐구 질문
- HTTP polling vs WebSocket의 차이는? 언제 WebSocket이 필요한가?
- WebSocket 연결이 끊기는 경우는 어떤 것들이 있는가?
- `ws://`와 `wss://`의 차이는?

### 학습 키워드
- `WebSocket MDN 문서`
- `ws npm package 공식 문서`
- `WebSocket vs HTTP polling`

---

## 배경 지식 8. 시맨틱 버저닝 (semver)

npm 패키지 버전은 `MAJOR.MINOR.PATCH` 형식이다.

```
1.4.2
│ │ └─ PATCH: 버그 수정 (하위 호환 유지)
│ └─── MINOR: 새 기능 추가 (하위 호환 유지)
└───── MAJOR: 호환성이 깨지는 변경
```

### 이 프로젝트에 적용

초기 개발 중에는 `0.x.x`를 쓴다:
- `0.0.1` → 초기 스캐폴딩
- `0.1.0` → 첫 동작하는 버전 (이 프로젝트 배포 목표)
- `1.0.0` → API가 안정적으로 확정됐을 때

### `^`와 `~`의 의미

`package.json`에서:
```json
"zustand": "^4.5.0"   // 4.5.0 이상, 5.0.0 미만 허용
"zustand": "~4.5.0"   // 4.5.0 이상, 4.6.0 미만 허용
"zustand": "4.5.0"    // 정확히 이 버전만
```

### 탐구 질문
- `peerDependencies`에서 `"zustand": ">=4.0.0"`으로 쓰는 이유는?
- `workspace:*`는 배포 시 실제 버전 번호로 어떻게 변환되는가?

### 학습 키워드
- `semver (semantic versioning)`
- `npm version 명령어`

---

## 배경 지식 9. 이 프로젝트 파일 구조 한눈에 보기

```
Z-UI/
│
├── package.json              ← 루트 (private: true, 배포 안 함)
│   scripts:
│     dev:example → examples/basic 실행
│     dev         → gui 실행
│     build       → core 빌드
│
├── pnpm-workspace.yaml       ← 워크스페이스 설정
├── tsconfig.base.json        ← 공통 TS 설정 (모든 패키지가 extends)
├── .gitignore
│
├── packages/
│   │
│   ├── core/                 ← 📦 배포될 라이브러리 (npm publish 대상)
│   │   ├── src/
│   │   │   ├── index.ts      ← Public API (initZui, subscribe 기반 관찰)
│   │   │   ├── vite.ts       ← Vite 플러그인 (WebSocket 서버 시작만, GUI 서빙 없음)
│   │   │   └── scaffold.ts   ← 스토어 보일러플레이트 생성/삭제 (파일시스템 조작)
│   │   ├── dist/             ← 빌드 결과 (gitignore)
│   │   │   ├── index.js      ← ESM 버전
│   │   │   ├── index.cjs     ← CJS 버전
│   │   │   ├── index.d.ts    ← 타입 선언
│   │   │   ├── vite.js       ← Vite 플러그인 ESM
│   │   │   └── vite.cjs      ← Vite 플러그인 CJS
│   │   ├── package.json      ← name: @z-ui/core
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts    ← 빌드 설정
│   │
│   └── gui/                  ← 🖥️ 독립 실행형 CLI 앱 (npm publish 대상, 사용자가 npx로 실행)
│       ├── src/
│       │   └── main.tsx      ← GUI React 앱 진입점
│       ├── bin/
│       │   └── z-ui.js       ← CLI 진입점 (정적 서버 실행 + 브라우저 오픈)
│       ├── dist/              ← 빌드 결과 (gitignore) — GUI 정적 파일 자체 보관
│       │   ├── index.html
│       │   └── assets/
│       ├── index.html
│       ├── package.json      ← name: @z-ui/gui, "bin": { "z-ui": "./bin/z-ui.js" }
│       ├── tsconfig.json
│       └── vite.config.ts    ← outDir: dist (자체 폴더, core로 안 들어감)
│
└── examples/
    └── basic/                ← 🧪 테스트용 앱 (배포 X)
        ├── src/
        │   ├── stores/       ← 테스트용 Zustand 스토어 3개
        │   ├── App.tsx       ← 스토어 조작 UI
        │   └── main.tsx
        ├── package.json      ← "@z-ui/core": "workspace:*"
        └── vite.config.ts    ← port: 5173
                                 alias: @z-ui/core → packages/core/src/index.ts
```

### 각 파일이 왜 거기 있는가

**`examples/basic/vite.config.ts`의 alias**
```ts
"@z-ui/core": path.resolve(__dirname, "../../packages/core/src/index.ts")
```
`core`를 빌드하지 않아도 소스 파일을 직접 참조한다.
개발 중에 매번 `pnpm build` 할 필요가 없다.

**`packages/core/package.json`의 `peerDependencies`**
```json
"peerDependencies": {
  "zustand": ">=4.0.0"
}
```
"나는 zustand를 쓰는데, 설치는 네 프로젝트에 이미 있다고 가정한다"는 뜻.

---

## 배경 지식 10. 개발 흐름 한눈에 보기

```
[Z-UI 개발 시 — 이 저장소 작업할 때]
pnpm dev:all 실행
  → examples/basic (5173): 테스트용 앱 (각 스토어가 zui()로 자기 등록, main.tsx는 initZui()만 호출)
  → packages/gui (5274): GUI 앱 HMR 개발 서버 (GUI 코드 수정 시 반영, 앱과 완전히 독립된 프로세스)
  → WebSocket 서버 (3274): core 미들웨어가 자동 시작

core 코드 수정 시:
  packages/core/src/ 수정
    → examples/basic이 alias로 직접 참조하므로 즉시 반영

GUI 코드 수정 시:
  packages/gui/src/ 수정
    → 5274 포트의 HMR이 자동 반영

[Z-UI 배포 시]
pnpm build:gui   → packages/gui 빌드 → packages/gui/dist/ 에 정적 파일 생성 (core로 안 들어감)
pnpm build:core  → packages/core 빌드 → dist/ 생성 (WS 서버 + Vite 플러그인만)
pnpm publish     → npm에 @z-ui/core, @z-ui/gui 각각 배포

[사용자 — 설치 후]
npm install -D @z-ui/core
→ vite.config.ts에 zuiPlugin() 추가 → 앱 dev 서버 실행 시 WS 서버(3274)만 자동 시작

npx @z-ui/gui   (또는 npm install -D @z-ui/gui 후 npx z-ui)
→ GUI가 자체 포트(예: http://localhost:4275)에서 독립 실행
→ 브라우저가 자동으로 열리고, ws://localhost:3274로 연결해서 앱 상태를 구독
→ 앱의 dev 서버와 완전히 분리된 프로세스 — 스토리북처럼 따로 뜨고 따로 닫힌다
```

---

## 배경 지식 체크리스트

```
□ 앱과 라이브러리의 차이를 설명할 수 있다
□ ESM과 CJS의 차이를 설명할 수 있다
□ peerDependency가 무엇인지 설명할 수 있다
□ workspace:* 가 무엇을 의미하는지 안다
□ tsup이 왜 필요한지 설명할 수 있다
□ @z-ui/gui가 core dev 서버에 내장되지 않고 독립 CLI로 배포되는 이유를 설명할 수 있다
□ Vite Plugin의 apply: 'serve'가 하는 역할을 설명할 수 있다
□ process.env.NODE_ENV 가드가 production 빌드에서 어떻게 제거되는지 설명할 수 있다
□ .d.ts 파일이 무엇인지 안다
□ WebSocket이 HTTP와 다른 점을 설명할 수 있다
□ 시맨틱 버저닝의 MAJOR.MINOR.PATCH를 설명할 수 있다
□ 프로젝트 파일 구조를 보고 각 파일의 역할을 설명할 수 있다
```

---

## 배경 지식 11. Development-only 설정 전략

> 이 라이브러리는 개발 환경에서만 작동해야 한다.
> production 빌드에 개발 도구 코드가 포함되면 번들 크기가 커지고 보안 위협이 생긴다.
> "어떻게"가 아니라 "어느 레이어에서" 차단할지 먼저 이해하라.
>
> 참고: GUI는 core의 dev 서버가 서빙하지 않는다. `@z-ui/gui`가 `npx z-ui`로
> 독립 실행되는 별도 프로세스이기 때문에, 아래 전략은 **core 쪽(WS 서버 + 미들웨어)**에만
> 해당한다. GUI 자체는 사용자가 명시적으로 실행하는 도구이므로 production 격리 대상이 아니다.

### 3-레이어 전략

```
┌─────────────────────────────────────────────────────────────┐
│  레이어 1: 런타임 가드 (initZui)                              │
│    process.env.NODE_ENV !== 'production' 체크                │
│    production → initZui()가 즉시 반환 (아무것도 안 함)         │
│                                                             │
│  레이어 2: Node.js 서버 격리 (Vite Plugin)                   │
│    apply: 'serve' → dev server에서만 실행                    │
│    vite build 실행 시 플러그인 자체가 무시됨                   │
│    이 플러그인은 WebSocket 서버만 시작한다 — GUI 정적 파일은  │
│    서빙하지 않는다 (GUI는 별도 프로세스)                       │
│                                                             │
│  레이어 3: 엔트리포인트 분리 (번들링)                          │
│    import { initZui } from '@z-ui/core'        → 브라우저 번들 │
│    import { zuiPlugin } from '@z-ui/core/vite' → Node.js만  │
│    브라우저 번들에 ws 패키지가 절대 포함되지 않음               │
└─────────────────────────────────────────────────────────────┘
```

### 레이어 1: 런타임 가드 (initZui, zui)

```ts
// packages/core/src/index.ts

// zui(name, store)는 스토어 파일이 자기 자신을 등록하는 용도 — 항상 로컬 Registry에는
// 등록하되(가벼운 Map 삽입이라 production에도 있어도 무해), WS 전송 관련 동작만 가드한다.
function zuiImpl<T>(name: string, store: StoreApi<T>): void { /* 과제 1-4 참고 */ }
export const zui = process.env.NODE_ENV !== 'production' ? zuiImpl : () => {}

function initZuiImpl(options: InitZuiOptions = {}): void { /* WS 클라이언트 연결 — 과제 1-4 참고 */ }

// 번들러가 빌드 시 process.env.NODE_ENV를 리터럴 문자열로 치환함
// → "production" !== 'production' 은 false → 참 분기를 tree-shake로 제거
export const initZui = process.env.NODE_ENV !== 'production' ? initZuiImpl : () => {}
```

**왜 이 패턴이 동작하는가?**
- Vite/webpack은 빌드 시 `process.env.NODE_ENV`를 리터럴 문자열로 치환한다
- 삼항 연산자의 죽은 분기(dead branch)를 번들러가 제거한다
- Redux DevTools, Zustand 공식 devtools 미들웨어가 동일한 패턴을 사용한다

### 레이어 2: Vite Plugin (서버)

```ts
// packages/core/src/vite.ts
import type { Plugin } from 'vite'
import { createZuiServer } from './server'

export function zuiPlugin(): Plugin {
  return {
    name: 'vite-plugin-z-ui',
    apply: 'serve',           // 이 한 줄이 핵심: dev server에서만 적용
    configureServer() {
      createZuiServer()       // Node.js 컨텍스트에서 WebSocket 서버 시작
    }
  }
}
```

라이브러리 사용자는 `vite.config.ts`에 플러그인 하나만 추가한다:
```ts
import { zuiPlugin } from '@z-ui/core/vite'

export default defineConfig({
  plugins: [react(), zuiPlugin()],
})
```

`apply: 'serve'`가 없으면 `vite build` 시에도 플러그인이 실행되어 버린다.
`configureServer`는 Vite dev server의 Node.js 컨텍스트에서만 실행되므로 `ws` 패키지를 안전하게 사용할 수 있다.

이 플러그인이 하는 일은 **딱 WebSocket 서버 시작뿐**이다. GUI 정적 파일을 서빙하는 미들웨어는
추가하지 않는다 — GUI는 `@z-ui/gui`를 `npx z-ui`로 실행하는 완전히 별도의 프로세스다
(스토리북이 앱과 별도 서버로 뜨는 것과 같은 모델). 이렇게 분리하면:
- 앱을 안 띄운 상태에서도 GUI만 켜서 UI를 확인할 수 있다
- 앱 dev 서버가 GUI 번들 크기/라우팅 부담을 지지 않는다
- GUI 하나로 여러 앱(포트만 다른)을 번갈아 붙여볼 수 있다

### 레이어 3: 엔트리포인트 분리

```
packages/core/src/
├── index.ts       ← 브라우저 진입점 (ws import 없음, 브라우저 내장 WebSocket만 사용)
│                     export: zui, initZui, InitZuiOptions, ServerMessage, ClientMessage
│
└── vite.ts        ← Node.js 전용 진입점 (ws import 있음)
                      export: zuiPlugin
```

`packages/core/package.json`의 `exports` 필드:
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./vite": {
      "import": "./dist/vite.js",
      "require": "./dist/vite.cjs"
    }
  }
}
```

`tsup.config.ts`에 진입점 추가:
```ts
entry: ["src/index.ts", "src/vite.ts"],
external: ["zustand", "vite", "ws"],
```

**왜 엔트리포인트 분리가 중요한가?**
`index.ts`가 `ws`를 import하지 않으므로, 브라우저 번들러가 `ws`를 절대 포함하지 않는다.
Node.js 전용 API가 브라우저 번들에 들어가면 런타임에 즉시 에러가 발생한다.

### 최종 사용자 경험

```ts
// vite.config.ts
import { zuiPlugin } from '@z-ui/core/vite'
export default defineConfig({
  plugins: [react(), zuiPlugin()],  // dev에서만 WS 서버 시작
})

// main.tsx — 앱 진입점에서 딱 두 줄, 이후로는 다시 안 건드림
import { initZui } from '@z-ui/core'

import.meta.glob('./stores/*.ts', { eager: true })  // src/stores/의 모든 파일을 로드
initZui()  // WS 클라이언트 연결만 연다 (스토어 목록은 몰라도 됨)
// production 빌드에서 initZui()는 자동으로 noop → 번들 크기 영향 없음

// stores/counterStore.ts — 스토어는 순수 zustand 그대로, 마지막 줄에 자기 등록만 추가
import { create } from 'zustand'
import { zui } from '@z-ui/core'

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}))

zui('counterStore', useCounterStore)
```

```bash
# 별도 터미널 — GUI는 앱과 독립적으로 실행
npx z-ui
# → GUI가 http://localhost:4275 에서 열리고 ws://localhost:3274로 자동 연결
```

### 탐구 질문
- `apply: 'build'`와 `apply: 'serve'`를 각각 쓰면 어떤 차이가 있는가?
- `process.env.NODE_ENV`를 라이브러리 소스에 직접 쓰는 것이 안전한가? 어떤 번들러가 처리하는가?
- `external: ["ws"]`가 없으면 어떤 일이 일어나는가?

### 학습 키워드
- `Vite Plugin apply option 공식 문서`
- `tree-shaking dead code elimination`
- `package.json exports subpath`

---

---

# Phase 0. Zustand 내부 구조 이해

> 코드를 한 줄도 작성하지 않는다. 읽고, 실험하고, 질문에 답하는 단계.

---

## 과제 0-1. Zustand 소스코드 직접 탐색

Zustand는 오픈소스다. 실제 소스를 직접 읽어라.

### 소스 접근 방법

**방법 A — GitHub에서 읽기 (추천)**
```
https://github.com/pmndrs/zustand
```
`src/` 폴더로 이동하면 핵심 파일들이 있다.

**방법 B — 로컬 node_modules에서 읽기**
```
F:\Projects\Z-UI\node_modules\zustand\src\
```
이미 설치되어 있으니 IDE에서 바로 열 수 있다.

### 읽어야 할 파일 순서

#### Step 1. `src/vanilla.ts` 부터 시작

이 파일이 Zustand의 심장이다. React 없이 순수하게 상태를 관리하는 로직 전체가 여기 있다.

파일을 열고 다음을 찾아라:
- `createStore` 함수가 어디서 시작하고 어디서 끝나는가
=> createStoreImpl 이름으로 구현돼있으며 60~97 라인으로 구성

- 함수 내부에 어떤 변수들이 선언되는가 (`state`, `listeners` 등)
=> state 변수가 Tstate 타입으로 선언, listeners가 Set으로 선언됨

- `setState` 함수의 내부 로직 — 어떤 순서로 실행되는가
=> 우선 nextState로 다음 상태를 선언함. 여기서 받게되는 partial이 함수라면 실행해서 다음 상태를 얻고 함수가 아니라면 그대로 사용한다.
=> 상태가 바뀌었는지 object.is를 통해 변경사항을 비교한다.
=> state를 previousState에 할당한 후 replace가 true면 통째로 교체하고, false면 assign을 통해 state와 nextState 둘을 합친다.
=> state를 구독한 모든 컴포넌트에 리스너를 통해 알린다.

- `subscribe` 함수가 반환하는 것이 무엇인가
=> listeners(Set 객체)에 listener로 들어온 구독 컴포넌트를 추가하고, 이를 선언할 때 리스너에 추가할 수 있도록한다.
subscribe를 호출하면 delete가 반환되어 마치 클린업처럼 리스너 구독 정리 함수로 사용할 수 있다.

탐구 질문:
1. `listeners`는 어떤 자료구조로 저장되는가? 왜 그 자료구조를 선택했을까?
=> Set을 사용하고, 리스너의 중복 등록을 예방할 수 있다. 또한 Set.delete를 활용하여 순회하지 않고 O(1) 성능으로 제거가 가능하다.

2. `setState`가 호출되면 `listeners`는 언제, 어떤 인자를 받아 호출되는가?
=> 현재 state와 들어오는 변경 예정 state가 같지 않다고 비교가 될 때, 조건부로 마지막에 이전 state와 현재 변경 예전 state를 인자를 받아 호출되고 구독 컴포넌트에게 변경 사항을 전달한다.

3. `subscribe(listener)`의 반환값을 호출하면 어떤 일이 일어나는가?
=> 해당 리스너의 구독이 제거된다.(구독 해지)

4. `getInitialState()`는 언제 필요한가?
=> store 생성 시 초기화된 상태를 담고 있는 InitialState를 반환하는게 필요할 때, 호출한다.

**[피드백]**
- 정확한 부분: `createStoreImpl` 구조, `state`/`listeners` 선언, `setState` 실행 순서, `subscribe`의 구독 해지 로직, `listeners`로 `Set`을 쓴 이유(중복 방지 + O(1) delete) — 전부 정확하다.
- 보완할 부분 1 — `setState`의 교체/병합 분기 조건이 정확히는 이렇다:
  ```js
  state = (replace ?? (typeof nextState !== "object" || nextState === null))
    ? nextState
    : Object.assign({}, state, nextState);
  ```
  "replace가 true면 교체, false면 병합"이라고 적었는데, 실제로는 `replace`를 **아예 안 넘기면**(`undefined`) `nextState`가 객체가 아니거나 `null`일 때 자동으로 전체 교체로 처리된다. 즉 상태가 원시값(number, string 등)이면 `replace`를 명시 안 해도 병합 시도 없이 통으로 바뀐다. 이 nullish coalescing 기본값 처리가 답변에서 빠져 있었다.
- 보완할 부분 2 — 리스너 호출 인자 순서: `listener(state, previousState)` — **새 state가 첫 번째, 이전 state가 두 번째**다. "이전 state와 현재 변경 예정 state를 인자로 받아"라고만 적어서 순서가 모호했는데, 새 값이 먼저라는 걸 명시하면 좋다.
- 보완할 부분 3 — `getInitialState()`의 핵심은 "초기화된 상태를 반환할 때 필요"보다는, `state`는 `setState`로 계속 재할당되어 바뀌지만 `initialState`는 스토어 생성 시점 값을 절대 변경 없이 그대로 들고 있다는 점이다. 그래서 `store.setState(store.getInitialState(), true)` 같은 **reset 기능** 구현에 쓰인다.
- 덤: 27번째 줄 `const initialState = state = createState(...)` — `getInitialState`는 이 줄보다 먼저 정의되는데도 정상 동작한다. 클로저가 변수 자체를 참조하고, 실제로 호출되는 시점(스토어 생성 완료 후)에는 이미 `initialState`가 할당돼 있기 때문. `var`/`function` 호이스팅이 아니라 **클로저의 지연 평가(lazy evaluation)** 덕분이라는 점에 주의.

#### Step 2. `src/react.ts` 읽기

React와 연결되는 부분이다. `vanilla.ts`의 store를 어떻게 React hook으로 만드는지 본다.

탐구 질문:
1. `useSyncExternalStore`는 무엇이고 왜 쓰는가?
=> 추측하기로는 React 라이브러리에서 외부 스토어 시스템과 내부 React  스토어를 조작할 때 있어서 제공하는 api 같음. 이를 위해 zustand가 형식에 맞추어 store를 조작하는 방식을 argument로 넘기는 항목을 넘겨 api 정보(구독 컴포넌트와 vanilla에서 생성한 스토어 정보 등)를 제공함.

2. selector 함수가 없을 때와 있을 때 동작이 어떻게 달라지는가?
selector의 역할도 모르겠음

**[피드백]**
- 실제 소스(`react.mjs`):
  ```js
  const identity = (arg) => arg;
  function useStore(api, selector = identity) {
    const slice = React.useSyncExternalStore(
      api.subscribe,
      React.useCallback(() => selector(api.getState()), [api, selector]),
      React.useCallback(() => selector(api.getInitialState()), [api, selector])
    );
    React.useDebugValue(slice);
    return slice;
  }
  ```
- `useSyncExternalStore`: 추측한 방향이 맞다. React 18에서 도입된 훅으로, React state가 아닌 **외부(vanilla) 스토어를 구독해서 리렌더링을 트리거**하는 공식 API다. 시그니처는 `(subscribe, getSnapshot, getServerSnapshot)`.
  - 1번째 인자 `api.subscribe` — Step1에서 본 그 `subscribe`. React가 이 함수로 리스너를 등록하고, `setState`가 호출되면 React에게 "리렌더링해도 되는지 확인해봐"라고 신호를 준다.
  - 2번째 인자(getSnapshot) — 현재 값을 반환. React가 렌더링마다 호출해서 이전 snapshot과 `Object.is`로 비교, 다르면 리렌더링.
  - 3번째 인자(getServerSnapshot) — SSR용 스냅샷. `getInitialState()`가 여기 쓰이는 이유 — 서버는 항상 초기 상태 기준으로 렌더링해야 하기 때문. Step1의 "getInitialState는 언제 필요한가"의 답 중 하나가 여기 있다.
- selector: "스토어 전체 상태 중 컴포넌트가 실제로 필요한 조각만 뽑아내는 함수"다.
  - **selector가 없으면** 기본값 `identity`(그대로 반환)가 쓰여서 스토어 **상태 전체**를 반환 → 스토어의 어떤 필드가 바뀌든 이 컴포넌트는 리렌더링 대상이 된다.
  - **selector가 있으면**(예: `state => state.count`) 필요한 값만 뽑는다. `useSyncExternalStore`가 이 뽑아낸 값을 `Object.is`로 비교하므로, **selector가 뽑은 부분이 안 바뀌면 리렌더링되지 않는다.**
  - 즉 selector는 불필요한 리렌더링을 줄이는 성능 최적화 지점이자, "필요한 조각만 구독"한다는 zustand의 핵심 설계 철학이 구현되는 곳이다.

#### Step 3. `src/middleware/devtools.ts` 전체 분석

공식 미들웨어들이 모두 있는 `src/middleware.ts` 중에서, 이번엔 **devtools 부분 전체**를 처음부터 끝까지 읽는다. 우리가 만들 `zui()`가 거의 이 구조를 그대로 참고하게 될 것이기 때문에, 일부만 보고 넘어가면 나중에 Phase 1에서 막힌다.

파일을 열고 아래 흐름대로 구조를 나눠서 읽어라.

**A. 진입점 — `devtoolsImpl(fn, devtoolsOptions)`**
- 미들웨어가 받는 인자가 무엇인가 (`fn`은 무엇이고, `devtoolsOptions`는 무엇인가)
- 반환하는 것은 무엇인가 — 이게 바로 `(set, get, api) => {...}` 형태의 `StateCreator`다. Step2에서 본 `create(createState)`의 `createState` 자리에 들어가는 함수와 같은 모양이다.

**B. Redux DevTools Extension 연결 확인**
- `window.__REDUX_DEVTOOLS_EXTENSION__`을 어떻게 확인하는가
- extension이 없으면 (`!extensionConnector`) 무슨 일이 일어나는가 — devtools 없이도 앱이 정상 동작해야 하는 이유는?
- `enabled` 옵션과 `production` 모드가 어떻게 상호작용하는가

**C. 여러 스토어를 하나의 DevTools 창에 모으기 — tracked connection**
- `extractConnectionInformation` 함수가 하는 일
- `store` 옵션을 넘기지 않은 경우(`untracked`)와 넘긴 경우(`tracked`)의 차이
- `trackedConnections`라는 모듈 레벨 `Map`은 왜 필요한가 (여러 개의 zustand 스토어가 DevTools 창 하나를 공유하려면?)

**D. `set` 가로채기 — `api.setState` 재할당**
- `api.setState = (...) => {...}` 여기서 원래의 `set`을 어떻게 호출하는가
- 그 다음 `connection.send(action, get())`으로 무엇을 보내는가
- `nameOrAction`이 없을 때 액션 이름을 어떻게 추론하는가 (`findCallerName` — 스택 트레이스를 파싱한다는 게 무슨 의미인지)

**E. DevTools → 앱 방향 (역방향 데이터 흐름)**
- `connection.subscribe((message) => {...})` — 이건 우리 서버가 아니라 **DevTools 확장 프로그램**이 보내는 메시지를 받는 부분이다
- `message.type`이 `"ACTION"`일 때와 `"DISPATCH"`일 때 각각 어떻게 분기하는가
- `DISPATCH` 안에서도 `RESET`, `COMMIT`, `ROLLBACK`, `JUMP_TO_STATE`, `JUMP_TO_ACTION`, `IMPORT_STATE`, `PAUSE_RECORDING` 각각이 무엇을 하는 명령인지 하나씩 짚어라 (전부 몰라도 되지만, "시간여행 디버깅"이 이 스위치문으로 구현된다는 것만 이해하면 된다)

**F. 무한 루프 방지 — `isRecording` 플래그**
- `setStateFromDevtools` 함수가 `isRecording`을 어떻게 껐다 켜는가
- 이게 왜 필요한가: DevTools가 보낸 `JUMP_TO_STATE`로 `set`을 호출했는데, 그 `set`이 다시 `connection.send`를 트리거하면 어떻게 되는가? (이 질문은 이후 과제 1-4에서 네가 직접 풀어야 할 "무한 루프 문제"와 똑같은 패턴이다)

**G. redux 미들웨어와의 관계 (선택)**
- `reduxImpl`에서 `api.dispatchFromDevtools = true`를 설정하는 이유
- `shouldDispatchFromDevtools(api)`는 언제 `true`가 되는가

탐구 질문:
1. `api.setState`를 덮어쓰는 방식(재할당)과, `set` 자체를 감싸서 새 함수를 반환하는 방식은 뭐가 다른가? devtools는 왜 전자를 택했을까?
2. `isRecording` 같은 플래그 대신 다른 방법으로 무한 루프를 막을 수 있을까? (예: 메시지에 "출처" 표시하기)
3. `trackedConnections`(모듈 레벨 `Map`)를 안 쓰고 각 스토어가 독립적으로 connection을 만들면 어떤 문제가 생기는가?

### 미니 실험 — 직접 subscribe 사용해보기

`examples/basic`을 실행한 상태에서,
브라우저 콘솔에 다음을 타이핑해서 실험해봐라:

어떻게 하면 브라우저 콘솔에서 `useCounterStore`의 내부 `getState`와 `subscribe`에 접근할 수 있을까?
(힌트: React DevTools, window 전역 객체, store 인스턴스 접근 방법을 찾아봐라)

subscribe를 직접 호출해서, 카운터 버튼을 누를 때마다 콘솔에 state가 출력되게 만들어봐라.

### 완료 기준
- [ ] `vanilla.ts`의 `createStore` 흐름을 종이에 그림으로 그릴 수 있다
- [ ] `setState` → `listeners 순회 호출` 흐름을 설명할 수 있다
- [ ] subscribe를 직접 호출해서 state 변화를 콘솔에서 확인했다
- [ ] devtools 미들웨어에서 set 가로채기 패턴을 찾아 형광펜(주석)으로 표시했다

---

## 과제 0-2. Zustand 미들웨어 타입 이해

### 읽어야 할 파일

**GitHub:**
```
https://github.com/pmndrs/zustand/blob/main/src/types.ts
```

**로컬:**
```
F:\Projects\Z-UI\node_modules\zustand\src\types.ts
```

공식 문서도 함께 읽어라:
```
https://zustand.docs.pmnd.rs/guides/typescript
→ "Middlewares and their mutators" 섹션
```

### 탐구 질문
1. `StateCreator<T, Mps, Mcs>` 에서 T, Mps, Mcs는 각각 무엇인가?
2. `StoreApi<T>`가 갖는 메서드(`getState`, `setState`, `subscribe`)는 각각 어떤 역할인가?
3. `StoreMutatorIdentifier`가 없으면 어떤 문제가 생기는가?

### 미니 실습

logger 미들웨어를 직접 작성해봐라. 타입은 신경 쓰지 말고 동작만.

```
목표: set이 호출될 때마다 { before: 이전state, after: 이후state } 를 콘솔에 출력
```

이걸 `examples/basic/src/stores/counterStore.ts`에 적용해서 동작을 확인해라.
나중에 원래대로 되돌려라.

### 완료 기준
- [ ] logger 미들웨어를 작성하고 counterStore에 적용해서 콘솔 출력을 확인했다
- [ ] 탐구 질문에 답할 수 있다

---

---

# Phase 1. Core 라이브러리

> 각 과제는 **[콘솔 검증] → [연결] → [정리]** 3단계로 진행한다.
> "콘솔 검증"이 완료되지 않으면 다음 단계로 가지 마라.
>
> **먼저 이해해야 할 실행 위치(런타임) 구분:**
> - `server.ts`(과제 1-2) — **Node.js 프로세스**(Vite dev server 안)에서 돈다. `ws` 패키지의
>   `WebSocketServer`로, 연결된 모든 클라이언트(App 탭 + GUI 탭) 사이의 메시지를 중계하는 허브다.
> - `registry.ts`(과제 1-3), `index.ts`의 `zui`/`initZui`(과제 1-4) — **브라우저**(App 탭)에서
>   돈다. zustand 스토어 자체가 `create()`로 브라우저에서 만들어지니, 그걸 담는 Registry도
>   같은 런타임(브라우저)에 있어야 한다.
> - App 탭과 Node 서버는 **같은 프로세스가 아니다.** 그래서 App 쪽 `zui()`가 상태 변화를
>   서버에 알리려면 `server.broadcast(...)`를 직접 호출하는 게 아니라, **GUI와 똑같이
>   자기만의 WebSocket 클라이언트 연결**(`new WebSocket('ws://localhost:3274')` — 브라우저
>   내장 API라 `ws` 패키지 import가 필요 없다)을 열어서 `ws.send(...)`로 메시지를 보내야 한다.
>   과제 1-4에서 이 부분을 정확히 짚는다.

---

## 과제 1-1. 메시지 프로토콜 설계

**파일:** `packages/core/src/protocol.ts` (새로 만들기)

### 배경
GUI ↔ 앱 사이에 오가는 메시지의 타입을 TypeScript로 정의한다.
이게 없으면 이후 코드 전체에 `any`가 넘쳐흐른다.

### [단계 1] ServerMessage 타입 작성

앱 → GUI 방향. 아래 3가지 상황에 맞는 타입을 설계하라.

**상황 1: 스토어 최초 등록 시**
포함할 것: 메시지 구분자, 스토어 이름, 초기 state(`unknown`), 액션 이름 배열

**상황 2: state가 바뀔 때마다**
포함할 것: 메시지 구분자, 스토어 이름, 새 state(`unknown`), 어떤 액션이 호출됐는지(문자열), 타임스탬프(숫자)

**상황 3: 스토어 제거 시 (`STORE_REMOVE`)**
포함할 것: 메시지 구분자, 스토어 이름

> 발신자가 항상 App인 건 아니다 — 과제 1-8에서는 **서버(Node)가 파일 삭제 후 직접**
> 이 메시지를 broadcast한다 (서버는 Registry를 몰라서 등록 여부를 확인 못 하니, 조건 없이
> 보낸다). 수신 측은 GUI뿐 아니라 **App 자신도** 포함된다 — App은 이 메시지를 받으면
> 자기 로컬 Registry에서 unregister한다 (과제 1-4). "app→GUI"라는 이름의 방향성에
> 얽매이지 말고, 실제로는 "서버가 전체 broadcast하는 이벤트"라고 생각하는 편이 맞다.

**상황 4: SCAFFOLD_STORE / DELETE_STORE 처리 결과 알림** *(과제 1-8과 연동)*
포함할 것: 메시지 구분자, 성공 여부(boolean), 실패 시 사유 메시지(문자열, optional)

> GUI가 "이미 존재하는 이름" 같은 에러를 화면에 보여주려면(과제 2-4) 이 응답 타입이 필요하다.
> `SCAFFOLD_STORE`를 보내놓고 성공했는지 실패했는지 알 방법이 없으면 GUI는 그냥 멍하니 기다리게 된다.

### [단계 2] ClientMessage 타입 작성

GUI → 앱 방향. 아래 3가지 상황에 맞는 타입을 설계하라.

**상황 1: GUI에서 state 값 수정 시**
포함할 것: 메시지 구분자, 스토어 이름, 수정할 값(`unknown`)

**상황 2: 스냅샷 복구 요청 시**
포함할 것: 메시지 구분자, 스토어 이름, 복구할 전체 state(`unknown`)

**상황 3: GUI가 처음 연결돼서 스토어 목록 요청 시**
포함할 것: 메시지 구분자만

**상황 4: GUI에서 새 스토어 보일러플레이트 생성 요청 시** *(과제 1-8과 연동)*
포함할 것: 메시지 구분자, 생성할 스토어 이름, 필드 목록(이름+타입 배열), **`register`(boolean) — GUI 체크박스 값, true면 생성되는 파일 맨 마지막 줄에 `zui(name, store)` 호출을 포함시켜서 저장**

**상황 5: GUI에서 스토어 파일 삭제 요청 시** *(과제 1-8과 연동)*
포함할 것: 메시지 구분자, 삭제할 스토어 이름

> 상황 4/5는 "런타임 state 조작"이 아니라 "디스크의 소스 파일 조작" 요청이다.
> 서버(core)가 이 메시지를 받으면 Registry가 아니라 파일시스템에 작업한다 — 과제 1-8 참고.

### [단계 3] 타입 가드 함수 작성

WebSocket으로 받은 `unknown` 데이터를 검증하는 함수.

```
isServerMessage(data: unknown): data is ServerMessage
isClientMessage(data: unknown): data is ClientMessage
```

### [단계 4] 검증

아래 코드를 임시로 작성해서 narrowing이 동작하는지 확인하라:

```ts
// 임시 검증 코드 — 완료 후 삭제
function test(msg: ServerMessage) {
  switch (msg.type) {
    case "STORE_INIT":
      // 여기서 msg.actions 에 자동완성이 뜨는지 IDE에서 확인
      break
    case "STATE_UPDATE":
      // 여기서 msg.actionName 자동완성 확인
      break
  }
}
```

### 탐구 질문
- `type` 필드를 `string`이 아닌 리터럴 타입으로 써야 하는 이유는?
- `unknown`과 `any`의 차이는? 왜 이 파일에서 `unknown`이 맞는가?

### 학습 키워드
- `TypeScript discriminated union`
- `TypeScript type narrowing`
- `TypeScript type guard` (is 키워드)

### 완료 기준
- [ ] switch문 분기 안에서 각 타입의 필드만 자동완성됨
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 1-2. WebSocket 서버 구현

**파일:** `packages/core/src/server.ts` (새로 만들기)

```bash
pnpm --filter @z-ui/core add ws
pnpm --filter @z-ui/core add -D @types/ws
```

### [단계 1 — 콘솔 검증] 서버만 단독으로 동작하는지 확인

이 단계의 목표: GUI 없이, 터미널과 브라우저 콘솔만으로 서버 동작을 검증한다.

**1-A. ZuiServer 인터페이스 정의**

구현 전에 타입부터 정의하라:
```
ZuiServer 타입에는 무엇이 필요한가?
  - 모든 GUI에 메시지를 보내는 함수
  - GUI로부터 메시지가 왔을 때 핸들러를 등록하는 함수
  - 서버를 닫는 함수
```

**1-B. createZuiServer 기본 구현**

요구사항:
- `ws` 패키지의 `WebSocketServer` 사용
- 기본 포트 `3274` — `createZuiServer(options?: { port?: number })`로 오버라이드 가능하게
  (과제 1-6에서 여러 앱을 동시에 띄울 때 포트 충돌을 피하려면 필요하다. 지금은 인자만 받아두고,
  실제로 여러 앱을 동시 실행해서 검증하는 건 나중으로 미뤄도 된다)
- 새 클라이언트 접속 시: `[Z-UI] GUI connected` 출력
- 클라이언트 해제 시: `[Z-UI] GUI disconnected` 출력
- 서버 시작 시: `[Z-UI] Server running on ws://localhost:{port}` 출력

**1-C. 싱글턴 패턴 적용**

`createZuiServer()`를 두 번 호출해도 서버가 하나만 생성되도록 하라.
모듈 레벨 변수를 이용하는 방법을 사용해라.

**1-D. 콘솔 검증 — 브라우저에서 직접 테스트**

서버 파일을 Node.js로 직접 실행해서 검증해라:
```bash
# packages/core/ 에서
node --loader ts-node/esm src/server.ts
# 또는
npx tsx src/server.ts
```

서버가 뜬 상태에서 **브라우저 콘솔**에서:
```js
const ws = new WebSocket('ws://localhost:3274')
ws.onopen = () => console.log('연결됨')
ws.onmessage = (e) => console.log('수신:', e.data)
```
위를 실행해서 서버 콘솔에 `GUI connected`가 뜨는지 확인하라.

### [단계 2 — 연결] 브로드캐스트 & 메시지 수신 구현

**2-A. 브로드캐스트 구현**

연결된 클라이언트 목록을 `Set<WebSocket>`으로 관리하고,
`broadcast(msg: ServerMessage)` 호출 시 모든 클라이언트에 JSON으로 전송하라.

전송 전 체크:
- `ws.readyState === WebSocket.OPEN` 상태인 클라이언트만
- 전송 실패 시 콘솔 에러 출력 후 계속 진행 (앱이 죽으면 안 됨)

**2-B. 메시지 수신 처리**

클라이언트로부터 메시지가 오면:
1. JSON 파싱 (실패하면 경고 출력 후 무시)
2. `isClientMessage()`로 유효성 검사 (실패하면 경고 출력 후 무시)
3. 등록된 핸들러 호출

**2-C. 콘솔 검증 — 양방향 통신 확인**

브라우저 콘솔에서:
```js
// 서버 → 브라우저 방향 테스트
// (서버 코드 맨 아래에 임시 테스트 코드를 추가해서)
// 서버가 1초마다 broadcast하도록 만들어라
// 브라우저 ws.onmessage에서 수신되는지 확인

// 브라우저 → 서버 방향 테스트
ws.send(JSON.stringify({ type: 'REQUEST_STORES' }))
// 서버 콘솔에 수신 로그가 뜨는지 확인
```

### [단계 3 — 정리] 임시 테스트 코드 제거

검증이 끝난 임시 코드는 삭제하라.
`createZuiServer` 함수와 `ZuiServer` 타입만 export하라.

### 탐구 질문
- `ws.readyState`를 체크해야 하는 이유는?
- `try/catch`로 `JSON.parse`를 감싸야 하는 이유는?
- 싱글턴 변수를 모듈 최상단에 두는 것과 함수 내부에 두는 것의 차이는?

### 학습 키워드
- `ws npm package` WebSocketServer API
- `Set<T>` 자료구조
- `JSON.parse` 예외 처리

### 완료 기준
- [ ] `npx tsx src/server.ts` 실행 시 서버가 3274 포트에서 시작됨
- [ ] 브라우저에서 접속/해제 시 서버 콘솔에 로그 출력
- [ ] 브라우저에서 JSON 전송 → 서버 핸들러 실행 확인
- [ ] 서버에서 broadcast → 브라우저 onmessage 실행 확인
- [ ] `createZuiServer()` 두 번 호출해도 포트 충돌 없음
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 1-3. Store Registry 구현

**파일:** `packages/core/src/registry.ts` (새로 만들기)

### [단계 1 — 콘솔 검증] Registry 자체 동작 확인

**1-A. StoreEntry 타입 정의**

Registry에 등록되는 스토어 항목의 타입:
- 스토어 이름 (문자열)
- 현재 state를 반환하는 함수
- state를 외부에서 덮어쓰는 함수
- 액션 이름 배열

**1-B. CRUD 함수 구현**

```
registerStore(entry: StoreEntry): void
unregisterStore(name: string): void
getRegistry(): Map<string, StoreEntry>
getStore(name: string): StoreEntry | undefined
```

내부 저장소는 `Map<string, StoreEntry>` 사용.

**1-C. 콘솔 검증 — 수동으로 등록/조회 테스트**

임시 테스트 코드를 파일 맨 아래에 작성해서 실행하라:

```ts
// 임시 테스트 — 실행 확인 후 삭제
registerStore({
  name: 'testStore',
  getState: () => ({ count: 0 }),
  setState: (s) => console.log('setState called:', s),
  actions: ['increment', 'decrement']
})

console.log(getStore('testStore'))     // StoreEntry 출력되어야 함
console.log(getStore('nonexistent'))   // undefined 출력되어야 함

unregisterStore('testStore')
console.log(getStore('testStore'))     // undefined 출력되어야 함
```

```bash
npx tsx src/registry.ts
```

### [단계 2 — 연결] 서버와 연동

> **⚠ 이 단계는 Registry와 Server를 한 Node 프로세스 안에서 같이 돌려보는
> "배선 검증용 시뮬레이션"이다.** 실제 앱(과제 1-4)에서는 Registry가 **브라우저**에서
> 돌기 때문에, 서버가 Registry를 직접 순회하는 일은 없다. 진짜 흐름은:
> GUI가 접속 직후 `REQUEST_STORES`를 보냄 → 서버는 이걸 **다른 모든 클라이언트(=App)에게
> 그대로 중계**함 → App이 (서버가 아니라 App 자신이) 자기 로컬 Registry를 순회해서
> `STORE_INIT`들을 자기 WS로 전송 → 서버가 그걸 다시 GUI 쪽으로 중계.
> 즉 서버는 "Registry를 아는 주체"가 아니라 그냥 **메시지를 이어주는 허브**다.
> 이 단계는 그 허브(broadcast)가 제대로 동작하는지만 Node 스크립트로 미리 검증해보는
> 용도이고, 진짜 `REQUEST_STORES` 처리 로직은 과제 1-4 [단계 3]에서 App 쪽에 만든다.

**2-A. broadcast는 "보낸 사람 제외 전체"면 충분하다**

특정 클라이언트 1개만 콕 집어 보내는 기능은 만들지 않는다 — 이미 STORE_INIT을 받은
GUI가 다른 GUI의 재접속으로 인한 STORE_INIT을 한 번 더 받아도(멱등적 업데이트) 문제가
없기 때문에, 과제 1-2의 `broadcast(msg)`(전체 전송)를 그대로 재사용해도 충분하다.
(굳이 "보낸 사람 제외"까지도 필요 없다 — App은 자기가 보낸 STATE_UPDATE를 다시 받아도
자기 자신의 state와 비교해서 무시하면 그만이다. 과잉 설계하지 마라.)

**2-B. 콘솔 검증 — 수동 등록 후 브라우저에서 수신 확인**

서버 파일과 Registry를 연동한 임시 실행 파일을 만들어라:

```ts
// temp-test.ts (검증 후 삭제)
import { createZuiServer } from './server'
import { registerStore } from './registry'

const server = createZuiServer()

// 2초 뒤에 스토어를 수동으로 등록하고
// 브라우저에서 STORE_INIT 메시지가 오는지 확인
setTimeout(() => {
  registerStore({
    name: 'fakeStore',
    getState: () => ({ value: 42, label: 'hello' }),
    setState: (s) => console.log('patch received:', s),
    actions: ['setValue']
  })
  // 이 시점에 브라우저에 STORE_INIT이 도착해야 함
  // (어떻게 브로드캐스트하면 되는가? 직접 생각해봐라)
}, 2000)
```

```bash
npx tsx temp-test.ts
```

브라우저 콘솔에서 `ws.onmessage`에 로그를 달고 수신을 확인하라.

### [단계 3 — 정리] 임시 파일 삭제

`temp-test.ts`와 임시 코드 삭제.
`registerStore`, `unregisterStore`, `getRegistry`, `getStore`만 export.

### 탐구 질문
- `Map`과 `Record<string, T>`의 차이는? Registry에는 왜 Map이 더 적합한가?
- Registry가 Server를 알고, Server도 Registry를 알아야 한다면 순환 의존성이 생긴다. 어떻게 피할 수 있는가?

### 학습 키워드
- `Map<K, V>` vs `Record<K, V>`
- 순환 의존성 (circular dependency) 해결 패턴

### 완료 기준
- [ ] `npx tsx registry.ts` 로 CRUD 테스트 콘솔 출력 확인
- [ ] 브라우저 접속 후 수동 등록된 스토어의 `STORE_INIT` 메시지 수신 확인
- [ ] `REQUEST_STORES` 전송 시 등록된 스토어 목록 수신 확인
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 1-4. ★ Store Observer 구현 (`zui` + `initZui`)

**파일:** `packages/core/src/index.ts` (기존 stub 교체)

이 과제가 이 프로젝트의 핵심이다.

> **설계 확정 — 중앙 등록이 아니라 스토어 파일별 자기 등록.**
> 처음엔 `initZui({ stores: {...} })`처럼 `main.tsx` 한 곳에서 모든 스토어를 몰아서
> 등록하는 방식을 생각했지만, 그러면 스토어가 늘어날 때마다 `main.tsx`를 계속 손대야 하고
> (과제 1-8의 GUI 자동 생성 스토어도 결국 그 파일을 편집해야 해서 위험했다), 무엇보다
> "새 스토어 만들 때마다 잊지 않고 등록하기"를 사람이 계속 기억해야 했다.
>
> 대신 **각 스토어 파일이 자기 자신을 등록**하는 방식으로 간다:
> ```ts
> // stores/counterStore.ts
> export const useCounterStore = create<CounterState>()((set) => ({ ... }))
>
> zui("counterStore", useCounterStore)   // 파일 맨 마지막 줄
> ```
> `main.tsx`는 이 파일들이 로드되게만 해주면 된다 (아래 1-D). `zui()`가 짧고 부르기 쉬운
> 이름인 이유도 여기 있다 — 스토어 파일마다 반복해서 등장하는 호출이라 짧아야 한다.
> `initZui()`는 이제 "스토어 목록"을 몰라도 된다 — WS 연결을 여는 것만 책임진다.

### [단계 1 — 콘솔 검증] `zui()`가 로컬에서 subscribe하는지 확인

**1-A. 타입 정의**

```ts
// packages/core/src/index.ts
import type { StoreApi } from 'zustand'

export type InitZuiOptions = {
  port?: number   // 기본 3274 — 과제 1-6의 zuiPlugin({ port })와 짝을 맞춘다
}
```

`StoreApi`는 zustand가 export하는 스토어 인스턴스 타입이다.
`useCounterStore` 자체가 `StoreApi<T>` 메서드(`getState`, `setState`, `subscribe`)를 직접 가진다 —
별도의 `getStore()` 같은 걸 안 만들어도 된다.

**1-B. `zui(name, store)` 기본 구현 — subscribe만, 아직 전송 없음**

```ts
function zuiImpl<T>(name: string, store: StoreApi<T>): void {
  registerStore({
    name,
    getState: () => store.getState(),
    setState: (patch) => store.setState(patch as Partial<T>, false),
    actions: Object.keys(store.getState() as object)
      .filter((k) => typeof (store.getState() as any)[k] === 'function'),
  })

  store.subscribe((state) => {
    console.log('[Z-UI]', name, '→', state)
  })
}
```

지금 단계에서는 `registerStore`(로컬 Map, 과제 1-3)에만 넣고, 아직 WS로는 아무것도 안 보낸다 —
WS 연결은 `initZui()`가 나중에 열기 때문에, 그 전에 `zui()`가 먼저 호출될 수도 있다는 걸
전제로 설계해야 한다 (1-D에서 이 순서 문제를 다룬다).

**1-C. 콘솔 검증 — 스토어 파일 맨 아래에서 호출**

`examples/basic/src/stores/counterStore.ts` 맨 아래에 추가하라:
```ts
import { zui } from '@z-ui/core'
// ...
zui('counterStore', useCounterStore)
```

`pnpm dev:example` 실행 후 카운터 버튼을 클릭해봐라. 브라우저 콘솔에 아래가 출력되어야 한다:
```
[Z-UI] counterStore → { count: 1, step: 1, ... }
[Z-UI] counterStore → { count: 2, step: 1, ... }
```

**console.log만 동작해도 이 단계는 완료다.**

**1-D. `main.tsx`에서 스토어 파일들이 로드되게 하기 — `import.meta.glob`**

`zui()` 호출은 스토어 파일이 실제로 **import되어 모듈이 실행돼야** 발생한다. 지금은
`counterStore.ts`가 App.tsx에서 이미 `import`되고 있어서 우연히 동작하지만, 원칙적으로는
`main.tsx`가 `src/stores/` 폴더 전체를 한 번에 로드해줘야 한다 (앞으로 만들 스토어까지 자동으로):

```ts
// main.tsx — Z-UI 설정 시 최초 1회만 작성, 이후로는 다시 안 건드림
import.meta.glob('./stores/*.ts', { eager: true })
```

이렇게 해두면 `src/stores/`에 파일이 몇 개가 추가되든 `main.tsx`는 다시 안 건드려도 된다 —
과제 1-8의 GUI 스토어 생성이 훨씬 단순해지는 이유가 이거다.

### [단계 2 — 연결] `initZui()`로 실제 WS 연결 열기

**2-A. 대기열(pending queue) 설계**

문제: `zui()`는 스토어 파일이 로드되는 즉시 실행되는데, `initZui()`가 아직 호출 전이라면
(혹은 WS 연결이 아직 `OPEN` 상태가 아니라면) 이 시점에 전송할 방법이 없다.
**대신 STORE_INIT을 보낼 준비가 된 스토어 이름들을 모듈 레벨 배열에 쌓아두고,**
WS 연결이 열리는 순간 한꺼번에 flush하라.

```ts
let ws: WebSocket | null = null
const pendingInit: string[] = []   // 아직 WS가 안 열려서 STORE_INIT을 못 보낸 스토어 이름들

function sendStoreInit(name: string) {
  const entry = getStore(name)!
  const msg = { type: 'STORE_INIT', storeName: name, state: entry.getState(), actions: entry.actions }
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  } else {
    pendingInit.push(name)   // 나중에 onopen에서 flush
  }
}
```

**2-B. `initZui()` — WS 클라이언트 연결 (⚠ `server.broadcast()`를 직접 호출하지 않는다)**

App은 Node.js 서버(`server.ts`)와 **다른 런타임(브라우저)**에서 돈다. 그래서 서버 객체를
직접 참조할 수 없다 — GUI와 똑같이, **자기만의 WebSocket 클라이언트**를 열어서
`ws.send(...)`로 메시지를 보내야 한다. 브라우저 내장 `WebSocket`이라 `ws` 패키지 import는
필요 없다 (레이어 3의 "browser 번들에 ws 패키지 없음" 원칙이 여기서 지켜진다).

```ts
function initZuiImpl(options: InitZuiOptions = {}): void {
  if (ws) return   // 중복 호출 방지
  const port = options.port ?? 3274
  ws = new WebSocket(`ws://localhost:${port}`)

  ws.onopen = () => {
    // 연결되자마자, 그 사이 zui()로 먼저 등록됐던 스토어들의 STORE_INIT을 한꺼번에 전송
    while (pendingInit.length > 0) sendStoreInit(pendingInit.shift()!)
  }

  ws.onmessage = (e) => {
    // 3단계에서 STATE_PATCH / SNAPSHOT_RESTORE 처리
  }
}

export const initZui = process.env.NODE_ENV !== 'production' ? initZuiImpl : () => {}
```

`zui()`도 이제 `sendStoreInit`을 호출하도록 1-B를 보강하라 — `store.subscribe` 콜백에서도
`ws?.readyState === WebSocket.OPEN`일 때만 `STATE_UPDATE`를 보내라 (연결 전에 바뀐 state는
어차피 다음 STORE_INIT에 최신값으로 실려 나가므로 큐잉할 필요 없다).

**2-C. 콘솔 검증 — WebSocket 메시지 수신 확인**

브라우저를 2개 열어라:

**브라우저 1 (예제 앱):** `http://localhost:5173`

**브라우저 2 (GUI 역할 임시):**
콘솔에서 WebSocket으로 직접 접속:
```js
const ws = new WebSocket('ws://localhost:3274')
ws.onmessage = (e) => console.log(JSON.parse(e.data))
```

브라우저 1을 새로고침하면 브라우저 2 콘솔에 `STORE_INIT`이 3개(각 스토어 파일이 로드되며
자동 `zui()` 호출) 찍혀야 한다. 이어서 브라우저 1에서 카운터를 클릭하면 브라우저 2 콘솔에
`STATE_UPDATE` 메시지가 출력되어야 한다.

이것이 핵심 검증이다. GUI 없이 순수하게 데이터 흐름이 작동하는지 먼저 확인하는 것.

### [단계 3 — 연결] STATE_PATCH & SNAPSHOT_RESTORE 수신

**3-A. STATE_PATCH 처리**

2-B에서 비워뒀던 `ws.onmessage`(App 브라우저 쪽 — Node 서버가 아니다)에서
`STATE_PATCH`를 수신하면:
1. `storeName`으로 Registry(같은 브라우저 런타임의 로컬 Map)에서 스토어 찾기
2. `StoreEntry.setState(msg.patch)` 호출

**무한 루프 문제:**
STATE_PATCH → setState 호출 → subscribe 콜백 실행 → STATE_UPDATE 전송 → GUI가 또 STATE_PATCH 전송 → ...

이 루프를 어떻게 막을 것인가? 스스로 방법을 찾아라.
(힌트: boolean 플래그, 발신자 구분, 메시지 무시 조건 등 여러 방법이 있다)

**3-B. 콘솔 검증**

브라우저 2 콘솔에서 직접 `STATE_PATCH`를 전송하라:
```js
ws.send(JSON.stringify({
  type: 'STATE_PATCH',
  storeName: 'counterStore',
  patch: { count: 999 }
}))
```

브라우저 1의 예제 앱 UI에서 카운터 숫자가 999로 바뀌어야 한다.

**3-C. SNAPSHOT_RESTORE 처리**

STATE_PATCH와 동일한 방식으로 구현하라.
차이점: patch(부분 업데이트)가 아닌 state 전체 교체.

**3-D. REQUEST_STORES 처리 — 진짜 흐름은 여기서 완성된다**

과제 1-3에서 짚었듯, 서버는 Registry를 모른다. GUI가 접속 직후 보내는 `REQUEST_STORES`는
서버를 거쳐 App에게 중계되고, **App의 `ws.onmessage`가 이걸 받아서** 자기 로컬 Registry
(`getRegistry()`)를 순회하며 등록된 스토어마다 `STORE_INIT`을 자기 WS로 전송해야 한다 —
`initZui`가 시작될 때 이미 만들어둔 `sendStoreInit(name)`(2-A)을 그대로 재사용하면 된다.

```ts
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === 'REQUEST_STORES') {
    for (const name of getRegistry().keys()) sendStoreInit(name)
  }
  // ... STATE_PATCH, SNAPSHOT_RESTORE 분기(3-A, 3-C)
}
```

**3-D-2. `STORE_REMOVE` 수신 처리 (과제 1-8과 연동)**

GUI가 스토어 파일을 삭제하면(과제 1-8) 서버가 `STORE_REMOVE`를 broadcast한다. 이건
원래 "App → GUI" 방향으로 정의했던 메시지지만, 서버가 전체 broadcast하는 이상 App
자신도 이걸 받는다 — 그때 자기 로컬 Registry에서 정리하라:

```ts
if (msg.type === 'STORE_REMOVE') {
  unregisterStore(msg.storeName)   // 원래 등록 안 돼 있었으면 그냥 no-op
}
```

`unregisterStore`가 `store.subscribe`의 구독 해제(unsubscribe)까지 정리하는지도 확인하라 —
안 하면 이미 지워진 스토어의 `subscribe` 콜백이 계속 살아서 메모리 누수가 생긴다.

**3-E. 최종 콘솔 검증 시나리오**

아래 시나리오를 순서대로 실행하고, 모두 성공해야 이 과제가 완료된다:

```
1. 브라우저 1(App)이 이미 켜져서 zui() 3개가 등록/연결된 상태에서, 브라우저 2에서 ws 접속 후
   `ws.send(JSON.stringify({ type: 'REQUEST_STORES' }))` 전송 (3-D에서 구현한 처리 확인)
   → 브라우저 2 콘솔에 STORE_INIT 3개 수신 확인

2. 브라우저 1에서 카운터 "+1" 클릭
   → 브라우저 2 콘솔에 STATE_UPDATE 수신

3. 브라우저 2 콘솔에서 STATE_PATCH 전송 (count: 999)
   → 브라우저 1 UI에서 숫자 999로 변경 확인

4. 브라우저 1에서 로그인 버튼 클릭 → 800ms 대기
   → 브라우저 2 콘솔에 두 번의 STATE_UPDATE 수신 확인
     (isLoading: true → user: {...}) 각각

5. 브라우저 2 콘솔에서 SNAPSHOT_RESTORE 전송
   → 브라우저 1 state가 초기값으로 복구 확인
```

### 탐구 질문
- `store.subscribe(listener)`의 `listener`는 어떤 인자를 받는가? (`state`, `prevState` 둘 다인가?)
- subscribe 콜백 안에서 `store.setState()`를 호출하면 무한재귀가 발생하는가? 왜?
- `initZui`를 여러 번 호출하면 어떤 문제가 생기는가? 어떻게 막을 것인가?
- 같은 이름으로 `zui("counterStore", ...)`를 두 번 호출하면(예: HMR로 모듈이 재실행될 때)
  어떤 문제가 생기는가? `registerStore`가 이미 있는 이름을 덮어쓰기만 하면 충분한가,
  아니면 이전 `subscribe`를 정리(unsubscribe)해야 하는가?

### 완료 기준
- [ ] 브라우저 1 클릭 → 브라우저 2 콘솔에 STATE_UPDATE 수신
- [ ] 브라우저 2에서 STATE_PATCH → 브라우저 1 UI 변경
- [ ] `initZui()` 호출 전에 로드된 스토어(`zui()`가 먼저 실행된 경우)도 연결 성립 후
      `pendingInit` flush로 STORE_INIT이 정상 전송됨
- [ ] `REQUEST_STORES` 수신 시 로컬 Registry 전체를 순회해서 STORE_INIT을 재전송함
- [ ] `STORE_REMOVE` 수신 시 로컬 Registry에서 unregister (구독 해제 포함)
- [ ] 위 3-E 시나리오 전체 통과
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 1-5. 진입점 정리 & 빌드

**파일:** `packages/core/src/index.ts`

> **주의:** 이 과제에서 서버(`createZuiServer`)를 자동 시작하는 로직은 만들지 않는다.
> `initZui()`는 과제 1-4에서 확정한 대로 **WS 클라이언트 연결만 여는 함수**다.
> 실제 서버(Node WS 서버) 시작은 전적으로 과제 1-6의 Vite Plugin 책임이다 — 두 책임이
> 섞이면 "서버가 어디서 뜨는지" 헷갈리는 코드가 된다.

### [단계 1] `initZui()` 중복 호출 가드 정리

과제 1-4의 2-B에서 만든 `if (ws) return` 가드가 실제로 동작하는지 명시적으로 검증하라:
`initZui()`를 두 번 호출해도 WebSocket 연결이 하나만 생기는지 콘솔에서 확인
(`new WebSocket(...)`이 두 번 실행되면 안 된다).

### [단계 2] Public API 정리

공개할 것: `zui`, `initZui`, `InitZuiOptions`, `ServerMessage`, `ClientMessage`
숨길 것: `StoreEntry`, `registerStore`/`unregisterStore`/`getRegistry`/`getStore`(Registry 내부 함수),
`ws` 클라이언트 인스턴스, `pendingInit` 큐, `createZuiServer`(이건 `./vite` 서브패스에서만 내부적으로 쓰인다)

### [단계 3] 빌드 확인

```bash
pnpm --filter @z-ui/core build
```

`dist/` 폴더에 파일 3개 생성 확인.

### 완료 기준
- [ ] `zui(name, store)`와 `initZui()`가 `@z-ui/core`에서 export됨
- [ ] `initZui()`를 두 번 호출해도 WebSocket 연결이 하나만 생김
- [ ] `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` 존재
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 1-6. Vite Plugin & 진입점 분리

> 배경 지식 11의 3-레이어 전략을 실제 코드로 구현하는 단계다.
> 이 과제 이후 사용자는 미들웨어 1줄 + Vite 플러그인 1줄만 추가하면 WS 서버가 뜬다.
> GUI는 core dev 서버가 서빙하지 않는다 — `@z-ui/gui`를 `npx z-ui`로 별도 실행한다 (과제 1-7).

**파일:** `packages/core/src/vite.ts` (새로 만들기)

```bash
pnpm --filter @z-ui/core add -D vite
```

### [단계 1] zuiPlugin 구현

**1-A. vite.ts 작성**

```ts
import type { Plugin, ViteDevServer } from 'vite'
import { createZuiServer } from './server'

export function zuiPlugin(): Plugin {
  return {
    name: 'vite-plugin-z-ui',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // WebSocket 서버 시작 — 이게 이 플러그인의 유일한 책임이다
      // 시작 로그(`[Z-UI] Server running on ws://localhost:3274`)는
      // createZuiServer() 내부(과제 1-2)에서 이미 찍는다 — 여기서 중복 출력하지 마라
      createZuiServer()
      console.log(`[Z-UI] GUI를 보려면 별도 터미널에서: npx z-ui`)
    }
  }
}
```

GUI 정적 파일 서빙 미들웨어는 없다. `@z-ui/gui`는 core와 무관한 독립 프로세스이므로,
core의 `vite.ts`는 GUI 번들 경로(`dist/gui`)를 전혀 알 필요가 없다.

**1-B. tsup.config.ts 수정**

```ts
entry: ["src/index.ts", "src/vite.ts"],
external: ["zustand", "vite", "ws"],
```

**1-C. package.json exports 필드 업데이트**

`./vite` 서브패스 추가 (배경 지식 11의 예시 참고).

**1-D. WS 포트를 옵션으로 받기 (놓치기 쉬운 포인트)**

지금까지는 WS 포트가 `3274`로 하드코딩되어 있다. 문제는 배경 지식 1에서
"GUI 하나로 여러 앱을 번갈아 붙여볼 수 있다"고 했는데, **앱을 두 개 동시에 띄우면
둘 다 3274 포트를 차지하려다 `EADDRINUSE` 에러가 난다.** 한 번에 앱 하나만 붙일 거라면
문제 없지만, 여러 앱을 병렬로 실행하는 팀이라면 반드시 필요하다.

```ts
export function zuiPlugin(options?: { port?: number }): Plugin {
  const port = options?.port ?? 3274
  return {
    name: 'vite-plugin-z-ui',
    apply: 'serve',
    configureServer() {
      createZuiServer({ port })
    }
  }
}
```

`createZuiServer`(과제 1-2)도 옵션 인자로 포트를 받을 수 있게 고쳐야 한다.
지금 당장 다중 포트 지원을 완성할 필요는 없지만, **함수 시그니처에 옵션 자리는 미리 열어두는 것**을 권장한다 — 나중에 하드코딩된 포트를 걷어내려면 여러 파일을 다시 손대야 한다.

### [단계 2] 레이어 1 확인 — `zui`/`initZui` NODE_ENV 가드

과제 1-4·1-5에서 이미 `zui`/`initZui`를 삼항 패턴(`process.env.NODE_ENV !== 'production' ? ... : () => {}`)으로
감싸뒀을 것이다. 여기서는 그게 실제로 프로덕션 빌드에서 죽은 코드로 제거되는지 확인만 한다:
`pnpm --filter @z-ui/example-basic build` 결과물(`dist/assets/*.js`)을 열어서
`zuiImpl`/`initZuiImpl` 문자열이 안 보이면 tree-shaking이 제대로 된 것이다.

서버(`createZuiServer`) 시작은 이제 전적으로 이 과제의 Vite Plugin(1-A) 책임이고,
`index.ts`(브라우저 번들) 쪽에는 서버를 시작하는 코드가 아예 없어야 한다.

### [단계 3] examples/basic 검증

`examples/basic/vite.config.ts`에 플러그인 추가:
```ts
import { zuiPlugin } from '@z-ui/core/vite'
plugins: [react(), zuiPlugin()]
```

**검증 시나리오:**
```bash
# dev 모드: 서버 자동 시작 확인
pnpm dev:example
# → 터미널에 [Z-UI] Server running on ws://localhost:3274

# 프로덕션 빌드 모드: 서버 시작 없음 확인
pnpm --filter @z-ui/example-basic build
# → [Z-UI] 관련 로그 없음
```

### 탐구 질문
- `configureServer` 훅과 `buildStart` 훅의 차이는?
- Hot Module Replacement(HMR)로 `vite.ts`가 변경되면 서버가 재시작되는가? 어떻게 막는가?
- `apply: 'serve'` 대신 `apply: (config, env) => env.command === 'serve'`를 쓰면 어떤 이점이 있는가?

### 완료 기준
- [ ] `@z-ui/core/vite` import로 zuiPlugin 사용 가능
- [ ] `vite build` 실행 시 [Z-UI] 서버 시작 로그 없음
- [ ] `vite dev` 실행 시 서버 자동 시작
- [ ] `dist/vite.js`, `dist/vite.cjs` 생성 확인
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 1-7. GUI 독립 실행 CLI (`npx z-ui`)

> `@z-ui/gui`를 앱과 완전히 분리된 프로세스로 실행 가능하게 만드는 과제다.
> 스토리북이 `npx storybook dev`로 뜨는 것과 동일한 모델.
> Phase 3까지는 GUI 화면 자체가 비어 있어도 된다 — 여기서는 "뜨는 것"만 검증한다.

**파일:** `packages/gui/bin/z-ui.js` (새로 만들기)

```bash
pnpm --filter @z-ui/gui add -D vite
```

### [단계 1 — 콘솔 검증] CLI로 정적 서버가 뜨는지 확인

**1-A. bin 스크립트 작성**

```js
#!/usr/bin/env node
// packages/gui/bin/z-ui.js
import { createServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const port = Number(process.env.Z_UI_PORT ?? 4275)

const server = await createServer({
  root: path.resolve(__dirname, '../dist'),
  server: { port, open: true },
})
await server.listen()
console.log(`[Z-UI] GUI → http://localhost:${port}`)
```

개발 초기에는 `dist/`가 비어 있을 수 있다 — 우선 `packages/gui`를 한 번 빌드(`pnpm --filter @z-ui/gui build`)한 뒤 실행해서 정적 파일이 뜨는지만 확인하라. Phase 2~3에서 실제 화면이 채워진다.

**1-B. package.json에 bin 필드 추가**

```json
{
  "name": "@z-ui/gui",
  "bin": {
    "z-ui": "./bin/z-ui.js"
  }
}
```

**1-C. 콘솔 검증 — 로컬 링크로 CLI 실행**

```bash
pnpm --filter @z-ui/gui build
pnpm --filter @z-ui/gui exec z-ui
# → 브라우저가 자동으로 열리고 http://localhost:4275 접속 확인
```

### [단계 2] 포트 충돌 & WS 연결 안내

**2-A. 포트가 이미 쓰이는 경우**

`Z_UI_PORT` 환경변수나 `--port` CLI 인자로 GUI 자체 포트를 바꿀 수 있게 하라 (`process.argv` 파싱).
추가로 `Z_UI_WS_PORT`(또는 `--ws-port`)로 **연결 대상 앱의 WS 포트**도 바꿀 수 있게 하라 —
앱 쪽에서 1-6의 `zuiPlugin({ port })`로 3274가 아닌 다른 포트를 썼다면, GUI도 그 포트로
접속해야 한다. 기본값은 3274.

**2-B. WS 서버가 꺼져 있을 때 안내**

GUI가 뜨자마자 `ws://localhost:3274` 연결을 시도하되, 실패하면 화면에
"Z-UI 서버에 연결할 수 없습니다. 앱의 vite.config.ts에 zuiPlugin()을 추가했는지 확인하세요"
같은 안내를 띄우게 한다 (실제 UI는 Phase 2 과제 2-1에서 구현).

### 탐구 질문
- `npm install -D @z-ui/gui` 후 로컬에서 `npx z-ui`가 동작하려면 `package.json`의 어떤 필드가 필요한가?
- CLI 스크립트 맨 위의 `#!/usr/bin/env node`는 왜 필요한가?
- GUI가 앱과 다른 포트를 쓰기 때문에 생기는 CORS 문제는 없는가? (WebSocket과 HTTP CORS의 차이를 생각해봐라)

### 학습 키워드
- `package.json bin field`
- `npx` 동작 원리
- `Node.js CLI shebang`

### 완료 기준
- [ ] `pnpm --filter @z-ui/gui exec z-ui` 실행 시 브라우저가 자동으로 열림
- [ ] GUI가 앱의 dev 서버(5173)와 무관하게 독립적으로 뜨고 닫힘
- [ ] 포트를 환경변수/인자로 바꿀 수 있음
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 1-8. 스토어 보일러플레이트 생성/삭제 (파일시스템 조작)

> **스코프 결정:** 컴포넌트 트리 연동(GUI에서 만든 스토어를 자동으로 어떤 컴포넌트에 연결)은
> 하지 않는다. GUI는 파일을 "만들어주기"만 하고, 그 파일을 어디서 `import`해서 쓸지는
> 개발자가 직접 코드에서 정한다. GUI는 스토어 중심(store-centric)으로만 개입한다.
>
> GUI(브라우저, 4275)는 파일시스템에 접근할 수 없다. 실제 파일 쓰기/삭제는 항상
> **core의 Vite 플러그인(Node.js 컨텍스트)**이 대신 수행하고, GUI는 WS로 요청만 보낸다.

**파일:** `packages/core/src/scaffold.ts` (새로 만들기)

### [단계 1 — 콘솔 검증] 템플릿 생성 함수 단독 테스트

**1-A. 스토어 템플릿 함수 작성**

```ts
function generateStoreTemplate(name: string, fields: { name: string; type: string }[]): string {
  // "userStore" → export const useUserStore = create<UserState>()((set) => ({ ... }))
  // 반환값은 파일에 그대로 쓸 수 있는 완성된 .ts 소스 문자열
}
```

`npx tsx`로 직접 실행해서 콘솔에 생성된 문자열을 눈으로 확인하라 (아직 파일 쓰기 없음).

**1-B. 파일 경로 규칙 정하기**

`src/stores/{storeName}.ts` 고정 규칙으로 할지, 사용자가 프로젝트 루트를 설정하게 할지 정하라.
1차는 고정 규칙(`process.cwd()/src/stores/`)으로 단순하게 간다.

### [단계 2 — 연결] SCAFFOLD_STORE / DELETE_STORE 메시지 처리

**2-A. 파일 생성 — 이제 다른 파일은 전혀 건드리지 않는다**

과제 1-4에서 등록 방식이 "`main.tsx`에 중앙 등록" → "**스토어 파일이 자기 자신을 등록**"으로
바뀌면서, 이 과제도 훨씬 단순해졌다. `main.tsx`는 이미 `import.meta.glob('./stores/*.ts')`로
`src/stores/` 폴더 전체를 로드하고 있으므로(과제 1-4 1-D), **새 파일을 그 폴더 안에 만들기만
하면 자동으로 로드된다.** 다른 파일을 편집할 필요가 아예 없다.

서버가 `SCAFFOLD_STORE` 메시지를 받으면:
1. 같은 이름의 파일이 이미 있으면 거부하고 GUI에 실패 응답(위에서 추가한 상황 4 메시지) 전송
2. `generateStoreTemplate`으로 소스 생성 — `register === true`면 템플릿 맨 마지막 줄에
   `zui('{name}', use{Name}Store, { color: '{color}' });` 한 줄을 더 붙인다. 모달의 색상
   라디오는 항상 기본 선택값(앰버)을 갖고 있으므로 `color`는 항상 채워져서 전달된다.
   `register === false`면 그 줄 없이 생성한다.
3. `fs.writeFileSync`로 **새 파일 하나만** 쓴다
4. 성공 응답 전송

```ts
function generateStoreTemplate(name, fields, register, color = 'amber') {
  const body = `...zustand create() 코드...`
  if (!register) return body
  return `${body}\n\nzui('${name}', use${capitalize(name)}Store, { color: '${color}' });\n`
}
```

> `color` 옵션 자체를 생략하고 `zui(name, store)`만 호출하는 경우(코드에서 직접 미들웨어를
> 붙이면서 `color`를 안 넘긴 경우)의 기본값 처리는 GUI가 아니라 `zui()` 미들웨어 쪽 책임이다
> — 옵션에 `color`가 없으면 미들웨어 내부에서 메인 컬러(앰버)로 폴백한다.

> **기본 원칙 — 파일을 만든다고 저절로 GUI 목록에 뜨지 않는다.**
> `register: false`(체크 해제)면 파일에 `zui(...)` 줄이 없으니 당연히 GUI에 안 나타난다.
> `register: true`(기본값)면 파일 안에 이미 `zui(...)`가 포함되어 있고, `import.meta.glob`이
> 이 파일을 인식하는 순간 스스로 등록된다 — **다른 파일을 편집할 필요가 없으므로 지난번에
> 걱정했던 "main.tsx 텍스트 삽입이 실패할 수 있다"는 리스크 자체가 사라졌다.**
> 다만 `import.meta.glob('./stores/*.ts', { eager: true })`처럼 **새 파일이 glob 매칭 대상에
> 추가되는 경우**, Vite가 부분 HMR이 아니라 **탭 전체를 리로드**할 수 있다(glob 결과 자체가
> 정적 import 그래프의 일부라 갈아끼우기가 아니라 통째로 다시 계산해야 하기 때문 — 정확한
> 동작은 탐구 질문에서 직접 확인). 리로드가 일어나면 App의 다른 스토어 state는 초기화된다 —
> 큰 문제는 아니지만, "즉시 반영"을 "값 보존한 채 조용히 patch"로 오해하지 않게 완료 기준을
> 확인할 때 브라우저 탭이 실제로 새로고침되는지도 관찰하라.

**2-B. 파일 삭제 — 안전장치 필수**

> **⚠ 여기서 `unregisterStore()`를 직접 호출하면 또 같은 런타임 버그가 난다.**
> `scaffold.ts`는 Node 프로세스(Vite 플러그인 안)에서 돈다. 반면 Registry는 **브라우저**
> (App 탭)에 있다 — 과제 1-3/1-4에서 이미 짚은 바로 그 구분이다. Node 쪽 서버가
> "이 스토어가 지금 Registry에 있는지 없는지"조차 알 방법이 없다 (서버는 그냥 메시지
> 중계 허브다). 그래서 서버는 **등록 여부를 확인하려 들지 말고**, 파일을 옮긴 뒤
> `STORE_REMOVE`를 무조건 broadcast하기만 한다. 실제 등록 해제(`unregisterStore`)는
> **App의 `ws.onmessage`가 이 broadcast를 받아서 자기 로컬 Registry에 직접** 한다
> (아래 3번, 과제 1-4에 새 case 추가 필요). 등록 안 된 상태에서 받아도 그냥 no-op이라
> 안전하다.

서버가 `DELETE_STORE` 메시지를 받으면:
1. **즉시 삭제하지 않는다.** 파일을 지우는 대신 `.zui-trash/` 같은 임시 폴더로 이동(rename)하라.
   되돌릴 수 없는 삭제는 만들지 마라 — 실수로 지운 스토어 하나가 앱을 통째로 깨뜨릴 수 있다.
2. 파일 이동 후 **조건 없이** `STORE_REMOVE`를 broadcast하라 (서버는 등록 여부를 모른다).
3. **App 쪽에 새로 추가할 것** — 과제 1-4의 `ws.onmessage`에 `STORE_REMOVE` case를 추가해서
   `unregisterStore(msg.storeName)`을 호출하게 하라. 파일이 지워졌는데도 코드가 여전히
   그 파일을 `import`하고 있다면(스토어가 아직 컴포넌트에서 쓰이는 중이었다면) Vite가
   빌드 에러를 띄우게 된다 — 이건 막을 수 없는 정상적인 신호다("네가 아직 쓰고 있는
   스토어를 지웠다"는 걸 알려주는 것). GUI에도 "코드에서 해당 스토어의 import를 정리해야
   할 수 있습니다" 안내를 함께 보내라.

**2-C. 콘솔 검증**

GUI 대신 브라우저 콘솔에서 직접 WS로 `SCAFFOLD_STORE`를 보내고,
`packages/core`가 아니라 **`examples/basic/src/stores/`에 실제 파일이 생기는지** 확인하라.
HMR이 반응해서 Vite가 새 파일을 인식하는지도 확인.

### 탐구 질문
- 파일 쓰기 요청이 프로젝트 루트 바깥 경로(`../../etc/passwd` 같은)를 가리키면 어떻게 막을 것인가?
- `.zui-trash/`를 `.gitignore`에 안내해야 하는 이유는?
- 템플릿 생성 시 이미 쓰이고 있는 스토어 이름과 겹치면 어떻게 감지할 것인가?
- `import.meta.glob('./stores/*.ts', { eager: true })`는 언제 새로 추가된 파일을 인식하는가?
  (힌트: Vite dev 서버가 떠 있는 상태에서 새 파일이 생기면 HMR이 glob 결과를 다시 계산해야 한다 —
  이게 자동으로 되는지, 혹은 뭔가 트리거가 필요한지 Vite 문서에서 확인하라)

### 학습 키워드
- `fs.writeFileSync` vs `fs.renameSync`
- Path traversal 방지 (`path.resolve` + 접두사 검증)
- `import.meta.glob` HMR 동작 방식

### 완료 기준
- [ ] SCAFFOLD_STORE 요청 시 `src/stores/`에 실제 `.ts` 파일 생성 확인
- [ ] 이미 존재하는 이름으로 재요청 시 거부 + 실패 응답 메시지 수신 확인
- [ ] `register: true`로 요청 시 생성된 파일 안에 `zui(...)` 호출이 포함되고, HMR로
      GUI 목록에 곧바로 나타남 (다른 파일은 전혀 수정되지 않음)
- [ ] `register: false`로 요청 시 `zui(...)` 없는 파일만 생성되고 GUI 목록에는 안 나타남
- [ ] DELETE_STORE 요청 시 파일이 즉시 삭제되지 않고 `.zui-trash/`로 이동함
- [ ] 서버는 등록 여부를 확인하지 않고 파일 이동 후 무조건 `STORE_REMOVE`를 broadcast함
- [ ] (App 쪽, 과제 1-4 3-D-2 확인) 등록되어 있던 스토어면 App이 자기 로컬 `unregisterStore`로
      정리하고, GUI 목록에서도 즉시 사라짐
- [ ] 프로젝트 루트 바깥 경로 요청이 차단됨
- [ ] `tsc --noEmit` 에러 없음

---

---

# Phase 2. GUI — 기본 통신 & CRUD

> **목표: 콘솔 검증 → 기본 CRUD UI. React Flow, 노드, 그래프 없음.**
> 데이터가 흐르는 걸 콘솔에서 먼저 눈으로 확인하고, 최소한의 UI를 붙여라.
> 디자인은 신경 쓰지 않는다. 기능이 동작하는 것이 기준이다.
> 시각화 GUI(노드/그래프)는 Phase 3에서 별도로 다룬다.

---

## 과제 2-1. GUI 앱 기본 세팅 & WebSocket 클라이언트 훅

**파일:** `packages/gui/src/hooks/useZuiSocket.ts` (새로 만들기)

### [단계 1 — 콘솔 검증] 연결 & 메시지 수신 확인

**1-A. 연결 상태 타입 정의**

연결 상태를 문자열 리터럴 유니온으로:
- 연결 중 / 연결됨 / 연결 해제됨 / 에러

**1-B. useZuiSocket 기본 구현**

`useEffect` 안에서 WebSocket 생성.
각 이벤트 핸들러 (`onopen`, `onclose`, `onerror`, `onmessage`) 연결.

> **놓치기 쉬운 필수 단계 — `onopen`에서 `REQUEST_STORES` 전송.**
> App은 GUI가 연결되기 전에 이미 자기 스토어들을 등록(`zui()`)하고 `STORE_INIT`을
> 한 번 보냈을 수 있다(과제 1-4). GUI가 그 뒤에 늦게 연결되면 그 최초 방송은 놓친
> 것이다 — WS는 방송 당시 연결되어 있던 클라이언트에게만 전달되고, 서버가 과거 메시지를
> 저장해뒀다가 다시 보내주지 않는다. 그래서 GUI는 **연결될 때마다(재연결 포함)**
> `ws.send(JSON.stringify({ type: 'REQUEST_STORES' }))`를 스스로 보내야 한다 — 이게
> 과제 1-4 3-D에서 App 쪽에 구현해둔 `REQUEST_STORES` 핸들러를 트리거해서 현재 등록된
> 스토어 전체를 다시 받아오는 유일한 방법이다.
> ```ts
> ws.onopen = () => {
>   setStatus('연결됨')
>   ws.send(JSON.stringify({ type: 'REQUEST_STORES' }))
> }
> ```

**1-C. 콘솔 검증 — App.tsx에서 로그로만 확인**

GUI 앱을 최소한으로 실행해서 훅이 동작하는지 확인하라.

`App.tsx`를 임시로 이렇게 만들어라:
```tsx
function App() {
  const { status, send } = useZuiSocket()
  console.log('연결 상태:', status)
  return <div>Z-UI</div>
}
```

`pnpm dev:all` 실행 후:
- 브라우저 콘솔에 연결 상태 변화가 출력되는지 확인
- 예제 앱에서 카운터를 클릭하면 콘솔에 메시지 수신 로그가 찍히는지 확인

이때 메시지를 화면에 표시하려 하지 마라. 콘솔 출력만.

### [단계 2 — 연결] 재연결 로직 & GUI 스토어 연동

**2-A. 재연결 로직**

서버가 꺼져 있을 때 3초마다 재연결 시도.
`setTimeout` + cleanup에 `clearTimeout`.

**2-B. onmessage → GUI 스토어로 전달**

수신한 `ServerMessage`를 어떻게 처리할 것인가?
과제 2-2에서 만들 `useZuiStore`와 연동해야 한다.

두 가지 방법 중 하나를 선택하라:
- 훅이 `onMessage` 콜백 prop을 받는 방식
- 훅 내부에서 직접 zuiStore 액션 호출하는 방식

### 탐구 질문
- `useRef`로 WebSocket을 보관하는 이유는? `useState`에 넣으면 어떤 문제가 생기는가?
- `useEffect`의 cleanup을 빠뜨리면 Hot Reload 시 어떤 문제가 생기는가?

### 완료 기준
- [ ] 브라우저 콘솔에 연결 상태 변화 로그 확인
- [ ] 예제 앱을 먼저 켠 뒤(스토어 등록 완료 상태) GUI를 나중에 열어도, `onopen`의
      `REQUEST_STORES` 덕분에 콘솔에 STORE_INIT 3개가 찍힘 (놓치지 않음)
- [ ] 예제 앱 클릭 시 GUI 콘솔에 STATE_UPDATE 로그 확인
- [ ] 서버 껐다 켰을 때 자동 재연결 + 재연결마다 STORE_INIT 재수신 확인
- [ ] 컴포넌트 재렌더링 시 콘솔에 에러 없음

---

## 과제 2-2. GUI 내부 Zustand 스토어

**파일:** `packages/gui/src/store/zuiStore.ts` (새로 만들기)

### [단계 1 — 콘솔 검증] 스토어 데이터 관리 확인

**1-A. 타입 먼저 설계**

```
StoreSnapshot: 스토어 이름, 현재 state, 액션 이름 배열
SnapshotRecord: 저장 ID, 저장 시각, 레이블, { 스토어이름: state } 전체
ZuiState: stores(목록), selectedStore(이름), snapshots(히스토리)
ZuiActions: upsertStore, removeStore, selectStore, saveSnapshot, deleteSnapshot
```

**1-B. 스토어 구현**

`create<ZuiState & ZuiActions>()`로 구현.

`upsertStore(name, state, actions)`:
- 이미 있으면 state만 갱신
- 없으면 새로 추가

**1-C. 콘솔 검증 — React DevTools로 확인**

`App.tsx`를 임시로 수정:
```tsx
function App() {
  const { status } = useZuiSocket()
  const stores = useZuiStore((s) => s.stores)
  console.log('등록된 스토어:', Object.keys(stores))
  return <div>스토어 {Object.keys(stores).length}개</div>
}
```

`pnpm dev:all` 실행 후:
- 페이지에 "스토어 3개"가 표시되는지 확인
- React DevTools에서 `zuiStore`의 상태가 변화하는지 확인
- 예제 앱 클릭 시 zuiStore의 해당 스토어 state가 갱신되는지 확인

### [단계 2 — 연결] 서버 메시지와 연동

`useZuiSocket`의 onmessage에서 받은 메시지를 zuiStore 액션과 연결하라:
- `STORE_INIT` → `upsertStore`
- `STATE_UPDATE` → `upsertStore` (state 갱신)
- `STORE_REMOVE` → `removeStore`

### 완료 기준
- [ ] GUI 실행 시 콘솔에 스토어 3개 이름 출력
- [ ] 예제 앱 클릭 시 React DevTools의 zuiStore state 변화 확인
- [ ] `tsc --noEmit` 에러 없음

---

## 과제 2-3. 기본 CRUD 패널

**파일:** `packages/gui/src/components/StorePanel.tsx` (새로 만들기)

> React Flow, 노드, 그래프 없음.
> 스토어 목록 클릭 → JSON 표시 → 값 수정 → STATE_PATCH 전송. 이것만.
> 디자인은 나중이다. 기능이 동작하면 완료다.

### [단계 1 — 콘솔 검증] 데이터 흐름 확인

StorePanel을 만들기 전에 데이터를 콘솔에서 먼저 확인하라.

`App.tsx`에 임시로 추가:
```tsx
const stores = useZuiStore((s) => s.stores)
const selectedStore = useZuiStore((s) => s.selectedStore)
const selected = selectedStore ? stores[selectedStore] : null

console.log('등록된 스토어 이름:', Object.keys(stores))
console.log('선택된 스토어 state:', selected?.state)
```

예제 앱에서 버튼을 클릭할 때마다 콘솔에 변경된 state가 출력되는지 확인하라.
이게 되면 UI를 붙여라.

### [단계 2 — UI] StorePanel 구현

**요구사항 (디자인 무관, 기능만):**

```
[ counterStore ] [ authStore ] [ themeStore ]   ← 스토어 이름 버튼 목록

선택된 스토어: counterStore
─────────────────────────
{
  "count": 3,      [수정]
  "step": 1        [수정]
}
                   [초기화]
```

구현할 것:
1. 스토어 이름 버튼 목록 → 클릭 시 `selectStore(name)` 호출
2. 선택된 스토어의 state를 `JSON.stringify`로 출력 (함수 필드 제외)
3. 각 primitive 필드 옆 수정 버튼 → 클릭 시 input 노출 → Enter 시 STATE_PATCH 전송
4. 초기화 버튼 → SNAPSHOT_RESTORE 전송 (스토어의 `STORE_INIT` 수신 시점 state)

**함수 필드 제거 replacer:**
```ts
JSON.stringify(state, (key, val) => typeof val === 'function' ? undefined : val, 2)
```

**STATE_PATCH 전송:**
```ts
send({ type: 'STATE_PATCH', storeName, patch: { [key]: parsedValue } })
```

원래 타입을 보존해서 전송하라 (number이면 `Number(input)`, boolean이면 `input === 'true'`).

**2-B. 콘솔 검증 — WebSocket 프레임 확인**

값을 수정한 후 브라우저 DevTools → Network → WS 탭에서
STATE_PATCH 프레임이 전송되는지 확인하라.
예제 앱 UI에서 값이 바뀌는지도 확인.

### [단계 3] 연결 상태 표시

`App.tsx` 최상단에 연결 상태만 표시하라 (단순 텍스트로):
```tsx
<p>상태: {status} | 스토어: {Object.keys(stores).length}개</p>
```

### 완료 기준
- [ ] 스토어 이름 목록이 화면에 표시됨
- [ ] 스토어 선택 시 state JSON 표시 (함수 필드 없음)
- [ ] 값 수정 → STATE_PATCH 전송 → 예제 앱 UI 변경 확인
- [ ] 초기화 → SNAPSHOT_RESTORE 전송 → state 복구 확인
- [ ] 예제 앱 버튼 클릭 시 GUI state 실시간 갱신

---

## 과제 2-4. 스토어 생성/삭제 UI

> 과제 1-8에서 만든 `SCAFFOLD_STORE` / `DELETE_STORE` 서버 로직을 GUI에 연결한다.
> 컴포넌트 트리 연동 없이, 순수하게 "파일 생성/삭제 요청 보내기" UI만 만든다.

**파일:** `packages/gui/src/components/StoreCreateForm.tsx` (새로 만들기)

### [단계 1 — UI] 생성 폼

- 스토어 이름 입력 (예: `productStore`)
- 필드 추가 버튼 — 필드명 + 타입(string/number/boolean) 반복 입력
- **색상 선택 라디오 버튼** — 고정 팔레트(blue/green/amber/purple) 중 하나를 선택. 기본값은
  메인 컬러와 같은 amber에 체크되어 있고, 사용자가 다른 색을 직접 고르면 그 값으로 바뀐다.
  값이 `SCAFFOLD_STORE`의 `color` 필드로 전송됨
- **"Z-UI에 등록" 체크박스 (기본값: 체크됨)** — 값이 `SCAFFOLD_STORE`의 `register` 필드로 그대로 전송됨
- "생성" 클릭 시 `SCAFFOLD_STORE` 메시지 전송

체크박스는 왜 필요한가: 아직 GUI에 노출하고 싶지 않은 초안 스토어를 만들 때(민감한 상태,
아직 로직이 안 끝난 스토어 등) 체크를 풀면 파일만 생기고 앱에는 연결되지 않는다.

### [단계 2 — 콘솔 검증] 파일 생성 & 자동 등록 확인

**체크박스 켠 상태**로 스토어 하나를 만들어보고:
- `examples/basic/src/stores/`에 실제 파일이 생기고, 그 파일 맨 마지막 줄에 `zui(...)` 호출이
  포함되어 있는지 (다른 파일은 전혀 안 바뀜 — `main.tsx`도 그대로다)
- `import.meta.glob`이 새 파일을 자동으로 집어서 Vite HMR로 GUI 목록에 새 스토어가 바로 뜨는지

**체크박스 끈 상태**로도 하나 만들어보고:
- 파일은 생기지만 `zui(...)` 호출이 없는지
- GUI 목록에는 안 뜨는지 (당연한 결과지만, 실제로 안 뜨는 걸 직접 확인하라)

GUI 화면에는 결과에 맞는 안내를 표시하라 — 등록됨이면 "생성 및 등록 완료",
미등록이면 "파일 생성됨 — GUI에는 아직 안 보입니다. 파일 끝에 zui(...)를 추가하면 등록됩니다".

### [단계 3 — UI] 삭제 확인 다이얼로그

삭제 버튼 클릭 시 **바로 지우지 않고** 확인 다이얼로그를 띄운다:
```
"productStore를 삭제하시겠습니까? (.zui-trash로 이동되며, 복구 가능합니다)"
```
확인 시에만 `DELETE_STORE` 전송.

### 완료 기준
- [ ] 색상 라디오 버튼이 amber 기본값으로 선택된 채 렌더링됨, 직접 선택 시 그 값으로 전송됨
- [ ] "Z-UI에 등록" 체크박스가 기본 체크된 상태로 렌더링됨
- [ ] 체크 상태로 생성 → 파일에 `zui(...)` 포함 + GUI 목록에 즉시 반영 (다른 파일 변경 없음)
- [ ] 체크 해제 상태로 생성 → `zui(...)` 없는 파일만 생성, GUI 목록에 안 뜸
- [ ] 이미 존재하는 이름 입력 시 에러 메시지 표시
- [ ] 삭제 시 확인 다이얼로그 없이는 삭제되지 않음
- [ ] 삭제된 스토어가 `.zui-trash/`에서 확인됨
- [ ] 등록되어 있던 스토어를 삭제하면 GUI 목록에서 즉시 사라짐 (STORE_REMOVE 수신)

---

## 과제 2-5. E2E 최종 검증

아래 시나리오를 순서대로 실행하라. 모두 통과해야 Phase 2 완료다.

```
시나리오 1: 초기 연결
  1. pnpm dev:all 실행
  2. 예제 앱(5173)과 GUI(5274, 독립 프로세스)를 나란히 열기
     [배포판에서는 GUI를 npx z-ui로 실행 — 앱 포트와 무관한 별도 서버]
  3. GUI에 "스토어 3개" 표시 확인
  4. 브라우저 DevTools WS 탭에서 STORE_INIT 3개 수신 확인

시나리오 2: 앱 → GUI 실시간 동기화
  1. 예제 앱에서 카운터 "+1" 버튼 5번 클릭
  2. GUI의 counterStore state에서 count가 5로 변경 확인

시나리오 3: GUI → 앱 방향 수정
  1. GUI에서 counterStore 선택
  2. count 값을 100으로 수정 후 Enter
  3. 예제 앱 UI에서 카운터가 100으로 변경 확인

시나리오 4: 비동기 상태 추적
  1. 예제 앱에서 로그인 버튼 클릭
  2. GUI에서 authStore의 isLoading이 true → false로 바뀌는 것 확인
  3. GUI에서 authStore의 user가 null → 객체로 바뀌는 것 확인

시나리오 5: 무한 루프 없음 확인
  1. GUI에서 값 수정 → 예제 앱에 반영
  2. GUI로 STATE_UPDATE가 다시 돌아오지 않는지 WS 탭에서 확인
```

### 완료 기준
- [ ] 위 시나리오 5가지 모두 통과

---

---

# Phase 3. GUI 시각화

> Phase 2에서 기능이 모두 동작하는 것을 확인한 뒤 시작하라.
> 이 Phase는 같은 데이터를 더 잘 보여주는 것이 목표다.
> 기능을 추가하는 게 아니라 표현 방식을 바꾸는 것이다.
>
> **v1 스코프:** 스토어 노드를 나란히 배치하는 것까지만 한다. 노드 사이 연결선(엣지)은
> 그리지 않는다 — 지금까지의 실제 사용 패턴(`userStore`, `cartStore`처럼 서로 독립적인
> 단일 스토어)에서는 의존성 관계 자체가 없는 경우가 대부분이라, 억지로 엣지를 그리면
> 오히려 장식에 가깝다. 엣지는 Phase 4-3에서 "필요하면" 수동 태깅 방식으로 다룬다.

---

## 과제 3-1. React Flow 캔버스

**파일:** `packages/gui/src/components/Canvas.tsx` (새로 만들기)

```bash
pnpm --filter @z-ui/gui add @xyflow/react
```

### [단계 1 — 콘솔 검증] 노드 데이터 변환 확인

UI 없이 변환 로직만 먼저 작성하고 콘솔에서 확인하라:

```tsx
const stores = useZuiStore((s) => s.stores)
const nodes = useMemo(() => {
  return Object.entries(stores).map(([name, info], idx) => ({
    id: name,
    position: { x: idx * 250, y: 100 },
    data: { label: name, state: info.state, actions: info.actions }
  }))
}, [stores])
console.log('노드 변환 결과:', nodes)
```

콘솔에 노드 3개가 올바른 형태로 출력되는지 먼저 확인하라.

### [단계 2 — UI] React Flow 렌더링

**2-A. 기본 캔버스**

공식 문서의 기본 예제를 참고해서 빈 캔버스를 렌더링하라.
노드 1개가 고정값으로 표시되는 것부터 시작해라.

**2-B. 변환된 노드 연결**

`useNodesState`를 활용하되, zuiStore가 바뀔 때 노드도 바뀌게 하라.

**2-C. 커스텀 노드 컴포넌트**

기본 노드 대신 커스텀 노드 컴포넌트를 만들어라.

보여줄 것:
- 스토어 이름 (헤더)
- state의 비함수 필드 최대 3개 (초과 시 "외 N개" 표시)
- 하단에 "액션 N개"

`nodeTypes`는 반드시 컴포넌트 밖(모듈 최상단)에 정의하라. 이유를 찾아봐라.

**2-D. 노드 클릭 이벤트**

노드 클릭 시 `selectStore(name)` 호출 → Phase 2의 StorePanel과 연동.

### 완료 기준
- [ ] 캔버스에 스토어 노드 3개가 보임
- [ ] 예제 앱 클릭 시 노드 내 값이 실시간으로 바뀜
- [ ] 노드 드래그 이동 가능
- [ ] 노드 클릭 시 StorePanel에 해당 스토어 state 표시

---

## 과제 3-2. 레이아웃 재조립

**파일:** `packages/gui/src/App.tsx`, `packages/gui/src/components/Header.tsx`

Phase 2의 StorePanel 위치를 Inspector로 옮기고 Canvas를 메인으로 배치하라.

```
Header (48px)
──────────────────────────────────────
Canvas (flex: 1)  │ Inspector (320px)
                  │ (Phase 2의 StorePanel 재사용)
```

### 완료 기준
- [ ] 전체 레이아웃 렌더링
- [ ] Phase 2의 E2E 시나리오 5가지 여전히 통과

---

---

# Phase 4. 고급 기능

> 이 Phase부터는 힌트가 절반이다. 스스로 콘솔 검증부터 시작해라.

---

## 과제 4-1. Snapshot / Time-travel

### [단계 1 — 콘솔 검증]
스냅샷 저장 버튼을 누르면 콘솔에 현재 모든 스토어 state가 출력되게 먼저 만들어라.
콘솔 출력이 올바르면 그때 실제 저장 로직을 붙여라.

### [단계 2 — 연결]
저장된 스냅샷을 복구하면 WebSocket으로 각 스토어에 `SNAPSHOT_RESTORE` 전송.
브라우저 2 콘솔에서 메시지가 수신되는지 먼저 확인하라.

### [단계 3 — UI]
저장된 스냅샷 목록 표시 및 클릭으로 복구.

### 완료 기준
- [ ] 저장 → 상태 변경 → 복구 시나리오 통과
- [ ] 여러 스냅샷 독립적 복구 가능

---

## 과제 4-2. Action Log 타임라인

### [단계 1 — 콘솔 검증]
`STATE_UPDATE`가 올 때마다 `console.log`로 `{ store, action, before, after }` 출력.
콘솔에서 diff가 올바르게 보이면 UI를 붙여라.

### [단계 2 — UI]
최신이 위에 오는 목록. 각 항목에 diff 표시.

### [단계 3 — 연결]
항목 클릭 시 해당 시점 state로 복구.

### 완료 기준
- [ ] 버튼 클릭마다 로그 항목 추가, diff 표시
- [ ] 항목 클릭 시 복구
- [ ] 50개 초과 시 자동 삭제

---

## 과제 4-3. (선택 도전) 스토어 간 의존성 엣지

> 자동 정적 분석(소스 코드를 파싱해서 어떤 스토어가 어떤 스토어를 import/참조하는지 추론)은
> 하지 않는다 — AST 분석까지 들어가면 난이도가 확 뛰고, 대부분의 사용자는 애초에
> `userStore`, `cartStore`처럼 스토어를 독립적으로 쓴다 (Phase 3 참고). 그런 소수의
> 상호참조 케이스를 위해 정적 분석기를 만드는 건 배보다 배꼽이 크다.

힌트 없음. 스스로 설계해라.
**목표:** 스토어 A의 변화가 스토어 B를 변경시키는 관계를, **사용자가 GUI에서 수동으로
태깅**하면 React Flow 엣지로 시각화되게 하라. (예: "이 스토어는 저 스토어를 참조한다"를
드롭다운으로 직접 선택 → 엣지 생성. 자동 추론이 아니라 수동 주석에 가깝다.)

---

---

# Phase 5. 배포

---

## 과제 5-1. 빌드 & 타입 검증

```bash
pnpm typecheck
pnpm build
```

`dist/index.d.ts`를 열어서 공개 API가 올바른지 직접 확인하라.

새 폴더에서 `file:` 경로로 설치해서 외부 동작 테스트:
```bash
npm install file:../Z-UI/packages/core
```

### 완료 기준
- [ ] typecheck 통과, dist 파일 3개 생성
- [ ] 외부 프로젝트에서 타입 자동완성 동작

---

## 과제 5-2. README & npm 배포

- `packages/core/README.md` 작성 (설치법, 예제 코드, API 문서)
- 버전 0.1.0으로 변경
- `npm publish`

### 완료 기준
- [ ] npmjs.com에서 패키지 확인 가능
- [ ] `npm install @z-ui/core` 후 import 동작

---

---

# 진행 체크리스트

```
Phase 0 — Zustand 이해
  □ 0-1. vanilla.ts / react.ts / middleware.ts 소스 직접 읽기
  □ 0-2. 미들웨어 타입 이해 + logger 미들웨어 미니 실습

Phase 1 — Core (기능 우선, 콘솔 검증)
  □ 1-1. 메시지 프로토콜
        □ ServerMessage (4가지 — STORE_INIT/STATE_UPDATE/STORE_REMOVE/SCAFFOLD 결과)
        □ ClientMessage (5가지 — STATE_PATCH/SNAPSHOT_RESTORE/REQUEST_STORES/SCAFFOLD_STORE/DELETE_STORE)
        □ 타입 가드 함수
  □ 1-2. WebSocket 서버
        □ [콘솔] 서버 단독 실행, 브라우저 접속 확인
        □ [연결] broadcast & 수신 처리
        □ [정리] 임시 코드 제거
  □ 1-3. Store Registry
        □ [콘솔] CRUD 단독 테스트
        □ [연결] 서버 연동, 브라우저에서 STORE_INIT 수신
  □ 1-4. ★ Store Observer (zui + initZui, 스토어별 자기 등록)
        □ [콘솔] zui(name, store) → subscribe & console.log 확인
        □ [연결] import.meta.glob으로 main.tsx가 stores/ 폴더 전체 로드
        □ [연결] initZui() → 브라우저 네이티브 WebSocket 클라이언트 연결 (server.broadcast 직접 호출 금지)
        □ [연결] pendingInit 큐 → WS OPEN 시 flush
        □ [연결] REQUEST_STORES 수신 → 로컬 Registry 순회해서 STORE_INIT 재전송
        □ [연결] STORE_REMOVE 수신 → 로컬 unregisterStore (구독 해제 포함)
        □ [연결] STATE_PATCH/SNAPSHOT_RESTORE 수신 → 예제 앱 UI 변경
        □ [검증] 3-E 시나리오 전체 통과
  □ 1-5. 진입점 정리 & 빌드 (zui/initZui export, 서버 자동시작 로직 없음)
  □ 1-6. Vite Plugin & 진입점 분리 (dev-only 3레이어, WS 서버만 시작)
        □ zuiPlugin 구현 (apply: 'serve')
        □ zuiPlugin({ port }) 옵션 자리 마련 (다중 앱 포트 충돌 대비)
        □ initZui NODE_ENV 가드 (production → noop)
        □ exports 서브패스 ./vite 추가
        □ vite build에서 서버 미시작 확인
  □ 1-7. GUI 독립 실행 CLI (npx z-ui)
        □ bin/z-ui.js 작성 + package.json bin 필드
        □ [콘솔] CLI 실행 시 브라우저 자동 오픈 확인
        □ GUI 자체 포트 + 연결 대상 WS 포트 둘 다 환경변수/인자로 변경 가능
  □ 1-8. 스토어 보일러플레이트 생성/삭제 (파일시스템, 다른 파일 편집 없음)
        □ [콘솔] 템플릿 생성 함수 단독 확인
        □ [연결] SCAFFOLD_STORE → 새 파일 생성 (register:true면 파일 끝에 zui(...) 포함)
        □ [안전장치] DELETE_STORE → 즉시 삭제 대신 .zui-trash로 이동, 서버는 무조건 STORE_REMOVE
          broadcast (등록 여부 확인 안 함), App이 자기 로컬 unregister (과제 1-4 3-D-2)

Phase 2 — GUI 기본 통신 & CRUD (React Flow 없음)
  □ 2-1. WS 클라이언트 훅
        □ [콘솔] 연결 상태 & 메시지 수신 로그 확인
        □ [연결] onopen마다 REQUEST_STORES 전송 (늦게 연결해도 기존 스토어 목록 수신)
        □ [연결] 재연결 + 스토어 연동
  □ 2-2. GUI 내부 스토어
        □ [콘솔] 스토어 목록 & React DevTools 확인
        □ [연결] 메시지 → 스토어 액션 연결
  □ 2-3. 기본 CRUD 패널
        □ [콘솔] 데이터 흐름 확인
        □ [UI] 스토어 목록, JSON 표시, 값 수정, 초기화
        □ STATE_PATCH 전송 → 예제 앱 UI 변경 확인
        □ SNAPSHOT_RESTORE → state 복구 확인
  □ 2-4. 스토어 생성/삭제 UI
        □ 생성 폼 + "Z-UI에 등록" 체크박스(기본 체크) → SCAFFOLD_STORE
        □ 체크 시 파일에 zui(...) 포함 → HMR로 GUI 목록 반영 / 체크 해제 시 zui() 없이 파일만 생성
        □ 삭제 확인 다이얼로그 → DELETE_STORE
  □ 2-5. E2E 시나리오 5가지 통과

Phase 3 — GUI 시각화 (React Flow, v1은 노드만·엣지 없음)
  □ 3-1. React Flow 캔버스
        □ [콘솔] nodes 변환 결과 콘솔 확인
        □ [UI] 노드 렌더링, 커스텀 노드, 클릭 이벤트
  □ 3-2. 레이아웃 재조립 (Canvas + Inspector + Header)

Phase 4 — 고급
  □ 4-1. Snapshot / Time-travel
  □ 4-2. Action Log 타임라인
  □ 4-3. (선택) 스토어 간 의존성 엣지 — 자동 추론 아님, 수동 태깅

Phase 5 — 배포
  □ 5-1. 빌드 & 외부 테스트
  □ 5-2. README + npm 배포
```

---

> **막혔을 때 순서:**
> 1. 에러 메시지 전체를 읽어라 (첫 줄만 읽지 말 것)
> 2. 더 작게 쪼개라 — 50줄 단위로 실험해라
> 3. 콘솔 검증 단계로 돌아가라 — UI를 먼저 만들려고 해서 막힌 경우가 많다
> 4. 공식 문서의 실제 소스 파일에서 유사한 패턴을 찾아라

---

---

# UI 목업 & 시나리오 설계

> 이 섹션은 코드가 아니라 **컨셉/UI 문서**다. 유저가 Z-UI를 처음 켜서 쓰기 시작하는 순간부터
> 시간 순서대로 마주치는 화면을 정의한다. 각 화면은 `[UI 이미지 N]` 자리표시자 → 기능 설명
> 순서로 배치되어 있고, 실제 이미지는 아래 "이미지 생성 프롬프트" 섹션의 같은 번호를
> AI 이미지 생성 도구에 넣어서 만든 뒤 자리표시자를 교체하면 된다.
>
> **디자인 톤 (전 화면 공통):** 다크 네이비 배경, 모노스페이스 폰트 포인트(개발자 도구 느낌).
> **메인 UI 컬러는 Zustand 브랜드 아이덴티티에 맞춘 앰버 오렌지 계열**로 통일한다.
> 아래 "컬러 시스템"에서 배경/강조/텍스트 팔레트와 적용 규칙을 상세히 정의한다.

---

## 컬러 시스템 — 다크 네이비 × 엠버 오렌지

> 완전한 블랙(`#000000`)이 아니라 네이비가 한 방울 섞인 배경 위에 앰버를 올려야
> 오렌지가 고급스럽게 살아난다. 아래 팔레트를 Z-UI GUI 전체의 단일 기준으로 삼는다.

### 1. 배경 (Backgrounds)

| 용도 | 색상 | 비고 |
|------|------|------|
| 메인 배경 (App Background) | `#0B0F19` | 가장 깊고 어두운 딥 네이비 |
| 카드/컴포넌트 배경 (Surface/Card) | `#161D30` | 노드 카드, Inspector 패널, 상단 Header |
| 호버/선택 배경 (Hover State) | `#1E2942` | 리스트 아이템·버튼 호버, 그래프 격자선 |

### 2. 강조색 (Brand & Accent) — 핵심 포인트

| 용도 | 색상 | 사용처 |
|------|------|--------|
| Primary (기본 강조) | `#FF9F43` (Vibrant Amber) | 핵심 CTA 버튼("생성", "저장"), 로고, 활성 토글/라디오, 알림 배지 |
| Gradient Link (그라데이션용) | `#E67E22` (Terracotta) | 메인 버튼 그라데이션(`#FF9F43` → `#E67E22`)으로 깊이감 표현 |
| Subtle Accent (은은한 강조) | `#D4A373` (Muted Sand) | 탭 언더라인, 태그 배경, 가벼운 테두리 강조 |

### 3. 전경색 및 텍스트 (Typography)

| 용도 | 색상 |
|------|------|
| 헤드라인/메인 텍스트 | `#F8FAFC` (크림 화이트) |
| 본문/서브 텍스트 | `#94A3B8` (슬레이트 그레이) |
| 비활성/힌트 텍스트 | `#475569` |

### 적용 규칙 — 오렌지는 10%만

다크 모드에서 밝은 오렌지를 남발하면 눈이 쉽게 피로해진다. 화면의 90%는 네이비와
차분한 텍스트로 채우고, 시선이 가야 하는 딱 10% 영역에만 앰버를 쓴다.

**버튼**: 화면당 채워진(solid) CTA는 하나만 두고("생성", "연결" 같은 핵심 액션),
나머지는 아웃라인으로 처리한다.

```
/* 채워진 메인 버튼 */
className="bg-gradient-to-r from-[#FF9F43] to-[#E67E22] text-white"

/* 아웃라인 서브 버튼 */
className="border border-[#D4A373]/30 text-[#FF9F43] hover:bg-[#FF9F43]/10"
```

**상태 인디케이터**: 값이 실시간으로 바뀔 때 텍스트 전체를 오렌지로 물들이지 않는다.
텍스트는 화이트(`#F8FAFC`)로 두고, 앞에 `#FF9F43` 색상의 작은 점(dot)이 깜빡이는
애니메이션만 추가한다 — Inspector 패널의 하이라이트 펄스(위 시나리오 4번)도 이 원칙을 따른다.

**그래프/코드 블록**: 격자선(grid)·가이드라인은 `#1E2942`로 아주 흐리게 처리하고,
현재 선택된 데이터 라인/포인트만 `#FF9F43`으로 하이라이트한다.

### 스토어별 색상은 별개 레이어

메인 UI 컬러(앰버 계열)와 별개로, 캔버스에 스토어가 여러 개 떠 있을 때 어떤 노드가
어떤 스토어인지 구분하기 위한 팔레트가 따로 있다. 이름별로 자동 고정되는 매핑이 아니라,
스토어를 만들 때 개발자가 정해진 팔레트(blue/green/amber/purple) 중에서 직접 고르는
방식이다. `zui()` 옵션 객체에 `color`를 지정하면 그 색을 쓰고(`zui(name, store,
{ color: 'blue' })` 형태), **지정하지 않으면 메인 컬러와 같은 앰버가 기본값**이 된다.

`examples/basic`의 `counterStore`가 블루, `authStore`가 그린인 것도 이름에 따라
자동으로 정해진 게 아니라, 예제를 만들 때 개발자가 그렇게 `color`를 지정해둔
것일 뿐이다.

GUI의 "+ 새 스토어" 모달에도 같은 팔레트를 라디오 버튼으로 노출해서, 코드를 직접
안 건드려도 생성 시점에 색을 고를 수 있게 한다. 기본 선택값은 앰버고, 사용자가
다른 스와치를 고르면 그 값이 생성되는 `zui(...)` 호출의 `color` 옵션으로 들어간다.

---

## 시나리오 흐름

### 1. GUI 실행 직후 — 연결 대기 화면

`[UI 이미지 1]`

사용자가 별도 터미널에서 `npx z-ui`를 실행하면 브라우저가 자동으로 열리며 이 화면이 뜬다.
아직 WS 연결(`ws://localhost:3274`)이 확립되기 전이거나, 앱 쪽 `zuiPlugin()`이 아직 안 켜져 있는
상태를 위한 화면이다. 화면 중앙에 연결 상태 텍스트("Z-UI 서버에 연결 중...")와 스피너만 있고,
캔버스는 비어 있다. 3초 재시도 로직(과제 2-1)이 뒤에서 계속 돌고 있다는 걸 하단에 작은
텍스트로 안내한다("3초마다 재연결 시도 중"). 앱의 `vite.config.ts`에 `zuiPlugin()`을 추가했는지
확인하라는 문구도 함께 보여준다 — 이 화면에서 막히는 사용자가 가장 먼저 보게 될 안내이기
때문에, 원인(플러그인 미설치/앱 미실행)을 명확히 짚어줘야 한다.

---

### 2. 연결 성공 — 메인 캔버스 (스토어 노드 그래프)

`[UI 이미지 2]`

WS 연결이 열리고 `REQUEST_STORES` → `STORE_INIT` 응답을 받으면 이 화면으로 전환된다.
상단 Header(48px)에 연결 상태 뱃지("● 연결됨")와 스토어 개수("3개")가 표시되고, 그 아래
전체 화면을 채우는 Canvas(React Flow)에 등록된 스토어들이 카드형 노드로 나란히 배치된다.
각 노드는: 스토어 이름(헤더, 색상 코딩됨) / state의 비함수 필드 최대 3개 미리보기 / 하단에
"액션 N개" 뱃지로 구성된다 (과제 3-1). v1 스코프이므로 노드 사이 연결선(엣지)은 없다 — 노드들은
서로 독립적으로 캔버스 위에 흩어져 있고, 사용자가 자유롭게 드래그해서 재배치할 수 있다.
우측 상단에 "+ 새 스토어" 버튼이 떠 있다.

---

### 3. 노드 클릭 → Inspector 패널

`[UI 이미지 3]`

캔버스에서 스토어 노드 하나(예: `counterStore`)를 클릭하면 화면 우측에 320px 너비의
Inspector 패널이 슬라이드인 된다. 레이아웃은 `Canvas(flex:1) | Inspector(320px)` (과제 3-2).
Inspector 상단에 스토어 이름과 색상 뱃지, 그 아래 state 전체가 JSON 트리 형태로 펼쳐진다.
필드마다 연필 아이콘을 붙여 인라인으로 수정하는 방식 대신, 상단에 편집 버튼 하나를 두고
클릭 시 모달이 뜨는 방식으로 바꿨다 — 모달 안에서 state 전체를 한 번에 고쳐서 저장하면
`STATE_PATCH`가 전송된다(과제 2-3). 편집 버튼 옆에는 스토어 삭제 버튼도 함께 둔다. 함수
필드(액션)는 JSON에 안 보이고 대신 패널 맨 아래 "액션" 섹션에 실행 가능한 버튼 목록으로
따로 노출된다. 패널 하단에는 "초기화" 버튼(스토어를 `STORE_INIT` 수신 시점 state로 되돌림)이 있다.

---

### 4. 실시간 양방향 동기화 시연 (앱 ↔ GUI)

`[UI 이미지 4]`

브라우저 창 두 개를 나란히 띄운 구도 — 왼쪽은 `examples/basic` 예제 앱(사용자가 "+1" 버튼을
누르는 모습), 오른쪽은 방금 3번 화면에서 열어둔 Z-UI GUI. 왼쪽에서 버튼을 누르는 순간
오른쪽 Inspector의 `count` 값이 실시간으로 갱신되며, 값이 바뀐 필드에 짧은 하이라이트
펄스 애니메이션(테두리가 스토어 색상으로 잠깐 빛나는 효과)이 들어간다. 이 화면은 기능
스크린샷이라기보다는 "이 도구가 하는 일"을 한 장으로 설명하는 **컨셉 다이어그램**에 가깝다 —
두 창 사이에 작은 화살표 아이콘과 "WebSocket" 라벨을 넣어서 데이터가 어떻게 오가는지
시각적으로 짚어준다.

---

### 5. 새 스토어 생성 — 모달 폼

`[UI 이미지 5]`

캔버스의 "+ 새 스토어" 버튼을 누르면 뜨는 모달(과제 2-4). 구성 요소: 스토어 이름 입력
(placeholder: `productStore`), 필드 추가 영역(필드명 + 타입 드롭다운(string/number/boolean)을
한 행으로, "+ 필드 추가" 버튼으로 행을 늘림), **색상 선택 라디오 버튼**(팔레트 색상 스와치를
가로로 나열, 기본값은 메인 컬러와 같은 amber에 체크), 그리고 하단에 **"Z-UI에 등록"
체크박스(기본 체크됨)** — 이 체크박스 옆에 작은 도움말 텍스트("체크 해제 시 파일만 생성되고
GUI에는 안 뜹니다")를 함께 배치해서 무엇을 토글하는지 헷갈리지 않게 한다. 모달 하단에
"취소" / "생성" 버튼.

---

### 6. 생성 결과 & 삭제 확인

`[UI 이미지 6]`

한 화면에 두 상태를 나란히 보여주는 비교 컷. **왼쪽**: 방금 생성한 `productStore` 노드가
캔버스에 새로 나타난 순간 — 다른 노드와 구분되게 테두리에 잠깐 "new" 글로우 효과가 있고,
상단에 토스트 메시지("productStore 생성 및 등록 완료")가 뜬다. **오른쪽**: 노드 우클릭(또는
호버 시 나타나는 휴지통 아이콘) → 삭제 확인 다이얼로그("productStore를 삭제하시겠습니까?
.zui-trash로 이동되며, 복구 가능합니다" + 취소/삭제 버튼, 과제 2-4 단계3). 두 상태를 나란히
둠으로써 "생성도 삭제도 즉시 되돌릴 수 있고 안전하다"는 메시지를 한 장으로 전달한다.

---

### 7. 액션 로그 & 스냅샷 (고급 기능)

`[UI 이미지 7]`

Inspector 패널 아래쪽에 탭으로 전환되는 두 번째 패널(과제 4-1, 4-2). **액션 로그 탭**: 최신
항목이 위로 오는 타임라인 리스트, 각 행에 `[storeName] actionName · 12:03:41` 형태의 라벨과
before/after 값 diff가 초록/빨강으로 표시됨, 항목 클릭 시 그 시점 state로 즉시 복구. **스냅샷
탭**: 사용자가 "스냅샷 저장" 버튼으로 저장해둔 지점들이 카드 목록으로 표시되고("저장됨 —
로그인 전", "12:01"), 카드 클릭 시 전체 앱 state가 그 시점으로 복구된다. 두 탭 모두 시간여행
디버깅이라는 공통 주제를 다루므로, 탭 UI로 하나의 패널 안에 묶어서 화면 공간을 아끼는
레이아웃으로 표현한다.

---

## 이미지 생성 프롬프트

> AI 이미지 생성 도구(Midjourney, DALL·E, Stable Diffusion 등)에 아래 프롬프트를 그대로 넣어서
> 사용한다. 이미지 생성 모델은 대체로 영어 프롬프트에서 더 정확한 결과를 내므로 프롬프트
> 본문은 영어로 작성했다. 번호는 위 "시나리오 흐름" 절의 화면 번호와 1:1로 대응한다.
> 공통 지시어(스타일/톤)를 매 프롬프트 끝에 반복해서, 7장이 같은 디자인 시스템처럼
> 보이게 했다.

**공통 스타일 지시어** (모든 프롬프트 끝에 붙어 있음):
```
UI mockup, dark mode developer tool aesthetic similar to Linear/Vercel/Figma,
flat design, no skeuomorphism, monospace accent font for code/data, generous
whitespace, subtle rounded corners (6-8px radius), soft drop shadows only on
floating panels/modals, dark navy background #0d1117 to #1a2332, warm amber
(#FF9F43) accent color for buttons/badges/focus rings, clean vector illustration
style, high detail UI, 16:10 aspect ratio, no photorealistic elements, no people
```

### 1. 연결 대기 화면
```
A dark-themed desktop app UI mockup showing a "connecting" state screen for a
developer tool called Z-UI. Center of the screen: a minimal spinner/loading
animation in warm amber (#FF9F43), below it the text "Z-UI 서버에 연결 중..." in a
monospace font. Below that, smaller gray text reading "3초마다 재연결 시도 중".
Near the bottom, a subtle warning/info box with an icon suggesting to check
"vite.config.ts"의 zuiPlugin() 설정을 확인하세요. The rest of the screen is
empty/dark canvas with a faint grid dot pattern background, conveying "waiting,
nothing connected yet". Top-left shows a small disabled/greyed-out logo mark
labeled "Z-UI".
[공통 스타일 지시어 추가]
```

### 2. 메인 캔버스 (스토어 노드 그래프)
```
A dark-themed developer tool dashboard UI mockup. Top: a thin 48px header bar
with a small logo "Z-UI" on the left, a green connection status dot with text
"연결됨" and "3개" store count badge on the right. Below the header: a large
canvas area filling the rest of the screen, dotted grid background, containing
three separate rounded rectangle node cards spaced apart horizontally, NOT
connected by any lines/edges. Node 1 labeled "counterStore" with a blue
(#4f6ef7) header stripe, showing two preview fields "count: 3" and "step: 1"
in monospace, and a small pill badge "액션 4개" at the bottom. Node 2 labeled
"authStore" with a green (#22c55e) header stripe, showing "user: null" and
"isLoading: false". Node 3 labeled "cartStore" with an amber (#f59e0b) header
stripe, showing "items: 2" and "total: 45000". Top-right corner of the screen:
a small floating button "+ 새 스토어".
[공통 스타일 지시어 추가]
```

### 3. Inspector 패널 (노드 상세)
```
A dark-themed developer tool UI mockup showing a two-panel layout: left side
(70% width) is a canvas with store node cards (blurred/dimmed, out of focus,
same node cards as previous screen), right side (30% width, 320px) is a sharp,
in-focus sliding inspector panel with a subtle left border and drop shadow.
Inspector panel top: store name "counterStore" with a blue color badge. Below:
a JSON tree view in monospace font showing "count: 3" and "step: 1", each line
with a small pencil/edit icon on the right that on hover turns into a text
input field. Below the JSON tree, a divider, then an "액션" section header
with rounded pill-shaped buttons "increment", "decrement", "reset", "setStep".
At the very bottom of the panel, a full-width outlined button "초기화".
[공통 스타일 지시어 추가]
```

### 4. 앱 ↔ GUI 실시간 동기화 컨셉 다이어그램
```
A conceptual split-screen diagram mockup, two browser window frames side by
side. Left browser window: a simple example web app with a card titled
"counterStore" showing a large number "5" and a blue button labeled "+1" with
a subtle click/press visual effect. Right browser window: the Z-UI GUI showing
the same "counterStore" inspector panel with "count: 5" highlighted with a
glowing blue pulse border effect, indicating it just updated live. Between the
two browser windows, a small curved arrow icon with the label "WebSocket" in
monospace font, indicating real-time bidirectional data flow. Both browser
windows have minimal flat browser chrome (just a thin top bar with three dots,
no realistic OS chrome).
[공통 스타일 지시어 추가]
```

### 5. 새 스토어 생성 모달
```
A dark-themed UI mockup of a centered modal dialog overlaying a dimmed
blurred background (the node canvas from screen 2, blurred and darkened).
Modal card, rounded corners, contains: a title "새 스토어 생성", a text input
field labeled "스토어 이름" with placeholder text "productStore" in gray, below
it a "필드" section with one example row showing a text input for field name
and a dropdown showing "string" with options number/boolean implied, and a
small "+ 필드 추가" ghost button below the row. Below that, a "색상" section
with a row of small circular radio swatches (blue #4f6ef7, green #22c55e,
amber #FF9F43, purple #a855f7) laid out horizontally, the amber swatch shown
selected by default with a ring around it. Below that, a checkbox that is
CHECKED, labeled "Z-UI에 등록" in bold, with smaller gray helper text below it
reading "체크 해제 시 파일만 생성되고 GUI에는 안 뜹니다". At the bottom right of
the modal, two buttons: a ghost "취소" button and a solid amber (#FF9F43)
"생성" button matching the app's main accent color.
[공통 스타일 지시어 추가]
```

### 6. 생성 결과 토스트 & 삭제 확인 다이얼로그 (좌우 비교 컷)
```
A single wide image split into two halves by a thin vertical divider line,
each half showing a different dark-themed UI state, both using the same node
canvas background. LEFT HALF: the node canvas with a newly appeared amber
(#f59e0b) node card labeled "productStore", with a soft glowing outline
animation effect around it suggesting it just appeared, and a small toast
notification sliding in from the top reading "productStore 생성 및 등록 완료"
with a checkmark icon. RIGHT HALF: the node canvas with one node slightly
dimmed/hovered showing a small trash-can icon overlay in its corner, and in
front of it a centered confirmation dialog box with a warning icon, title
"productStore를 삭제하시겠습니까?", body text ".zui-trash로 이동되며, 복구
가능합니다", and two buttons "취소" (ghost) and "삭제" (solid red/danger).
[공통 스타일 지시어 추가]
```

### 7. 액션 로그 & 스냅샷 탭 패널
```
A dark-themed UI mockup of the inspector panel's lower half, showing a
tabbed sub-panel. Two tabs at the top of this sub-panel: "액션 로그" (active/
selected, underlined) and "스냅샷" (inactive, grayed). Below the tabs, a
scrollable timeline list, newest item on top, each row showing monospace text
like "[counterStore] increment · 12:03:41" with a small green "+1" diff badge
and a small red "-0" style diff notation next to it in a compact format.
Rows have a subtle hover highlight. In a secondary smaller inset preview
(showing what the "스냅샷" tab would look like), rounded card chips are shown
in a horizontal scroll row, each chip labeled with a snapshot name like
"로그인 전" and a timestamp "12:01", with a small bookmark/flag icon.
[공통 스타일 지시어 추가]
```