/* V5.3C — Two-mode student UI.
   Topical exercise provenance remains teacher-side/resource-bank metadata. Students
   now enter only Practice or Exam; the V5.2C topical route stays loaded as a
   rollback boundary but is suppressed from the student-facing Learn surface. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53cTwoModeStudentUiInstalled) return;
  ROOT.__v53cTwoModeStudentUiInstalled = true;

  const MODE_BUTTON_ID='v52c-topical-mode-btn';
  const LIBRARY_ID='v52c-student-topical-library';
  const STYLE_ID='v53c-two-mode-student-ui-style';
  const RESULT_ID='result';
  const AGAIN_ID='again-btn';

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .mode-switch.v53c-two-modes{grid-template-columns:repeat(2,minmax(0,1fr));max-width:700px}
      #${MODE_BUTTON_ID},#${LIBRARY_ID}{display:none!important}
      @media(max-width:700px){.mode-switch.v53c-two-modes{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function suppressLegacyTopicalUi(){
    if (typeof document==='undefined') return;
    const modeSwitch=document.querySelector('.mode-switch');
    if (modeSwitch){
      modeSwitch.classList.remove('v52c-three-modes');
      modeSwitch.classList.add('v53c-two-modes');
    }

    const topical=document.getElementById(MODE_BUTTON_ID);
    if (topical){
      topical.hidden=true;
      topical.classList.remove('active');
      topical.setAttribute('aria-hidden','true');
      topical.tabIndex=-1;
    }

    const library=document.getElementById(LIBRARY_ID);
    if (library){
      library.hidden=true;
      library.classList.add('hidden');
      library.setAttribute('aria-hidden','true');
    }
  }

  function returnToPractice(){
    const result=document.getElementById(RESULT_ID);
    if (result) result.removeAttribute('data-v52c2-topical-result');

    try { if (typeof show==='function') show('start'); } catch {}
    try { if (typeof setStartMode==='function') setStartMode('practice'); } catch {}

    const practice=document.getElementById('practice-mode-btn');
    if (practice && !practice.classList.contains('active')) practice.click();
    suppressLegacyTopicalUi();
    document.getElementById('start')?.scrollIntoView?.({block:'start'});
  }

  function onWindowCapture(event){
    const target=event.target;
    const topical=target?.closest?.(`#${MODE_BUTTON_ID}`);
    if (topical){
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressLegacyTopicalUi();
      try { if (typeof setStartMode==='function') setStartMode('practice'); } catch {}
      return;
    }

    const again=target?.closest?.(`#${AGAIN_ID}`);
    if (!again) return;
    const result=document.getElementById(RESULT_ID);
    if (result?.dataset.v52c2TopicalResult!=='1') return;

    /* Window capture runs before the legacy V5.2C.2 document-capture handler,
       so an old topical result cannot reopen the hidden third student mode. */
    event.preventDefault();
    event.stopImmediatePropagation();
    returnToPractice();
  }

  function wire(){
    if (typeof document==='undefined') return;
    injectStyles();
    suppressLegacyTopicalUi();
    if (typeof window!=='undefined') window.addEventListener('click',onWindowCapture,true);

    /* One-shot follow-ups cover deferred Learn-shell assembly without adding a
       permanent MutationObserver to the page. CSS already suppresses late mounts. */
    window.setTimeout(suppressLegacyTopicalUi,0);
    window.setTimeout(suppressLegacyTopicalUi,250);
  }

  const api=Object.freeze({MODE_BUTTON_ID,LIBRARY_ID,suppressLegacyTopicalUi});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V53CTwoModeStudentUi',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.3D6 — Resource Bank Status Clarity.
   Presentation-only compatibility layer for the teacher Question Bank.
   V5.3 unified Practice is live through practice_eligible; topical rows remain
   inactive under the separate legacy active flag. No eligibility, retrieval,
   grading, assignment, publication or Exam behaviour is changed here. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d6ResourceBankStatusClarityInstalled) return;
  ROOT.__v53d6ResourceBankStatusClarityInstalled = true;

  const TOPICAL_SOURCE_TYPE = 'topical_exercise';
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const isTopical = row => norm(row?.source_type) === TOPICAL_SOURCE_TYPE;
  const setKey = row => `${Number(row?.year_level)||0}|${norm(row?.source)}`;

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function summarizeAccess(rows=currentQuestions()){
    const topical = Array.from(rows || []).filter(isTopical);
    const groups = new Map();
    topical.forEach(row => {
      const key = setKey(row);
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    });
    const sets = [...groups.entries()].map(([key,list]) => {
      const eligibleRows = list.filter(row => row?.practice_eligible === true).length;
      return Object.freeze({
        key,
        physicalRows:list.length,
        eligibleRows,
        allEligible:list.length > 0 && eligibleRows === list.length,
        partlyEligible:eligibleRows > 0 && eligibleRows < list.length
      });
    });
    return Object.freeze({
      topicalRows:topical.length,
      eligibleRows:topical.filter(row => row?.practice_eligible === true).length,
      sets:Object.freeze(sets),
      fullyEligibleSets:sets.filter(set => set.allEligible).length
    });
  }

  function accessLabel(state){
    if (!state) return 'Practice eligibility unavailable';
    if (state.allEligible) return 'Available in Practice';
    if (state.partlyEligible) return 'Partly available in Practice';
    return 'Not in Practice';
  }

  function accessHelp(state){
    if (!state) return 'Practice eligibility is loading…';
    if (state.allEligible) return 'These reviewed rows are available to normal Practice through Practice eligibility. Their legacy active flag remains off for safety.';
    if (state.partlyEligible) return 'Some rows are available to normal Practice and some are not. Make all rows eligible or clear eligibility to keep this set consistent.';
    return 'This set is not currently available to normal Practice. Add it to the Practice pool when it is ready.';
  }

  function rowsBySet(rows=currentQuestions()){
    const map = new Map();
    Array.from(rows || []).filter(isTopical).forEach(row => {
      const key=setKey(row);
      if (!map.has(key)) map.set(key,[]);
      map.get(key).push(row);
    });
    return map;
  }

  function setStateForCard(card,map){
    const raw=trim(card?.dataset?.v52bKey);
    if (!raw) return null;
    const rows=map.get(raw) || [];
    const eligibleRows=rows.filter(row=>row?.practice_eligible===true).length;
    return {
      key:raw,
      physicalRows:rows.length,
      eligibleRows,
      allEligible:rows.length>0&&eligibleRows===rows.length,
      partlyEligible:eligibleRows>0&&eligibleRows<rows.length
    };
  }

  function replaceText(node,text){
    if (node && node.textContent !== text) node.textContent = text;
  }

  function decorateLibraryHeader(summary){
    const panel=document.getElementById('v52b-topical-library');
    if (!panel) return;
    const header=panel.querySelector(':scope > .header') || panel.querySelector('.header');
    const title=header?.querySelector('strong');
    const help=header?.querySelector('.help');
    replaceText(title,'Topical Exercise Resource Library');
    replaceText(help,'Teacher-only management of topical resource sets. Reviewed questions can be included in the unified Practice resource bank.');

    const summaryRoot=document.getElementById('v52b-summary');
    if (summaryRoot){
      const tags=[...summaryRoot.querySelectorAll('.tag')];
      const staged=tags.find(tag=>/^\d+\s+staged$/i.test(trim(tag.textContent)));
      if (staged) replaceText(staged,`${summary.eligibleRows} Practice eligible`);
    }
  }

  function decorateSetCard(card,state){
    if (!card || !state) return;
    const topPills=card.querySelector('.qcard-head .pills');
    if (topPills){
      const exposure=[...topPills.querySelectorAll('.tag')].find(tag=>norm(tag.textContent)==='student exposure off');
      if (exposure){
        replaceText(exposure,accessLabel(state));
        exposure.classList.toggle('status-active',state.allEligible);
        exposure.classList.toggle('status-inactive',!state.allEligible&&!state.partlyEligible);
        exposure.title='Normal Practice availability is controlled by Practice eligibility, independently of the legacy active flag.';
      }
    }

    const eligibility=card.querySelector('.v53a-practice-eligibility');
    if (eligibility){
      replaceText(eligibility.querySelector('strong'),'Practice resource bank');
      const tags=[...eligibility.querySelectorAll('.pills .tag')];
      if (tags[0]){
        replaceText(tags[0],accessLabel(state));
        tags[0].classList.toggle('status-active',state.allEligible);
      }
      const retrieval=tags.find(tag=>norm(tag.textContent)==='student retrieval not live yet');
      if (retrieval){
        replaceText(retrieval,'Student retrieval live');
        retrieval.classList.add('status-active');
      }
      replaceText(eligibility.querySelector('.help'),accessHelp(state));
    }

    const publication=card.querySelector('.v52c-publication');
    if (publication){
      replaceText(publication.querySelector('strong'),'Legacy Topical route (hidden)');
      const tags=[...publication.querySelectorAll('.pills .tag')];
      tags.forEach(tag=>{
        const text=norm(tag.textContent);
        if (text==='published to students') replaceText(tag,'Legacy route enabled (hidden)');
        else if (text==='ready to publish') replaceText(tag,'Legacy route ready');
        else if (text==='not ready to publish') replaceText(tag,'Legacy route not ready');
        else if (text==='automatically hidden — readiness changed') replaceText(tag,'Legacy route hidden — readiness changed');
      });
      const button=publication.querySelector('.v52c-publish-toggle');
      if (button){
        const text=norm(button.textContent);
        if (text==='unpublish') replaceText(button,'Disable legacy route');
        else if (text==='publish to students') replaceText(button,'Enable legacy route');
      }
      const help=publication.querySelector('.help');
      if (help && /dedicated\s+v5\.2c\s+route/i.test(help.textContent||'')){
        replaceText(help,'Retained only as a rollback boundary. Students use normal Practice; this legacy route is not shown in student navigation.');
      }
    }
  }

  function decorateQuestionCards(rows=currentQuestions()){
    const byId=new Map(Array.from(rows||[]).map(row=>[String(row?.id??''),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const button=card.querySelector('.toggle-q[data-id]');
      if (!button) return;
      const row=byId.get(String(button.dataset.id||''));
      if (!row || !isTopical(row)) return;
      const eligible=row?.practice_eligible===true;
      const meta=card.querySelector('.qcard-meta');
      if (meta){
        let badge=meta.querySelector('.v53d6-practice-eligibility-badge');
        if (!badge){
          badge=document.createElement('span');
          badge.className='tag v53d6-practice-eligibility-badge';
          meta.appendChild(badge);
        }
        replaceText(badge,eligible?'Practice eligible':'Not in Practice');
        badge.classList.toggle('status-active',eligible);
        badge.classList.toggle('status-inactive',!eligible);
        badge.title=eligible
          ? 'Available to normal Practice through Practice eligibility. The legacy active flag remains off.'
          : 'Not currently available to normal Practice.';
      }
      if (row.active===false && button.dataset.v52TopicalLocked==='1'){
        replaceText(button,'Locked inactive');
        button.disabled=true;
        button.title=eligible
          ? 'Legacy active is intentionally locked off. This question is still available through the Practice resource bank.'
          : 'Legacy active is intentionally locked off for topical resource questions.';
        button.setAttribute('aria-label',eligible?'Topical question locked inactive and available in Practice':'Topical question locked inactive and not in Practice');
      }
    });
  }

  function decorate(){
    if (typeof document==='undefined') return;
    const rows=currentQuestions();
    const summary=summarizeAccess(rows);
    const map=rowsBySet(rows);
    decorateLibraryHeader(summary);
    document.querySelectorAll('#v52b-cards .v52b-set-card').forEach(card=>decorateSetCard(card,setStateForCard(card,map)));
    decorateQuestionCards(rows);
  }

  function scheduleBurst(){
    if (typeof window==='undefined') return;
    [0,80,250,700].forEach(delay=>window.setTimeout(decorate,delay));
  }

  function wire(){
    if (typeof document==='undefined') return;
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#questions-panel,#v52b-refresh,.v53a-eligibility-toggle,.v52c-publish-toggle')) scheduleBurst();
    });
    document.addEventListener('change',event=>{
      if (event.target?.closest?.('#questions-panel')) scheduleBurst();
    });
    document.addEventListener('input',event=>{
      if (event.target?.closest?.('#questions-panel')) scheduleBurst();
    });
    scheduleBurst();
  }

  const api=Object.freeze({
    isTopical,
    setKey,
    summarizeAccess,
    accessLabel,
    accessHelp,
    rowsBySet,
    setStateForCard,
    decorate
  });

  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V53D6ResourceBankStatusClarity',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();