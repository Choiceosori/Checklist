import { TOOLS, TOOL_ORDER, LIMITS } from './criteria.js';
const SAMPLE_PLAN = `[예시] 교수·학습 과정안
교과: 과학 / 대상: 초등학교 5학년 2반 (24명) / 차시: 3/8차시 (40분)
단원: 3. 날씨와 우리 생활
성취기준: [6과13-03] 기온, 바람, 습도 등 날씨 요소가 우리 생활에 미치는 영향을 조사하고 날씨와 관련된 사례를 발표할 수 있다.
학습 목표: 우리 지역의 날씨 자료를 분석하여 날씨가 생활에 미치는 영향을 설명할 수 있다.
활용 도구: AI 챗봇(학급용 계정), 패들렛, 학생용 태블릿(4인 1모둠 2대)

[도입 5분]
- 오늘 아침 일기예보 영상 시청 후 "날씨 때문에 계획을 바꾼 경험" 발문
- 학습 목표 확인

[전개 1 15분] 날씨 자료 탐색
- 모둠별로 AI 챗봇에게 우리 지역 일주일 날씨와 생활 속 영향을 질문
- 챗봇 답변을 패들렛에 정리
- 교사는 순회하며 질문 작성이 어려운 모둠에 질문 예시 카드 제공

[전개 2 12분] 날씨 영향 발표
- 모둠별로 패들렛 결과 발표, 다른 모둠은 댓글로 질문
- AI 챗봇이 발표 내용에 대해 칭찬과 보완점을 피드백

[정리 8분]
- 오늘 배운 내용 3줄 요약 작성
- 차시 예고

평가 계획
- 평가 방법: 관찰평가, 패들렛 결과물
- 평가 기준: 날씨 요소와 생활의 관계를 바르게 설명하는가 (상/중/하)

유의점
- AI 챗봇 답변이 틀릴 수 있음을 안내한다.`;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';

/* ---------- 탭별 상태 ----------
   탭(D1, D3)마다 자기 평가·성찰 메모·지도안 입력·AI 결과를 따로 보관합니다. */
const INPUT_IDS = ['plan-text', 'ctx-grade', 'ctx-subject', 'ctx-note'];
let toolId = 'd1';
let T = TOOLS[toolId];
const emptySelf = (tool) => Object.fromEntries(tool.items.map((i) => [i.id, 0]));
const freshTab = (id) => ({ step: 1, self: emptySelf(TOOLS[id]), memo: {}, result: null, inputs: {}, attachments: [] });
const tabs = Object.fromEntries(TOOL_ORDER.map((id) => [id, freshTab(id)]));
let state = tabs[toolId];
let attachments = [];  // 지금 탭의 [{name, mimeType, data(base64), size}] PDF·이미지는 원본 그대로 AI에게 보냅니다
let ctl = null;

/* ---------- 브라우저 저장 (이 기기에서만) ---------- */
const STORE_KEY = 'lp-diag-v3';
function captureInputs() {
  state.inputs = Object.fromEntries(INPUT_IDS.map((id) => [id, $(id).value]));
  state.attachments = attachments;
}
function saveLocal() {
  captureInputs();
  try {
    // 첨부 파일 원본은 용량이 커서 저장하지 않습니다.
    const slim = Object.fromEntries(TOOL_ORDER.map((id) => { const { attachments: _a, ...rest } = tabs[id]; return [id, rest]; }));
    localStorage.setItem(STORE_KEY, JSON.stringify({ toolId, code: $('ctx-code').value, tabs: slim }));
  } catch (e) {}
}
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
}

/* ---------- 파일 읽기 ---------- */
const loaded = {};
function loadScript(src) {
  if (!loaded[src]) loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('파일 읽기 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'));
    document.head.appendChild(s);
  });
  return loaded[src];
}
async function readDocx(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return r.value.replace(/\n{3,}/g, '\n\n').trim();
}
async function readHwpx(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const names = Object.keys(zip.files).filter((n) => /^Contents\/section\d+\.xml$/i.test(n))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
  if (!names.length) throw new Error('hwpx 파일에서 본문을 찾지 못했습니다.');
  const out = [];
  for (const n of names) {
    const doc = new DOMParser().parseFromString(await zip.file(n).async('string'), 'application/xml');
    for (const p of doc.getElementsByTagNameNS('*', 'p')) {
      if (p.getElementsByTagNameNS('*', 'p').length) continue; // 표 안 문단은 가장 안쪽 것만
      const t = Array.from(p.getElementsByTagNameNS('*', 't')).map((x) => x.textContent).join('');
      if (t.trim()) out.push(t);
    }
  }
  return out.join('\n');
}
function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(new Error('파일을 읽지 못했습니다.'));
    r.readAsDataURL(file);
  });
}

async function handleFile(file) {
  if (!file) return;
  const name = file.name.toLowerCase();
  setHint('');
  try {
    if (name.endsWith('.hwp')) throw new Error('.hwp 파일은 브라우저에서 읽을 수 없습니다. 한글에서 [다른 이름으로 저장] → PDF 또는 .hwpx로 저장해 올려 주세요.');
    if (name.endsWith('.docx')) { $('plan-text').value = await readDocx(file); clearAttachments(); }
    else if (name.endsWith('.hwpx')) { $('plan-text').value = await readHwpx(file); clearAttachments(); }
    else if (/\.(txt|md)$/.test(name)) { $('plan-text').value = (await file.text()).trim(); clearAttachments(); }
    else if (LIMITS.fileTypes.includes(file.type) || name.endsWith('.pdf')) {
      const mimeType = name.endsWith('.pdf') ? 'application/pdf' : file.type;
      const isPdf = mimeType === 'application/pdf';
      if (isPdf) attachments = [];                     // PDF는 하나만
      else attachments = attachments.filter((a) => a.mimeType !== 'application/pdf');
      if (attachments.length >= LIMITS.maxFiles) throw new Error(`사진은 최대 ${LIMITS.maxFiles}장까지 올릴 수 있습니다.`);
      const used = attachments.reduce((a, f) => a + f.size, 0);
      if (used + file.size > LIMITS.maxFileBytes) throw new Error('파일이 너무 큽니다. 합계 14MB 이하로 올려 주세요.');
      attachments.push({ name: file.name, mimeType, size: file.size, data: await toBase64(file) });
      setHint(isPdf ? 'PDF는 AI가 원본(표·스캔 포함)을 직접 읽습니다. 아래 칸에 덧붙일 내용이 있으면 적어 주세요.' : '사진 속 지도안을 AI가 직접 읽습니다. 여러 장이면 순서대로 올려 주세요.');
    } else throw new Error('지원하지 않는 형식입니다. PDF, .docx, .hwpx, .txt, 사진 파일을 올려 주세요.');
    renderChip(name.endsWith('.docx') || name.endsWith('.hwpx') || /\.(txt|md)$/.test(name) ? file.name + ` · ${$('plan-text').value.length.toLocaleString()}자 읽음` : null);
    updateCount();
  } catch (e) {
    setHint(e.message || '파일을 읽지 못했습니다.', true);
  }
}
function clearAttachments() { attachments = []; }
function renderChip(textFileLabel) {
  const chip = $('file-chip');
  if (attachments.length) {
    $('file-name').textContent = attachments.map((a) => a.name).join(', ') + ` · ${(attachments.reduce((s, a) => s + a.size, 0) / 1048576).toFixed(1)}MB`;
    chip.hidden = false;
  } else if (textFileLabel) {
    $('file-name').textContent = textFileLabel; chip.hidden = false;
  } else chip.hidden = true;
}
function setHint(msg, err) {
  const h = $('file-hint');
  h.textContent = msg || '.hwp 파일은 한글에서 PDF나 .hwpx로 저장한 뒤 올려 주세요.';
  h.classList.toggle('err', !!err);
}
function updateCount() {
  const n = $('plan-text').value.length;
  $('text-count').textContent = n.toLocaleString() + '자' + (n > LIMITS.maxChars ? ` · 앞부분 ${LIMITS.maxChars.toLocaleString()}자만 분석합니다` : '');
}

/* ---------- 공통 ---------- */
const ids = () => T.items.map((i) => i.id);
const stageIds = (key) => T.items.filter((i) => i.stage === key).map((i) => i.id);
const avg = (list, scores) => list.reduce((a, id) => a + scores[id], 0) / list.length;
// AI 점수는 '판단 보류(null)'가 있을 수 있어 그 항목은 평균에서 뺍니다.
function aiAvg(list, ai) { const v = list.filter((id) => ai[id] != null); return v.length ? avg(v, ai) : null; }
const fmt = (v) => (v == null ? '–' : v.toFixed(1));
const selfDone = () => ids().every((id) => state.self[id] > 0);
const num = (id) => T.items.findIndex((i) => i.id === id) + 1;
function gradeOf(v) {
  if (v == null) return { cls: 'g2', t: '판단 보류' };
  if (v >= 4.5) return { cls: 'g4', t: '매우 우수' };
  if (v >= 3.8) return { cls: 'g3', t: '우수' };
  if (v >= 3.0) return { cls: 'g2', t: '보통 · 부분 보완' };
  return { cls: 'g1', t: '미흡 · 재검토' };
}
function gapOf(me, ai) {
  if (ai == null) return { cls: 'na', t: 'AI 판단 보류' };
  const d = me - ai;
  if (d === 0) return { cls: 'same', t: '일치' };
  const t = `내가 ${Math.abs(d)}점 ${d > 0 ? '높게' : '낮게'} 봄`;
  if (Math.abs(d) >= 2) return { cls: 'big', t };
  return { cls: d > 0 ? 'over' : 'under', t };
}
function miniStars(score, cls = '') {
  let h = `<span class="mini-stars ${cls}" aria-hidden="true">`;
  for (let v = 1; v <= 5; v++) h += `<span class="${score && v <= score ? 'on' : ''}">${STAR_SVG}</span>`;
  return h + '</span>';
}
function stageHead(s) {
  return `<div class="stage-head" style="background:var(--${s.c}-soft)">
    <h3><span class="tag" style="background:var(--${s.c})">${s.name}</span>${esc(s.title)}</h3><span class="focus">${esc(s.focus)}</span></div>`;
}
function itemQuestion(base, s, withDesc) {
  return `<div class="item-q"><span class="crit" style="background:var(--${s.c}-soft);color:var(--${s.c})">${esc(base.crit)}</span><h4>${num(base.id)}. ${esc(base.q)}</h4>${withDesc ? `<p class="desc">${esc(base.d)}</p>` : ''}</div>`;
}

/* ---------- 탭 ---------- */
function renderTabs() {
  $('tabs').innerHTML = TOOL_ORDER.map((id) => {
    const t = TOOLS[id];
    return `<a href="#${id}" role="tab" data-tool="${id}" aria-selected="${id === toolId}"><b>${esc(t.tab)}</b><small>${t.items.length}개 항목 · ${t.stages.length}단계</small></a>`;
  }).join('');
  $('stage-key').innerHTML = T.stages.map((s) => `<span style="background:var(--${s.c}-soft);color:var(--${s.c})">${s.name} · ${stageIds(s.key).length}항목</span>`).join('');
  $('tool-blurb').textContent = T.blurb;
  $('step1-sub').textContent = `${T.items.length}개 항목 별점`;
  $('self-guide').textContent = `「${T.title}」 점검표입니다. 지도안과 수업 준비 과정을 떠올리며 별점을 매겨 주세요. ★1개는 '${T.scale[1]}', ★5개는 '${T.scale[5]}'입니다. AI는 이 점수를 보지 않고 따로 진단합니다.`;
  document.documentElement.style.setProperty('--stage-count', T.stages.length);
  document.title = `${T.tab} · AI 수업 설계 진단`;
}
function switchTool(id) {
  if (!TOOLS[id] || id === toolId) return;
  if (ctl) { toast('AI 진단이 끝난 뒤 탭을 바꿔 주세요.'); return; }
  captureInputs();
  toolId = id; T = TOOLS[id]; state = tabs[id];
  for (const k of INPUT_IDS) $(k).value = state.inputs[k] || '';
  attachments = state.attachments || [];
  renderChip(); setHint(''); updateCount(); hideStatus();
  renderAll(); saveLocal();
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  window.scrollTo({ top: 0 });
}

/* ---------- 단계 이동 ---------- */
function goStep(n) {
  if (n === 2 && !selfDone()) { flagMissing(); return; }
  if (n === 3 && !state.result) return;
  state.step = n;
  renderAll();
  saveLocal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderSteps() {
  document.querySelectorAll('.steps button').forEach((b) => {
    const n = Number(b.dataset.go);
    if (n === state.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.disabled = (n === 2 && !selfDone()) || (n === 3 && !state.result);
    b.classList.toggle('done', n !== state.step && ((n === 1 && selfDone()) || (n === 2 && !!state.result)));
  });
  for (const n of [1, 2, 3]) $('step' + n).hidden = n !== state.step;
}

/* ---------- 1단계: 자기 평가 ---------- */
function renderSelf() {
  let h = '';
  for (const s of T.stages) {
    h += `<section class="panel stage-section">${stageHead(s)}`;
    for (const base of T.items.filter((i) => i.stage === s.key)) {
      const v = state.self[base.id];
      let stars = `<div class="stars" role="radiogroup" aria-label="${num(base.id)}번 자기 평가">`;
      for (let k = 1; k <= 5; k++) stars += `<button type="button" role="radio" aria-checked="${k === v}" aria-label="${k}점 ${T.scale[k]}" data-q="${base.id}" data-v="${k}" class="${k <= v ? 'on' : ''}">${STAR_SVG}</button>`;
      stars += '</div>';
      h += `<div class="item" data-id="${base.id}"><div class="item-top">${itemQuestion(base, s, true)}
        <div class="rate">${stars}<span class="rlabel">${v ? `<b>${v}점 · ${T.scale[v]}</b>` : '선택 안 됨'}</span></div></div></div>`;
    }
    if (T.memo) {
      h += `<div class="memo"><label class="label" for="memo-${toolId}-${s.key}">${s.name} 단계 자가 성찰 및 특이사항 (선택)</label>
        <textarea id="memo-${toolId}-${s.key}" data-memo="${s.key}" placeholder="이 단계에서 잘된 점, 아쉬운 점, 고칠 점을 자유롭게 적어 주세요.">${esc(state.memo[s.key] || '')}</textarea></div>`;
    }
    h += '</section>';
  }
  $('self-form').innerHTML = h;
  updateSelfProgress();
}
function updateSelfProgress() {
  const all = ids(), done = all.filter((id) => state.self[id] > 0).length;
  $('self-progress').textContent = `${done} / ${all.length}`;
  $('self-bar').style.width = `${done / all.length * 100}%`;
}
function setSelfScore(q, v) {
  state.self[q] = v;
  const item = document.querySelector(`#self-form .item[data-id="${q}"]`);
  if (item) {
    item.classList.remove('missing');
    item.querySelectorAll('.stars button').forEach((b) => {
      const k = Number(b.dataset.v);
      b.classList.toggle('on', k <= v); b.setAttribute('aria-checked', String(k === v));
    });
    item.querySelector('.rlabel').innerHTML = `<b>${v}점 · ${T.scale[v]}</b>`;
  }
  updateSelfProgress(); renderSteps(); saveLocal();
}
function flagMissing() {
  if (state.step !== 1) { state.step = 1; renderAll(); }
  const missing = ids().filter((id) => !state.self[id]);
  missing.forEach((id) => document.querySelector(`#self-form .item[data-id="${id}"]`)?.classList.add('missing'));
  document.querySelector(`#self-form .item[data-id="${missing[0]}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast(`아직 평가하지 않은 항목이 ${missing.length}개 있습니다.`);
}

/* ---------- 2단계: 자기 평가 요약 ---------- */
function renderSelfSummary() {
  if (!selfDone()) { $('self-summary').innerHTML = ''; return; }
  $('self-summary').innerHTML = `<span>${esc(T.tab)} 자기 평가 평균 <span class="val">${avg(ids(), state.self).toFixed(1)} / 5.0</span></span>
    <span style="color:var(--muted)">${T.stages.map((s) => `${s.name} ${avg(stageIds(s.key), state.self).toFixed(1)}`).join(' · ')}</span>`;
}

/* ---------- AI 진단 ---------- */
function normalize(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.items)) throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.');
  const byId = {};
  for (const it of r.items) if (it && it.id) byId[String(it.id).toLowerCase()] = it;
  const items = T.items.map((base) => {
    const it = byId[base.id] || {};
    const s = it.score == null ? null : Math.round(Number(it.score));
    return { id: base.id, score: s >= 1 && s <= 5 ? s : null, evidence: String(it.evidence || ''), reason: String(it.reason || '분석 결과가 없습니다.'), suggestion: String(it.suggestion || '') };
  });
  const L = r.lesson || {};
  return {
    lesson: { title: String(L.title || '제목 없는 지도안'), subject: String(L.subject || ''), grade: String(L.grade || ''), aiTools: Array.isArray(L.aiTools) ? L.aiTools.map(String).filter(Boolean) : [] },
    overall: String(r.overall || ''),
    strengths: Array.isArray(r.strengths) ? r.strengths.map(String) : [],
    priorities: Array.isArray(r.priorities) ? r.priorities.map(String) : [],
    items,
  };
}

async function analyze() {
  if (!selfDone()) { flagMissing(); return; }
  const text = $('plan-text').value.trim().slice(0, LIMITS.maxChars);
  if (text.length < 40 && !attachments.length) { showStatus('분석할 지도안을 올리거나 내용을 40자 이상 넣어 주세요.', 'err'); return; }
  if (!$('code-wrap').hidden && !$('ctx-code').value.trim()) { showStatus('접속 코드를 넣어 주세요.', 'err'); $('ctx-code').focus(); return; }

  const runTool = toolId, runState = state;
  ctl = new AbortController();
  $('btn-analyze').disabled = true; $('btn-stop').hidden = false;
  const t0 = Date.now();
  const tick = () => showStatus(`AI가 ${TOOLS[runTool].tab} 점검표로 지도안을 진단하는 중입니다 · ${Math.round((Date.now() - t0) / 1000)}초`, 'busy');
  tick(); const timer = setInterval(tick, 1000);
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({
        tool: runTool, text, grade: $('ctx-grade').value, subject: $('ctx-subject').value, note: $('ctx-note').value,
        code: $('ctx-code').value, files: attachments.map(({ mimeType, data }) => ({ mimeType, data })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `서버 오류가 발생했습니다 (${res.status}).`);
    runState.result = normalize(data.result);
    hideStatus();
    goStep(3);
  } catch (e) {
    if (e.name === 'AbortError') hideStatus();
    else showStatus(e.message === 'Failed to fetch' ? '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.' : e.message, 'err');
  } finally {
    clearInterval(timer); ctl = null;
    $('btn-analyze').disabled = false; $('btn-stop').hidden = true;
  }
}
function showStatus(msg, kind) {
  const s = $('status'); s.hidden = false;
  s.className = 'status' + (kind === 'err' ? ' err' : '');
  s.innerHTML = (kind === 'busy' ? '<span class="spinner" aria-hidden="true"></span>' : '') + '<span>' + esc(msg) + '</span>';
}
function hideStatus() { $('status').hidden = true; }

/* ---------- 3단계: 비교 결과 ---------- */
function aiScores() { return Object.fromEntries(state.result.items.map((i) => [i.id, i.score])); }

function renderCompare() {
  const el = $('step3');
  const r = state.result;
  if (!r) { el.innerHTML = ''; return; }
  const me = state.self, ai = aiScores(), all = ids();
  const meAvg = avg(all, me), aiTotal = aiAvg(all, ai);
  const gm = gradeOf(meAvg), ga = gradeOf(aiTotal);
  const judged = all.filter((id) => ai[id] != null);
  const over = judged.filter((id) => me[id] - ai[id] >= 2);
  const under = judged.filter((id) => ai[id] - me[id] >= 2);
  const held = all.filter((id) => ai[id] == null);
  const same = judged.filter((id) => me[id] === ai[id]).length;
  const qTitle = (id) => `${num(id)}. ${T.items.find((i) => i.id === id).q}`;

  let h = `<div class="panel overview">
    <div class="lesson-meta">
      <div class="eyebrow">3단계 · ${esc(T.tab)} 점검표로 진단한 지도안</div>
      <h2>${esc(r.lesson.title)}</h2>
      <div class="chips">
        ${r.lesson.grade ? `<span class="chip">${esc(r.lesson.grade)}</span>` : ''}
        ${r.lesson.subject ? `<span class="chip">${esc(r.lesson.subject)}</span>` : ''}
        ${r.lesson.aiTools.map((t) => `<span class="chip tool">${esc(t)}</span>`).join('')}
      </div>
      ${r.overall ? `<p class="overall-text">${esc(r.overall)}</p>` : ''}
    </div>
    <div class="score-box">
      <div class="score-pair">
        <div class="me"><span class="who">내 자기 평가</span><div class="score-num">${meAvg.toFixed(1)}</div><span class="grade ${gm.cls}">${gm.t}</span></div>
        <div><span class="who">AI 진단</span><div class="score-num">${fmt(aiTotal)}</div><span class="grade ${ga.cls}">${ga.t}</span></div>
      </div>
      <span class="adjusted-note">${all.length}개 항목 중 ${same}개 일치${held.length ? ` · AI 판단 보류 ${held.length}개(평균 제외)` : ''} · 5점 만점</span>
    </div>
    <div class="stages">
      ${T.stages.map((s) => {
        const list = stageIds(s.key), m = avg(list, me), a = aiAvg(list, ai);
        return `<div class="stage-tile"><div class="top"><span class="name" style="color:var(--${s.c})">${s.name}</span></div>
          <div class="dual">
            <div class="ln"><span>나</span><div class="bar"><i style="width:${m / 5 * 100}%;background:var(--${s.c})"></i></div><span>${m.toFixed(1)}</span></div>
            <div class="ln"><span>AI</span><div class="bar"><i class="ai" style="width:${(a || 0) / 5 * 100}%"></i></div><span>${fmt(a)}</span></div>
          </div></div>`;
      }).join('')}
    </div>
  </div>`;

  h += `<div class="panel reflect"><h3>돌아볼 점</h3>`;
  if (!over.length && !under.length) {
    h += `<p>자기 평가와 AI 진단이 AI가 판단한 모든 항목에서 1점 이내로 비슷합니다. 아래 개선 제안을 중심으로 지도안을 다듬어 보세요.</p>`;
  } else {
    if (over.length) h += `<p>스스로는 높게 봤지만 지도안에서 근거가 약하게 드러난 항목입니다. 수업 의도가 지도안에 글로 적혀 있는지 확인해 보세요.</p><ul>${over.map((id) => `<li><b>${esc(qTitle(id))}</b> · 나 ${me[id]}점, AI ${ai[id]}점</li>`).join('')}</ul>`;
    if (under.length) h += `<p style="margin-top:12px">스스로는 낮게 봤지만 AI는 지도안에서 충분한 근거를 찾은 항목입니다. 이미 잘 설계한 부분일 수 있습니다.</p><ul>${under.map((id) => `<li><b>${esc(qTitle(id))}</b> · 나 ${me[id]}점, AI ${ai[id]}점</li>`).join('')}</ul>`;
  }
  if (held.length) h += `<p style="margin-top:12px">지도안만으로는 AI가 판단하기 어려운 항목입니다. 이 항목은 선생님의 자기 평가와 성찰을 기준으로 삼으세요.</p><ul>${held.map((id) => `<li><b>${esc(qTitle(id))}</b> · 나 ${me[id]}점</li>`).join('')}</ul>`;
  h += `</div>`;

  h += `<div class="two-lists">
    <div class="panel list-card"><h3><span class="dot" style="background:var(--good)"></span>잘된 점</h3><ol>${r.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
    <div class="panel list-card"><h3><span class="dot" style="background:var(--bad)"></span>먼저 고칠 점</h3><ol>${r.priorities.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
  </div>`;

  for (const s of T.stages) {
    h += `<section class="panel stage-section">${stageHead(s)}`;
    for (const base of T.items.filter((i) => i.stage === s.key)) {
      const it = r.items.find((x) => x.id === base.id);
      const g = gapOf(me[base.id], ai[base.id]);
      h += `<div class="item">
        <div class="item-top">${itemQuestion(base, s, false)}
          <div class="cmp">
            <div class="row"><span>나</span>${miniStars(me[base.id])}<b>${me[base.id]}</b></div>
            <div class="row"><span>AI</span>${miniStars(ai[base.id], 'ai')}<b>${ai[base.id] ?? '–'}</b></div>
            <span class="gap ${g.cls}">${g.t}</span>
          </div>
        </div>
        ${it.evidence ? `<blockquote class="evidence">“${esc(it.evidence)}”</blockquote>` : `<p class="evidence none">지도안에서 관련 내용을 찾지 못했습니다.</p>`}
        <dl class="kv"><dt>판단 근거</dt><dd>${esc(it.reason)}</dd>${it.suggestion ? `<dt>개선 제안</dt><dd>${esc(it.suggestion)}</dd>` : ''}</dl>
      </div>`;
    }
    if (T.memo && state.memo[s.key]) h += `<p class="memo-out"><b>나의 성찰</b>${esc(state.memo[s.key])}</p>`;
    h += `</section>`;
  }

  h += `<div class="panel actions">
    <div class="btn-row">
      <button type="button" class="btn small" data-go="1">자기 평가 고치기</button>
      <button type="button" class="btn small" data-go="2">지도안 고쳐서 다시 진단</button>
    </div>
    <div class="btn-row">
      <button type="button" class="btn small" id="btn-copy">결과 요약 복사</button>
      <button type="button" class="btn small" id="btn-save">보고서 저장 (.md)</button>
      <button type="button" class="btn small" id="btn-print">인쇄 / PDF</button>
      <button type="button" class="btn small" id="btn-restart">새로 시작</button>
    </div>
    <div id="restart-confirm" class="status" hidden style="width:100%;justify-content:space-between;flex-wrap:wrap">
      <span>${esc(T.tab)} 탭의 자기 평가, 지도안, 진단 결과를 모두 지웁니다.</span>
      <span class="btn-row"><button type="button" class="btn small" id="btn-restart-no">취소</button><button type="button" class="btn small primary" id="btn-restart-yes">모두 지우기</button></span>
    </div>
    <textarea id="copy-fallback" readonly hidden></textarea>
  </div>`;
  el.innerHTML = h;
}

function reportText() {
  const r = state.result, me = state.self, ai = aiScores(), all = ids();
  let t = `# ${T.title} 진단 결과\n\n`;
  t += `- 지도안: ${r.lesson.title}\n`;
  if (r.lesson.grade || r.lesson.subject) t += `- 대상: ${[r.lesson.grade, r.lesson.subject].filter(Boolean).join(' / ')}\n`;
  if (r.lesson.aiTools.length) t += `- 활용 도구: ${r.lesson.aiTools.join(', ')}\n`;
  t += `- 평균: 자기 평가 ${avg(all, me).toFixed(1)} / AI 진단 ${fmt(aiAvg(all, ai))} (5점 만점)\n\n`;
  t += `## 단계별 평균 (나 / AI)\n` + T.stages.map((s) => `- ${s.name}: ${avg(stageIds(s.key), me).toFixed(1)} / ${fmt(aiAvg(stageIds(s.key), ai))}`).join('\n') + '\n\n';
  if (r.overall) t += `## 종합 의견\n${r.overall}\n\n`;
  if (r.strengths.length) t += `## 잘된 점\n` + r.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n';
  if (r.priorities.length) t += `## 먼저 고칠 점\n` + r.priorities.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n';
  t += `## 항목별 비교\n`;
  for (const s of T.stages) {
    for (const base of T.items.filter((i) => i.stage === s.key)) {
      const it = r.items.find((x) => x.id === base.id);
      t += `\n### ${num(base.id)}. [${base.stage}/${base.crit}] ${base.q}\n`;
      t += `- 자기 평가 ${me[base.id]}점 · AI ${ai[base.id] ?? '판단 보류'}${ai[base.id] != null ? '점' : ''} (${gapOf(me[base.id], ai[base.id]).t})\n`;
      t += `- 근거 인용: ${it.evidence ? '"' + it.evidence + '"' : '지도안에서 찾지 못함'}\n`;
      t += `- 판단 근거: ${it.reason}\n`;
      if (it.suggestion) t += `- 개선 제안: ${it.suggestion}\n`;
    }
    if (T.memo && state.memo[s.key]) t += `\n> ${s.name} 단계 나의 성찰: ${state.memo[s.key].replace(/\n/g, ' ')}\n`;
  }
  return t;
}

let toastTimer;
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

function renderAll() {
  renderTabs();
  renderSteps();
  if (state.step === 1) renderSelf();
  if (state.step === 2) renderSelfSummary();
  if (state.step === 3) renderCompare();
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', (ev) => {
  const go = ev.target.closest('[data-go]');
  if (go && !go.disabled) goStep(Number(go.dataset.go));
  const tab = ev.target.closest('[data-tool]');
  if (tab) { ev.preventDefault(); switchTool(tab.dataset.tool); }
});
window.addEventListener('hashchange', () => switchTool(location.hash.slice(1)));

$('self-form').addEventListener('click', (ev) => {
  const star = ev.target.closest('.stars button');
  if (star) setSelfScore(star.dataset.q, Number(star.dataset.v));
});
$('self-form').addEventListener('input', (ev) => {
  const m = ev.target.closest('[data-memo]');
  if (m) { state.memo[m.dataset.memo] = m.value; saveLocal(); }
});
$('btn-self-reset').addEventListener('click', () => { state.self = emptySelf(T); renderAll(); saveLocal(); });
$('btn-to2').addEventListener('click', () => goStep(2));

$('step3').addEventListener('click', async (ev) => {
  if (ev.target.closest('#btn-copy')) {
    const txt = reportText();
    try { await navigator.clipboard.writeText(txt); toast('진단 결과를 복사했습니다.'); }
    catch (e) { const ta = $('copy-fallback'); ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); toast('자동 복사가 막혀 있어요. 선택된 글을 직접 복사해 주세요.'); }
  } else if (ev.target.closest('#btn-save')) {
    const safe = state.result.lesson.title.replace(/[\\/:*?"<>|]+/g, '').slice(0, 40).trim() || '지도안';
    const url = URL.createObjectURL(new Blob([reportText()], { type: 'text/markdown;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${toolId.toUpperCase()}_수업설계진단_${safe}.md` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (ev.target.closest('#btn-print')) window.print();
  else if (ev.target.closest('#btn-restart')) $('restart-confirm').hidden = false;
  else if (ev.target.closest('#btn-restart-no')) $('restart-confirm').hidden = true;
  else if (ev.target.closest('#btn-restart-yes')) {
    tabs[toolId] = state = freshTab(toolId);
    for (const id of INPUT_IDS) $(id).value = '';
    clearAttachments(); renderChip(); setHint(''); updateCount();
    saveLocal(); renderAll(); window.scrollTo({ top: 0 });
  }
});

$('file-input').multiple = true;
$('file-input').addEventListener('change', async (e) => { for (const f of e.target.files) await handleFile(f); e.target.value = ''; captureInputs(); });
const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', async (e) => { for (const f of e.dataTransfer.files) await handleFile(f); captureInputs(); });
$('file-clear').addEventListener('click', () => { clearAttachments(); renderChip(); setHint(''); captureInputs(); });
$('plan-text').addEventListener('input', () => { updateCount(); saveLocal(); });
for (const id of ['ctx-grade', 'ctx-subject', 'ctx-note', 'ctx-code']) $(id).addEventListener('change', saveLocal);
$('btn-analyze').addEventListener('click', analyze);
$('btn-stop').addEventListener('click', () => ctl?.abort());
$('btn-sample').addEventListener('click', () => {
  $('plan-text').value = SAMPLE_PLAN; clearAttachments(); renderChip(); setHint('');
  $('ctx-grade').value = '초등학교 5학년'; $('ctx-subject').value = '과학'; $('ctx-note').value = '';
  updateCount(); saveLocal(); $('plan-text').focus();
});

/* ---------- 시작 ---------- */
const saved = loadLocal();
if (saved?.tabs) {
  for (const id of TOOL_ORDER) {
    const t = saved.tabs[id];
    if (!t) continue;
    tabs[id] = { ...freshTab(id), ...t, self: { ...emptySelf(TOOLS[id]), ...(t.self || {}) }, memo: t.memo || {}, attachments: [] };
  }
  $('ctx-code').value = saved.code || '';
}
const startId = TOOLS[location.hash.slice(1)] ? location.hash.slice(1) : (TOOLS[saved?.toolId] ? saved.toolId : 'd1');
toolId = startId; T = TOOLS[toolId]; state = tabs[toolId];
for (const id of TOOL_ORDER) {
  const t = tabs[id];
  if ((t.step === 2 && !TOOLS[id].items.every((i) => t.self[i.id] > 0)) || (t.step === 3 && !t.result)) t.step = 1;
}
for (const k of INPUT_IDS) $(k).value = state.inputs[k] || '';
updateCount();
renderAll();
fetch('/api/config').then((r) => r.json()).then((c) => { $('code-wrap').hidden = !c.needCode; }).catch(() => {});
