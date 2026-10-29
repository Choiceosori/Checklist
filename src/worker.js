// Cloudflare Worker: 정적 화면(public/)을 내보내고, /api/analyze 에서 Gemini API를 호출합니다.
// API 키는 코드에 넣지 않습니다. Cloudflare 대시보드의 Secret(GEMINI_API_KEY)에서만 읽습니다.
import { DurableObject } from 'cloudflare:workers';
import { buildPrompt, LIMITS, TOOLS } from '../public/criteria.js';

// GEMINI_MODEL 변수로 바꿀 수 있습니다. 모델이 없거나(404) 붐비거나(503) 사용량이 찼으면(429)
// 다음 후보로 넘어가고, 후보를 다 써도 안 되면 이 키로 쓸 수 있는 모델 목록에서 더 찾아 시도합니다.
// 빠른 모델부터: 생각(thinking)을 끌 수 있는 2.5 Flash, 생각을 낮출 수 있는 3 Flash, 그다음 별칭(latest)과 Lite.
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'];
const API = 'https://generativelanguage.googleapis.com/v1beta';
const TRY_NEXT = new Set([404, 408, 429, 500, 503, 504, 524]);
const RETRY_SAME = new Set([500, 503]);
const CALL_TIMEOUT_MS = 45000; // 모델 하나를 기다리는 최대 시간
const DEADLINE_MS = 90000;     // 전체 최대 시간(화면은 110초에 스스로 멈춤)
let lastGoodModel = null; // 마지막으로 성공한 모델을 먼저 시도합니다(Worker가 살아 있는 동안).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Gemini API는 일부 지역(예: 홍콩)에서 오는 호출을 "User location is not supported"로 막습니다.
// Cloudflare는 방문자와 가까운 곳에서 Worker를 실행하므로, Google 호출은 미국 동부에 고정한
// Durable Object(GeminiProxy)를 거쳐 보냅니다. Durable Object는 처음 만들어진 지역에 머뭅니다.
export class GeminiProxy extends DurableObject {
  async send(url, init, timeoutMs) {
    return timedFetch(url, init, timeoutMs);
  }
}
// 시간 안에 답이 없으면 504(TIMEOUT)로 돌려줍니다.
async function timedFetch(url, init, timeoutMs = CALL_TIMEOUT_MS) {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return { status: r.status, body: await r.text() };
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      return { status: 504, body: JSON.stringify({ error: { status: 'TIMEOUT', message: `${Math.round(timeoutMs / 1000)}초 안에 응답이 오지 않았습니다.` } }) };
    }
    throw e;
  }
}
const PROXY_NAME = 'gemini-us-east-v1'; // 이름을 바꾸면 새 Durable Object가 새 위치 힌트로 만들어집니다.
async function gfetch(env, url, init = {}, timeoutMs = CALL_TIMEOUT_MS) {
  const { status, body } = env.GEMINI_PROXY
    ? await env.GEMINI_PROXY.get(env.GEMINI_PROXY.idFromName(PROXY_NAME), { locationHint: 'enam' }).send(url, init, timeoutMs)
    : await timedFetch(url, init, timeoutMs); // Pages 배포 등 바인딩이 없을 때
  return new Response(body, { status });
}

// 점검표 채점에는 깊은 추론이 필요 없어 생각 시간을 줄입니다(모델이 지원할 때만).
function thinkingFor(model) {
  if (/gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/gemini-3/.test(model)) return { thinkingLevel: 'low' };
  return null;
}

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
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
  };

  const started = Date.now();
  const left = () => DEADLINE_MS - (Date.now() - started);
  const post = (model, thinking) => gfetch(env, `${API}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify(thinking ? { ...payload, generationConfig: { ...payload.generationConfig, thinkingConfig: thinking } } : payload),
  }, Math.max(5000, Math.min(CALL_TIMEOUT_MS, left())));
  const call = async (model) => {
    const thinking = thinkingFor(model);
    const r = await post(model, thinking);
    // 생각 설정을 모르는 모델이면 설정 없이 다시 보냅니다.
    if (thinking && r.status === 400 && /thinking/i.test(await r.clone().text())) return post(model, null);
    return r;
  };
  let res, used;
  const tried = [];
  try {
    const queue = [...new Set([env.GEMINI_MODEL, lastGoodModel, ...FALLBACK_MODELS].filter(Boolean))];
    let listed = false;
    while (queue.length && left() > 5000) {
      used = queue.shift();
      if (tried.includes(used)) continue;
      tried.push(used);
      res = await call(used);
      if (RETRY_SAME.has(res.status) && left() > 20000) { await sleep(1500); res = await call(used); } // 잠깐 붐비는 경우 한 번 더
      if (res.ok) { lastGoodModel = used; break; }
      if (!TRY_NEXT.has(res.status)) break; // 키 오류 등은 다른 모델로 바꿔도 같으므로 멈춤
      if (!queue.length && !listed) {
        listed = true;
        queue.push(...(await listModels(env)).filter((m) => !tried.includes(m)).slice(0, 4));
      }
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
    const detail = `Gemini ${res.status}${g.status ? ' ' + g.status : ''} · 모델 ${used}${tried.length > 1 ? ` (시도한 모델 ${tried.length}개: ${tried.join(', ')})` : ''}${g.message ? ' · ' + String(g.message).slice(0, 200) : ''}`;
    console.log('Gemini error', detail, raw.slice(0, 500));
    const msg = String(g.message || '');
    if (res.status === 429) return json({ error: '요청이 많거나 무료 사용량을 다 써서 잠시 막혔습니다. 1분쯤 뒤에 다시 시도해 주세요. 계속되면 오늘 무료 사용량을 다 쓴 것일 수 있습니다.', detail }, 429);
    if (/API key/i.test(msg) || res.status === 401) return json({ error: '서버의 Gemini API 키가 올바르지 않습니다. Cloudflare의 GEMINI_API_KEY 값을 다시 확인해 주세요.', detail }, 500);
    if (/location is not supported/i.test(msg)) return json({ error: '지금 접속한 지역의 서버에서는 Gemini API를 쓸 수 없습니다. 관리자에게 알려 주세요.', detail }, 502);
    if (res.status === 403) return json({ error: '이 API 키로는 Gemini를 쓸 권한이 없습니다. Google AI Studio에서 키 설정을 확인해 주세요.', detail }, 500);
    if (res.status === 404) return json({ error: '이 API 키로 쓸 수 있는 Gemini 모델을 찾지 못했습니다.', detail }, 502);
    if (res.status === 503 || res.status === 500) return json({ error: '지금 쓸 수 있는 Gemini 모델이 모두 붐빕니다. 1~2분 뒤 다시 시도해 주세요.', detail }, 502);
    if ([408, 504, 524].includes(res.status)) return json({ error: 'Gemini가 제시간에 답하지 않았습니다. 지도안이 길면 핵심 부분만 남기고, 잠시 뒤 다시 시도해 주세요.', detail }, 504);
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

// 이 키로 generateContent를 쓸 수 있는 모델을 Flash 계열·최신 순으로 돌려줍니다.
async function listModels(env) {
  try {
    const r = await gfetch(env, `${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
    if (!r.ok) return [];
    const names = ((await r.json()).models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => String(m.name).replace(/^models\//, ''))
      .filter((n) => /^gemini-/.test(n) && !/(image|tts|audio|live|embed|vision|thinking-exp|robotics|computer)/.test(n));
    const ver = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
    const rank = (n) => (/flash/.test(n) ? 2 : /pro/.test(n) ? 1 : 0) * 100 + ver(n) * 10 - (/lite/.test(n) ? 5 : 0) - (/preview|exp/.test(n) ? 1 : 0);
    return names.sort((a, b) => rank(b) - rank(a));
  } catch {
    return [];
  }
}
