// Cloudflare Worker: 정적 화면(public/)을 내보내고, /api/analyze 에서 Gemini API를 호출합니다.
// API 키는 코드에 넣지 않습니다. Cloudflare 대시보드의 Secret(GEMINI_API_KEY)에서만 읽습니다.
import { buildPrompt, LIMITS, TOOLS } from '../public/criteria.js';

// GEMINI_MODEL 변수로 바꿀 수 있습니다. 지정한 모델이 없으면(404) 다음 후보로 넘어갑니다.
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-2.5-flash'];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/config') return json({ needCode: Boolean(env.ACCESS_CODE) });
    if (url.pathname === '/api/analyze') {
      if (request.method !== 'POST') return json({ error: 'POST 요청만 받습니다.' }, 405);
      return analyze(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function analyze(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다. 관리자에게 알려 주세요.' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: '요청 형식이 올바르지 않습니다.' }, 400); }

  if (env.ACCESS_CODE && String(body.code || '').trim() !== env.ACCESS_CODE) {
    return json({ error: '접속 코드가 맞지 않습니다.', code: 'bad_code' }, 401);
  }

  const text = String(body.text || '').slice(0, LIMITS.maxChars);
  const files = Array.isArray(body.files) ? body.files.slice(0, LIMITS.maxFiles) : [];
  let totalBytes = 0;
  for (const f of files) {
    if (!LIMITS.fileTypes.includes(f?.mimeType) || typeof f.data !== 'string') return json({ error: '지원하지 않는 첨부 형식입니다.' }, 400);
    totalBytes += Math.floor(f.data.length * 3 / 4);
  }
  if (totalBytes > LIMITS.maxFileBytes) return json({ error: '첨부 파일이 너무 큽니다. 14MB 이하로 올려 주세요.' }, 413);
  if (text.trim().length < 40 && !files.length) return json({ error: '분석할 지도안 내용을 40자 이상 넣어 주세요.' }, 400);

  const tool = TOOLS[body.tool] ? body.tool : 'd3';
  const prompt = buildPrompt(tool, {
    text,
    grade: String(body.grade || '').slice(0, 50),
    subject: String(body.subject || '').slice(0, 50),
    note: String(body.note || '').slice(0, 300),
    hasFiles: files.length > 0,
  });
  const payload = {
    contents: [{
      role: 'user',
      parts: [...files.map((f) => ({ inline_data: { mime_type: f.mimeType, data: f.data } })), { text: prompt }],
    }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  const models = [env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean);
  let res;
  for (const model of models) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(payload),
    });
    if (res.status !== 404) break;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.log('Gemini error', res.status, detail.slice(0, 500));
    if (res.status === 429) return json({ error: '요청이 많아 잠시 막혔습니다. 1분쯤 뒤에 다시 시도해 주세요.' }, 429);
    if (res.status === 400 && /API key/i.test(detail)) return json({ error: '서버의 Gemini API 키가 올바르지 않습니다. 관리자에게 알려 주세요.' }, 500);
    if (res.status === 401 || res.status === 403) return json({ error: '서버의 Gemini API 키 권한에 문제가 있습니다. 관리자에게 알려 주세요.' }, 500);
    return json({ error: 'AI 분석 중 문제가 생겼습니다. 다시 시도해 주세요.' }, 502);
  }

  const data = await res.json();
  const cand = data.candidates?.[0];
  const out = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
  if (!out) {
    const blocked = data.promptFeedback?.blockReason || cand?.finishReason;
    return json({ error: blocked ? `AI가 이 내용의 분석을 거절했습니다 (${blocked}).` : 'AI가 답을 만들지 못했습니다. 다시 시도해 주세요.' }, 502);
  }
  const result = parseJson(out);
  if (!result) return json({ error: 'AI 응답을 정리하지 못했습니다. 다시 시도해 주세요.' }, 502);
  return json({ result });
}

function parseJson(s) {
  try { return JSON.parse(s); } catch {}
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}
