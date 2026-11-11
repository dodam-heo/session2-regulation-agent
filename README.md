# 규정 작업실 · 세션 2 「규정 제·개정 에이전트」

세션 2 과제③을 위한 **별도의 신규 웹 프로젝트**입니다. `policy-domino`, `policy-domino-next` 저장소와 코드·수집데이터·배포를 공유하지 않습니다.

## 기능

- **업무 진입:** 자유 요청, 규정 제정·개정·근거 조사·신구 대비·검토·문서 작성 중 선택하여 시작
- **통합 작업:** 공식 현행 판본과 작성 초안 분리, 판본 복구, 담당자 결정 장부, 근거 카드, 이유서 및 시행일을 하나의 작업에 보관
- **편집·비교:** 원문 보존, 조문 단위 수정·삭제·신설, 신구조문 대조, 변경 어구 밑줄, 조문번호 이동 후보(확정 전 자동 수정 금지)
- **오류 점검:** 내부 인용, 항 번호 이동 후보, 조문 구조, 이유서 수치 불일치 탐지
- **문서:** 실제 OOXML Word(.docx) 출력, 텍스트/HTML/작업 JSON 내보내기 및 복원, 부칙·이유서·절차 체크리스트
- **AI 제안:** 서버에서 Gemini를 기본 호출. 다른 LLM은 `LLM_PROVIDER`·`LLM_MODEL` 설정만 변경. 브라우저는 공통 API `/api/assist`만 사용하며, 전송 동의·담당자 승인 후 적용.

가상 예제는 **데모 자료이며 법적 근거의 유효성을 입증하는 사례가 아닙니다.**

## 공식 법령·행정규칙·자치법규 조회

‘근거·자료 → 공식 조회’에서 법령, 행정규칙, 자치법규 중 하나를 선택하고 [국가법령정보 공동활용](https://open.law.go.kr/)에서 사용하는 **공개 OC 식별값 `dori`를 기본 적용해** 검색합니다. OC 입력은 필요하지 않습니다. 법령 조회에 외부 AI 서비스 가입이나 로그인이 필요하지 않습니다. GitHub Pages의 브라우저가 국가법령정보센터 DRF API로 직접 HTTPS GET 요청합니다. OC 기본값 `dori`는 공개 GitHub 소스에 포함되므로 비밀키로 취급하지 않습니다. 작업 백업·localStorage에는 별도로 저장하지 않습니다.

조회 목록에서 원문 수신을 선택하면 원문, 식별번호, 공포·시행일, 취득일시와 SHA-256을 묶어 근거 카드로 등록하거나 현행 기준본으로 지정할 수 있습니다. 검색 성공과 법적 위임·효력 검증은 별개입니다. 과거·시행예정 법령은 `eflaw` 공식 API, 행정규칙·자치법규는 연혁 검색 옵션을 사용합니다. 별표의 외부 첨부 파일은 자동 원문에 포함되지 않을 수 있으므로 공식 화면에서 별도로 확인해야 합니다. 사용자가 직접 등록한 문서는 자동으로 '공식 API 확인' 상태가 되지 않습니다.

**주의:** 조회에는 기본 OC `dori`를 자동 사용합니다. 서버 측 공동활용 권한·제공 API 응답이 유효하지 않으면 실패 이유를 표시하며, 샘플 데이터로 대체하지 않습니다.

## 실행

Node.js 20 이상:

```bash
npm test
npm run check
npm start
# http://127.0.0.1:3000
```

`npm run build`는 `dist/`에 정적 사이트만 만듭니다.

### GitHub Pages

GitHub의 **Settings → Pages → Build and deployment → GitHub Actions**를 선택합니다. `main`에 push되면 `.github/workflows/ci-pages.yml`이 테스트하고 `dist/`를 배포합니다.

**Gemini AI는 전용 백엔드가 연결된 경우에만 작동합니다.** GitHub Pages는 정적 웹페이지이므로 Gemini API 키를 보호하거나 API 서버를 실행할 수 없습니다. [Google Gemini 공식 안내](https://ai.google.dev/gemini-api/docs/api-key)에 따라 키는 서버 측 비밀 환경변수에만 넣습니다.

화면의 **업무 개요 → AI 초안 작성 보조**에서 HTTPS AI 서버 주소와 (사용 시) 서버 접근 토큰을 입력합니다. 전송 동의 버튼을 눌렀을 때만 해당 서버에 규정 자료가 전달됩니다. AI 결과는 검토용 제안이며 수동 승인 전에는 초안을 변경하지 않습니다.

### 즉시 사용: Cloudflare Worker Gemini 연동

**Cloudflare Worker `session2-regulation-ai`에서 `GEMINI_API_KEY`를 Secret으로 등록한 경우**, [Cloudflare Worker 1회 코드 배포 안내](docs/cloudflare-worker.md)에 따라 `cloudflare/worker.js`를 Worker의 **Edit code → Deploy**로 배포하세요.

사이트의 AI 주소는 이미 `https://session2-regulation-ai.dodam6002.workers.dev`로 설정되어 있어 심사위원이 별도 API 키·접근 토큰을 입력하지 않습니다. **Worker를 직접 배포하기 전에는 실제 Gemini 생성이 아직 동작하지 않습니다.**

Cloudflare Worker는 기본적인 브라우저 출처 검사와 인스턴스별 간이 요청 제한을 제공합니다. 전역 비용 보호는 별도 쿼터·인증·Cloudflare 제한 설정이 필요합니다.

### AI 백엔드 — Gemini 기본, LLM 교체 가능

다음 값들을 `.env` 파일에 두고 개인 서버에서 실행합니다. **실제 `.env`를 Git에 추가하지 마세요.**

```bash
cp .env.example .env
# .env에서 GEMINI_API_KEY에 개인 Gemini API 키를 설정
node --env-file=.env server/index.js
# http://127.0.0.1:3000
```

- 기본 공급자 `LLM_PROVIDER=gemini` / 기본 모델 `gemini-flash-latest`.
- 다른 모델로 전환: 서버에서 `LLM_PROVIDER=compatible` 또는 `anthropic`, `LLM_MODEL`, `LLM_API_KEY` 및 필요할 때 `LLM_API_URL` 설정. UI 코드는 수정할 필요가 없습니다.
- 서버는 `POST /api/assist`로 `proposalText`, `reason`, `warnings`, `provider`, `model`을 동일한 형식으로 반환합니다.
- 외부 서버 공개 시에는 `HOST=0.0.0.0`, `AI_ALLOWED_ORIGINS=https://dodam-heo.github.io`, `AI_ACCESS_TOKEN`(별도 강력한 토큰)을 필수로 설정합니다. 실제 API 키 자체는 클라이언트에 제공하지 않습니다.
- Google Cloud Run 등 HTTPS 컨테이너 서비스에 서버를 배포할 수 있습니다. [AI 서버 배포 안내](docs/ai-deployment.md)를 참고하세요. 클라우드 계정/서버를 연결하지 않은 상태에서는 사이트에서 실제 AI 호출을 완료할 수 없습니다.

## 검증 범위

공급자 교체·Gemini REST 요청 구조·응답 검증·서버 접근 제어는 모의 응답 자동 테스트로 검사합니다. **실제 Gemini API 키를 통한 모델 호출 또는 Cloud Run 서버의 실배포 성공을 이 테스트로 주장하지 않습니다.**

## 현재 한계

공식 법령 API 조회는 AI 서버 없이 웹브라우저에서 가능하지만, 외부 API 오류·권한 제한은 사용자에게 표시됩니다. 상위법 위임의 **법적 유효성 확인**, 법제 표준 개정지시문 형식에 대한 완전한 검사, 조문 분할·병합의 의미적 자동 확정, HWPX 파일 생성·공식 한컴 호환검증, 기관별 전자결재·발령과 기관계정별 권한관리 등은 구현·검증 범위 밖입니다. DOCX 생성은 지원하지만 모든 한글 전용 서식과 1:1 동일하지 않습니다. 자동 점검은 법률 적합성 검토가 아닙니다.

사용자 자료는 현재 브라우저의 `localStorage`에 보관하며, 개인정보·비공개 규정을 공개 서버에서 다루지 않도록 주의해야 합니다. '작업 백업' 기능으로 JSON을 별도 보관할 수 있습니다.

## 출처 및 설계 기준

- 사용자 제공: `세션2_규정제개정에이전트_상세기능명세_v1.1`
- 사용자 제공: `정책도미노_규정제개정에이전트_화면와이어프레임_설계서_v1.0`의 **세션 2 기능 부분**
- 비교 참고: 사용자 제공 Gemini HTML `4.html` — 시안의 특정 제5조·제7조 전용 코드와 단순 숫자 교체 폴백은 사용하지 않음

관련 구현 범위는 [아키텍처](docs/architecture.md)와 [검증 계획](docs/acceptance.md) 참고.


## 테스트와 출품 검증

- `npm run check`: 파서·비교·인용/이유서 검사·문서 연동·DOCX OOXML·법령 DRF 검색/인증/판본·AI 보안·번호이동 후보 회귀 테스트
- PR CI는 테스트 및 Pages용 정적 산출물에 필수 모듈이 모두 있는지 확인합니다. **GitHub Pages 실배포는 main 브랜치만** 허용합니다.
- 외부 API를 쓰는 기능은 OC 인증·Gemini 백엔드 설정·네트워크 접근 등의 실제 사용자 환경 테스트가 따로 필요합니다. 통과한 단위 테스트만으로 실시간 공식 조회나 법적 검토가 완료되었다고 주장하지 않습니다.
