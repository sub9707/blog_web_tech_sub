---
title: "AI 워크스페이스 툴 제작기 (3) — 토큰 계산기 기능 완성"
date: "2026-11-16"
description: "토큰 계산기 구현 기록. 입력 화면 구현, 토큰을 색깔별로 나누고, 글자 수 세는 기준을 정리"
tags: ["ai", "llm", "token", "tokenizer", "react", "unicode", "사이드프로젝트"]
thumbnail: "/assets/thumbnails/ai/ai-workspace-tool.webp"
---

지난 글에서는 텍스트를 토큰으로 쪼개는 함수를 만들고 콘솔로 결과를 확인했다. 이번에는 그 결과를 화면상에 볼 수 있도록 구현했다. 입력창에 글을 넣으면 글자 수, 바이트 수, 두 인코딩의 토큰 수가 바로 바뀌고, 토큰마다 색깔 칸으로 나뉘어 보이게 하는 것이 계산기 구현의 마무리이다.

만드는 도중에 🚀같은 이모지를 하나를 넣었더니 글자 수가 2로 나왔다. 원인을 따라가 보니 "글자 수"를 세는 기준이 보이는 글자 하나가 아니었고, 이 부분도 따로 정리해두었다.

<callout title="이 글에서 다루는 것">

- 유니코드 관련 용어 정리 (코드 유닛, 코드 포인트, 그래핌)
- 입력 화면과 상태 설계
- 토큰 칩 그리기와 두 인코딩 비교
- 화면에서 확인한 결과

</callout>

---

# 용어 정리

> **UTF-16 코드 유닛**
>
> JavaScript 문자열이 내부에서 글자를 저장하는 단위이다. 글자 한 칸이 16비트라 `0x0000`부터 `0xFFFF`까지만 담을 수 있다. `text.length`와 `text[i]`는 이 칸을 기준으로 동작한다.

> **코드 포인트 (Code Point)**
>
> 유니코드가 문자 하나하나에 붙인 고유 번호이다. `A`는 `U+0041`, `가`는 `U+AC00`, `🚀`는 `U+1F680`이다. 눈에 보이지 않는 문자도 번호가 따로 있다.

> **서로게이트 쌍 (Surrogate Pair)**
>
> 번호가 `0xFFFF`보다 큰 문자를 UTF-16 "두 칸"으로 나눠 저장하는 방식이다. 유니코드는 `0xD800`~`0xDFFF` 구간을 글자에 배정하지 않고 비워 두었고, 앞쪽 반쪽은 `0xD800`~`0xDBFF`, 뒤쪽 반쪽은 `0xDC00`~`0xDFFF`를 쓴다. 이 범위의 값이 보이면 실제 글자가 아니라 쌍의 반쪽이라는 의미이다.
>
> 🚀 이모지는 `U+1F680`이라 한 칸에 들어가지 않고, `[0xD83D, 0xDE80]` 두 칸으로 저장된다.

> **문자열 이터레이터**
>
> `for...of`, 스프레드(`...`), `Array.from`이 문자열을 순회할 때 쓰는 방식이다. ES2015에서 서로게이트 쌍을 만나면 두 칸을 합쳐 하나로 돌려주도록 정했다. 그래서 결과가 코드 포인트 단위가 된다.
>
> 반면 `.length`는 1995년부터 있던 기능이라, 하위 호환 때문에 칸 단위 그대로 남아 있다.

> **그래핌 클러스터 (Grapheme Cluster)**
>
> 사람 눈에 글자 하나로 보이는 단위이다. 보통은 코드 포인트 하나가 글자 하나지만, 여러 코드 포인트가 모여 글자 하나처럼 보이는 경우도 있다.
>
> 가족 이모지 `👨‍👩‍👧`가 그 예이다. 데이터로는 남자, 여자, 여자아이 이모지 세 개가 ZWJ로 이어진 코드 포인트 다섯 개인데, 화면에는 이모지 하나로 그려진다. 이렇게 눈에 보이는 대로 묶은 한 덩어리를 그래핌 클러스터라고 한다.
>
> JavaScript에서는 `Intl.Segmenter`로 이 단위를 하나로써 셀 수 있다.

> **ZWJ (Zero Width Joiner, `U+200D`)**
>
> 앞뒤 이모지를 하나로 합쳐 그리라는 표시이다. 입력 화면에서는 너비가 0이라 보이지 않지만, 데이터로는 문자 하나이고 UTF-8로 3바이트를 차지한다.
>
> 키보드로 직접 칠 수는 없고, 이모지 선택창(`Win + .`)에서 가족 이모지 같은 조합 이모지를 고르면 자동으로 들어간다. 코드에서는 `"‍"`로 쓴다.

---

# 진행 방식

이번 포스팅은 3단계 내용을 담았다.

<roadmap title="토큰 계산기 진행 단계">

1. **Next.js 프로젝트 생성, 패키지 설치, 환경변수**
2. **토큰화 함수 만들기와 콘솔 확인**
3. **입력 화면과 토큰 분할 시각화**
4. **Gemini `countTokens` 서버 라우트**
5. **Context Window 사용률과 출력 예약**
6. **비교 실험과 결과표 작성**

</roadmap>

3단계는 한 번에 만들지 않고 다섯 개로 나눠서 진행했다.

| 순서 | 내용 |
|---|---|
| 3-1 | 입력 상태, 글자 수와 바이트 수 |
| 3-2 | 인코더 호출로 토큰 수 표시 |
| 3-3 | 토큰 칩 그리기 (색, 공백 표시, partial 점선 스타일링) |
| 3-4 | o200k와 cl100k 나란히 비교 |
| 3-5 | 샘플 입력 버튼 |

---

# 화면 뼈대와 입력 상태

코드를 짜기 전에 화면을 세 덩어리로 나눴다.

- 입력 영역
- 숫자 영역 (글자 수, 바이트 수, 토큰 수)
- 토큰 칩 영역

state는 **입력 문자열 하나**만 다뤘다. 글자 수, 바이트 수, 토큰 배열은 모두 입력 문자열 state에서 계산하면 나오기 때문에 상태로 따로 담지 않았다.

```tsx
const [inputState, setInputState] = useState<string>('');

const inputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
  setInputState(e.target.value);
}
```

글자 수와 바이트 수는 인코더 없이 바로 계산할 수 있어 먼저 붙였다.

처음에는 글자 수를 `inputState.length`로 셌는데 🚀를 넣자 글자 수가 1이 아니라 2로 나왔다... `.length`는 UTF-16의 "칸 수"를 세기 때문에 이런 현상이 발생한 것. 지난 글의 콘솔 코드에서 `[...text].length`를 썼던 이유가 이것이었다. 같은 계산을 여러 곳에서 쓸 것 같아 `lib/tokenizer.ts`에 따로 옮겼다.

```ts
const getTextLength = (text: string): number => {
  return [...text].length;
}
```

## "글자 수"의 기준

🚀는 해결됐지만, 이번엔 가족 이모지 `👨‍👩‍👧`를 넣었더니 글자 수가 5로 나왔다. 이 이모지는 코드 포인트 다섯 개로 이루어져 합쳐진 상태다.

```
👨  U+1F468  남자
‍   U+200D   ZWJ
👩  U+1F469  여자
‍   U+200D   ZWJ
👧  U+1F467  여자아이
```

문자열 이터레이터는 서로게이트 쌍은 합쳐 주지만, ZWJ로 이어진 조합까지 하나로 보지는 않는다. 그래서 같은 문자열도 어떤 기준으로 세느냐에 따라 숫자가 달라진다.

| 기준 | 세는 방법 | 👨‍👩‍👧 | 🚀 |
|---|---|---|---|
| UTF-16 코드 유닛 | `text.length` | 8 | 2 |
| 코드 포인트 | `[...text].length` | 5 | 1 |
| 그래핌 클러스터 | `Intl.Segmenter` | 1 | 1 |

같은 🚀도 번호로 세면 1, UTF-16으로 세면 2, UTF-8 바이트로 세면 4이다. 숫자가 예상과 다르게 나오면 지금 어떤 단위로 세고 있는지부터 확인해야 한다.

이번 계산기는 토큰이 바이트와 코드 포인트를 기준으로 쪼개지는 걸 보여주는 게 목적이라, 코드 포인트 기준을 그대로 두었다.

---

# 인코더 호출로 토큰 수 표시

`getTokenizer`는 Promise를 반환하기 때문에, 처음 렌더링할 때는 인코더가 아직 없다. 인코더는 "없음"에서 "준비됨"으로 바뀌는 값이니 state로 만들고, 초기값은 `null`로 두었다.

```tsx
const [token_o200k, setToken_o200k] = useState<Tiktoken | null>(null);

useEffect(() => {
  const run = async () => {
    const tokenizer = await getTokenizer("o200k_base");
    setToken_o200k(tokenizer);
  }
  run().catch(console.error);
}, []);
```

토큰 배열은 상태로 두지 않고, 렌더링 본문에서 인코더가 있을 때만 계산한다. 토큰 수는 이 배열의 `length`이다.

```tsx
let tokenArr_o200k: TokenPiece[] = [];
if (token_o200k) { tokenArr_o200k = tokenize(token_o200k, inputState); }
```

---

# 토큰 칩 그리기

토큰 배열을 `map`으로 돌려 토큰 하나당 `<span>` 하나를 그렸다.

```tsx
{tokenArr_o200k.map((tkn, idx) =>
  <span
    title={String(tkn.id)}
    key={idx}
    className={`${TOKEN_COLORS[idx % TOKEN_COLORS.length]} ${tkn.partial ? "border border-dashed" : ""}`}
  >
    {tkn.text.replaceAll(' ', '·').replaceAll('\n', '↵')}
  </span>
)}
```

하나씩 살펴보면 다음과 같다.

- **key** — 토큰 ID는 key로 쓸 수 없다. `"the the"`처럼 같은 ID가 반복되면 key가 겹친다. 토큰 배열은 입력이 바뀔 때마다 렌더링되어 처음부터 다시 계산되기 때문에, 이번에는 index를 key로 써도 문제가 없었다.
- **공백 표시** — `" world"`의 앞 공백이 칩 안에서 보이지 않아서, 화면에 그릴 때만 공백은 `·`, 줄바꿈은 `↵`로 바꿨다.
- **partial** — `partial`이 `true`인 토큰만 점선 테두리를 붙였다.
- **title** — 마우스를 올리면 토큰 ID가 보이게 했다.

---

# o200k와 cl100k 비교

인코더 상태와 토큰 배열을 하나씩 더 만들고, 칩 영역도 하나 더 그렸다.

![안녕하세요 o200k와 cl100k 비교](/assets/AI/ai-workspace-tool-3/01-annyeong-compare.webp)

o200k는 `안` / `녕하세요` 2토큰이다. cl100k는 `안녕`(6바이트)을 바이트 조각 4개로 쪼갰다. cl100k 사전에는 `안`과 `녕`이 통째로 들어 있지 않다는 뜻이다. 반면 `하세요`는 cl100k에서도 한 토큰이다.

---

# 샘플 버튼

`SAMPLES` 배열을 화면에서 바로 넣어 볼 수 있게 했다.

```tsx
const [inputIndex, setInputIndex] = useState<number>(0);

const inputSamples = () => {
  setInputState(SAMPLES[inputIndex % SAMPLES.length]);
  setInputIndex((prev) => prev + 1);
}
```

## 디자인

기능을 다 완성한 뒤 화면 스타일 정리는 Claude에게 맡겼다. 상태와 계산 로직은 그대로 두고 Tailwind 클래스만 가독성 좋게 바꾸도록 했다.


## 최종 코드

위 내용을 합친 `src/app/page.tsx` 전체 코드이다.

```tsx
"use client";
import { ChangeEvent } from 'react';
import { useEffect, useState } from "react";
import { getTextLength, getTokenizer, tokenize, TokenPiece, utf8Bytes } from "@/lib/tokenizer";
import { Tiktoken } from 'js-tiktoken';

const TOKEN_COLORS = [
  "bg-red-200",
  "bg-orange-200",
  "bg-amber-200",
  "bg-lime-200",
  "bg-emerald-200",
  "bg-cyan-200",
  "bg-blue-200",
  "bg-violet-200",
  "bg-pink-200",
];

const SAMPLES = [
  "hello world",
  "안녕하세요",
  "토큰은 글자가 아닙니다",
  "🚀",
  '{"name": "kim", "age": 30}',
];

export default function Home() {
  const [inputState, setInputState] = useState<string>('');
  const [inputIndex, setInputIndex] = useState<number>(0);
  const [token_o200k, setToken_o200k] = useState<Tiktoken | null>(null);
  const [token_cl100k, setToken_cl100k] = useState<Tiktoken | null>(null);

  let tokenArr_o200k: TokenPiece[] = [];
  let tokenArr_cl100k: TokenPiece[] = [];
  if (token_o200k) { tokenArr_o200k = tokenize(token_o200k, inputState); }
  if (token_cl100k) { tokenArr_cl100k = tokenize(token_cl100k, inputState); }

  const inputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputState(e.target.value);
  }

  const inputSamples = () => {
    setInputState(SAMPLES[inputIndex % SAMPLES.length]);
    setInputIndex((prev) => prev + 1);
  }

  useEffect(() => {
    const run = async () => {
      const tokenizer_o200k = await getTokenizer("o200k_base");
      const tokenizer_cl100k = await getTokenizer("cl100k_base");
      Promise.all([tokenizer_o200k, tokenizer_cl100k])
        .then((results) => {
          setToken_o200k(results[0]);
          setToken_cl100k(results[1]);
        }).catch((error) => {
          console.error(error);
        })
    }
    run().catch(console.error);
  }, []);

  return <main className='mx-auto w-full max-w-3xl px-4 py-10 flex flex-col gap-6'>
    <h1 className='text-2xl font-bold'>토큰 계산기</h1>

    <section className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold text-gray-500'>입력</h2>
        <button
          onClick={inputSamples}
          className='rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
        >
          샘플 입력
        </button>
      </div>
      <textarea
        value={inputState}
        onChange={inputChange}
        rows={4}
        placeholder='텍스트를 입력하세요'
        className='w-full rounded-lg border border-gray-300 bg-transparent p-3 outline-none focus:border-blue-500 dark:border-gray-700'
      ></textarea>
    </section>

    <section className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
      {[
        ['글자 수', getTextLength(inputState)],
        ['바이트 수', utf8Bytes(inputState)],
        ['o200k 토큰', token_o200k ? tokenArr_o200k.length : '…'],
        ['cl100k 토큰', token_cl100k ? tokenArr_cl100k.length : '…'],
      ].map(([label, value]) => (
        <div key={label} className='rounded-lg border border-gray-200 p-3 dark:border-gray-800'>
          <p className='text-xs text-gray-500'>{label}</p>
          <p className='text-2xl font-semibold tabular-nums'>{value}</p>
        </div>
      ))}
    </section>

    <section className='flex flex-col gap-2'>
      <h2 className='text-sm font-semibold text-gray-500'>o200k_base</h2>
      <div className='flex flex-wrap gap-1 min-h-8 text-gray-900 font-mono text-sm'>
        {tokenArr_o200k.map((tkn, idx) => <span title={String(tkn.id)} key={idx} className={`rounded px-1.5 py-0.5 ${TOKEN_COLORS[idx % TOKEN_COLORS.length]} ${tkn.partial ? "border border-dashed border-gray-700" : ""}`}>{tkn.text.replaceAll(' ', '·').replaceAll('\n', '↵')}</span>)}
      </div>
    </section>
    <section className='flex flex-col gap-2'>
      <h2 className='text-sm font-semibold text-gray-500'>cl100k_base</h2>
      <div className='flex flex-wrap gap-1 min-h-8 text-gray-900 font-mono text-sm'>
        {tokenArr_cl100k.map((tkn, idx) => <span title={String(tkn.id)} key={idx} className={`rounded px-1.5 py-0.5 ${TOKEN_COLORS[idx % TOKEN_COLORS.length]} ${tkn.partial ? "border border-dashed border-gray-700" : ""}`}>{tkn.text.replaceAll(' ', '·').replaceAll('\n', '↵')}</span>)}
      </div>
    </section>
  </main>;
}
```

---

# 결과 확인

샘플 다섯 개의 숫자는 지난 글의 콘솔 결과와 모두 같았다. 여기에 가족 이모지와 ZWJ를 끼운 문자열 두 개를 더 넣어봤다.

| 입력 | 글자 | 바이트 | o200k | cl100k |
|---|---|---|---|---|
| `hello world` | 11 | 11 | 2 | 2 |
| `안녕하세요` | 5 | 15 | 2 | 5 |
| `토큰은 글자가 아닙니다` | 12 | 32 | 8 | 14 |
| `🚀` | 1 | 4 | 2 | 3 |
| `{"name": "kim", "age": 30}` | 26 | 26 | 12 | 12 |
| `👨‍👩‍👧` | 5 | 18 | 8 | 13 |
| `a` + ZWJ + `b` | 3 | 5 | 3 | 4 |

## hello world

![hello world](/assets/AI/ai-workspace-tool-3/02-screen-hello-world.webp)

`hello`와 `·world`로 나뉜다. 공백을 `·`로 바꿔 보여주니, BPE가 앞 공백을 단어에 붙여 토큰을 만드는 게 바로 보인다.

## 안녕하세요

![안녕하세요](/assets/AI/ai-workspace-tool-3/03-screen-annyeong.webp)

## 토큰은 글자가 아닙니다

![토큰은 글자가 아닙니다](/assets/AI/ai-workspace-tool-3/04-screen-token-sentence.webp)

o200k에서 `닙`이 `·아�`와 `�` 두 칸에 걸쳐 점선으로 표시된다. cl100k에서는 열네 칸 중 아홉 칸이 바이트 조각이다.

## 🚀

![🚀](/assets/AI/ai-workspace-tool-3/05-screen-rocket.webp)

## JSON

![JSON](/assets/AI/ai-workspace-tool-3/06-screen-json.webp)

## 👨‍👩‍👧

![가족 이모지](/assets/AI/ai-workspace-tool-3/07-screen-family-emoji.webp)

사람에게는 한 글자로 보이지만 o200k에서 8토큰, cl100k에서 13토큰이 된다. o200k 줄에 **비어 보이는 칩 두 개**가 ZWJ이다. 너비가 0이라 화면에는 아무것도 없지만 토큰 하나씩을 차지하고 있다.

## a + ZWJ + b

![ZWJ](/assets/AI/ai-workspace-tool-3/08-screen-zwj.webp)

화면에는 `ab`로 보이지만 글자 3, 바이트 5이다. 복사, 붙여넣기 과정에서 이런 보이지 않는 문자가 섞여 들어오면, 토큰 수와 문자열 비교 결과가 눈치채지 못한 채 바뀔 수 있다.


---

# 남은 과정

다음 글에서는 Gemini `countTokens`를 서버 라우트로 붙인다. API Key가 브라우저로 나가면 안 되기 때문에 Route Handler를 거친다. 화면에는 로컬에서 바로 계산하는 tiktoken 숫자와 서버에서 받아오는 Gemini 숫자가 함께 표시될 예정이다.

두 숫자가 왜 다른지, 그리고 무료 한도 안에서 언제 API를 호출할지(입력할 때마다, debounce, 버튼)도 정할 예정.
