import { STAGES, ITEMS, SCORE_LABEL, LIMITS } from './criteria.js';

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

const SAMPLE_RESULT = {
  lesson: { title: '날씨와 우리 생활: 우리 지역 날씨 자료 분석', subject: '과학', grade: '초등학교 5학년', aiTools: ['AI 챗봇', '패들렛', '태블릿'] },
  overall: '성취기준과 학습 목표가 분명하고, AI 챗봇을 날씨 정보 탐색에 쓰는 흐름은 자연스럽습니다. 다만 챗봇 답변을 검증하는 단계와 수준별 지원, 기기 오류 대비책이 지도안에 드러나지 않아 실제 수업에서 활동이 정보 받아 적기로 끝날 위험이 있습니다.',
  strengths: ['성취기준 [6과13-03]과 학습 목표가 직접 연결되어 있습니다.', '질문 작성이 어려운 모둠에 질문 예시 카드를 준비해 초기 진입 장벽을 낮췄습니다.', 'AI 답변이 틀릴 수 있음을 안내하는 유의점이 포함되어 있습니다.'],
  priorities: ['챗봇 답변을 기상청 실제 자료와 비교해 검증하는 활동을 전개 1에 추가하세요.', '인터넷이나 태블릿이 안 될 때 쓸 인쇄 날씨 자료 세트를 준비하세요.', '상/중/하 평가 기준을 구체적인 관찰 지표로 나누고, AI 피드백의 역할을 교사 피드백과 구분하세요.'],
  items: [
    { id: 'q1', score: 4, evidence: '성취기준: [6과13-03] 기온, 바람, 습도 등 날씨 요소가 우리 생활에 미치는 영향을 조사하고…', reason: 'AI 챗봇이 날씨 영향 조사라는 성취기준 활동에 직접 쓰입니다. 다만 챗봇이 아니면 안 되는 이유는 드러나지 않습니다.', suggestion: '챗봇을 쓰는 목적을 "다양한 생활 사례를 빠르게 모으기"처럼 한 줄로 명시하세요.' },
    { id: 'q2', score: 3, evidence: '평가 방법: 관찰평가, 패들렛 결과물', reason: '목표와 활동은 연결되지만, 평가가 AI 활용 과정(질문의 질, 답변 검증)을 보지 않아 활동-평가 연결이 약합니다.', suggestion: '평가 요소에 "챗봇 답변을 근거 자료와 비교했는가"를 추가하세요.' },
    { id: 'q3', score: 4, evidence: '학생용 태블릿(4인 1모둠 2대), 질문 예시 카드 제공', reason: '모둠당 기기 2대와 질문 예시 카드로 5학년 수준에 맞게 환경을 고려했습니다.', suggestion: '학급용 계정 로그인 절차를 수업 전에 미리 끝내 두도록 준비 사항에 적으세요.' },
    { id: 'q4', score: 3, evidence: '챗봇 답변을 패들렛에 정리', reason: '정보를 모아 옮기는 활동이 중심이라 탐구나 다른 상황으로의 전이까지는 이어지지 않습니다.', suggestion: '"내일 날씨가 이렇다면 우리 반 체육 수업을 어떻게 바꿀까?" 같은 적용 과제를 넣으세요.' },
    { id: 'q5', score: 2, evidence: '교사는 순회하며 질문 작성이 어려운 모둠에 질문 예시 카드 제공', reason: '느린 학습자 지원은 있지만 빠른 학습자를 위한 심화 과제와 모둠 내 역할 분담이 없어 일부 학생만 태블릿을 쓸 가능성이 큽니다.', suggestion: '모둠 내 역할(질문자·기록자·검증자·발표자)을 정하고, 빠른 모둠용 심화 질문을 준비하세요.' },
    { id: 'q6', score: 3, evidence: 'AI 챗봇이 발표 내용에 대해 칭찬과 보완점을 피드백', reason: '평가 기준이 상/중/하 한 줄뿐이고, AI 피드백이 모둠마다 일관되게 주어지는지 확인하는 장치가 없습니다.', suggestion: '루브릭을 3개 지표로 나누고, AI 피드백은 교사가 검토한 뒤 전달하도록 바꾸세요.' },
    { id: 'q7', score: 4, evidence: '모둠별로 AI 챗봇에게 우리 지역 일주일 날씨와 생활 속 영향을 질문', reason: '교과서 사례보다 학생이 직접 질문하며 우리 지역 사례를 모으는 방식이라 참여와 개별화 측면의 이점이 있습니다.', suggestion: '기존 방식(교과서 자료)과 비교해 무엇이 나아지는지 교사용 메모로 정리해 두세요.' },
    { id: 'q8', score: 2, evidence: '', reason: '인터넷 단절, 로그인 오류, 기기 고장에 대한 대안이 지도안에서 확인되지 않습니다.', suggestion: '인쇄한 일주일 날씨표와 생활 사례 카드를 모둠 수만큼 준비하고, 오류 시 전환 절차를 유의점에 적으세요.' },
  ],
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';

let attachments = [];  // [{name, mimeType, data(base64), size}] PDF·이미지는 원본 그대로 AI에게 보냅니다
let current = null;    // { result, ai: {id: score}, user: {id: score}, isExample }
let ctl = null;

/* ---------- 브라우저 저장 (이 기기에서만) ---------- */
function saveLocal() {
  try {
    localStorage.setItem('lp-diag', JSON.stringify({
      text: $('plan-text').value, grade: $('ctx-grade').value, subject: $('ctx-subject').value,
      note: $('ctx-note').value, code: $('ctx-code').value, current,
    }));
  } catch (e) {}
}
function loadLocal() {
  try { return JSON.parse(localStorage.getItem('lp-diag') || 'null'); } catch (e) { return null; }
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

/* ---------- 분석 ---------- */
function normalize(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.items)) throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.');
  const byId = {};
  for (const it of r.items) if (it && it.id) byId[String(it.id).toLowerCase()] = it;
  const items = ITEMS.map((base) => {
    const it = byId[base.id] || {};
    const s = Math.round(Number(it.score));
    return { id: base.id, score: s >= 1 && s <= 5 ? s : 1, evidence: String(it.evidence || ''), reason: String(it.reason || '분석 결과가 없습니다.'), suggestion: String(it.suggestion || '') };
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
  const text = $('plan-text').value.trim().slice(0, LIMITS.maxChars);
  if (text.length < 40 && !attachments.length) { showStatus('분석할 지도안을 올리거나 내용을 40자 이상 넣어 주세요.', 'err'); return; }
  if (!$('code-wrap').hidden && !$('ctx-code').value.trim()) { showStatus('접속 코드를 넣어 주세요.', 'err'); $('ctx-code').focus(); return; }

  ctl = new AbortController();
  $('btn-analyze').disabled = true; $('btn-stop').hidden = false;
  const t0 = Date.now();
  const tick = () => showStatus(`AI가 지도안을 읽고 진단하는 중입니다 · ${Math.round((Date.now() - t0) / 1000)}초`, 'busy');
  tick(); const timer = setInterval(tick, 1000);
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({
        text, grade: $('ctx-grade').value, subject: $('ctx-subject').value, note: $('ctx-note').value,
        code: $('ctx-code').value, files: attachments.map(({ mimeType, data }) => ({ mimeType, data })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `서버 오류가 발생했습니다 (${res.status}).`);
    const result = normalize(data.result);
    const ai = Object.fromEntries(result.items.map((i) => [i.id, i.score]));
    current = { result, ai, user: { ...ai }, isExample: false };
    render(); saveLocal(); hideStatus();
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    if (e.name === 'AbortError') hideStatus();
    else showStatus(e.message === 'Failed to fetch' ? '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.' : e.message, 'err');
  } finally {
    clearInterval(timer);
    $('btn-analyze').disabled = false; $('btn-stop').hidden = true;
  }
}
function showStatus(msg, kind) {
  const s = $('status'); s.hidden = false;
  s.className = 'status' + (kind === 'err' ? ' err' : '');
  s.innerHTML = (kind === 'busy' ? '<span class="spinner" aria-hidden="true"></span>' : '') + '<span>' + esc(msg) + '</span>';
}
function hideStatus() { $('status').hidden = true; }

/* ---------- 결과 화면 ---------- */
function avg(ids, scores) { return ids.reduce((a, id) => a + scores[id], 0) / ids.length; }
function gradeOf(v) {
  if (v >= 4.5) return { cls: 'g4', t: '매우 우수 · 완성도 높은 AI 수업 설계' };
  if (v >= 3.8) return { cls: 'g3', t: '우수 · 안정적인 AI 수업 설계' };
  if (v >= 3.0) return { cls: 'g2', t: '보통 · 부분적 보완 필요' };
  return { cls: 'g1', t: '미흡 · 전면적 재검토 필요' };
}
function starsHtml(id, score) {
  let h = `<div class="stars" role="radiogroup" aria-label="${id} 평점">`;
  for (let v = 1; v <= 5; v++) h += `<button type="button" role="radio" aria-checked="${v === score}" aria-label="${v}점 ${SCORE_LABEL[v]}" data-q="${id}" data-v="${v}" class="${v <= score ? 'on' : ''}">${STAR_SVG}</button>`;
  return h + '</div>';
}

function render() {
  const el = $('results');
  if (!current) { el.innerHTML = ''; return; }
  const { result: r, ai, user, isExample } = current;
  const allIds = ITEMS.map((i) => i.id);
  const total = avg(allIds, user);
  const g = gradeOf(total);
  const changed = allIds.filter((id) => ai[id] !== user[id]).length;

  let h = '';
  if (isExample) h += `<div class="example-banner"><b>예시 결과입니다.</b> 아래는 예시 지도안을 분석한 모습입니다. 선생님의 지도안을 올리고 [AI 분석 시작]을 누르세요.</div>`;

  h += `<div class="panel overview">
    <div class="lesson-meta">
      <div class="eyebrow">진단한 지도안</div>
      <h2>${esc(r.lesson.title)}</h2>
      <div class="chips">
        ${r.lesson.grade ? `<span class="chip">${esc(r.lesson.grade)}</span>` : ''}
        ${r.lesson.subject ? `<span class="chip">${esc(r.lesson.subject)}</span>` : ''}
        ${r.lesson.aiTools.map((t) => `<span class="chip tool">${esc(t)}</span>`).join('')}
      </div>
      ${r.overall ? `<p class="overall-text">${esc(r.overall)}</p>` : ''}
    </div>
    <div class="score-box">
      <span class="lbl">전체 평균</span>
      <div class="score-num">${total.toFixed(1)}<small> / 5.0</small></div>
      <span class="grade ${g.cls}">${g.t}</span>
      ${changed ? `<span class="adjusted-note">선생님이 ${changed}개 항목을 조정했습니다 (AI 평균 ${avg(allIds, ai).toFixed(1)})</span>` : ''}
    </div>
    <div class="stages">
      ${STAGES.map((s) => {
        const ids = ITEMS.filter((i) => i.stage === s.key).map((i) => i.id);
        const v = avg(ids, user);
        return `<div class="stage-tile"><div class="top"><span class="name" style="color:var(--${s.c})">${s.name}</span><span class="val">${v.toFixed(1)}</span></div><div class="bar"><i style="width:${v / 5 * 100}%;background:var(--${s.c})"></i></div></div>`;
      }).join('')}
    </div>
  </div>`;

  h += `<div class="two-lists">
    <div class="panel list-card"><h3><span class="dot" style="background:var(--good)"></span>잘된 점</h3><ol>${r.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
    <div class="panel list-card"><h3><span class="dot" style="background:var(--bad)"></span>먼저 고칠 점</h3><ol>${r.priorities.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
  </div>`;

  for (const s of STAGES) {
    const its = ITEMS.filter((i) => i.stage === s.key);
    h += `<section class="panel stage-section"><div class="stage-head" style="background:var(--${s.c}-soft)">
      <h3><span class="tag" style="background:var(--${s.c})">${s.name}</span>${esc(s.title)}</h3><span class="focus">${esc(s.focus)}</span></div>`;
    for (const base of its) {
      const it = r.items.find((x) => x.id === base.id);
      const n = ITEMS.indexOf(base) + 1;
      const u = user[base.id], a = ai[base.id];
      h += `<div class="item">
        <div class="item-top">
          <div class="item-q"><span class="crit" style="background:var(--${s.c}-soft);color:var(--${s.c})">${base.crit}</span><h4>${n}. ${esc(base.q)}</h4></div>
          <div class="rate">${starsHtml(base.id, u)}<span class="rlabel"><b>${u}점 ${SCORE_LABEL[u]}</b>${u !== a ? ` · AI ${a}점` : ' · AI 판단'}</span></div>
        </div>
        ${it.evidence ? `<blockquote class="evidence">“${esc(it.evidence)}”</blockquote>` : `<p class="evidence none">지도안에서 관련 내용을 찾지 못했습니다.</p>`}
        <dl class="kv"><dt>판단 근거</dt><dd>${esc(it.reason)}</dd>${it.suggestion ? `<dt>개선 제안</dt><dd>${esc(it.suggestion)}</dd>` : ''}</dl>
      </div>`;
    }
    h += `</section>`;
  }

  h += `<div class="panel actions">
    <span class="note">별점을 누르면 선생님 판단으로 점수를 고칠 수 있습니다.</span>
    <div class="btn-row">
      ${changed ? '<button type="button" class="btn small" id="btn-revert">AI 점수로 되돌리기</button>' : ''}
      <button type="button" class="btn small" id="btn-copy">결과 요약 복사</button>
      <button type="button" class="btn small" id="btn-save">보고서 저장 (.md)</button>
      <button type="button" class="btn small" id="btn-print">인쇄 / PDF</button>
    </div>
    <textarea id="copy-fallback" readonly hidden></textarea>
  </div>`;
  el.innerHTML = h;
}

function reportText() {
  const { result: r, ai, user } = current;
  const ids = ITEMS.map((i) => i.id);
  const total = avg(ids, user);
  let t = `# AI 수업 설계 진단 결과\n\n`;
  t += `- 지도안: ${r.lesson.title}\n`;
  if (r.lesson.grade || r.lesson.subject) t += `- 대상: ${[r.lesson.grade, r.lesson.subject].filter(Boolean).join(' / ')}\n`;
  if (r.lesson.aiTools.length) t += `- 활용 도구: ${r.lesson.aiTools.join(', ')}\n`;
  t += `- 전체 평균: ${total.toFixed(1)} / 5.0 (${gradeOf(total).t})\n\n`;
  t += `## 단계별 평균\n` + STAGES.map((s) => `- ${s.name}: ${avg(ITEMS.filter((i) => i.stage === s.key).map((i) => i.id), user).toFixed(1)}`).join('\n') + '\n\n';
  if (r.overall) t += `## 종합 의견\n${r.overall}\n\n`;
  if (r.strengths.length) t += `## 잘된 점\n` + r.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n';
  if (r.priorities.length) t += `## 먼저 고칠 점\n` + r.priorities.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n';
  t += `## 항목별 진단\n`;
  ITEMS.forEach((base, i) => {
    const it = r.items.find((x) => x.id === base.id);
    t += `\n### ${i + 1}. [${base.stage}/${base.crit}] ${base.q}\n`;
    t += `- 평점: ${user[base.id]}점 (${SCORE_LABEL[user[base.id]]})${user[base.id] !== ai[base.id] ? ` · AI ${ai[base.id]}점` : ''}\n`;
    t += `- 근거 인용: ${it.evidence ? '"' + it.evidence + '"' : '지도안에서 찾지 못함'}\n`;
    t += `- 판단 근거: ${it.reason}\n`;
    if (it.suggestion) t += `- 개선 제안: ${it.suggestion}\n`;
  });
  return t;
}

let toastTimer;
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- 이벤트 ---------- */
$('results').addEventListener('click', async (ev) => {
  const star = ev.target.closest('.stars button');
  if (star && current) {
    current.user[star.dataset.q] = Number(star.dataset.v);
    render(); saveLocal();
    document.querySelector(`.stars button[data-q="${star.dataset.q}"][data-v="${star.dataset.v}"]`)?.focus();
    return;
  }
  if (ev.target.closest('#btn-revert')) { current.user = { ...current.ai }; render(); saveLocal(); return; }
  if (ev.target.closest('#btn-copy')) {
    const txt = reportText();
    try { await navigator.clipboard.writeText(txt); toast('진단 결과를 복사했습니다.'); }
    catch (e) { const ta = $('copy-fallback'); ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); toast('자동 복사가 막혀 있어요. 선택된 글을 직접 복사해 주세요.'); }
    return;
  }
  if (ev.target.closest('#btn-save')) {
    const safe = current.result.lesson.title.replace(/[\\/:*?"<>|]+/g, '').slice(0, 40).trim() || '지도안';
    const url = URL.createObjectURL(new Blob([reportText()], { type: 'text/markdown;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `수업설계진단_${safe}.md` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (ev.target.closest('#btn-print')) window.print();
});

$('file-input').addEventListener('change', async (e) => { for (const f of e.target.files) await handleFile(f); e.target.value = ''; });
$('file-input').multiple = true;
const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', async (e) => { for (const f of e.dataTransfer.files) await handleFile(f); });
$('file-clear').addEventListener('click', () => { clearAttachments(); renderChip(); setHint(''); });
$('plan-text').addEventListener('input', updateCount);
$('btn-analyze').addEventListener('click', analyze);
$('btn-stop').addEventListener('click', () => ctl?.abort());
$('btn-sample').addEventListener('click', () => {
  $('plan-text').value = SAMPLE_PLAN; clearAttachments(); renderChip(); setHint('');
  $('ctx-grade').value = '초등학교 5학년'; $('ctx-subject').value = '과학'; $('ctx-note').value = '';
  updateCount(); $('plan-text').focus();
});

/* ---------- 시작 ---------- */
const saved = loadLocal();
if (saved) {
  $('plan-text').value = saved.text || ''; $('ctx-grade').value = saved.grade || '';
  $('ctx-subject').value = saved.subject || ''; $('ctx-note').value = saved.note || ''; $('ctx-code').value = saved.code || '';
}
if (saved?.current) current = saved.current;
else {
  const ai = Object.fromEntries(SAMPLE_RESULT.items.map((i) => [i.id, i.score]));
  current = { result: SAMPLE_RESULT, ai, user: { ...ai }, isExample: true };
}
updateCount();
render();
fetch('/api/config').then((r) => r.json()).then((c) => { $('code-wrap').hidden = !c.needCode; }).catch(() => {});
