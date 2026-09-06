/* V5.9B Student Practice Preview — concept-fidelity practice navigation.
   Test-only presentation layer loaded only with ?v59-student-home-preview=1.
   It reads existing V5.8 Practice controls and delegates all real actions back
   to the established V5.8/V5.5A engines. No direct network or persistence. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (ROOT.__v59bStudentPracticePreviewInstalled) return;
  ROOT.__v59bStudentPracticePreviewInstalled = true;

  const ROOT_ID = 'v59b-student-practice-preview';
  const STYLE_ID = 'v59b-student-practice-preview-style';
  const HOME_ID = 'v59-student-home-preview';
  let route = '';
  let paperTimer = 0;
  let bypassHomeCapture = false;

  const text = (value, fallback = '') => String(value ?? fallback).replace(/\s+/g, ' ').trim();
  const html = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.v59b-practice-open #${HOME_ID}{display:none!important}
      body.v59b-practice-open #start>.v40-student-nav,
      body.v59b-practice-open #start .v40-learning-hub-hero,
      body.v59b-practice-open #start .v40c3-home-dashboard,
      body.v59b-practice-open #start .v40c-session-panel.v40c-authenticated{display:none!important}
      #${ROOT_ID}{--ink:#16264c;--muted:#52627e;--blue:#1454d4;--purple:#6136d5;--green:#087657;--line:#e2eaf4;color:var(--ink);font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif;padding:0 0 92px;position:relative;min-width:0}
      #${ROOT_ID} *{box-sizing:border-box}
      #${ROOT_ID} button{font:inherit;color:inherit;cursor:pointer;border:0}
      #${ROOT_ID} button:focus-visible{outline:3px solid #ea8600;outline-offset:3px}
      #${ROOT_ID} .v59b-layout{min-width:0}
      #${ROOT_ID} .v59b-brand{display:none}
      #${ROOT_ID} .v59b-page{display:grid;gap:20px;min-width:0}
      #${ROOT_ID} .v59b-head{padding:18px 0 2px}
      #${ROOT_ID} .v59b-back{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 10px 0 0;background:transparent;color:var(--blue);font-size:13px;font-weight:900;margin-bottom:7px}
      #${ROOT_ID} .v59b-head h1{margin:0;font-size:clamp(27px,5vw,34px);line-height:1.15;letter-spacing:-.04em}
      #${ROOT_ID} .v59b-head p{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.5;max-width:580px}
      #${ROOT_ID} .v59b-section h2{margin:0 0 14px;font-size:20px;letter-spacing:-.025em}
      #${ROOT_ID} .v59b-practice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #${ROOT_ID} .v59b-path{border-radius:21px;padding:16px 10px 14px;text-align:left;min-height:156px;display:flex;flex-direction:column;align-items:flex-start;gap:14px;font-weight:900;line-height:1.18;font-size:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.63)}
      #${ROOT_ID} .v59b-path.mint{background:#d5f7e9}#${ROOT_ID} .v59b-path.sky{background:#d8edff}#${ROOT_ID} .v59b-path.gold{background:#fff0c9}
      #${ROOT_ID} .v59b-path-icon{width:45px;height:45px;border-radius:15px;color:#fff;display:grid;place-items:center;font-size:21px}
      #${ROOT_ID} .mint .v59b-path-icon{background:#079373}#${ROOT_ID} .sky .v59b-path-icon{background:#2979da}#${ROOT_ID} .gold .v59b-path-icon{background:#d77022}
      #${ROOT_ID} .v59b-arrow{margin-top:auto;align-self:flex-end;font-size:20px}
      #${ROOT_ID} .v59b-hub{display:grid;gap:12px}
      #${ROOT_ID} .v59b-hub-action{display:flex;align-items:center;gap:14px;text-align:left;width:100%;min-height:95px;background:#fff;padding:18px;border-radius:20px;border:1px solid var(--line)}
      #${ROOT_ID} .v59b-soft-icon{width:46px;height:46px;border-radius:14px;background:#edf1ff;color:#405cc0;display:grid;place-items:center;flex:none;font-size:21px}
      #${ROOT_ID} .v59b-grow{min-width:0;flex:1}
      #${ROOT_ID} .v59b-hub-action h3{margin:0;font-size:16px}#${ROOT_ID} .v59b-hub-action p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
      #${ROOT_ID} .v59b-notice{padding:14px;border-radius:14px;background:#edf3ff;color:#425a80;font-size:12px;line-height:1.5}
      #${ROOT_ID} .v59b-topic-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      #${ROOT_ID} .v59b-topic{background:#fff;border:1px solid var(--line);border-radius:20px;padding:17px;text-align:left;min-height:133px}
      #${ROOT_ID} .v59b-topic .v59b-soft-icon{margin-bottom:10px}#${ROOT_ID} .v59b-topic h3{margin:0;font-size:15px;line-height:1.3}#${ROOT_ID} .v59b-topic span{display:block;margin-top:5px;color:var(--muted);font-size:11px}
      #${ROOT_ID} .v59b-stack{display:grid;gap:16px}
      #${ROOT_ID} .v59b-card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:19px;box-shadow:0 5px 20px rgba(27,60,114,.06);min-width:0}
      #${ROOT_ID} .v59b-card-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px}#${ROOT_ID} .v59b-card-head h2{margin:0;font-size:18px}
      #${ROOT_ID} .v59b-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;background:#eaf0ff;color:#315eaa;font-size:10px;font-weight:900}
      #${ROOT_ID} .v59b-paper-list{display:grid;gap:10px}
      #${ROOT_ID} .v59b-paper{display:flex;align-items:center;gap:13px;width:100%;text-align:left;min-height:80px;padding:14px;border:1px solid var(--line);border-radius:17px;background:#fafdff}
      #${ROOT_ID} .v59b-paper h3{margin:0;font-size:15px}#${ROOT_ID} .v59b-paper p{margin:4px 0 0;color:var(--muted);font-size:11px}
      #${ROOT_ID} .v59b-empty{background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px;text-align:center;color:var(--muted)}
      #${ROOT_ID} .v59b-empty p{margin:0 0 14px;font-size:13px;line-height:1.5}
      #${ROOT_ID} .v59b-button{min-height:48px;padding:12px 18px;border-radius:14px;background:var(--blue);color:#fff;font-weight:900}
      #${ROOT_ID} .v59b-nav{position:fixed;bottom:0;left:0;right:0;z-index:9997;display:grid;grid-template-columns:repeat(5,1fr);background:rgba(255,255,255,.94);border-top:1px solid #e1e9f5;padding:7px 8px calc(7px + env(safe-area-inset-bottom));backdrop-filter:blur(10px)}
      #${ROOT_ID} .v59b-nav button{min-width:0;min-height:58px;border-radius:14px;background:transparent;color:#65718a;font-size:10px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
      #${ROOT_ID} .v59b-nav button span{font-size:21px;line-height:1}#${ROOT_ID} .v59b-nav button[data-v59b-nav="practice"]{color:var(--blue);background:#eaf2ff;font-weight:950}
      @media(min-width:600px){#${ROOT_ID} .v59b-practice-grid{gap:14px}#${ROOT_ID} .v59b-path{min-height:150px;padding:20px;flex-direction:row;align-items:center;flex-wrap:wrap}#${ROOT_ID} .v59b-arrow{margin-left:auto}#${ROOT_ID} .v59b-topic-grid{grid-template-columns:repeat(3,1fr)}#${ROOT_ID} .v59b-hub{grid-template-columns:1fr 1fr}}
      @media(min-width:980px){#${ROOT_ID}{padding:0 26px 50px}#${ROOT_ID} .v59b-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:26px}#${ROOT_ID} .v59b-brand{display:flex;grid-column:1;grid-row:1;flex-direction:column;gap:12px;padding:24px 0;position:sticky;top:10px;height:max-content}#${ROOT_ID} .v59b-mark{font-size:38px;font-weight:950;letter-spacing:-.11em;color:var(--blue)}#${ROOT_ID} .v59b-mark em{font-style:normal;color:var(--green)}#${ROOT_ID} .v59b-brand small{font-size:12px;color:var(--muted)}#${ROOT_ID} .v59b-page{grid-column:2;grid-row:1}#${ROOT_ID} .v59b-nav{position:sticky;grid-column:1;grid-row:1;align-self:start;top:225px;left:auto;right:auto;bottom:auto;display:flex;flex-direction:column;gap:7px;width:180px;margin-top:225px;background:transparent;border:0;padding:0;backdrop-filter:none;z-index:3}#${ROOT_ID} .v59b-nav button{min-height:52px;flex-direction:row;justify-content:flex-start;gap:14px;padding:12px 18px;font-size:13px}#${ROOT_ID} .v59b-nav button span{font-size:20px}}
      @media(max-width:390px){#${ROOT_ID} .v59b-practice-grid{gap:8px}#${ROOT_ID} .v59b-path{padding:14px 9px;font-size:12px}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID} *{scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function signedIn(){ return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated'); }

  function homeAction(action){
    const button = document.querySelector(`#${HOME_ID} [data-v59-action="${action}"]`);
    if (!button) return false;
    bypassHomeCapture = true;
    try { button.click(); } finally { bypassHomeCapture = false; }
    return true;
  }

  function closePractice(){
    if (paperTimer) { window.clearTimeout(paperTimer); paperTimer = 0; }
    document.body.classList.remove('v59b-practice-open');
    document.getElementById(ROOT_ID)?.remove();
    route = '';
  }

  function nav(){
    return `<nav class="v59b-nav" aria-label="V5.9 student preview navigation">
      <button type="button" data-v59b-nav="home"><span>🏠</span>Home</button>
      <button type="button" data-v59b-nav="practice"><span>✏️</span>Practice</button>
      <button type="button" data-v59b-nav="progress"><span>📊</span>Progress</button>
      <button type="button" data-v59b-nav="badges"><span>🏅</span>Badges</button>
      <button type="button" data-v59b-nav="more"><span>•••</span>More</button>
    </nav>`;
  }

  function shell(content){
    return `<div class="v59b-layout"><aside class="v59b-brand" aria-hidden="true"><div class="v59b-mark">m<em>+</em></div><strong>Maths Practice</strong><small>Small steps. Big progress.</small></aside><main class="v59b-page">${content}</main>${nav()}</div>`;
  }

  function pathCards(){
    return `<div class="v59b-practice-grid">
      <button type="button" class="v59b-path mint" data-v59b-action="mixed"><span class="v59b-path-icon">➗</span><span>Mixed<br>Practice</span><span class="v59b-arrow">→</span></button>
      <button type="button" class="v59b-path sky" data-v59b-route="topics"><span class="v59b-path-icon">🎯</span><span>Topic<br>Practice</span><span class="v59b-arrow">→</span></button>
      <button type="button" class="v59b-path gold" data-v59b-route="papers"><span class="v59b-path-icon">📄</span><span>Past<br>Papers</span><span class="v59b-arrow">→</span></button>
    </div>`;
  }

  function renderPractice(){
    return shell(`<header class="v59b-head"><h1>Your practice space</h1><p>Choose a little challenge for today.</p></header><section class="v59b-section"><h2>How would you like to practise?</h2>${pathCards()}</section><section class="v59b-hub"><button type="button" class="v59b-hub-action" data-v59b-action="assignments"><span class="v59b-soft-icon">📚</span><span class="v59b-grow"><h3>Assigned practice</h3><p>Your teacher has a task for you.</p></span><span>→</span></button><button type="button" class="v59b-hub-action" data-v59b-action="recommend"><span class="v59b-soft-icon">💡</span><span class="v59b-grow"><h3>Recommended practice</h3><p>Try the next step suggested by your current learning evidence.</p></span><span>→</span></button></section><div class="v59b-notice">Practice keeps the existing hints, feedback and secure start flow. Exam Mode stays unchanged.</div>`);
  }

  function topicOptions(){
    const select = document.getElementById('topic-filter');
    if (!select) return [];
    return [...select.options].filter(option => option.value && option.value !== 'all' && !option.disabled).map(option => ({ value:option.value, label:text(option.textContent, option.value) }));
  }

  function renderTopics(){
    const topics = topicOptions();
    const body = topics.length
      ? `<div class="v59b-topic-grid">${topics.map((topic,index)=>`<button type="button" class="v59b-topic" data-v59b-topic="${html(topic.value)}"><span class="v59b-soft-icon">${['🔢','➗','🔹','％','📏','📐','🕒','💰','📊','💡'][index%10]}</span><h3>${html(topic.label)}</h3><span>Practise this topic with the existing question bank</span></button>`).join('')}</div>`
      : `<div class="v59b-empty"><p>Topics are still loading from the existing Practice filters.</p><button type="button" class="v59b-button" data-v59b-action="topic-setup">Open Practice setup</button></div>`;
    return shell(`<header class="v59b-head"><button type="button" class="v59b-back" data-v59b-route="practice">← Back</button><h1>Pick a topic</h1><p>What would you like to explore?</p></header>${body}`);
  }

  function paperLibrary(){
    try { return ROOT.V55APastPaperPractice?.getPaperLibrary?.() || []; } catch { return []; }
  }

  function renderPaperGroups(rows){
    if (!rows.length) return `<div class="v59b-empty"><p>Loading the available Past Paper Practice library from the existing app…</p><button type="button" class="v59b-button" data-v59b-action="paper-setup">Open Practice setup</button></div>`;
    const groups = new Map();
    rows.forEach(row => {
      const year = Number(row.exam_year || 0);
      if (!year) return;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(row);
    });
    return `<div class="v59b-stack">${[...groups.entries()].sort((a,b)=>b[0]-a[0]).map(([year,papers])=>`<section class="v59b-card"><div class="v59b-card-head"><h2>${year} · Year ${text(document.getElementById('year-level')?.value,'6')}</h2><span class="v59b-pill">Past Paper Practice</span></div><div class="v59b-paper-list">${papers.map(row=>`<button type="button" class="v59b-paper" data-v59b-paper-year="${year}" data-v59b-paper-name="${html(row.paper)}"><span class="v59b-soft-icon">📄</span><span class="v59b-grow"><h3>${html(row.paper)}</h3><p>${Number(row.logical_questions)||0} questions available · ${Number(row.marks)||0} source marks</p></span><span>→</span></button>`).join('')}</div></section>`).join('')}</div>`;
  }

  function renderPapers(){
    return shell(`<header class="v59b-head"><button type="button" class="v59b-back" data-v59b-route="practice">← Back</button><h1>Past Papers</h1><p>Familiar paper choices. Friendly practice.</p></header><div class="v59b-notice">These are the real Past Paper Practice choices already available to this signed-in student. Selecting one continues through the existing V5.8 Practice engine.</div>${renderPaperGroups(paperLibrary())}`);
  }

  function routeMarkup(){
    if (route === 'topics') return renderTopics();
    if (route === 'papers') return renderPapers();
    return renderPractice();
  }

  function wireRoot(root){
    root.querySelectorAll('[data-v59b-route]').forEach(button => button.addEventListener('click', () => show(button.dataset.v59bRoute || 'practice')));
    root.querySelectorAll('[data-v59b-nav]').forEach(button => button.addEventListener('click', () => {
      const destination = button.dataset.v59bNav;
      if (destination === 'practice') show('practice');
      else { closePractice(); window.setTimeout(() => homeAction(destination), 0); }
    }));
    root.querySelectorAll('[data-v59b-action]').forEach(button => button.addEventListener('click', () => act(button.dataset.v59bAction)));
    root.querySelectorAll('[data-v59b-topic]').forEach(button => button.addEventListener('click', () => chooseTopic(button.dataset.v59bTopic)));
    root.querySelectorAll('[data-v59b-paper-year]').forEach(button => button.addEventListener('click', () => choosePaper(button.dataset.v59bPaperYear, button.dataset.v59bPaperName)));
  }

  function render(){
    if (!signedIn()) { closePractice(); return false; }
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      const start = document.getElementById('start');
      if (!start) return false;
      root = document.createElement('section');
      root.id = ROOT_ID;
      root.setAttribute('aria-label','V5.9 Practice preview');
      start.insertAdjacentElement('afterbegin', root);
    }
    root.innerHTML = routeMarkup();
    wireRoot(root);
    document.body.classList.add('v59b-practice-open');
    window.scrollTo({top:0,behavior:'smooth'});
    return true;
  }

  function show(next='practice'){
    route = ['practice','topics','papers'].includes(next) ? next : 'practice';
    if (route === 'papers') {
      try { ROOT.V55APastPaperPractice?.setPracticeType?.('past_paper'); } catch {}
      schedulePaperRefresh(0);
    }
    render();
  }

  function schedulePaperRefresh(attempt){
    if (paperTimer) window.clearTimeout(paperTimer);
    paperTimer = window.setTimeout(() => {
      paperTimer = 0;
      if (route !== 'papers' || !document.body.classList.contains('v59b-practice-open')) return;
      const rows = paperLibrary();
      render();
      if (!rows.length && attempt < 24) schedulePaperRefresh(attempt + 1);
    }, attempt ? 220 : 80);
  }

  function act(action){
    if (action === 'mixed') { closePractice(); window.setTimeout(() => homeAction('mixed'), 0); }
    else if (action === 'assignments') { closePractice(); window.setTimeout(() => homeAction('assignments'), 0); }
    else if (action === 'recommend') { closePractice(); window.setTimeout(() => homeAction('recommend'), 0); }
    else if (action === 'topic-setup') { closePractice(); window.setTimeout(() => homeAction('topic'), 0); }
    else if (action === 'paper-setup') { closePractice(); window.setTimeout(() => homeAction('past_paper'), 0); }
  }

  function chooseTopic(value){
    const select = document.getElementById('topic-filter');
    if (select && [...select.options].some(option => option.value === value)) {
      select.value = value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    try { ROOT.V55APastPaperPractice?.setPracticeType?.('topic',{keepFilters:true}); } catch {}
    closePractice();
    window.setTimeout(() => homeAction('topic'), 0);
  }

  function choosePaper(yearValue,paperName){
    try { ROOT.V55APastPaperPractice?.setPracticeType?.('past_paper'); } catch {}
    const year = document.getElementById('v55a-paper-year');
    if (year) {
      year.value = String(yearValue || '');
      year.dispatchEvent(new Event('change',{bubbles:true}));
    }
    window.setTimeout(() => {
      const paper = document.getElementById('v55a-paper-name');
      if (paper && [...paper.options].some(option => option.value === paperName)) {
        paper.value = paperName;
        paper.dispatchEvent(new Event('change',{bubbles:true}));
      }
      closePractice();
      window.setTimeout(() => homeAction('past_paper'), 0);
    }, 60);
  }

  function captureHomeAction(event){
    if (bypassHomeCapture) return;
    const button = event.target?.closest?.(`#${HOME_ID} [data-v59-action]`);
    if (!button) return;
    const action = button.dataset.v59Action;
    if (!['practice','mixed','topic','past_paper'].includes(action)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    show(action === 'topic' ? 'topics' : action === 'past_paper' ? 'papers' : action === 'mixed' ? 'practice' : 'practice');
  }

  function wire(){
    injectStyles();
    document.addEventListener('click', captureHomeAction, true);
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#v40c-student-logout')) closePractice();
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) closePractice();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
