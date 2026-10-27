# AI 수업 설계 진단

탭 세 개로 나뉩니다.

| 탭 | 하는 일 |
|---|---|
| **D1 이해** | 백워드 & AI 통합 수업 설계 이해 점검표로 **자기 평가** (5단계 10항목, 단계별 성찰 메모) |
| **D3 검증** | AI 활용 수업 설계 검증 점검표로 **자기 평가** (4단계 8항목) |
| **AI 검증** | 점검표(D1 또는 D3)를 고르고 지도안을 올리면 Google Gemini가 그 점검표로 진단 |

- D1·D3 탭에서 별점을 모두 매기면 자기 평가 결과(평균, 단계별 점수)가 나오고, **이 점검표로 AI 검증 받기** 버튼으로 AI 검증 탭으로 넘어갑니다.
- AI 검증 결과는 그 점검표의 자기 평가를 마쳤으면 **내 점수와 AI 점수를 나란히 비교**하고, 2점 이상 차이 나는 항목을 "돌아볼 점"으로 모아 줍니다. 자기 평가 전이면 AI 진단만 보여 줍니다.
- AI에게는 자기 평가 점수를 보내지 않아 독립적으로 판단합니다. 지도안만으로 판단할 수 없는 항목(예: D1의 교사 인식·습관)은 "판단 보류"로 표시하고 평균에서 뺍니다.
- AI 검증 탭 맨 위 **1. 기본 정보**에서 학년(1~6)과 교과를 고르면, 해당 학년군의 **2022 개정 교육과정 성취기준**을 영역별로 묶은 드롭다운이 나옵니다. 최대 8개까지 고를 수 있고(다시 고르거나 ✕로 빼기), AI가 지도안과 고른 성취기준이 맞는지도 함께 점검합니다.
- 진행 상황은 브라우저에 저장됩니다. 주소 끝에 `#d1`, `#d3`, `#ai`를 붙이면 해당 탭이 바로 열립니다.

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

## 성취기준 데이터

`public/standards.js`에 2022 개정 교육과정(교육부 고시 제2022-33호) 초등학교 1~6학년 전 교과 성취기준 611개가 들어 있습니다.

- 원문 출처: 국가교육과정정보센터(NCIC) 성취기준 원문 (정리본: [mindm1ner/dodal](https://github.com/mindm1ner/dodal))
- 확인: 교육부 [별책] 교과 교육과정 PDF(국어·도덕·사회·수학·과학·실과·체육·음악·미술·영어)와 문구를 대조해 562개가 일치했고, 통합교과(바른 생활·슬기로운 생활·즐거운 생활) 48개는 다른 정리본 두 곳과 일치했습니다. 1개([6실04-06])는 PDF의 오탈자("인식하다") 대신 NCIC 문구("인식한다")를 따랐습니다.
- 서버는 화면에서 성취기준 **코드만** 받아 이 파일의 공식 문구로 바꿔 AI에게 보냅니다.

## 점검 항목 바꾸기

`public/criteria.js`의 `TOOLS.d1`, `TOOLS.d3`에서 `items`(문항)와 `stages`(단계)를 고치면 화면과 AI 지시문이 함께 바뀝니다. D2 같은 새 탭은 `TOOLS`에 하나를 더 만들고 `TOOL_ORDER`에 넣으면 됩니다.

## 비용과 보안 메모

- Gemini 무료 등급은 분당·일일 요청 수 제한이 있습니다. 제한에 걸리면 화면에 "잠시 뒤 다시 시도" 안내가 나옵니다.
- 무료 등급에서 보낸 내용은 Google 정책에 따라 서비스 개선에 쓰일 수 있습니다. 학생 개인정보는 빼고 올리도록 안내하세요.
- 주소가 널리 퍼지면 다른 사람이 선생님 키의 사용량을 쓸 수 있습니다. `ACCESS_CODE`를 설정하길 권합니다.
- 결제를 연결한 키라면 Google Cloud 콘솔에서 사용량 한도(quota)를 걸어 두세요.
