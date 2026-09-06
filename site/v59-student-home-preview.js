/* V5.9 Student Home Preview — presentation-only integration experiment.
   Loaded only when ?v59-student-home-preview=1 is present.
   Reuses the accepted V5.8 student session, Continue Learning, gamification,
   assignment and progress UI as its source of truth. This module performs no
   Supabase calls and adds no persistence or data-write path of its own. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (ROOT.__v59StudentHomePreviewInstalled) return;
  ROOT.__v59StudentHomePreviewInstalled = true;

  const STYLE_ID = 'v59-student-home-preview-style';
  const SHELL_ID = 'v59-student-home-preview';
  const BANNER_ID = 'v59-student-home-preview-banner';
  let timer = 0;
  let observer = null;
  let suspended = false;
  let rendering = false;
  let lastSignature = '';

  const text = (node, fallback = '') => String(node?.textContent || fallback).replace(/\s+/g, ' ').trim();
  const html = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const number = value => Math.max(0, Math.round(Number(value) || 0));

  function markNoIndex(){
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex,nofollow';
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[data-v59-student-home-preview="true"] body{background:#f4f8ff}
      #${BANNER_ID}{position:sticky;top:0;z-index:9998;margin:-1px -1px 14px;padding:9px 14px;background:#fff7d8;border:1px solid #f2d46b;border-radius:14px;color:#6e5510;font-size:11px;font-weight:850;line-height:1.35;text-align:center}
      body.v59-preview-home-ready #start>.v40-student-nav,
      body.v59-preview-home-ready #start .v40-learning-hub-hero,
      body.v59-preview-home-ready #start .v40c3-home-dashboard,
      body.v59-preview-home-ready #start .v40c-session-panel.v40c-authenticated{display:none!important}
      #${SHELL_ID}[hidden]{display:none!important}
      #${SHELL_ID}{--v59-ink:#17264b;--v59-muted:#61708a;--v59-line:#e2eaf5;--v59-blue:#2163d9;--v59-purple:#6840d8;--v59-green:#119270;color:var(--v59-ink);font-family:ui-rounded,"Trebuchet MS",Inter,system-ui,sans-serif;display:grid;gap:17px;padding:2px 0 88px}
      #${SHELL_ID} *{box-sizing:border-box}
      #${SHELL_ID} button{font:inherit}
      #${SHELL_ID} .v59-top{display:flex;align-items:center;gap:12px;padding:10px 2px 2px}
      #${SHELL_ID} .v59-avatar{width:58px;height:58px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,#2468de,#154db9);color:#fff;font-size:22px;font-weight:950;box-shadow:0 6px 18px rgba(32,91,196,.2);flex:none}
      #${SHELL_ID} .v59-welcome{min-width:0;flex:1}
      #${SHELL_ID} .v59-welcome h1{margin:0;font-size:clamp(24px,5vw,32px);line-height:1.12;letter-spacing:-.035em}
      #${SHELL_ID} .v59-welcome p{margin:4px 0 0;color:var(--v59-muted);font-size:12px}
      #${SHELL_ID} .v59-logout{min-width:44px;min-height:44px;padding:8px 10px;border:1px solid var(--v59-line);border-radius:14px;background:#fff;color:#42526d;font-weight:850}
      #${SHELL_ID} .v59-level{display:grid;grid-template-columns:auto 1fr auto;gap:9px 12px;align-items:center;background:#fff;border:1px solid var(--v59-line);border-radius:20px;padding:14px 16px;box-shadow:0 7px 22px rgba(28,61,110,.06)}
      #${SHELL_ID} .v59-level strong{font-size:13px}
      #${SHELL_ID} .v59-level .v59-xp{font-size:12px;color:var(--v59-muted);font-weight:850;text-align:right}
      #${SHELL_ID} .v59-track{grid-column:1/-1;height:9px;border-radius:999px;background:#e7edf7;overflow:hidden}
      #${SHELL_ID} .v59-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#13a588,#22c39b)}
      #${SHELL_ID} .v59-streak{font-size:11px;font-weight:900;color:#b45c10;background:#fff4e2;border-radius:999px;padding:5px 9px;white-space:nowrap}
      #${SHELL_ID} .v59-hero{position:relative;overflow:hidden;border-radius:25px;padding:22px;background:linear-gradient(125deg,#5b30cb,#7a55e3);color:#fff;box-shadow:0 10px 26px rgba(87,51,181,.22);min-height:215px;display:flex;align-items:center}
      #${SHELL_ID} .v59-hero:after{content:'÷  ×  +';position:absolute;right:-18px;top:20px;width:145px;font-size:41px;line-height:1.55;font-weight:950;color:rgba(255,255,255,.13);transform:rotate(-11deg);white-space:pre-wrap}
      #${SHELL_ID} .v59-hero-copy{position:relative;z-index:1;max-width:76%}
      #${SHELL_ID} .v59-kicker{font-size:10px;font-weight:950;letter-spacing:.09em;text-transform:uppercase;opacity:.8;margin-bottom:6px}
      #${SHELL_ID} .v59-hero h2{margin:0;font-size:clamp(22px,5vw,30px);line-height:1.15;letter-spacing:-.025em}
      #${SHELL_ID} .v59-hero p{margin:9px 0 0;color:#f1edff;font-size:12px;line-height:1.5}
      #${SHELL_ID} .v59-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
      #${SHELL_ID} .v59-meta span{font-size:10px;font-weight:850;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
      #${SHELL_ID} .v59-main-cta{margin-top:16px;min-height:48px;padding:11px 16px;border:0;border-radius:14px;background:#fff;color:#4d28aa;font-weight:950}
      #${SHELL_ID} .v59-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:2px 1px 9px}
      #${SHELL_ID} .v59-section-head h2{margin:0;font-size:18px}
      #${SHELL_ID} .v59-section-head span{font-size:11px;color:var(--v59-muted)}
      #${SHELL_ID} .v59-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #${SHELL_ID} .v59-tile{min-height:133px;padding:14px 12px;border:0;border-radius:20px;text-align:left;font-weight:900;color:#1e3259;display:flex;flex-direction:column;gap:9px}
      #${SHELL_ID} .v59-tile:nth-child(1){background:#d8f5e8}#${SHELL_ID} .v59-tile:nth-child(2){background:#ddecff}#${SHELL_ID} .v59-tile:nth-child(3){background:#fff0cb}
      #${SHELL_ID} .v59-tile-icon{width:43px;height:43px;border-radius:14px;background:rgba(255,255,255,.7);display:grid;place-items:center;font-size:21px}
      #${SHELL_ID} .v59-tile small{margin-top:auto;color:#5b6980;font-size:10px;line-height:1.35;font-weight:750}
      #${SHELL_ID} .v59-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #${SHELL_ID} .v59-card{background:#fff;border:1px solid var(--v59-line);border-radius:20px;padding:16px;box-shadow:0 5px 18px rgba(26,55,99,.05);min-width:0}
      #${SHELL_ID} .v59-card h3{margin:0 0 6px;font-size:15px;line-height:1.3}
      #${SHELL_ID} .v59-card p{margin:0;color:var(--v59-muted);font-size:11px;line-height:1.48}
      #${SHELL_ID} .v59-card .v59-card-kicker{font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;color:#51617c;margin-bottom:5px}
      #${SHELL_ID} .v59-card button{margin-top:12px;min-height:40px;padding:8px 11px;border:0;border-radius:12px;background:#eef3ff;color:#2856ad;font-size:11px;font-weight:900}
      #${SHELL_ID} .v59-achievement{background:linear-gradient(125deg,#f9f5ff,#fff);border-color:#eadfff}
      #${SHELL_ID} .v59-missions{grid-column:1/-1}
      #${SHELL_ID} .v59-mission-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--v59-line)}
      #${SHELL_ID} .v59-mission-row:first-of-type{border-top:0}
      #${SHELL_ID} .v59-mission-icon{width:34px;height:34px;border-radius:11px;background:#f0efff;display:grid;place-items:center;flex:none}
      #${SHELL_ID} .v59-mission-main{min-width:0;flex:1}
      #${SHELL_ID} .v59-mission-main strong{display:block;font-size:11px}
      #${SHELL_ID} .v59-mission-main span{display:block;color:var(--v59-muted);font-size:9px;margin-top:2px}
      #${SHELL_ID} .v59-bottom{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9997;width:min(560px,calc(100% - 20px));display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:7px;background:rgba(255,255,255,.96);border:1px solid var(--v59-line);border-radius:19px;box-shadow:0 14px 42px rgba(25,54,100,.18);backdrop-filter:blur(10px)}
      #${SHELL_ID} .v59-bottom button{min-height:48px;border:0;border-radius:13px;background:transparent;color:#5c6b83;font-size:10px;font-weight:900;display:grid;place-items:center;gap:1px}
      #${SHELL_ID} .v59-bottom button span{font-size:19px;line-height:1}
      #${SHELL_ID} .v59-bottom button:first-child{background:#edf3ff;color:#235ac2}
      @media(max-width:620px){#${SHELL_ID}{gap:14px}#${SHELL_ID} .v59-hero-copy{max-width:84%}#${SHELL_ID} .v59-grid{grid-template-columns:1fr}#${SHELL_ID} .v59-missions{grid-column:auto}#${SHELL_ID} .v59-quick{gap:8px}#${SHELL_ID} .v59-tile{min-height:124px;padding:12px 10px;font-size:12px}}
      @media(max-width:390px){#${SHELL_ID} .v59-top{align-items:flex-start}#${SHELL_ID} .v59-avatar{width:52px;height:52px}#${SHELL_ID} .v59-quick{grid-template-columns:1fr 1fr}#${SHELL_ID} .v59-tile:last-child{grid-column:1/-1;min-height:92px}#${SHELL_ID} .v59-level{grid-template-columns:1fr auto}#${SHELL_ID} .v59-streak{grid-column:1/-1;justify-self:start}}
      @media(prefers-reduced-motion:reduce){#${SHELL_ID} *{scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function signedIn(){
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function studentAccess(){
    try {
      const access = typeof activeStudentAccess !== 'undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (access) return access;
    } catch {}
    const identity = document.querySelector('#start .v40c-session-identity-text');
    const strong = text(identity?.querySelector('strong')).replace(/^✓\s*Signed in as\s*/i, '');
    return { student_name: strong || 'Student' };
  }

  function progressPercent(){
    const bar = document.querySelector('#v571a-gamification-card .v571a-progress');
    const aria = Number(bar?.getAttribute('aria-valuenow'));
    return Number.isFinite(aria) ? Math.max(0, Math.min(100, aria)) : 0;
  }

  function miniCards(){
    return [...document.querySelectorAll('#start .v57c-mini-card')];
  }

  function readModel(){
    const access = studentAccess();
    const xpCard = document.getElementById('v571a-gamification-card');
    const continueCard = document.querySelector('#start .v57c-continue-card');
    const minis = miniCards();
    const achievement = document.getElementById('v571b-latest-achievement');
    const missions = document.getElementById('v572-weekly-missions-card');
    const missionRows = [...(missions?.querySelectorAll('.v572-mission') || [])].slice(0, 3);
    const levelTitle = text(xpCard?.querySelector('.v571a-level-title'), 'Maths Learner');
    const xpLabel = text(xpCard?.querySelector('.v571a-xp-label'), '0 XP');
    const streak = text(xpCard?.querySelector('.v571b-streak-chip'), '🔥 Build a streak');
    return {
      name: String(access?.student_name || access?.studentName || 'Student').trim() || 'Student',
      year: number(access?.year_level || access?.yearLevel || document.getElementById('year-level')?.value || 6),
      className: String(access?.class_name || access?.className || document.getElementById('class-group')?.value || '').trim(),
      levelTitle,
      xpLabel,
      levelProgress: progressPercent(),
      streak,
      continueKind: String(continueCard?.dataset?.v57cKind || 'learn'),
      continueTitle: text(continueCard?.querySelector('h2'), 'Choose your next Maths activity'),
      continueText: text(continueCard?.querySelector('p'), 'Continue learning with your existing V5.8 Practice tools.'),
      continueMeta: [...(continueCard?.querySelectorAll('.v57c-meta span') || [])].map(node => text(node)).filter(Boolean).slice(0, 3),
      assignmentTitle: text(minis[0]?.querySelector('strong'), 'My Assignments'),
      assignmentText: text(minis[0]?.querySelector('p'), 'Check teacher-assigned Practice.'),
      recommendationTitle: text(minis[1]?.querySelector('strong'), 'Recommended Practice'),
      recommendationText: text(minis[1]?.querySelector('p'), 'Your next recommendation will appear here.'),
      recentTitle: text(minis[2]?.querySelector('strong'), 'Recent Practice'),
      recentText: [text(minis[2]?.querySelector('.v57c-recent-metrics')), text(minis[2]?.querySelector('p'))].filter(Boolean).join(' · ') || 'Your recent Practice progress will appear here.',
      achievementTitle: text(achievement?.querySelector('h3'), 'Your first badge is waiting'),
      achievementText: text(achievement?.querySelector('p'), 'Complete Practice to unlock achievements.'),
      achievementMeta: text(achievement?.querySelector('.v571b-achievement-meta'), ''),
      missionsTitle: text(missions?.querySelector('.v572-mission-head h3'), "This Week's Missions"),
      missionsMeta: text(missions?.querySelector('.v572-overall'), ''),
      missions: missionRows.map(row => ({
        icon: text(row.querySelector('.v572-mission-icon'), '⭐'),
        title: text(row.querySelector('.v572-mission-title strong'), 'Weekly Mission'),
        progress: text(row.querySelector('.v572-progress-text'), '')
      }))
    };
  }

  function modelSignature(model){
    return JSON.stringify(model);
  }

  function initials(name){
    return String(name || 'Student').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'S';
  }

  function delegate(selector){
    const target = document.querySelector(selector);
    if (!target || target.disabled || target.classList.contains('hidden')) return false;
    target.click();
    return true;
  }

  function suspendPreview(){
    suspended = true;
    document.documentElement.dataset.v59StudentHomePreviewState = 'handoff';
    document.body.classList.remove('v59-preview-home-ready');
    const shell = document.getElementById(SHELL_ID);
    if (shell) shell.hidden = true;
  }

  function resumePreview(){
    suspended = false;
    lastSignature = '';
    document.documentElement.dataset.v59StudentHomePreviewState = 'home';
    const shell = document.getElementById(SHELL_ID);
    if (shell) shell.hidden = false;
    schedule();
  }

  function handoff(work){
    suspendPreview();
    let ok = false;
    try { ok = work() !== false; } catch { ok = false; }
    if (!ok) resumePreview();
    return ok;
  }

  function openLearn(){
    if (delegate('#start .v57c-learn')) return true;
    return delegate('[data-v40-nav="learn"]');
  }

  function runAction(action){
    if (action === 'home') {
      window.scrollTo({top:0, behavior:'smooth'});
      return;
    }
    if (action === 'badges') {
      document.querySelector(`#${SHELL_ID} .v59-achievement`)?.scrollIntoView?.({behavior:'smooth', block:'center'});
      return;
    }
    if (action === 'continue') handoff(() => delegate('#start .v57c-primary'));
    else if (action === 'assignments') handoff(() => delegate('#start .v57c-assignments') || delegate('#my-assignments-btn'));
    else if (action === 'progress') handoff(() => delegate('#start .v57c-progress') || delegate('#my-progress-btn'));
    else if (action === 'learn') handoff(openLearn);
    else if (action === 'recommend') handoff(() => delegate('#start .v57c-recommend') || openLearn());
    else if (action === 'recent') handoff(() => delegate('#start .v57c-result') || delegate('#start .v57c-progress') || delegate('#my-progress-btn'));
    else if (action === 'logout') handoff(() => delegate('#v40c-student-logout'));
  }

  function render(){
    const start = document.getElementById('start');
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!start || suspended) return false;

    if (!signedIn()) {
      document.body.classList.remove('v59-preview-home-ready');
      document.getElementById(SHELL_ID)?.remove();
      lastSignature = '';
      return false;
    }

    if (!dashboard?.querySelector('.v57c-continue-card')) return false;
    const model = readModel();
    const signature = modelSignature(model);
    let shell = document.getElementById(SHELL_ID);
    if (!shell) {
      shell = document.createElement('section');
      shell.id = SHELL_ID;
      shell.setAttribute('aria-label', 'V5.9 student home preview');
      dashboard.insertAdjacentElement('beforebegin', shell);
    }

    if (lastSignature === signature && shell.innerHTML.trim()) {
      shell.hidden = false;
      document.body.classList.add('v59-preview-home-ready');
      return true;
    }

    const classLine = [model.year ? `Year ${model.year}` : '', model.className ? `Class ${model.className}` : ''].filter(Boolean).join(' · ');
    const meta = model.continueMeta.length ? model.continueMeta : ['Uses your existing V5.8 learning data'];
    const missionMarkup = model.missions.length
      ? model.missions.map(mission => `<div class="v59-mission-row"><div class="v59-mission-icon">${html(mission.icon)}</div><div class="v59-mission-main"><strong>${html(mission.title)}</strong><span>${html(mission.progress || 'Keep going')}</span></div></div>`).join('')
      : '<p>Your weekly missions are loading from the existing V5.8 gamification system.</p>';

    rendering = true;
    try {
      shell.innerHTML = `
        <div class="v59-top">
          <div class="v59-avatar" aria-hidden="true">${html(initials(model.name))}</div>
          <div class="v59-welcome"><h1>Hello, ${html(model.name)}!</h1><p>${html(classLine || 'Signed in student')} · V5.9 preview</p></div>
          <button type="button" class="v59-logout" data-v59-action="logout" aria-label="Sign out">↪</button>
        </div>

        <div class="v59-level">
          <strong>${html(model.levelTitle)}</strong>
          <span class="v59-streak">${html(model.streak)}</span>
          <span class="v59-xp">${html(model.xpLabel)}</span>
          <div class="v59-track" role="progressbar" aria-label="XP progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${model.levelProgress}"><span style="width:${model.levelProgress}%"></span></div>
        </div>

        <article class="v59-hero">
          <div class="v59-hero-copy">
            <div class="v59-kicker">Continue Learning</div>
            <h2>${html(model.continueTitle)}</h2>
            <p>${html(model.continueText)}</p>
            <div class="v59-meta">${meta.map(item => `<span>${html(item)}</span>`).join('')}</div>
            <button type="button" class="v59-main-cta" data-v59-action="continue">Continue</button>
          </div>
        </article>

        <section>
          <div class="v59-section-head"><h2>Choose Practice</h2><span>Existing V5.8 engine</span></div>
          <div class="v59-quick">
            <button type="button" class="v59-tile" data-v59-action="learn"><span class="v59-tile-icon">✏️</span>Practice<small>Mixed, Topic and Past Paper Practice</small></button>
            <button type="button" class="v59-tile" data-v59-action="progress"><span class="v59-tile-icon">📈</span>Progress<small>Open your existing learning dashboard</small></button>
            <button type="button" class="v59-tile" data-v59-action="assignments"><span class="v59-tile-icon">📚</span>Assignments<small>Teacher-assigned Practice</small></button>
          </div>
        </section>

        <div class="v59-grid">
          <article class="v59-card"><div class="v59-card-kicker">Teacher work</div><h3>${html(model.assignmentTitle)}</h3><p>${html(model.assignmentText)}</p><button type="button" data-v59-action="assignments">My Assignments</button></article>
          <article class="v59-card"><div class="v59-card-kicker">Recommended next</div><h3>${html(model.recommendationTitle)}</h3><p>${html(model.recommendationText)}</p><button type="button" data-v59-action="recommend">Open Recommendation</button></article>
          <article class="v59-card"><div class="v59-card-kicker">Recent Practice</div><h3>${html(model.recentTitle)}</h3><p>${html(model.recentText)}</p><button type="button" data-v59-action="recent">View Progress</button></article>
          <article class="v59-card v59-achievement"><div class="v59-card-kicker">Latest Achievement</div><h3>${html(model.achievementTitle)}</h3><p>${html(model.achievementText)}</p>${model.achievementMeta ? `<p style="margin-top:7px;font-weight:800">${html(model.achievementMeta)}</p>` : ''}<button type="button" data-v59-action="badges">Achievements</button></article>
          <article class="v59-card v59-missions"><div class="v59-card-kicker">Weekly Missions</div><h3>${html(model.missionsTitle)}${model.missionsMeta ? ` · ${html(model.missionsMeta)}` : ''}</h3>${missionMarkup}</article>
        </div>

        <nav class="v59-bottom" aria-label="V5.9 student preview navigation">
          <button type="button" data-v59-action="home"><span>🏠</span>Home</button>
          <button type="button" data-v59-action="learn"><span>✏️</span>Practice</button>
          <button type="button" data-v59-action="progress"><span>📊</span>Progress</button>
          <button type="button" data-v59-action="badges"><span>🏅</span>Badges</button>
        </nav>`;

      shell.querySelectorAll('[data-v59-action]').forEach(button => {
        button.addEventListener('click', () => runAction(button.dataset.v59Action));
      });
      lastSignature = signature;
      shell.hidden = false;
      document.body.classList.add('v59-preview-home-ready');
      return true;
    } finally {
      rendering = false;
    }
  }

  function banner(){
    const start = document.getElementById('start');
    if (!start || document.getElementById(BANNER_ID)) return;
    const bar = document.createElement('div');
    bar.id = BANNER_ID;
    bar.textContent = 'V5.9 STUDENT HOME PREVIEW · Real signed-in V5.8 data · Existing V5.8 actions · Not production';
    start.insertAdjacentElement('afterbegin', bar);
  }

  function schedule(attempt = 0){
    if (suspended) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      if (suspended) return;
      banner();
      const ok = render();
      if (!ok && !suspended && attempt < 40) schedule(attempt + 1);
    }, attempt ? 180 : 40);
  }

  function previewNode(node){
    if (!node) return false;
    const element = node.nodeType === 1 ? node : node.parentElement;
    return !!element?.closest?.(`#${SHELL_ID},#${BANNER_ID}`);
  }

  function previewOnlyMutation(mutation){
    if (previewNode(mutation.target)) return true;
    const changed = [...mutation.addedNodes, ...mutation.removedNodes];
    return changed.length > 0 && changed.every(previewNode);
  }

  function watch(){
    if (observer || typeof MutationObserver === 'undefined') return;
    const start = document.getElementById('start');
    if (!start) return;
    observer = new MutationObserver(mutations => {
      if (rendering || suspended) return;
      if (mutations.every(previewOnlyMutation)) return;
      schedule();
    });
    observer.observe(start, {subtree:true, childList:true, attributes:true, attributeFilter:['class','data-v57c-rendered','data-xp','data-level']});
  }

  function wire(){
    document.documentElement.dataset.v59StudentHomePreview = 'true';
    document.documentElement.dataset.v59StudentHomePreviewState = 'home';
    markNoIndex();
    injectStyles();
    banner();
    watch();
    ['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated'].forEach(name => window.addEventListener(name, () => schedule()));
    window.addEventListener('pageshow', () => schedule());
    document.addEventListener('click', event => {
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) {
        window.setTimeout(resumePreview, 0);
      }
      if (event.target?.closest?.('#v40c-student-logout') && !event.target?.closest?.(`#${SHELL_ID}`)) {
        suspendPreview();
      }
    }, true);
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();
})();