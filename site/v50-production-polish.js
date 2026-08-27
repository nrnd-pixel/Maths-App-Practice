/* V5.0 — UX & Production Polish.
   Presentation/accessibility only: stable-release branding, production start-screen cleanup,
   reviewed-work wording, teacher-tab ergonomics and live-region polish.
   No grading, auth, Practice/Exam, assignment or student-data mutations. */
(() => {
  'use strict';

  if (window.__v50ProductionPolishInstalled) return;
  window.__v50ProductionPolishInstalled = true;

  const STYLE_ID = 'v50rc3-production-polish-style';
  const TITLE = 'Math Practice V5.0';
  const BADGE = 'Version 5.0 • Stable Release';
  const UPDATE_EVENT = 'v50rc3-production-polish-updated';

  const byId = id => document.getElementById(id);

  function hasPackagedCloudConfig(){
    const config = window.MATH_APP_CONFIG || {};
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(config.supabaseUrl || '').trim())
      && /^sb_publishable_[A-Za-z0-9_-]+$/.test(String(config.supabasePublishableKey || '').trim());
  }

  function isDeployedHost(){
    try {
      return location.protocol === 'https:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
    } catch {
      return false;
    }
  }

  function packagedProduction(){ return hasPackagedCloudConfig() && isDeployedHost(); }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .result-code{overflow-wrap:anywhere;word-break:break-word}
      #student-review .review-lookup,
      #exam-result-code-box,
      #result-code-box{min-width:0}
      #teacher .tabs .tab{min-width:max-content}
      #teacher .header > *,
      #teacher .toolbar,
      #teacher .panel,
      #start .brand > div:last-child{min-width:0}

      @media(max-width:900px){
        #teacher > .tabs{
          flex-wrap:nowrap;
          overflow-x:auto;
          overflow-y:hidden;
          overscroll-behavior-inline:contain;
          scrollbar-width:thin;
          -webkit-overflow-scrolling:touch;
          padding-bottom:3px;
        }
        #teacher > .tabs .tab{
          flex:0 0 auto;
          white-space:nowrap;
        }
      }

      @media(max-width:700px){
        #teacher > .header{
          flex-direction:column;
          align-items:stretch;
        }
        #teacher > .header .toolbar{
          width:100%;
        }
        #teacher > .header .toolbar button{
          flex:1 1 135px;
        }
        #exam-result-code-box,
        #result-code-box{
          align-items:stretch;
          gap:10px;
        }
        #exam-result-code-box button,
        #result-code-box button{
          flex:0 0 auto;
        }
      }

      @media(max-width:430px){
        #teacher > .header .toolbar{
          display:grid;
          grid-template-columns:1fr 1fr;
        }
        #teacher > .header .toolbar button,
        #teacher > .header .toolbar .badge{
          width:100%;
          justify-content:center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyBranding(){
    document.title = TITLE;
    const badge = document.querySelector('#start .brand .badge');
    if (badge) badge.textContent = BADGE;
  }

  function polishProductionSetup(){
    const button = byId('setup-btn');
    if (!button) return;

    if (packagedProduction()){
      button.classList.add('hidden');
      button.setAttribute('aria-hidden','true');
      button.tabIndex = -1;
      button.title = 'Connection settings are packaged with this deployment.';
    } else {
      button.classList.remove('hidden');
      button.removeAttribute('aria-hidden');
      button.removeAttribute('tabindex');
      button.textContent = 'Connection Setup';
    }
  }

  function setText(selector,text){
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  }

  function polishWording(){
    setText('#student-review .header .muted',
      'Use the private result code shown after Practice or Exam work to see teacher feedback and reviewed marks.');
    setText('#result-code-box .help',
      'Treat this code as private. Anyone with the code can view this Practice result.');
    setText('#exam-result-code-box .help',
      'Treat this code as private. Anyone with the code can view this Exam result when it is available for review.');
    setText('#teacher-subtitle','Analytics, assignments, reports and question management');
  }

  function addLiveRegion(node){
    if (!node) return;
    if (!node.hasAttribute('role')) node.setAttribute('role','status');
    if (!node.hasAttribute('aria-live')) node.setAttribute('aria-live','polite');
    node.setAttribute('aria-atomic','true');
  }

  function polishLiveRegions(){
    ['cloud-status','student-access-note','exam-save-status','mode-note'].forEach(id => addLiveRegion(byId(id)));
    document.querySelectorAll('.feedback').forEach(addLiveRegion);
  }

  function teacherTabs(){
    return document.querySelector('#teacher > .tabs');
  }

  function tabItems(){
    return [...(teacherTabs()?.querySelectorAll('.tab[data-panel]') || [])];
  }

  function syncTeacherTabs(){
    const tabs = teacherTabs();
    if (!tabs) return;
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Teacher dashboard sections');

    tabItems().forEach((tab,index) => {
      const panelId = tab.dataset.panel;
      const panel = panelId ? byId(panelId) : null;
      const active = tab.classList.contains('active');
      if (!tab.id) tab.id = `v50rc3-teacher-tab-${String(panelId || index).replace(/[^A-Za-z0-9_-]/g,'-')}`;
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-selected',active ? 'true' : 'false');
      tab.setAttribute('tabindex',active ? '0' : '-1');
      if (panelId) tab.setAttribute('aria-controls',panelId);
      if (panel){
        panel.setAttribute('role','tabpanel');
        panel.setAttribute('aria-labelledby',tab.id);
      }
    });
  }

  function activateAdjacentTab(current,direction){
    const items = tabItems();
    if (!items.length) return;
    const index = Math.max(0,items.indexOf(current));
    let targetIndex = index;
    if (direction === 'first') targetIndex = 0;
    else if (direction === 'last') targetIndex = items.length - 1;
    else targetIndex = (index + direction + items.length) % items.length;
    const target = items[targetIndex];
    target.focus({preventScroll:true});
    target.click();
    target.scrollIntoView({block:'nearest',inline:'nearest'});
  }

  function wireTeacherTabs(){
    const tabs = teacherTabs();
    if (!tabs || tabs.dataset.v50rc3Wired === '1') return;
    tabs.dataset.v50rc3Wired = '1';

    tabs.addEventListener('keydown',event => {
      const tab = event.target.closest?.('.tab[data-panel]');
      if (!tab) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); activateAdjacentTab(tab,1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); activateAdjacentTab(tab,-1); }
      else if (event.key === 'Home') { event.preventDefault(); activateAdjacentTab(tab,'first'); }
      else if (event.key === 'End') { event.preventDefault(); activateAdjacentTab(tab,'last'); }
    });

    tabs.addEventListener('click',event => {
      const tab = event.target.closest?.('.tab[data-panel]');
      if (!tab) return;
      window.setTimeout(() => {
        syncTeacherTabs();
        tab.scrollIntoView({block:'nearest',inline:'nearest'});
      },0);
    });

    new MutationObserver(syncTeacherTabs).observe(tabs,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['class']
    });
  }

  function getAudit(){
    const badge = document.querySelector('#start .brand .badge');
    const setup = byId('setup-btn');
    const reviewLead = document.querySelector('#student-review .header .muted');
    const practicePrivacy = document.querySelector('#result-code-box .help');
    const examPrivacy = document.querySelector('#exam-result-code-box .help');
    const tabs = teacherTabs();
    const items = tabItems();

    const checks = {
      stable_release_branding:
        document.title === TITLE && String(badge?.textContent || '').trim() === BADGE,
      production_setup_control:
        !packagedProduction() || (!!setup && setup.classList.contains('hidden') && setup.getAttribute('aria-hidden') === 'true'),
      reviewed_work_wording:
        /Practice or Exam/.test(String(reviewLead?.textContent || ''))
          && /Treat this code as private/.test(String(practicePrivacy?.textContent || ''))
          && /Treat this code as private/.test(String(examPrivacy?.textContent || '')),
      teacher_tab_accessibility:
        !!tabs && tabs.getAttribute('role') === 'tablist' && items.length > 0
          && items.every(tab => tab.getAttribute('role') === 'tab' && !!tab.getAttribute('aria-controls')),
      responsive_polish: !!byId(STYLE_ID),
      live_status_regions:
        ['cloud-status','student-access-note','exam-save-status'].every(id => byId(id)?.getAttribute('aria-live') === 'polite')
    };

    return Object.freeze({
      phase:'V5.0RC3',
      ready:Object.values(checks).every(Boolean),
      checks:Object.freeze({...checks}),
      packaged_production:packagedProduction()
    });
  }

  function announceAudit(){
    try { window.dispatchEvent(new CustomEvent(UPDATE_EVENT,{detail:getAudit()})); }
    catch {}
  }

  function apply(){
    injectStyles();
    applyBranding();
    polishProductionSetup();
    polishWording();
    polishLiveRegions();
    syncTeacherTabs();
    wireTeacherTabs();
    announceAudit();
  }

  const api = Object.freeze({ refresh:apply, getAudit });
  Object.defineProperty(window,'V50ProductionPolish',{
    value:api,
    writable:false,
    configurable:false
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('load',() => window.setTimeout(apply,0),{once:true});
})();
