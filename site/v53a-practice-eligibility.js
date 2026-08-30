/* V5.3A — Unified Practice eligibility foundation.
   Teacher-only staging controls for reviewed topical sets. This stage does NOT change
   ordinary student Practice retrieval; V5.3B will consume practice_eligible safely. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53aPracticeEligibilityInstalled) return;
  ROOT.__v53aPracticeEligibilityInstalled = true;

  const state = {byKey:new Map(),loading:false,queued:false,lastLoadedAt:0};
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const setKey = (year,source) => `${Number(year)||0}|${norm(source)}`;
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function normalizeRows(data){
    return (Array.isArray(data)?data:[]).map(item=>({
      ...item,
      year_level:Number(item?.year_level)||0,
      source:trim(item?.source),
      physical_rows:Number(item?.physical_rows)||0,
      logical_questions:Number(item?.logical_questions)||0,
      eligible_rows:Number(item?.eligible_rows)||0,
      reviewed_rows:Number(item?.reviewed_rows)||0,
      active_rows:Number(item?.active_rows)||0,
      all_eligible:item?.all_eligible===true,
      partially_eligible:item?.partially_eligible===true,
      ready:item?.ready===true,
      readiness_reasons:Array.isArray(item?.readiness_reasons)?item.readiness_reasons.map(trim).filter(Boolean):[],
      student_retrieval_live:item?.student_retrieval_live===true
    })).filter(item=>item.year_level>0&&item.source);
  }

  function eligibilityLabel(item){
    if (!item) return 'Eligibility unavailable';
    if (item.all_eligible) return 'Staged for unified Practice';
    if (item.partially_eligible) return 'Mixed eligibility — repair needed';
    if (item.ready) return 'Ready to stage';
    return 'Not ready to stage';
  }

  function canEnable(item){ return !!item && item.ready===true && item.all_eligible!==true; }
  function canDisable(item){ return !!item && (item.all_eligible===true || item.partially_eligible===true); }

  function cardIdentity(card){
    const raw=trim(card?.dataset?.v52bKey);
    if (!raw) return {key:'',year:0,source:''};
    const split=raw.indexOf('|');
    const year=Number(split>=0?raw.slice(0,split):'')||0;
    const source=split>=0?raw.slice(split+1):'';
    return {key:setKey(year,source),year,source};
  }

  function replaceStates(rows){
    state.byKey.clear();
    normalizeRows(rows).forEach(item=>state.byKey.set(setKey(item.year_level,item.source),item));
  }

  function stagingCopy(item){
    if (!item) return 'Eligibility state is loading…';
    if (!item.ready && item.readiness_reasons.length) return item.readiness_reasons.join(' • ');
    if (item.all_eligible) return 'All rows are staged for the future unified Practice pool. V5.3A does not change student retrieval yet.';
    if (item.partially_eligible) return 'This set has mixed row eligibility. Use “Make all eligible” or remove the set from the staged Practice pool.';
    return 'This set is ready to be staged for the future unified Practice pool. Ordinary Practice continues using the existing active-question route until V5.3B.';
  }

  function renderCard(card){
    const identity=cardIdentity(card);
    if (!identity.key) return;
    const item=state.byKey.get(identity.key)||null;
    let root=card.querySelector('.v53a-practice-eligibility');
    if (!root){
      root=document.createElement('div');
      root.className='v53a-practice-eligibility info';
      root.style.marginTop='10px';
      const publication=card.querySelector('.v52c-publication');
      const actions=card.querySelector('.qcard-actions,.toolbar');
      if (publication) publication.insertAdjacentElement('afterend',root);
      else if (actions) actions.insertAdjacentElement('beforebegin',root);
      else card.appendChild(root);
    }

    if (!item){
      root.innerHTML='<strong>V5.3A unified Practice eligibility</strong><br><span class="help">Eligibility state is loading…</span>';
      return;
    }

    let action='';
    if (item.all_eligible){
      action=`<button type="button" class="outline v53a-eligibility-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="false">Remove from Practice pool</button>`;
    } else if (item.partially_eligible){
      action=`<div class="toolbar" style="gap:6px"><button type="button" class="primary v53a-eligibility-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="true" ${item.ready?'':'disabled'}>Make all eligible</button><button type="button" class="outline v53a-eligibility-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="false">Clear eligibility</button></div>`;
    } else {
      action=`<button type="button" class="primary v53a-eligibility-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="true" ${item.ready?'':'disabled'}>Add to Practice pool</button>`;
    }

    root.innerHTML=`
      <div class="header" style="align-items:center;gap:8px">
        <div>
          <strong>V5.3A unified Practice eligibility</strong>
          <div class="pills" style="margin-top:6px">
            <span class="tag">${esc(eligibilityLabel(item))}</span>
            <span class="tag">${esc(item.eligible_rows)}/${esc(item.physical_rows)} rows eligible</span>
            <span class="tag">Student retrieval not live yet</span>
          </div>
        </div>
        ${action}
      </div>
      <div class="help" style="margin-top:7px">${esc(stagingCopy(item))}</div>`;
  }

  function decorate(){
    if (typeof document==='undefined') return;
    document.querySelectorAll('#v52b-cards .v52b-set-card').forEach(renderCard);
  }

  async function loadStates(force=false){
    if (!cloudTeacherReady()||state.loading){ decorate(); return false; }
    if (!force&&Date.now()-state.lastLoadedAt<1000&&state.byKey.size){ decorate(); return true; }
    state.loading=true;
    try{
      const {data,error}=await cloud.rpc('get_topical_practice_eligibility_states_v53a');
      if (error) throw error;
      replaceStates(data||[]);
      state.lastLoadedAt=Date.now();
      decorate();
      return true;
    }catch(error){
      console.warn('V5.3A Practice eligibility states could not be loaded.',error);
      decorate();
      return false;
    }finally{ state.loading=false; }
  }

  async function saveEligibility(year,source,target){
    if (!cloudTeacherReady()) return;
    const item=state.byKey.get(setKey(year,source));
    if (target&&!canEnable(item)){
      window.alert(item?.readiness_reasons?.join('\n')||'This topical set is not ready for the Practice pool.');
      return;
    }
    if (!target&&!canDisable(item)) return;
    const action=target?'Add':'Remove';
    const detail=target
      ? 'This stages the reviewed set for the future unified Practice pool. Ordinary student Practice will NOT use this flag until V5.3B. Topical rows remain inactive.'
      : 'This removes the set from the staged unified Practice pool. It does not delete questions or change Topical Practice publication.';
    if (!window.confirm(`${action} “${source}” ${target?'to':'from'} the unified Practice pool?\n\n${detail}`)) return;
    try{
      const {error}=await cloud.rpc('save_topical_practice_eligibility_v53a',{p_year_level:Number(year),p_source:source,p_eligible:!!target});
      if (error) throw error;
      await loadStates(true);
    }catch(error){
      window.alert(`Could not ${target?'add':'remove'} this set ${target?'to':'from'} the Practice pool. ${error?.message||''}`.trim());
      await loadStates(true);
    }
  }

  function scheduleLoad(force=false){
    if (state.queued) return;
    state.queued=true;
    setTimeout(()=>{state.queued=false;void loadStates(force);},0);
  }

  function wire(){
    if (typeof document==='undefined') return;
    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('.v53a-eligibility-toggle');
      if (button){
        void saveEligibility(Number(button.dataset.year),button.dataset.source||'',button.dataset.target==='true');
        return;
      }
      if (event.target?.closest?.('.tab[data-panel="questions-panel"]')) scheduleLoad(true);
      if (event.target?.closest?.('#v52b-refresh')) scheduleLoad(true);
    });
    const cards=document.getElementById('v52b-cards');
    if (cards&&typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{decorate();if(!state.byKey.size)scheduleLoad(false);}).observe(cards,{childList:true});
    }
    scheduleLoad(false);
  }

  const api=Object.freeze({norm,setKey,normalizeRows,eligibilityLabel,canEnable,canDisable,stagingCopy});
  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V53APracticeEligibility',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true}); else wire();
    }
  }
})();
