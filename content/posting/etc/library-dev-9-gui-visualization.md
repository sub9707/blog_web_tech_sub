---
title: "라이브러리 개발기 (9) — React Flow로 스토어를 캔버스 위에 올려보자"
date: "2026-08-05"
description: "스토어들을 React Flow 노드로 옮긴 과정을 기록함"
tags: ["library", "react", "react-flow", "gui"]
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

이번 포스팅은 스토어 데이터를 가시적으로 "더 잘 보여주는" 단계다. 

스토어들을 목록이 아니라 캔버스 위 노드로 그리는 작업이고, 기능을 새로 추가하는 게 아니라 표현 방식을 바꾸는 게 목표였다. 

<br/>

## 스토어를 노드 배열로 바꾸기

GUI 내부 상태(`zuiStore.stores`)를 React Flow가 요구하는 노드 배열 형태로 바꾸는 것부터 시작했다.

```ts
useEffect(() => {
  setNodes((currentNodes) => {
    const existingById = new Map(currentNodes.map((node) => [node.id, node]));
    return Object.entries(stores).map(([name, info], idx) => {
      const existing = existingById.get(name);
      return {
        id: name,
        position: existing?.position ?? { x: idx * 250, y: 100 },
        type: "storeNode",
        data: { label: name, state: info.currentState, actions: info.actions },
      };
    });
  });
}, [stores, setNodes]);
```

`id`를 스토어 이름 그 자체로 쓴 게 나중에 여러모로 편했다. 

노드 클릭 이벤트에서 `node.id`를 바로 `selectStore`의 인자로 넘길 수 있다.

<br/>

## 커스텀 노드와 `nodeTypes`를 바깥에

기본 노드 대신, 스토어 이름을 헤더로 하고 상태 필드 중 비함수 필드 최대 3개(초과 시 "외 N개"), 하단에 액션 개수를 보여주는 커스텀 노드를 만들었다.

```tsx
function StoreNode({ data }: { data: { label: string; state: unknown; actions: string[] } }) {
  const entries = Object.entries(data.state as object).filter(([, v]) => typeof v !== "function");
  const preview = entries.slice(0, 3);
  const remaining = entries.length - preview.length;

  return (
    <div>
      <div>{data.label}</div>
      <div>
        {preview.map(([key, value]) => (
          <div key={key}>{key}: {String(value)}</div>
        ))}
        {remaining > 0 && <div>외 {remaining}개</div>}
      </div>
      <div>액션 {data.actions.length}개</div>
    </div>
  );
}
```

React Flow는 `nodeTypes={{ storeNode: StoreNode }}` 같은 객체를 prop으로 받는다. 

처음엔 이 객체를 `Canvas` 컴포넌트 함수 안에서 그냥 만들었는데, 콘솔에 경고가 뜨고 노드가 이유 없이 깜빡였다.

> **참조 동일성(referential equality)이란?**
>
> 객체 리터럴 `{ a: 1 }`은 매번 새 메모리 주소를 갖는다. 내용이 같아도 `{ a: 1 } === { a: 1 }`은 항상 `false`다. 컴포넌트 함수 안에서 객체를 만들면, 렌더링될 때마다 새 객체가 생기고 참조도 매번 달라진다.

React Flow는 `nodeTypes`가 바뀌었는지를 바로 이 참조 동일성(`===`)으로 판단한다. 

컴포넌트 안에서 매 렌더 새 객체를 넘기면, React Flow 입장에선 "노드 타입 정의 자체가 바뀌었다"고 오해하고 커스텀 노드를 불필요하게 재마운트시킨다. 

그래서 모듈 최상단으로 빼 바뀌는걸 방지하고 고정적으로 들어가게 했다.

```ts
const storeNode = { storeNode: StoreNode };

function Canvas() {
  // ...
  return <ReactFlow nodeTypes={storeNode} ... />;
}
```

컴포넌트 바깥에 한 번만 선언해두면 리렌더와 무관하게 항상 같은 참조를 유지한다.

경고 메시지를 보고 뭘 고쳐야 할지 몰라서 React Flow 공식 문서를 찾아봤는데, Custom Nodes 문서 안에 이 얘기가 아예 별도 안내로 박혀 있었다. 

`nodeTypes`/`edgeTypes` 객체는 컴포넌트 바깥에서 선언하거나 `useMemo`로 감싸라는 내용이었고, 이유도 지금 것과 같았다.

![React Flow 공식 문서 - Custom Nodes 페이지의 nodeTypes 안내](/assets/etc/zui/reactflow-nodetypes-docs.png)

<bookmark url="https://reactflow.dev/learn/customization/custom-nodes"></bookmark>


노드 클릭은 `onNodeClick`에서 `useZuiStore.getState().selectStore(node.id)`를 호출하는 것으로 끝냈다. 

`StorePanel`이 이미 `selectedStore`를 구독하고 있어서, 캔버스와 패널을 잇는 별도 연결 코드 없이 클릭 한 번이 바로 Inspector 패널에 반영됐다.

<!-- 이미지: 캔버스 위에 카드형 스토어 노드 2~3개가 나란히 배치돼 있고, 노드 하나에 이름/필드 3개 미리보기/액션 개수가 보이는 스크린샷. 노드 하나를 클릭했을 때 우측 StorePanel이 그 스토어로 전환되는 장면도 함께 -->
![GUI 이미지 3 - React Flow 캔버스와 커스텀 노드](/assets/etc/zui/gui-3.png)

<br/>

## 레이아웃 재조립

마지막으로 전체 화면 구조를 `Header(48px) / Canvas(flex: 1) | Inspector(320px)`로 재배치했다. `StorePanel`과 `StoreCreateForm`을 오른쪽 Inspector 자리로 옮기고, 캔버스를 메인으로 세웠다.

어디까지나 기능 확인용 GUI 임시 디자인이다.

```tsx
<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
  <Header />
  <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
    <div style={{ flex: 1 }}><Canvas /></div>
    <div style={{ width: 320, overflow: "auto" }}>
      <StorePanel send={send} />
      <StoreCreateForm send={send} />
    </div>
  </div>
</div>
```

레이아웃을 바꾼 뒤엔 시나리오를 다시 확인해서, 구조가 바뀌어도 기존 기능이 깨지지 않았는지 재검증했다.

<br/>

## 정리하며

여기까지가 지금까지 만든 Z-UI의 전체 그림이다. 

앱에 붙는 observer 코어, WebSocket으로 GUI와 주고받는 메시지, 그리고 목록과 캔버스 두 가지 방식으로 상태를 보고 고치는 인터페이스까지 한 바퀴 돌았다.

>다음 포스팅에서는 액션 로그·스냅샷 같은 시간여행 디버깅 기능을 다룰 예정이다.
