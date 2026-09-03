/* V5.7.6 — Classroom Feedback + Support.
   Students can send short feedback from the signed-in Practice-first Home.
   Teachers get a secure class feedback inbox with acknowledge/resolve controls.
   Diagnostic context excludes access tokens, answers and grading data. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if (ROOT.__v576ClassroomFeedbackSupportInstalled) return;
  ROOT.__v576ClassroomFeedbackSupportInstalled=true;

  const RPC_SUBMIT='submit_student_feedback_v576';
  const RPC_GET='get_teacher_feedback_v576';
  const RPC_UPDATE='update_teacher_feedback_v576';
  const STUDENT_TRIGGER_ID='v576-send-feedback';
  const STUDENT_OVERLAY_ID='v576-feedback-overlay';
  const TEACHER_TRIGGER_ID='v576-feedback-inbox';
  const TEACHER_OVERLAY_ID='v576-feedback-inbox-overlay';
  const STYLE_ID='v576-feedback-support-style';

  let studentReturnFocus=null;
  let teacherReturnFocus=null;
  let previousOverflow='';
  let teacherLoading=false;

  const trim=value=>String(value??'').trim();
  const html=value=>String(value??'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function passivePracticeAccess(){
    try {
      const fromHome=ROOT.V57CStudentContinueLearningHome?.passivePracticeAccess?.();
      if (fromHome?.access_token) return fromHome;
      const fromResume=ROOT.V57ACrossDevicePastPaperResume?.passivePracticeAccess?.();
      if (fromResume?.access_token) return fromResume;
      const access=typeof activeStudentAccess!=='undefined'?activeStudentAccess:ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose!=='practice') return null;
      return access;
    } catch { return null; }
  }

  function studentSignedIn(){
    return typeof document!=='undefined' && !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function currentArea(){
    if (typeof document==='undefined') return 'unknown';
    const active=[...document.querySelectorAll('.panel.active,section.active,[data-panel].active')]
      .find(node=>node.offsetParent!==null);
    if (active?.id) return active.id;
    if (document.getElementById('start')?.classList.contains('active')) return 'start';
    return 'unknown';
  }

  function safeContext(){
    if (typeof document==='undefined') return {};
    const badge=trim(document.querySelector('#start .brand .badge')?.textContent).slice(0,120);
    return {
      app_title:trim(document.title).slice(0,120),
      release_badge:badge,
      area:currentArea().slice(0,100),
      path:typeof location!=='undefined'?trim(location.pathname).slice(0,240):'',
      viewport:typeof window!=='undefined'?`${Math.max(0,window.innerWidth||0)}x${Math.max(0,window.innerHeight||0)}`:'',
      user_agent:typeof navigator!=='undefined'?trim(navigator.userAgent).slice(0,500):'',
      captured_at:new Date().toISOString()
    };
  }

  function feedbackTypeLabel(type){
    if (type==='suggestion') return 'Suggestion';
    if (type==='question') return 'Question';
    return 'Problem';
  }

  function feedbackTypeIcon(type){
    if (type==='suggestion') return '💡';
    if (type==='question') return '❓';
    return '🛠️';
  }

  function statusLabel(status){
    if (status==='acknowledged') return 'Acknowledged';
    if (status==='resolved') return 'Resolved';
    return 'New';
  }

  function formatDate(value){
    const date=new Date(value||0);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([],{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${STUDENT_TRIGGER_ID}{white-space:nowrap}
      #${STUDENT_OVERLAY_ID},#${TEACHER_OVERLAY_ID}{position:fixed;inset:0;z-index:138;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${STUDENT_OVERLAY_ID}.hidden,#${TEACHER_OVERLAY_ID}.hidden{display:none!important}
      #${STUDENT_OVERLAY_ID} .v576-sheet{width:min(620px,100%);margin:5vh auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:22px}
      #${TEACHER_OVERLAY_ID} .v576-sheet{width:min(1160px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:22px}
      .v576-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
      .v576-head h2{margin:0 0 5px;font-size:23px}.v576-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      .v576-head-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .v576-form{display:grid;gap:13px;margin-top:17px}.v576-form label{display:grid;gap:6px;font-size:12px;font-weight:850}
      .v576-form select,.v576-form textarea{width:100%;font:inherit;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:11px;padding:10px}
      .v576-form textarea{min-height:150px;resize:vertical;line-height:1.45}
      .v576-help{font-size:10px;color:var(--muted);line-height:1.45}.v576-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
      .v576-status{padding:10px 11px;border-radius:11px;background:color-mix(in srgb,var(--soft) 35%,var(--card));font-size:11px;line-height:1.4}
      .v576-status.success{border:1px solid color-mix(in srgb,#27a36b 42%,var(--border));color:#14724d}.v576-status.error{border:1px solid color-mix(in srgb,#d9534f 42%,var(--border));color:#a1302c}
      #${TEACHER_TRIGGER_ID}{white-space:nowrap}
      #${TEACHER_OVERLAY_ID} .v576-controls{display:grid;grid-template-columns:minmax(180px,.75fr) minmax(170px,.55fr) auto;gap:9px;align-items:end;margin:16px 0}
      #${TEACHER_OVERLAY_ID} .v576-controls label{display:grid;gap:5px;font-size:11px;font-weight:850}
      #${TEACHER_OVERLAY_ID} .v576-controls select{width:100%;font:inherit;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:10px;padding:9px}
      #${TEACHER_OVERLAY_ID} .v576-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0 16px}
      #${TEACHER_OVERLAY_ID} .v576-stat{border:1px solid var(--border);border-radius:13px;padding:11px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${TEACHER_OVERLAY_ID} .v576-stat strong{display:block;font-size:21px;margin-bottom:3px}#${TEACHER_OVERLAY_ID} .v576-stat span{font-size:10px;color:var(--muted)}
      #${TEACHER_OVERLAY_ID} .v576-list{display:grid;gap:10px}
      #${TEACHER_OVERLAY_ID} .v576-item{border:1px solid var(--border);border-radius:15px;padding:14px;background:var(--card);display:grid;gap:10px}
      #${TEACHER_OVERLAY_ID} .v576-item[data-status="new"]{border-color:color-mix(in srgb,#f0a44b 45%,var(--border))}
      #${TEACHER_OVERLAY_ID} .v576-item-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      #${TEACHER_OVERLAY_ID} .v576-item-title{display:flex;gap:9px;align-items:flex-start}.v576-item-title .v576-icon{font-size:21px;line-height:1}
      #${TEACHER_OVERLAY_ID} .v576-item-title strong{display:block;font-size:14px}.v576-meta{font-size:10px;color:var(--muted);margin-top:3px}
      #${TEACHER_OVERLAY_ID} .v576-pill{display:inline-block;padding:4px 8px;border:1px solid var(--border);border-radius:999px;font-size:9px;font-weight:900}
      #${TEACHER_OVERLAY_ID} .v576-pill.new{color:#9a5b11}.v576-pill.acknowledged{color:#226ba7}.v576-pill.resolved{color:#14724d}
      #${TEACHER_OVERLAY_ID} .v576-message{white-space:pre-wrap;line-height:1.5;font-size:12px;padding:10px 11px;border-radius:11px;background:color-mix(in srgb,var(--soft) 24%,var(--card))}
      #${TEACHER_OVERLAY_ID} details{font-size:10px;color:var(--muted)}#${TEACHER_OVERLAY_ID} details pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;background:color-mix(in srgb,var(--soft) 22%,var(--card));padding:9px;border-radius:9px}
      #${TEACHER_OVERLAY_ID} .v576-edit{display:grid;grid-template-columns:minmax(150px,.45fr) minmax(240px,1fr) auto;gap:8px;align-items:end}
      #${TEACHER_OVERLAY_ID} .v576-edit label{display:grid;gap:5px;font-size:10px;font-weight:850}#${TEACHER_OVERLAY_ID} .v576-edit select,#${TEACHER_OVERLAY_ID} .v576-edit textarea{width:100%;font:inherit;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:9px;padding:8px}
      #${TEACHER_OVERLAY_ID} .v576-edit textarea{min-height:58px;resize:vertical}.v576-empty{padding:24px;text-align:center;color:var(--muted);font-size:12px}
      @media(max-width:820px){#${TEACHER_OVERLAY_ID} .v576-summary{grid-template-columns:repeat(2,minmax(0,1fr))}#${TEACHER_OVERLAY_ID} .v576-edit{grid-template-columns:1fr}}
      @media(max-width:650px){#${STUDENT_OVERLAY_ID},#${TEACHER_OVERLAY_ID}{padding:8px}.v576-sheet{padding:15px!important;border-radius:16px!important}#${TEACHER_OVERLAY_ID} .v576-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureStudentTrigger(){
    if (typeof document==='undefined') return false;
    const row=document.querySelector('#start .v57c-secondary');
    if (!row || !studentSignedIn()) return false;
    let button=document.getElementById(STUDENT_TRIGGER_ID);
    if (!button){
      button=document.createElement('button');
      button.id=STUDENT_TRIGGER_ID;
      button.type='button';
      button.className='outline';
      button.textContent='💬 Send Feedback';
      button.addEventListener('click',openStudentFeedback);
    }
    if (button.parentElement!==row) row.appendChild(button);
    return true;
  }

  function ensureStudentOverlay(){
    if (typeof document==='undefined') return null;
    let overlay=document.getElementById(STUDENT_OVERLAY_ID);
    if (overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id=STUDENT_OVERLAY_ID;
    overlay.className='hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v576-student-title');
    overlay.innerHTML=`<div class="v576-sheet">
      <div class="v576-head">
        <div><h2 id="v576-student-title">💬 Send Feedback</h2><p>Tell your teacher about a problem, suggestion or question about the Maths Practice App.</p></div>
        <div class="v576-head-actions"><span class="tag">V5.7.6</span><button type="button" class="outline" id="v576-student-close">Close</button></div>
      </div>
      <form class="v576-form" id="v576-student-form">
        <label>Feedback type<select id="v576-student-type"><option value="problem">🛠️ Problem</option><option value="suggestion">💡 Suggestion</option><option value="question">❓ Question</option></select></label>
        <label>What would you like us to know?<textarea id="v576-student-message" maxlength="1500" required placeholder="Please describe what happened or what you would like improved."></textarea></label>
        <div class="v576-help">The app automatically includes basic screen and browser details to help identify technical problems. It never includes your PIN, access token, answers or answer keys. If a problem is visual, showing your teacher a screenshot can also help.</div>
        <div id="v576-student-status" class="v576-status" hidden></div>
        <div class="v576-actions"><button type="button" class="outline" id="v576-student-cancel">Cancel</button><button type="submit" class="primary" id="v576-student-submit">Send Feedback</button></div>
      </form>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('v576-student-close')?.addEventListener('click',closeStudentFeedback);
    document.getElementById('v576-student-cancel')?.addEventListener('click',closeStudentFeedback);
    document.getElementById('v576-student-form')?.addEventListener('submit',submitStudentFeedback);
    overlay.addEventListener('click',event=>{if(event.target===overlay) closeStudentFeedback();});
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeStudentFeedback();}});
    return overlay;
  }

  function openStudentFeedback(){
    const overlay=ensureStudentOverlay();
    if (!overlay) return false;
    studentReturnFocus=document.activeElement;
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const status=document.getElementById('v576-student-status');
    if (status){status.hidden=true;status.textContent='';status.className='v576-status';}
    overlay.classList.remove('hidden');
    setTimeout(()=>document.getElementById('v576-student-type')?.focus(),0);
    return true;
  }

  function closeStudentFeedback(){
    const overlay=document.getElementById(STUDENT_OVERLAY_ID);
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow=previousOverflow;
    studentReturnFocus?.focus?.();
    studentReturnFocus=null;
  }

  async function submitStudentFeedback(event){
    event?.preventDefault?.();
    const access=passivePracticeAccess();
    const type=trim(document.getElementById('v576-student-type')?.value);
    const message=trim(document.getElementById('v576-student-message')?.value);
    const submit=document.getElementById('v576-student-submit');
    const status=document.getElementById('v576-student-status');
    if (!access?.access_token){
      if(status){status.hidden=false;status.className='v576-status error';status.textContent='Please sign in again before sending feedback.';}
      return false;
    }
    if(message.length<5){
      if(status){status.hidden=false;status.className='v576-status error';status.textContent='Please add a little more detail.';}
      return false;
    }
    if(submit) submit.disabled=true;
    try{
      const {data,error}=await cloud.rpc(RPC_SUBMIT,{p_access_token:access.access_token,p_feedback_type:type,p_message:message,p_context:safeContext()});
      if(error) throw error;
      const ref=trim(data?.id).slice(0,8).toUpperCase();
      if(status){status.hidden=false;status.className='v576-status success';status.textContent=`Feedback sent${ref?` · Reference ${ref}`:''}. Thank you.`;}
      const messageBox=document.getElementById('v576-student-message');
      if(messageBox) messageBox.value='';
      window.dispatchEvent(new CustomEvent('v576:feedback-submitted',{detail:{type}}));
      return true;
    }catch(error){
      if(status){status.hidden=false;status.className='v576-status error';status.textContent=error?.message||'Feedback could not be sent.';}
      return false;
    }finally{if(submit) submit.disabled=false;}
  }

  function currentTeacherClasses(){
    try{
      return Array.isArray(teacherClasses)
        ? teacherClasses.filter(row=>row?.active!==false).slice().sort((a,b)=>Number(a.year_level)-Number(b.year_level)||trim(a.name).localeCompare(trim(b.name),undefined,{numeric:true}))
        : [];
    }catch{return[];}
  }

  function preferredTeacherClassId(){
    try{
      if(selectedClassId && currentTeacherClasses().some(row=>String(row.id)===String(selectedClassId))) return String(selectedClassId);
    }catch{}
    return String(currentTeacherClasses()[0]?.id||'');
  }

  function ensureTeacherTrigger(){
    if (typeof document==='undefined' || document.getElementById(TEACHER_TRIGGER_ID)) return false;
    const exportButton=document.getElementById('export-analytics');
    if(!exportButton) return false;
    const button=document.createElement('button');
    button.id=TEACHER_TRIGGER_ID;
    button.type='button';
    button.className='secondary';
    button.textContent='💬 Feedback Inbox';
    button.addEventListener('click',openTeacherFeedback);
    const motivation=document.getElementById('v573-open-class-motivation');
    (motivation||exportButton).insertAdjacentElement('beforebegin',button);
    return true;
  }

  function ensureTeacherOverlay(){
    if (typeof document==='undefined') return null;
    let overlay=document.getElementById(TEACHER_OVERLAY_ID);
    if(overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id=TEACHER_OVERLAY_ID;
    overlay.className='hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v576-teacher-title');
    overlay.innerHTML=`<div class="v576-sheet">
      <div class="v576-head">
        <div><h2 id="v576-teacher-title">💬 Feedback Inbox</h2><p>Review student-reported problems, suggestions and questions. New items appear first.</p></div>
        <div class="v576-head-actions"><span class="tag">V5.7.6</span><button type="button" class="outline" id="v576-teacher-close">Close</button></div>
      </div>
      <div class="v576-controls">
        <label>Class<select id="v576-teacher-class"></select></label>
        <label>Status<select id="v576-teacher-status"><option value="open">Open</option><option value="new">New</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option><option value="all">All</option></select></label>
        <button type="button" class="secondary" id="v576-teacher-refresh">Refresh</button>
      </div>
      <div id="v576-teacher-content"><div class="v576-empty">Choose a class.</div></div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('v576-teacher-close')?.addEventListener('click',closeTeacherFeedback);
    document.getElementById('v576-teacher-refresh')?.addEventListener('click',()=>loadTeacherFeedback());
    document.getElementById('v576-teacher-class')?.addEventListener('change',()=>loadTeacherFeedback());
    document.getElementById('v576-teacher-status')?.addEventListener('change',()=>loadTeacherFeedback());
    overlay.addEventListener('click',event=>{
      if(event.target===overlay) closeTeacherFeedback();
      const save=event.target?.closest?.('[data-v576-save]');
      if(save){event.preventDefault();updateTeacherFeedback(save.dataset.v576Save,save);}
    });
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeTeacherFeedback();}});
    return overlay;
  }

  function populateTeacherClasses(){
    const select=document.getElementById('v576-teacher-class');
    if(!select) return;
    const classes=currentTeacherClasses();
    const preferred=select.value||preferredTeacherClassId();
    select.innerHTML='<option value="">All active classes</option>'+classes.map(row=>`<option value="${html(row.id)}">${html(row.name)} · Year ${Number(row.year_level)||''}</option>`).join('');
    if(classes.some(row=>String(row.id)===String(preferred))) select.value=String(preferred);
  }

  function contextMarkup(context){
    if(!context || typeof context!=='object') return '';
    const allowed=['app_title','release_badge','area','path','viewport','user_agent','captured_at'];
    const lines=allowed.filter(key=>trim(context[key])).map(key=>`${key}: ${trim(context[key])}`);
    return lines.length?`<details><summary>Technical context</summary><pre>${html(lines.join('\n'))}</pre></details>`:'';
  }

  function renderTeacherFeedback(payload){
    const content=document.getElementById('v576-teacher-content');
    if(!content) return false;
    const summary=payload?.summary||{};
    const rows=Array.isArray(payload?.feedback)?payload.feedback:[];
    content.innerHTML=`
      <div class="v576-summary">
        <div class="v576-stat"><strong>${Number(summary.new)||0}</strong><span>New</span></div>
        <div class="v576-stat"><strong>${Number(summary.open)||0}</strong><span>Open</span></div>
        <div class="v576-stat"><strong>${Number(summary.resolved)||0}</strong><span>Resolved</span></div>
        <div class="v576-stat"><strong>${Number(summary.total)||0}</strong><span>Total feedback</span></div>
      </div>
      ${rows.length?`<div class="v576-list">${rows.map(row=>{
        const id=trim(row?.id);
        const type=trim(row?.feedback_type)||'problem';
        const status=trim(row?.status)||'new';
        const student=row?.student||{};
        const cls=row?.class||{};
        return `<article class="v576-item" data-status="${html(status)}" data-v576-id="${html(id)}">
          <div class="v576-item-head">
            <div class="v576-item-title"><span class="v576-icon">${feedbackTypeIcon(type)}</span><div><strong>${html(feedbackTypeLabel(type))} · ${html(student.student_name||'Student')}</strong><div class="v576-meta">${html(cls.class_name||'')} · ${html(student.student_id||'')} · ${html(formatDate(row?.created_at))}</div></div></div>
            <span class="v576-pill ${html(status)}">${html(statusLabel(status))}</span>
          </div>
          <div class="v576-message">${html(row?.message||'')}</div>
          ${contextMarkup(row?.context)}
          <div class="v576-edit">
            <label>Status<select data-v576-status><option value="new" ${status==='new'?'selected':''}>New</option><option value="acknowledged" ${status==='acknowledged'?'selected':''}>Acknowledged</option><option value="resolved" ${status==='resolved'?'selected':''}>Resolved</option></select></label>
            <label>Teacher note<textarea data-v576-note maxlength="1000" placeholder="Optional note for your own follow-up">${html(row?.teacher_note||'')}</textarea></label>
            <button type="button" class="secondary" data-v576-save="${html(id)}">Save</button>
          </div>
        </article>`;
      }).join('')}</div>`:'<div class="v576-empty">No feedback matches this filter.</div>'}`;
    return true;
  }

  async function loadTeacherFeedback(){
    if(teacherLoading) return false;
    const content=document.getElementById('v576-teacher-content');
    if(!content) return false;
    teacherLoading=true;
    content.innerHTML='<div class="v576-empty">Loading feedback…</div>';
    try{
      const classId=trim(document.getElementById('v576-teacher-class')?.value);
      const status=trim(document.getElementById('v576-teacher-status')?.value)||'open';
      const {data,error}=await cloud.rpc(RPC_GET,{p_class_id:classId||null,p_status:status});
      if(error) throw error;
      return renderTeacherFeedback(data||{});
    }catch(error){
      content.innerHTML=`<div class="v576-empty">${html(error?.message||'Feedback could not be loaded.')}</div>`;
      return false;
    }finally{teacherLoading=false;}
  }

  async function updateTeacherFeedback(id,button){
    const card=button?.closest?.('[data-v576-id]');
    if(!card||!id) return false;
    const status=trim(card.querySelector('[data-v576-status]')?.value);
    const note=trim(card.querySelector('[data-v576-note]')?.value);
    if(button) button.disabled=true;
    try{
      const {error}=await cloud.rpc(RPC_UPDATE,{p_feedback_id:id,p_status:status,p_teacher_note:note||null});
      if(error) throw error;
      await loadTeacherFeedback();
      return true;
    }catch(error){
      window.alert(error?.message||'Feedback could not be updated.');
      return false;
    }finally{if(button&&document.contains(button)) button.disabled=false;}
  }

  function openTeacherFeedback(){
    const overlay=ensureTeacherOverlay();
    if(!overlay) return false;
    teacherReturnFocus=document.activeElement;
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    populateTeacherClasses();
    overlay.classList.remove('hidden');
    loadTeacherFeedback();
    setTimeout(()=>document.getElementById('v576-teacher-class')?.focus(),0);
    return true;
  }

  function closeTeacherFeedback(){
    const overlay=document.getElementById(TEACHER_OVERLAY_ID);
    if(!overlay||overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow=previousOverflow;
    teacherReturnFocus?.focus?.();
    teacherReturnFocus=null;
  }

  function wire(){
    if(typeof document==='undefined') return false;
    injectStyles();
    ensureStudentTrigger();
    ensureTeacherTrigger();
    ensureStudentOverlay();
    ensureTeacherOverlay();
    window.addEventListener('v57c:home-updated',()=>setTimeout(ensureStudentTrigger,0));
    window.addEventListener('pageshow',()=>setTimeout(()=>{ensureStudentTrigger();ensureTeacherTrigger();},80));
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('[data-v40-nav="home"],.back-home')) setTimeout(ensureStudentTrigger,100);
      if(event.target?.closest?.('#v40c-student-logout')) document.getElementById(STUDENT_TRIGGER_ID)?.remove();
    },true);
    if(typeof MutationObserver!=='undefined') new MutationObserver(()=>{ensureStudentTrigger();ensureTeacherTrigger();}).observe(document.body,{childList:true,subtree:true});
    return true;
  }

  const api=Object.freeze({
    RPC_SUBMIT,RPC_GET,RPC_UPDATE,passivePracticeAccess,safeContext,feedbackTypeLabel,statusLabel,
    openStudentFeedback,closeStudentFeedback,submitStudentFeedback,openTeacherFeedback,closeTeacherFeedback,
    loadTeacherFeedback,renderTeacherFeedback,updateTeacherFeedback
  });

  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V576ClassroomFeedbackSupport',{value:api,writable:false,configurable:false});
    wire();
  }
})();
