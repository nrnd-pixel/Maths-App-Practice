/* V5.4A — Question Bank Practice eligibility clarity & control.
   Teacher-only presentation/control layer that separates record `active` state from
   ordinary-Practice `practice_eligible` state. No CSV, grading, Exam or activation
   behavior is changed. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54aQuestionBankPracticeEligibilityInstalled) return;
  ROOT.__v54aQuestionBankPracticeEligibilityInstalled = true;

  const FILTER_ID = 'v54a-practice-filter';
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');

  function isTopical(row){ return norm(row?.source_type) === 'topical_exercise'; }
  function isReviewed(row){ return norm(row?.review_status) === 'reviewed'; }
  function isPracticeEligible(row){ return row?.practice_eligible === true; }
  function canEnableQuestion(row){ return !!row && (!isTopical(row) || isReviewed(row)); }
  function practiceLabel(row){ return isPracticeEligible(row) ? 'In Practice' : 'Not in Practice'; }

  function practiceFilterMatch(row,mode='all'){
    const value = norm(mode || 'all');
    if (value === 'eligible') return isPracticeEligible(row);
    if (value === 'ineligible') return !isPracticeEligible(row);
    return true;
  }

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function teacherCloudReady(){
    try { return !!(cloudReady && teacherUser && cloud && typeof cloud.rpc === 'function'); } catch { return false; }
  }

  function currentFilter(){
    if (typeof document === 'undefined') return 'all';
    return document.getElementById(FILTER_ID)?.value || 'all';
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById('v54a-question-bank-style')) return;
    const style=document.createElement('style');
    style.id='v54a-question-bank-style';
    style.textContent=`
      .v54a-practice-yes{background:var(--successbg);color:var(--success)}
      .v54a-practice-no{background:#f2f4f7;color:#475467}
      .v54a-practice-toggle[disabled]{opacity:.6;cursor:not-allowed}
      #v54a-practice-filter-wrap .help{display:block;margin-top:2px}
      @media(min-width:761px){#questions-panel .filtergrid{grid-template-columns:2fr repeat(6,minmax(120px,1fr))}}
      @media(max-width:760px){#questions-panel .filtergrid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePracticeFilter(){
    if (typeof document === 'undefined') return null;
    let select=document.getElementById(FILTER_ID);
    if (select) return select;
    const status=document.getElementById('question-status');
    const statusLabel=status?.closest?.('label');
    if (!statusLabel) return null;
    const label=document.createElement('label');
    label.id='v54a-practice-filter-wrap';
    label.innerHTML=`Practice availability
      <select id="${FILTER_ID}">
        <option value="all">All Practice states</option>
        <option value="eligible">In Practice</option>
        <option value="ineligible">Not in Practice</option>
      </select>`;
    statusLabel.insertAdjacentElement('afterend',label);
    select=label.querySelector('select');
    select?.addEventListener('change',()=>{
      try { if (typeof renderQuestions === 'function') renderQuestions(); } catch {}
    });
    return select;
  }

  function clarifyEditorStatus(){
    if (typeof document === 'undefined') return;
    const select=document.getElementById('qe-active');
    const label=select?.closest?.('label');
    if (!select || !label) return;
    const textNode=[...label.childNodes].find(node=>node.nodeType===3 && trim(node.nodeValue));
    if (textNode && trim(textNode.nodeValue) !== 'Record status') textNode.nodeValue='Record status';
    if (select.options?.[0]) select.options[0].textContent='Active record';
    if (select.options?.[1]) select.options[1].textContent='Inactive record';
    if (!label.querySelector('.v54a-active-help')){
      const help=document.createElement('span');
      help.className='help v54a-active-help';
      help.textContent='Record status is separate from Practice availability. Use “Add to Practice” / “Remove from Practice” in the Question Bank. Topical resources remain inactive even when they are available in Practice.';
      label.appendChild(help);
    }
  }

  function rowForCard(card,rows=currentQuestions()){
    const id=card?.querySelector?.('[data-id]')?.dataset?.id;
    if (!id) return null;
    return Array.from(rows || []).find(row=>String(row?.id)===String(id)) || null;
  }

  function decorateCard(card,rows=currentQuestions()){
    const row=rowForCard(card,rows);
    if (!row) return;
    const meta=card.querySelector('.qcard-meta');
    const actions=card.querySelector('.qcard-actions');
    if (!meta || !actions) return;

    const activeTag=meta.querySelector('.status-active,.status-inactive');
    if (activeTag){
      const desired=row.active===false?'Inactive record':'Active record';
      if (activeTag.textContent !== desired) activeTag.textContent=desired;
      activeTag.title='Record activation state. Ordinary Practice availability is shown separately.';
    }

    let practiceTag=meta.querySelector('.v54a-practice-tag');
    if (!practiceTag){
      practiceTag=document.createElement('span');
      practiceTag.className='tag v54a-practice-tag';
      activeTag?.insertAdjacentElement('afterend',practiceTag) || meta.appendChild(practiceTag);
    }
    const eligible=isPracticeEligible(row);
    practiceTag.className=`tag v54a-practice-tag ${eligible?'v54a-practice-yes':'v54a-practice-no'}`;
    practiceTag.textContent=practiceLabel(row);
    practiceTag.title=eligible
      ? 'This question may be served through ordinary Practice.'
      : 'This question is stored in the resource bank but is not currently served through ordinary Practice.';

    let button=actions.querySelector('.v54a-practice-toggle');
    if (!button){
      button=document.createElement('button');
      button.type='button';
      button.className='outline v54a-practice-toggle';
      actions.appendChild(button);
    }
    button.dataset.id=String(row.id);
    button.dataset.target=eligible?'false':'true';
    button.disabled=!eligible && !canEnableQuestion(row);
    button.textContent=eligible?'Remove from Practice':button.disabled?'Review before Practice':'Add to Practice';
    button.title=button.disabled
      ? 'Topical exercise questions must be Reviewed before they can be added to Practice.'
      : eligible
        ? 'Keep the question in the resource bank but stop serving it in ordinary Practice.'
        : 'Allow this question to be served in ordinary Practice.';
  }

  function decorateCards(){
    if (typeof document === 'undefined') return;
    const rows=currentQuestions();
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>decorateCard(card,rows));
  }

  function scheduleDecorate(){
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame?.(()=>{
      decorateCards();
      clarifyEditorStatus();
    });
  }

  function updateFilteredCount(renderResult,allCount,mode){
    if (typeof document === 'undefined' || mode === 'all') return;
    const focus=document.getElementById('v52b-focus');
    if (focus && !focus.classList.contains('hidden')) return;
    const page=renderResult?.page;
    if (!page) return;
    const label=mode==='eligible'?'In Practice':'Not in Practice';
    const count=document.getElementById('question-bank-count');
    if (!count) return;
    if (page.renderAll){
      count.textContent=`Showing all ${page.total} matching questions · ${allCount} loaded · ${label}`;
    } else if (!page.total){
      count.textContent=`Showing 0 matching questions · ${allCount} loaded · ${label}`;
    } else {
      count.textContent=`Showing ${page.start}–${page.end} of ${page.total} matching questions · ${allCount} loaded · ${label}`;
    }
  }

  function installRenderWrapper(){
    if (typeof document === 'undefined' || ROOT.__v54aQuestionBankRenderWrapped) return true;
    let previous=null;
    try { previous=typeof renderQuestions === 'function' ? renderQuestions : null; } catch {}
    if (!previous) return false;
    ROOT.__v54aQuestionBankRenderWrapped=true;

    renderQuestions=function(){
      const mode=currentFilter();
      const allRows=currentQuestions();
      let result;
      let original=null;
      let swapped=false;
      try{
        if (mode !== 'all' && typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)){
          original=teacherQuestions;
          teacherQuestions=allRows.filter(row=>practiceFilterMatch(row,mode));
          swapped=true;
        }
        result=previous.apply(ROOT,arguments);
      } finally {
        if (swapped) teacherQuestions=original;
      }
      scheduleDecorate();
      if (mode !== 'all'){
        const refresh=()=>updateFilteredCount(result,allRows.length,mode);
        ROOT.requestAnimationFrame?.(()=>ROOT.requestAnimationFrame?.(()=>ROOT.requestAnimationFrame?.(refresh)));
      }
      return result;
    };
    return true;
  }

  function refreshTopicalCopy(){
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.v53a-practice-eligibility').forEach(root=>{
      const strong=root.querySelector('strong');
      if (strong && /v5\.3a unified practice eligibility/i.test(strong.textContent||'')){
        strong.textContent='Practice resource bank eligibility';
      }
      root.querySelectorAll('.tag').forEach(tag=>{
        const text=trim(tag.textContent);
        if (text === 'Student retrieval not live yet') tag.textContent='Live in student Practice';
        if (text === 'Staged for unified Practice') tag.textContent='In Practice resource bank';
        if (text === 'Mixed eligibility — repair needed') tag.textContent='Partially in Practice';
        if (text === 'Ready to stage') tag.textContent='Ready for Practice';
        if (text === 'Not ready to stage') tag.textContent='Not ready for Practice';
      });
      const help=root.querySelector('.help');
      if (help && /(future unified Practice|does not change student retrieval|until V5\.3B)/i.test(help.textContent||'')){
        help.textContent='Practice eligibility is live. Eligible rows can be served through ordinary student Practice while topical resource rows remain inactive.';
      }
    });
  }

  function scheduleTopicalCopy(){
    if (typeof window === 'undefined') return;
    [0,100,250,500,900,1500].forEach(delay=>window.setTimeout(refreshTopicalCopy,delay));
  }

  async function saveQuestionEligibility(id,target){
    const rows=currentQuestions();
    const row=rows.find(item=>String(item?.id)===String(id));
    if (!row || !teacherCloudReady()) return;
    if (target && !canEnableQuestion(row)){
      window.alert('Topical exercise questions must be Reviewed before they can be added to Practice.');
      return;
    }
    const action=target?'Add this question to ordinary Practice?':'Remove this question from ordinary Practice?';
    const detail=target
      ? 'This changes Practice availability only. It does not activate or publish the question.'
      : 'The question stays in the resource bank and its record status is unchanged.';
    if (!window.confirm(`${action}\n\n${detail}`)) return;
    try{
      const {data,error}=await cloud.rpc('save_question_practice_eligibility_v54a',{
        p_question_id:id,
        p_eligible:!!target
      });
      if (error) throw error;
      row.practice_eligible=data?.practice_eligible===true;
      try { if (typeof renderQuestions === 'function') renderQuestions(); } catch {}
      scheduleTopicalCopy();
    }catch(error){
      window.alert(`Could not update Practice availability. ${error?.message||''}`.trim());
    }
  }

  function wire(){
    if (typeof document === 'undefined') return;
    injectStyles();
    ensurePracticeFilter();
    clarifyEditorStatus();
    if (!installRenderWrapper()){
      let tries=0;
      const timer=window.setInterval(()=>{
        tries+=1;
        if (installRenderWrapper() || tries>=60) window.clearInterval(timer);
      },50);
    }

    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('.v54a-practice-toggle');
      if (button){
        event.preventDefault();
        event.stopPropagation();
        void saveQuestionEligibility(button.dataset.id||'',button.dataset.target==='true');
        return;
      }
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh')){
        ensurePracticeFilter();
        scheduleDecorate();
        scheduleTopicalCopy();
      }
      if (event.target?.closest?.('.edit-q,#add-question')){
        window.setTimeout(clarifyEditorStatus,0);
      }
    },true);

    scheduleDecorate();
    scheduleTopicalCopy();
  }

  const api=Object.freeze({
    isTopical,isReviewed,isPracticeEligible,canEnableQuestion,practiceLabel,practiceFilterMatch
  });

  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54AQuestionBankPracticeEligibility',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
