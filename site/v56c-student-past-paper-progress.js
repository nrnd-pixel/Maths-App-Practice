/* V5.6C — Student Past Paper Progress.
   Adds paper-level progress to the existing secure My Progress dashboard.
   Server evidence comes from a versioned token-gated RPC; same-device unfinished
   Practice is merged only as a local resume indicator. Exam Mode and grading are unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v56cStudentPastPaperProgressInstalled) return;
  ROOT.__v56cStudentPastPaperProgressInstalled = true;

  const SECTION_ID = 'v56c-past-paper-progress';
  const STYLE_ID = 'v56c-past-paper-progress-style';
  const FILTER_ID = 'v56c-paper-filter';
  const RPC_NAME = 'get_student_past_paper_progress_v56c';
  let lastData = null;
  let loading = false;
  let lastLoadedAt = 0;
  let selectedFilter = 'all';

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function paperKey(examYear,paper){
    return `${Number(examYear)||0}|${norm(paper)}`;
  }

  function progressPercent(practised,available){
    const total=Math.max(0,Number(available)||0);
    const done=Math.max(0,Math.min(total,Number(practised)||0));
    return total ? Math.round(done/total*100) : 0;
  }

  function serverStatus(row){
    const status=norm(row?.progress_status);
    return ['not_started','in_progress','completed'].includes(status) ? status : 'not_started';
  }

  function statusLabel(status){
    if (status==='completed') return 'Completed';
    if (status==='in_progress') return 'In progress';
    return 'Not started';
  }

  function assignmentLabel(assignment){
    if (!assignment) return '';
    if (assignment.status==='completed') return 'Teacher assigned · completed';
    if (assignment.status==='in_progress') return 'Teacher assigned · in progress';
    return 'Teacher assigned';
  }

  function readResumeStore(storage){
    const api=ROOT.V55CResumePastPaperPractice;
    if (!api || !storage) return {};
    try {
      return api.pruneStore(api.readStore(storage));
    } catch { return {}; }
  }

  function resumeForPaper(row,student,storage){
    const store=readResumeStore(storage);
    const target=paperKey(row?.exam_year,row?.paper);
    const studentId=norm(student?.student_id);
    const studentName=norm(student?.student_name);
    const candidates=Object.values(store).filter(snapshot =>
      paperKey(snapshot?.examYear,snapshot?.paper)===target &&
      (!studentId || norm(snapshot?.studentId)===studentId || (!snapshot?.studentId && norm(snapshot?.studentName)===studentName))
    );
    if (!candidates.length) return null;
    return candidates.sort((a,b)=>Date.parse(b?.savedAt||0)-Date.parse(a?.savedAt||0))[0] || null;
  }

  function clientStatus(row,resume){
    if (resume) return 'in_progress';
    return serverStatus(row);
  }

  function paperAction(row,resume){
    if (resume) return 'continue';
    if (row?.teacher_assignment && row.teacher_assignment.status!=='completed') return 'assignment';
    return serverStatus(row)==='not_started' ? 'start' : 'practice_again';
  }

  function dateLabel(value){
    if (!value) return '';
    const date=new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'});
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${SECTION_ID}{margin:18px 0;border:1px solid var(--border);border-radius:18px;padding:15px;background:color-mix(in srgb,var(--soft) 22%,var(--card))}
      #${SECTION_ID} .v56c-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #${SECTION_ID} .v56c-head h2{margin:0 0 4px;font-size:20px}
      #${SECTION_ID} .v56c-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${SECTION_ID} .v56c-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}
      #${SECTION_ID} .v56c-summary .stat{padding:10px}
      #${SECTION_ID} .v56c-summary strong{font-size:20px}
      #${SECTION_ID} .v56c-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:12px 0}
      #${SECTION_ID} .v56c-filters{display:flex;gap:7px;flex-wrap:wrap}
      #${SECTION_ID} .v56c-filter{min-height:36px;padding:7px 11px;border:1px solid var(--border);background:var(--card);font-size:12px}
      #${SECTION_ID} .v56c-filter[aria-pressed="true"]{border-color:var(--primary);color:var(--primary);background:color-mix(in srgb,var(--soft) 45%,var(--card))}
      #${SECTION_ID} .v56c-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${SECTION_ID} .v56c-card{border:1px solid var(--border);border-radius:15px;background:var(--card);padding:13px;display:grid;gap:9px;min-width:0}
      #${SECTION_ID} .v56c-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      #${SECTION_ID} .v56c-card h3{margin:0;font-size:16px}
      #${SECTION_ID} .v56c-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}
      #${SECTION_ID} .v56c-bar{height:9px;background:var(--border);border-radius:999px;overflow:hidden}
      #${SECTION_ID} .v56c-bar>span{display:block;height:100%;background:var(--primary)}
      #${SECTION_ID} .v56c-progress-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted)}
      #${SECTION_ID} .v56c-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      #${SECTION_ID} .v56c-metric{border:1px solid var(--border);border-radius:10px;padding:8px;background:var(--surface-soft,#f8fafc)}
      #${SECTION_ID} .v56c-metric small{display:block;color:var(--muted);font-size:10px;margin-bottom:3px}
      #${SECTION_ID} .v56c-metric strong{font-size:13px}
      #${SECTION_ID} .v56c-resume{font-size:11px;line-height:1.4;color:var(--primary);font-weight:750}
      #${SECTION_ID} .v56c-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto}
      #${SECTION_ID} .v56c-actions button{min-height:38px;padding:8px 11px;font-size:12px}
      #${SECTION_ID} .v56c-empty{grid-column:1/-1;text-align:center;color:var(--muted);padding:22px}
      @media(max-width:760px){#${SECTION_ID} .v56c-list{grid-template-columns:1fr}}
      @media(max-width:520px){#${SECTION_ID} .v56c-summary,#${SECTION_ID} .v56c-metrics{grid-template-columns:1fr 1fr}#${SECTION_ID} .v56c-metrics .v56c-metric:last-child{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function ensureSection(){
    if (typeof document==='undefined') return null;
    injectStyles();
    let section=document.getElementById(SECTION_ID);
    if (section) return section;
    const anchor=document.getElementById('v49a-progress-snapshot') || document.getElementById('student-dashboard-summary');
    if (!anchor) return null;
    section=document.createElement('section');
    section.id=SECTION_ID;
    section.setAttribute('aria-label','Past Paper progress');
    section.innerHTML='<div class="v56c-empty">Open My Progress to load Past Paper progress.</div>';
    anchor.insertAdjacentElement('afterend',section);
    return section;
  }

  function rowsWithLocal(data){
    const storage=typeof localStorage!=='undefined' ? localStorage : null;
    const student=data?.student || {};
    return (Array.isArray(data?.papers)?data.papers:[]).map(row=>{
      const resume=resumeForPaper(row,student,storage);
      return {...row,_resume:resume,_clientStatus:clientStatus(row,resume)};
    });
  }

  function matchesFilter(row){
    if (selectedFilter==='all') return true;
    if (selectedFilter==='resume') return !!row._resume || row?.teacher_assignment?.status==='in_progress';
    return row._clientStatus===selectedFilter;
  }

  function actionText(action){
    if (action==='continue') return 'Continue Saved Practice';
    if (action==='assignment') return 'Open Assignment';
    if (action==='practice_again') return 'Practise Again';
    return 'Start Practice';
  }

  function render(data){
    lastData=data || {student:{},papers:[]};
    const section=ensureSection();
    if (!section) return false;
    const rows=rowsWithLocal(lastData);
    const completed=rows.filter(row=>serverStatus(row)==='completed').length;
    const continuing=rows.filter(row=>row._clientStatus==='in_progress').length;
    const visible=rows.filter(matchesFilter);

    section.innerHTML=`
      <div class="v56c-head">
        <div><h2>📄 Past Paper Progress</h2><p>Track your Practice coverage by paper. This is separate from Exam Mode.</p></div>
        <span class="tag">V5.6C</span>
      </div>
      <div class="v56c-summary">
        <div class="stat"><strong>${rows.length}</strong><small>Papers available</small></div>
        <div class="stat"><strong>${completed}</strong><small>Fully covered</small></div>
        <div class="stat"><strong>${continuing}</strong><small>In progress</small></div>
      </div>
      <div class="v56c-toolbar">
        <div class="v56c-filters" id="${FILTER_ID}" role="group" aria-label="Filter Past Paper progress">
          ${[
            ['all','All'],['resume','Continue'],['completed','Completed'],['in_progress','In progress'],['not_started','Not started']
          ].map(([value,label])=>`<button type="button" class="v56c-filter" data-filter="${value}" aria-pressed="${selectedFilter===value}">${label}</button>`).join('')}
        </div>
        <span class="help">Coverage counts distinct current Practice questions you have attempted.</span>
      </div>
      <div class="v56c-list">
        ${visible.map(row=>paperCard(row)).join('') || '<div class="v56c-empty">No papers match this filter.</div>'}
      </div>`;

    section.querySelectorAll('.v56c-filter').forEach(button=>button.addEventListener('click',()=>{
      selectedFilter=button.dataset.filter || 'all';
      render(lastData);
    }));
    section.querySelectorAll('[data-v56c-action]').forEach(button=>button.addEventListener('click',()=>handleAction(button)));
    section.querySelectorAll('[data-v56c-result]').forEach(button=>button.addEventListener('click',()=>openResult(button.dataset.v56cResult || '')));
    return true;
  }

  function paperCard(row){
    const available=Math.max(0,Number(row.available_questions)||0);
    const practised=Math.max(0,Math.min(available,Number(row.questions_practised)||0));
    const percent=progressPercent(practised,available);
    const status=row._clientStatus;
    const latest=row.latest_session || {};
    const first=Number.isFinite(Number(latest.first_try_percent)) ? `${Number(latest.first_try_percent)}%` : '—';
    const mastery=Number.isFinite(Number(latest.mastery_percent)) ? `${Number(latest.mastery_percent)}%` : '—';
    const attempts=Math.max(0,Number(row.session_count)||0);
    const action=paperAction(row,row._resume);
    const assignment=assignmentLabel(row.teacher_assignment);
    const resume=row._resume;
    const savedTotal=Array.isArray(resume?.questionIds) ? resume.questionIds.length : 0;
    const savedDone=Math.max(0,Math.min(savedTotal,Number(resume?.nextIndex)||0));
    const latestDate=dateLabel(latest.completed_at || row.last_practised_at);
    const statusClass=status==='completed'?'status-active':status==='in_progress'?'warn':'local';
    return `<article class="v56c-card" data-paper-key="${html(paperKey(row.exam_year,row.paper))}">
      <div class="v56c-card-head">
        <div><h3>${Number(row.exam_year)} · ${html(row.paper)}</h3><div class="v56c-tags"><span class="tag ${statusClass}">${html(statusLabel(status))}</span>${assignment?`<span class="tag v56b-assigned-paper-tag">${html(assignment)}</span>`:''}</div></div>
        <strong>${percent}%</strong>
      </div>
      <div class="v56c-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${available}" aria-valuenow="${practised}"><span style="width:${percent}%"></span></div>
      <div class="v56c-progress-row"><span>${practised}/${available} current questions practised</span><span>${latestDate?`Latest ${html(latestDate)}`:''}</span></div>
      <div class="v56c-metrics">
        <div class="v56c-metric"><small>Latest first try</small><strong>${first}</strong></div>
        <div class="v56c-metric"><small>Latest mastery</small><strong>${mastery}</strong></div>
        <div class="v56c-metric"><small>Sessions</small><strong>${attempts}</strong></div>
      </div>
      ${resume?`<div class="v56c-resume">↻ Saved on this device · ${savedDone}/${savedTotal} questions completed in the unfinished session.</div>`:''}
      <div class="v56c-actions">
        <button type="button" class="${action==='continue'||action==='assignment'?'primary':'outline'}" data-v56c-action="${action}" data-year="${Number(row.exam_year)}" data-paper="${html(row.paper)}" ${row.teacher_assignment?.assignment_id?`data-assignment-id="${html(row.teacher_assignment.assignment_id)}"`:''}>${html(actionText(action))}</button>
        ${latest.result_code?`<button type="button" class="outline" data-v56c-result="${html(latest.result_code)}">View Latest Result</button>`:''}
      </div>
    </article>`;
  }

  async function preparePaper(examYear,paper){
    if (typeof document==='undefined') return false;
    if (typeof show==='function') show('start');
    const api=ROOT.V55APastPaperPractice;
    if (!api) throw new Error('Past Paper Practice is not ready.');
    api.setPracticeType?.('past_paper');
    await api.loadPaperLibrary?.(false);
    const year=document.getElementById('v55a-paper-year');
    const paperSelect=document.getElementById('v55a-paper-name');
    if (!year || !paperSelect) throw new Error('Past Paper Practice controls are not ready.');
    const yearOption=[...year.options].find(option=>Number(option.value)===Number(examYear));
    if (!yearOption) throw new Error('This past paper is no longer available in Practice.');
    year.value=yearOption.value;
    year.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(resolve=>window.setTimeout(resolve,0));
    const option=[...paperSelect.options].find(item=>norm(item.value)===norm(paper));
    if (!option) throw new Error('This past paper could not be selected.');
    paperSelect.value=option.value;
    paperSelect.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('v55a-practice-source')?.scrollIntoView?.({behavior:'smooth',block:'center'});
    return true;
  }

  async function handleAction(button){
    const action=button.dataset.v56cAction || '';
    const examYear=Number(button.dataset.year||0);
    const paper=trim(button.dataset.paper);
    button.disabled=true;
    try {
      if (action==='assignment'){
        document.getElementById('my-assignments-btn')?.click();
        return;
      }
      await preparePaper(examYear,paper);
      if (action==='continue'){
        await new Promise(resolve=>window.setTimeout(resolve,80));
        const resume=document.querySelector('#v55c-resume-card [data-v55c-resume]');
        if (!resume) throw new Error('Saved progress could not be matched to this paper.');
        resume.click();
      }
    } catch(error){
      console.warn('V5.6C Past Paper action could not be completed.',error);
      if (typeof window!=='undefined') window.alert(error?.message || 'Past Paper Practice could not be opened.');
    } finally { if (document.contains(button)) button.disabled=false; }
  }

  function openResult(code){
    if (!code) return;
    try {
      if (typeof openStudentReview==='function') { openStudentReview(code); return; }
    } catch {}
    const input=document.getElementById('review-code');
    if (input) input.value=code;
    document.getElementById('check-reviewed-btn')?.click();
  }

  async function load(force=false){
    const section=ensureSection();
    if (!section || loading) return;
    if (!force && lastData && Date.now()-lastLoadedAt<15000){ render(lastData); return; }
    loading=true;
    section.innerHTML='<div class="v56c-empty">Loading Past Paper progress…</div>';
    try {
      const access=typeof validateStudentAccess==='function' ? await validateStudentAccess('practice') : null;
      if (!access?.access_token) throw new Error('Student sign-in is required.');
      const {data,error}=await cloud.rpc(RPC_NAME,{p_access_token:access.access_token});
      if (error) throw error;
      lastLoadedAt=Date.now();
      render(data || {student:{},papers:[]});
    } catch(error){
      console.warn('V5.6C Past Paper progress could not be loaded.',error);
      section.innerHTML=`<div class="feedback incorrect">Could not load Past Paper progress. ${html(error?.message||'')}</div>`;
    } finally { loading=false; }
  }

  function wire(){
    if (typeof document==='undefined') return;
    ensureSection();
    document.getElementById('my-progress-btn')?.addEventListener('click',()=>window.setTimeout(()=>load(true),120));
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#my-progress-btn')) window.setTimeout(()=>load(true),180);
      if (event.target?.closest?.('.back-home')) lastLoadedAt=0;
    },true);
    const dashboard=document.getElementById('student-dashboard');
    if (dashboard && typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{
        if (dashboard.classList.contains('active')) window.setTimeout(()=>load(false),80);
      }).observe(dashboard,{attributes:true,attributeFilter:['class']});
    }
    window.addEventListener('pageshow',()=>{
      if (document.getElementById('student-dashboard')?.classList.contains('active')) load(true);
    });
  }

  const api=Object.freeze({
    RPC_NAME,paperKey,progressPercent,serverStatus,statusLabel,assignmentLabel,
    resumeForPaper,clientStatus,paperAction
  });
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V56CStudentPastPaperProgress',{value:api,writable:false,configurable:false});
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
