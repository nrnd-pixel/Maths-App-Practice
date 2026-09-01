/* V5.4B — Teacher Practice eligibility controls.
   Adds safe Question Bank controls on top of V5.4A visibility:
   - topical resources remain whole-set managed in the Topical Exercise Resource Library;
   - non-topical multipart questions move as one logical group;
   - ordinary non-topical singles may be toggled individually.
   All writes use the teacher-only V5.4B RPC. Legacy active, student Practice and Exam
   behavior are unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54bPracticeEligibilityControlsInstalled) return;
  ROOT.__v54bPracticeEligibilityControlsInstalled = true;

  const FEEDBACK_ID = 'v54b-eligibility-feedback';
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');

  function isTopical(row){ return norm(row?.source_type) === 'topical_exercise'; }
  function isGrouped(row){ return !!nullIfBlank(row?.parent_question_number); }
  function isEligible(row){ return row?.practice_eligible === true; }
  function nullIfBlank(value){ const text=trim(value); return text || null; }

  function controlModel(row){
    if (!row) return Object.freeze({managed:true,disabled:true,grouped:false,eligible:false,target:false,label:'Unavailable'});
    const eligible=isEligible(row);
    const grouped=isGrouped(row);
    if (isTopical(row)){
      return Object.freeze({
        managed:true,
        disabled:true,
        grouped,
        eligible,
        target:eligible,
        label:'Managed by set'
      });
    }
    return Object.freeze({
      managed:false,
      disabled:false,
      grouped,
      eligible,
      target:!eligible,
      label: eligible
        ? (grouped?'Remove group from Practice':'Remove from Practice')
        : (grouped?'Add group to Practice':'Add to Practice')
    });
  }

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function cardQuestionId(card){
    try {
      const fromV54A=ROOT.V54AResourceBankVisibility?.cardQuestionId?.(card);
      if (fromV54A) return String(fromV54A);
    } catch {}
    return String(
      card?.dataset?.v51b2aId
      || card?.querySelector?.('.v51b2a-select')?.dataset?.id
      || card?.querySelector?.('[data-id]')?.dataset?.id
      || ''
    );
  }

  function questionById(id,rows=currentQuestions()){
    return Array.from(rows||[]).find(row=>String(row?.id||'')===String(id||'')) || null;
  }

  function ensureFeedback(){
    if (typeof document==='undefined') return null;
    let root=document.getElementById(FEEDBACK_ID);
    if (root) return root;
    root=document.createElement('div');
    root.id=FEEDBACK_ID;
    root.className='feedback hidden';
    const summary=document.getElementById('v54a-resource-bank-summary');
    const count=document.getElementById('question-bank-count');
    if (summary) summary.insertAdjacentElement('afterend',root);
    else if (count) count.insertAdjacentElement('beforebegin',root);
    return root;
  }

  function setFeedback(kind,message){
    const root=ensureFeedback();
    if (!root) return;
    root.className=`feedback ${kind}`;
    root.textContent=String(message||'');
  }

  function buttonTitle(row,model){
    if (model.managed){
      return 'Topical Practice eligibility is managed for the whole resource set in the Topical Exercise Resource Library.';
    }
    if (model.grouped){
      return model.target
        ? 'Add every part of this multipart logical question to ordinary Practice.'
        : 'Remove every part of this multipart logical question from ordinary Practice.';
    }
    return model.target
      ? 'Add this question to ordinary Practice.'
      : 'Remove this question from ordinary Practice.';
  }

  function decorateCards(rows=currentQuestions()){
    if (typeof document==='undefined') return;
    const byId=new Map(Array.from(rows||[]).map(row=>[String(row?.id||''),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const id=cardQuestionId(card);
      const row=byId.get(id);
      if (!row) return;
      const actions=card.querySelector('.qcard-actions');
      if (!actions) return;
      let button=actions.querySelector('.v54b-practice-toggle');
      if (!button){
        button=document.createElement('button');
        button.type='button';
        button.className='outline v54b-practice-toggle';
        actions.appendChild(button);
      }
      const model=controlModel(row);
      button.dataset.id=id;
      button.dataset.target=model.target?'true':'false';
      button.disabled=model.disabled;
      button.textContent=model.label;
      button.title=buttonTitle(row,model);
      button.setAttribute('aria-label',model.label);
      button.classList.remove('outline','warning','secondary');
      button.classList.add(model.managed?'secondary':model.eligible?'warning':'outline');
    });
  }

  function confirmationText(row,model){
    const identity=[
      row?.question_number?`Q${trim(row.question_number)}`:'this question',
      trim(row?.source)
    ].filter(Boolean).join(' · ');
    if (model.grouped){
      return `${model.target?'Add':'Remove'} this whole multipart question ${model.target?'to':'from'} ordinary Practice?\n\nAll parts will stay together. ${identity}`;
    }
    return `${model.target?'Add':'Remove'} ${identity} ${model.target?'to':'from'} ordinary Practice?`;
  }

  function teacherRpcReady(){
    try { return !!(cloudReady && teacherUser && cloud && typeof cloud.rpc==='function'); }
    catch { return false; }
  }

  async function saveEligibility(row,target){
    if (!row?.id) throw new Error('Question could not be identified.');
    if (isTopical(row)) throw new Error('Topical Practice eligibility is managed for the whole resource set. Use the Topical Exercise Resource Library.');
    if (!teacherRpcReady()) throw new Error('Teacher cloud access is not ready.');
    const {data,error}=await cloud.rpc('save_question_practice_eligibility_v54b',{
      p_question_id:row.id,
      p_eligible:!!target
    });
    if (error) throw error;
    return data||{};
  }

  async function handleToggle(button){
    const row=questionById(button?.dataset?.id);
    if (!row) return;
    const model=controlModel(row);
    if (model.managed || model.disabled) return;
    if (typeof window!=='undefined' && !window.confirm(confirmationText(row,model))) return;

    button.disabled=true;
    const previousText=button.textContent;
    button.textContent='Saving…';
    try {
      const result=await saveEligibility(row,model.target);
      const rows=Math.max(1,Number(result.logical_rows||result.updated_rows||1));
      setFeedback('correct',model.grouped
        ? `${model.target?'Added':'Removed'} the complete multipart question ${model.target?'to':'from'} Practice (${rows} physical part${rows===1?'':'s'} kept together).`
        : `${model.target?'Added':'Removed'} the question ${model.target?'to':'from'} ordinary Practice.`);
      if (typeof loadTeacher==='function') await loadTeacher();
      scheduleDecorate();
    } catch(error){
      console.warn('V5.4B Practice eligibility update failed.',error);
      setFeedback('incorrect',`Practice availability could not be changed. ${error?.message||''}`.trim());
      button.disabled=false;
      button.textContent=previousText;
    }
  }

  function scheduleDecorate(){
    if (typeof window==='undefined') return;
    [0,60,180,500].forEach(delay=>window.setTimeout(()=>{
      ensureFeedback();
      decorateCards();
    },delay));
  }

  function installRenderBridge(){
    try {
      if (typeof renderQuestions!=='function') return false;
      if (ROOT.__v54bPreviousRenderQuestions) return true;
      const previous=renderQuestions;
      ROOT.__v54bPreviousRenderQuestions=previous;
      renderQuestions=function(...args){
        const result=previous.apply(this,args);
        scheduleDecorate();
        return result;
      };
      return true;
    } catch {
      return false;
    }
  }

  function wire(){
    if (typeof document==='undefined') return;
    ensureFeedback();
    installRenderBridge();
    decorateCards();

    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('.v54b-practice-toggle');
      if (button){
        event.preventDefault();
        void handleToggle(button);
        return;
      }
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh,.v53a-eligibility-toggle')) scheduleDecorate();
    });

    document.addEventListener('change',event=>{
      if (event.target?.closest?.('#questions-panel')) scheduleDecorate();
    });

    if (installRenderBridge()) return;
    let tries=0;
    const timer=window.setInterval(()=>{
      tries+=1;
      if (installRenderBridge() || tries>=40){
        window.clearInterval(timer);
        scheduleDecorate();
      }
    },50);
  }

  const api=Object.freeze({
    isTopical,
    isGrouped,
    isEligible,
    controlModel,
    cardQuestionId,
    questionById,
    confirmationText
  });

  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V54BPracticeEligibilityControls',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
