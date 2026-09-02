---
title: "360도 촬영 키오스크"
date: "2025-08"
period: "2025.07 — 2025.08"
description: "행사 부스용 360도 회전 촬영·자동 편집·QR 전달 시스템 — 안드로이드 촬영 앱과 Electron 제어 앱"
category: "데스크톱 앱"
thumbnail: "/assets/projects/360-kiosk/360-kiosk.png"
tags:
  - Electron
  - React
  - TypeScript
  - Kotlin
  - CameraX
  - FFmpeg
featured: true
order: 4
---

## 프로젝트 개요

(주)하우두유두 이벤트 부스에서 사용된 360도 회전 촬영 시스템입니다. 행사장에 설치한 회전 암(arm)에 스마트폰을 장착해 참여자를 촬영하고, 촬영된 영상을 자동으로 편집·업로드한 뒤 QR 코드로 전달합니다.

- 개발 인원: FE + Android 1인
- <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:inline-block;vertical-align:-0.15em;margin-right:0.4em"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>[GitHub](https://github.com/sub9707/360-kiosk)
- 시연: 2025.08.14 성암아트홀 설윤 하이볼 팬미팅

![행사장에 설치된 360도 촬영 키오스크 정면 — 회전 촬영대와 세로형 키오스크 화면](/assets/projects/360-kiosk/kiosk-front.png)

## 시스템 구성

시스템은 같은 무선 네트워크에서 동작하는 두 개의 애플리케이션으로 구성됩니다.

- **안드로이드 앱**: 회전 암에 장착된 스마트폰에서 실행되며 실제 촬영을 담당합니다. WebSocket 서버(`:8080`)와 HTTP 파일 서버(`:8081`)를 자동으로 띄우고, PC가 접속하면 즉시 연결을 수락합니다.
- **Electron 데스크톱 앱**: 진행자가 조작하는 제어·편집 PC에서 실행됩니다. 촬영 신호 송신, 영상 다운로드, FFmpeg 편집, QR 생성, Google Drive / 로컬 저장을 담당합니다.

제어 신호는 Electron(클라이언트) → 안드로이드(서버)로 `ws://<안드로이드 IP>:8080`을 통해 오가고, 녹화 원본은 안드로이드의 HTTP 파일 서버에서 PC로 전송됩니다. 참여자는 생성된 QR 코드로 편집 영상을 열람·다운로드합니다.

![안드로이드 앱 ↔ Electron 앱 데이터 흐름도 — WebSocket 제어 신호, HTTP 영상 전송, FFmpeg 편집, Google Drive 업로드와 QR 생성](/assets/projects/360-kiosk/system-diagram.png)

<!-- 시스템 구성 다이어그램. 안드로이드(CameraX 녹화 / WS 서버 :8080 / HTTP 파일 서버 :8081) ↔ Electron(WS 클라이언트 / FFmpeg / Drive 업로드 + QR / React UI) ↔ Google Drive ↔ 참여자 스마트폰. 파일명 system-diagram.png -->

## 주요 기능

### 안드로이드 앱 (촬영 기기)

- **자동 연결**: 앱 실행 시 WebSocket 서버와 HTTP 파일 서버를 자동으로 기동하고, PC 접속을 별도 확인 없이 수락합니다.
- **원격 촬영**: PC의 촬영 시작·중지 신호를 받아 CameraX로 FHD(1920×1080) 영상을 녹화하며, 20초가 지나면 자동 종료합니다.
- **임시 저장 및 자동 삭제**: 녹화 파일을 앱 전용 외부 저장소에 임시 보관하고, PC 전송이 끝나면 삭제 요청에 따라 원본을 제거합니다.
- **안정성**: PC 연결·촬영 상태를 화면에 실시간 표시하고, Wi-Fi Lock·화면 켜짐 유지·Foreground Service로 장시간 운영에 대비합니다.

### Electron 데스크톱 앱 (제어·편집 PC)

![Electron 앱 메인 화면 — 카메라 프리뷰 위에 촬영 시작 버튼, 우하단 설정·폴더 버튼](/assets/projects/360-kiosk/main-page.png)

- **키오스크 UI**: 1080×1920 세로 전체 화면으로 실행되며 `HashRouter` 기반 메인 / 촬영 / 결과 세 화면으로 구성됩니다.
- **촬영 제어**: 안드로이드 앱과의 연결·재연결, 촬영 시작·중지·재촬영을 진행자가 조작합니다.
- **자동 영상 편집**: 번들된 FFmpeg로 구간별 배속(슬로 모션) 편집 후 인트로·아웃트로·배경음악을 합성합니다.
- **QR 코드 및 저장**: 편집 영상과 QR 이미지를 Google Drive에 업로드해 공개 링크를 만들고, 그 링크를 담은 QR 코드를 화면에 표시합니다. 원본·편집본은 로컬 드라이브에도 저장됩니다.
- **영상 관리**: 파일 관리자 모달에서 날짜별 폴더와 편집 영상 썸네일을 확인하고, 노출을 원하지 않는 참여자의 로컬 영상·QR 파일을 삭제할 수 있습니다. (Drive 업로드본은 삭제되지 않습니다.)

![촬영 화면 — 카메라 연결 중 상태의 스피너와 안내 문구](/assets/projects/360-kiosk/camera-connecting.png)

촬영 화면은 연결 중 / 연결 실패 / 촬영 대기 / 촬영 중 / 영상 전송 중 / 촬영 완료 / 편집 중 상태에 따라 UI가 전환됩니다.

## 동작 흐름

1. **기동**: 안드로이드 앱이 카메라 프리뷰·WebSocket 서버·HTTP 파일 서버를 자동 시작합니다. Electron 앱은 `.env` 설정을 읽어(없으면 기본 파일 생성) 전체 화면 창을 엽니다.
2. **연결**: 촬영 화면 진입 시 Electron 앱이 `.env`의 `WIRELESS_ADDRESS`로 WebSocket 연결을 시도합니다. 실패 시 최대 2회 자동 재시도하고 이후 수동 재연결 버튼을 노출합니다.
3. **촬영**: `startRecording` 신호로 안드로이드가 20초간 녹화합니다. 양쪽이 각각 20초 타이머를 두어 자동 종료합니다.
4. **전송**: 녹화가 끝나면 안드로이드가 `video-saved` 이벤트로 파일명을 알리고, Electron이 `http://IP:8081/video/<파일명>`에서 파일을 내려받아 `BASE_DIRECTORY/YYYYMMDD/`에 저장한 뒤 원본 삭제를 요청합니다.
5. **편집**: FFmpeg가 구간별 배속으로 슬로 모션 본편을 만들고, 인트로·아웃트로·배경음악을 합성해 `edited_VIDEO_YYYYMMDD_HHMMSS.mp4`를 생성합니다.
6. **업로드 및 QR**: 편집 영상과 QR 이미지를 Google Drive의 오늘 날짜 폴더에 업로드하고 "링크가 있는 모든 사용자" 읽기 권한을 부여합니다. 공유 링크로 QR 코드를 만들어 결과 화면에 표시합니다.
7. **열람**: 참여자가 QR을 스캔해 Google Drive에서 영상을 재생·다운로드합니다.

## 기술적 구현

### 통신 구조

- **WebSocket (포트 8080)**: Electron이 클라이언트, 안드로이드가 서버입니다. PC → 안드로이드는 `{ channel, payload }`(`startRecording`, `stopRecording`, `deleteFile` 등), 안드로이드 → PC는 `{ eventName, data }`(`camera-connect-reply`, `camera-recording-status`, `video-saved` 등) 형식을 사용합니다.
- **HTTP 파일 서버 (포트 8081, NanoHTTPD)**: `GET /video/<파일명>`으로 녹화 mp4를 청크 응답으로 내려받습니다. 파일명에 `..`나 경로 구분자가 포함되면 거부합니다.
- **Electron IPC**: 메인 프로세스를 `MobileControl`(촬영·다운로드), `VideoControl`(로컬 영상 관리), `DriveControl`(편집·업로드·OAuth), `SettingControl`(설정 파일)로 모듈화했습니다.

### 영상 편집 파이프라인

`edit-video` 요청 시 FFmpeg가 두 단계로 실행되며 모든 출력은 1080×1920 세로로 크롭·스케일됩니다.

1. **구간별 배속(슬로 모션)**: 원본(약 20초)에서 `2.5–6.5s`, `8.5–12.5s` 구간은 0.5배속, `6.5–8.5s`, `12.5–17.5s` 구간은 1.0배속으로 잘라 이어 붙여 약 23초 본편을 만듭니다. `libx264`, CRF 22, 오디오 제거.
2. **합성**: `intro.mp4` + 본편 + `outro.mp4`를 연결하고, `bgm.mp3`를 0~35초로 잘라 앞뒤 1초 페이드·볼륨 0.8로 믹스합니다. `libx264` CRF 20, `-tune film`, `aac` 192k, `+faststart`.

임시 파일(`temp_main_*.mp4`)은 합성 후 삭제됩니다.

### Google Drive 연동

`oauth2_credentials.json`의 OAuth 2.0 클라이언트로 인증하고, 발급된 토큰은 사용자 데이터 폴더의 `google_drive_token.json`에 저장합니다. 만료 시 refresh token으로 자동 갱신하며, 실패하면 재인증 흐름으로 넘어갑니다. 업로드된 영상·QR 이미지에는 "링크가 있는 모든 사용자" 읽기 권한이 부여됩니다.

## 기술 스택

- **데스크톱 앱**: Electron 36, Electron Forge 7 + Vite 5, React 19, React Router 7(HashRouter), TypeScript, SCSS Modules, `ws`, `axios`, 번들 FFmpeg, `googleapis`(Drive v3), `qrcode` / `react-qr-code`
- **모바일 앱**: Kotlin, Gradle(Kotlin DSL), compileSdk 35 / minSdk 24, CameraX(`camera-video` / `camera-lifecycle` / `camera-view`), Java-WebSocket, NanoHTTPD, AndroidX Lifecycle(ViewModel / LiveData), Foreground Service + Wi-Fi Lock + WakeLock

## 시연

![회전 암에 장착된 촬영용 스마트폰 — 화면에 PC 연결 상태와 프리뷰가 표시된다](/assets/projects/360-kiosk/kiosk-mobile.png)

2025.08.14 성암아트홀에서 열린 설윤 하이볼 팬미팅 부스에 설치해 운영했습니다.

## 회고

가장 아쉬운 부분은 저장소 선택입니다. 초기에 대용량 오브젝트 스토리지가 필요하다고 회사 측에 제안했으나, 큰 용량을 부담 없이 쓸 수 있다는 이유로 Google Drive를 쓰기로 결정됐습니다. 이에 맞춰 편집 영상 저장, 원본 다운로드, QR 이미지 저장을 모두 Drive API 위에서 처리했습니다.

문제는 마무리 단계였습니다. 편집 → 업로드 → QR 생성으로 이어져 결과 페이지가 뜨기까지 시간이 걸렸고, 특히 Drive의 저장·조회 응답이 느려 체감 대기 시간이 길었습니다. 현장에서 체험자와 사측은 "쓸 만한 속도"라고 평가했지만, 사용자 입장에서는 답답했을 것이라고 생각합니다. 오브젝트 스토리지(S3, R2 등)를 사용했다면 업로드·조회 지연을 줄여 결과 페이지를 훨씬 빠르게 보여줄 수 있었을 것이라는 아쉬움이 남습니다.
