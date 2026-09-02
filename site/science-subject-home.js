/* Science V0.1 preview-only shared subject home.
   This module is deliberately restricted to the Netlify deploy-preview host.
   It turns the signed-in Learning Hub home into a native Mathematics / Science
   subject selector while preserving the existing same-tab student session. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');

  if (!isDeployPreview) return;

  const STORAGE_KEY = 'mathStudentSessionV40';
  const ROOT_ID = 'science-v01-subject-home';
  const STYLE_ID = 'science-v01-subject-home-style';

  function readSession(){
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session?.version !== 1) return null;
      if (!session?.tokens?.practice || !session?.identity?.student_name) return null;
      if (Number(session.expiresAt || 0) <= Date.now()) return null;
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
      #start.science-v01-subject-home-ready[data-v40-start-view="home"] .v40-learning-hub-hero{
        display:none!important;
      }

      #${ROOT_ID}{
        display:none;
        border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));
        border-radius:22px;
        padding:clamp(18px,3vw,27px);
        background:linear-gradient(135deg,
          color-mix(in srgb,var(--soft) 70%,var(--card)),
          var(--card));
      }

      #start[data-v40-start-view="home"] #${ROOT_ID}{
        display:block;
      }

      #${ROOT_ID} .science-v01-subject-kicker{
        color:var(--primary);
        font-size:12px;
        font-weight:900;
        letter-spacing:.07em;
        text-transform:uppercase;
        margin-bottom:6px;
      }

      #${ROOT_ID} h2{
        margin:0 0 7px;
        font-size:clamp(25px,4vw,34px);
        line-height:1.15;
      }

      #${ROOT_ID} .science-v01-subject-intro{
        margin:0;
        color:var(--muted);
        line-height:1.55;
      }

      #${ROOT_ID} .science-v01-subject-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:13px;
        margin-top:20px;
      }

      #${ROOT_ID} .science-v01-subject-card{
        width:100%;
        min-height:168px;
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:14px;
        align-items:start;
        text-align:left;
        padding:18px;
        border:1px solid var(--border);
        border-radius:18px;
        background:var(--card);
        color:var(--text);
        box-shadow:0 8px 22px color-mix(in srgb,var(--primary) 7%,transparent);
        transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;
      }

      #${ROOT_ID} .science-v01-subject-card:hover{
        transform:translateY(-2px);
        border-color:color-mix(in srgb,var(--primary) 52%,var(--border));
        box-shadow:0 12px 28px color-mix(in srgb,var(--primary) 12%,transparent);
      }

      #${ROOT_ID} .science-v01-subject-card:focus-visible{
        outline:3px solid color-mix(in srgb,var(--primary) 32%,transparent);
        outline-offset:3px;
      }

      #${ROOT_ID} .science-v01-subject-icon{
        width:48px;
        height:48px;
        display:grid;
        place-items:center;
        border-radius:15px;
        background:var(--soft);
        font-size:28px;
      }

      #${ROOT_ID} .science-v01-subject-copy{
        min-width:0;
      }

      #${ROOT_ID} .science-v01-subject-name{
        display:flex;
        align-items:center;
        gap:8px;
        flex-wrap:wrap;
        margin-bottom:5px;
        font-size:19px;
        font-weight:900;
      }

      #${ROOT_ID} .science-v01-preview-pill{
        display:inline-flex;
        padding:4px 7px;
        border:1px solid #ead47e;
        border-radius:999px;
        background:#fff7d6;
        color:#735600;
        font-size:10px;
        font-weight:900;
        letter-spacing:.04em;
        text-transform:uppercase;
      }

      #${ROOT_ID} .science-v01-subject-description{
        display:block;
        color:var(--muted);
        font-size:13px;
        line-height:1.5;
      }

      #${ROOT_ID} .science-v01-subject-action{
        display:block;
        margin-top:13px;
        color:var(--primary);
        font-size:13px;
        font-weight:900;
      }

      #${ROOT_ID} .science-v01-preview-note{
        margin:14px 0 0;
        color:var(--muted);
        font-size:11px;
        line-height:1.45;
      }

      @media(max-width:650px){
        #${ROOT_ID} .science-v01-subject-grid{
          grid-template-columns:1fr;
        }

        #${ROOT_ID} .science-v01-subject-card{
          min-height:0;
        }
      }

      @media(max-width:390px){
        #${ROOT_ID} .science-v01-subject-card{
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function makeSubjectCard({ icon, name, description, action, preview = false, onClick }){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'science-v01-subject-card';
    button.setAttribute('aria-label', `${name}. ${action}`);

    const iconWrap = document.createElement('span');
    iconWrap.className = 'science-v01-subject-icon';
    iconWrap.setAttribute('aria-hidden', 'true');
    iconWrap.textContent = icon;

    const copy = document.createElement('span');
    copy.className = 'science-v01-subject-copy';

    const title = document.createElement('span');
    title.className = 'science-v01-subject-name';
    title.textContent = name;

    if (preview) {
      const pill = document.createElement('span');
      pill.className = 'science-v01-preview-pill';
      pill.textContent = 'Preview';
      title.appendChild(pill);
    }

    const descriptionText = document.createElement('span');
    descriptionText.className = 'science-v01-subject-description';
    descriptionText.textContent = description;

    const actionText = document.createElement('span');
    actionText.className = 'science-v01-subject-action';
    actionText.textContent = `${action} →`;

    copy.append(title, descriptionText, actionText);
    button.append(iconWrap, copy);
    button.addEventListener('click', onClick);
    return button;
  }

  function openMathematics(){
    const learnTab = document.querySelector('#start [data-v40-nav="learn"]');
    if (learnTab) {
      learnTab.click();
      return;
    }

    const learnArea = document.querySelector('#start .v40c-learn-setup');
    learnArea?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function buildSubjectHome(session){
    const start = document.getElementById('start');
    const hub = start?.querySelector('.v39-home-hub');
    if (!start || !hub) return;

    let root = document.getElementById(ROOT_ID);
    if (!session) {
      root?.remove();
      start.classList.remove('science-v01-subject-home-ready');
      return;
    }

    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ID;
      root.setAttribute('aria-labelledby', 'science-v01-subject-title');

      const kicker = document.createElement('div');
      kicker.className = 'science-v01-subject-kicker';
      kicker.textContent = 'My learning';

      const heading = document.createElement('h2');
      heading.id = 'science-v01-subject-title';

      const intro = document.createElement('p');
      intro.className = 'science-v01-subject-intro';
      intro.textContent = 'Choose a subject to continue learning.';

      const grid = document.createElement('div');
      grid.className = 'science-v01-subject-grid';
      grid.append(
        makeSubjectCard({
          icon:'🔢',
          name:'Mathematics',
          description:'Practice topics, complete assignments and check your progress.',
          action:'Continue Practice',
          onClick:openMathematics
        }),
        makeSubjectCard({
          icon:'🔬',
          name:'Science',
          description:'Open your published lessons, resources and activities.',
          action:'Continue Learning',
          preview:true,
          onClick:() => location.assign('/science/')
        })
      );

      const note = document.createElement('p');
      note.className = 'science-v01-preview-note';
      note.textContent = 'Science is available only in this development preview. The live Mathematics site is unchanged.';

      root.append(kicker, heading, intro, grid, note);
      const oldHero = hub.querySelector('.v40-learning-hub-hero');
      hub.insertBefore(root, oldHero || hub.firstChild);
    }

    const heading = root.querySelector('h2');
    if (heading) heading.textContent = `Welcome, ${session.identity.student_name}`;
    start.classList.add('science-v01-subject-home-ready');
  }

  function render(){
    injectStyles();
    buildSubjectHome(readSession());
  }

  function watchSession(){
    const panel = document.querySelector('#start .v40c-session-panel');
    if (!panel || panel.dataset.scienceV01SubjectWatch === 'true') return;
    panel.dataset.scienceV01SubjectWatch = 'true';

    new MutationObserver(render).observe(panel, {
      attributes:true,
      attributeFilter:['class']
    });
  }

  function applySubjectHome(){
    render();
    watchSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySubjectHome, { once:true });
  } else {
    applySubjectHome();
  }
})();
