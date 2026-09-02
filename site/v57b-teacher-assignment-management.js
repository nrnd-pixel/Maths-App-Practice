/* V5.7B — Better Teacher Assignment Management.
   Adds a read/manage overlay for teacher-created Past Paper Practice assignments:
   schedule editing, close/reopen, reassign-as-new and clearer per-student status.
   Student Practice/Exam grading and existing assignment creation remain unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57bTeacherAssignmentManagementInstalled) return;
  ROOT.__v57bTeacherAssignmentManagementInstalled = true;

  const RPC_LIST='get_teacher_past_paper_assignment_management_v57b';
  const RPC_UPDATE='update_teacher_past_paper_assignment_v57b';
  const RPC_REASSIGN='reassign_teacher_past_paper_assignment_v57b';
  const OVERLAY_ID='v57b-assignment-management-overlay';
  const TRIGGER_ID='v57b-open-assignment-management';
  const STYLE_ID='v57b-assignment-management-style';

  let payload={class:null,assignments:[]};
  let loading=false;
  let studentFilter='all';

  const trim=v=>String(v??'').trim();
  const html=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const pct=v=>Number.isFinite(Number(v))?`${Math.round(Number(v))}%`:'—';
  const dateText=v=>{ if(!v) return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?'—':d.toLocaleString(); };
  const localInput=v=>{ if(!v) return ''; const d=new Date(v); if(Number.isNaN(d.getTime())) return ''; const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const inputIso=v=>{ const s=trim(v); if(!s) return null; const d=new Date(s); return Number.isNaN(d.getTime())?null:d.toISOString(); };
  const assignmentKey=row=>String(row?.assignment_id||'');
  const paperLabel=row=>`${Number(row?.exam_year||0)} · ${trim(row?.paper||'Past Paper')}`;
  const scopeLabel=row=>trim(row?.selection_mode)==='all_available'?'All Available Questions':`Quick ${Number(row?.question_count||5)}`;
  const statusLabel=status=>({completed:'Completed',in_progress:'In progress',not_started:'Not started'}[status]||'Not started');
  const timingLabel=status=>({active:'Open',upcoming:'Upcoming',due_passed:'Due passed',closed:'Closed'}[status]||'Open');

  function selectedClassIdValue(){
    try { return trim(selectedClassId); } catch { return ''; }
  }

  function injectStyles(){
    if(typeof document==='undefined'||document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style'); style.id=STYLE_ID;
    style.textContent=`
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:10080;background:rgba(15,23,42,.58);display:flex;align-items:flex-start;justify-content:center;padding:28px 14px;overflow:auto}
      #${OVERLAY_ID}.hidden{display:none!important}
      #${OVERLAY_ID} .v57b-shell{width:min(1120px,100%);background:var(--card,#fff);border:1px solid var(--border,#dbe3ef);border-radius:22px;box-shadow:0 24px 70px rgba(15,23,42,.25);padding:18px}
      #${OVERLAY_ID} .v57b-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #${OVERLAY_ID} .v57b-head h2{margin:0 0 5px}
      #${OVERLAY_ID} .v57b-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${OVERLAY_ID} .v57b-list{display:grid;gap:14px;margin-top:15px}
      #${OVERLAY_ID} .v57b-card{border:1px solid var(--border,#dbe3ef);border-radius:17px;padding:14px;background:var(--surface-soft,#f8fafc)}
      #${OVERLAY_ID} .v57b-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #${OVERLAY_ID} .v57b-card h3{margin:0 0 4px}
      #${OVERLAY_ID} .v57b-tags,#${OVERLAY_ID} .v57b-card-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      #${OVERLAY_ID} .v57b-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px}
      #${OVERLAY_ID} .v57b-stat{border:1px solid var(--border,#dbe3ef);background:var(--card,#fff);border-radius:12px;padding:9px}
      #${OVERLAY_ID} .v57b-stat strong{display:block;font-size:18px}
      #${OVERLAY_ID} .v57b-schedule{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;align-items:end;margin-top:12px}
      #${OVERLAY_ID} .v57b-reassign{display:none;grid-template-columns:1fr 1fr auto auto;gap:9px;align-items:end;margin-top:10px;padding:10px;border:1px dashed var(--border,#dbe3ef);border-radius:12px;background:var(--card,#fff)}
      #${OVERLAY_ID} .v57b-reassign.open{display:grid}
      #${OVERLAY_ID} .v57b-students{margin-top:12px}
      #${OVERLAY_ID} table{width:100%;border-collapse:collapse;font-size:13px}
      #${OVERLAY_ID} th,#${OVERLAY_ID} td{padding:8px;border-bottom:1px solid var(--border,#e5e7eb);text-align:left;vertical-align:top}
      #${OVERLAY_ID} .v57b-student-filter{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
      #${OVERLAY_ID} .v57b-feedback{margin:12px 0 0}
      #${OVERLAY_ID} .v57b-empty{padding:22px;text-align:center;color:var(--muted,#64748b)}
      @media(max-width:760px){#${OVERLAY_ID} .v57b-stats{grid-template-columns:repeat(2,minmax(0,1fr))}#${OVERLAY_ID} .v57b-schedule,#${OVERLAY_ID} .v57b-reassign{grid-template-columns:1fr}#${OVERLAY_ID} .v57b-students{overflow:auto}}
    `;
    document.head.appendChild(style);
  }

  function feedback(kind,message){
    const root=document.querySelector(`#${OVERLAY_ID} .v57b-feedback`); if(!root) return;
    root.className=`feedback ${kind} v57b-feedback`; root.textContent=String(message||''); root.classList.remove('hidden');
  }

  function ensureOverlay(){
    injectStyles();
    let root=document.getElementById(OVERLAY_ID); if(root) return root;
    root=document.createElement('div'); root.id=OVERLAY_ID; root.className='hidden';
    root.innerHTML=`<div class="v57b-shell" role="dialog" aria-modal="true" aria-labelledby="v57b-title">
      <div class="v57b-head"><div><h2 id="v57b-title">Manage Past Paper Assignments</h2><div class="help" id="v57b-class-label">Loading…</div></div>
      <div class="v57b-actions"><button type="button" class="outline" data-v57b-refresh>Refresh</button><button type="button" class="outline" data-v57b-close>Close</button></div></div>
      <div class="info">Edit assignment dates, close or reopen an assignment, make a fresh copy for the same students, and review each learner's completion status. Existing student results are never deleted.</div>
      <div class="feedback hidden v57b-feedback"></div><div class="v57b-list"></div></div>`;
    document.body.appendChild(root);
    root.addEventListener('click',onClick);
    root.addEventListener('change',onChange);
    root.addEventListener('click',e=>{ if(e.target===root) closeOverlay(); });
    return root;
  }

  function studentsFor(row){
    const all=Array.isArray(row?.students)?row.students:[];
    if(studentFilter==='all') return all;
    if(studentFilter==='incomplete') return all.filter(s=>s.status!=='completed');
    if(studentFilter==='overdue') return all.filter(s=>s.overdue===true);
    return all.filter(s=>s.status===studentFilter);
  }

  function renderStudentRows(row){
    return studentsFor(row).map(s=>`<tr><td><strong>${html(s.student_name)}</strong><div class="help">${html(s.student_id)}</div></td>
      <td>${s.overdue?'<span class="tag availability-off">Overdue</span>':`<span class="tag">${html(statusLabel(s.status))}</span>`}</td>
      <td>${pct(s.first_try_percent)}</td><td>${pct(s.mastery_percent)}</td><td>${html(dateText(s.latest_activity))}</td></tr>`).join('') || '<tr><td colspan="5">No students match this filter.</td></tr>';
  }

  function render(){
    const root=ensureOverlay();
    const label=root.querySelector('#v57b-class-label');
    if(label) label.textContent=payload.class?`${payload.class.class_name} · Year ${Number(payload.class.year_level||0)}`:'No class selected';
    const list=root.querySelector('.v57b-list'); if(!list) return;
    const assignments=Array.isArray(payload.assignments)?payload.assignments:[];
    if(!assignments.length){ list.innerHTML='<div class="v57b-empty">No Past Paper Practice assignments for this class yet.</div>'; return; }
    list.innerHTML=assignments.map(row=>{
      const assigned=Number(row.assigned_count||0),completed=Number(row.completed_count||0),progress=assigned?Math.round(completed/assigned*100):0;
      const canManage=row.created_by_current_teacher===true;
      return `<article class="v57b-card" data-assignment-id="${html(assignmentKey(row))}">
        <div class="v57b-card-head"><div><h3>📄 ${html(paperLabel(row))}</h3><div class="help">${html(scopeLabel(row))} · ${row.audience==='selected_students'?'Selected students':'Whole class'} · Created ${html(dateText(row.created_at))}</div>
        <div class="v57b-tags"><span class="tag ${row.active?'availability-on':'availability-off'}">${html(timingLabel(row.timing_status))}</span>${Number(row.overdue_count||0)?`<span class="tag availability-off">${Number(row.overdue_count)} overdue</span>`:''}${canManage?'':'<span class="tag">View only</span>'}</div></div>
        <strong>${progress}% complete</strong></div>
        <div class="v57b-stats"><div class="v57b-stat"><strong>${assigned}</strong><span class="help">Assigned</span></div><div class="v57b-stat"><strong>${Number(row.not_started_count||0)}</strong><span class="help">Not started</span></div><div class="v57b-stat"><strong>${Number(row.in_progress_count||0)}</strong><span class="help">In progress</span></div><div class="v57b-stat"><strong>${completed}</strong><span class="help">Completed</span></div><div class="v57b-stat"><strong>${Number(row.overdue_count||0)}</strong><span class="help">Overdue</span></div></div>
        <div class="participation-bar"><span style="width:${progress}%"></span></div>
        <div class="v57b-schedule"><label>Available from<input type="datetime-local" data-v57b-opens value="${html(localInput(row.opens_at))}" ${canManage?'':'disabled'}></label><label>Due date<input type="datetime-local" data-v57b-closes value="${html(localInput(row.closes_at))}" ${canManage?'':'disabled'}></label><button type="button" class="outline" data-v57b-save-dates ${canManage?'':'disabled'}>Save dates</button></div>
        <div class="v57b-card-actions"><button type="button" class="outline" data-v57b-toggle ${canManage?'':'disabled'}>${row.active?'Close assignment':'Reopen assignment'}</button><button type="button" class="outline" data-v57b-show-reassign ${canManage?'':'disabled'}>Reassign as new</button></div>
        <div class="v57b-reassign"><label>New start<input type="datetime-local" data-v57b-new-opens></label><label>New due date<input type="datetime-local" data-v57b-new-closes></label><button type="button" class="primary" data-v57b-reassign>Create copy</button><button type="button" class="outline" data-v57b-cancel-reassign>Cancel</button></div>
        <details class="v57b-students"><summary>Student completion tracking</summary><div class="v57b-student-filter"><button type="button" class="outline" data-v57b-filter="all">All</button><button type="button" class="outline" data-v57b-filter="incomplete">Incomplete</button><button type="button" class="outline" data-v57b-filter="completed">Completed</button><button type="button" class="outline" data-v57b-filter="in_progress">In progress</button><button type="button" class="outline" data-v57b-filter="not_started">Not started</button><button type="button" class="outline" data-v57b-filter="overdue">Overdue</button></div>
        <table><thead><tr><th>Student</th><th>Status</th><th>First try</th><th>Mastery</th><th>Latest activity</th></tr></thead><tbody>${renderStudentRows(row)}</tbody></table></details>
      </article>`;
    }).join('');
  }

  async function load(force=true){
    if(loading) return; const classId=selectedClassIdValue();
    if(!classId){ feedback('error','Choose a class in the Teacher Dashboard first.'); return; }
    loading=true;
    try{
      const {data,error}=await cloud.rpc(RPC_LIST,{p_class_id:classId}); if(error) throw error;
      payload={class:data?.class||null,assignments:Array.isArray(data?.assignments)?data.assignments:[]}; render();
    }catch(error){ console.error('V5.7B assignment management load failed',error); feedback('error',error?.message||'Unable to load assignments.'); }
    finally{loading=false;}
  }

  function cardFrom(target){ return target?.closest?.('.v57b-card')||null; }
  function rowFromCard(card){ return payload.assignments.find(row=>assignmentKey(row)===String(card?.dataset?.assignmentId||''))||null; }

  async function saveDates(card,row,active=row.active){
    const opens=inputIso(card.querySelector('[data-v57b-opens]')?.value),closes=inputIso(card.querySelector('[data-v57b-closes]')?.value);
    if(opens&&closes&&new Date(closes)<=new Date(opens)){ feedback('error','Due date must be after the start date.'); return; }
    const {error}=await cloud.rpc(RPC_UPDATE,{p_assignment_id:row.assignment_id,p_opens_at:opens,p_closes_at:closes,p_active:!!active}); if(error) throw error;
  }

  async function onClick(event){
    const close=event.target.closest?.('[data-v57b-close]'); if(close){ closeOverlay(); return; }
    if(event.target.closest?.('[data-v57b-refresh]')){ await load(true); return; }
    const filter=event.target.closest?.('[data-v57b-filter]'); if(filter){ studentFilter=filter.dataset.v57bFilter||'all'; render(); return; }
    const card=cardFrom(event.target),row=rowFromCard(card); if(!card||!row) return;
    try{
      if(event.target.closest?.('[data-v57b-save-dates]')){ await saveDates(card,row,row.active); feedback('success','Assignment dates updated.'); await load(true); return; }
      if(event.target.closest?.('[data-v57b-toggle]')){
        const next=!row.active; if(!window.confirm(next?'Reopen this assignment for students?':'Close this assignment? Students will no longer be able to start it. Existing results will be kept.')) return;
        await saveDates(card,row,next); feedback('success',next?'Assignment reopened.':'Assignment closed. Existing results were kept.'); await load(true); return;
      }
      if(event.target.closest?.('[data-v57b-show-reassign]')){ card.querySelector('.v57b-reassign')?.classList.add('open'); return; }
      if(event.target.closest?.('[data-v57b-cancel-reassign]')){ card.querySelector('.v57b-reassign')?.classList.remove('open'); return; }
      if(event.target.closest?.('[data-v57b-reassign]')){
        const opens=inputIso(card.querySelector('[data-v57b-new-opens]')?.value),closes=inputIso(card.querySelector('[data-v57b-new-closes]')?.value);
        if(opens&&closes&&new Date(closes)<=new Date(opens)){ feedback('error','New due date must be after the new start date.'); return; }
        if(!window.confirm(`Create a fresh ${paperLabel(row)} assignment for the same students? Existing attempts will remain attached to the original assignment.`)) return;
        const {error}=await cloud.rpc(RPC_REASSIGN,{p_assignment_id:row.assignment_id,p_opens_at:opens,p_closes_at:closes}); if(error) throw error;
        feedback('success','Fresh assignment created for the same students.'); await load(true); return;
      }
    }catch(error){ console.error('V5.7B assignment management action failed',error); feedback('error',error?.message||'Unable to update assignment.'); }
  }

  function onChange(){ /* reserved for future lightweight filters */ }
  function openOverlay(){ const root=ensureOverlay(); root.classList.remove('hidden'); studentFilter='all'; render(); void load(true); }
  function closeOverlay(){ document.getElementById(OVERLAY_ID)?.classList.add('hidden'); }

  function ensureTrigger(){
    if(typeof document==='undefined'||document.getElementById(TRIGGER_ID)) return;
    const section=document.getElementById('v56b-past-paper-assignment-admin'); if(!section) return;
    const header=section.querySelector('.header')||section;
    const button=document.createElement('button'); button.type='button'; button.id=TRIGGER_ID; button.className='outline'; button.textContent='🗂 Manage assignments'; button.addEventListener('click',openOverlay);
    header.appendChild(button);
  }

  function wire(){
    if(typeof document==='undefined') return;
    ensureTrigger();
    const observer=new MutationObserver(()=>ensureTrigger()); observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('keydown',event=>{ if(event.key==='Escape') closeOverlay(); });
  }

  const api=Object.freeze({RPC_LIST,RPC_UPDATE,RPC_REASSIGN,paperLabel,statusLabel,timingLabel,studentsFor,openOverlay,load});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V57BTeacherAssignmentManagement',{value:api,writable:false,configurable:false});
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true}); else wire();
  }
})();
