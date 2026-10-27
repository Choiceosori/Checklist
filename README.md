# AI 수업 설계 진단

연수 단계별 점검표를 **탭**으로 나눠 제공합니다.

| 탭 | 점검표 | 구성 |
|---|---|---|
| **D1 이해** | 백워드 & AI 통합 수업 설계 이해 | 도입·전개1·전개2·전개3·정리, 10개 항목, 단계별 성찰 메모 |
| **D3 검증** | AI 활용 수업 설계 검증 | 도입·전개1·전개2·전개3, 8개 항목 |

탭마다 같은 세 단계로 진행합니다.

1. **자기 평가**: 항목마다 스스로 별점(1~5)을 매깁니다(D1은 단계별 성찰 메모도 적을 수 있음). 모든 항목을 매겨야 다음 단계로 넘어갑니다.
2. **AI 진단**: 지도안(PDF, Word, 한글 .hwpx, 텍스트, 사진)을 올리면 Google Gemini가 그 탭의 점검표로 진단합니다. AI에게는 자기 평가 점수를 보내지 않아 독립적으로 판단합니다. 지도안만으로 판단할 수 없는 항목(예: D1의 교사 인식·습관)은 AI가 "판단 보류"로 표시하고 평균에서 뺍니다.
3. **비교 결과**: 항목·단계별로 내 점수와 AI 점수를 나란히 보여 주고, 2점 이상 차이 나는 항목을 "돌아볼 점"으로 모아 줍니다.

탭별 진행 상황은 브라우저에 따로 저장되어, 탭을 오가거나 새로고침해도 이어서 할 수 있습니다. 주소 끝에 `#d1`, `#d3`을 붙이면 해당 탭이 바로 열립니다.

## 구조

```
public/            화면 (Cloudflare가 그대로 내보내는 정적 파일)
  index.html       화면 구성과 디자인
  app.js           자기 평가 → AI 진단 → 비교 결과 흐름, 파일 읽기, 복사/저장/인쇄
  criteria.js      D1·D3 점검표(단계·항목·척도)와 AI 지시문 (화면과 서버가 함께 씀)
src/worker.js      서버: /api/analyze 에서 Gemini API 호출 (API 키는 여기서만 사용)
wrangler.jsonc     Cloudflare Workers 설정
```

**API 키는 코드나 GitHub에 절대 넣지 않습니다.** Cloudflare 대시보드의 Secret으로만 넣습니다. 브라우저에는 키가 전달되지 않습니다.

## 배포 (GitHub → Cloudflare Workers)

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Import a repository** → 저장소 선택.
   - Build command: 비워 둠
   - Deploy command: `npx wrangler deploy` (기본값)
3. 배포가 끝나면 Worker → **Settings** → **Variables and Secrets** → **Add**
   - `GEMINI_API_KEY` (Type: **Secret**): Google AI Studio에서 복사한 API 키
   - `ACCESS_CODE` (Type: **Secret**, 선택): 연수 참여자에게만 알려 줄 접속 코드. 넣으면 화면에 접속 코드 칸이 생기고, 코드가 맞아야 분석됩니다.
   - `GEMINI_MODEL` (Type: Text, 선택): 쓸 모델 이름. 비워 두면 `gemini-flash-latest`를 먼저 시도합니다.
4. 저장 후 **Deploy** 를 한 번 더 누르면(또는 GitHub에 커밋하면) 적용됩니다.
5. 주소는 `https://checklist.<계정>.workers.dev` 형태입니다.

### Pages로 만들었다면

Cloudflare **Pages**(Workers & Pages → Pages → Connect to Git)로 만들어도 동작합니다.
- Framework preset: None, Build command: 비워 둠, **Build output directory: `public`**
- 프로젝트 → **Settings → Variables and Secrets**(또는 Environment variables)에서 **Production**에 `GEMINI_API_KEY`를 **Secret(Encrypt)**으로 추가
- 저장 후 **Deployments → 최근 배포 ⋯ → Retry deployment**로 다시 배포해야 키가 적용됩니다.

## 로컬에서 실행

```bash
npm install
echo "GEMINI_API_KEY=여기에_키" > .dev.vars   # .gitignore에 들어 있어 GitHub에 올라가지 않음
npm run dev                                    # http://localhost:8787
```

## 점검 항목 바꾸기

`public/criteria.js`의 `TOOLS.d1`, `TOOLS.d3`에서 `items`(문항)와 `stages`(단계)를 고치면 화면과 AI 지시문이 함께 바뀝니다. D2 같은 새 탭은 `TOOLS`에 하나를 더 만들고 `TOOL_ORDER`에 넣으면 됩니다.

## 비용과 보안 메모

- Gemini 무료 등급은 분당·일일 요청 수 제한이 있습니다. 제한에 걸리면 화면에 "잠시 뒤 다시 시도" 안내가 나옵니다.
- 무료 등급에서 보낸 내용은 Google 정책에 따라 서비스 개선에 쓰일 수 있습니다. 학생 개인정보는 빼고 올리도록 안내하세요.
- 주소가 널리 퍼지면 다른 사람이 선생님 키의 사용량을 쓸 수 있습니다. `ACCESS_CODE`를 설정하길 권합니다.
- 결제를 연결한 키라면 Google Cloud 콘솔에서 사용량 한도(quota)를 걸어 두세요.
