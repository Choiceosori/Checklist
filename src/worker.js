// Cloudflare Worker: 정적 화면(public/)을 내보내고, /api/analyze 에서 Gemini API를 호출합니다.
// API 키는 코드에 넣지 않습니다. Cloudflare 대시보드의 Secret(GEMINI_API_KEY)에서만 읽습니다.
import { buildPrompt, LIMITS, TOOLS } from '../public/criteria.js';

// GEMINI_MODEL 변수로 바꿀 수 있습니다. 지정한 모델이 없으면(404) 다음 후보로 넘어가고,
// 후보가 모두 없으면 이 키로 쓸 수 있는 모델 목록을 받아 Flash 계열을 고릅니다.
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
const API = 'https://generativelanguage.googleapis.com/v1beta';
let discoveredModel = null; // 한 번 찾은 모델은 Worker가 살아 있는 동안 다시 씁니다.

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

  const call = (model) => fetch(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify(payload),
  });
  let res, used;
  try {
    for (const model of [env.GEMINI_MODEL, discoveredModel, ...FALLBACK_MODELS].filter(Boolean)) {
      used = model; res = await call(model);
      if (res.status !== 404) break;
    }
    if (res.status === 404) {
      const found = await findModel(env.GEMINI_API_KEY);
      if (found) { discoveredModel = used = found; res = await call(found); }
    }
  } catch (e) {
    console.log('Gemini fetch failed', String(e));
    return json({ error: 'Gemini 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', detail: String(e).slice(0, 200) }, 502);
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let g = {};
    try { g = JSON.parse(raw).error || {}; } catch {}
    // 화면에 원인을 보여 줍니다(키 값은 들어 있지 않음).
    const detail = `Gemini ${res.status}${g.status ? ' ' + g.status : ''} · 모델 ${used}${g.message ? ' · ' + String(g.message).slice(0, 200) : ''}`;
    console.log('Gemini error', detail, raw.slice(0, 500));
    const msg = String(g.message || '');
    if (res.status === 429) return json({ error: '요청이 많거나 무료 사용량을 다 써서 잠시 막혔습니다. 1분쯤 뒤에 다시 시도해 주세요.', detail }, 429);
    if (/API key/i.test(msg) || res.status === 401) return json({ error: '서버의 Gemini API 키가 올바르지 않습니다. Cloudflare의 GEMINI_API_KEY 값을 다시 확인해 주세요.', detail }, 500);
    if (/location is not supported/i.test(msg)) return json({ error: '지금 접속한 지역의 서버에서는 Gemini API를 쓸 수 없습니다. 관리자에게 알려 주세요.', detail }, 502);
    if (res.status === 403) return json({ error: '이 API 키로는 Gemini를 쓸 권한이 없습니다. Google AI Studio에서 키 설정을 확인해 주세요.', detail }, 500);
    if (res.status === 404) return json({ error: '이 API 키로 쓸 수 있는 Gemini 모델을 찾지 못했습니다.', detail }, 502);
    if (res.status === 503 || res.status === 500) return json({ error: 'Gemini 서버가 바쁩니다. 잠시 뒤 다시 시도해 주세요.', detail }, 502);
    return json({ error: 'AI 분석 중 문제가 생겼습니다. 다시 시도해 주세요.', detail }, 502);
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

// 이 키로 generateContent를 쓸 수 있는 모델 중 최신 Flash 계열을 고릅니다.
async function findModel(key) {
  try {
    const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!r.ok) return null;
    const names = ((await r.json()).models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => String(m.name).replace(/^models\//, ''))
      .filter((n) => /^gemini-/.test(n) && !/(image|tts|audio|live|embed|vision|thinking-exp|robotics|computer)/.test(n));
    const ver = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
    const rank = (n) => (/flash/.test(n) ? 2 : /pro/.test(n) ? 1 : 0) * 100 + ver(n) * 10 - (/lite/.test(n) ? 5 : 0) - (/preview|exp/.test(n) ? 1 : 0);
    names.sort((a, b) => rank(b) - rank(a));
    return names[0] || null;
  } catch {
    return null;
  }
}
