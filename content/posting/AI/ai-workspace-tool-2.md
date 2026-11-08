---
title: "AI 워크스페이스 툴 제작기 (2) — 토큰 계산기[1] 토큰화 함수"
date: "2026-11-07"
description: "토큰 계산기 구현 기록. 프로젝트 준비, js-tiktoken 구조 확인, 텍스트를 토큰으로 쪼개는 함수 구현"
tags: ["ai", "llm", "token", "tokenizer", "nextjs", "사이드프로젝트"]
thumbnail: "/assets/thumbnails/ai/ai-workspace-tool.webp"
---

AI 워크스페이스 툴의 첫 번째 기능, 토큰 계산기 제작기의 1편이다.

지난 글에서 AI Assistant 화면의 첫 기능으로 "LLM 아키텍처와 Token, Context Window"를 잡았다. 대화가 길어져도 모델의 처리 한도를 넘지 않게 관리하려면, 먼저 텍스트가 토큰으로 어떻게 바뀌고 몇 개가 되는지 셀 수 있어야 한다. 그래서 본 기능 구현에 들어가기 전에 토큰 계산기를 따로 만들어보기로 했다.

<callout title="이 글에서 다루는 것">

- 토큰 계산기 관련 용어 정리
- 프로젝트 생성과 패키지 설치
- `js-tiktoken` 라이브러리 구조
- 텍스트를 토큰으로 쪼개는 함수 구현과 결과 확인

</callout>

---

# 용어 정리

본문에 들어가기 전에 이번 글에 나오는 용어부터 정리하여한다.

> **LLM (Large Language Model, 대규모 언어모델)**
>
> 대량의 텍스트를 학습해서, 입력받은 문장(프롬프트) 다음에 올 내용을 확률적으로 예측하며 답을 만들어내는 모델이다. 우리는 AI와 대화를 하고 있다고 느끼지만, LLM은 자동완성처럼 다음 말을 확률적으로 계속 채워 넣고 있는 것이다.
>
> 조금 더 자세히 얘기하자면, 입력된 문장(컨텍스트)을 받아 다음에 올 단어마다 확률을 매기는 함수에 가깝다. 이 함수가 어떤 답을 낼지는 학습으로 정해진 수많은 숫자, **가중치(파라미터)**가 결정한다. GPT-3만 해도 이 숫자가 약 1,750억 개였고, 학습은 다음 단어를 더 잘 맞히도록 이 숫자들을 조금씩 고쳐 나가는 과정이다. 답을 만들 때는 매번 확률이 가장 높은 단어만 고르지 않고, 가끔 확률이 낮은 단어도 섞어서 고른다. 같은 질문에도 답이 조금씩 다르게 나오고, 말투가 기계적이지 않은 이유이다.
>
> 인터넷의 방대한 텍스트로 다음 단어를 맞히는 학습(사전 학습)만 거치면 그럴듯한 문장은 이어 쓰지만, 질문에 맞춰 답하는 조수 역할은 잘 못한다. 그래서 사람이 답변을 평가하고, 그 평가를 바탕으로 모델을 다시 조정하는 **RLHF(사람 피드백 기반 강화학습)**를 거친다. ChatGPT, Claude, Gemini처럼 지금 우리가 대화하며 쓰는 서비스들은 이 과정까지 거친 모델이다
>
> 처음 GPT를 접했을 때 답변이 한 단어씩 찔끔찔끔 나오던 게 기억난다. 다음 단어 하나를 예측하고, 그걸 붙여 다시 다음 단어를 예측하는 구조였기에 그런 모습을 보였던 것이다. 지금처럼 자연스럽게 대화하는 수준까지 끌어올린 것이 2017년 구글이 발표한 **Transformer**이다. 그 전의 모델은 문장을 앞에서부터 한 단어씩 순서대로 읽었는데, Transformer는 문장 전체를 한 번에 받아 병렬로 처리한다.
>
> 흐름은 단어를 모델이 다룰 수 있는 숫자 목록(벡터)으로 바꾼다. 다음 **Attention** 단계에서 각 단어가 주변 단어를 참고해 자기 의미를 맥락에 맞게 조정한다. 문장 안의 단어끼리 서로 얼마나 관련 있는지 점수를 매기고, 관련이 높은 단어의 의미를 더 많이 반영하는 방식이다. 가령 "배"가 먹는 배인지 타는 배인지를 앞뒤 주변 단어를 보고 정하는 식이다. 이어서 **Feed Forward** 단계에서 학습된 지식을 바탕으로 각 벡터를 한 번 더 다듬는다. 이 두 단계를 계~~속 수차례 반복한 뒤, 양질의 마지막 최종 벡터로 다음 단어의 확률을 계산한다.
>
> GPT, Claude, Gemini 모두 이 Transformer 기반의 LLM이다. 그리고 LLM은 글자를 그대로 읽지 않고, 텍스트를 **토큰**이라는 단위로 바꾼 숫자 배열을 입력으로 받는다.
>
> LLM 관련 내용의 학습과 정리는 아래 영상을 참고하였다.
<bookmark url="https://www.youtube.com/watch?v=HnvitMTkXro"></bookmark>

> **토큰 (Token)**
>
> AI를 쓰다 보면 토큰이라는 말을 자주 보게된다. API 요금표는 "100만 토큰당 얼마"로 적혀 있고, Claude Code 같은 Agent를 오래 쓰다 보면 컨텍스트가 몇 % 남았다거나 사용량 한도에 가까워졌다는 안내가 뜬다. 대화가 길어지면 앞 내용을 요약하고 넘어가는 것도 같은 이유이다. LLM은 이전 대화를 기억하지 않아서, 질문할 때마다 지금까지의 대화 전체를 다시 입력으로 보낸다. 대화가 쌓일수록 한 번에 보내는 토큰이 늘어나고, 결국 한도에 닿게 된다. 토큰 소모량을 줄이고자 요약본, 답변 출력문 방식 설정 등을 하는 것이 이것에 기반한 최근 절약 팁들이다.
>
> 아무튼 토큰은 LLM이 텍스트를 처리하는 단위이다. 글자도 아니고 단어도 아닌, 학습 데이터에서 자주 붙어 나온 바이트 묶음이다. 그래서 같은 글자 수라도 언어나 내용에 따라 토큰 수가 달라진다. API 비용, 처리 한도, 응답 속도가 모두 이 토큰 수를 기준으로 정해진다.

> **토큰 ID**
>
> 토큰 하나에 붙은 정수 번호이다. 가령 `"hello"`는 `24912`처럼 숫자 하나로 바뀐다.
>
> 모델은 글자를 읽지 못하고 숫자만 계산할 수 있어서, 텍스트를 먼저 이 번호 배열로 바꿔서 넘긴다. 번호는 토크나이저가 가진 어휘 사전에서 그 토큰이 몇 번째 항목인지를 뜻한다. 그래서 같은 토크나이저라면 `"hello"`는 언제 넣어도 같은 번호가 나오고, 토크나이저가 다르면 같은 단어도 다른 번호가 된다.
>
> 모델 안에서는 이 번호마다 미리 학습된 벡터가 하나씩 연결되어 있다. 위 LLM 설명에서 "단어를 숫자 목록(벡터)으로 바꾼다"고 한 단계가 이 번호로 벡터를 찾아오는 과정이다.

![텍스트가 토크나이저를 거쳐 토큰 ID 배열로](/assets/AI/ai-workspace-tool-2/token-id-flow.webp)


> **토크나이저 (Tokenizer)**
>
> 텍스트를 토큰 ID 배열로 바꾸고(encode), 반대로 토큰 ID를 텍스트로 되돌리는(decode) 도구이다. 토크나이저는 모델을 학습할 때 같이 정해지고, 그 모델은 계속 같은 토크나이저를 써야 한다. 그래서 회사마다, 모델과 모델 버전마다 토크나이저가 다르고, 같은 문장도 모델에 따라 토큰 수가 다르게 나온다.
>
> 아래 구현에서는 OpenAI 토크나이저의 JavaScript 구현인 `js-tiktoken`을 썼다. 쪼개고 합치는 알고리즘(`Tiktoken` 클래스)에 어휘 사전(ranks)을 넣으면 인코더가 만들어지고, 이 인코더의 `encode()`, `decode()`로 텍스트와 토큰 ID를 오간다. 반면 Gemini는 토크나이저를 공개하지 않아서, 정확한 토큰 수는 API를 사용해야 파악할 수 있다.

> **BPE (Byte Pair Encoding)**
>
> 토큰 사전을 만드는 알고리즘이다. 텍스트를 바이트 단위로 쪼갠 뒤, 가장 자주 붙어 나오는 쌍을 하나로 합치는 작업을 정해둔 횟수만큼 반복한다. `l o w`가 `lo w`, 다시 `low`가 되는 식이다. 그래서 자주 쓰는 단어는 토큰 하나가 되고, 드문 글자는 잘게 쪼개진 채 남는다.

> **인코딩 (Encoding)과 ranks**
>
> 인코딩은 토크나이저 규칙 세트에 붙인 이름이고, ranks는 그 인코딩의 실제 사전 데이터이다. 어떤 바이트 묶음이 몇 번 토큰인지 적혀 있는데, BPE에서 합쳐진 순서대로 번호가 붙어서 순위(rank)라고 부른다. 번호가 작을수록 일찍 합쳐진, 자주 나오는 묶음이다.
>
> 아래에서는 OpenAI의 인코딩 두 개를 사용했다. 이름 앞의 숫자가 어휘 수를 뜻한다.
>
> | 인코딩 | 쓰는 모델 | 어휘 수 |
> |---|---|---|
> | `o200k_base` | GPT-4o 이후 | 약 20만 |
> | `cl100k_base` | GPT-4, GPT-3.5 | 약 10만 |
>
> 어휘가 많을수록 더 긴 묶음을 토큰 하나로 처리할 수 있어서, 같은 문장도 토큰 수가 적게 나오는 편이다. 특히 한국어처럼 영어보다 학습 데이터가 적은 언어에서 차이가 크게 난다.

> **UTF-8 바이트**
>
> 컴퓨터가 글자를 저장하는 방식이다. 영문은 1바이트, 한글은 3바이트, 이모지는 4바이트로 글자마다 크기가 다르다. BPE는 이 바이트를 재료로 토큰을 만들기 때문에, 바이트가 많은 글자일수록 토큰도 많이 쓰는 경향이 있다.

> **대체 문자 `�`와 partial**
>
> 글자 하나가 토큰 두 개 이상으로 쪼개지는 경우가 있다. 가령 🚀는 4바이트인데, 이 4바이트를 한 번에 묶은 토큰이 사전에 없으면 2바이트씩 토큰 두 개로 나뉜다. 두 토큰을 같이 decode하면 🚀가 되지만, 토큰 하나만 decode하면 2바이트뿐이라 어떤 글자인지 알 수 없다. 이렇게 완성되지 않은 자리에 �가 들어간다. 이번 구현에서는 이런 토큰을 **바이트 조각(partial)**으로 표시했다.

> **Context Window**
>
> 모델이 한 번에 다룰 수 있는 토큰 수의 상한이다. 보통 입력과 출력을 합친 값이다.

---

# 진행 방식

토큰 계산기는 AI가 제안한 로드맵에 따라 아래 순서로 구현했다. 이번 포스팅은 1, 2단계 내용을 담았다.

<roadmap title="토큰 계산기 진행 단계">

1. **Next.js 프로젝트 생성, 패키지 설치, 환경변수**
2. **토큰화 함수 만들기와 콘솔 확인**
3. **입력 화면과 토큰 분할 시각화**
4. **Gemini `countTokens` 서버 라우트**
5. **Context Window 사용률과 출력 예약**
6. **비교 실험과 결과표 작성**

</roadmap>

토큰 계산 로직은 화면 코드와 섞지 않고 `lib/tokenizer.ts`에 순수 함수로 분리했다. 나중에 AI WorkSpace 본 프로젝트로 그대로 옮겨 쓰기 위해서이다.

---

# 프로젝트 생성

Next.js 프로젝트를 만들고 패키지 두 개를 설치했다.

```cmd
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
npm install js-tiktoken @google/genai
```

- `js-tiktoken` — OpenAI 토크나이저의 JavaScript 구현이다. 브라우저에서 토큰을 셀 때 쓴다.
- `@google/genai` — Gemini 공식 SDK이다. 서버에서 정확한 토큰 수를 받아올 때 쓴다.

---

# 라이브러리 구조 살펴보기

함수를 만들기 전에 `js-tiktoken`이 어떻게 생겼는지 직접 열어봤다.

## Gemini 토크나이저는 어디..?

`js-tiktoken`의 타입 정의를 보면 지원하는 인코딩과 모델 목록이 있는데, 모두 OpenAI 모델이다.

```ts
type TiktokenEncoding = "gpt2" | "r50k_base" | "p50k_base" | "p50k_edit" | "cl100k_base" | "o200k_base";
```

Gemini는 토크나이저 파일을 공개하지 않는다. 따라서 브라우저에서 Gemini 토큰 수를 정확히 셀 방법은 없고, 정확한 값은 Gemini의 `countTokens` API로만 얻을 수 있다.

이번 구현에서 `js-tiktoken`은 타이핑할 때마다 네트워크 없이 보여주는 **근사치**, 그리고 BPE가 텍스트를 어떻게 쪼개는지 눈으로 확인하는 용도로 쓰고자 한다. 토큰을 세는 방법은 세 가지이다.

| 방법 | 정확도 | 용도 |
|---|---|---|
| 로컬 토크나이저 (`js-tiktoken`) | 해당 토크나이저를 쓰는 모델만 정확, 나머지는 근사치 | 입력 중 실시간 미리보기 |
| Provider 토큰 카운트 API (Gemini `countTokens`) | 해당 모델 기준 정확 | 보내기 전 한도 검사 |
| 응답의 `usage` | 실제 과금 기준 | 비용 기록 |

## import 경로와 실제 파일

`node_modules/js-tiktoken/dist`를 열어보면 같은 이름의 파일이 `.js`(ES Module), `.cjs`(CommonJS), `.d.ts`(타입 선언) 세 개씩 있다. `dist/ranks/` 안에는 인코딩마다 사전 파일이 하나씩 있고, `lite`는 가벼운 진입점, `index`는 모든 사전까지 함께 불러오는 진입점이다.

내부의 `Tiktoken` 클래스의 타입도 확인해보자.

```ts
interface TiktokenBPE {
    pat_str: string;
    special_tokens: Record<string, number>;
    bpe_ranks: string;
}
declare class Tiktoken {
    constructor(ranks: TiktokenBPE, extendedSpecialTokens?: Record<string, number>);
    encode(text: string, ...): number[];
    decode(tokens: number[]): string;
}
```

생성자가 `TiktokenBPE`, 사전 데이터를 인자로 받는다. `Tiktoken` 클래스는 바이트를 쪼개고 합치는 알고리즘이고, 여기에 사전을 넣어 `new Tiktoken(ranks)`를 해야 `encode()`, `decode()`를 쓸 수 있는 인코더가 만들어진다. 알고리즘은 같고 사전만 바꿔 끼우면 다른 인코딩의 인코더가 되는 구조이다.

---

# 토큰화 함수 만들기

`src/lib/tokenizer.ts`에 타입 하나와 함수 세 개를 구현했다.

## TokenPiece 타입

```ts
type TokenPiece = {
    id: number;
    text: string;
    partial: boolean;
}
```

`encode()`는 숫자 배열만 돌려주기 때문에, 화면에 토큰을 하나씩 그리려면 토큰마다 정보를 묶어야 한다.

| 필드 | 내용 |
|---|---|---|
| `id` | 토큰 ID |
| `text` | 그 토큰이 나타내는 문자열 |
| `partial` | 바이트 조각인지 |

## getTokenizer — 인코더를 한 번만 만들어 건네주는 함수

```ts
const tokenMap = new Map<TiktokenEncoding, Promise<Tiktoken>>();

const getTokenizer = async (name: TiktokenEncoding) => {
    const tokenInstance = tokenMap.get(name);
    if (tokenInstance) return tokenInstance;
    const encodingPromise = async (name: TiktokenEncoding) => {
        let ranks: TiktokenBPE;
        if (name === 'o200k_base') {
            ranks = (await import("js-tiktoken/ranks/o200k_base")).default
        }
        else if (name === 'cl100k_base') {
            ranks = (await import("js-tiktoken/ranks/cl100k_base")).default
        }
        else {
            throw new Error(`Invalid ranks name:${name}`)
        }
        const encoder = new Tiktoken(ranks);
        return encoder;
    }

    const encoded = encodingPromise(name).catch(
        (error) => {
            tokenMap.delete(name);
            throw error;
        }
    );
    tokenMap.set(name, encoded);
    return encoded
}
```

인코딩 이름을 받아 인코더 인스턴스를 반환한다. 흐름은 다음과 같다.

```
getTokenizer("o200k_base")
  │
  ├─ 1. 캐시 확인 → 있으면 저장된 Promise 반환
  ├─ 2. encodingPromise(name) 호출 → 즉시 Promise 반환
  │       └─ 사전 동적 import → .default 꺼내기 → new Tiktoken(ranks)
  ├─ 3. .catch() 연결 → 실패하면 캐시에서 지우고 에러를 다시 던짐
  ├─ 4. 완성을 기다리지 않고 Promise를 바로 캐시에 저장
  └─ 5. Promise 반환
```

동적 import 경로는 인코딩마다 문자열을 통째로 적었다. 템플릿 문자열로 조합하면 번들러가 빌드 시점에 어떤 파일이 필요한지 알 수 없고, TypeScript도 결과를 `any`로 처리해서 타입 검사가 꺼진다.

캐시에는 인스턴스가 아니라 **Promise**를 저장했다. 인스턴스를 저장하면 사전을 불러오는 동안 캐시가 비어 있어서, 그 사이에 같은 요청이 들어오면 사전을 또 파싱한다. Promise를 호출 즉시 저장해두면 두 번째 요청은 진행 중인 Promise를 받아 같이 기다린다. 무거운 작업은 파일 다운로드보다 `new Tiktoken(ranks)`에서 수십만 개 항목을 정리하는 쪽이라, 생성 과정 전체를 묶어서 캐시했다.

대신 Promise를 캐시하면 실패한 Promise도 남는다. 그래서 `.catch()`에서 캐시를 지우고 에러를 다시 던지게 했다. 콜백에서 값을 반환하면 Promise가 성공으로 처리되기 때문에, 다시 던져야 호출한 쪽이 실패를 알 수 있다.

지원하지 않는 인코딩 이름은 에러를 반환하지 않고 던졌다. 반환하면 타입이 `Promise<Tiktoken | Error>`로 섞여서 호출하는 쪽에서 매번 검사해야 하지만, 던지면 `Promise<Tiktoken>` 하나로 유지된다.

## tokenize — 텍스트를 화면에 그리기 좋은 모양으로 바꾸는 함수

```ts
const tokenize = (enc: Tiktoken, text: string):TokenPiece[] => {
    const tokenIds = enc.encode(text);

    return tokenIds.map((id)=>{
        const decodedString = enc.decode([id]);
        return {
            id,
            text: decodedString,
            partial: decodedString.includes("�")
        }
    });
}
```

1. `enc.encode(text)`로 텍스트를 토큰 ID 배열로 바꾼다.
2. ID마다 `enc.decode([id])`로 그 토큰 하나만 다시 문자열로 바꾼다. 전체를 한 번에 decode하면 원래 문장이 나올 뿐 토큰 경계가 보이지 않는다.
3. 바꾼 문자열에 `�`가 있으면 `partial: true`로 표시한다.

인코더를 이미 준비된 상태로 받기 때문에 `async`는 필요 없다.

## utf8Bytes — UTF-8 바이트 수를 세는 함수

```ts
const utf8Bytes = (text: string) => {
    return new TextEncoder().encode(text).length
}
```

브라우저 내장 `TextEncoder`로 텍스트를 바이트 배열로 바꿔 길이를 반환한다. 글자 수, 바이트 수, 토큰 수를 나란히 보여주기 위해 만들었다. 바이트 수를 같이 보면 한국어가 왜 토큰을 더 쓰는지 숫자로 확인할 수 있다.

## 최종 코드

위 내용을 합친 `src/lib/tokenizer.ts` 전체 코드이다.

```ts
import { Tiktoken } from "js-tiktoken/lite"
import type { TiktokenBPE, TiktokenEncoding } from "js-tiktoken";

type TokenPiece = {
    id: number;
    text: string;
    partial: boolean;
}

const tokenMap = new Map<TiktokenEncoding, Promise<Tiktoken>>();

const getTokenizer = async (name: TiktokenEncoding) => {
    const tokenInstance = tokenMap.get(name);
    if (tokenInstance) return tokenInstance;
    const encodingPromise = async (name: TiktokenEncoding) => {
        let ranks: TiktokenBPE;
        if (name === 'o200k_base') {
            ranks = (await import("js-tiktoken/ranks/o200k_base")).default
        }
        else if (name === 'cl100k_base') {
            ranks = (await import("js-tiktoken/ranks/cl100k_base")).default
        }
        else {
            throw new Error(`Invalid ranks name:${name}`)
        }
        const encoder = new Tiktoken(ranks);
        return encoder;
    }

    const encoded = encodingPromise(name).catch(
        (error) => {
            tokenMap.delete(name);
            throw error;
        }
    );
    tokenMap.set(name, encoded);
    return encoded
}

const tokenize = (enc: Tiktoken, text: string):TokenPiece[] => {
    const tokenIds = enc.encode(text);

    return tokenIds.map((id)=>{
        const decodedString = enc.decode([id]);
        return {
            id,
            text: decodedString,
            partial: decodedString.includes("�")
        }
    });
}

const utf8Bytes = (text: string) => {
    return new TextEncoder().encode(text).length
}

export { getTokenizer, tokenize, utf8Bytes, type TokenPiece }
```

---

# 결과 확인

화면을 만들기 전에 `page.tsx`에서 다섯 문자열을 두 인코딩으로 쪼개 콘솔에 찍어봤다.

```tsx
"use client";

import { useEffect } from "react";
import { getTokenizer, tokenize, utf8Bytes } from "@/lib/tokenizer";

const SAMPLES = [
  "hello world",
  "안녕하세요",
  "토큰은 글자가 아닙니다",
  "🚀",
  '{"name": "kim", "age": 30}',
];

export default function Home() {
  useEffect(() => {
    const run = async () => {
      const o200k = await getTokenizer("o200k_base");
      const cl100k = await getTokenizer("cl100k_base");

      const summary = SAMPLES.map((text) => ({
        입력: text,
        글자수: [...text].length,
        바이트수: utf8Bytes(text),
        o200k: tokenize(o200k, text).length,
        cl100k: tokenize(cl100k, text).length,
      }));
      console.table(summary);

      for (const text of SAMPLES) {
        console.log(`▼ ${text}`);
        console.table(tokenize(o200k, text));
      }
    };

    run().catch(console.error);
  }, []);

  return <main>콘솔을 확인하세요</main>;
}
```

글자 수는 `text.length`가 아니라 `[...text].length`로 셌다. JavaScript 문자열의 `length`는 UTF-16 단위라서 이모지 하나를 2로 센다.

## 요약

![입력별 글자, 바이트, 토큰 수](/assets/AI/ai-workspace-tool-2/01-summary.webp)

| 입력 | 글자 수 | 바이트 수 | o200k | cl100k |
|---|---|---|---|---|
| `hello world` | 11 | 11 | 2 | 2 |
| `안녕하세요` | 5 | 15 | 2 | 5 |
| `토큰은 글자가 아닙니다` | 12 | 32 | 8 | 14 |
| `🚀` | 1 | 4 | 2 | 3 |
| `{"name": "kim", "age": 30}` | 26 | 26 | 12 | 12 |

영어와 JSON은 두 인코딩 결과가 같았지만, 한국어와 이모지는 차이가 컸다. `안녕하세요`는 o200k에서 2토큰, cl100k에서 5토큰이다. 어휘 사전이 큰 인코딩일수록 한국어를 적은 토큰으로 처리한다는 게 숫자로 드러났다.

## hello world

![hello world 토큰 분할](/assets/AI/ai-workspace-tool-2/02-hello-world.webp)

`hello`와 ` world` 두 토큰으로 나뉘었다. 두 번째 토큰은 앞 공백까지 포함한 ` world`이다. BPE는 공백과 단어를 묶어 토큰 하나로 만들기 때문에, 영어 문장은 단어 수와 토큰 수가 거의 같게 나온다.

## 안녕하세요

![안녕하세요 토큰 분할](/assets/AI/ai-workspace-tool-2/03-annyeong.webp)

`안`과 `녕하세요`로 나뉘었다. 사람이라면 `안녕`과 `하세요`로 끊겠지만, BPE는 뜻이 아니라 순위대로 합친다. `녕하세요`를 이루는 쌍들이 사전에서 순위가 높아 먼저 합쳐졌고, `안녕하세요` 전체는 사전에 없어서 `안`이 따로 남았다. 토큰 경계는 사람이 생각하는 단어 경계와 다를 수 있다.

## 토큰은 글자가 아닙니다

![토큰은 글자가 아닙니다 토큰 분할](/assets/AI/ai-workspace-tool-2/04-token-sentence.webp)

열두 글자가 여덟 토큰이 되었다. 눈에 띄는 건 `아닙니다`의 `닙`이다. 토큰을 순서대로 보면 ` 아�`, `�`, `니다`인데, 첫 토큰은 공백과 `아`에 `닙`의 바이트 일부가 붙은 것이고, 두 번째 토큰이 `닙`의 나머지 바이트이다. 두 토큰 모두 혼자서는 `닙`을 완성하지 못해서 `�`가 보이고 `partial: true`가 된다.

`닙`처럼 덜 쓰이는 글자는 3바이트가 한 토큰으로 합쳐져 있지 않아서 앞뒤 토큰에 걸쳐 나뉜다. 이모지 같은 특수 문자만이 아니라 **일반 한글도 바이트 단위로 쪼개질 수 있다**는 걸 보여주는 결과이다.

## 🚀

![🚀 토큰 분할](/assets/AI/ai-workspace-tool-2/05-rocket.webp)

글자 하나가 토큰 두 개가 되었고, 둘 다 `�`로 표시되는 바이트 조각이다. 4바이트를 통째로 합친 묶음이 사전에 없어서 작은 묶음 두 개로 나뉘었다. 두 토큰을 함께 decode해야 🚀가 된다.

## JSON

![JSON 토큰 분할](/assets/AI/ai-workspace-tool-2/06-json.webp)

26글자가 12토큰이 되었다. `{"`, `":`, ` "`, `",` 같은 기호 조합이 각각 토큰을 차지한다. 같은 정보라도 JSON 형식으로 보내면 기호에도 토큰을 쓰게 된다. LLM에 데이터를 넘길 때 형식에 따라 비용이 달라질 수 있다는 뜻이다.

---

# 다음 할 일

다음 글에서는 콘솔 대신 화면을 만든다. 입력창에 텍스트를 넣으면 글자, 바이트, 토큰 수가 바로 바뀌고, 토큰마다 색깔 칸으로 나눠 보여주며, `partial` 토큰은 점선으로 구분할 예정이다. 이번에 만든 `TokenPiece` 타입과 세 함수를 그대로 가져다 쓴다.
