---
title: "AI 워크스페이스 툴 제작기 (1) — 제작 목적과 앱 기획"
date: "2026-11-06"
description: "AI 기능을 붙인 워크스페이스 툴을 직접 만들어보며, 제작 목적과 화면별 기능 기획, 개발 순서를 정리"
tags: ["ai", "llm", "rag", "ai-agent", "mcp", "사이드프로젝트"]
thumbnail: "/assets/thumbnails/ai/ai-workspace-tool.webp"
---

이번 포스팅 주제는 AI 기능을 최대한 활용한 워크스페이스 툴 제작기이다.

<callout title="이 글에서 다루는 것">

- 왜 AI 워크스페이스 툴을 직접 만들어보려 하는지
- 화면별로 어떤 기능을 넣고, 어떤 주제를 공부하며 채워나갈지
- 앞으로의 개발 순서

</callout>

# 제작 목적

## AI는 어디까지 왔나

LLM이 처음 등장했을 때만 해도 조사, 대화, 코드 보조처럼 검색보다 조금 영특한 보조 툴에 지나지 않았다. 하지만 시간이 흐르면서 편리함을 앞세워 다양한 방식으로 IT 곳곳에 스며들었다.

코딩이라 불리던 소프트웨어 엔지니어링이 여러 산업에 접목될 때 +@, +x라는 표현이 붙을 만큼 무궁무진한 가능성을 보여줬는데, 그 당찬 포부가 무색할 정도로 AI의 등장과 발전은 그야말로 획기적이었다.

그렇다고 이를 부정적으로만 보지는 않는다. 생산성이 오르면서 반복 구현과 오류 검출에 쏟던 시간이 줄었고, 그만큼 **양질의 컨텐츠와 기능 구현, 기획에 집중할 시간을 벌게 된 시기**가 온 것이라 생각한다.

## 디지털 전환과 닮은 AI 전환

<figure>
<img src="/assets/AI/ai-workspace-tool-1/presentation-past-present.webp" alt="AI로 생성한 과거와 현대의 발표 모습" loading="lazy">
<figcaption>AI로 생성한 과거와 현대의 발표 모습 이미지</figcaption>
</figure>

항상 생각한 것이, 디지털 전환 시기와 AI의 등장이 엇비슷해 보이지 않나 였다.

디지털로 전환되며 컴퓨터를 사용하고, 용도에 맞는 툴을 응용하면서 더 빠르고 편리하게 내용을 정리해 다룰 수 있게 된게 불과 얼마 전이다. 직접 손으로 제작할 시간에 빠르게 전문화된 툴로 시간을 줄일 수 있게 되었고 생산성과 업무 효율에 도움이 되었다.

<callout variant="point">

디지털에서 AI 전환 시기는 이와 비슷하지 않을까.
더 창의적이고 속도를 내며 퀄리티를 살리는 쪽이 이점을 가져가는 양상을 보일 것 같다.

</callout>

## 웹 개발자에게 AI란

내가 속한 웹 기술 쪽에서는 어떨까.

AI 기능은 대부분의 산업에서 그렇듯, 특히 웹 서비스에서는 이미 그 일부가 되었다. 검색, 요약, 질의응답, 챗봇처럼 LLM을 쓰는 기능이 일반 웹 서비스 안으로 속속 들어오고 있다. 모델을 직접 학습시키는 일은 소수의 팀이 맡지만, **그 모델을 가져와 서비스에 붙이는 일은 이제 웹개발자의 역할**이 되었다.

지금까지는 포스팅 검수, AI Agent를 활용한 바이브 코딩, 코드 보조 정도로만 AI를 써왔는데, 이 경험만으로는 웹을 배워나가는 데 한참 부족하다고 생각했다. 손으로 도표를 작성하다 이제 엑셀을 배워 입력하는 단계에 왔는데 function과 스크립트라는 기능을 마주한 것이다..

## 무료 모델, 무료 인프라로만

이 프로젝트는 **무료 모델과 무료 인프라만으로 운영**할 계획이다.

지금 결제해서 쓰고 있는 Claude 플랜처럼 넉넉하게 쓰면 그만이긴 하다. 하지만 아직 한도 안에서 효율적으로 쓰는 방법을 덜 익혔고, 비용이 새어나가거나 요청이 실패하는 지점이 생겼을 때 어떻게 대처할지 스스로 결정할 힘도 부족한 상태라고 생각한다.

실무에서도 비용과 속도는 늘 제약으로 따라온다. 그 안에서 적절한 균형을 잡는 경험을 머릿속에 쌓아 "돌다리도 두들겨볼 줄 아는" 개발자가 되고 싶었다.

## 진행 방식

이번에도 이전 Z-UI 도전기처럼 AI에게 커리큘럼과 방향성 가이드를 받아, 마치 과제를 수행하듯 기능들을 구현해보려 한다.

AI Agent를 활용하면 동작하는 앱은 당연히 금방 만들 수 있다. 하지만 왜 이렇게 만들었는지, 문제가 생기면 어디를 봐야 하는지 설명하지 못한다면 서비스를 운영하는 사람이 아니라 되려 "조금 아는 AI 서비스 이용자"에 불과하다는 생각밖에 들지 않았다.

<callout variant="point">

기능마다 직접 구현해보고, 막힌 지점과 해결 과정을 글로 남기려는 이유이다.

</callout>

---

# 앱 기획

## 앱 구성

아래는 Claude Code를 활용해 제작한 초기 AI WorkSpace의 모습이다. 아직 기능은 하나도 없고, **화면 틀과 디자인 시스템, 공통 컴포넌트만** 프롬프팅대로 만들어 둔 상태이다. 각 화면은 커리큘럼 주제를 진행하면서 하나씩 채워 나갈 예정이다.

<div class="screens">
<img src="/assets/AI/ai-workspace-tool-1/01-overview-light.webp" alt="AI WorkSpace 전체 화면 라이트 모드" loading="lazy">
<img src="/assets/AI/ai-workspace-tool-1/11-overview-dark.webp" alt="AI WorkSpace 전체 화면 다크 모드" loading="lazy">
</div>

화면 구성은 좌측 사이드바, 상단 헤더, 가운데 컨텐츠 영역으로 나누었다. 장식 요소 같은 것들보다 정보 제공 구조와 기능에 집중하는 디자인 원칙에 맞게 설계했다.

## 사이드바 구성

![사이드바](/assets/AI/ai-workspace-tool-1/02-sidebar.webp)

사이드바 메뉴가 곧 이 서비스의 기능 목록이다. 메뉴마다 화면을 채울 커리큘럼 주제가 정해져 있다.

| 메뉴 | 기능 |
| --- | --- |
| Dashboard | 서비스 전체 현황 요약 |
| AI Assistant | 업무용 AI 채팅 |
| Documents | 문서 업로드, 요약, 정보 추출 |
| Knowledge Base | 문서 기반 검색과 질의응답 |
| Automation | AI Agent 업무 자동화 |
| Monitoring | 사용량, 비용, 품질 추적 |
| Settings | 모델, 라우팅, 권한 설정 |
| UI Components | 공통 컴포넌트 모음(개발 확인용) |

아직 만들지 않은 화면에는 "준비 중인 화면"이라는 안내와 함께, 어떤 기능으로 채워질지와 들어갈 기능 목록을 표시해 두었다.

---

## AI Assistant — 업무용 AI 채팅

![AI Assistant](/assets/AI/ai-workspace-tool-1/03-assistant.webp)

### 구현 내용

질문하면 답변이 실시간으로 한 글자씩 나타나는 채팅 화면이다. 왼쪽에 대화 이력, 가운데에 대화 영역을 두고, 사용할 모델을 고를 수 있다.

이와 관련된 이력 주체, 사용자 구분 등은 **게스트 세션 형식**으로 로그인할 필요없이 구현하려한다. 서비스는 외부로 나갈 경우가 적고 블로그 자체가 폐쇄적이기에...

답변에 코드나 표가 있으면 읽기 좋게 렌더링하고, 문서를 근거로 답했다면 출처를 함께 보여준다. "이번 달 업로드된 문서 목록 알려줘"처럼 데이터가 필요한 질문에는 AI가 직접 함수를 호출해 결과를 가져온다.

### 구현 계획

| 주제 | 목표 |
| --- | --- |
| LLM 아키텍처와 Token, Context Window | 대화가 길어져도 모델의 처리 한도를 넘지 않게 관리 |
| Prompt Engineering과 Context Engineering | 답변의 역할과 형식을 정하는 시스템 프롬프트를 설계 |
| Function Calling과 Streaming | 실시간 응답과 함수 실행을 구현 |
| Multi-LLM과 모델 관리 | 여러 모델을 골라 쓰고, 한 모델이 막히면 다른 모델로 자동 전환 |

<callout title="누구를 위한 기능인가" variant="target">

사내 규정이나 업무 방식을 매번 사람에게 묻기 어려운 직원, 반복되는 질문에 답하느라 시간을 쓰는 담당자를 대상으로 그리고 구현한다.

</callout>

---

## Documents — 문서 관리와 AI 요약

![Documents](/assets/AI/ai-workspace-tool-1/04-documents.webp)

### 구현 내용

PDF와 DOCX 문서를 올리면 AI가 요약을 만들고, 문서 종류, 작성일, 핵심 키워드 같은 정보를 정해진 형식으로 추출해 저장한다.

문서 목록은 파일 탐색기처럼 표로 보여주고, 검색과 필터를 제공한다. 문서를 누르면 사이드 패널에서 요약과 추출 정보를 확인할 수 있다. 용량이 큰 문서는 업로드 후 백그라운드에서 처리하고, 진행 상태를 화면에 UI로 표시한다.

### 구현 계획

| 주제 | 목표 |
| --- | --- |
| Prompt Engineering과 Context Engineering | 문서 요약 기능 |
| LLM API와 Structured Output | AI 응답을 항상 같은 JSON 형식으로 받아 저장 |
| Redis와 비동기 AI 작업 처리 | 오래 걸리는 문서 처리를 작업 큐로 분리 |

<callout title="누구를 위한 기능인가" variant="target">

긴 보고서나 계약서를 전부 읽을 시간이 없는 실무자, 흩어진 문서를 정리하고 분류해야 하는 관리 담당자에게 도움이 될 것이다.

</callout>

---

## Knowledge Base — 문서 기반 검색과 질의응답

![Knowledge Base](/assets/AI/ai-workspace-tool-1/05-knowledge.webp)

### 구현 내용

업로드한 문서 전체를 근거로 질문에 답하는 기능을 기획했다. 문서를 작은 단위로 나눠 의미 검색이 가능한 형태로 저장해 두고, 질문이 들어오면 관련된 부분만 찾아 AI에게 근거로 넘긴다.

검색 결과 목록과 함께 어느 문서의 어느 부분을 참고했는지 보여준다. 문서가 어떻게 나뉘고 저장되었는지도 확인할 수 있게 한다.

### 구현 계획

| 주제 | 목표 |
| --- | --- |
| Embedding과 Vector Database | 문서를 벡터로 바꿔 저장 |
| RAG Architecture와 Chunking | 문서를 나누는 기준을 정하고, 검색 결과를 근거로 답함 |
| Hybrid Search와 Reranking | 키워드 검색과 의미 검색을 함께 써서 정확도를 높임 |

<callout title="누구를 위한 기능인가" variant="target">

회사 자료가 많아 원하는 내용을 찾기 어려운 직원, 업무를 빨리 파악해야 하는 신규 인원에게 도움이 된다. 답변에 근거 문서가 함께 나오기 때문에 AI의 답을 그대로 믿지 않고 직접 확인할 수 있다.

</callout>

---

## Automation — AI Agent 업무 자동화

![Automation](/assets/AI/ai-workspace-tool-1/06-automation.webp)

### 구현 내용

여러 단계로 이루어진 업무를 AI Agent가 처리하는 화면이다.

가령 "새로 올라온 문서를 요약하고, 중요도에 따라 분류한 뒤, 담당자에게 알릴 내용을 정리" 같은 흐름을 노드와 연결선으로 구성한다. 실행하면 각 단계의 진행 상태와 로그를 확인할 수 있다. 외부 데이터베이스나 API는 MCP 서버를 통해 연결한다.

### 구현 계획

| 주제 | 목표 |
| --- | --- |
| AI Agent와 Tool Calling | AI가 상황에 맞는 도구를 스스로 골라 사용하게 함 |
| LangGraph와 Agent Workflow | 여러 단계의 작업 흐름과 분기를 설계 |
| MCP Architecture와 Server 구현 | 외부 시스템과 연결하는 MCP 서버를 직접 생성 |

<callout title="누구를 위한 기능인가" variant="target">

매일 비슷한 확인, 정리, 보고 작업을 반복하는 실무자에게 도움이 된다. 사람은 판단이 필요한 일에 집중하고, 정해진 절차는 Agent에게 맡기는 것이 목표다.

</callout>

---

## Monitoring — 사용량, 비용, 품질 현황

![Monitoring](/assets/AI/ai-workspace-tool-1/07-monitoring.webp)

### 구현 내용

AI 서비스를 운영하는 데 필요한 데이터들을 표시하는 화면이다. 모델별 토큰 사용량, API 비용, 응답 시간, 오류 비율을 기간별로 확인한다.

AI 답변이 근거에 맞는지 평가한 결과도 함께 기록해서, 근거 없이 지어낸 답이 얼마나 나오는지 기록한다. 그래프는 꾸밈 없이 실제 수치를 전달하는 데 집중한다.

### 구현 계획

| 주제 | 목표 |
| --- | --- |
| LLM Evaluation과 Hallucination | 답변 품질을 평가하는 기준과 방법 생성 |
| LLMOps와 Observability | 응답 시간, 토큰 사용량, 비용을 수집하고 시각화 |

<callout title="누구를 위한 기능인가" variant="target">

AI 기능을 도입한 뒤 비용과 품질을 관리해야 하는 운영 담당자와 개발자에게 도움이 된다. 배포 버전에서는 이 데모가 실제로 얼마나 쓰였고 비용이 0으로 유지되는지를 이 화면에서 그대로 보여줄 예정이다.

</callout>

---

## Dashboard — 전체 현황

![Dashboard](/assets/AI/ai-workspace-tool-1/08-dashboard.webp)

### 구현 내용

서비스에 들어오면 처음 보이는 화면이다. 등록된 문서 수, 최근 활동, AI 사용량, 시스템 상태를 한 화면에 요약한다. 모든 정보를 카드로 감싸기보다 간결한 통계 영역과 표를 조합해서 표시한다.

### 구현 계획

| 주제 | 목표 |
| --- | --- |
| LLMOps와 Observability | Monitoring에서 수집한 지표를 요약 |

<callout>

다른 화면이 모두 만들어진 뒤에 마지막으로 완성하는 화면이다.

</callout>

---

## Settings — 모델과 권한 관리

![Settings](/assets/AI/ai-workspace-tool-1/09-settings.webp)

### 구현 내용

어떤 LLM Provider를 쓸지, 어떤 순서로 모델을 전환할지, 사용 한도를 얼마로 둘지 설정하는 화면이다.

무료 모델의 한도는 자주 바뀌기 때문에, **한도 값을 코드에 고정하지 않고 이 화면에서 조정**할 수 있게 만든다.

### 구현 계획

| 주제 | 목표 |
| --- | --- |
| LLM Provider와 API Adapter 설계 | Provider마다 다른 API를 같은 방식으로 호출할 수 있게 묶는다 |
| OpenRouter와 Multi-LLM 아키텍처 | 여러 모델을 선택해서 쓸 수 있게 한다 |
| Local LLM과 Ollama | 내 PC에서 실행하는 로컬 모델을 연결한다 |
| Model Routing과 Fallback | AI 서비스 장애나 한도 초과 시 다른 모델로 자동 전환한다 |
| AI 서비스 보안 및 배포 | 사용자 권한을 관리한다 |

<callout title="누구를 위한 기능인가" variant="target">

여러 AI 서비스를 비용과 안정성에 맞게 골라 써야 하는 운영 담당자에게 도움이 된다.

</callout>

---

# 개발 순서

아래 순서대로 진행할 예정이다. 앞 단계에서 만든 기능이 다음 단계의 기반이 된다.

<roadmap title="단계별 완성되는 화면">

1. **LLM 기초와 API 활용** — AI Assistant 기본 채팅, Documents 요약과 정보 추출
2. **Multi-LLM과 모델 관리** — AI Assistant 모델 선택, Settings 모델 설정
3. **RAG와 지식 검색** — Knowledge Base, AI Assistant 출처 표시
4. **AI Agent와 MCP** — Automation
5. **AI 서비스 아키텍처** — 프론트엔드와 AI 백엔드 분리, Documents 비동기 처리
6. **품질과 운영** — Monitoring, Dashboard, Settings 권한, 배포

</roadmap>
