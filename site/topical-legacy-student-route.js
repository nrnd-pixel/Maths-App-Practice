/* Phase 4 — V52C legacy Topical Practice consolidated owner.
   Preserves the accepted V5.2C publication → student library → V5.2C.1 mount hotfix
   → hint bridge → V5.2C.2 result UX sequence exactly. */

/* V5.2C — Teacher Topical Exercise publication controls.
   Adds a set-level publication gate to the existing V5.2B Topical Exercise Library.
   Publication is controlled only through guarded teacher RPCs; questions remain inactive. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52cTopicalPublicationInstalled) return;
  ROOT.__v52cTopicalPublicationInstalled = true;

  const state = {byKey:new Map(),loading:false,queued:false,lastLoadedAt:0};
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const setKey = (year,source) => `${Number(year)||0}|${norm(source)}`;
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function publicationStateLabel(item){
    if (!item) return 'Publication status unavailable';
    if (item.is_available === true && item.ready === true) return 'Published to students';
    if (item.is_available === true) return 'Automatically hidden — readiness changed';
    if (item.ready === true) return 'Ready to publish';
    return 'Not ready to publish';
  }

  function canPublish(item){ return !!item && item.ready === true && item.is_available !== true; }
  function canUnpublish(item){ return !!item && item.is_available === true; }

  function reasons(item){
    return Array.isArray(item?.reasons) ? item.reasons.map(trim).filter(Boolean) : [];
  }

  function normalizeRows(data){
    const rows = Array.isArray(data) ? data : [];
    return rows.map(item => ({
      ...item,
      year_level:Number(item?.year_level)||0,
      source:trim(item?.source),
      ready:item?.ready === true,
      is_available:item?.is_available === true,
      reasons:reasons(item)
    }));
  }

  function replaceStates(rows){
    state.byKey.clear();
    normalizeRows(rows).forEach(item => state.byKey.set(setKey(item.year_level,item.source),item));
  }

  function cardIdentity(card){
    const raw = trim(card?.dataset?.v52bKey);
    if (!raw) return {key:'',year:0,source:''};
    const split = raw.indexOf('|');
    const year = Number(split >= 0 ? raw.slice(0,split) : '') || 0;
    const source = split >= 0 ? raw.slice(split+1) : '';
    return {key:setKey(year,source),year,source};
  }

  function statusClass(item){
    if (item?.is_available && item?.ready) return 'status-active';
    if (item?.ready) return '';
    return 'status-inactive';
  }

  function renderCard(card){
    const identity = cardIdentity(card);
    if (!identity.key) return;
    const item = state.byKey.get(identity.key) || null;
    let root = card.querySelector('.v52c-publication');
    if (!root){
      root = document.createElement('div');
      root.className = 'v52c-publication info';
      root.style.marginTop = '10px';
      const actions = card.querySelector('.qcard-actions,.toolbar');
      if (actions) actions.insertAdjacentElement('beforebegin',root); else card.appendChild(root);
    }

    if (!item){
      root.innerHTML = '<strong>V5.2C student publication</strong><br><span class="help">Publication readiness is loading…</span>';
      return;
    }

    const blockers = reasons(item);
    const reviewed = Math.max(0,Number(item.physical_rows||0)-Number(item.review_blockers||0));
    const button = item.is_available
      ? `<button type="button" class="outline v52c-publish-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="false">Unpublish</button>`
      : `<button type="button" class="primary v52c-publish-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="true" ${item.ready?'':'disabled'}>Publish to students</button>`;
    root.innerHTML = `
      <div class="header" style="align-items:center;gap:8px">
        <div>
          <strong>V5.2C student publication</strong>
          <div class="pills" style="margin-top:6px">
            <span class="tag ${statusClass(item)}">${esc(publicationStateLabel(item))}</span>
            <span class="tag">${esc(reviewed)}/${esc(item.physical_rows||0)} reviewed</span>
          </div>
        </div>
        ${button}
      </div>
      <div class="help" style="margin-top:7px">${blockers.length ? esc(blockers.join(' • ')) : 'All publication readiness checks passed. Topical question rows remain inactive; student access uses the dedicated V5.2C route.'}</div>`;
  }

  function decorate(){
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#v52b-cards .v52b-set-card').forEach(renderCard);
  }

  async function loadStates(force=false){
    if (!cloudTeacherReady() || state.loading) { decorate(); return false; }
    if (!force && Date.now()-state.lastLoadedAt < 1000 && state.byKey.size){ decorate(); return true; }
    state.loading=true;
    try{
      const {data,error}=await cloud.rpc('get_topical_exercise_publication_states_v52c');
      if (error) throw error;
      replaceStates(data || []);
      state.lastLoadedAt=Date.now();
      decorate();
      return true;
    }catch(error){
      console.warn('V5.2C topical publication states could not be loaded.',error);
      decorate();
      return false;
    }finally{ state.loading=false; }
  }

  async function saveSetting(year,source,target){
    if (!cloudTeacherReady()) return;
    const item=state.byKey.get(setKey(year,source));
    if (target && !canPublish(item)){
      window.alert(reasons(item).join('\n') || 'This topical set is not ready to publish.');
      return;
    }
    const action=target?'Publish':'Unpublish';
    if (!window.confirm(`${action} “${source}” for Year ${year}?\n\nTopical question rows will remain inactive. Student access is controlled only by the dedicated V5.2C publication setting.`)) return;
    try{
      const {data,error}=await cloud.rpc('save_topical_exercise_setting_v52c',{p_year_level:Number(year),p_source:source,p_is_available:!!target});
      if (error) throw error;
      const normalized=normalizeRows([data])[0];
      if (normalized) state.byKey.set(setKey(normalized.year_level,normalized.source),normalized);
      decorate();
    }catch(error){
      window.alert(`Could not ${target?'publish':'unpublish'} this topical set. ${error?.message||''}`.trim());
      await loadStates(true);
    }
  }

  function scheduleLoad(force=false){
    if (state.queued) return;
    state.queued=true;
    setTimeout(()=>{ state.queued=false; loadStates(force); },0);
  }

  function wire(){
    if (typeof document === 'undefined') return;
    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('.v52c-publish-toggle');
      if (button){
        saveSetting(Number(button.dataset.year),button.dataset.source||'',button.dataset.target==='true');
        return;
      }
      const tab=event.target?.closest?.('.tab[data-panel="questions-panel"]');
      if (tab) scheduleLoad(true);
      if (event.target?.closest?.('#v52b-refresh')) scheduleLoad(true);
    });

    const cards=document.getElementById('v52b-cards');
    if (cards && typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{ decorate(); if (!state.byKey.size) scheduleLoad(false); }).observe(cards,{childList:true});
    }
    scheduleLoad(false);
  }

  const api=Object.freeze({norm,setKey,publicationStateLabel,canPublish,canUnpublish,normalizeRows,reasons});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52CTopicalPublication',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true}); else wire();
    }
  }
})();

/* V5.2C — Student Topical Practice Library.
   Adds a third student start mode over a dedicated published-set RPC path. Topical
   questions remain inactive and never use the ordinary Practice retrieval/grading route. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52cStudentTopicalLibraryInstalled) return;
  ROOT.__v52cStudentTopicalLibraryInstalled = true;

  const MODE_BUTTON_ID='v52c-topical-mode-btn';
  const LIBRARY_ID='v52c-student-topical-library';
  const STYLE_ID='v52c-student-topical-style';
  const localState={active:false,sets:[],selectedSource:'',loading:false,loadSeq:0};
  const trim=value=>String(value??'').trim();
  const norm=value=>trim(value).toLowerCase().replace(/\s+/g,' ');
  const html=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const setKey=(year,source)=>`${Number(year)||0}|${norm(source)}`;

  function normalizeSetRows(rows){
    return (Array.isArray(rows)?rows:[]).map(row=>({
      source:trim(row?.source),
      logical_questions:Number(row?.logical_questions)||0,
      physical_rows:Number(row?.physical_rows)||0,
      total_marks:Number(row?.total_marks)||0,
      image_rows:Number(row?.image_rows)||0,
      manual_rows:Number(row?.manual_rows)||0
    })).filter(row=>row.source&&row.logical_questions>0);
  }

  function injectStyles(){
    if (typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .mode-switch.v52c-three-modes{grid-template-columns:repeat(3,minmax(0,1fr));max-width:900px}
      #${LIBRARY_ID}{margin:18px 0 0}
      #${LIBRARY_ID}.hidden{display:none!important}
      #${LIBRARY_ID} .v52c-set-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
      #${LIBRARY_ID} .v52c-set-card{width:100%;text-align:left;background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;display:grid;gap:8px;color:var(--text)}
      #${LIBRARY_ID} .v52c-set-card.selected{border-color:var(--primary);background:var(--soft);box-shadow:0 0 0 1px var(--primary)}
      #${LIBRARY_ID} .v52c-set-title{font-size:16px;font-weight:850;line-height:1.35}
      #${LIBRARY_ID} .v52c-set-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
      @media(max-width:700px){.mode-switch.v52c-three-modes{grid-template-columns:1fr}#${LIBRARY_ID} .v52c-set-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureModeButton(){
    if (typeof document==='undefined') return null;
    let button=document.getElementById(MODE_BUTTON_ID);
    if (button) return button;
    const modeSwitch=document.querySelector('.mode-switch');
    if (!modeSwitch) return null;
    modeSwitch.classList.add('v52c-three-modes');
    button=document.createElement('button');
    button.id=MODE_BUTTON_ID;
    button.className='mode-btn';
    button.type='button';
    button.innerHTML='<strong>🎯 Topical Practice</strong><span>Choose a teacher-published exercise set and practise with hints and feedback.</span>';
    modeSwitch.appendChild(button);
    return button;
  }

  function ensureLibrary(){
    if (typeof document==='undefined') return null;
    let root=document.getElementById(LIBRARY_ID);
    if (root) return root;
    const buttons=document.getElementById('start-btn')?.closest('.buttons');
    if (!buttons) return null;
    root=document.createElement('section');
    root.id=LIBRARY_ID;
    root.className='info hidden';
    root.setAttribute('aria-label','Available topical exercise sets');
    buttons.insertAdjacentElement('beforebegin',root);
    return root;
  }

  function currentYear(){
    return Number(document.getElementById('year-level')?.value||6);
  }

  function selectedSet(){
    return localState.sets.find(item=>norm(item.source)===norm(localState.selectedSource))||null;
  }

  function renderLibrary(){
    if (typeof document==='undefined') return;
    const root=ensureLibrary();
    if (!root) return;
    root.classList.toggle('hidden',!localState.active);
    if (!localState.active) return;
    const year=currentYear();
    if (localState.loading){
      root.innerHTML='<strong>Topical Practice</strong><br><span class="help">Loading teacher-published exercise sets…</span>';
      return;
    }
    if (!localState.sets.length){
      root.innerHTML=`<strong>Topical Practice · Year ${html(year)}</strong><br><span class="help">No teacher-published topical exercises are available for this year yet.</span>`;
      return;
    }
    root.innerHTML=`
      <div class="header" style="align-items:center;gap:10px">
        <div><strong>Choose a topical exercise · Year ${html(year)}</strong><div class="help">Only teacher-reviewed, published sets are shown.</div></div>
        <span class="tag">${html(localState.sets.length)} available</span>
      </div>
      <div class="v52c-set-grid">
        ${localState.sets.map(item=>{
          const chosen=norm(item.source)===norm(localState.selectedSource);
          return `<button type="button" class="v52c-set-card${chosen?' selected':''}" data-source="${html(item.source)}" aria-pressed="${chosen?'true':'false'}">
            <span class="v52c-set-top"><span class="v52c-set-title">${html(item.source)}</span><span class="tag">${chosen?'✓ Selected':'Choose'}</span></span>
            <span class="pills"><span class="tag">${html(item.logical_questions)} questions</span><span class="tag">${html(item.total_marks)} marks</span><span class="tag">${html(item.image_rows)} images</span>${item.manual_rows?`<span class="tag">${html(item.manual_rows)} teacher-review responses</span>`:''}</span>
          </button>`;
        }).join('')}
      </div>`;
    root.querySelectorAll('.v52c-set-card').forEach(button=>button.addEventListener('click',()=>{
      localState.selectedSource=button.dataset.source||'';
      renderLibrary();
      syncModeUi();
    }));
  }

  async function loadAvailableSets(force=false){
    if (!localState.active&&!force) return [];
    if (localState.loading) return localState.sets;
    const seq=++localState.loadSeq;
    localState.loading=true;
    renderLibrary();
    try{
      if (typeof cloudReady==='undefined'||!cloudReady||typeof cloud==='undefined'||!cloud){
        localState.sets=[];localState.selectedSource='';return [];
      }
      const {data,error}=await cloud.rpc('get_available_topical_exercise_sets_v52c',{p_year_level:currentYear()});
      if (error) throw error;
      if (seq!==localState.loadSeq) return localState.sets;
      localState.sets=normalizeSetRows(data||[]);
      if (!localState.sets.some(item=>norm(item.source)===norm(localState.selectedSource))) localState.selectedSource='';
      return localState.sets;
    }catch(error){
      console.warn('V5.2C topical set library could not be loaded.',error);
      if (seq===localState.loadSeq){localState.sets=[];localState.selectedSource='';}
      return [];
    }finally{
      if (seq===localState.loadSeq){localState.loading=false;renderLibrary();syncModeUi();}
    }
  }

  function hideForTopical(id){
    const node=document.getElementById(id);
    if (!node) return;
    if (!node.classList.contains('hidden')) node.dataset.v52cHidden='1';
    node.classList.add('hidden');
  }

  function restoreTopicalHides(){
    document.querySelectorAll('[data-v52c-hidden="1"]').forEach(node=>{
      node.classList.remove('hidden');
      delete node.dataset.v52cHidden;
    });
  }

  function syncModeUi(){
    if (typeof document==='undefined') return;
    const topical=document.getElementById(MODE_BUTTON_ID);
    const practice=document.getElementById('practice-mode-btn');
    const exam=document.getElementById('exam-mode-btn');
    topical?.classList.toggle('active',localState.active);
    if (localState.active){
      practice?.classList.remove('active');
      exam?.classList.remove('active');
      hideForTopical('practice-strand-wrap');
      hideForTopical('practice-topic-wrap');
      hideForTopical('practice-difficulty-wrap');
      document.getElementById('practice-count-wrap')?.classList.remove('hidden');
      if (document.getElementById('start-btn')) document.getElementById('start-btn').textContent='Start Topical Practice';
      if (document.getElementById('mode-note')) document.getElementById('mode-note').textContent=localState.selectedSource
        ? `Topical Practice is selected: ${localState.selectedSource}.`
        : 'Topical Practice is selected. Choose a teacher-published set below.';
    }
    renderLibrary();
  }

  async function activateTopicalMode(){
    try { if (typeof setStartMode==='function') setStartMode('practice'); } catch {}
    restoreTopicalHides();
    localState.active=true;
    localState.selectedSource='';
    syncModeUi();
    await loadAvailableSets(true);
  }

  function leaveTopicalMode(){
    if (!localState.active) return;
    localState.active=false;
    localState.selectedSource='';
    localState.sets=[];
    restoreTopicalHides();
    document.getElementById(MODE_BUTTON_ID)?.classList.remove('active');
    document.getElementById(LIBRARY_ID)?.classList.add('hidden');
  }

  async function startTopicalPractice(){
    const item=selectedSet();
    if (!item){ window.alert('Choose a topical exercise set first.'); return; }
    if (typeof cloudReady==='undefined'||!cloudReady){ window.alert('Topical Practice requires the cloud connection.'); return; }
    const selectedYear=currentYear();
    let access=null;
    try{
      access=await validateStudentAccess('practice');
      if (!access) return;
      activeStudentAccess=access;
      if (Number(access.year_level)!==selectedYear){
        localState.selectedSource='';
        await loadAvailableSets(true);
        activeStudentAccess=null;
        window.alert(`Your registered roster is Year ${access.year_level}. Choose an available topical exercise for that year, then start again.`);
        return;
      }
      const token=access.access_token||'';
      const source=item.source;
      const {error:bindError}=await cloud.rpc('bind_student_topical_access_v52c',{p_access_token:token,p_year_level:selectedYear,p_source:source});
      if (bindError) throw bindError;
      const {data,error}=await cloud.rpc('get_student_topical_questions_v52c',{p_access_token:token,p_year_level:selectedYear,p_source:source});
      if (error) throw error;
      const rows=Array.isArray(data)?data:[];
      if (!rows.length) throw new Error('This topical exercise has no available questions.');

      resetState();
      Object.assign(state,{
        student:access.student_name||document.getElementById('student-name')?.value.trim()||'',
        studentId:access.student_id||document.getElementById('student-id')?.value.trim()||'',
        year:selectedYear,
        classGroup:access.class_name||document.getElementById('class-group')?.value||'Other',
        strand:'all',topic:source,difficulty:'all',
        count:Number(document.getElementById('question-count')?.value||10),
        startedAt:new Date().toISOString(),source:'cloud',topicalSource:source,
        accessToken:token,rosterStudentId:access.roster_student_id||null,classId:access.class_id||null
      });
      const items=buildPracticeItems(rows);
      state.questions=shuffle(items).slice(0,Math.min(state.count,items.length));
      if (!state.questions.length) throw new Error('This topical exercise has no complete practice questions.');
      document.getElementById('student-pill').textContent=state.studentId?`${state.student} • ${state.studentId}`:state.student;
      document.getElementById('class-pill').textContent=`Year ${state.year}${state.classGroup==='Other'?'':state.classGroup}`;
      document.getElementById('path-pill').textContent=`Topical • ${source}`;
      show('quiz');
      renderQuestion();
    }catch(error){
      console.warn('V5.2C topical practice could not start.',error);
      activeStudentAccess=null;
      window.alert(`Topical Practice could not start. ${error?.message||''}`.trim());
      await loadAvailableSets(true);
    }
  }

  async function gradeTopicalQuestion(q,response){
    const token=state.accessToken||activeStudentAccess?.access_token||'';
    if (!token) throw new Error('Student access must be verified first.');
    const {data,error}=await cloud.rpc('grade_topical_response_v52c',{p_access_token:token,p_question_id:q.id,p_response:response});
    if (error) throw error;
    if (data?.correct_answer!=null) q.answer=data.correct_answer;
    if (data?.explanation!=null) q.explanation=data.explanation;
    if (data?.hint!=null) q.hint=data.hint;
    return data||{};
  }

  function renderTopicalResult(r,sync,resultCode){
    document.getElementById('progress-bar').style.width='100%';
    document.getElementById('result-name').textContent=`${r.student_name} • Year ${r.year_level}${r.class_group==='Other'?'':r.class_group}`;
    document.getElementById('result-score').textContent=r.auto_total?`${r.first_try_score}/${r.auto_total} (${r.first_try_percent}%)`:'Pending';
    document.getElementById('res-mastery').textContent=r.auto_total?`${r.mastery_score}/${r.auto_total}`:'—';
    document.getElementById('res-hints').textContent=r.hints_used;
    document.getElementById('res-second').textContent=r.second_try_successes;
    document.getElementById('res-sync').textContent=sync;
    document.getElementById('result-message').textContent=r.pending_review_count
      ? `${r.pending_review_count} response${r.pending_review_count===1?' is':'s are'} waiting for teacher review. Auto-marked score is shown separately.`
      : (r.first_try_percent>=90?'Excellent first-try accuracy.':r.mastery_percent>=80?'Good learning from feedback. Practise this topical set again for stronger first-try accuracy.':'Review the hints and explanations, then practise this topical set again.');
    const box=document.getElementById('result-code-box'),check=document.getElementById('check-this-result');
    if (resultCode){
      document.getElementById('result-code').textContent=resultCode;box?.classList.remove('hidden');check?.classList.remove('hidden');if(check)check.dataset.code=resultCode;
    }else{box?.classList.add('hidden');check?.classList.add('hidden');if(check)check.dataset.code='';}
    document.getElementById('review').innerHTML=(r.details||[]).map((a,i)=>`<div class="reviewitem"><strong>${a.manualReview?'📨':a.firstTry?'✅':a.correct?'🟡':'❌'} Q${i+1}: ${html(a.question)}</strong><div>Your answer: ${html(a.finalAnswer)}</div>${a.manualReview?'<div class="muted">Waiting for teacher review.</div>':a.correct?'':`<div>Correct answer: ${html(a.correctAnswer||'—')}</div>`}<div class="muted" style="margin-top:6px">${html(a.explanation||'')}</div><div class="pills" style="margin-top:7px"><span class="tag">${html((typeof STRANDS!=='undefined'&&STRANDS[a.strand])||a.strand)}</span><span class="tag">${html(a.topic)}</span>${a.skill?`<span class="tag">${html(a.skill)}</span>`:''}</div></div>`).join('');
    activeStudentAccess=null;
    show('result');
  }

  async function finishTopicalPractice(early){
    const r=resultRecord(early);
    r.practice_mode='topical';r.strand='mixed';r.topic=state.topicalSource;r.topical_source=state.topicalSource;
    let sync='Local backup',resultCode='';
    try{
      const payload={...r};delete payload.details;
      const rows=(r.details||[]).map(a=>({question_id:String(a.questionId)}));
      const {data,error}=await cloud.rpc('submit_topical_practice_session_v52c',{p_access_token:state.accessToken||activeStudentAccess?.access_token||'',p_session:payload,p_answers:rows});
      if (error) throw error;
      Object.assign(r,data?.summary||{});
      resultCode=typeof normalizeResultCode==='function'?normalizeResultCode(data?.result_code||''):String(data?.result_code||'');
      sync='Cloud ✓';
      if(resultCode&&typeof rememberResultCode==='function') rememberResultCode(resultCode,{student:r.student_name,completed_at:r.completed_at});
    }catch(error){console.warn('V5.2C topical submission failed.',error);}
    try { if (typeof saveLocalResult==='function') saveLocalResult(r); } catch {}
    renderTopicalResult(r,sync,resultCode);
  }

  function installEngineHooks(){
    try{
      const baseGrade=typeof gradeCloudPracticeQuestion==='function'?gradeCloudPracticeQuestion:null;
      if(baseGrade&&!ROOT.__v52cGradeHook){
        ROOT.__v52cGradeHook=true;
        gradeCloudPracticeQuestion=async function(q,response){
          if (!state?.topicalSource) return baseGrade(q,response);
          return gradeTopicalQuestion(q,response);
        };
      }
    }catch{}
    try{
      const baseFinish=typeof finishPractice==='function'?finishPractice:null;
      if(baseFinish&&!ROOT.__v52cFinishHook){
        ROOT.__v52cFinishHook=true;
        finishPractice=async function(early){
          if (!state?.topicalSource) return baseFinish(early);
          return finishTopicalPractice(early);
        };
      }
    }catch{}
  }

  function wire(){
    if (typeof document==='undefined') return;
    injectStyles();ensureModeButton();ensureLibrary();installEngineHooks();
    document.getElementById(MODE_BUTTON_ID)?.addEventListener('click',activateTopicalMode);

    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#practice-mode-btn,#exam-mode-btn')) leaveTopicalMode();
      if (localState.active&&event.target?.closest?.('#start-btn')){
        event.preventDefault();event.stopImmediatePropagation();startTopicalPractice();
      }
    },true);

    document.getElementById('year-level')?.addEventListener('change',()=>{
      if (!localState.active) return;
      localState.selectedSource='';
      loadAvailableSets(true);
    });
    syncModeUi();
  }

  const api=Object.freeze({MODE_BUTTON_ID,LIBRARY_ID,norm,setKey,normalizeSetRows});
  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52CStudentTopicalLibrary',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true}); else wire();
    }
  }
})();

/* V5.2C.1 — Student Topical Library mount hotfix.
   V4.0 Learn setup moves #start-btn out of the legacy .buttons container. Create
   the V5.2C library root beside the current Learn controls so the accepted
   topical selection/RPC engine can render into it unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52c1TopicalLibraryMountInstalled) return;
  ROOT.__v52c1TopicalLibraryMountInstalled = true;

  const LIBRARY_ID = 'v52c-student-topical-library';
  const STYLE_ID = 'v52c1-topical-library-mount-style';

  function currentLearnAnchor(){
    if (typeof document === 'undefined') return null;
    const setup = document.querySelector('#start .v40c-learn-setup');
    return setup?.querySelector('.v40c-practice-summary')
      || setup?.querySelector('.v40c-learn-actions')
      || document.getElementById('start-btn')?.closest('.buttons')
      || null;
  }

  function createLibraryRoot(){
    const root = document.createElement('section');
    root.id = LIBRARY_ID;
    root.className = 'info hidden';
    root.setAttribute('aria-label', 'Available topical exercise sets');
    return root;
  }

  function ensureMounted(){
    if (typeof document === 'undefined') return null;
    const anchor = currentLearnAnchor();
    if (!anchor) return null;

    let root = document.getElementById(LIBRARY_ID);
    if (!root) root = createLibraryRoot();

    /* Prefer immediately before Practice setup. This matches the V5.2C mode
       note (“Choose a teacher-published set below”) and keeps the question-count
       control below the set chooser. The legacy .buttons anchor remains a safe
       fallback for older shells. */
    if (root.parentElement !== anchor.parentElement || root.nextElementSibling !== anchor){
      anchor.insertAdjacentElement('beforebegin', root);
    }
    return root;
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .v40c-learn-setup #${LIBRARY_ID}{margin:0 18px 18px}
      @media(max-width:700px){#start .v40c-learn-setup #${LIBRARY_ID}{margin:0 18px 18px}}
    `;
    document.head.appendChild(style);
  }

  function install(){
    if (typeof document === 'undefined') return;
    injectStyles();
    if (ensureMounted()) return;

    /* Fail softly if a future shell is still being assembled. Stop observing as
       soon as a supported anchor appears; do not introduce a permanent page-wide
       observer. */
    if (typeof MutationObserver === 'undefined') return;
    const start = document.getElementById('start');
    if (!start) return;
    const observer = new MutationObserver(() => {
      if (ensureMounted()) observer.disconnect();
    });
    observer.observe(start, {childList:true, subtree:true});
  }

  const api = Object.freeze({LIBRARY_ID});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window, 'V52C1TopicalLibraryMount', {value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
      else install();
    }
  }
})();

/* V5.2C — Topical Practice hint bridge.
   The existing Practice Hint button is wired once during core boot, so this bridge
   preserves that handler for ordinary Practice and diverts only topical sessions
   to the dedicated inactive-question hint RPC. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52cTopicalHintBridgeInstalled) return;
  ROOT.__v52cTopicalHintBridgeInstalled = true;

  const html=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  async function showTopicalHint(){
    if (typeof state==='undefined' || !state?.topicalSource || state.done) return;
    const box=document.getElementById('hint-box');
    if (!box) return;
    if (!box.classList.contains('hidden')){
      box.classList.add('hidden');
      return;
    }

    const item=state.questions?.[state.index];
    if (!item) return;
    const multipart=typeof isMultipartItem==='function' && isMultipartItem(item);
    const parts=multipart
      ? item.parts.filter((part,index)=>{
          const manual=typeof isManualType==='function' ? isManualType(part) : ['drawing','manual'].includes(String(part?.response_type||'text'));
          const status=state.groupStatus?.[index];
          return !manual && !status?.correct && !status?.submitted;
        })
      : [item].filter(part=>{
          const manual=typeof isManualType==='function' ? isManualType(part) : ['drawing','manual'].includes(String(part?.response_type||'text'));
          return !manual;
        });
    if (!parts.length) return;

    try{
      const token=state.accessToken || (typeof activeStudentAccess!=='undefined' ? activeStudentAccess?.access_token : '') || '';
      if (!token) throw new Error('Student access must be verified first.');
      const rows=await Promise.all(parts.map(async part=>{
        const {data,error}=await cloud.rpc('request_topical_hint_v52c',{p_access_token:token,p_question_id:part.id});
        if (error) throw error;
        part.hint=data?.hint||'';
        return {part,hint:data?.hint||''};
      }));
      if (!state.hintUsed){ state.hintUsed=true; state.hints++; }
      box.innerHTML=multipart
        ? rows.map(({part,hint},index)=>`<div><strong>${html(part.part_label?`(${part.part_label})`:`Part ${index+1}`)}:</strong> ${html(hint||'No hint added.')}</div>`).join('<hr style="border:0;border-top:1px solid #efd8b8;margin:8px 0">')
        : html(rows[0]?.hint||'No hint added.');
      box.classList.remove('hidden');
    }catch(error){
      console.warn('V5.2C topical hint could not be loaded.',error);
      const feedback=document.getElementById('feedback');
      if (feedback){
        feedback.className='feedback incorrect';
        feedback.textContent=`Could not load the hint. ${error?.message||''}`.trim();
      }
    }
  }

  function wire(){
    if (typeof document==='undefined') return;
    const button=document.getElementById('hint-btn');
    if (!button || button.__v52cTopicalHintWrapped) return;
    const baseHandler=button.onclick;
    button.__v52cTopicalHintWrapped=true;
    button.onclick=function(event){
      if (typeof state!=='undefined' && state?.topicalSource){
        event?.preventDefault?.();
        return showTopicalHint();
      }
      return typeof baseHandler==='function' ? baseHandler.call(this,event) : undefined;
    };
  }

  const api=Object.freeze({showTopicalHint});
  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52CTopicalHintBridge',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.2C.2 — Topical Practice result UX polish.
   Presentation/navigation polish plus safe one-time Practice-ticket rotation after a
   completed topical session. Ordinary Practice result wording remains unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52c2TopicalResultUxInstalled) return;
  ROOT.__v52c2TopicalResultUxInstalled = true;

  const RESULT_ID = 'result';
  const AGAIN_ID = 'again-btn';
  const MODE_BUTTON_ID = 'v52c-topical-mode-btn';
  const LIBRARY_ID = 'v52c-student-topical-library';
  const STYLE_ID = 'v52c2-topical-result-ux-style';
  const V40_STORAGE_KEY = 'mathStudentSessionV40';
  const lastTopical = { source:'', year:0, count:0 };

  let practiceOverrideToken='';
  let lastRotatedFromToken='';
  let rotationPromise=null;
  let rotationForToken='';

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const isStruggleAction = text => /^(?:practice|practise) what i struggled with$/i.test(trim(text));

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html[data-theme="dark"] #${LIBRARY_ID} .v52c-set-card{
        background:var(--card);
        color:var(--text);
      }
      html[data-theme="dark"] #${LIBRARY_ID} .v52c-set-card.selected{
        background:var(--soft);
      }
    `;
    document.head.appendChild(style);
  }

  function topicalContext(){
    try {
      const source = trim(state?.topicalSource);
      if (!source) return null;
      return {
        source,
        year:Number(state?.year || document.getElementById('year-level')?.value || 0),
        count:Number(state?.count || document.getElementById('question-count')?.value || 5)
      };
    } catch { return null; }
  }

  function rememberText(node,key){
    if (!node || node.dataset[key] != null) return;
    node.dataset[key] = node.textContent || '';
  }

  function setTextIfChanged(node,text){
    if (node && node.textContent !== text) node.textContent = text;
  }

  function restoreText(node,key){
    if (!node || node.dataset[key] == null) return;
    setTextIfChanged(node,node.dataset[key]);
    delete node.dataset[key];
  }

  function topicalPrivacyText(){
    return 'Treat this code as private. Anyone with the code can view this Topical Practice result.';
  }

  function persistPracticeToken(token){
    const next=trim(token);
    if (!next) return false;
    practiceOverrideToken=next;
    try{
      const raw=sessionStorage.getItem(V40_STORAGE_KEY);
      if (raw){
        const stored=JSON.parse(raw);
        if (stored && stored.tokens && typeof stored.tokens==='object'){
          stored.tokens.practice=next;
          sessionStorage.setItem(V40_STORAGE_KEY,JSON.stringify(stored));
        }
      }
    }catch{}
    return true;
  }

  function installPracticeAccessOverride(){
    if (typeof validateStudentAccess!=='function' || ROOT.__v52c2PracticeAccessOverrideInstalled) return;
    ROOT.__v52c2PracticeAccessOverrideInstalled=true;
    const base=validateStudentAccess;
    validateStudentAccess=async function(purpose){
      const access=await base(purpose);
      if (!access || purpose==='exam' || !practiceOverrideToken) return access;
      return {...access,access_token:practiceOverrideToken};
    };
  }

  function completedTopicalToken(){
    try{
      if (!trim(state?.topicalSource)) return '';
      return trim(state?.accessToken);
    }catch{return '';}
  }

  async function rotateCompletedTopicalTicket(){
    const token=completedTopicalToken();
    if (!token) return false;
    if (lastRotatedFromToken===token && practiceOverrideToken && practiceOverrideToken!==token) return true;
    if (rotationPromise && rotationForToken===token) return rotationPromise;
    if (typeof cloud==='undefined' || !cloud || typeof cloud.rpc!=='function') return false;

    rotationForToken=token;
    rotationPromise=(async()=>{
      try{
        const {data,error}=await cloud.rpc('renew_student_practice_access_v52c2',{p_access_token:token});
        if (error) throw error;
        const next=trim(data?.access_token);
        if (!data?.allowed || !next) throw new Error('A fresh Practice ticket was not returned.');
        if (!persistPracticeToken(next)) throw new Error('The refreshed Practice ticket could not be stored.');
        lastRotatedFromToken=token;
        return true;
      }catch(error){
        console.warn('V5.2C.2 could not refresh the signed-in Practice ticket.',error);
        return false;
      }finally{
        if (rotationForToken===token){
          rotationPromise=null;
          rotationForToken='';
        }
      }
    })();
    return rotationPromise;
  }

  function restoreOrdinaryResult(result){
    result.removeAttribute('data-v52c2-topical-result');
    const heading=result.querySelector('h1');
    const again=document.getElementById(AGAIN_ID);
    const privacy=document.querySelector('#result-code-box .help');
    restoreText(heading,'v52c2OriginalText');
    restoreText(again,'v52c2OriginalText');
    restoreText(privacy,'v52c2OriginalText');
    result.querySelectorAll('[data-v52c2-topical-hidden="1"]').forEach(node=>{
      node.classList.remove('hidden');
      delete node.dataset.v52c2TopicalHidden;
    });
  }

  function decorateResult(){
    if (typeof document === 'undefined') return;
    const result=document.getElementById(RESULT_ID);
    if (!result || !result.classList.contains('active')) return;

    const context=topicalContext();
    if (!context){
      restoreOrdinaryResult(result);
      return;
    }

    Object.assign(lastTopical,context);
    result.dataset.v52c2TopicalResult='1';

    const heading=result.querySelector('h1');
    const again=document.getElementById(AGAIN_ID);
    const privacy=document.querySelector('#result-code-box .help');
    rememberText(heading,'v52c2OriginalText');
    rememberText(again,'v52c2OriginalText');
    rememberText(privacy,'v52c2OriginalText');
    setTextIfChanged(heading,'Topical Practice Complete');
    setTextIfChanged(again,'Practise this topical set again');
    setTextIfChanged(privacy,topicalPrivacyText());

    result.querySelectorAll('button').forEach(button=>{
      if (button.id===AGAIN_ID || !isStruggleAction(button.textContent)) return;
      if (button.dataset.v52c2TopicalHidden==='1') return;
      button.dataset.v52c2TopicalHidden='1';
      button.classList.add('hidden');
    });

    void rotateCompletedTopicalTicket();
  }

  function waitForPublishedSet(source,timeoutMs=7000){
    return new Promise(resolve=>{
      const started=Date.now();
      const tick=()=>{
        const root=document.getElementById(LIBRARY_ID);
        const cards=[...(root?.querySelectorAll('.v52c-set-card') || [])];
        const match=cards.find(card=>norm(card.dataset.source)===norm(source));
        if (match) return resolve(match);
        if (Date.now()-started>=timeoutMs) return resolve(null);
        window.setTimeout(tick,100);
      };
      tick();
    });
  }

  async function reopenLastTopical(){
    const context={...lastTopical};
    if (!context.source) return false;

    const refreshed=await rotateCompletedTopicalTicket();
    if (!refreshed){
      window.alert('Your signed-in Practice access needs to be refreshed. Please log out and sign in again.');
      return false;
    }

    if (typeof show === 'function') show('start');
    const year=document.getElementById('year-level');
    const count=document.getElementById('question-count');
    if (year && context.year) year.value=String(context.year);
    if (count && context.count) count.value=String(context.count);

    const topical=document.getElementById(MODE_BUTTON_ID);
    if (!topical){
      window.alert('Topical Practice is not available right now. Please return to Learn and try again.');
      return false;
    }

    topical.click();
    const card=await waitForPublishedSet(context.source);
    if (!card){
      window.alert('This topical exercise is no longer available. Choose another teacher-published topical exercise.');
      return false;
    }

    card.click();
    if (count && context.count) count.value=String(context.count);
    card.scrollIntoView?.({behavior:'smooth',block:'center'});
    return true;
  }

  function onCaptureClick(event){
    const again=event.target?.closest?.(`#${AGAIN_ID}`);
    if (!again) return;
    const result=document.getElementById(RESULT_ID);
    if (result?.dataset.v52c2TopicalResult!=='1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void reopenLastTopical();
  }

  function wire(){
    if (typeof document === 'undefined') return;
    injectStyles();
    installPracticeAccessOverride();
    const result=document.getElementById(RESULT_ID);
    if (!result) return;
    document.addEventListener('click',onCaptureClick,true);
    if (typeof MutationObserver !== 'undefined'){
      new MutationObserver(decorateResult).observe(result,{
        attributes:true,
        attributeFilter:['class']
      });
    }
    decorateResult();
  }

  const api=Object.freeze({norm,isStruggleAction,topicalPrivacyText});
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V52C2TopicalResultUx',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();