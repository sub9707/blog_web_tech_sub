---
title: "라이브러리 개발기 (5) — 구현 전, 코어 기능 테스트"
date: "2026-07-16"
description: "core와 gui의 기반이 되는 기본 통신, 패턴 등을 정리하였습니다."
tags: ["library", "zustand", "websocket", "typescript", "devtools"]
thumbnail: "/assets/thumbnails/etc/zui.png"
---

스토리보드 대로 흘러가는 앱 로직을 위해 먼저 기본 통신 방식과 타입, 스토어 CRUD를 간이로 구현해보기로 했다.

<br/>

단, 구현 방식을 하나 정하고 들어갔다. 

단순 머리박치기식으로 구현하면 시간 문제와 깊은 구현 수준 문제에 봉착할 것이라 판단해, AI 페어 프로그래밍 방식을 택하되, AI(Claude)에게 전적인 구현을 맡기지 않기로 한 것이다.

대신 미리 작성한 기획과 로드맵을 과제 단위로 잘게 쪼개서, 진행 방향에 맞게 과제 형식으로 질문과 방향을 생성하면 코드를 직접 생성하고, 이를 Claude에게 코드 리뷰와 피드백을 받는 식으로 진행하기로 했다.

그래서 이번 글은 "이런 기능을 만들었다"보다는, 그 과제를 풀면서 어디서 막혔고 뭘 착각했는지에 더 무게를 뒀다. 
결과 코드만 보면 별거 아닌데, 그 결과에 도달하기까지 삽질한 과정이 사실 더 많았다.

이번 글에서 다루는 세 가지 구현은 모두 코어 패키지의 `packages/core/src` 아래의 구조이다.

<br/>

## 과제 1-1. 메시지 프로토콜 설계 (protocol.ts)

GUI와 앱 사이에 오갈 메시지 타입부터 정의해야 했다.

앱에서 GUI로 가는 메시지(`ServerMessage`)와 GUI에서 앱으로 가는 메시지(`ClientMessage`)를 각각 discriminated union으로 묶었다.

> **discriminated union이란?**
>
> 여러 개의 타입을 하나의 타입으로 묶어두되, 그 안에 공통으로 들어가는 필드(보통 `type`) 값으로
> 지금 이게 그 중 어떤 타입인지 구분할 수 있게 만든 형태이다.
>
> `message.type === "STORE_UPDATE"`처럼 분기하고 나면, 그 블록 안에서는 TypeScript가
> `message`를 자동으로 `StoreUpdateMessage`로 좁혀준다. 이를 통해 매번 `as`로 타입을
> 억지로 캐스팅할 필요 없이, `if` 하나로 안전하게 나머지 필드에 접근할 수 있다.

크게 보면 두 가지를 위한 타입들이다.

1. 앱에서 GUI로의 Store 통신을 위한 타입 (ServerMessage)
2. GUI에서 앱으로 쏘는 메시지 타입 (ClientMessage)

항목별로 나누어 타입을 살펴보자.

### 앱 → GUI [ServerMessage]

```ts
interface StoreRegisterMessage {
  type: "STORE_REGISTER";
  name: string;
  initialState: unknown;
  actions: string[];
}
```
**StoreRegisterMessage** — 스토어가 처음 등록될 때 앱이 GUI로 보낸다. 스토어 이름, 초기 state, 액션 이름 목록을 담아서 보내면 GUI가 이걸로 노드를 하나 그리게 된다. 이 메시지를 위한 초기 등록 메시지의 타입 정의이다.

<br/>

```ts
interface StoreUpdateMessage {
  type: "STORE_UPDATE";
  name: string;
  newState: unknown;
  action: string;
  timestamp: number;
}
```
**StoreUpdateMessage** — state가 바뀔 때마다 보낸다. 바뀐 이후의 state 전체(`newState`)와 어떤 액션으로 바뀌었는지(`action`), 언제 바뀌었는지(`timestamp`)를 같이 실어 보낸다.

```ts
interface StoreRemoveMessage {
  type: "STORE_REMOVE";
  name: string;
}
```
**StoreRemoveMessage** — 스토어가 삭제됐을 때, 그 스토어의 이름만 담아서 GUI에 알린다.

<br/>

```ts
interface StoreActionResultMessage {
  type: "STORE_ACTION_RESULT";
  success: boolean;
  reason?: string;
}
```
**StoreActionResultMessage** — `SCAFFOLD_STORE`나 `DELETE_STORE` 요청을 처리한 결과를 알려주는 메시지이다. 성공 여부(`success`)와, 실패했다면 이유(`reason`)를 담는다.

<br/>

```ts
export type ServerMessage =
  | StoreRegisterMessage
  | StoreUpdateMessage
  | StoreRemoveMessage
  | StoreActionResultMessage;
```
위 네 개를 하나로 묶은 타입이다. 앱에서 GUI로 보내는 메시지는 전부 이 `ServerMessage` 하나로 받는다.

<br/>

### GUI → 앱 [ClientMessage]

```ts
interface SetStateMessage {
  type: "SET_STATE";
  name: string;
  newState: unknown;
}
```
**SetStateMessage** — GUI의 Inspector 패널에서 값을 직접 수정했을 때, 그 스토어 이름과 새 state를 앱으로 보낸다.

<br/>

```ts
interface RestoreSnapshotMessage {
  type: "RESTORE_SNAPSHOT";
  name: string;
  snapshot: unknown;
}
```
**RestoreSnapshotMessage** — 스냅샷 탭에서 저장해둔 시점으로 되돌릴 때, 그 시점의 state(`snapshot`)를 통째로 실어 보낸다.

<br/>

```ts
interface RequestStoreListMessage {
  type: "REQUEST_STORE_LIST";
}
```
**RequestStoreListMessage** — GUI가 막 연결됐을 때 "지금 등록된 스토어 목록 좀 줘"라고 요청하는 메시지. 별도 데이터 없이 요청 자체가 전부다.

<br/>

```ts
interface ScaffoldStoreMessage {
  type: "SCAFFOLD_STORE";
  name: string;
  fields: { name: string; type: string }[];
  register: boolean;
}
```
**ScaffoldStoreMessage** — "+ 새 스토어" 모달에서 생성 버튼을 눌렀을 때 보낸다. 스토어 이름(`name`), 필드 목록(`fields`), 그리고 만들자마자 GUI에 바로 노출할지 정하는 `register` 값을 담는다. 이 스캐폴드를 통해 보일러플레이트를 생성한다.

<br/>

```ts
interface DeleteStoreMessage {
  type: "DELETE_STORE";
  name: string;
}
```
**DeleteStoreMessage** — 스토어 삭제를 요청할 때, 스토어의 이름만 담아서 보낸다.

<br/>

```ts
export type ClientMessage =
  | SetStateMessage
  | RestoreSnapshotMessage
  | RequestStoreListMessage
  | ScaffoldStoreMessage
  | DeleteStoreMessage;
```
마찬가지로 위 다섯 개를 하나로 묶은 타입이다. GUI에서 앱으로 보내는 메시지는 전부 이 `ClientMessage` 하나로 받는다.

<br/>

## 과제 1-2. WebSocket 서버 구현 (server.ts)

`ws` 패키지의 `WebSocketServer`를 감싸서 `createZuiServer()` 팩토리 함수를 만드는 과제였는데, 질문도 많이 하고, devtool 파일도 살펴보면서 하느라 과제 중 제일 오래 걸렸다.

전체 코드는 이렇다.

```ts
import { ClientMessage, ServerMessage } from "./protocol";
import { WebSocketServer } from "ws";

export interface ZuiServer {
  broadcast(message: ServerMessage): void;
  onMessage(handler: (message: ClientMessage) => void): void;
  closeServer(): void;
}

let zuiServerInstance: ZuiServer | null = null;

export const createZuiServer = (options?: { port?: number }): ZuiServer => {
  if (zuiServerInstance) {
    console.warn("[Z-UI] Server is already running. Returning existing instance.");
    return zuiServerInstance;
  }

  const wss = new WebSocketServer({ port: options?.port ?? 3274 });

  let messageHandler: (message: ClientMessage) => void = () => {};

  wss.on("listening", () => {
    console.log(`[Z-UI] Server running on ws://localhost:${wss.options.port}`);
  });
  wss.on("connection", (ws) => {
    console.log("[Z-UI] GUI connected");

    ws.on("message", (message) => {
      try {
        messageHandler(JSON.parse(message.toString()));
      } catch (e) {
        console.error("[Z-UI] Error parsing client message:", e);
      }
    });

    ws.on("close", () => {
      console.log("[Z-UI] GUI disconnected");
    });
  });

  const serverInstance: ZuiServer = {
    broadcast(message: ServerMessage) {
      const messageString = JSON.stringify(message);
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(messageString);
        }
      });
    },
    onMessage(handler: (message: ClientMessage) => void) {
      messageHandler = handler;
    },
    closeServer() {
      wss.close();
    },
  };

  zuiServerInstance = serverInstance;

  return serverInstance;
};
```

부분 부분 나누어 살펴보자.

맨 위 `if (zuiServerInstance) { ... return zuiServerInstance; }`는 이미 만들어진 서버가 있으면 그걸 즉시 반환하고 함수를 끝내버린다. 

이 덕분에 뒤따르는 나머지 코드(포트 열기, 이벤트 등록 등)는 전부 "아직 서버가 없을 때"만 실행되는 게 보장된다. 싱글턴 패턴을 구현하기 위해 이와 같이 구현했다.

맨 아래 `return serverInstance`는 새로 다 만든 서버 인스턴스를 반환하고 모듈 레벨에 선언한 인스턴스에 대입하며 반환한다.

 이 두 `return` 중 하나만 실행되고 함수가 끝나므로, `createZuiServer()`를 몇 번을 호출하든 항상 서버 인스턴스 하나만 돌려받게 된다.

<br/>

이제 인터페이스 메서드들을 하나씩 보자.

```ts
export interface ZuiServer {
  broadcast(message: ServerMessage): void;
  onMessage(handler: (message: ClientMessage) => void): void;
  closeServer(): void;
}
```

메서드 세 개로 구성된 인터페이스인데, 각각 다음과 같이 구현했다.

```ts
broadcast(message: ServerMessage) {
  const messageString = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(messageString);
    }
  });
}
```
**broadcast** — 연결된 모든 GUI 클라이언트에게 메시지를 뿌린다. `wss.clients`(현재 연결된 소켓들의 `Set`)를 순회하면서, 연결이 살아있는(`OPEN`) 소켓에만 문자열로 직렬화한 메시지를 보낸다. 

이 때, 에이전트의 질문이 OPEN 소켓이 아닌 모든 소켓에 브로드캐스트 했을 때 어떤 문제가 발생될 지였는데, 단순히 생각해 OPEN이 아닌 소켓에까지 브로드캐스트하면 시간-자원 손해 아닌가? 라 생각하고 답변했으나, 

돌아온 답변은

> 자원 낭비보다 더 큰 문제는 **에러가 던져진다**
>
> `ws`는 `OPEN`이 아닌 소켓에 `.send()`하면 예외를 던지는데, 이걸 안 잡으면
> `forEach` 루프가 그 자리에서 멈춰서 뒤에 남은 다른 클라이언트들까지 메시지를
> 못 받는다. 
>
>`OPEN` 체크는 최적화가 아니라 루프를 안전하게 끝까지 돌리기 위한
> 필수 파트다.

<br/>

```ts
let messageHandler: (message: ClientMessage) => void = () => {};

onMessage(handler: (message: ClientMessage) => void) {
  messageHandler = handler;
}
```
**onMessage** — GUI에서 메시지가 왔을 때 실행할 콜백을 등록한다. 넘겨받은 `handler`를 모듈 스코프 변수 `messageHandler`에 저장해두면, 실제 메시지가 도착했을 때(`ws.on("message", ...)` 안에서) 이 변수를 꺼내 호출하는 식이다.

클로저 활용을 택했다. `onMessage`와 `ws.on("message", ...)` 콜백, 서로 다른 두 함수가 같은 `messageHandler`를 공유하는데, 굳이 매개변수로 주고받을 필요 없이 그냥 같은 스코프에 있는 변수를 각자 읽고 쓰는 것만으로 연결이 된다.

<br/>

```ts
closeServer() {
  wss.close();
}
```
**closeServer** — 서버를 닫는다. `WebSocketServer` 인스턴스의 `close()`를 그대로 호출한다.

<br/>

인터페이스는 금방 잡았는데, 구현체를 채워가면서 여러 문제가 발생했다.

<br/>

### `wss`와 `ws`를 헷갈렸다

```ts
wss.on("message", ...)
```

서버 객체(`wss`) 전체에다 메시지 이벤트를 걸려고 했는데, `"message"`는 개별 클라이언트 소켓(`ws`)에서만 발생하는 이벤트였다.

`@types/ws`의 타입 정의를 직접 열어보고 나서야, 애초에 `wss`에는 `"message"` 이벤트 자체가 없다는 걸 확인했다. 에러 메시지만 봐서는 뭐가 문제인지 감이 안 왔는데, 타입 정의 파일을 직접 뒤진 게 제일 확실한 확인 방법이었다.


<br/>

### 콘솔로 검증하다가 코드와 무관한 곳에서 막힘

- 브라우저 콘솔에서 `new WebSocket(...)` 치고 바로 다음 줄에 `ws.onopen`을 등록했더니, `localhost`라 연결이 너무 빨리 열려버려 핸들러 등록 전에 이미 `open` 이벤트가 지나가 있었다. 로그가 안 찍혀서 처음엔 서버 문제인 줄 알았는데, 서버 쪽엔 이미 `GUI connected`가 찍혀 있어서 원인을 파악할 수 있었다.

- `chrome://` 내부 페이지 콘솔에서 테스트하려다가 CSP(`connect-src`) 위반으로 연결 자체가 막혔다. 그냥 일반 웹페이지 탭에서 열어야 했다.


"코드는 맞는데 검증 방법이 틀려서" 삽질한 케이스였다. 

이후로는 결과가 이상하면 코드부터 의심하기 전에 검증 절차부터 한번 되짚어보는 시도를 하게됐다.

<br/>

## 과제 1-3. Store Registry 구현 (registry.ts)

스토어 이름을 키로, `StoreEntry`를 값으로 갖는 `Map` 기반 레지스트리를 만드는 과제였다.

```ts
interface StoreEntry {
  name: string;
  getState: () => unknown;
  setState: (newState: unknown) => void;
  actions: string[];
}

let registry: Map<string, StoreEntry> = new Map();

function registerStore(entry: StoreEntry): void {
  registry.set(entry.name, entry);
}

function unregisterStore(name: string): void {
  registry.delete(name);
}

function getStore(name: string): StoreEntry | undefined {
  return registry.get(name);
}
```

앞의 두 과제에 비하면 수월했다. `Map`의 기본 메서드(`set`/`get`/`delete`)로 CRUD를 그대로 매핑하면 됐다.

<br/>


### 또또 타이밍 문제

`temp-test.ts`로 `server.ts`와 연동해서 "등록하면 브로드캐스트되는지"까지 테스트하다가, 여기서도 타이밍 문제를 또 만났다.

```ts
setTimeout(() => {
  registerStore({ ... }); // 등록과 동시에 브로드캐스트
}, 2000);
```

브라우저 콘솔에 손으로 `new WebSocket(...)` + `onmessage` 등록을 2초 안에 끝내지 못해서 브로드캐스트를 놓쳤다. 

과제 1-2에서 겪은 것과 똑같은 종류의 문제라고 생각했다. 

지연 시간을 10초로 늘리니 해결됐다.

다만 이건 순전히 "임시 테스트 코드"의 한계였다. 

실제 앱에서는 GUI가 연결되자마자 `REQUEST_STORE_LIST`를 보내고 그 응답으로 목록을 받는 요청-응답 구조라, 이런 꼬임이 애초에 생길 수가 없다는 것도 질문을 통해 확인했다.

<br/>

### `Map`을 쓴 이유

`Map`을 쓴 이유도 짚고 넘어가려 한다. `Map`이 `Record`(일반 객체)보다 나은 이유가 여타 객체와의 비교처럼 "빠른 get/set" 순회 접근이라 생각했다. 사실 `Record`도 충분히 빠르다고 한다.

진짜 차이는 **프로토타입 오염 없이 임의의 키를 안전하게 다룰 수 있다는 것**이었다. 

`{}` 객체를 쓰면 `"toString"` 같은 이름을 스토어 이름으로 등록했을 때 프로토타입 체인의 기존 메서드와 충돌할 수 있는데, `Map`은 그런 걱정이 없다. `.size`로 개수를 바로 알 수 있고, 순회 API도 더 깔끔했다.


<br/>


<br/>

## 정리

과제를 스스로 풀고 Claude에게 리뷰를 받는 방식이 처음엔 시간이 더 걸리는 것 같아서 불안했는데, 지나고 보니 이 실수들을 하나씩 직접 만나본 게 오히려 남는 게 많았다. 단순 구현을 맡겼으면 몰랐을 것들이었고 학습도 되는 것같아 불안감이 많이 해소됐다.

>다음 포스팅에서는 테스트한 것들을 토대로 구현을 이어나갈 예정이다.
