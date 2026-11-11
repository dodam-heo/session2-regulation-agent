# Gemini AI 서버 배포 — 모델 비종속 구성

세션 2 규정 제·개정 에이전트의 **공식 법령 조회는 GitHub Pages에서 직접 실행**합니다. AI 초안 생성은 외부 LLM을 사용하므로 HTTPS 백엔드가 필요합니다. 공모에서 요구한 특정 LLM 비종속성을 위해 브라우저는 공통 `POST /api/assist` 계약만 알고, 공급자는 서버의 `LLM_PROVIDER` 설정으로 선택합니다.

## 실행 구조

```text
브라우저(GitHub Pages)
  └─ [사용자가 전송 동의·AI 초안 요청]
       └─ POST https://<본인-Cloud-Run-주소>/api/assist
            └─ Node 서버 · CORS 허용 출처 + 접근 토큰 검증
                 └─ provider adapter (LLM_PROVIDER 설정)
                      ├─ gemini [현재 선택: GEMINI_API_KEY 서버 비밀키]
                      ├─ compatible [OpenAI 호환]
                      └─ anthropic [Claude]
결과: {proposalText, reason, warnings, provider, model}
검토·담당자 승인 전에는 규정 초안을 자동 변경하지 않음
```

서버가 없으면 AI 생성 버튼은 실제 모델에 연결되지 않습니다. **GitHub Secrets에 Gemini 키만 저장해도 Pages가 API 서버로 바뀌지 않습니다.**

## 1. 로컬 Node 서버에서 먼저 시험

Node 22 이상, 개인 Gemini API 키가 필요합니다.

```bash
cp .env.example .env
# .env에서 GEMINI_API_KEY에 개인 키를 입력하고 저장
node --env-file=.env server/index.js
```

`http://127.0.0.1:3000/api/health` 접속 시 `aiConnected:true`, `provider:"gemini"`을 확인할 수 있습니다. 이 결과는 **서버 설정 확인**이지 실제 Gemini 요청 성공은 아닙니다. `http://127.0.0.1:3000`에서 새 가상 규정 작업을 만든 후 AI 제안을 생성해야 실제 모델 호출을 시험할 수 있습니다.

## 2. Google Cloud Run에 별도 HTTPS AI 서버 배포

Google Cloud 프로젝트와 결제 계정, `gcloud` CLI 권한이 필요합니다. 비용·할당량을 확인하세요. **명령은 저장소를 로컬에 복제한 디렉터리에서 실행**합니다. 비밀키를 커맨드 라인 인수, Git, HTML, GitHub Pages 소스 또는 Actions 로그에 기록하지 마세요.

Google Cloud Console에서 Cloud Run, Cloud Build, Artifact Registry, Secret Manager API를 사용 설정하고, Cloud Run 실행용 서비스 계정을 만듭니다. 서비스 계정에는 각 Secret의 **Secret Manager Secret Accessor** 권한이 필요합니다. 비밀 Secret 두 개를 생성합니다.

- `session2-gemini-key`: 본인 Gemini API 키의 Secret 버전
- `session2-ai-access-token`: 공개 페이지를 통해 AI 비용을 무단 사용하지 못하도록 별도로 생성한 강력한 접근 토큰의 Secret 버전

예시(새 프로젝트):

```bash
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud iam service-accounts create session2-regulation-ai \
  --display-name="Session2 Regulation AI runtime"

# Secret Manager에 비밀 두 개 생성
gcloud secrets create session2-gemini-key --replication-policy=automatic
gcloud secrets create session2-ai-access-token --replication-policy=automatic

# Gemini 키를 터미널 입력으로만 받아 Secret Manager에 저장 (명령어에 키 문자열을 쓰지 않음)
read -sr GEMINI_KEY
printf '%s' "$GEMINI_KEY" | gcloud secrets versions add session2-gemini-key --data-file=-
unset GEMINI_KEY

# 접근 토큰 자동 생성: 브라우저 로그인 대신 사용하므로 보안된 곳에 따로 보관
AI_TOKEN="$(openssl rand -hex 32)"
printf '%s' "$AI_TOKEN" | gcloud secrets versions add session2-ai-access-token --data-file=-
printf 'Save this AI access token securely: %s\n' "$AI_TOKEN"
unset AI_TOKEN

# Cloud Run 실행 서비스 계정에 두 Secret 읽기 권한만 부여
gcloud secrets add-iam-policy-binding session2-gemini-key \
  --member="serviceAccount:session2-regulation-ai@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding session2-ai-access-token \
  --member="serviceAccount:session2-regulation-ai@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 루트 Dockerfile을 사용해 빌드·배포
gcloud run deploy session2-regulation-ai \
  --source . \
  --region asia-northeast3 \
  --service-account="session2-regulation-ai@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --allow-unauthenticated \
  --set-env-vars="LLM_PROVIDER=gemini,LLM_MODEL=gemini-flash-latest,HOST=0.0.0.0,AI_ALLOWED_ORIGINS=https://dodam-heo.github.io" \
  --set-secrets="GEMINI_API_KEY=session2-gemini-key:latest,AI_ACCESS_TOKEN=session2-ai-access-token:latest"
```

`--allow-unauthenticated`은 공개 웹페이지에서 서비스 URL까지 접근할 수 있게 하므로 **서버의 별도 토큰 검증은 유지**합니다. 절대로 API 키를 이 접근 토큰 칸에 입력하지 마세요. 클라우드 서비스는 자동 청구·호출 가능성이 있으므로 비용 알림 및 사용량 제한을 설정하세요.

## 3. GitHub Pages UI에서 연결

1. `https://dodam-heo.github.io/session2-regulation-agent/` 열기
2. 작업을 생성한 후 **업무 개요 → AI 초안 작성 보조**
3. AI 서버 주소에 위 Cloud Run HTTPS URL 입력
4. AI 서버 접근 토큰에 위 단계에서 생성한 토큰 입력 (브라우저 저장소에는 저장되지 않음)
5. 가상 규정 내용으로 전송 동의 후 초안 제안 요청
6. AI 제안·사유·검토 필요 사항을 확인하고, **명시적으로 승인한 경우에만** 초안에 적용

## 4. 모델 바꾸기 — UI·조문 엔진 변경 없음

서버에서만 변경합니다.

| LLM_PROVIDER | 필수 서버 비밀 값 | 모델 및 URL |
| --- | --- | --- |
| `gemini` | `GEMINI_API_KEY` | `LLM_MODEL=gemini-flash-latest` 또는 사용 가능한 Gemini 모델 |
| `compatible` | `LLM_API_KEY` | `LLM_MODEL`, `LLM_API_URL` (OpenAI 호환) |
| `anthropic` | `LLM_API_KEY` | `LLM_MODEL` |

`src/main.js`, `src/ai-client.js`, 신구대비 및 검증 엔진에는 공급자 전용 API가 없습니다. 공급자별 요청은 `server/providers.js`에만 있습니다. `npm test`는 각 공급자 분기·비밀키 분리와 응답 스키마를 모의 HTTP 응답으로 검증합니다.

**현재 코드 저장소·자동 테스트 완료 ≠ Cloud Run 실제 배포 및 Gemini 유료 호출 완료.** 본인 Google Cloud 계정 및 비밀키를 연결해야 실제 AI 생성이 동작합니다.
