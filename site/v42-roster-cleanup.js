/* V4.2C — Roster Management & Cleanup.
   Adds a teacher-only Delete control beside existing Deactivate/Reactivate and
   PIN controls. Permanent deletion is allowed only after the server verifies
   that the roster record has no linked or matching learning history. */
(() => {
  'use strict';

  const STYLE_ID = 'v42c-roster-cleanup-style';

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #roster-list .v42c-delete-student{
        border-color:color-mix(in srgb,#c62828 55%,var(--border));
        color:#b42318;
      }

      #roster-list .v42c-delete-student:hover:not(:disabled){
        background:color-mix(in srgb,#c62828 8%,var(--card));
        border-color:#b42318;
      }

      html[data-theme="dark"] #roster-list .v42c-delete-student{
        color:#ff8a80;
        border-color:color-mix(in srgb,#ff8a80 55%,var(--border));
      }

      @media(max-width:620px){
        #roster-list .roster-row{
          gap:8px;
        }
        #roster-list .v42c-delete-student{
          min-width:92px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function studentForId(id){
    if (typeof teacherStudents === 'undefined' || !Array.isArray(teacherStudents)) return null;
    return teacherStudents.find(student => String(student?.id) === String(id)) || null;
  }

  function historySummary(history){
    const h = history && typeof history === 'object' ? history : {};
    const labels = [
      ['practice_sessions','Practice sessions'],
      ['exam_attempts','Exam attempts'],
      ['practice_assignment_attempts','Practice assignments'],
      ['ai_help_interactions','AI Help interactions'],
      ['learning_days','Learning activity days'],
      ['teacher_messages','Teacher messages']
    ];

    const rows = labels
      .map(([key,label]) => [label, Number(h[key] || 0)])
      .filter(([,count]) => count > 0);

    if (!rows.length) return '';
    return '\n\nExisting history:\n' + rows.map(([label,count]) => `• ${label}: ${count}`).join('\n');
  }

  async function callDeleteRpc(id, confirmed){
    if (
      typeof cloudReady === 'undefined' || !cloudReady ||
      typeof teacherUser === 'undefined' || !teacherUser ||
      typeof cloud === 'undefined' || !cloud
    ) {
      throw new Error('Teacher cloud access is not ready.');
    }

    const { data, error } = await cloud.rpc('delete_unused_roster_student', {
      p_roster_student_id: id,
      p_confirm: !!confirmed
    });

    if (error) throw error;
    return data || {};
  }

  async function deleteRosterStudent(id, button){
    const student = studentForId(id);
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Checking…';

    try {
      const preflight = await callDeleteRpc(id, false);

      if (!preflight?.can_delete) {
        alert(
          `${preflight?.message || 'This student cannot be permanently deleted.'}` +
          historySummary(preflight?.history)
        );
        return;
      }

      const name = preflight.student_name || student?.student_name || 'this student';
      const studentId = preflight.student_id || student?.student_id || '';
      const identity = studentId ? `${name} (${studentId})` : name;

      const approved = confirm(
        `Permanently delete ${identity}?\n\n` +
        'This is only intended for mistaken or unused roster records. This action cannot be undone.'
      );

      if (!approved) return;

      button.textContent = 'Deleting…';
      const result = await callDeleteRpc(id, true);

      if (!result?.deleted) {
        alert(
          `${result?.message || 'The student was not deleted.'}` +
          historySummary(result?.history)
        );
        return;
      }

      if (typeof classFeedback === 'function') {
        classFeedback('correct', `${name} was permanently deleted from the roster.`);
      }

      if (typeof loadTeacher === 'function') {
        await loadTeacher();
      } else {
        button.closest('.roster-row')?.remove();
      }
    } catch (error) {
      console.warn('Could not delete roster student.', error);
      alert(`Student could not be deleted. ${error?.message || ''}`.trim());
    } finally {
      if (document.contains(button)) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function decorateRoster(){
    const root = document.getElementById('roster-list');
    if (!root) return;

    root.querySelectorAll('.roster-row').forEach(row => {
      if (row.querySelector('.v42c-delete-student')) return;

      const toggle = row.querySelector('.toggle-student[data-id]');
      const id = toggle?.dataset?.id;
      if (!id) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline v42c-delete-student';
      button.textContent = 'Delete';
      button.title = 'Permanently delete this student only if the record has no learning history.';
      button.setAttribute('aria-label', 'Delete unused student record');
      button.addEventListener('click', () => deleteRosterStudent(id, button));

      row.appendChild(button);
    });
  }

  function wireRosterCleanup(){
    const root = document.getElementById('roster-list');
    if (!root || root.dataset.v42cRosterCleanup === '1') return;

    root.dataset.v42cRosterCleanup = '1';
    const observer = new MutationObserver(() => decorateRoster());
    observer.observe(root, { childList:true, subtree:true });

    document.querySelector('[data-panel="classes-panel"]')?.addEventListener('click', decorateRoster);
    decorateRoster();
  }

  function apply(){
    injectStyles();
    wireRosterCleanup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once:true });
  } else {
    apply();
  }
})();
