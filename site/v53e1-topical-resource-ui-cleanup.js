/* V5.3E1 — Teacher resource-bank status clarity.
   Presentation only: topical sets remain teacher-managed resource sources.
   Students receive eligible rows through ordinary Practice while topical records
   remain inactive by design. Legacy V5.2C publication stays available as rollback
   backend but its obsolete teacher-facing student-publication panel is hidden. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53e1TopicalResourceUiCleanupInstalled) return;
  ROOT.__v53e1TopicalResourceUiCleanupInstalled = true;

  const STYLE_ID = 'v53e1-topical-resource-ui-cleanup-style';
  const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');
  const isTopical = row => norm(row?.source_type) === 'topical_exercise';
  const isPracticeEligible = row => row?.practice_eligible === true;
  const setKey = row => `${Number(row?.year_level)||0}|${norm(row?.source)}`;

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function practiceSetLabel(rows=[]){
    const list = Array.from(rows || []);
    if (!list.length) return 'Resource-bank source';
    const eligible = list.filter(isPracticeEligible).length;
    if (eligible === list.length) return 'Available in Practice';
    if (eligible > 0) return 'Partially in Practice';
    return 'Not in Practice';
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #v52b-topical-library .v52c-publication{display:none!important}
      .v53e1-practice-resource{background:var(--successbg);color:var(--success)}
      .v53e1-not-practice-resource{background:var(--warnbg);color:var(--warn)}
    `;
    document.head.appendChild(style);
  }

  function replaceExactText(root,from,to){
    if (!root) return false;
    const target = norm(from);
    const nodes = root.querySelectorAll('strong,.help,.tag');
    for (const node of nodes){
      if (norm(node.textContent) !== target) continue;
      if (node.textContent !== to) node.textContent = to;
      return true;
    }
    return false;
  }

  function decoratePanel(rows=currentQuestions()){
    const panel = document.getElementById('v52b-topical-library');
    if (!panel) return false;
    const title = panel.querySelector(':scope > .header strong');
    if (title && title.textContent !== 'Topical Exercise Resource Library'){
      title.textContent = 'Topical Exercise Resource Library';
    }
    const help = panel.querySelector(':scope > .header .help');
    const copy = 'Teacher-only resource-set management for imported topical questions. Students access eligible questions through ordinary Practice Mode.';
    if (help && help.textContent !== copy) help.textContent = copy;

    const topical = Array.from(rows || []).filter(isTopical);
    const eligible = topical.filter(isPracticeEligible).length;
    panel.querySelectorAll('#v52b-summary .tag').forEach(tag => {
      if (/^\d+\s+staged$/i.test(String(tag.textContent || '').trim())){
        tag.textContent = `${eligible} Practice eligible`;
      }
    });
    return true;
  }

  function decorateEligibility(card){
    const root = card?.querySelector?.('.v53a-practice-eligibility');
    if (!root) return false;
    const heading = root.querySelector('strong');
    if (heading && heading.textContent !== 'Practice resource bank eligibility'){
      heading.textContent = 'Practice resource bank eligibility';
    }
    replaceExactText(root,'Staged for unified Practice','In Practice resource bank');
    replaceExactText(root,'Ready to stage','Ready for Practice resource bank');
    replaceExactText(root,'Student retrieval not live yet','Live in student Practice');
    const help = root.querySelector('.help');
    if (help){
      const current = norm(help.textContent);
      if (current.includes('future unified practice pool') || current.includes('does not change student retrieval yet')){
        help.textContent = 'Eligible rows can be served through ordinary student Practice while topical rows remain inactive.';
      }
    }
    return true;
  }

  function rowsForSetCard(card,rows=currentQuestions()){
    const key = norm(card?.dataset?.v52bKey);
    if (!key) return [];
    return Array.from(rows || []).filter(row => isTopical(row) && norm(setKey(row)) === key);
  }

  function decorateSetCard(card,rows=currentQuestions()){
    if (!card) return false;
    const setRows = rowsForSetCard(card,rows);
    const headerPills = card.querySelector('.qcard-head .pills');
    if (headerPills){
      [...headerPills.querySelectorAll('.tag')].forEach(tag => {
        if (norm(tag.textContent) !== 'student exposure off') return;
        tag.textContent = practiceSetLabel(setRows);
      });
    }
    decorateEligibility(card);
    return true;
  }

  function questionIdFromCard(card){
    return String(
      card?.dataset?.v51b2aId
      || card?.querySelector?.('.v51b2a-select')?.dataset?.id
      || card?.querySelector?.('[data-id]')?.dataset?.id
      || ''
    );
  }

  function decorateQuestionCards(rows=currentQuestions()){
    if (typeof document === 'undefined') return;
    const byId = new Map(Array.from(rows || []).map(row => [String(row?.id),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card => {
      const row = byId.get(questionIdFromCard(card));
      if (!row || !isTopical(row)) return;
      const meta = card.querySelector('.qcard-meta');
      if (!meta) return;

      const activeTag = meta.querySelector('.status-active,.status-inactive');
      if (activeTag && row.active === false){
        activeTag.textContent = 'Inactive record';
        activeTag.title = 'Record activation is separate from ordinary Practice availability.';
      }

      let resourceTag = meta.querySelector('.v53e1-practice-status');
      if (!resourceTag){
        resourceTag = document.createElement('span');
        resourceTag.className = 'tag v53e1-practice-status';
        if (activeTag) activeTag.insertAdjacentElement('afterend',resourceTag);
        else meta.appendChild(resourceTag);
      }
      const eligible = isPracticeEligible(row);
      resourceTag.className = `tag v53e1-practice-status ${eligible?'v53e1-practice-resource':'v53e1-not-practice-resource'}`;
      resourceTag.textContent = eligible ? 'Practice resource' : 'Not in Practice';
      resourceTag.title = eligible
        ? 'This inactive topical record may be served through ordinary Practice.'
        : 'This topical record is not currently available through ordinary Practice.';

      const lockButton = card.querySelector('.toggle-q[data-active="false"]');
      if (lockButton){
        lockButton.textContent = 'Inactive by design';
        lockButton.title = 'Topical resource records remain inactive by design. Practice availability is controlled separately by the Practice resource bank.';
        lockButton.setAttribute('aria-label','Topical resource inactive by design');
      }
    });
  }

  function decorate(){
    if (typeof document === 'undefined') return;
    injectStyles();
    const rows = currentQuestions();
    decoratePanel(rows);
    document.querySelectorAll('#v52b-cards .v52b-set-card').forEach(card => decorateSetCard(card,rows));
    decorateQuestionCards(rows);
  }

  function scheduleDecorate(delay=0){
    if (typeof window === 'undefined') return;
    window.setTimeout(decorate,Math.max(0,Number(delay)||0));
  }

  function installRenderWrapper(){
    if (ROOT.__v53e1RenderWrapped) return true;
    let previous = null;
    try { previous = typeof renderQuestions === 'function' ? renderQuestions : null; } catch {}
    if (!previous) return false;
    ROOT.__v53e1RenderWrapped = true;
    renderQuestions = function(){
      const result = previous.apply(this,arguments);
      scheduleDecorate(0);
      scheduleDecorate(80);
      return result;
    };
    return true;
  }

  function wire(){
    if (typeof document === 'undefined') return;
    decorate();
    installRenderWrapper();
    const cards = document.getElementById('v52b-cards');
    if (cards && typeof MutationObserver !== 'undefined'){
      new MutationObserver(() => scheduleDecorate(0)).observe(cards,{childList:true});
    }
    document.addEventListener('click',event => {
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh')){
        [0,80,200,500].forEach(scheduleDecorate);
      }
    });
    [80,200,500].forEach(scheduleDecorate);
  }

  const api = Object.freeze({
    norm,isTopical,isPracticeEligible,setKey,practiceSetLabel,
    decoratePanel,decorateEligibility,rowsForSetCard,decorateSetCard,questionIdFromCard
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53E1TopicalResourceUiCleanup',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
