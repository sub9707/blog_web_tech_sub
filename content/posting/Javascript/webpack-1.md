---
title: "Webpack5 파헤치기 1편 — 번들링 기초와 에셋 처리"
date: "2026-02-19"
description: "Webpack5 초기 설정부터 CSS·SCSS 번들링, 이미지·정적 파일 처리까지 직접 실습하며 정리한 글"
tags: ["javascript", "webpack", "bundler", "scss", "babel"]
thumbnail: "/assets/thumbnails/javascript/webpack-1.png"
---

프론트엔드 개발을 하다 보면 수십 개의 JS 파일, CSS, 이미지가 복잡하게 얽힌다. 이걸 브라우저가 그대로 로드하면 네트워크 요청이 폭발적으로 늘어나고 변수 충돌 같은 문제도 생긴다. Webpack은 이 모든 것을 하나의 번들로 묶어주는 도구다.

이번 글에서는 Webpack5를 직접 설치하고 JS·CSS·이미지 파일을 번들링하는 과정을 실습하며 정리한다.

<br/>

## Webpack이란

![Webpack 번들링 개요](/assets/Javascript/webpack/webpack-overview.png)

**Webpack** 은 오픈소스 JavaScript 모듈 번들러다.

여러 파일로 분산된 JS 모듈을 단일 번들 파일로 통합해준다. 이 과정에서 변수명 충돌이나 의존성 문제를 해결하고, 플러그인을 통해 HTML, CSS, 이미지 같은 에셋도 함께 처리할 수 있다.

| 역할 | 설명 |
|---|---|
| **모듈 번들링** | 여러 JS 파일을 하나로 통합 |
| **의존성 관리** | import/require로 연결된 모듈 그래프 분석 |
| **에셋 처리** | 로더를 통해 CSS, 이미지, 폰트 등 변환 |
| **최적화** | Tree Shaking, 코드 스플리팅, 압축 |

> **Tree Shaking** — 실제로 사용되지 않는 코드를 번들에서 제거하는 최적화 기법. Webpack5는 production 모드에서 자동으로 적용한다.

<br/>

## 초기 설정

![프로젝트 폴더 구조](/assets/Javascript/webpack/webpack-folder-structure.png)

번들러 실습을 위한 기본 구조다.

- `src/` — 개발 소스 파일
- `dist/` — 번들링 결과물(정적 파일)

React 프로젝트에서 `build/` 폴더가 하는 역할이 `dist/`와 같다.

<br/>

### 모듈 에러 상황

![에러 상황 코드](/assets/Javascript/webpack/webpack-module-error-code.png)

`<script>`로 로드한 `index.js`에서 다른 파일의 함수를 `import`하면 어떻게 될까?

![모듈 에러 메시지](/assets/Javascript/webpack/webpack-module-error-msg.png)

"모듈 바깥에서 `import`를 사용할 수 없다"는 에러가 발생한다.

브라우저는 보안과 네트워크 효율을 위해 외부 리소스를 비동기로 처리한다. 외부 스크립트 파일이 ES 모듈임을 브라우저에 명시적으로 알려야 한다.

```html
<script type="module">
  import { functionName } from './module.js';
</script>
```

이 방식은 파일마다 개별 네트워크 요청이 발생한다. 파일이 많아질수록 로딩이 느려지는 것은 여전히 문제다. Webpack이 필요한 이유가 여기에 있다.

<br/>

### Webpack 설치

```bash
npm i -D webpack webpack-cli
```

`package.json`에 build 스크립트를 추가한다.

```json
{
  "scripts": {
    "build": "webpack --mode production"
  },
  "devDependencies": {
    "webpack": "^5.90.1",
    "webpack-cli": "^5.1.4"
  }
}
```

<br/>

### 번들링 결과

`npm run build`를 실행하면 `dist/` 폴더에 번들 파일이 생성된다.

![번들 결과물 생성](/assets/Javascript/webpack/webpack-build-result.png)

이후 `index.html`의 `<script>` 참조를 번들 파일로 교체한다.

![script 교체 전](/assets/Javascript/webpack/webpack-html-before.png)

![번들 파일로 교체 후](/assets/Javascript/webpack/webpack-html-bundled.png)

이제 `import`한 외부 모듈이 하나의 번들에 통합되어 정상 동작한다.

<br/>

### webpack.config.js

기본적으로 Webpack은 엔트리포인트를 `src/index.js`, 출력을 `dist/main.js`로 설정한다.

프로젝트 루트에 `webpack.config.js`를 생성하면 이 설정을 확장할 수 있다.

```js
const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
};
```

- `entry` — 번들링 시작점
- `output.filename` — 출력 파일명 (`[contenthash]`는 캐싱에서 자세히 다룬다)
- `output.clean` — 빌드 전 `dist/` 폴더 자동 정리

<br/>

## CSS / SCSS 번들링

Webpack은 기본적으로 JS만 처리한다. CSS·SCSS 같은 스타일 파일은 **로더(Loader)** 를 통해 처리해야 한다.

```bash
npm i -D sass style-loader css-loader sass-loader
```

`src/` 폴더에 scss 파일을 만들고 `index.js`에서 import하면 아래 에러가 발생한다.

![SCSS 에러](/assets/Javascript/webpack/webpack-scss-error.png)

로더 설정이 없기 때문이다. `webpack.config.js`에 `module.rules`를 추가한다.

```js
module: {
  rules: [
    {
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', 'sass-loader'],
    },
  ],
},
```

| 옵션 | 설명 |
|---|---|
| `test` | 처리할 파일을 정규식으로 지정 |
| `use` | 적용할 로더 목록 (오른쪽 → 왼쪽 순서로 실행) |

로더는 **역순으로 실행**된다.

```
sass-loader → css-loader → style-loader
```

1. `sass-loader` — `.scss`를 `.css`로 컴파일
2. `css-loader` — CSS를 JS 모듈로 변환
3. `style-loader` — JS 모듈을 `<style>` 태그로 DOM에 삽입

![SCSS 빌드 성공](/assets/Javascript/webpack/webpack-scss-build.png)

![번들된 스타일시트](/assets/Javascript/webpack/webpack-scss-bundled.png)

<br/>

## Assets Resource Loader

이미지, 폰트 같은 정적 파일도 Webpack에서 직접 `import`하면 에러가 발생한다.

```
ERROR in ./src/assets/cat.jpg 1:0
Module parse failed: Unexpected character '▌' (1:0)
You may need an appropriate loader to handle this file type
```

Webpack5부터는 별도 로더 없이 `asset/resource` 타입으로 처리할 수 있다.

```js
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: '[name].[contenthash].js',
  clean: true,
  assetModuleFilename: '[name][ext]', // 출력 파일명 유지
},

module: {
  rules: [
    // ...기존 scss 룰...
    {
      test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
      type: 'asset/resource',
    },
  ],
},
```

`assetModuleFilename`을 설정하지 않으면 출력된 이미지 파일명이 해시값으로 난해하게 변한다. 원본 파일명을 유지하려면 `[name][ext]`로 지정한다.

![에셋 빌드 결과](/assets/Javascript/webpack/webpack-asset-dist.png)

template HTML에 이미지를 넣고 `index.js`에서 `src`를 부여하면 Webpack Dev Server에서 이미지가 정상 로드되는 것을 확인할 수 있다.

![이미지 로드 결과](/assets/Javascript/webpack/webpack-asset-image.png)

<br/>

## webpack.config.js 전체 예시 (1편 기준)

```js
const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
    assetModuleFilename: '[name][ext]',
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: 'asset/resource',
      },
    ],
  },
};
```

2편에서는 HTMLWebpackPlugin, 웹팩 캐싱, Dev Server, Source Map, Babel Loader, Bundle Analyzer를 다룬다.
