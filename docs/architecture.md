# 세션 2 아키텍처 — MVP

## 경계
세션 2: 규정 제정/개정/비교/자체정합성 점검/자료 정리/문서 출력. 정책도미노의 변경법령 수집·기관별 영향 매핑은 포함하지 않는다.

## 코드
- `src/core/parser.js`: 규정 문서 블록(조문·부칙·별표) 파서. 원문 문자열이 기준.
- `src/core/diff.js`: 현행-초안 대응, 변경 상태, 토큰 차이.
- `src/core/validation.js`: 내부인용·항번호 이동·수치 후보 등의 결정론적 점검.
- `src/core/workcase.js`: 브라우저 작업 저장 및 버전·원본 분리.
- `src/core/outputs.js`: 텍스트/HTML/JSON 문서 생성.
- `src/main.js`: 화면, 탐색, 입력, 이벤트.
- `server/providers.js`: 모델 공급자별 요청·응답 규격을 서버측에서 정규화.
- `server/index.js`: 같은 오리진 API와 정적 파일 서버.

## 검증 기준
LLM을 통한 입안 초안/요약과 원문 판본·인용·정합성 기계검사를 분리한다. 법적 근거/외부판본 확보 실패를 성공으로 가장하지 않는다. 자동 검사는 **후보 제시**로 표기하고 법적 최종 확인은 하지 않는다. 현행과 초안을 별도로 유지하고 AI 제안은 사용자 승인 후만 반영한다.

## 배포 경계
GitHub Pages는 `dist/index.html`과 `dist/src`만 공개. API 서버와 비밀키가 없으므로 AI 기능은 비활성이다. AI가 필요하면 인증/기관 보안정책을 갖춘 전용 Node 배포와 적절한 역방향 프록시가 필요하다.

## 후속
근거 원문 출처/판본/해시, 근거 인용검증, 조문 내부 식별자, 의미 대응 검증, 제·개정문 컴파일러, 문서 템플릿, 권한/감사 체계를 순차 추가한다.


## Gemini 기본·LLM 비종속 AI 호출 경로

- 공통 인터페이스: `src/ai-client.js`의 `generateServer` → HTTPS `POST /api/assist`. 브라우저에는 Gemini·Puter 등 특정 모델 SDK를 포함하지 않는다.
- 기본 백엔드: `server/providers.js`, `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`는 서버에서만 사용. `gemini-flash-latest` 모델 ID는 서버 변수로 교체 가능.
- 대체 백엔드: 동일 서버 모듈의 `compatible` / `anthropic` 어댑터. 요청/출력 스키마는 그대로 유지하고 환경변수만 교체한다.
- 비밀키·접근제어: 공개 GitHub Pages, JavaScript, 백업 JSON에는 Gemini API 키를 넣지 않는다. HTTPS·CORS 허용 출처·별도 서버 토큰으로 보호한다.
- 응답 계약: `proposalText`, `reason`, `warnings`, `provider`, `model`; 초안 버전 검증 및 담당자 명시 승인 후에만 적용한다.
- 운영 의존성: 정적 Pages에는 서버가 없으므로 별도 HTTPS 백엔드를 배포해야 실제 Gemini 호출이 된다. 원문 검색은 독립적으로 국가법령정보센터 DRF API를 직접 호출한다.
