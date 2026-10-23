# AI 수업 설계 진단

지도안(PDF, Word, 한글 .hwpx, 텍스트, 사진)을 올리면 Google Gemini가 8개 점검 항목으로 진단합니다. 항목마다 1~5점 점수, 지도안 근거 인용, 판단 근거, 개선 제안을 보여 주고, 선생님이 별점을 눌러 점수를 고칠 수 있습니다.

## 구조

```
public/            화면 (Cloudflare가 그대로 내보내는 정적 파일)
  index.html       화면 구성과 디자인
  app.js           파일 읽기, 결과 표시, 별점 조정, 복사/저장/인쇄
  criteria.js      8개 점검 항목과 AI 지시문 (화면과 서버가 함께 씀)
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
5. 주소는 `https://lesson-plan-ai.<계정>.workers.dev` 형태입니다.

## 로컬에서 실행

```bash
npm install
echo "GEMINI_API_KEY=여기에_키" > .dev.vars   # .gitignore에 들어 있어 GitHub에 올라가지 않음
npm run dev                                    # http://localhost:8787
```

## 점검 항목 바꾸기

`public/criteria.js`의 `ITEMS`(문항)와 `STAGES`(단계)를 고치면 화면과 AI 지시문이 함께 바뀝니다.

## 비용과 보안 메모

- Gemini 무료 등급은 분당·일일 요청 수 제한이 있습니다. 제한에 걸리면 화면에 "잠시 뒤 다시 시도" 안내가 나옵니다.
- 무료 등급에서 보낸 내용은 Google 정책에 따라 서비스 개선에 쓰일 수 있습니다. 학생 개인정보는 빼고 올리도록 안내하세요.
- 주소가 널리 퍼지면 다른 사람이 선생님 키의 사용량을 쓸 수 있습니다. `ACCESS_CODE`를 설정하길 권합니다.
- 결제를 연결한 키라면 Google Cloud 콘솔에서 사용량 한도(quota)를 걸어 두세요.
