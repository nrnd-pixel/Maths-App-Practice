/* V5.0 launch roster maintenance — edit an existing roster identity in place. */
(() => {
  'use strict';

  if (window.__v50RosterEditInstalled) return;
  window.__v50RosterEditInstalled = true;

  const MODAL_ID = 'v50-roster-edit-modal';
  let activeStudent = null;
  let rootObserver = null;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function setFeedback(kind,message){
    const root = byId('v50d2-operations-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function ensureModal(){
    if (byId(MODAL_ID)) return;
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','v50-roster-edit-title');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:90;display:grid;place-items:center;padding:16px';
    modal.innerHTML = `
      <div style="width:min(560px,100%);max-height:90vh;overflow:auto;background:var(--card);border-radius:20px;padding:20px;box-shadow:0 28px 90px rgba(0,0,0,.28)">
        <div class="header">
          <div><h3 id="v50-roster-edit-title">Edit student</h3><p id="v50-roster-edit-class" class="muted"></p></div>
          <button id="v50-roster-edit-close" class="outline" type="button">Close</button>
        </div>
        <div class="grid">
          <label>Student ID<input id="v50-roster-edit-id" maxlength="40" autocomplete="off"><span class="help">Must be unique among active students.</span></label>
          <label>Student name<input id="v50-roster-edit-name" maxlength="80" autocomplete="off"><span class="help">Correct the official roster name.</span></label>
        </div>
        <div class="info">This updates the existing roster record in place. Class, roster UUID and PIN hash are preserved. Student ID changes are blocked once learning history exists.</div>
        <div class="buttons"><button id="v50-roster-edit-save" class="primary" type="button">Save Changes</button></div>
      </div>`;
    document.body.appendChild(modal);
    byId('v50-roster-edit-close').addEventListener('click',closeModal);
    byId('v50-roster-edit-save').addEventListener('click',saveChanges);
    modal.addEventListener('click',event=>{ if (event.target===modal) closeModal(); });
    document.addEventListener('keydown',event=>{ if (event.key==='Escape' && !modal.classList.contains('hidden')) closeModal(); });
  }

  function openModal(button){
    const row = button.closest('tr');
    if (!row) return;
    const name = row.querySelector('td:first-child strong')?.textContent?.trim() || '';
    const studentId = row.querySelector('td:first-child .help')?.textContent?.trim() || '';
    const classLabel = row.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
    activeStudent = { id:button.dataset.id, name, studentId, classLabel };
    byId('v50-roster-edit-name').value = name;
    byId('v50-roster-edit-id').value = studentId;
    byId('v50-roster-edit-class').textContent = classLabel;
    byId(MODAL_ID).classList.remove('hidden');
    byId('v50-roster-edit-name').focus();
  }

  function closeModal(){
    byId(MODAL_ID)?.classList.add('hidden');
    activeStudent = null;
  }

  async function saveChanges(){
    if (!activeStudent) return;
    const studentId = byId('v50-roster-edit-id').value.trim();
    const studentName = byId('v50-roster-edit-name').value.trim();
    if (!studentId || studentId.length > 40){
      alert('Student ID must contain 1 to 40 characters.');
      return;
    }
    if (!studentName || studentName.length > 80){
      alert('Student name must contain 1 to 80 characters.');
      return;
    }
    if (studentId===activeStudent.studentId && studentName===activeStudent.name){
      closeModal();
      return;
    }
    if (studentId.toLowerCase()!==activeStudent.studentId.toLowerCase()){
      const ok = confirm(`Change Student ID from "${activeStudent.studentId}" to "${studentId}"?\n\nThis keeps the same roster record and PIN. Student ID changes are allowed only when no learning history exists.`);
      if (!ok) return;
    }

    const button = byId('v50-roster-edit-save');
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      if (!cloudReady || !cloud || !teacherUser) throw new Error('Teacher cloud access is required.');
      const {data,error} = await cloud.rpc('edit_roster_student_identity_v50',{
        p_roster_student_id:activeStudent.id,
        p_student_id:studentId,
        p_student_name:studentName
      });
      if (error) throw error;
      const changedId = !!data?.student_id_changed;
      closeModal();
      setFeedback('correct',changedId
        ? `Student updated. Student ID is now ${studentId}; roster record and PIN were preserved.`
        : `Student name updated to ${studentName}.`);
      byId('v50d2-refresh')?.click();
    } catch (error){
      alert(error?.message || 'Could not update the student.');
    } finally {
      button.disabled = false;
      button.textContent = 'Save Changes';
    }
  }

  function enhanceRoster(){
    const root = byId('v50d2-roster-root');
    if (!root) return false;
    root.querySelectorAll('.v50d2-actions').forEach(actions=>{
      if (actions.querySelector('.v50d2-edit-student')) return;
      const source = actions.querySelector('[data-id]');
      if (!source?.dataset.id) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline v50d2-edit-student';
      button.dataset.id = source.dataset.id;
      button.textContent = 'Edit';
      button.addEventListener('click',()=>openModal(button));
      actions.prepend(button);
    });
    return true;
  }

  function attach(){
    ensureModal();
    const root = byId('v50d2-roster-root');
    if (!root) return false;
    enhanceRoster();
    if (!rootObserver){
      rootObserver = new MutationObserver(()=>enhanceRoster());
      rootObserver.observe(root,{childList:true,subtree:true});
    }
    return true;
  }

  if (!attach()){
    const observer = new MutationObserver(()=>{
      if (attach()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
