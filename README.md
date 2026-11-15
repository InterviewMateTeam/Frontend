# 🎤 InterviewMate

### AI와 함께하는 실전 면접 연습 서비스

**InterviewMate**는 AI 면접관과 대화하며 실제 면접처럼 답변을 연습하고, 피드백을 통해 개선점을 확인할 수 있는 웹 서비스입니다.

사용자가 선택한 면접 유형과 입력한 정보를 바탕으로 질문을 생성하고, 음성으로 답변한 내용을 분석하여 면접 결과를 제공합니다.


---

## ✨ 주요 기능

### 1. 맞춤형 면접 모드

목적과 난이도에 따라 세 가지 면접 모드를 선택할 수 있습니다.

| 모드 | 설명 |
|---|---|
| 1분 자기소개 | 하나의 질문을 통해 자기소개와 핵심 강점 전달 연습 |
| 일반 면접 | 자기소개, 후속 질문, 마무리 질문으로 구성된 4단계 면접 |
| 심화 면접 | 답변을 바탕으로 더 깊이 있는 꼬리 질문을 진행하는 면접 |

면접 시작 전 사용자가 입력한 정보를 서버에 전달하여 질문 생성에 활용합니다.

### 2. AI 기반 면접 진행

- 면접 세션 생성 및 사용자 입력 저장
- 면접 단계에 따른 AI 질문 요청
- 이전 답변을 반영한 후속 질문 생성 요청
- 서버에서 전달받은 질문 음성 재생
- 질문 단계 및 진행 상태에 따른 화면 전환

### 3. 음성 답변 녹음 및 STT 연동

브라우저의 `MediaRecorder` API를 활용하여 사용자의 음성 답변을 녹음합니다.

- `getUserMedia`를 통한 마이크 접근
- `MediaRecorder`를 이용한 음성 데이터 수집
- 녹음 데이터를 `Blob`으로 변환
- STT API를 통한 음성 → 텍스트 변환
- 변환된 답변과 답변 소요 시간을 서버에 전달
- 녹음 종료 시 미디어 트랙 정리 및 오류 처리

### 4. AI 면접 피드백

면접 종료 후 서버에서 피드백을 조회하고 결과 화면에 표시합니다.

**주요 평가 항목**

- 전달력
- 내용 구성
- 자신감
- 시간 관리
- 논리성

총점과 종합 평가뿐 아니라 강점, 개선할 점, 질문별 답변 기록을 확인할 수 있습니다.

---

## 🛠 Tech Stack

| Category | Technologies |
|---|---|
| Language | TypeScript |
| Framework | React 19 |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router DOM |
| API | Fetch API |
| Audio | MediaRecorder API, MediaDevices API |
| Code Quality | ESLint |
| Package Manager | pnpm |
| Deployment | Vercel |

---

## 💻 Frontend Development

**프론트엔드 개발 전반을 단독으로 담당했습니다.**

### UI 및 사용자 흐름 구현

- 홈 화면과 3가지 면접 모드 선택 UI 구현
- 면접 진행, 음성 녹음, 피드백 화면 개발
- React Router 기반 페이지 라우팅 및 화면 전환
- 면접 진행 상태에 따른 인터랙션과 사용자 피드백 구현

### API 및 상태 관리

- 면접 세션 생성부터 종료까지의 API 연동
- AI 질문 생성, STT, 답변 제출, 피드백 조회 API 연결
- TypeScript 타입을 활용한 요청·응답 데이터 관리
- 면접 세션, 진행 모드, 답변 기록, 피드백 상태 관리
- 비동기 요청의 로딩 및 오류 상황 처리

### 음성 데이터 처리

- 브라우저 마이크 권한 요청 및 녹음 제어
- MediaRecorder 기반 오디오 데이터 수집
- STT 서버 연동 및 텍스트 답변 처리
- 녹음 종료 후 미디어 리소스 정리

---

## 🏗 Frontend Architecture

### 프로젝트 구조

```text
src/
├── apis/          # 서버 API 요청 및 응답 타입
├── assets/        # 이미지 및 SVG 리소스
├── pages/         # 서비스 페이지
│   ├── HomePage.tsx
│   ├── BasicInterviewPage.tsx
│   ├── OneMinuteIntroPage.tsx
│   └── FeedbackPage.tsx
├── utils/         # 음성 관련 유틸리티
└── App.tsx        # 라우팅 및 면접 상태 관리
```

### 면접 진행 흐름

```text
면접 모드 선택
      ↓
사용자 정보 입력
      ↓
면접 세션 생성
      ↓
AI 질문 생성 요청
      ↓
질문 텍스트 및 음성 재생
      ↓
사용자 음성 답변 녹음
      ↓
STT 변환 및 답변 제출
      ↓
다음 질문 진행 / 면접 종료
      ↓
피드백 조회 및 결과 표시
```

### 주요 구현 방식

**1. 세션 기반 면접 상태 관리**

면접 시작 시 생성된 `sessionId`를 기준으로 질문 생성, 답변 제출, 세션 종료 API를 연결했습니다.

면접 모드와 질문별 답변 기록을 React 상태로 관리하며, 면접 종료 후 결과 페이지로 전달합니다.

**2. 브라우저 음성 API와 서버 연동**

`MediaRecorder`로 녹음한 오디오 데이터를 서버의 STT API로 전송하고, 반환된 텍스트를 면접 답변으로 활용합니다.

녹음 상태와 비동기 요청 상태를 분리하여 제어하고, 녹음이 종료되면 미디어 트랙을 정리하도록 구현했습니다.

**3. 비동기 요청 및 예외 처리**

질문 생성과 피드백 조회 과정에서 요청 실패를 처리하도록 구성했습니다.

질문 생성에 실패했을 때 기본 질문을 표시하는 대체 흐름을 두고, 사용자에게 오류 상황을 안내하도록 구현했습니다.

---

## 🚀 Getting Started

### 1. Repository Clone

```bash
git clone https://github.com/InterviewMateTeam/Frontend.git
cd Frontend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Development Server

```bash
pnpm dev
```

### 4. Build & Lint

```bash
pnpm build
pnpm lint
```

일부 기능은 백엔드 API 연동이 필요하므로, 로컬 환경에서 실행할 때는 API 서버 연결 설정을 확인해야 합니다.

---


*InterviewMate는 AI 질문 생성, 음성 기반 답변, 면접 피드백을 하나의 사용자 흐름으로 연결하는 데 중점을 둔 프로젝트입니다.*
