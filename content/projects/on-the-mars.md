---
title: "온더마스"
date: "2023-05"
period: "2023.04 — 2023.05"
description: "화성 테라포밍 콘셉트의 파밍 게임과 NFT 작물 수집·거래를 결합한 웹 + Unity 메타버스 서비스"
category: "인터랙티브"
thumbnail: "/assets/projects/on-the-mars/on-the-mars-thumbnail.jpg"
tags:
  - React
  - TypeScript
  - Unity
  - Unity WebGL
  - C#
  - MetaMask
featured: true
order: 6
---

## 프로젝트 소개

온더마스(On the Mars)는 유저마다 각자의 작물을 재배하는 파밍 게임과 NFT 작물 카드의 수집·거래 활동을 합쳐, NFT 라이프사이클에 익숙해질 기회를 제공하는 웹 + Unity 메타버스 서비스입니다.

삼성 청년 SW 아카데미 특화 프로젝트로, FE 3명·BE 3명이 함께 진행했습니다.

- <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:inline-block;vertical-align:-0.15em;margin-right:0.4em"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>[GitHub](https://github.com/sub9707/on-the-mars)

## 담당 업무

웹에 이식되는 **Unity 게임 클라이언트를 단독으로 개발**했습니다.

- Unity로 오브젝트와 상호작용 가능한 파밍 게임 클라이언트 제작
- WebGL로 빌드해 React 컴포넌트에 이식
- React에서 로그인한 사용자 정보를 게임에 로드하고, 게임 내 저장 데이터를 DB로 전달
- React ↔ Unity ↔ DB 간 통신을 담당해 웹 서비스 안에서 게임 데이터를 활용하도록 구현

## 서비스 기능 소개 — 나의 농장 (Unity)

![Unity 게임 접속 — React에서 게임 시작을 누르면 Unity 로딩 후 게임이 시작된다](/assets/projects/on-the-mars/unity-game-access.gif)

<!-- gif: unity게임접속.gif — React에서 "게임 시작" 클릭 → Unity 로딩 완료 → 게임 시작 장면 -->

React에서 게임 시작을 클릭한 뒤 Unity 로딩이 완료되면 게임을 시작할 수 있습니다.

![Unity 씨앗 구매 — 보유한 이더리움(O2 코인)으로 씨앗을 구매하는 장면](/assets/projects/on-the-mars/unity-buy-seed.gif)

<!-- gif: unity씨앗구매.gif — 보유 이더리움(O2 코인)으로 씨앗 구매 -->

보유하고 있는 이더리움(O2 코인)으로 씨앗을 구매할 수 있습니다.

![Unity 씨앗 심기 — 씨앗을 심고 물주기 퀘스트를 2회 완료해 랜덤 작물을 수확하는 장면](/assets/projects/on-the-mars/unity-plant-seed.gif)

<!-- gif: unity씨앗심기.gif — 씨앗 심기 → '물주기' 퀘스트 2회 완료 → 랜덤 작물 수확 -->

구매한 씨앗을 심고 '물주기' 퀘스트를 2회 완료하면 랜덤 작물을 수확할 수 있습니다.

![Unity 씨앗 부족 — 보유 씨앗이 없을 때 심을 수 없다는 경고가 뜨는 장면](/assets/projects/on-the-mars/unity-no-seed.gif)

<!-- gif: unity씨앗부족.gif — 보유 씨앗 부족 시 경고 표시 -->

보유 씨앗이 부족할 때는 씨앗을 심을 수 없다는 경고가 뜹니다.

![Unity 저장하기 — 수확한 작물을 저장해 메타마스크와 연동, NFT로 발급되는 장면](/assets/projects/on-the-mars/unity-save.gif)

<!-- gif: unity저장하기.gif — 수확 작물 저장 → 메타마스크 연동 → NFT 발급 -->

수확한 작물은 저장을 통해 메타마스크와 연동해 NFT로 발급됩니다.

## 기술적 구현

- 프론트엔드 클라이언트는 React 컴포넌트와 Unity 컴포넌트를 `react-unity-webgl` 라이브러리로 통신합니다.
- 백엔드 서버는 Active - Stand By 이중화 구조로 서비스 장애에 즉각 대응할 수 있는 환경을 제공합니다.

## 트러블슈팅

### React ↔ Unity 클라이언트 통신

Unity 게임 클라이언트를 React 컴포넌트에 이식하기 위해 WebGL 빌드로 추출했고, React 컴포넌트와 연동해 데이터를 저장·로드할 방법이 필요했습니다.

두 클라이언트 간 통신을 위해 `react-unity-webgl` 라이브러리를 사용했습니다. 자료와 활용 사례가 적은 라이브러리여서 공식 문서만을 꼼꼼히 읽고 프로젝트에 투입했습니다.

![React와 Unity 클라이언트 간 데이터 통신 흐름 — 컴포넌트 마운트 시 sendMessage로 유저 데이터 전달, 저장 시점에 SaveData로 게임 데이터 반환](/assets/projects/on-the-mars/unity-comm-flow.png)

<!-- React ↔ Unity 통신 흐름 다이어그램. mount 시 sendMessage(단일 문자열) → Unity, 저장 시점 SaveData → React, unityjson → DB 전송 순서. 파일명 unity-comm-flow.png -->

- 컴포넌트 마운트 시 React에서 유저 데이터를 단일 문자열로 변환해 `sendMessage`의 파라미터로 전달했습니다.
- Unity 게임 클라이언트에서는 저장 시점에 데이터를 `SaveData` 메서드와 함께 전달하도록 했습니다.
- 이렇게 수신한 `unityjson` 데이터를 React 컴포넌트에서 전송하면 통신 과정이 완료됩니다.

## 성과

- 삼성 청년 SW 아카데미 특화 프로젝트 우수 프로젝트 수상 (2023.05)

## 회고

Unity 빌드를 React 컴포넌트에 이식하고 통신을 구성하는 과정을 통해 폭넓은 웹 개발 역량을 쌓았고, 자료가 적은 분야에 대한 학습 자신감을 키울 수 있었던 경험이었습니다.
