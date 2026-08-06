---
title: "라이브러리 개발기 (8) — GUI에 코어 붙이기"
date: "2026-08-01"
description: "WebSocket 클라이언트 훅과 GUI 자신의 zustand 상태로 스토어 조회·수정·생성·삭제를 붙여봄"
tags: ["library", "react", "zustand", "websocket", "gui"]
thumbnail: "/assets/thumbnails/etc/zui.png"
relatedPosts:
  - "라이브러리 개발기 (1) — 주제 선택"
  - "라이브러리 개발기 (2) — 보일러 플레이트 생성"
  - "라이브러리 개발기 (3) — Zustand 소스코드 해체분석"
  - "라이브러리 개발기 (4) — 스토리보드"
  - "라이브러리 개발기 (5) — 구현 전, 코어 기능 테스트"
  - "라이브러리 개발기 (6) - vite 플러그인 활용과 core-gui 연결 정리"
  - "라이브러리 개발기 (7) — GUI에서 스토어 생성"
  - "라이브러리 개발기 (8) — GUI에 코어 붙이기"
  - "라이브러리 개발기 (9) — React Flow로 스토어를 캔버스 위에 올려보자"
---

이번 글부터는 스토리보드에 그려뒀던 화면들을 실제로 `packages/gui`에 옮기는 작업이다. 

이번 글에서는 그중에서도 코어가 보내는 메시지를 받아 화면에 표시하고, 값을 고치고, 스토어를 만들고 지우는 CRUD 흐름을 다뤄본다.

<br/>

## WebSocket 클라이언트 훅

GUI 쪽에서 서버와 통신하는 역할은 `useZuiSocket.ts`이라는 커스텀 훅 하나가 전담한다.

```ts
const useZuiSocket = () => {
  const [status, setStatus] = useState<ConnectState>("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const connect = () => {
      const wsPort = new URLSearchParams(window.location.search).get("wsPort") ?? "3274";
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        ws.send(JSON.stringify({ type: "REQUEST_STORE_LIST" }));
      };
      ws.onclose = () => {
        setStatus("disconnected");
        timeoutId = setTimeout(() => connect(), 3000);
      };
      ws.onerror = () => setStatus("error");
      ws.onmessage = (e) => {
        // ...
      };
    };

    connect();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      wsRef.current?.close();
    };
  }, []);

  const send = (message: unknown) => wsRef.current?.send(JSON.stringify(message));
  return { status, send };
};
```

연결 상태(`connecting`/`connected`/`disconnected`/`error`)는 `useState`로 두고, WebSocket 인스턴스 자체는 `useRef`로 들고 있다. 

인스턴스는 렌더링과 무관하게 유지돼야 하고, 바뀔 때마다 리렌더가 필요없기 때문이다.

재연결은 `connect` 함수가 자기 자신을 클로저로 다시 부르는 방식으로 짰다. 

`onclose`가 오면 3초 뒤 `connect()`를 한 번 더 호출하고, 그 안에서 새 `ws.onclose`가 또 같은 로직을 물고 있으니 끊길 때마다 재시도가 이어진다.

`onopen` 시점에 바로 `REQUEST_STORE_LIST`를 보내는 이유는, GUI가 앱보다 늦게 켜지는 경우 때문이다. 

앱이 이미 스토어들을 다 등록해놓은 상태로 켜져 있었다면, GUI는 그 등록 메시지를 놓친 셈이니 연결되자마자 목록을 다시 요청해야 한다.

이 훅은 `App.tsx`에서만 호출한다. 

다른 컴포넌트가 각자 `useZuiSocket()`을 부르면 컴포넌트 수만큼 WebSocket 연결이 새로 생겨버리기 때문에, `send` 함수를 필요한 컴포넌트에 prop으로 내려주는 방식으로 통일했다.

<br/>

## GUI 내부 상태 구현

GUI가 받은 메시지(스토어 목록, 각 스토어의 현재 상태)를 어디에 담을지가 다음 문제였는데, GUI 자신도 zustand를 쓰는 방식으로 했다.


```ts
interface ZuiState {
  stores: Record<string, StoreSnapshot>;
  selectedStore: string | null;
  snapshots: SnapshotRecord[];
  actionResult: ActionResult | null;
}
```

`upsertStore`는 "있으면 갱신, 없으면 추가"를 조건문 없이 처리한다.

```ts
upsertStore: (name, currentState, actions) => {
  set((state) => {
    const existing = state.stores[name];
    return {
      stores: {
        ...state.stores,
        [name]: {
          name,
          currentState,
          initialState: existing?.initialState ?? currentState,
          actions: actions ?? existing?.actions ?? [],
        },
      },
    };
  });
},
```

여기서 조금 까다로웠던 부분이 `initialState` 필드다. 

스토어를 "초기화" 하려면 최초 등록 시점의 상태를 따로 기억해둬야 하는데, `STORE_UPDATE`가 올 때마다 이 값을 덮어쓰면 초기화 버튼이 의미가 없어진다. 

그래서 `existing?.initialState ?? currentState`로, 이미 값이 있으면 그대로 두고 없을 때(최초 등록 시점)만 값을 굳히도록 했다.

`useZuiSocket`의 `onmessage`는 이 스토어의 액션을 훅이 아니라 `useZuiStore.getState().upsertStore(...)`처럼 직접 호출한다.

```ts
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "STORE_REGISTER") {
    useZuiStore.getState().upsertStore(msg.name, msg.initialState, msg.actions);
  } else if (msg.type === "STORE_UPDATE") {
    useZuiStore.getState().upsertStore(msg.name, msg.newState);
  } else if (msg.type === "STORE_REMOVE") {
    useZuiStore.getState().removeStore(msg.name);
  } else if (msg.type === "STORE_ACTION_RESULT") {
    useZuiStore.getState().setActionResult({ name: msg.name, success: msg.success, reason: msg.reason });
  }
};
```

이벤트 핸들러는 React 렌더링 사이클 밖에서 실행된다. 

그 안에서 `useZuiStore(selector)`처럼 훅 형태로 접근하면 Hooks 규칙을 어기게 되니, `getState()`로 스토어 인스턴스에 직접 접근해서 액션만 호출하는 방식을 썼다.

<br/>

## StorePanel — 조회, 수정, 초기화, 삭제

`StorePanel.tsx`가 실제로 스토어 목록과 선택된 스토어의 상태를 보여준다.

값을 고칠 때는 원래 타입을 지켜주는 게 관건이었다. HTML input은 항상 문자열을 돌려주니, 그걸 그대로 `SET_STATE`에 실어 보내면 숫자 필드가 문자열로 바뀌어버린다.

```ts
const parseValue = (raw: string, original: unknown): unknown => {
  if (typeof original === "number") return Number(raw);
  if (typeof original === "boolean") return raw === "true";
  return raw;
};
```

수정 전 값의 타입을 보고 그 타입에 맞게 다시 캐스팅한 다음 전송한다. 

[초기화] 버튼은 `upsertStore`에서 최초 1회만 고정해둔 `initialState`를 `RESTORE_SNAPSHOT`으로 그대로 실어 보낸다.

```ts
const resetStore = () => {
  if (!selectedStore) return;
  const snapshot = stores[selectedStore]?.initialState;
  send({ type: "RESTORE_SNAPSHOT", name: selectedStore, snapshot });
};
```

삭제 버튼은 `window.confirm`으로 한 번 더 확인을 받은 뒤에야 `DELETE_STORE`를 보낸다.

<!-- 이미지: GUI 화면 좌측에 스토어 이름 버튼 목록, 우측에 선택된 스토어의 상태 필드들과 각 필드 옆 Edit 버튼, 하단에 Reset/Delete 버튼이 보이는 StorePanel 스크린샷 -->
![GUI 이미지 1 - StorePanel 조회/수정 화면](/assets/etc/zui/gui-1.png)

<br/>

## StoreCreateForm — 생성과 검증

`StoreCreateForm.tsx`는 새 스토어를 만드는 폼이다. 

이름, 필드 목록(필드명+타입 반복 입력), 색상(고정 팔레트 라디오), "Z-UI에 등록" 체크박스로 구성했다.

전송 전에 클라이언트 쪽 검증을 세 단계로 나눴다.

```ts
const name = formState.name.trim().toLowerCase();

if (!VALID_NAME_PATTERN.test(name)) {
  setValidationError("Store name can only contain lowercase letters, numbers, - and _.");
  return;
}

const isDuplicate = Object.keys(stores).some((existing) => existing.toLowerCase() === name);
if (isDuplicate) {
  setValidationError("A store with this name already exists.");
  return;
}
```

1. 이름을 `trim().toLowerCase()`로 정규화
2. `/^[a-z0-9_-]+$/` 패턴으로 특수문자 차단
3. 현재 GUI가 알고 있는 등록된 스토어 목록과 대소문자 무시하고 중복 검사

3번은 어디까지나 "GUI가 알고 있는 스토어"만 커버한다. 

지난 글에서 다룬 것처럼, 파일은 있는데 아직 등록 안 된 스토어는 GUI가 존재 자체를 모르니 여기서 걸러지지 않는다. 

이는 서버 쪽 `fs.existsSync` 체크가 최종 안전망 역할을 한다.

서버가 `STORE_ACTION_RESULT`로 결과를 돌려주면, 방금 제출한 이름/등록여부를 기억해뒀다가 대조해서 메시지를 구분한다.

```ts
const resultMessage =
  actionResult && lastSubmitted && actionResult.name === lastSubmitted.name
    ? actionResult.success
      ? lastSubmitted.register
        ? "Created and registered successfully."
        : "File created — not visible in GUI yet. Add zui(...) to register it."
      : actionResult.reason
    : null;
```

등록 체크박스를 끄고 만들면 파일은 생기지만 GUI엔 안 보이니, 그 상황을 따로 안내하는 문구를 넣었다.

삭제 버튼은 이 폼이 아니라 `StorePanel` 쪽에 뒀다. 

삭제 대상은 이미 존재하는 스토어이고, `StorePanel`이 이미 목록과 선택 상태를 들고 있어서 그쪽이 맥락상 자연스러웠다. 

생성 폼 하나에 삭제 책임까지 몰아넣고 싶지 않았다.

<!-- 이미지: 스토어 이름 입력, 필드 추가 버튼으로 늘어난 필드 행들, 색상 라디오 버튼, "Register to Z-UI" 체크박스, 하단 Create 버튼과 결과 메시지("Created and registered successfully.")가 보이는 StoreCreateForm 스크린샷 -->
![GUI 이미지 2 - StoreCreateForm 생성 화면](/assets/etc/zui/gui-2.png)

<br/>


## 정리하며

Zustand 관찰 도구를 만들면서 그 도구 자체도 Zustand로 상태를 관리하게 된 게 이번 글에서 제일 재미있었던 지점이었다. 

같은 패턴(구독, 훅 밖에서 `getState()` 호출)을 양쪽에서 반복해서 마주치다 보니, 처음엔 헷갈리던 개념들이 오히려 손에 붙는 느낌이었다.

>다음 포스팅에서는 목록 형태였던 이 화면을 React Flow로 캔버스 위 노드로 그리는 작업을 다룰 예정이다.