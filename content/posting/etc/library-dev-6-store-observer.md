---
title: "라이브러리 개발기 (6)"
date: "2026-07-24"
description: "Store Observer 구현과 진입점 정리, Vite Plugin, CLI까지 이어진 삽질 기록"
tags: ["library", "zustand", "websocket", "vite", "cli"]
thumbnail: "/assets/thumbnails/etc/zui.png"
---

이전 글에서 protocol, server, registry를 각각 따로 떼어 테스트했고, 이번엔 이 셋을 실제로 이어붙일 차례다.

`index.ts`(브라우저 진입점)와 `zui()`/`initZui()`를 구현하는 게 이번 구현의 핵심이다. 

<br/>

## 도입

첫 구상은 단순했다. 

`main.tsx`에서 앱에 있는 모든 스토어를 한곳에 모아 등록하는 방식이었다.

```ts
initZui({ stores: [useCounterStore, useUserStore] });
```

그런데 이렇게 하면 스토어가 하나 늘 때마다 `main.tsx`를 계속 수정하거나 저장하며 건드려야 한다.

스토어 파일과 등록 파일이 물리적으로 떨어져 있으니, 스토어를 지워도 등록 목록에서 빼먹는 실수가 생길 수밖에 없는 구조였다.

그래서 방향을 바꿨다. 

스토어 파일 자기 자신이 바로 등록하게 하는 방식이다.

개발자 DX를 고려하고자 했고, 저렇게 생성할 때 코드 한 줄로만 넘겨 설정하는게 편하다고 판단했다.

```ts
export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  step: 1,
  increment: () => set((s) => ({ count: s.count + s.step })),
  // ...
}));

zui("counterStore", useCounterStore);
```

스토어를 만든 직후 같은 파일에서 `zui(GUI 표시 커스텀 이름, store)`를 한 줄 호출해주는 것만으로 등록이 끝난다.

그리고 앱 진입점에서는 각 스토어 파일이 이 `zui()` 호출까지 실행되도록, `import.meta.glob`으로 스토어 폴더를 통째로 eager import 해준다.

```ts
import.meta.glob("./stores/*.ts", { eager: true });

initZui();
```

> **eager import란?**
>
> `import.meta.glob`은 Vite가 제공하는 기능으로, 패턴에 맞는 파일들을 한 번에 찾아서 import해준다. 기본값은 `{ eager: false }`인데, 이때는 각 파일이 실제로 `import()`(동적 import)로 lazy하게 나중에 로드되는 함수 형태로 반환된다. 즉 코드만 있고, 그 파일이 실제로 실행되는 시점은 따로 호출해야 한다.
>
> `{ eager: true }`를 주면 이 동작이 바뀐다. 빌드/실행 시점에 매칭된 파일들을 전부 즉시(eager) `import`문으로 바꿔서, 앱이 뜨는 순간 해당 모듈들이 전부 실행되게 만든다.
>
> 여기서는 스토어 파일 내용 자체(`useCounterStore`, `useUserStore` 등)가 필요한 게 아니라, 그 파일이 로드되면서 안에 있는 `zui(...)` 호출이 실행되는 것만 필요하다. 그래서 반환값은 쓰지 않고 `import.meta.glob(...)`만 호출해서, 스토어 폴더 안의 모든 파일을 강제로 즉시 로드시키는 용도로 썼다.

`main.tsx`가 개별 스토어를 일일이 알 필요 없이, 폴더 안에 스토어 파일을 추가하기만 하면 자동으로 등록되는 구조다. 

스토어를 지우면 등록도 자동으로 같이 사라진다. 

등록 목록을 별도로 관리할 필요가 없어진다.


<br/>

## 무한 루프와 `isApplyingRemoteUpdate`

GUI에서 `SET_STATE`를 보내면 앱의 zustand store가 업데이트되는데, zustand의 `subscribe`는 `setState`와 동기적으로 실행된다. 

그러니 GUI가 보낸 값으로 `setState`를 호출하면, 그 즉시 subscribe 콜백이 실행되고, 거기서 다시 "state가 바뀌었다"며 GUI로 `STORE_UPDATE`를 보내버린다. GUI는 그걸 받고 또 `SET_STATE`를 보내고... 이게 뺑뺑 돈다.

해결은 플래그 하나였다.

```ts
let isApplyingRemoteUpdate = false;

// GUI로부터 SET_STATE를 받았을 때
isApplyingRemoteUpdate = true;
store.setState(newState);
isApplyingRemoteUpdate = false;

// subscribe 콜백 안에서
store.subscribe((state) => {
  if (isApplyingRemoteUpdate) return;
  sendStoreUpdate(state);
});
```

subscribe가 setState와 동기 실행된다는 전제가 있었기에 이 플래그 하나로 충분했다. 만약 비동기로 실행됐다면 플래그를 리셋하는 타이밍을 따로 잡아야 했을 것이다.

<br/>

## RESTORE_SNAPSHOT이 액션 함수를 통째로 날린 사고

이번 글에서 제일 아찔했던 버그다. 

`RESTORE_SNAPSHOT`은 스토어를 특정 시점의 state로 되돌리는 시간여행 기능인데, 처음엔 그냥 `setState(snapshot)`으로 통째로 갈아끼웠다.

그냥 덮어씌우기만 하면 되돌려지는 개념으로 안일했다.

counter state 객체 안에는 `increment`, `setStep` 같은 액션 함수도 같이 있었다. 

GUI에서 넘어오는 스냅샷은 JSON으로 직렬화된 데이터라 함수가 포함되지 않았다..

통째로 갈아끼우는 순간 액션 함수들이 전부 사라지고, 이후 버튼을 눌러도 아무 반응이 없는 상태로 앱이 먹통이 됐다.

해결 방법은 함수 타입 필드만 골라서 기존 state에서 보존하는 방식으로 했다. 

`SET_STATE`(부분 병합)와 `RESTORE_SNAPSHOT`(전체 교체)를 같은 함수 하나로 처리하되, `replace`라는 이름의 플래그로 분기했다.

```ts
const patch = replace
  ? {
      ...Object.fromEntries(
        Object.entries(storeEntry.getState() as object).filter(
          ([, value]) => typeof value === "function",
        ),
      ),
      ...(newState as object),
    }
  : newState;

isApplyingRemoteUpdate = true;
storeEntry.setState(patch, replace);
isApplyingRemoteUpdate = false;
```

`replace`가 켜진 경우(`RESTORE_SNAPSHOT`)에만 기존 state에서 함수인 필드를 `Object.entries`/`Object.fromEntries`로 골라내고, 그 위에 새로 들어온 값을 덮어써서 `patch`를 만든다. 

`SET_STATE`처럼 `replace`가 없는 경우엔 보존 작업 없이 그대로 넘긴다.

<br/>

## HMR로 재등록될 때 리스너가 쌓이는 버그

개발 중 파일을 저장하면 HMR이 스토어 모듈을 다시 실행하는데, 이때 같은 이름의 스토어가 또 등록됐다. 

문제는 기존에 걸어둔 subscribe의 unsubscribe를 호출하지 않고 그냥 새로 등록해버린 것이었다.
(zustand의 subscribe는 내부 구현 주석에 subscribe를 반환하면 unsubscribe를 얻을 수 있음이 명시돼있다.)

VSCode IDE에서 소스 저장할 때마다 리스너가 하나씩 계속 쌓였고, 나중엔 state 하나 바뀔 때마다 같은 `STORE_UPDATE`가 몇 번씩 중복으로 나가는 걸 보고서야 알아챘다.



```ts
// 수정 전
function registerStore(entry: StoreEntry): void {
  registry.set(entry.name, entry);
}
```

registry에 이미 같은 이름의 엔트리가 있으면 그 unsubscribe부터 호출하고 새로 등록하도록 고쳤다.

```ts
// 수정 후
function registerStore(entry: StoreEntry): void {
  const existing = registry.get(entry.name);
  if (existing) existing.unsubscribe();

  registry.set(entry.name, entry);
}
```


<br/>

## Vite Plugin과 진입점 분리

relay 로직 위치를 다시 정리한 뒤, `zuiPlugin()`을 작성했다.

```ts
// packages/core/src/vite.ts
export const zuiPlugin = (options?: { port?: number; logLevel?: LogLevel }): Plugin => {
  return {
    name: "vite-plugin-zui",
    apply: "serve",
    configureServer() {
      createZuiServer(options);
    },
  };
};
```

`configureServer` 안에서 `createZuiServer()`를 호출하는 게 끝이다.

개발 서버가 뜰 때 WS 서버를 하나 띄워주는 역할만 한다.

이 플러그인을 코어 패키지와 분리된 진입점으로 빼내기 위해, `tsup` 설정에 entry를 하나 더 추가했다.

```ts
export default defineConfig({
  entry: ["src/index.ts", "src/vite.ts"],
  format: ["esm", "cjs"],
  dts: true,
});
```

그리고 `package.json`의 `exports`에도 `./vite` 서브패스를 추가해서, 사용하는 쪽에서 `@z-ui/core/vite`로 따로 import할 수 있게 했다.

```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./vite": {
      "types": "./dist/vite.d.ts",
      "import": "./dist/vite.js",
      "require": "./dist/vite.cjs"
    }
  }
}
```

이렇게 나눠두면 앱 쪽 `vite.config.ts`에서는 이렇게만 쓰면 된다.

```ts
import { zuiPlugin } from "@z-ui/core/vite";

export default defineConfig({
  plugins: [zuiPlugin()],
});
```

로드맵에는 없었지만 겸사겸사 손댄 것도 있다. 

로그가 react의 vite 서버와 뒤섞여 나오는 게 불편해서 `picocolors`로 로그에 색을 입히고, silent/info/verbose 로그 레벨 시스템을 추가했다.

개발자는 이 단계를 설정해서 로그를 토글하여 숨길 수 있다.

Vite의 `bindCLIShortcuts`로 단축키도 넣어보려 했는데, 이미 Vite 자체가 등록해둔 리스너와 겹쳐서 이중으로 등록될 위험이 있다는 걸 알고는 그냥 건들지 않기로 했다.

개발 도움 툴이 본래의 개발 환경을 해치면 안되는 것을 원칙으로 삼았다.

<br/>

## GUI 독립 실행 CLI (`npx z-ui`)

마지막으로 `packages/gui/bin/z-ui.js`를 작성하고 `package.json`에 `bin` 필드를 추가해서, GUI를 별도 명령어로 띄울 수 있게 만들었다.

```jsonc
{
  "bin": { "z-ui": "./bin/z-ui.js" }
}
```

```js
#!/usr/bin/env node

import { createServer } from "vite";

const port = parsePort("--port", "Z_UI_PORT", 4275);
const wsPort = parsePort("--ws-port", "Z_UI_WS_PORT", 3274);

const server = await createServer({
  root: path.resolve(__dirname, "../dist"),
  server: { port, open: true },
});

await server.listen();
console.log(`[Z-UI] GUI → http://localhost:${port} (target WS port: ${wsPort})`);
```

이렇게 만들어두면 사용자는 별도 설치 없이 이렇게 실행할 수 있다.

```bash
npx z-ui
npx z-ui --port 5000 --ws-port 4000
```

포트와 WS 포트를 파싱하는 부분은 처음엔 각각 따로 인라인으로 짜여 있었는데, `parsePort` 헬퍼 함수로 뽑아내서 깔끔하게 재사용하도록 리팩토링했다.

```js
const parsePort = (flag, envVar, defaultValue) => {
  const idx = args.findIndex((v) => v.startsWith(flag));
  const cliValue = idx !== -1 ? args[idx].split("=")[1] || args[idx + 1] : null;
  return parseInt(cliValue || process.env[envVar] || defaultValue, 10);
};
```

CLI 플래그(`--port=5000` 또는 `--port 5000` 둘 다), 환경 변수, 기본값 순으로 우선순위를 두고 하나의 함수로 포트/WS 포트 둘 다 처리하게 만들었다.

이 작업 중에 보안 이슈도 AI 코드리뷰 때 조언을 받았다. 

WebSocket 연결은 HTTP 통신과 다르게 브라우저의 CORS 검사 대상이 아니라서, 아무 origin에서나 연결을 시도할 수 있다. 

즉 Origin 검증을 별도로 해줘야 하는데, 이번 구현에서는 손대지 않고 이후 과제로 남겨두기로 했다.

<br/>


>다음 포스팅에서는 GUI 쪽 구현을 이어서 다룰 예정이다.
