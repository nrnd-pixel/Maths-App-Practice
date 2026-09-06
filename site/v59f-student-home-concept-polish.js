/* V5.9F Student Home Concept Polish — test-only presentation layer.
   Loaded only with ?v59-student-home-preview=1. No direct network, Supabase,
   grading or persistence path is introduced. Theme changes delegate to the
   existing V5.8 theme control. */
(() => {
  'use strict';

  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (window.__v59fStudentHomeConceptPolishInstalled) return;
  window.__v59fStudentHomeConceptPolishInstalled = true;

  const HOME_ID = 'v59-student-home-preview';
  const STYLE_ID = 'v59f-student-home-concept-polish-style';
  let timer = 0;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOME_ID} .v59f-theme-toggle{font-size:18px}
      #${HOME_ID} .v59f-theme-toggle[data-theme-mode="dark"]{background:#17233a;color:#ffd76a}
      #${HOME_ID} .v59f-theme-toggle[data-theme-mode="light"]{background:rgba(255,255,255,.82);color:#43557a}
      #${HOME_ID} .v59-main-cta{width:min(260px,100%);font-size:15px}
      #${HOME_ID} .v59-path-icon{box-shadow:0 6px 14px rgba(33,70,128,.16)}
      #${HOME_ID} .v59f-earned{display:inline-flex;margin:6px 0 4px;padding:4px 9px;border-radius:999px;background:#f2ebff;color:#6336bb;font-size:10px;font-weight:900}
      #${HOME_ID} .v59f-mission-complete .v59-mission-stat{font-size:18px;color:#087657;line-height:1.25}
      #${HOME_ID} .v59f-mission-complete .v59-soft-icon{background:#e3f8ee!important;color:#087657!important}
      #${HOME_ID} .v59-challenge .v59-soft-icon{font-size:27px}
      @media(max-width:620px){
        #${HOME_ID} .v59-main-cta{width:100%}
        #${HOME_ID} .v59-tools{gap:2px}
        #${HOME_ID} .v59-iconbtn{width:42px;height:42px}
      }
    `;
    document.head.appendChild(style);
  }

  function effectiveTheme(){
    const explicit = document.documentElement.dataset.theme;
    if (explicit === 'dark' || explicit === 'light') return explicit;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  function updateThemeButton(button){
    if (!button) return;
    const mode = effectiveTheme();
    const next = mode === 'dark' ? 'light' : 'dark';
    button.dataset.themeMode = mode;
    button.textContent = mode === 'dark' ? '☀️' : '🌙';
    button.setAttribute('aria-label', `Switch to ${next} mode`);
    button.setAttribute('title', `Switch to ${next} mode`);
  }

  function toggleTheme(){
    const existing = document.getElementById('theme-toggle');
    if (!existing || existing.disabled) return;
    existing.click();
    window.setTimeout(() => updateThemeButton(document.querySelector(`#${HOME_ID} .v59f-theme-toggle`)), 0);
  }

  function ensureThemeButton(){
    const tools = document.querySelector(`#${HOME_ID} .v59-tools`);
    if (!tools) return;
    let button = tools.querySelector('.v59f-theme-toggle');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'v59-iconbtn v59f-theme-toggle';
      button.addEventListener('click', toggleTheme);
      const settings = tools.querySelector('[data-v59-action="settings"]');
      if (settings) tools.insertBefore(button, settings);
      else tools.appendChild(button);
    }
    updateThemeButton(button);
  }

  function addGreetingWave(){
    const heading = document.querySelector(`#${HOME_ID} .v59-welcome-copy h1`);
    if (!heading) return;
    const value = heading.textContent.trim();
    if (value && !value.includes('👋')) heading.textContent = `${value} 👋`;
  }

  function patchMission(){
    const home = document.getElementById(HOME_ID);
    if (!home) return;
    const cards = [...home.querySelectorAll('.v59-card')];
    const card = cards.find(item => item.querySelector('.v59-card-head h2')?.textContent.trim().toLowerCase() === 'weekly missions');
    if (!card) return;
    const count = card.querySelector('.v59-progress-caption strong')?.textContent || '';
    const match = count.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match || Number(match[2]) <= 0 || Number(match[1]) < Number(match[2])) return;
    card.classList.add('v59f-mission-complete');
    const stat = card.querySelector('.v59-mission-stat');
    if (stat) stat.textContent = '🎉 Weekly Missions Complete!';
    const note = card.querySelector('.v59-note');
    if (note) note.textContent = 'Great work — keep practising to build your streak.';
  }

  function patchBadge(){
    const home = document.getElementById(HOME_ID);
    if (!home) return;
    const cards = [...home.querySelectorAll('.v59-card')];
    const card = cards.find(item => item.querySelector('.v59-card-head h2')?.textContent.trim().toLowerCase() === 'latest badge');
    if (!card) return;
    const copy = card.querySelector('.v59-compact-main');
    const title = copy?.querySelector('h3')?.textContent.trim() || '';
    if (!copy || !title || /waiting|locked|no badge/i.test(title) || copy.querySelector('.v59f-earned')) return;
    const earned = document.createElement('span');
    earned.className = 'v59f-earned';
    earned.textContent = 'You earned this!';
    const description = copy.querySelector('p');
    copy.insertBefore(earned, description || null);
  }

  function patchChallenge(){
    const home = document.getElementById(HOME_ID);
    if (!home) return;
    const cards = [...home.querySelectorAll('.v59-card')];
    const card = cards.find(item => item.querySelector('.v59-card-head h2')?.textContent.trim().toLowerCase() === 'class challenge');
    const icon = card?.querySelector('.v59-soft-icon');
    if (icon) icon.textContent = '🏆';
  }

  function polish(){
    injectStyles();
    ensureThemeButton();
    addGreetingWave();
    patchMission();
    patchBadge();
    patchChallenge();
  }

  function schedule(){
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => { timer = 0; polish(); }, 60);
  }

  function wire(){
    polish();
    window.addEventListener('pageshow', schedule);
    window.addEventListener('v57c:home-updated', schedule);
    window.addEventListener('v572:missions-updated', schedule);
    window.addEventListener('v571b:achievements-updated', schedule);
    window.addEventListener('v573:class-challenge-updated', schedule);
    document.addEventListener('click', event => {
      if (event.target?.closest?.('[data-v59-action="home"],[data-v40-nav="home"],.back-home')) window.setTimeout(schedule, 0);
    }, true);
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });
      const htmlObserver = new MutationObserver(schedule);
      htmlObserver.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once:true });
  else wire();
})();
