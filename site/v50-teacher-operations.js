/* V5.0D2 — Teacher Operational Tools.
   Centralizes safe roster, class-transfer, assignment and rollover preparation.
   Uses teacher-only RPCs; grading, student evidence and report logic remain unchanged. */
(() => {
  'use strict';

  if (window.__v50TeacherOperationsInstalled) return;
  window.__v50TeacherOperationsInstalled = true;

  const TAB_ID = 'v50d2-teacher-operations-tab';
  const PANEL_ID = 'teacher-operations-panel';
  const STYLE_ID = 'v50d2-teacher-operations-style';
  const FEEDBACK_ID = 'v50d2-operations-feedback';
  let snapshot = null;
  let loading = false;
  let transferState = null;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function cloudAvailable(){
    try { return !!cloudReady && !!cloud && !!teacherUser; }
    catch { return false; }
  }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} .v50d2-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:14px 0}
      #${PANEL_ID} .v50d2-stat{border:1px solid var(--border);border-radius:13px;padding:12px;background:var(--surface-soft)}
      #${PANEL_ID} .v50d2-stat strong{display:block;font-size:22px;margin-bottom:3px}
      #${PANEL_ID} .v50d2-section{border:1px solid var(--border);border-radius:15px;padding:16px;margin-top:16px;background:var(--surface)}
      #${PANEL_ID} .v50d2-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) minmax(150px,220px) minmax(150px,220px);gap:9px;margin:12px 0}
      #${PANEL_ID} .v50d2-table td:last-child{white-space:normal;min-width:210px}
      #${PANEL_ID} .v50d2-actions{display:flex;gap:7px;flex-wrap:wrap}
      #${PANEL_ID} .v50d2-actions button{min-height:36px;padding:7px 10px;font-size:12px}
      #${PANEL_ID} .v50d2-pass{color:var(--success);font-weight:800}
      #${PANEL_ID} .v50d2-warn{color:var(--warn);font-weight:800}
      #${PANEL_ID} .v50d2-danger{color:var(--danger);font-weight:800}
      #${PANEL_ID} .v50d2-rollover{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:12px}
      #${PANEL_ID} .v50d2-check{border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--surface-soft)}
      #${PANEL_ID} .v50d2-check.pass{border-color:var(--success)}
      #${PANEL_ID} .v50d2-check.warn{border-color:var(--warn)}
      #v50d2-transfer-modal{position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:80;display:grid;place-items:center;padding:16px}
      #v50d2-transfer-modal .v50d2-modal-card{width:min(620px,100%);max-height:90vh;overflow:auto;background:var(--card);border-radius:20px;padding:20px;box-shadow:0 28px 90px rgba(0,0,0,.28)}
      #v50d2-transfer-result{margin-top:12px}
      @media(max-width:760px){#${PANEL_ID} .v50d2-toolbar{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    const tabs = document.querySelector('#teacher .tabs');
    const d1Tab = byId('v50d1-launch-readiness-tab');
    const archiveTab = byId('v50c3b-report-archive-tab');
    const analyticsPanel = byId('analytics-panel');
    const d1Panel = byId('launch-readiness-panel');
    if (!tabs || !analyticsPanel) return;

    if (!byId(TAB_ID)){
      const tab = document.createElement('button');
      tab.id = TAB_ID;
      tab.type = 'button';
      tab.className = 'tab';
      tab.dataset.panel = PANEL_ID;
      tab.textContent = 'Teacher Operations';
      (d1Tab || archiveTab || tabs.lastElementChild)?.insertAdjacentElement('afterend',tab);
    }

    if (!byId(PANEL_ID)){
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="header">
          <div><h2>Teacher Operational Tools</h2><p class="muted">Safe day-to-day roster, assignment and rollover administration. Student learning history is preserved.</p></div>
          <button id="v50d2-refresh" class="secondary" type="button">Refresh Operations</button>
        </div>
        <div id="${FEEDBACK_ID}" class="feedback hidden" aria-live="polite"></div>
        <div id="v50d2-summary-root"><div class="empty">Open this area to load teacher operations.</div></div>

        <section class="v50d2-section">
          <div class="header"><div><h3>Roster operations</h3><p class="muted">Deactivate/reactivate students or safely transfer them between classes in the same year level.</p></div></div>
          <div class="v50d2-toolbar">
            <input id="v50d2-student-search" placeholder="Search student name or ID">
            <select id="v50d2-class-filter"><option value="">All classes</option></select>
            <select id="v50d2-status-filter"><option value="">All students</option><option value="active">Active only</option><option value="inactive">Inactive only</option><option value="missing_pin">Missing PIN</option></select>
          </div>
          <div id="v50d2-roster-root"></div>
        </section>

        <section class="v50d2-section">
          <div class="header"><div><h3>Assignment operations</h3><p class="muted">Activate/deactivate assignments. Permanent deletion is allowed only when no student attempt exists.</p></div></div>
          <div class="v50d2-toolbar">
            <input id="v50d2-assignment-search" placeholder="Search assignment or class">
            <select id="v50d2-kind-filter"><option value="">Exam + Practice</option><option value="exam">Exam only</option><option value="practice">Practice only</option></select>
            <select id="v50d2-assignment-status"><option value="">All statuses</option><option value="active">Active only</option><option value="inactive">Inactive only</option><option value="unused">Unused only</option></select>
          </div>
          <div id="v50d2-assignment-root"></div>
        </section>

        <section class="v50d2-section">
          <div class="header"><div><h3>Term / year rollover preflight</h3><p class="muted">Read-only checks before any future rollover. D2 does not move students to a new year or erase history.</p></div></div>
          <div id="v50d2-rollover-root"></div>
        </section>

        <section class="v50d2-section">
          <h3>PIN administration</h3>
          <p class="muted">Existing PINs cannot be recovered from hashes. Individual PIN reset remains available in Classes & Assignments; bulk missing-PIN generation remains in Launch Readiness.</p>
          <div class="buttons"><button id="v50d2-open-launch-readiness" class="outline" type="button">Open Launch Readiness</button></div>
        </section>
      `;
      (d1Panel || analyticsPanel).insertAdjacentElement('afterend',panel);
    }

    ensureTransferModal();
  }

  function ensureTransferModal(){
    if (byId('v50d2-transfer-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'v50d2-transfer-modal';
    modal.className = 'hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','v50d2-transfer-title');
    modal.innerHTML = `
      <div class="v50d2-modal-card">
        <div class="header"><div><h3 id="v50d2-transfer-title">Transfer student</h3><p id="v50d2-transfer-student" class="muted"></p></div><button id="v50d2-transfer-close" class="outline" type="button">Close</button></div>
        <label>Target class<select id="v50d2-transfer-class"></select></label>
        <div class="buttons"><button id="v50d2-transfer-check" class="secondary" type="button">Check Transfer</button><button id="v50d2-transfer-confirm" class="primary hidden" type="button">Confirm Transfer</button></div>
        <div id="v50d2-transfer-result"></div>
      </div>`;
    document.body.appendChild(modal);
  }

  function feedback(kind,message){
    const root = byId(FEEDBACK_ID);
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }
  function clearFeedback(){ byId(FEEDBACK_ID)?.classList.add('hidden'); }

  async function loadSnapshot(){
    if (loading) return;
    clearFeedback();
    if (!cloudAvailable()){
      snapshot = null;
      renderAll();
      feedback('try','Sign in as a teacher with cloud access to use Teacher Operations.');
      return;
    }
    loading = true;
    const button = byId('v50d2-refresh');
    if (button){ button.disabled = true; button.textContent = 'Refreshing…'; }
    try {
      const {data,error} = await cloud.rpc('get_teacher_operations_v50d2');
      if (error) throw error;
      snapshot = data || null;
      renderAll();
    } catch (error){
      console.warn('Could not load teacher operations.',error);
      snapshot = null;
      renderAll();
      feedback('incorrect',`Teacher operations could not be loaded. ${error?.message||''}`.trim());
    } finally {
      loading = false;
      if (button){ button.disabled = false; button.textContent = 'Refresh Operations'; }
    }
  }

  function renderSummary(){
    const root = byId('v50d2-summary-root');
    if (!root) return;
    if (!snapshot){ root.innerHTML = '<div class="empty">Operations data is unavailable.</div>'; return; }
    const s = snapshot.summary || {};
    root.innerHTML = `<div class="v50d2-summary">
      <div class="v50d2-stat"><strong>${num(s.active_students)}</strong><span>Active students</span></div>
      <div class="v50d2-stat"><strong>${num(s.inactive_students)}</strong><span>Inactive students</span></div>
      <div class="v50d2-stat"><strong>${num(s.pin_missing)}</strong><span>Missing PINs</span></div>
      <div class="v50d2-stat"><strong>${num(s.active_practice_assignments)}</strong><span>Active Practice assignments</span></div>
      <div class="v50d2-stat"><strong>${num(s.active_exam_assignments)}</strong><span>Active Exam assignments</span></div>
      <div class="v50d2-stat"><strong>${num(s.pending_review_answers)}</strong><span>Pending review answers</span></div>
    </div>`;
  }

  function populateFilters(){
    const classes = Array.isArray(snapshot?.classes) ? snapshot.classes : [];
    const select = byId('v50d2-class-filter');
    if (select){
      const previous = select.value;
      select.innerHTML = '<option value="">All classes</option>' + classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · Year ${num(c.year_level)}</option>`).join('');
      if ([...select.options].some(o=>o.value===previous)) select.value = previous;
    }
  }

  function filteredStudents(){
    const rows = Array.isArray(snapshot?.students) ? snapshot.students : [];
    const q = String(byId('v50d2-student-search')?.value || '').trim().toLowerCase();
    const cls = byId('v50d2-class-filter')?.value || '';
    const status = byId('v50d2-status-filter')?.value || '';
    return rows.filter(row => {
      if (q && !`${row.student_name||''} ${row.student_id||''}`.toLowerCase().includes(q)) return false;
      if (cls && String(row.class_id)!==String(cls)) return false;
      if (status==='active' && row.active===false) return false;
      if (status==='inactive' && row.active!==false) return false;
      if (status==='missing_pin' && (row.active===false || row.pin_set)) return false;
      return true;
    });
  }

  function renderRoster(){
    const root = byId('v50d2-roster-root');
    if (!root) return;
    const rows = filteredStudents();
    if (!snapshot){ root.innerHTML = '<div class="empty">Roster operations unavailable.</div>'; return; }
    if (!rows.length){ root.innerHTML = '<div class="empty">No students match these filters.</div>'; return; }
    root.innerHTML = `<div class="tablewrap"><table class="v50d2-table"><thead><tr><th>Student</th><th>Class</th><th>Status</th><th>PIN</th><th>History</th><th>Actions</th></tr></thead><tbody>${rows.map(row=>`
      <tr>
        <td><strong>${esc(row.student_name)}</strong><div class="help">${esc(row.student_id)}</div></td>
        <td>${esc(row.class_name)} · Y${num(row.year_level)}</td>
        <td><span class="${row.active===false?'v50d2-warn':'v50d2-pass'}">${row.active===false?'Inactive':'Active'}</span></td>
        <td>${row.pin_set?'<span class="v50d2-pass">Set</span>':'<span class="v50d2-warn">Missing</span>'}</td>
        <td>${num(row.practice_sessions)} Practice · ${num(row.exam_attempts)} Exam${num(row.in_progress_exam_attempts)+num(row.in_progress_practice_assignments)?`<div class="v50d2-warn">${num(row.in_progress_exam_attempts)+num(row.in_progress_practice_assignments)} in progress</div>`:''}</td>
        <td><div class="v50d2-actions"><button class="outline v50d2-toggle-student" data-id="${esc(row.id)}" data-active="${row.active===false?'false':'true'}" type="button">${row.active===false?'Reactivate':'Deactivate'}</button><button class="outline v50d2-transfer-student" data-id="${esc(row.id)}" type="button">Transfer</button></div></td>
      </tr>`).join('')}</tbody></table></div>`;
    root.querySelectorAll('.v50d2-toggle-student').forEach(button=>button.addEventListener('click',()=>toggleStudent(button)));
    root.querySelectorAll('.v50d2-transfer-student').forEach(button=>button.addEventListener('click',()=>openTransfer(button.dataset.id)));
  }

  async function toggleStudent(button){
    const id = button.dataset.id;
    const currentlyActive = button.dataset.active === 'true';
    const student = (snapshot?.students||[]).find(row=>String(row.id)===String(id));
    if (!student) return;
    if (currentlyActive && !confirm(`Deactivate ${student.student_name}?\n\nTheir learning history and PIN will be preserved, but current student access tickets will be invalidated.`)) return;
    button.disabled = true;
    try {
      const {data,error} = await cloud.rpc('set_roster_student_active_v50d2',{p_roster_student_id:id,p_active:!currentlyActive});
      if (error) throw error;
      feedback('correct',`${student.student_name} ${data?.active?'reactivated':'deactivated'}. History and PIN were preserved.`);
      await refreshAfterMutation();
    } catch (error){ feedback('incorrect',`Student status could not be changed. ${error?.message||''}`.trim()); }
    finally { if (document.contains(button)) button.disabled = false; }
  }

  function openTransfer(studentId){
    const student = (snapshot?.students||[]).find(row=>String(row.id)===String(studentId));
    if (!student) return;
    const targets = (snapshot?.classes||[]).filter(c=>c.active!==false && Number(c.year_level)===Number(student.year_level) && String(c.id)!==String(student.class_id));
    transferState = {studentId, checkedTarget:null};
    byId('v50d2-transfer-student').textContent = `${student.student_name} (${student.student_id}) · currently ${student.class_name}`;
    byId('v50d2-transfer-class').innerHTML = targets.length ? targets.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · Year ${num(c.year_level)}</option>`).join('') : '<option value="">No same-year target class available</option>';
    byId('v50d2-transfer-check').disabled = !targets.length;
    byId('v50d2-transfer-confirm').classList.add('hidden');
    byId('v50d2-transfer-result').innerHTML = '';
    byId('v50d2-transfer-modal').classList.remove('hidden');
    byId('v50d2-transfer-class').focus();
  }

  function closeTransfer(){
    byId('v50d2-transfer-modal')?.classList.add('hidden');
    transferState = null;
  }

  async function checkTransfer(){
    if (!transferState) return;
    const target = byId('v50d2-transfer-class')?.value || '';
    if (!target) return;
    const button = byId('v50d2-transfer-check');
    button.disabled = true;
    try {
      const {data,error} = await cloud.rpc('transfer_roster_student_v50d2',{p_roster_student_id:transferState.studentId,p_target_class_id:target,p_confirm:false});
      if (error) throw error;
      transferState.checkedTarget = target;
      const root = byId('v50d2-transfer-result');
      if (!data?.can_transfer){
        root.innerHTML = `<div class="feedback incorrect">${esc(data?.message||'Transfer is not currently safe.')}${num(data?.in_progress_exam_attempts)+num(data?.in_progress_practice_assignments)?`<div class="help">In progress: ${num(data?.in_progress_exam_attempts)} Exam · ${num(data?.in_progress_practice_assignments)} Practice assignment</div>`:''}</div>`;
        byId('v50d2-transfer-confirm').classList.add('hidden');
      } else {
        const h = data.history || {};
        root.innerHTML = `<div class="feedback correct"><strong>Safe to transfer.</strong><div>${esc(data.message||'')}</div><div class="help" style="margin-top:7px">Preserved history: ${num(h.practice_sessions)} Practice sessions · ${num(h.exam_attempts)} Exam attempts · ${num(h.learning_days)} learning days. ${num(data.access_tickets_to_invalidate)} current access ticket(s) will be invalidated.</div></div>`;
        byId('v50d2-transfer-confirm').classList.remove('hidden');
      }
    } catch (error){ byId('v50d2-transfer-result').innerHTML = `<div class="feedback incorrect">${esc(error?.message||'Transfer preflight failed.')}</div>`; }
    finally { button.disabled = false; }
  }

  async function confirmTransfer(){
    if (!transferState?.checkedTarget) return;
    const student = (snapshot?.students||[]).find(row=>String(row.id)===String(transferState.studentId));
    const target = (snapshot?.classes||[]).find(row=>String(row.id)===String(transferState.checkedTarget));
    if (!student || !target) return;
    if (!confirm(`Transfer ${student.student_name} from ${student.class_name} to ${target.name}?\n\nHistorical results will remain attributed to their original class. Current access tickets will be invalidated.`)) return;
    const button = byId('v50d2-transfer-confirm');
    button.disabled = true;
    try {
      const {data,error} = await cloud.rpc('transfer_roster_student_v50d2',{p_roster_student_id:student.id,p_target_class_id:target.id,p_confirm:true});
      if (error) throw error;
      if (!data?.transferred) throw new Error(data?.message||'Transfer was not completed.');
      closeTransfer();
      feedback('correct',`${student.student_name} transferred to ${target.name}. Historical class attribution and PIN were preserved.`);
      await refreshAfterMutation();
    } catch (error){ byId('v50d2-transfer-result').innerHTML = `<div class="feedback incorrect">${esc(error?.message||'Transfer failed.')}</div>`; }
    finally { if (button) button.disabled = false; }
  }

  function filteredAssignments(){
    const rows = Array.isArray(snapshot?.assignments) ? snapshot.assignments : [];
    const q = String(byId('v50d2-assignment-search')?.value || '').trim().toLowerCase();
    const kind = byId('v50d2-kind-filter')?.value || '';
    const status = byId('v50d2-assignment-status')?.value || '';
    return rows.filter(row=>{
      if (q && !`${row.title||''} ${row.class_name||''}`.toLowerCase().includes(q)) return false;
      if (kind && row.kind!==kind) return false;
      if (status==='active' && row.active===false) return false;
      if (status==='inactive' && row.active!==false) return false;
      if (status==='unused' && num(row.attempt_count)!==0) return false;
      return true;
    });
  }

  function renderAssignments(){
    const root = byId('v50d2-assignment-root');
    if (!root) return;
    if (!snapshot){ root.innerHTML = '<div class="empty">Assignment operations unavailable.</div>'; return; }
    const rows = filteredAssignments();
    if (!rows.length){ root.innerHTML = '<div class="empty">No assignments match these filters.</div>'; return; }
    root.innerHTML = `<div class="tablewrap"><table class="v50d2-table"><thead><tr><th>Type</th><th>Assignment</th><th>Class</th><th>Status</th><th>Attempts</th><th>Actions</th></tr></thead><tbody>${rows.map(row=>`
      <tr><td>${row.kind==='exam'?'Exam':'Practice'}</td><td><strong>${esc(row.title)}</strong>${row.kind==='practice'&&num(row.recipient_count)?`<div class="help">${num(row.recipient_count)} targeted recipient(s)</div>`:''}</td><td>${esc(row.class_name)} · Y${num(row.year_level)}</td><td><span class="${row.active===false?'v50d2-warn':'v50d2-pass'}">${row.active===false?'Inactive':'Active'}</span></td><td>${num(row.attempt_count)}</td><td><div class="v50d2-actions"><button class="outline v50d2-toggle-assignment" data-kind="${esc(row.kind)}" data-id="${esc(row.id)}" data-active="${row.active===false?'false':'true'}" type="button">${row.active===false?'Activate':'Deactivate'}</button><button class="outline v50d2-delete-assignment" data-kind="${esc(row.kind)}" data-id="${esc(row.id)}" type="button">Delete if unused</button></div></td></tr>`).join('')}</tbody></table></div>`;
    root.querySelectorAll('.v50d2-toggle-assignment').forEach(button=>button.addEventListener('click',()=>toggleAssignment(button)));
    root.querySelectorAll('.v50d2-delete-assignment').forEach(button=>button.addEventListener('click',()=>deleteAssignment(button)));
  }

  async function toggleAssignment(button){
    const row = (snapshot?.assignments||[]).find(a=>String(a.id)===String(button.dataset.id)&&a.kind===button.dataset.kind);
    if (!row) return;
    const currentlyActive = button.dataset.active==='true';
    const action = currentlyActive ? 'deactivate' : 'activate';
    if (currentlyActive && !confirm(`Deactivate ${row.kind} assignment “${row.title}” for ${row.class_name}?\n\nExisting student attempt history will be preserved.`)) return;
    button.disabled = true;
    try {
      const {error} = await cloud.rpc('manage_teacher_assignment_v50d2',{p_kind:row.kind,p_assignment_id:row.id,p_action:action,p_confirm:false});
      if (error) throw error;
      feedback('correct',`${row.title} ${action==='activate'?'activated':'deactivated'}. Attempt history was preserved.`);
      await refreshAfterMutation();
    } catch (error){ feedback('incorrect',`Assignment status could not be changed. ${error?.message||''}`.trim()); }
    finally { if (document.contains(button)) button.disabled = false; }
  }

  async function deleteAssignment(button){
    const row = (snapshot?.assignments||[]).find(a=>String(a.id)===String(button.dataset.id)&&a.kind===button.dataset.kind);
    if (!row) return;
    button.disabled = true;
    try {
      const preflight = await cloud.rpc('manage_teacher_assignment_v50d2',{p_kind:row.kind,p_assignment_id:row.id,p_action:'delete',p_confirm:false});
      if (preflight.error) throw preflight.error;
      const data = preflight.data || {};
      if (!data.can_delete){
        alert(`${data.message||'This assignment cannot be deleted.'}\n\nStudent attempts: ${num(data.attempt_count)}`);
        return;
      }
      if (!confirm(`Permanently delete unused ${row.kind} assignment “${row.title}” for ${row.class_name}?\n\nNo student attempt exists. This removes only the assignment definition and cannot be undone.`)) return;
      const result = await cloud.rpc('manage_teacher_assignment_v50d2',{p_kind:row.kind,p_assignment_id:row.id,p_action:'delete',p_confirm:true});
      if (result.error) throw result.error;
      if (!result.data?.deleted) throw new Error(result.data?.message||'Assignment was not deleted.');
      feedback('correct',`${row.title} deleted. No student attempt history was removed.`);
      await refreshAfterMutation();
    } catch (error){ feedback('incorrect',`Assignment could not be deleted. ${error?.message||''}`.trim()); }
    finally { if (document.contains(button)) button.disabled = false; }
  }

  function renderRollover(){
    const root = byId('v50d2-rollover-root');
    if (!root) return;
    if (!snapshot){ root.innerHTML = '<div class="empty">Rollover preflight unavailable.</div>'; return; }
    const s = snapshot.summary || {};
    const checks = [
      ['In-progress Exam attempts',num(s.in_progress_exam_attempts), 'Close or complete these before rollover.'],
      ['In-progress Practice assignments',num(s.in_progress_practice_attempts),'Complete or close these before moving students.'],
      ['Pending manual review answers',num(s.pending_review_answers),'Finish manual review before final reporting.'],
      ['Active Exam assignments',num(s.active_exam_assignments),'Deactivate assignments that should not carry forward.'],
      ['Active Practice assignments',num(s.active_practice_assignments),'Deactivate assignments that should not carry forward.']
    ];
    const attention = checks.reduce((sum,row)=>sum+num(row[1]),0);
    root.innerHTML = `<div class="info"><strong>${attention===0?'Preflight clear':'Preparation still needed'}</strong> · This is informational only. No roster or history changes are performed here.</div><div class="v50d2-rollover">${checks.map(([label,value,detail])=>`<div class="v50d2-check ${value===0?'pass':'warn'}"><strong>${value===0?'✅':'⚠️'} ${esc(label)}</strong><div>${num(value)} detected</div><div class="help">${esc(detail)}</div></div>`).join('')}</div><div class="help" style="margin-top:12px">Stored student-history rows: ${num(s.student_history_total)} · Saved report archives: ${num(s.report_archives)}. D2 does not erase either.</div>`;
  }

  function renderAll(){
    renderSummary();
    populateFilters();
    renderRoster();
    renderAssignments();
    renderRollover();
  }

  async function refreshAfterMutation(){
    await loadSnapshot();
    try { if (typeof loadTeacher==='function') await loadTeacher(); } catch {}
  }

  function activatePanel(){
    const tab = byId(TAB_ID), panel = byId(PANEL_ID);
    if (!tab || !panel) return;
    document.querySelectorAll('#teacher .tab').forEach(item=>item.classList.remove('active'));
    document.querySelectorAll('#teacher .panel').forEach(item=>item.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    loadSnapshot();
  }

  function openLaunchReadiness(){
    const tab = byId('v50d1-launch-readiness-tab');
    if (tab) tab.click();
    else feedback('try','Launch Readiness is not available on this page.');
  }

  function wire(){
    injectStyles();
    ensurePanel();
    document.querySelector('#teacher .tabs')?.addEventListener('click',event=>{
      const clicked = event.target.closest('.tab');
      if (!clicked) return;
      if (clicked.id===TAB_ID){ event.preventDefault(); activatePanel(); }
      else { byId(TAB_ID)?.classList.remove('active'); byId(PANEL_ID)?.classList.remove('active'); }
    });
    byId('v50d2-refresh')?.addEventListener('click',loadSnapshot);
    ['v50d2-student-search','v50d2-class-filter','v50d2-status-filter'].forEach(id=>byId(id)?.addEventListener(id.includes('search')?'input':'change',renderRoster));
    ['v50d2-assignment-search','v50d2-kind-filter','v50d2-assignment-status'].forEach(id=>byId(id)?.addEventListener(id.includes('search')?'input':'change',renderAssignments));
    byId('v50d2-transfer-close')?.addEventListener('click',closeTransfer);
    byId('v50d2-transfer-check')?.addEventListener('click',checkTransfer);
    byId('v50d2-transfer-confirm')?.addEventListener('click',confirmTransfer);
    byId('v50d2-transfer-class')?.addEventListener('change',()=>{ if(transferState) transferState.checkedTarget=null; byId('v50d2-transfer-confirm')?.classList.add('hidden'); byId('v50d2-transfer-result').innerHTML=''; });
    byId('v50d2-open-launch-readiness')?.addEventListener('click',openLaunchReadiness);
    byId('v50d2-transfer-modal')?.addEventListener('click',event=>{ if(event.target.id==='v50d2-transfer-modal') closeTransfer(); });
    document.addEventListener('keydown',event=>{ if(event.key==='Escape' && !byId('v50d2-transfer-modal')?.classList.contains('hidden')) closeTransfer(); });
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
