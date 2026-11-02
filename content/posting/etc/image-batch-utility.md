---
title: "이미지 일괄 처리 batch 유틸리티 만들기"
date: "2026-10-26"
description: "비 Vercel 환경에서 이미지 포맷과 크기를 일관되게 맞추기 위해 만든 윈도우 batch 스크립트 2개의 동작 방식 정리"
tags: ["batch", "imagemagick", "windows", "automation", "webp"]
thumbnail: "/assets/thumbnails/etc/image-batch.png"
---

이전 회사에서 드론으로 촬영한 데이터를 웹앱에 올리기 위해 데이터를 가공한 적이 있었다.

문제는 들어오는 이미지의 상태가 제각각이었다는 점이다. 드론 카메라로 찍은 것, 현장에서 휴대폰으로 찍어서 보내준 것이 섞여 있었고, 그러다 보니 가로세로 비율도 다르고 해상도도 천차만별이었다. 이걸 그대로 웹에 뿌리면 카드 레이아웃이 들쭉날쭉해지고, 용량 큰 원본이 그대로 올라가서 로드도 느려졌다.

당시 쓰던 유틸 프로그램들이 몇 개 있었는데, 그 중에 맵 타일의 좌표계를 일괄로 바꿔주는 배치 컨버팅 도구가 있었다. 폴더를 지정하면 그 안의 파일을 전부 돌면서 변환해주는 식이었다. 그걸 어깨넘어로 보면서 "이미지도 이렇게 한 번에 돌리면 좋겠다" 싶어서, 기술 블로그를 찾아보고 당시 초기의 GPT에 문법을 물어보면서 깨작깨작 만들어 본 게 지금 소개할 스크립트들의 전신이다.

그러다 몇몇 프로젝트에서 다시 꺼내 쓸 일이 생겼다. Vercel이 아닌 환경에 올라간 웹 프로젝트들은 Next.js의 이미지 최적화가 자동으로 동작하지 않는다... 즉 내가 올린 png는 Webp로 최적화되지않고 올린 그대로 png로 서빙된다. 따라서 넣을 이미지는 미리 WEBP로 바꾸고 크기도 맞춰둬야 했고, 그때 유용하게 활용한 것이 이 batch 스크립트이다.

<br/>

## batch?

batch 파일(`.bat 확장자`)은 윈도우 명령 프롬프트가 한 줄씩 읽어서 실행하는 단순한 윈도우 커맨드 명령어 덩어리다. 터미널에 손으로 치던 명령어를 한꺼번에 미리 적어둔 스크립트라고 보면 된다. 

별도로 설치할 런타임도, 빌드도 필요 없다. 윈도우면 바로 실행된다. 이게 가장 큰 장점이고, 문법이 투박하고 디버깅이 힘들다는 게 큰 단점이다.

여기서 중요한 건 batch가 이미지를 직접 건드리지는 않는다는 것이다. 실제 변환과 리사이징은 **ImageMagick**이라는 이미지 처리 도구가 전담하고, batch는 "어떤 파일을 어떤 옵션으로 ImageMagick에 넘길지" 정해주는 역할만 한다.

<bookmark url="https://imagemagick.org"></bookmark>

ImageMagick을 설치하면 `magick`이라는 명령어를 쓸 수 있게 되는데, 두 스크립트 모두 이 명령어에 의존한다.

<br/>

---

<br/>

# 이미지 변환기

`image_converter.bat`. 폴더 경로를 입력하면 그 안의 이미지를 원하는 확장자로 바꿔서 하위 폴더에 저장한다. 크기는 건드리지 않고 포맷만 변환한다.

아 그리고 재귀를 통한 이미지 파일 탐색은 추가하지 않았다.

원하지 않는 이미지까지 잡힐 가능성이 있고 출력 폴더를 입력한 폴더 안에 넣는 구조라 루프될 위험이 있었다.

## 동작 방식

블럭 단위로 보면 다섯 덩어리로 이루어져있다.

**1. ImageMagick 설치 체크**

```bat
where magick >nul 2>nul
if errorlevel 1 (
    echo ImageMagick이 설치되어 있지 않거나 PATH에 없습니다.
    pause
    exit /b 1
)
```

`where`는 해당 명령어가 PATH에 있는지 찾아주는 명령이다. `>nul 2>nul`은 찾은 경로나 에러 메시지를 화면에 띄우지 말라는 뜻이고, 우리가 보고 싶은 건 결과 값뿐이다. 못 찾으면 `errorlevel`이 1이 되므로 안내 문구를 띄우고 종료한다.

이 블럭이 없으면 뒤에서 파일마다 "magick을 찾을 수 없습니다"가 수십 줄 찍히고 끝나기에 가장 앞에 둔다.

**2. 폴더 경로 입력**

```bat
set /p "FOLDER=이미지 폴더 경로를 입력하세요: "

if defined FOLDER set "FOLDER=%FOLDER:"=%"

if not exist "%FOLDER%" (
    echo 폴더를 찾을 수 없습니다.
    pause
    exit /b 1
)
```

`set /p`가 batch에서 사용자 입력을 받는 방법이다. 뒤에 붙은 문자열이 그대로 프롬프트로 출력되고, 엔터를 치면 입력값이 `FOLDER` 변수에 들어간다. 탐색기 주소창에서 경로를 복사해 붙여넣는 식으로 쓴다.

탐색기에서 "경로로 복사"를 쓰거나 폴더를 창에 끌어다 놓으면 경로 양쪽에 큰따옴표가 붙어서 들어온다. `%FOLDER:"=%`는 변수 안의 `"`를 빈 문자로 바꾸는 치환 문법이라 따옴표만 떼어낸다. 아무것도 입력하지 않았을 때 빈 변수에 치환이 걸리지 않도록 앞에 `if defined`를 붙였다.

![폴더 경로 입력 화면](/assets/etc/image-batch/converter-prompt.png)

**3. 변환 확장자 선택**

```bat
echo 1. jpg
echo 2. png
echo 3. webp
...
set /p "CHOICE=번호 입력: "

if "%CHOICE%"=="1" set "FORMAT=jpg"
if "%CHOICE%"=="2" set "FORMAT=png"
if "%CHOICE%"=="3" set "FORMAT=webp"
```

batch에는 그럴듯한 선택 UI가 없다. 따라서, `echo`로 목록을 그려주고 번호를 받아서 `if`를 쭉 늘어놓는 식으로 처리했다.

```bat
if not defined FORMAT (
    echo 잘못된 선택입니다.
    pause
    exit /b 1
)
```

엉뚱한 번호를 치면 어느 if에도 걸리지 않아서 `FORMAT`이 아예 정의되지 않은 상태가 된다. 이를 `if not defined`로 예외 처리한다. 값을 비교하는 게 아닌 변수 자체를 보는 것이다.

![확장자 선택 메뉴](/assets/etc/image-batch/converter-format-menu.png)

**4. 결과를 저장할 경로**

```bat
set "OUT=%FOLDER%\converted_%FORMAT%"
if not exist "%OUT%" mkdir "%OUT%"
```

원본을 덮어쓰지 않도록 결과는 따로 저장한다. 폴더 이름에 선택한 포맷을 붙여서 `converted_webp` 같은 식으로 생성하도록 했다. 같은 폴더를 webp로도 돌리고 jpg로도 돌리면 결과가 섞이지 않고 각각 쌓이게 된다.

돌려보고 결과가 마음에 안 들면 결과 폴더만 지우고 다시 돌리면 된다.

**5. 파일을 하나씩 변환**

```bat
for %%F in ("%FOLDER%\*.jpg" "%FOLDER%\*.jpeg" "%FOLDER%\*.png" ... ) do (
    if exist "%%~fF" (
        if /i not "%%~xF"==".%FORMAT%" (
            echo 변환 중: %%~nxF
            magick "%%~fF" "%OUT%\%%~nF.%FORMAT%"
        )
    )
)
```

실제 변환을 수행하는 라인이다.

`for %%F in (...) do`는 괄호 안의 패턴에 맞는 파일을 하나씩 `%%F`에 담아서 블럭을 반복한다. 어떤 확장자로 들어올지 몰라서 jpg, jpeg, png, webp, bmp, gif, tif, tiff를 전부 나열해뒀다.

`%%~` 뒤에 붙는 글자는 파일 경로에서 필요한 부분만 뽑아주는 문법이다.

- `%%~fF` : 전체 경로
- `%%~nF` : 확장자를 뺀 파일명
- `%%~xF` : 확장자
- `%%~nxF` : 파일명과 확장자

그래서 `%%~nF.%FORMAT%`라고 쓰면 파일명은 그대로 두고 확장자만 바꾼 이름이 된다.

`if /i not "%%~xF"==".%FORMAT%"`는 이미 목표 포맷인 파일을 건너뛰는 조건이다. `/i`는 대소문자를 무시하는 옵션이라 `.JPG`와 `.jpg`를 같은 것으로 본다. png 파일을 png로 다시 변환하는 일이 없도록 넣었다.

변환 자체는 `magick 원본 결과` 한 줄이 처리한다. ImageMagick은 결과 파일의 확장자를 보고 포맷을 정하기 때문에, 파일명을 `.webp`로 적어주기만 하면 webp로 변환된다.

![변환 완료 로그와 결과 폴더](/assets/etc/image-batch/converter-result.png)

<br/>

---

<br/>

# 이미지 리사이징

`image_resizer.bat`. 포맷은 그대로 두고 크기만 바꾼다. 변환기와 달리 입력받을 게 많아 구조가 복잡하다.

## 동작 방식

**1. 설치 확인과 폴더 입력**

설치 확인은 변환기와 같다. 폴더 입력은 조금 더 꼼꼼하게 받는다.

```bat
set "FOLDER="
set /p "FOLDER=이미지 폴더 경로를 입력하세요: "

if not defined FOLDER (
    echo 경로가 입력되지 않았습니다.
    pause
    exit /b 1
)

set "FOLDER=%FOLDER:"=%"
if "%FOLDER:~-1%"=="\" set "FOLDER=%FOLDER:~0,-1%"

if not exist "%FOLDER%\" (
    echo 폴더를 찾을 수 없습니다.
    pause
    exit /b 1
)
```

`set /p`는 엔터만 치면 변수를 건드리지 않고 넘어간다. 그래서 입력받기 전에 `set "FOLDER="`로 먼저 비워두고, 빈 입력이면 안내를 띄우고 종료한다.

큰따옴표는 변환기와 같은 방법으로 떼어낸다. 그 다음 줄은 경로 끝의 백슬래시를 지우는 부분이다.

- `%FOLDER:~-1%` : 마지막 한 글자
- `%FOLDER:~0,-1%` : 마지막 한 글자를 뺀 나머지

`F:\images\`처럼 끝에 백슬래시를 붙여서 넣으면, 뒤에서 `%FOLDER%\resized`로 이어붙일 때 백슬래시가 두 번 들어간다. 이걸 방지하기 위해 넣었다.

존재 확인은 `if not exist "%FOLDER%\"`로 뒤에 백슬래시가 붙어 있다. 백슬래시를 붙이면 폴더인지를 확인하게 된다. 안 붙이면 같은 이름의 파일이 있어도 통과해버린다.

**2. 리사이징 방식과 단위 선택**

```bat
echo 1. 퍼센트로 리사이징
echo 2. 고정 사이즈 (px)
echo 3. 고정 사이즈 (cm)
set /p "CHOICE=번호 입력: "

if "%CHOICE%"=="1" goto PERCENT
if "%CHOICE%"=="2" goto PIXEL
if "%CHOICE%"=="3" goto CM
```

여기가 변환기와 다른 부분이다. 변환기는 선택에 따라 변수 하나만 바뀌면 됐지만, 리사이징은 선택 자체가 다르다. 퍼센트는 숫자 하나, 픽셀은 가로세로 두 개, cm는 가로세로에 DPI까지 세 개가 필요하다.

그래서 `goto`로 각자 다른 입력 구간으로 점프한다. batch에는 함수가 없고 `:라벨`과 `goto`가 있기에, 분기 로직을 짜려면 이렇게 라벨을 징검다리처럼 놓고 뛰어다니게 된다.

![리사이징 방식 선택 메뉴](/assets/etc/image-batch/resizer-mode-menu.png)

**3. 숫자 검사**

```bat
if not defined SIZE goto ERR_VAL
for /f "delims=0123456789" %%A in ("%SIZE%") do goto ERR_VAL
if %SIZE% LEQ 0 goto ERR_VAL

...

:ERR_VAL
echo 올바른 숫자를 입력하세요.
pause
exit /b 1
```

이 블럭이 처음 봤을 때 또잉했던 부분이었다. batch에는 "이 문자열이 숫자냐"를 물어보는 딸깍 메서드 같은게 없다. 그래서 뻉뱅 돌려서 확인해야 한다.

`for /f "delims=..."`는 지정한 문자들을 구분자로 보고 문자열을 쪼갠다. 구분자로 `0123456789`를 전부 넘기면, 입력값이 순수하게 숫자로만 되어 있을 경우 쪼갤 조각이 하나도 남지 않아서 `do` 뒤가 아예 실행되지 않는다. 반대로 `a123123`처럼 숫자가 아닌 글자가 섞여 있으면 `a`가 조각으로 남아서 `do` 뒤가 실행되고 `ERR_VAL`로 넘어간다.

정규식이 없는 환경에서 사용하는 우회 방식이다.

순서도 중요하다. 빈 입력(`if not defined`)을 먼저 걸러야 한다. 빈 값으로 `if %SIZE% LEQ 0`까지 가면 `if  LEQ 0`이 되어 문법 오류로 멈춘다. 숫자 검사를 통과한 뒤에야 0 이하 검사를 한다.

픽셀과 cm 구간도 가로, 세로, DPI 각각에 같은 세 줄이 들어가 있고, 실패하면 전부 `:ERR_VAL` 한 곳으로 모인다.

**4. 옵션 문자열**

검사를 통과하면 각 구간에서 magick에 넘길 `-resize` 값을 `RESIZE_OPT`에 미리 만들어 둔다.

```bat
:PERCENT
set "RESIZE_OPT=%SIZE%%%"

:PIXEL
set "RESIZE_OPT=%WIDTH%x%HEIGHT%!"

:CM
set /a "PX_WIDTH=(WIDTH * DPI * 100) / 254"
set /a "PX_HEIGHT=(HEIGHT * DPI * 100) / 254"
set "RESIZE_OPT=%PX_WIDTH%x%PX_HEIGHT%!"
```

이렇게 해두면 루프에서는 방식과 상관없이 `-resize "!RESIZE_OPT!"` 한 줄만 쓰면 된다.

- `-resize 50%` 는 원본 대비 비율로 줄인다. 비율이 유지되므로 세로로 긴 사진과 가로로 긴 사진이 각자의 비율을 지키면서 줄어든다.
- `-resize 800x600!` 의 느낌표를 잘 보자. 느낌표가 없으면 ImageMagick은 비율을 지키려고 지정한 크기 **안에 들어가도록** 맞춘다. 느낌표를 붙이면 비율을 무시하고 정확히 그 크기로 강제한다. 비율이 제각각인 이미지를 카드 레이아웃에 똑같은 크기로 꽂아넣어야 했어서 이 강제 옵션이 필요했다.
- cm 모드는 cm를 픽셀로 직접 계산해서 넘긴다. 인쇄물로 넘겨야 할 때 쓰려고 넣었다.

`%SIZE%%%`에 퍼센트가 세 개 있다. batch에서 `%`는 변수 기호라, 퍼센트 한 글자를 값으로 넣으려면 `%%`로 두 번 써야 한다. 앞의 하나는 `%SIZE%`의 닫는 기호다.

cm 계산식은 `픽셀 = cm × DPI ÷ 2.54`다. 1인치가 2.54cm이고 DPI는 1인치에 들어가는 픽셀 수이기 때문이다. 그런데 `set /a`는 정수 계산만 된다. 그래서 2.54 대신 분자에 100을 곱하고 254로 나눴다. 10cm, 300DPI면 `10 × 300 × 100 ÷ 254`로 1181px이 나온다.

**5. 루프로 변환**

```bat
:START
set "OUT=%FOLDER%\resized"
if not exist "%OUT%" mkdir "%OUT%"

set /a SUCCESS=0
set /a FAILED=0
set /a TOTAL=0

for %%E in (jpg jpeg png webp bmp gif tif tiff) do (
    for %%F in ("%FOLDER%\*.%%E") do (
        if exist "%%~fF" (
            set /a TOTAL+=1
            echo 처리 중: %%~nxF

            magick "%%~fF" -resize "!RESIZE_OPT!" "%OUT%\%%~nF%%~xF"

            if errorlevel 1 (
                echo [실패] %%~nxF
                set /a FAILED+=1
            ) else (
                echo [성공] %%~nxF
                set /a SUCCESS+=1
            )
        )
    )
)
```

세 갈래로 흩어졌던 흐름이 `:START`로 다시 모인다. 어느 방식을 골랐든 결국 폴더를 훑어서 파일마다 magick을 돌린다는 건 같기 때문.

변환기와 달라진 점은 두 가지다.

먼저 루프가 두 겹이다. 바깥 루프가 확장자 목록을 하나씩 꺼내고, 안쪽 루프가 그 확장자의 파일을 찾는다. 변환기처럼 패턴 여덟 개를 한 줄에 늘어놓는 것보다 확장자를 추가하거나 뺄 때 보기 편하다.

그리고 성공과 실패를 세는 카운터가 추가됐다. 여기서 주의할 게 있는데, batch의 `for` 블럭은 실행 전에 블럭 전체의 변수를 한 번에 치환한다. 루프 안에서 `%SUCCESS%`를 읽으면 루프가 몇 바퀴를 돌아도 처음 값만 계속 보인다. 변수를 올려도 반영이 안 되는 것이다.

그래서 스크립트 맨 위에 `setlocal EnableDelayedExpansion`을 켜고, 루프 안에서 바뀌는 값은 `!RESIZE_OPT!`, `!TOTAL!`처럼 느낌표로 읽는다.

> **지연 확장**
>
> batch는 원래 `%변수%`를 명령을 실행하기 전에 미리 값으로 바꿔둔다. `for`나 `if`의 괄호 블럭은 통째로 한 명령으로 취급되기 때문에, 블럭 안에서 값을 바꿔도 `%변수%`는 블럭에 들어가기 전 값 그대로다. `setlocal EnableDelayedExpansion`을 켜고 `!변수!`로 쓰면 실제로 그 줄이 실행될 때 값을 읽어온다. 이걸 지연 확장이라고 부른다.

magick이 실패하면 0이 아닌 종료 코드를 남긴다. `if errorlevel 1`은 "종료 코드가 1 이상이면"이라는 의미이다. 이 문법은 `%errorlevel%`과 달리 실행 시점에 값을 확인하기 때문에 루프 안에서도 그대로 쓸 수 있다.

깨진 파일이나 권한 문제로 한두 장이 실패해도 전체가 멈추지 않고, 실패한 파일명만 찍고 다음으로 넘어간다. 수백 장을 돌린다고 가정할 때, 돌려놓고 후에 에러찍힌 곳만 보면 된다.

**6. 결과 출력**

```bat
echo ===== 변환 결과 =====
echo 전체 파일: !TOTAL!
echo 성공: !SUCCESS!
echo 실패: !FAILED!
echo 저장 위치: %OUT%

if !TOTAL! EQU 0 echo 변환할 이미지가 없습니다.
```

마지막으로 결과를 출력한다. `TOTAL`이 0이면 따로 안내를 띄우는데, 경로를 잘못 넣었을 때 아무 일도 안 일어난 것과 이미지가 없는 것을 구분해주기 위함이다.

![리사이징 결과 리포트](/assets/etc/image-batch/resizer-report.png)

<br/>

---

<br/>

## 돌아보며

batch는 요즘 기준으로 보면 불편한 도구다. 정규식도 없고, 함수도 없고, 변수 치환 시점 때문에 루프 안에서 숫자 하나 못 세는 언어다. Node로 스크립트를 쓰거나 sharp를 붙이면 훨씬 짧고 읽기 좋게 끝난다.

그래도 이걸 계속 쓰는 이유는 단순하다. 설치할 게 없고, 파일 하나 더블클릭하면 끝난다는 점이다. 폴더에 .bat 하나 던져두면 다음 달에도 그냥 돌아간다.

당시엔 사내 유틸을 어깨넘어로 보고 GPT에 문법을 물어가며 더듬더듬 만들었던 것이, 몇 년 지나 포맷 자동 변환이 안 되는 환경에서 프로젝트 이미지를 정리하는 데 그대로 쓰이고 있다. 반복되는 손일을 한 번 일괄 스크립트로 묶어두니 생각보다 편해 만족한다.