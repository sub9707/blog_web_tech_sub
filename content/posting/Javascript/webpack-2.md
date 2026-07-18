---
title: "Webpack5 파헤치기 2편 — 개발 환경 최적화와 플러그인"
date: "2026-03-05"
description: "HTMLWebpackPlugin, 캐싱, Dev Server, Source Map, Babel Loader, Bundle Analyzer까지 Webpack 개발 환경을 완성하는 설정 가이드"
tags: ["javascript", "webpack", "babel", "dev-server", "source-map", "optimization"]
thumbnail: "/assets/thumbnails/javascript/webpack-2.png"
---

[1편](/posts/javascript/webpack-1)에서 JS·CSS·이미지 번들링의 기초를 다뤘다. 이번 편에서는 실무에서 필수적으로 쓰이는 플러그인과 개발 환경 설정을 다룬다.

<br/>

## 로더 vs 플러그인

1편에서 다룬 로더(Loader)와 이번 편의 플러그인(Plugin)은 역할이 다르다.

| 구분 | 역할 | 적용 시점 |
|---|---|---|
| **로더** | 개별 파일을 변환 (scss → css 등) | 모듈 처리 단계 |
| **플러그인** | 번들링 전체 과정에 개입 | 빌드 라이프사이클 전반 |

로더가 파일 단위 변환이라면, 플러그인은 번들 결과물 생성, 최적화, 환경 변수 주입 같은 더 넓은 범위의 작업을 담당한다.

<br/>

## HTMLWebpackPlugin

### 왜 필요한가

매번 `index.html`에 번들 파일 경로를 수동으로 작성하면 파일명이 바뀔 때마다 수정해야 한다. 특히 1편에서 다룬 `[contenthash]`를 사용하면 빌드마다 파일명이 달라지는데, 이걸 수작업으로 맞추는 건 불가능하다.

`HTMLWebpackPlugin`은 번들 파일을 자동으로 HTML에 연결해준다.

```bash
npm i -D html-webpack-plugin
```

```js
const HTMLWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // ...
  plugins: [
    new HTMLWebpackPlugin({
      title: 'Webpack App',
      filename: 'index.html',
      template: 'src/template.html',
    }),
  ],
};
```

`template` 없이 사용하면 빌드 시 `index.html`이 초기화되므로 반드시 템플릿을 지정해야 한다.

```html
<!-- src/template.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= htmlWebpackPlugin.options.title %></title>
  </head>
  <body>
    <div id="app"></div>
    <!-- 번들 스크립트는 플러그인이 자동으로 삽입 -->
  </body>
</html>
```

`<%= htmlWebpackPlugin.options.title %>` 문법으로 config에서 지정한 값을 템플릿에서 사용할 수 있다.

<br/>

## 웹팩 캐싱 (Caching)

브라우저는 이전에 받은 파일을 캐시에 저장해두고, 같은 URL로 요청이 오면 서버에 요청하지 않고 캐시를 사용한다. 사이트 로딩 속도를 높이는 데 효과적이다.

문제는 파일 내용이 바뀌어도 URL(파일명)이 같으면 브라우저가 이전 캐시를 계속 사용한다는 것이다.

### contenthash

`[contenthash]`는 파일 내용 기반 해시값이다. 내용이 바뀌면 해시가 달라져 새 URL이 생성되고, 브라우저는 새 파일을 받는다.

![contenthash 설정](/assets/Javascript/webpack/webpack-contenthash-config.png)

```js
output: {
  filename: '[name].[contenthash].js',
},
```

![contenthash 빌드 결과](/assets/Javascript/webpack/webpack-contenthash-build.png)

파일이 변경되지 않으면 해시가 유지되어 캐시가 그대로 사용되고, 변경되면 해시가 달라져 캐시가 무효화된다.

<br/>

## Webpack Dev Server

`webpack-dev-server(WDS)`는 개발 중 **실시간으로 변경 사항을 브라우저에 반영**해주는 개발 서버다.

```bash
npm i -D webpack-dev-server
```

```json
"scripts": {
  "build": "webpack --mode production",
  "dev": "webpack serve"
}
```

### 동작 원리

WDS는 빌드 결과물을 디스크가 아닌 **메모리**에 저장한다. 파일 시스템 I/O가 없어 컴파일 속도가 빠르다.

```
파일 변경 감지 → 변경된 모듈만 재번들링 (메모리) → 브라우저에 리로드 신호 전송
```

```js
devServer: {
  static: {
    directory: path.resolve(__dirname, 'dist'),
  },
  port: 3000,
  open: true,          // 서버 실행 시 브라우저 자동 열기
  hot: true,           // HMR(Hot Module Replacement) 활성화
  compress: true,      // gzip 압축으로 전송
  historyApiFallback: true, // SPA 라우팅 지원 (모든 경로를 index.html로)
},
```

### HMR vs 전체 리로드

| 방식 | 설명 | 상태 유지 |
|---|---|---|
| **전체 리로드** | 페이지 전체 새로고침 | X |
| **HMR** | 변경된 모듈만 교체 | O |

`hot: true`로 HMR을 활성화하면 상태(state)를 유지하면서 변경된 부분만 교체되어 개발 경험이 크게 향상된다.

`dist` 폴더를 삭제해도 WDS는 메모리에서 동작하므로 영향받지 않는다.

<br/>

## Source Map

번들링하면 여러 파일이 하나로 합쳐지고 난독화된다. 브라우저에서 에러가 발생하면 번들 파일의 라인 번호만 나와서 원인 파악이 어렵다.

**Source Map** 은 번들 파일과 원본 소스 파일 간의 매핑 정보를 제공해 디버깅을 돕는다.

```js
module.exports = {
  mode: 'development',
  devtool: 'source-map',
  // ...
};
```

![소스맵 결과](/assets/Javascript/webpack/webpack-sourcemap.png)

소스맵이 적용되면 브라우저 개발자 도구에서 번들 코드가 아닌 원본 파일·라인 번호로 에러 위치를 확인할 수 있다.

### devtool 옵션 선택 가이드

| 옵션 | 빌드 속도 | 디버깅 품질 | 권장 환경 |
|---|---|---|---|
| `eval` | 빠름 | 낮음 | 개발 |
| `cheap-source-map` | 보통 | 중간 | 개발 |
| `source-map` | 느림 | 높음 | 개발 / CI |
| `hidden-source-map` | 느림 | 높음 (외부 노출 X) | 프로덕션 |
| `false` | 가장 빠름 | 없음 | 프로덕션 |

프로덕션 빌드에는 소스맵을 포함하지 않거나 `hidden-source-map`을 사용해 외부에 노출되지 않게 한다.

<br/>

## Babel Loader

최신 JS 문법(ES6+, JSX)은 구형 브라우저에서 동작하지 않는다. **Babel** 은 최신 문법을 구형 브라우저가 이해할 수 있는 ES5로 변환해주는 트랜스파일러다.

```bash
npm i -D babel-loader @babel/core @babel/preset-env
```

```js
module: {
  rules: [
    // ...scss, asset 룰...
    {
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        },
      },
    },
  ],
},
```

- `exclude: /node_modules/` — `node_modules`는 이미 트랜스파일된 경우가 많고, 처리하면 빌드가 매우 느려지므로 제외
- `@babel/preset-env` — 타겟 환경에 맞춰 필요한 변환만 적용. `browserslist` 설정과 연동 가능

### .babelrc vs babel.config.js

Babel 설정은 `webpack.config.js` 안에 직접 작성하거나 별도 파일로 분리할 수 있다.

```js
// babel.config.js (프로젝트 전역 적용)
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: '> 0.25%, not dead' }],
  ],
};
```

별도 파일로 분리하면 Jest 같은 테스트 환경에서도 같은 설정을 공유할 수 있어 유지보수가 편하다.

<br/>

## Bundle Analyzer

번들 파일이 커지면 어떤 모듈이 얼마나 차지하는지 파악하기 어렵다. `webpack-bundle-analyzer`는 번들 구성을 시각화해준다.

```bash
npm i -D webpack-bundle-analyzer
```

```js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new HTMLWebpackPlugin({ /* ... */ }),
    new BundleAnalyzerPlugin(),
  ],
};
```

빌드 실행 시 `localhost:8888`에 시각적 분석 결과가 열린다.

![Bundle Analyzer 화면](/assets/Javascript/webpack/webpack-analyzer.png)

번들 분석을 통해 다음을 파악할 수 있다.

- **크기가 큰 모듈** 식별 → 코드 스플리팅 또는 경량 대안 탐색
- **중복 포함된 패키지** 확인 → `resolve.alias`나 `externals`로 최적화
- **실제 사용하지 않는 모듈** 확인 → Tree Shaking 적용 여부 점검

분석 목적으로만 사용하고, 실제 배포 빌드에는 플러그인을 비활성화하거나 `analyzerMode: 'disabled'`로 설정한다.

<br/>

## 최종 webpack.config.js

```js
const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
    assetModuleFilename: '[name][ext]',
  },
  devtool: isDev ? 'source-map' : false,
  devServer: {
    static: { directory: path.resolve(__dirname, 'dist') },
    port: 3000,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
  },
  module: {
    rules: [
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } },
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HTMLWebpackPlugin({
      title: 'Webpack App',
      filename: 'index.html',
      template: 'src/template.html',
    }),
    ...(isDev ? [new BundleAnalyzerPlugin()] : []),
  ],
};
```
