---
title: "React와 찰떡인 스타일링 방식은 무엇일까"
date: "2026-05-07"
description: "최근 React 스타일링 생태계의 흐름과 Tailwind CSS, Zero-runtime, React Compiler 시대의 변화 기록"
tags: ["react", "tailwindcss", "css"]
thumbnail: "/assets/thumbnails/814a06f2-0401-4045-8fd6-920b8453efc2.png"
---

React 스타일링 생태계는 몇 년 사이 굉장히 빠르게 변했다.

SSAFY에서 처음 React를 접하고 CSS 스타일링이 필요했을 때만 해도, SCSS나, CSS 모듈, tailwind, styled-components 등 선택지가 너무 많았고, 무엇이 팀 프로젝트에 가장 적합할지 고민해야했다.

다시 스타일링 생태계 이야기로 돌아와서,

예전엔 styled-components가 사실상 표준처럼 여겨졌고, 그 이전엔 CSS Modules가 많이 사용됐다. 하지만 지금 분위기는 꽤 다르다.

최근 React 프로젝트들을 보면 다음 키워드가 자주 등장한다.

- Tailwind CSS
- shadcn/ui
- cva / clsx
- Vanilla Extract
- StyleX

재밌는 건, 단순히 이들이 "유행이라서" 선택되는 게 아니라는 점이다.

> 지금 스타일링 생태계는 **DX + 런타임 성능 + 정적 분석**, 이 세 가지를 중심으로 재편되고 있다.

이 포스팅에서는 최근 React 스타일링 생태계가 왜 이런 방향으로 움직이는지, 그리고 어떤 선택지들이 주목받고 있는지 정리하고자 한다.

<br />


## 최근 React 스타일링의 핵심 흐름

최근 프론트엔드 스타일링 생태계를 한 줄로 요약하면 다음과 같다.

> **"런타임을 줄이고, 컴파일 타임으로 이동한다"**

이 흐름이 거의 모든 선택에 영향을 준다.

<br />

그렇다면 런타임과 컴파일 타임은 정확히 무엇이고, 스타일링에는 어떤 영향을 줬을까?

### 런타임 vs 컴파일 타임

![런타임과 컴파일 타임](/assets/CSS/runtime_compiletime.png)

**런타임(Runtime)** 은 코드가 브라우저에서 실행되는 시점이다.

styled-components 같은 CSS-in-JS 라이브러리는 런타임 방식이다. 컴포넌트가 렌더링될 때마다 JavaScript가 CSS 문자열을 만들고, 이를 `<style>` 태그로 DOM에 주입한다.

```
컴포넌트 렌더링 → JS 실행 → CSS 생성 → style 태그 삽입 → 브라우저 스타일 계산
```
<br/>

**컴파일 타임(Compile Time)** 은 코드를 빌드하는 시점이다.

Tailwind, Vanilla Extract 같은 도구는 빌드 과정에서 CSS를 미리 추출해 정적 파일로 만든다. 브라우저는 완성된 CSS 파일을 받아 바로 적용한다.

```
빌드 → CSS 추출 → 정적 파일 생성 → 브라우저에 전달 → 즉시 적용
```

<br />

이 차이가 CSS 생태계에 미친 영향을 표로 정리하면 다음과 같다.

| | 런타임 방식 | 컴파일 타임 방식 |
| --- | --- | --- |
| CSS 생성 시점 | 브라우저에서 렌더링마다 | 빌드 시 한 번 |
| JS 번들 크기 | 런타임 라이브러리 포함 | 거의 없음 |
| SSR 스타일 | 불일치 발생 가능 | 안정적 |
| RSC 호환 | 구조적으로 맞지 않음 | 자연스럽게 호환 |
| 대표 도구 | styled-components, Emotion | Tailwind, Vanilla Extract, StyleX |

RSC(React Server Components)가 등장한 이후 런타임 CSS-in-JS의 한계는 더 명확해졌다. <br/>서버 컴포넌트에서는 JavaScript를 클라이언트에 전달하지 않으므로, 런타임에 CSS를 생성하는 방식 자체가 성립하지 않는다.

<br />



## CSS-in-JS는 왜 예전같지 않을까

한때 styled-components는 React 스타일링의 대표 주자였다.

깃허브의 다른 이들의 코드만 봐도 JSX들이 마치 시맨틱 태그들처럼 의미있어보이고 구조적으로 예쁘게 딱딱 구성돼있었다.

```jsx
const ProfileCard = () => {
  return (
    <Card.Wrapper>
      <Card.Header>
        <Card.Avatar src="/profile.png" />
        <Card.Name>김철수</Card.Name>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          여기는 대충 설명문을 child로 넣는 곳입니다. 하하
        </Card.Description>
      </Card.Body>
      <Card.Footer>
        <FollowButton>팔로우 해주세요</FollowButton>
      </Card.Footer>
    </Card.Wrapper>
  );
};
```

`Card.Wrapper`, `Card.Header`, `Card.Body`. 점 하나가 붙으면서 컴포넌트들이 하나의 네임스페이스 아래 체계적으로 묶인 것처럼 보였다. HTML 시맨틱 태그보다도 더 의미 있어 보였고, 구조가 한눈에 들어왔다.

```jsx
const Card = {
  Wrapper: styled.section`padding: 1rem; border-radius: 8px;`,
  Header:  styled.header`display: flex; align-items: center;`,
  Avatar:  styled.img`width: 40px; height: 40px; border-radius: 50%;`,
  Name:    styled.h2`font-size: 1rem; font-weight: 600;`,
  Body:    styled.div`margin-top: 0.5rem;`,
  Footer:  styled.footer`border-top: 1px solid #eee; margin-top: 1rem;`,
};
```

이런 패턴이 처음엔 굉장히 있어 보였다. 컴포넌트와 스타일이 하나로 묶여 있고, 네이밍만 봐도 구조가 읽혔다. DX 측면에서는 정말 좋은 경험이었다.

하지만 시간이 지나면서 문제가 드러났다.

<br />

### 런타임 비용

많은 CSS-in-JS 라이브러리는 런타임에 동작한다. 컴포넌트가 렌더링될 때마다 다음 과정이 발생한다.

1. 컴포넌트 렌더링
2. CSS 문자열 생성
3. `<style>` 태그 삽입
4. 브라우저 스타일 재계산

프로젝트 규모가 커질수록 이 비용이 무거워진다. 특히 대규모 리스트 렌더링, SSR, hydration, 모바일 저사양 환경에서 차이가 체감되기 시작했다.

<br />

### React 생태계의 "정적 분석" 이동

최근 React 생태계에서 중요해진 키워드가 있다.

> **"빌드 타임에 최대한 많은 걸 계산하자"**

여기서 **정적 분석(static analysis)** 이란, 코드를 **실행하지 않고** 소스 코드 자체를 읽어서 필요한 정보를 미리 파악하는 것을 말한다.

예를 들어 Tailwind는 빌드 시 소스 코드를 스캔해서 실제로 사용된 클래스만 골라 CSS 파일을 생성한다. 코드를 실행해보지 않아도 `"bg-blue-500"`이라는 문자열이 있다는 걸 정적으로 읽어낼 수 있기 때문이다.

반면 styled-components 같은 CSS-in-JS는 컴포넌트가 **런타임에 실행될 때** props를 받아서 그때그때 스타일을 계산한다. 빌드 타임에는 어떤 스타일이 나올지 알 수 없다.

| | 분석 시점 | 특징 |
|---|---|---|
| 정적 분석 | 빌드 타임 | 미리 계산, 번들에 포함 |
| 동적 처리 | 런타임 | 실행 시 계산, JS 비용 발생 |

대표적으로 React Compiler, RSC(Server Components), Turbopack, SWC 모두 이 정적 분석 기반 철학과 연결된다. 스타일링도 마찬가지다.

<br />


## Tailwind CSS가 압도적으로 커진 이유

솔직히 Tailwind는 처음 보면 꽤 이상하다.

```jsx
<button className="px-4 py-2 bg-blue-500 rounded-lg">
  버튼
</button>
```

className이 지나치게 길어 보이고, 예전 CSS 관점에서는 안 좋은 코드처럼 느껴질 수도 있다. 그런데도 현재 React 생태계에서 거의 표준 수준으로 자리잡았다. 왜일까?

<br />

### Tailwind는 "스타일 시스템"이다

사람들이 Tailwind를 단순 CSS 라이브러리라고 생각하는 경우가 많은데, 사실은 조금 다르다.

- 디자인 토큰 시스템
- Atomic CSS 엔진
- Utility 기반 설계 시스템

들에 가깝다.

**Atomic CSS**란 CSS 속성 하나당 클래스 하나를 대응시키는 방식이다. `text-sm`, `px-4`, `bg-blue-500`처럼 각 클래스가 단 하나의 스타일 규칙만 담당한다. 컴포넌트가 수천 개로 늘어나도 클래스 자체는 재사용되기 때문에 CSS 파일이 선형적으로 커지지 않는다.


<br />

### Tailwind가 강력한 진짜 이유

**컴포넌트 이동이 거의 없다.**

기존 CSS 방식에서는 컴포넌트를 이동할 때 관련된 `.css` 파일들을 함께 챙겨야 했다.

```
Button.jsx
Button.css
theme.css
variables.css
```

Tailwind는 스타일이 컴포넌트 근처에 존재한다.

```jsx
<Button className="px-4 py-2 bg-zinc-900" />
```

**삭제가 매우 쉽다.**

Tailwind는 대부분 지역적으로 사용된다.

```
컴포넌트 삭제  => 스타일 삭제
```

전역 CSS 찌꺼기가 거의 남지 않는다. 실무 유지보수에서 생각보다 엄청나게 큰 장점이다.

**디자인 시스템 구축이 쉽다.**

```js
theme: {
  colors: {
    primary: '#2563eb'
  }
}
```

나만의 커스텀 단축어를 Tailwind config 기반으로 설정하고 스타일을 통일할 수 있어, 대규모 서비스에서 일관성을 유지하기 쉽다.

**런타임 비용이 거의 없다.**

빌드 타임에 CSS를 생성하므로 hydration 부담이 줄고, SSR 친화적이며, 성능이 안정적이다.

<br />


## Tailwind 중심으로 묶이는 생태계

최근 React 생태계에서 굉장히 자주 보이는 조합이 있다.

```
Tailwind CSS + shadcn/ui + clsx + cva
```

<br/>
거의 하나의 세트처럼 사용된다.

<br />

### shadcn/ui가 폭발적으로 성장한 이유

최근 React UI 생태계에서 가장 영향력이 큰 프로젝트 중 하나다. 많은 사람들이 오해하는데, shadcn/ui는 단순 컴포넌트 라이브러리가 아니다. 철학 자체가 다르다.

기존 UI 라이브러리는 다음처럼 사용했다.

```jsx
<Button variant="primary" />
```

겉보기엔 편하지만 내부 구현을 수정하기 어렵고, 라이브러리 abstraction에 갇히는 문제가 있었다.

shadcn/ui는 다르다.

```bash
npx shadcn add button
```

이 명령 하나로 컴포넌트 코드 자체를 프로젝트에 복사한다. 직접 수정 가능하고, Tailwind 기반이다.

> **"UI 라이브러리"보다 "UI 스타터 킷"에 가깝다**

이 철학이 React 개발자들에게 크게 먹혔다.

<br />

### clsx, cva, cn이 같이 쓰이는 이유

Tailwind의 단점도 있다. 조건부 className이 복잡해진다.

조건에 따라 동적으로 스타일을 지정하려할 때, 아래와 같이 설정해야한다.

```jsx
className={`
  px-4 py-2
  ${active ? 'bg-blue-500' : 'bg-gray-500'}
`}
```

이를 해결하기 위한 유틸리티들이 생태계에 자리잡았는데, 각자 역할이 다르다.

**`clsx`** — 조건부 클래스를 깔끔하게 합쳐주는 유틸리티다.

```tsx
clsx('px-4 py-2', active && 'bg-blue-500', !active && 'bg-gray-500')
// → 'px-4 py-2 bg-blue-500'
```

**`cn`** — 실무에서 가장 많이 쓰이는 패턴이다. `clsx` + `tailwind-merge`를 합친 유틸리티 함수로, 대부분의 프로젝트에서 직접 만들어 쓴다.

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`tailwind-merge`가 핵심이다. Tailwind 클래스끼리 충돌이 생길 때 나중 것이 이기도록 정리해준다.

```tsx
cn('text-sm text-base')      // → 'text-base'  (충돌 해결)
cn('px-4', isLarge && 'px-8') // → 'px-8'       (나중 값 우선)
```

**`cva`** — variant가 많은 공통 컴포넌트 설계에 특화된 도구다. `size`, `color` 같은 prop 조합을 타입 안전하게 관리할 수 있다.

```tsx
const button = cva(
  'rounded px-4 py-2',
  {
    variants: {
      size: { sm: 'text-sm py-1', lg: 'text-lg py-3' },
      color: { blue: 'bg-blue-500', red: 'bg-red-500' },
    },
  }
);

button({ size: 'sm', color: 'blue' })
// → 'rounded px-4 py-2 text-sm py-1 bg-blue-500'
```

세 도구의 역할을 정리하면 다음과 같다.

| | 역할 | 언제 씀 |
|---|---|---|
| `clsx` | 조건부 클래스 조합 | 간단한 조건 처리 |
| `cn` | 조건부 조합 + Tailwind 충돌 해결 | 대부분의 컴포넌트 |
| `cva` | variant 시스템 선언 | Button, Badge 등 다양한 variant가 필요한 공통 컴포넌트 |

대부분의 경우 `cn`만으로 충분하다. `cva`는 shadcn/ui처럼 variant 조합이 여러 개인 공통 컴포넌트를 설계할 때 진가를 발휘한다.

디자인 시스템 구축이 편해지고, 최근 React UI 생태계에서 거의 표준처럼 자리잡는 중이다.

<br />


## Zero-runtime CSS가 주목받는 이유

최근 가장 중요한 흐름 중 하나다. 대표적으로 Vanilla Extract, StyleX, Panda CSS, Linaria 등이 있다. 핵심은 동일하다.

> **"CSS 생성을 빌드 타임에 끝내자"**

<br />

### Vanilla Extract

최근 대규모 TypeScript 프로젝트에서 관심이 많다.

```ts
export const button = style({
  background: 'royalblue'
});
```

| 특징 | 설명 |
| --- | --- |
| 타입 안정성 | TypeScript 기반으로 작성 |
| 런타임 없음 | 빌드 타임에 CSS 추출 |
| 정적 분석 가능 | 컴파일러와 궁합이 좋음 |

React Compiler 흐름과도 굉장히 잘 맞는다.

React 19에서 나타난 React Compiler는 컴포넌트를 정적으로 분석해서 불필요한 리렌더링을 자동으로 제거한다. 이 과정에서 컴파일러는 "이 값이 렌더링 중에 바뀌는가?"를 판단해야 하는데, 스타일이 런타임에 동적으로 생성되면 그 판단이 어려워진다.

Vanilla Extract는 스타일을 빌드 타임에 완전히 확정된 CSS 클래스로 만든다. 컴포넌트 코드에는 클래스 이름 문자열만 남기 때문에, React Compiler 입장에서는 스타일이 "절대 바뀌지 않는 상수"로 보인다. 분석이 단순해지고 최적화 여지가 넓어진다.

반면 styled-components처럼 런타임에 props를 받아 CSS를 동적으로 생성하는 방식은, React Compiler가 해당 값의 변화를 추적하기 어렵다. 최적화 대상에서 빠지거나 오히려 방해가 될 수 있다.

<br />

### Meta의 StyleX

![alt text](/assets/CSS/styleX.png)

Meta(Facebook)가 직접 개발 중인 스타일링 라이브러리다. Instagram, Facebook 같은 초대규모 서비스를 운영하며 겪은 CSS 문제를 해결하기 위해 만들었다. 수천 개의 컴포넌트가 쌓이면서 CSS 파일이 수십 MB까지 불어나고, 클래스 충돌로 스타일이 예측 불가능하게 깨지는 문제가 반복됐다.

```tsx
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  button: {
    backgroundColor: 'royalblue',
    padding: '8px 16px',
  },
});

<button {...stylex.props(styles.button)} />
```

겉보기엔 CSS-in-JS처럼 보이지만, 원리는 완전히 다르다.

**빌드 타임에 스타일을 Atomic CSS로 분해한다.** `backgroundColor: 'royalblue'` 하나가 `x1bg2` 같은 단일 클래스 하나로 변환된다. 같은 속성이 다른 컴포넌트에서 또 등장해도 동일한 클래스를 재사용한다. 프로젝트가 아무리 커져도 CSS 파일 크기가 거의 늘지 않는다.

**충돌을 컴파일 타임에 해결한다.** 동일한 CSS 속성이 여러 곳에서 적용될 때 어느 쪽이 이길지를 런타임이 아닌 빌드 시점에 결정해 적용 순서를 보장한다. Tailwind의 `tailwind-merge`가 런타임에 하는 일을 빌드 때 끝내버린다.

| 특징 | 설명 |
|---|---|
| Zero-runtime | 빌드 후 JS에 스타일 코드가 남지 않음 |
| Atomic CSS | 속성 하나 = 클래스 하나, 중복 없음 |
| 충돌 해결 | 컴파일 타임에 우선순위 확정 |
| 타입 안정성 | TypeScript 기반 |

> 사실상 "React Compiler 시대를 대비한 스타일링"처럼 보일 정도다.

<br />


## React Compiler 시대가 중요한 이유

React는 지금 점점 "컴파일러 기반 프레임워크"로 이동 중이다.

React Compiler는 코드를 정적으로 분석해 자동 memoization, 렌더링 최적화, 불필요한 계산 제거를 수행한다.

| 과거 | 현재 |
| --- | --- |
| 런타임 처리 | 빌드 타임 처리 |
| 동적 생성 | 정적 분석 |
| JS 실행 | Compiler 최적화 |

스타일링도 같은 흐름을 따라간다.

<br />


## 지금 React에서 가장 많이 쓰는 조합

현재 기준 체감상 가장 많이 보이는 조합을 정리하면 이렇다.

**스타트업 / 프로덕트 개발**

속도가 굉장히 빠른 조합이다.

```
Tailwind CSS + shadcn/ui + cva + clsx
```

<br />

**대규모 서비스**

성능에 민감 서비스일수록 Zero-runtime 선택지가 주목받는다.

```
Tailwind CSS + Zero-runtime CSS + Design Token System
```

<br />


## 앞으로 스타일링 생태계는 어떻게 변할까

아마 방향은 더 명확해질 가능성이 높다.

- **Compiler 중심 생태계** — 자동 최적화가 최대 장점인 React Compiler의 영향력이 커질수록 컴파일 타임 스타일링이 유리해진다.
- **Zero-runtime 확대** — 런타임 CSS 생성은 점점 줄어들 가능성이 높다.
- **Tailwind 주변 생태계 강화** — Tailwind 자체보다 shadcn/ui, cva, Radix UI 같은 주변 생태계가 더 커질 가능성이 높다.

<br />


## 결국 핵심은..

최근 React 스타일링은 단순 CSS 문제가 아니다.

성능, 정적 분석, Compiler 최적화, DX, 디자인 시스템, 유지보수성, 이 모든 것이 연결된 문제다.

그래서 지금 프론트엔드 생태계는 점점 이 방향으로 이동하고 있다.

> **"컴파일 타임에 최대한 해결하자"**

Tailwind + Zero-runtime + Compiler 흐름은 앞으로 더 강해질 가능성이 높다.
