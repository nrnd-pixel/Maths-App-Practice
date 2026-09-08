/* Phase 4 — Teacher Assignments student runtime.
   Preserves the surviving V4.2B student assignment UI, secure launch/completion flow,
   Home priority behavior and legacy DOM/global contracts. Practice execution remains
   owned by the existing recommendation/Practice engine. */
(() => {
  'use strict';

  const core = typeof module !== 'undefined' && module.exports
    ? require('./assignments-core.js')
    : window.AssignmentsCore;
  if (!core) throw new Error('AssignmentsCore must load before assignments-student.js');

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__assignmentsStudentInstalled) return;
  ROOT.__assignmentsStudentInstalled=true;

  const STYLE_ID='v42b-practice-assignments-style';
  const STUDENT_SECTION_ID='v42b-student-practice-assignments';
  let activeAssignmentContext=null;
  let homeRefreshBusy=false;
  let studentOpenBusy=false;

  const text=core.trim;
  const html=core.html;
  const dateLabel=core.dateLabel;
  const strandLabel=core.strandLabel;

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${STUDENT_SECTION_ID}{
        grid-column:1/-1;
        display:grid;
        gap:12px;
        margin-bottom:4px;
      }
      #${STUDENT_SECTION_ID} .v42b-section-head{
        border-bottom:1px solid var(--border);
        padding-bottom:10px;
      }
      #${STUDENT_SECTION_ID} .v42b-section-head h2{margin:0 0 4px}
      #${STUDENT_SECTION_ID} .v42b-assignment-grid{display:grid;gap:12px}
      #${STUDENT_SECTION_ID} .v42b-student-card{
        border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));
        border-radius:17px;
        padding:16px;
        background:color-mix(in srgb,var(--soft) 35%,var(--card));
      }
      #${STUDENT_SECTION_ID} .v42b-student-card-head{
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-start;
        flex-wrap:wrap;
      }
      #${STUDENT_SECTION_ID} .v42b-student-card h3{margin:0 0 5px}
      #${STUDENT_SECTION_ID} .v42b-student-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:12px;
      }
      .v42b-assignment-result-note{
        border:1px solid color-mix(in srgb,var(--primary) 30%,var(--border));
        border-radius:14px;
        padding:12px 13px;
        margin:12px 0;
        background:color-mix(in srgb,var(--soft) 40%,var(--card));
        text-align:left;
      }
      .v42b-assignment-result-note strong{display:block;margin-bottom:3px}
      @media(max-width:700px){
        #${STUDENT_SECTION_ID} .v42b-student-actions button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function timingLabel(row){
    if (row?.timing_status === 'upcoming') return 'Upcoming';
    if (row?.timing_status === 'due_passed') return 'Target due passed';
    return 'Active';
  }

  function practiceAssignmentTitle(assignment){
    return assignment?.topic || `${strandLabel(assignment?.strand)} Practice`;
  }

  function practiceAssignmentStatus(assignment){
    if (assignment?.status === 'completed') return 'Completed';
    if (assignment?.status === 'in_progress') return 'In progress';
    return 'Not started';
  }

  async function rpcPracticeAssignments(token){
    const {data,error}=await cloud.rpc('get_student_practice_assignments',{p_access_token:token});
    if (error) throw error;
    return data || {assignments:[]};
  }

  function renderStudentPracticeAssignments(data){
    const root=document.getElementById('student-assignments-list');
    if (!root) return;

    document.getElementById(STUDENT_SECTION_ID)?.remove();
    const section=document.createElement('section');
    section.id=STUDENT_SECTION_ID;
    section.innerHTML=`
      <div class="v42b-section-head">
        <h2>✏️ Practice Assignments</h2>
        <p class="muted">Short focused Practice sets assigned by your teacher.</p>
      </div>
      <div class="v42b-assignment-grid"></div>
    `;
    root.prepend(section);

    const list=section.querySelector('.v42b-assignment-grid');
    const assignments=Array.isArray(data?.assignments) ? data.assignments : [];
    if (!assignments.length){
      list.innerHTML='<div class="empty">No targeted Practice assignments right now.</div>';
      return;
    }

    list.innerHTML=assignments.map(assignment=>{
      const completed=assignment.status === 'completed';
      const inProgress=assignment.status === 'in_progress';
      const result=assignment.attempt || {};
      const due=dateLabel(assignment.closes_at,'Target due');
      const count=Number(assignment.recommended_count || 0);
      const label=practiceAssignmentTitle(assignment);
      const mastery=Number(result.mastery_percent);
      return `
        <article class="v42b-student-card">
          <div class="v42b-student-card-head">
            <div>
              <h3>${completed?'✅':'✏️'} ${html(label)}</h3>
              <div class="help">${html(strandLabel(assignment.strand))}${assignment.topic?` · ${html(assignment.topic)}`:''} · ${count || Number(assignment.question_count||0)} question${count===1?'':'s'}</div>
              <div class="help">${html(timingLabel(assignment))}${due?` · ${html(due)}`:''}${completed&&Number.isFinite(mastery)?` · ${mastery}% mastery`:''}</div>
            </div>
            <span class="tag">${html(practiceAssignmentStatus(assignment))}</span>
          </div>
          <p class="muted" style="margin:10px 0 0">${inProgress?'Your previous assigned set was not completed. Start the focused set again to finish the assignment.':completed?'This assigned Practice has been completed.':'Complete this focused set using the normal Practice feedback and learning tools.'}</p>
          <div class="v42b-student-actions">
            ${completed && result.result_code
              ? `<button type="button" class="outline v42b-view-practice-result" data-code="${html(result.result_code)}">View Result</button>`
              : `<button type="button" class="primary v42b-start-practice-assignment" data-id="${html(assignment.assignment_id)}" ${count<1?'disabled':''}>${inProgress?'Continue Assignment':'Start Assignment'}</button>`}
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('.v42b-start-practice-assignment').forEach(button=>{
      button.addEventListener('click',()=>startPracticeAssignment(button.dataset.id,button));
    });
    list.querySelectorAll('.v42b-view-practice-result').forEach(button=>{
      button.addEventListener('click',()=>{
        if (typeof openStudentReview === 'function') openStudentReview(button.dataset.code || '');
        else document.getElementById('check-reviewed-btn')?.click();
      });
    });
  }

  async function loadStudentPracticeAssignments(practiceAccess){
    try {
      const data=await rpcPracticeAssignments(practiceAccess.access_token);
      renderStudentPracticeAssignments(data);
    } catch (error){
      const root=document.getElementById('student-assignments-list');
      if (!root) return;
      document.getElementById(STUDENT_SECTION_ID)?.remove();
      const section=document.createElement('section');
      section.id=STUDENT_SECTION_ID;
      section.innerHTML=`<div class="feedback incorrect">Could not load Practice assignments. ${html(error?.message || '')}</div>`;
      root.prepend(section);
    }
  }

  async function openCombinedAssignments(){
    if (studentOpenBusy) return;
    studentOpenBusy=true;
    try {
      const examAccess=await validateStudentAccess('exam');
      if (!examAccess?.access_token) return;
      if (typeof show === 'function') show('student-assignments');
      if (typeof loadStudentAssignmentsV36 === 'function') await loadStudentAssignmentsV36(examAccess.access_token);
      const practiceAccess=await validateStudentAccess('practice');
      if (practiceAccess?.access_token) await loadStudentPracticeAssignments(practiceAccess);
    } finally {
      studentOpenBusy=false;
    }
  }

  async function startPracticeAssignment(assignmentOrId,button){
    const assignmentId=typeof assignmentOrId === 'object' ? assignmentOrId.assignment_id : assignmentOrId;
    if (!assignmentId) return;

    const original=button?.textContent || '';
    if (button){
      button.disabled=true;
      button.textContent='Starting…';
    }

    try {
      const access=await validateStudentAccess('practice');
      if (!access?.access_token) return;
      const {data,error}=await cloud.rpc('start_student_practice_assignment',{
        p_access_token:access.access_token,
        p_assignment_id:assignmentId
      });
      if (error) throw error;
      if (data?.already_completed){
        alert('This Practice assignment is already completed.');
        await openCombinedAssignments();
        return;
      }
      if (!Number(data?.recommended_count || 0)) throw new Error('No matching Practice questions are currently available.');

      activeAssignmentContext={
        assignmentId:data.assignment_id,
        attemptId:data.attempt_id,
        accessToken:access.access_token,
        title:data.topic || `${strandLabel(data.strand)} Practice`,
        completing:false
      };

      if (typeof startRecommendedPracticeV35 !== 'function') throw new Error('Practice is not available yet.');
      studentPracticeRecommendationV35={
        practice_scope:data.topic ? 'topic' : 'strand',
        practice_strand:data.strand,
        practice_topic:data.topic || 'all',
        focus_strand:data.strand,
        focus_topic:data.topic || null,
        recommended_count:Number(data.recommended_count),
        reason:'teacher_assignment',
        assignment_id:data.assignment_id
      };
      await startRecommendedPracticeV35();
    } catch (error){
      console.warn('Could not start Practice assignment.',error);
      alert(`Practice assignment could not start. ${error?.message || ''}`.trim());
      activeAssignmentContext=null;
    } finally {
      if (button && document.contains(button)){
        button.disabled=false;
        button.textContent=original;
      }
    }
  }

  function assignmentResultNote(kind,title,body){
    document.querySelector('.v42b-assignment-result-note')?.remove();
    const result=document.getElementById('result');
    const anchor=result?.querySelector('.v41-recovery-panel') || document.getElementById('review');
    if (!result || !anchor) return;
    const note=document.createElement('div');
    note.className=`v42b-assignment-result-note ${kind||''}`;
    note.innerHTML=`<strong>${html(title)}</strong><span>${html(body)}</span>`;
    anchor.insertAdjacentElement('beforebegin',note);
  }

  async function completeActivePracticeAssignment(){
    const context=activeAssignmentContext;
    if (!context || context.completing) return;
    const result=document.getElementById('result');
    if (!result?.classList.contains('active')) return;

    const code=text(document.getElementById('result-code')?.textContent);
    if (!code){
      assignmentResultNote('','Assignment still in progress','This Practice result did not sync to the cloud, so the teacher assignment could not be completed yet.');
      activeAssignmentContext=null;
      return;
    }

    context.completing=true;
    try {
      const {data,error}=await cloud.rpc('complete_student_practice_assignment',{
        p_access_token:context.accessToken,
        p_attempt_id:context.attemptId,
        p_result_code:code
      });
      if (error) throw error;
      assignmentResultNote(
        'correct',
        '✅ Teacher Practice Assignment completed',
        Number.isFinite(Number(data?.mastery_percent))
          ? `${context.title} is complete with ${Number(data.mastery_percent)}% mastery.`
          : `${context.title} is complete and has been recorded for your teacher.`
      );
    } catch (error){
      console.warn('Could not complete Practice assignment.',error);
      assignmentResultNote('try','Assignment still in progress',error?.message || 'Complete the full assigned set to finish this assignment.');
    } finally {
      activeAssignmentContext=null;
    }
  }

  function wireResultCompletion(){
    const result=document.getElementById('result');
    if (!result || result.dataset.v42bAssignmentObserver === '1') return;
    result.dataset.v42bAssignmentObserver='1';
    const observer=new MutationObserver(()=>{
      if (result.classList.contains('active')) completeActivePracticeAssignment();
    });
    observer.observe(result,{attributes:true,attributeFilter:['class']});
  }

  async function practiceAssignmentForHome(){
    const access=await validateStudentAccess('practice');
    if (!access?.access_token) return null;
    const data=await rpcPracticeAssignments(access.access_token);
    const rows=Array.isArray(data?.assignments) ? data.assignments : [];
    return rows
      .filter(assignment=>assignment?.timing_status === 'active' && assignment?.status !== 'completed' && Number(assignment?.recommended_count || 0) > 0)
      .sort((a,b)=>
        (a.status === 'in_progress' ? 0 : 1) - (b.status === 'in_progress' ? 0 : 1) ||
        (Date.parse(a.closes_at || '9999-12-31') - Date.parse(b.closes_at || '9999-12-31'))
      )[0] || null;
  }

  async function promotePracticeAssignmentOnHome(){
    if (homeRefreshBusy) return;
    const dashboard=document.querySelector('#start .v40c3-home-dashboard.v40c3-ready');
    if (!dashboard) return;
    const currentButton=dashboard.querySelector('.v40c3-priority-action');
    if (!currentButton) return;

    const currentAction=text(currentButton.textContent);
    if (currentAction === 'Continue Assignment' || currentAction === 'Open Assignment') return;

    homeRefreshBusy=true;
    try {
      const assignment=await practiceAssignmentForHome();
      if (!assignment) return;
      const card=dashboard.querySelector('.v40c3-priority-card');
      if (!card || card.dataset.v42bAssignmentId === String(assignment.assignment_id)) return;
      card.dataset.v42bAssignmentId=assignment.assignment_id;
      const label=practiceAssignmentTitle(assignment);
      const due=assignment.closes_at ? dateLabel(assignment.closes_at,'Target due') : '';
      const inProgress=assignment.status === 'in_progress';
      card.innerHTML=`
        <div>
          <div class="v40c3-priority-kicker">Teacher Practice Assignment</div>
          <h2 class="v40c3-priority-title">✏️ ${html(inProgress?`Continue ${label}`:`Complete ${label}`)}</h2>
          <p class="v40c3-priority-text">${html(inProgress?'Your assigned focused Practice is still in progress. Complete the full set before moving to optional practice.':'Your teacher has assigned a focused Practice set. Assigned work comes before optional Focus or Recommended Practice.')}</p>
          <div class="v40c3-priority-meta">
            <span>${Number(assignment.recommended_count||0)} questions</span>
            <span>${html(assignment.topic || strandLabel(assignment.strand))}</span>
            ${due?`<span>${html(due)}</span>`:''}
          </div>
        </div>
        <button type="button" class="primary v40c3-priority-action">${inProgress?'Continue Assignment':'Start Assignment'}</button>
      `;
      card.querySelector('.v40c3-priority-action')?.addEventListener('click',event=>startPracticeAssignment(assignment,event.currentTarget));
    } catch (error){
      console.warn('Could not refresh Practice assignment priority.',error);
    } finally {
      homeRefreshBusy=false;
    }
  }

  function wireHomePriority(){
    const root=document.querySelector('#start .v40c3-home-dashboard');
    if (!root || root.dataset.v42bHomeObserver === '1') return;
    root.dataset.v42bHomeObserver='1';
    const observer=new MutationObserver(()=>{
      if (root.classList.contains('v40c3-ready')) setTimeout(promotePracticeAssignmentOnHome,0);
    });
    observer.observe(root,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});
    if (root.classList.contains('v40c3-ready')) promotePracticeAssignmentOnHome();
  }

  function wireStudentAssignments(){
    const button=document.getElementById('my-assignments-btn');
    if (button) button.onclick=openCombinedAssignments;
  }

  function boot(){
    injectStyles();
    wireStudentAssignments();
    wireResultCompletion();
    wireHomePriority();
  }

  const api=Object.freeze({
    rpcPracticeAssignments,
    renderStudentPracticeAssignments,
    loadStudentPracticeAssignments,
    openCombinedAssignments,
    startPracticeAssignment,
    practiceAssignmentForHome,
    promotePracticeAssignmentOnHome
  });

  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (typeof window !== 'undefined'){
    window.startPracticeAssignmentV42B=startPracticeAssignment;
    if (!Object.prototype.hasOwnProperty.call(window,'AssignmentsStudent')){
      Object.defineProperty(window,'AssignmentsStudent',{value:api,writable:false,configurable:false});
    }
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
      else boot();
    }
  }
})();