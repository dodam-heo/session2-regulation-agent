# Cloudflare Worker 연결 — 가장 간단한 운영 방법

이 프로젝트의 GitHub Pages는 기존 주소를 유지합니다. **AI 생성 요청만 Cloudflare Worker가 Gemini에 중계**합니다. GitHub Pages 방문자는 Gemini API 키를 발급하거나 입력하지 않습니다.

## 이미 완료한 사항

- Cloudflare Worker: `session2-regulation-ai`
- 주소: `https://session2-regulation-ai.dodam6002.workers.dev`
- Worker 비밀 환경변수: `GEMINI_API_KEY` (사용자가 Cloudflare Settings → Variables and Secrets에서 등록)
- GitHub Pages의 `AI 초안 제안 요청` 버튼은 이 주소로 자동 연결됨. AI 서버 주소를 직접 입력할 필요 없음

## **딱 한 번** Cloudflare에 중계 코드 배포하기

1. Cloudflare에 로그인하고 `Workers & Pages → session2-regulation-ai` 열기
2. 우측 상단 **Edit code** 클릭
3. [Worker 소스 파일](../cloudflare/worker.js) 의 **Raw** 파일 전체를 복사
4. Hello World 예제 코드를 전부 지우고 붙여넣기
5. 우측 상단 **Deploy** 클릭. Secret `GEMINI_API_KEY`는 코드에 **붙여넣지 말 것**
6. [연결 확인 주소](https://session2-regulation-ai.dodam6002.workers.dev/api/health) 접속. 다음과 비슷한 JSON이 표시되면 배포와 Secret 연결은 확인됨:

```json
{"ok":true,"aiConnected":true,"provider":"gemini","model":"gemini-flash-latest"}
```

`aiConnected:true`는 **키 존재 확인**이지, Gemini의 실제 응답 성공을 뜻하지 않습니다. 반드시 아래에서 생성 버튼까지 시험하세요.

## 실제 AI 시험

1. [세션 2 규정 작업실](https://dodam-heo.github.io/session2-regulation-agent/) 새로고침
2. **규정 개정**으로 가상의 규정 작업 생성. 현행 조문은 `제1조(목적) 업무의 목적을 정한다.` 등 임의의 테스트 문구 입력
3. **업무 개요 → AI 초안 작성 보조**에서 **AI 서버 연결 확인**을 눌러 `AI 서버 설정 연결됨` 상태 확인
4. 작성 요청: `제1조 문구를 더 명확하게 수정하고 다른 조문은 유지해 줘`
5. 외부 AI 전송 동의 → **AI 초안 제안 요청**
6. 화면에 `AI 제안 · 적용 전 검토`가 나타나면 서버 연동 성공
7. 필요하면 **이 제안으로 초안 교체** 버튼을 누를 때만 초안에 반영됨

## 보안·호출 제한 주의

- Worker는 `Origin: https://dodam-heo.github.io`인 브라우저 요청만 허용하고, 입력 길이·응답 형식·요청 횟수를 제한합니다. 단, **Origin은 봇에서 위조할 수 있습니다**.
- Worker 코드에는 격리 인스턴스별 간이 호출 제한(같은 접속원 기준 5분에 6회, 격리 인스턴스 기준 시간당 120회)이 포함됩니다. **전역·월간 비용 상한이나 봇 남용 차단을 보장하지 않습니다.**
- Cloudflare의 `AI_RATE_LIMITER` 바인딩을 설정하면 Cloudflare 위치별 호출 제한을 추가할 수 있습니다. 해당 바인딩은 **없어도 Worker가 실행되지만**, 공개 운영 시에는 추가 제한과 Gemini 프로젝트의 쿼터·사용량 알림 설정을 권장합니다.
- Gemini API 키는 Cloudflare **Secret**에만 둡니다. `cloudflare/worker.js`, GitHub Pages, HTML, README, Actions 산출물에 키를 입력하거나 출력하지 않습니다.
- 기관 내부자료·비공개 규정은 정책에 따른 외부 AI 전송 승인이 없으면 넣지 마세요.
- 여러 명이 공유하는 공개 사이트에서 완전한 비용 방어가 필요하다면 Turnstile 인증·서버 측 발급 토큰·엄격한 전역 쿼터를 추가해야 합니다.

## 특정 LLM 비종속 구조

GitHub Pages는 `POST /api/assist`의 `{proposalText,reason,warnings,provider,model}` 응답만 알고 공급자의 REST 형식을 알지 않습니다. 현재 Cloudflare Worker 내부에서 `gemini-flash-latest`를 사용합니다. 공급자 교체는 Worker 중계 구현 또는 [기존 Node 공급자 어댑터](../server/providers.js)에서 처리합니다. **공통 API가 유지되면 웹 UI는 변경되지 않습니다.**

## 현재 가능한 테스트의 범위

`npm test`는 Worker의 Gemini API 통신을 **가짜 HTTP 응답**으로 검증합니다. 실제 API 키가 이 저장소에 없으므로 자동 테스트는 실제 Gemini를 호출하지 않습니다. 위 Cloudflare Worker 소스를 사람이 **Edit code → Deploy**한 후에만 실제 엔드포인트가 사용됩니다.
