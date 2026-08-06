---
title: "라이브러리 개발기 (7) — GUI에서 스토어 생성"
date: "2026-07-28"
description: "GUI에서 zustand 스토어 파일을 생성/삭제하는 scaffold 기능 구현기"
tags: ["library", "zustand"]
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

지금까지 앱에 붙는 observer(`zui`/`initZui`) 쪽은 어느 정도 마무리됐다.

스토리보드에서 그려뒀던 "+ 새 스토어" 모달, 그 버튼을 눌렀을 때 실제로 `.ts` 파일까지 만들어주는 부분을 구현했다. 

`packages/core/src/scaffold.ts`다.

<br/>

## 이름과 필드만으로 스토어 코드를 뽑아낸다

GUI에서 스토어 이름, 필드 목록(이름+타입), 색상, 등록 여부를 입력받아 `SCAFFOLD_STORE` 메시지로 보내면, 서버가 그걸 받아서 실제 zustand 보일러플레이트 문자열을 만든다.

```ts
const generateStoreTemplate = (
  name: string,
  fields: Field[],
  options?: ScaffoldOptions,
): string => {
  const baseName = name.replace(/Store$/, "");
  const stateName = `${capitalize(baseName)}State`;
  const hookName = `use${capitalize(name)}`;

  const fieldDeclarations = fields.map((f) => `  ${f.name}: ${f.type};`).join("\n");
  const initialValues = fields.map((f) => `  ${f.name}: ${defaultValueFor(f.type)},`).join("\n");

  const body = `import {create} from 'zustand';
${options?.register ? 'import {zui} from "@z-ui/core";' : ""}

type ${stateName} = {
    ${fieldDeclarations}
};

export const ${hookName} = create<${stateName}>()((set) => ({
${initialValues}
}));
`;

  if (!options?.register) return body;

  return `${body}
zui('${name}', ${hookName}, { color: '${options.color}' });
`;
};
```

이름 하나에서 파생 이름을 세 개나 뽑아낸다. 

`productStore`를 입력하면 `baseName`은 `product`, `stateName`은 `ProductState`, `hookName`은 `useProductStore`가 된다.

`Store` 접미사를 떼고 다시 붙이는 정도라 복잡하진 않은데, 이 규칙 하나를 정해두니 이후 어떤 이름을 넣어도 결과물이 컨벤션에서 벗어나지 않는다는 게 마음에 들었다.

UI를 구성할 때 플레이스 홀더로 이름 입력을 도울 예정이다.

필드 타입별 기본값은 `defaultValueFor`에서 처리한다.

```ts
const defaultValueFor = (type: string): string => {
  if (type.endsWith("[]")) return "[]";
  if (type.includes("=>")) return "() => {}";

  switch (type) {
    case "string":
      return "''";
    case "number":
      return "0";
    case "boolean":
      return "false";
    default:
      return "null";
  }
};
```

배열 타입(`string[]`)이면 빈 배열, 함수 타입(`() => void`)이면 빈 함수, 나머지는 원시 타입별 기본값을 준다. 

`register` 옵션이 꺼져 있으면 여기서 끝나고, 켜져 있으면 `zui(...)` 등록 코드 한 줄을 파일 맨 아래 이어붙인다.

이 옵션으로 ZUI 패널에서 보일지 말지 결정한다.

<br/>

## 파일 경로 계산

스토어 이름을 파일 경로로 바꾸는 부분이 생각보다 신경 쓸 게 많았다.

```ts
const getStoreFilePath = (storeName: string): string | null => {
  const storesDir = path.resolve(process.cwd(), "src/stores");
  const filePath = path.resolve(storesDir, `${storeName}.ts`);

  if (filePath !== storesDir && !filePath.startsWith(storesDir + path.sep)) {
    return null;
  }

  return filePath;
};
```

GUI에서 온 이름을 그대로 신뢰하면 안 된다. 

`SCAFFOLD_STORE`의 `name`은 GUI 폼 입력값이고, 그 폼엔 정규식 검증(`/^[a-z0-9_-]+$/`)이 있긴 하지만 그건 클라이언트 쪽 검증일 뿐이다. 

서버로 오는 메시지 자체는 브라우저 콘솔에서 직접 `ws.send(...)`로도 얼마든지 조작해서 보낼 수 있다.

> **경로 순회(path traversal)란?**
>
> `../` 같은 '상대 경로' 표기를 이름에 섞어서, 원래 의도한 폴더 바깥의 파일을 읽거나 쓰게 만드는 공격이다. 여기서는 스토어 이름 자리에 `../../../../etc/passwd` 같은 값을 넣으면, `path.resolve`가 그 상대 경로를 그대로 계산해서 `src/stores` 바깥의 완전히 다른 경로를 가리키게 된다.

그래서 `path.resolve`로 최종 경로를 뽑아낸 뒤, 그 결과가 `storesDir` 안에 있는 게 맞는지 다시 검증하는 방식을 택했다. 

실제로 저 페이로드를 콘솔에서 직접 보내보고, `null`이 반환되며 거부되는 것까지 확인했다.

<br/>

여기서 한 번 더 걸렸다. 처음엔 검증 조건을 이렇게 짰다.

```ts
if (!filePath.startsWith(storesDir)) {
  return null;
}
```

`startsWith`만 쓰면, `storesDir`이 `.../src/stores`일 때 `.../src/stores-backup/ooo.ts` 같은 경로도 통과해버린다. 

문자열로만 보면 `src/stores`로 시작하니 걸러지지않는다..

`storesDir + path.sep`을 붙여서 비교하도록 고쳤다. 

이렇게 해야 `.../src/stores/` 뒤에 오는 경로만 진짜로 통과시킬 수 있다. 

`filePath !== storesDir` 조건도 같이 넣었는데, 스토어 이름이 빈 문자열이라 `filePath`가 `storesDir` 되는 것 처럼 폴더를 파일처럼 다루려는 경우를 막기 위해서 넣었다.

경로 하나 비교하는 게 별거 아니라고 생각했는데, 문자열 `startsWith`와 실제 "이 폴더 안에 있다"는 조건이 다르다는 걸 이번에 AI의 따끔한 피드백 훈수를 받으며 배우게 됐다...


<br/>

## 중복 파일 처리

경로가 유효해도 이미 파일이 존재하면 안 된다.

```ts
if (fs.existsSync(filePath)) {
  sendActionResult(server, message.name, false, "A store with this name already exists.");
  return;
}
```

GUI 쪽에서도 등록된 스토어 이름과 대소문자 무시하고 중복 검사를 하긴 하지만, 그건 "GUI가 알고 있는 스토어"만 커버한다. 

파일은 있는데 아직 `zui()`로 등록 안 된 스토어는 GUI가 존재 자체를 모르기 때문에 걸러낼 수 없다. 

`fs.existsSync` 체크가 최종 안전망 역할을 하는 셈이다.

<br/>

## 삭제 처리?

스토리보드를 쓸 때 "즉시 삭제가 사용자 경험에 더 좋을 듯하여 즉시 삭제로 고려 중"이라고 적어뒀는데, 막상 구현 단계에 오니 생각이 바뀌었다. 

실수로 지운 스토어를 되돌릴 방법이 전혀 없다는 게 걸렸다.

그래서 실제 삭제 대신 `.zui-trash/`로 옮기는 방식으로 방향을 틀었다.

```ts
const handleDeleteStore = (
  server: ZuiServer,
  message: Extract<ClientMessage, { type: "DELETE_STORE" }>,
): void => {
  const sourcePath = getStoreFilePath(message.name);
  if (!sourcePath) {
    sendActionResult(server, message.name, false, "Invalid store name.");
    return;
  }

  if (fs.existsSync(sourcePath)) {
    const trashDir = path.resolve(process.cwd(), TRASH_DIR_NAME);
    fs.mkdirSync(trashDir, { recursive: true });
    fs.renameSync(sourcePath, path.resolve(trashDir, `${message.name}.ts`));
  }

  server.broadcast({ type: "STORE_REMOVE", name: message.name });
};
```

경로 계산은 생성 때와 똑같이 `getStoreFilePath`를 재사용했다.

삭제 요청도 결국 사용자 입력(스토어 이름)을 경로로 바꾸는 작업이라, 여기서 검증을 빼먹으면 생성 쪽에서 막아둔 게 무의미해진다.

파일을 옮긴 뒤엔 `STORE_REMOVE`를 브로드캐스트한다. 

이 메시지는 지난 글에서 다룬 `unregisterStore`를 그대로 태운다. 

앱 쪽 `initZui()`가 이 메시지를 받으면 registry에서 해당 스토어의 unsubscribe를 호출하고 지운다. 

파일을 치우는 일과 앱의 구독을 끊는 일이 같은 메시지 하나로 이어지는 셈이다.

<br/>

## relay 위로 특별 케이스만 얹기

`server.ts`의 기본 동작은 받은 메시지를 그냥 다 broadcast하는 relay라는 걸 지난 글에서 다뤘다. 

`SCAFFOLD_STORE`와 `DELETE_STORE`만은 이 relay를 그대로 타면 안 된다. 파일 시스템을 건드리게 된다...

```ts
export const handleZuiMessage = (server: ZuiServer, message: ClientMessage): void => {
  if (message.type === "SCAFFOLD_STORE") {
    handleScaffoldStore(server, message);
    return;
  }
  if (message.type === "DELETE_STORE") {
    handleDeleteStore(server, message);
    return;
  }
  server.broadcast(message as unknown as ServerMessage);
};
```

이 두 타입만 걸러서 별도 핸들러로 보내고, 나머지는 그대로 기본 relay(`server.broadcast`)로 흘려보낸다. 

`server.ts`를 건드리지 않고 그 위에 특별 케이스들만 얹은 구조라, relay 자체의 흐름은 그대로 유지되면서 파일 조작이 필요한 두 메시지만 예외적으로 가로챌 수 있었다.

<br/>

## 정리하며

경로 하나, 삭제 방식 하나 정하는 데도 계속 "이게 맞나" 되짚어보게 됐다. 

특히 `startsWith` 버그는 실제로 공격당하기 전엔 티도 안 나는 종류라, 검증 코드 자체를 좀 더 생각해볼 수 있었다.

AI 에이전트의 수준이 점점 상승하면서 편해지기도 하지만, 이런 생각지 못한 방면에서도 피드백을 받을 수 있다는 점이 정말 좋았다.

여기까지가 앱 쪽에서 동작하는 코어의 마지막 조각이다. 

다음 글부터는 이 코어가 보내는 메시지를 실제로 받아서 화면에 그리는 GUI 쪽(`packages/gui`)을 다루어보자.