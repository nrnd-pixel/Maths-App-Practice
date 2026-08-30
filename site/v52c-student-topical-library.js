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
