/* Platform V0.1 — preview-only subject-aware Learning Hub home.
   Shows only subjects currently allowed by the teacher-controlled platform rules. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const ROOT_ID = 'platform-v01-subject-home';
  const STYLE_ID = 'platform-v01-subject-home-style';
  const EXPIRY_SAFETY_MS = 15 * 1000;

  function readSession(){
    try {
      const raw = sessionStorage.getItem(PLATFORM_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (
        session?.version !== 1 ||
        !session?.token ||
        !session?.identity?.student_name ||
        Number(session?.expiresAt || 0) <= Date.now() + EXPIRY_SAFETY_MS
      ) return null;
      return session;
    } catch {
      return null;
    }
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start.platform-v01-subject-home-ready[data-v40-start-view="home"] .v40-learning-hub-hero{display:none!important}
      #${ROOT_ID}{display:none;border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));border-radius:22px;padding:clamp(18px,3vw,27px);background:linear-gradient(135deg,color-mix(in srgb,var(--soft) 70%,var(--card)),var(--card))}
      #start[data-v40-start-view="home"] #${ROOT_ID}{display:block}
      #${ROOT_ID} .platform-v01-kicker{color:var(--primary);font-size:12px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px}
      #${ROOT_ID} h2{margin:0 0 7px;font-size:clamp(25px,4vw,34px);line-height:1.15}
      #${ROOT_ID} .platform-v01-intro{margin:0;color:var(--muted);line-height:1.55}
      #${ROOT_ID} .platform-v01-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:20px}
      #${ROOT_ID} .platform-v01-card{width:100%;min-height:168px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start;text-align:left;padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--card);color:var(--text);box-shadow:0 8px 22px color-mix(in srgb,var(--primary) 7%,transparent);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
      #${ROOT_ID} .platform-v01-card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--primary) 52%,var(--border));box-shadow:0 12px 28px color-mix(in srgb,var(--primary) 12%,transparent)}
      #${ROOT_ID} .platform-v01-card:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 32%,transparent);outline-offset:3px}
      #${ROOT_ID} .platform-v01-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:var(--soft);font-size:28px}
      #${ROOT_ID} .platform-v01-copy{min-width:0}
      #${ROOT_ID} .platform-v01-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;font-size:19px;font-weight:900}
      #${ROOT_ID} .platform-v01-preview{display:inline-flex;padding:4px 7px;border:1px solid #ead47e;border-radius:999px;background:#fff7d6;color:#735600;font-size:10px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
      #${ROOT_ID} .platform-v01-description{display:block;color:var(--muted);font-size:13px;line-height:1.5}
      #${ROOT_ID} .platform-v01-action{display:block;margin-top:13px;color:var(--primary);font-size:13px;font-weight:900}
      #${ROOT_ID} .platform-v01-note{margin:14px 0 0;color:var(--muted);font-size:11px;line-height:1.45}
      #${ROOT_ID} .platform-v01-empty{grid-column:1/-1;border:1px dashed var(--border);border-radius:16px;padding:18px;background:var(--card);color:var(--muted);line-height:1.5}
      @media(max-width:650px){#${ROOT_ID} .platform-v01-grid{grid-template-columns:1fr}#${ROOT_ID} .platform-v01-card{min-height:0}}
      @media(max-width:390px){#${ROOT_ID} .platform-v01-card{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function openMathematics(){
    const learnTab = document.querySelector('#start [data-v40-nav="learn"]');
    if (learnTab) {
      learnTab.click();
      return;
    }
    document.querySelector('#start .v40c-learn-setup')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function makeCard({ subject, icon, name, description, action, preview, href, onClick }){
    const card = document.createElement(href ? 'a' : 'button');
    if (href) card.href = href;
    else card.type = 'button';
    card.className = 'platform-v01-card';
    card.dataset.subject = subject;
    card.setAttribute('aria-label', `${name}. ${action}`);

    const iconWrap = document.createElement('span');
    iconWrap.className = 'platform-v01-icon';
    iconWrap.setAttribute('aria-hidden','true');
    iconWrap.textContent = icon;

    const copy = document.createElement('span');
    copy.className = 'platform-v01-copy';

    const title = document.createElement('span');
    title.className = 'platform-v01-name';
    title.textContent = name;
    if (preview) {
      const pill = document.createElement('span');
      pill.className = 'platform-v01-preview';
      pill.textContent = 'Preview';
      title.appendChild(pill);
    }

    const descriptionText = document.createElement('span');
    descriptionText.className = 'platform-v01-description';
    descriptionText.textContent = description;

    const actionText = document.createElement('span');
    actionText.className = 'platform-v01-action';
    actionText.textContent = `${action} →`;

    copy.append(title,descriptionText,actionText);
    card.append(iconWrap,copy);
    if (onClick) card.addEventListener('click',onClick);
    return card;
  }

  function ensureRoot(){
    const start = document.getElementById('start');
    const hub = start?.querySelector('.v39-home-hub');
    if (!start || !hub) return null;

    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ID;
      root.setAttribute('aria-labelledby','platform-v01-subject-title');
      const oldPreviewRoot = document.getElementById('science-v01-subject-home');
      oldPreviewRoot?.remove();
      const oldHero = hub.querySelector('.v40-learning-hub-hero');
      hub.insertBefore(root,oldHero || hub.firstChild);
    }
    return root;
  }

  function render(){
    injectStyles();
    const start = document.getElementById('start');
    const session = readSession();
    const root = ensureRoot();
    if (!start || !root) return;

    if (!session) {
      root.innerHTML = '';
      start.classList.remove('platform-v01-subject-home-ready');
      return;
    }

    const maths = session.subjects?.maths?.allowed === true;
    const science = session.subjects?.science?.allowed === true;

    root.innerHTML = '';
    const kicker = document.createElement('div');
    kicker.className = 'platform-v01-kicker';
    kicker.textContent = 'My learning';

    const heading = document.createElement('h2');
    heading.id = 'platform-v01-subject-title';
    heading.textContent = `Welcome, ${session.identity.student_name}`;

    const intro = document.createElement('p');
    intro.className = 'platform-v01-intro';
    intro.textContent = 'Choose a subject to continue learning.';

    const grid = document.createElement('div');
    grid.className = 'platform-v01-grid';

    if (maths) {
      grid.appendChild(makeCard({
        subject:'maths',icon:'🔢',name:'Mathematics',
        description:'Practice topics, complete assignments and check your progress.',
        action:'Continue Practice',preview:false,onClick:openMathematics
      }));
    }

    if (science) {
      grid.appendChild(makeCard({
        subject:'science',icon:'🔬',name:'Science',
        description:'Open your published lessons, resources and activities.',
        action:'Continue Learning',preview:true,href:'/science/'
      }));
    }

    if (!maths && !science) {
      const empty = document.createElement('div');
      empty.className = 'platform-v01-empty';
      empty.textContent = 'No subjects are currently enabled for this account. Please ask your teacher if you think this needs changing.';
      grid.appendChild(empty);
    }

    const note = document.createElement('p');
    note.className = 'platform-v01-note';
    note.textContent = 'Subject access is controlled by your teacher. Science remains available only in this development preview.';

    root.append(kicker,heading,intro,grid,note);
    start.classList.add('platform-v01-subject-home-ready');
  }

  function apply(){
    injectStyles();
    render();
  }

  window.addEventListener('platformsubjectaccesschange',render);
  window.platformSubjectHomeV01 = { render };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  } else {
    apply();
  }
})();
