/* V4.8C — Practice Deadline Follow-Up.
   Adds teacher-controlled target-date adjustment to the existing V4.8A deadline
   monitor. Reuses practice_assignments.closes_at; target dates remain guidance only. */
(() => {
  'use strict';

  const STYLE_ID = 'v48c-deadline-follow-up-style';
  const PANEL_ID = 'v48a-deadline-monitoring';
  let panelObserver = null;
  let decorateQueued = false;

  function text(value){ return String(value ?? '').trim(); }

  function html(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} .v48c-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
      #${PANEL_ID} .v48c-editor{
        margin-top:9px;
        border:1px solid var(--border);
        border-radius:11px;
        padding:10px;
        background:var(--surface-soft,var(--card));
      }
      #${PANEL_ID} .v48c-editor-grid{display:grid;grid-template-columns:minmax(210px,1fr) auto;gap:8px;align-items:end}
      #${PANEL_ID} .v48c-editor label{margin:0}
      #${PANEL_ID} .v48c-editor-buttons{display:flex;gap:7px;flex-wrap:wrap}
      #${PANEL_ID} .v48c-editor-feedback{margin-top:7px;font-size:12px}
      #${PANEL_ID} .v48c-editor-feedback.error{color:var(--danger,#b42318)}
      #${PANEL_ID} .v48c-editor-feedback.ok{color:var(--success,#1f7a45)}
      @media(max-width:700px){
        #${PANEL_ID} .v48c-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}
        #${PANEL_ID} .v48c-actions button{width:100%}
        #${PANEL_ID} .v48c-editor-grid{grid-template-columns:1fr}
        #${PANEL_ID} .v48c-editor-buttons{display:grid;grid-template-columns:1fr 1fr}
        #${PANEL_ID} .v48c-editor-buttons button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function localInputValue(value){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  }

  function setFeedback(editor,message,kind=''){
    const root = editor?.querySelector('.v48c-editor-feedback');
    if (!root) return;
    root.className = `v48c-editor-feedback ${kind}`.trim();
    root.textContent = message || '';
  }

  async function fetchAssignment(id){
    if (typeof cloud === 'undefined' || !cloud) throw new Error('Teacher connection is unavailable.');
    const {data,error} = await cloud.from('practice_assignments')
      .select('id,opens_at,closes_at,active')
      .eq('id',id)
      .limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) throw new Error('Practice assignment could not be found.');
    return row;
  }

  async function refreshExistingAssignmentUI(){
    try {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch (error){
      console.warn('V4.8C could not refresh class admin.',error);
    }
    queueDecorate(180);
    queueDecorate(550);
  }

  async function saveTarget(editor,assignment,value){
    const save = editor.querySelector('.v48c-save');
    const clear = editor.querySelector('.v48c-clear');
    const cancel = editor.querySelector('.v48c-cancel');
    [save,clear,cancel].forEach(button => { if (button) button.disabled = true; });
    setFeedback(editor,value ? 'Saving target date…' : 'Clearing target date…');

    try {
      const payload = {
        closes_at:value,
        updated_at:new Date().toISOString()
      };
      const {error} = await cloud.from('practice_assignments')
        .update(payload)
        .eq('id',assignment.id);
      if (error) throw error;
      setFeedback(editor,value ? 'Target due date updated.' : 'Target due date cleared.','ok');
      await refreshExistingAssignmentUI();
    } catch (error){
      setFeedback(editor,error?.message || String(error),'error');
      [save,clear,cancel].forEach(button => { if (button) button.disabled = false; });
    }
  }

  async function openEditor(row,button){
    row.querySelector('.v48c-editor')?.remove();
    button.disabled = true;
    const previousLabel = button.textContent;
    button.textContent = 'Loading…';

    try {
      const assignment = await fetchAssignment(button.dataset.id || '');
      const editor = document.createElement('div');
      editor.className = 'v48c-editor';
      editor.innerHTML = `
        <div class="v48c-editor-grid">
          <label>Target due date
            <input class="v48c-target-input" type="datetime-local" value="${html(localInputValue(assignment.closes_at))}">
            <span class="help">This is a follow-up target only. Students can still complete Practice after it passes.</span>
          </label>
          <div class="v48c-editor-buttons">
            <button type="button" class="primary v48c-save">Save target</button>
            <button type="button" class="outline v48c-clear">Clear due date</button>
            <button type="button" class="outline v48c-cancel">Cancel</button>
          </div>
        </div>
        <div class="v48c-editor-feedback" aria-live="polite"></div>`;

      const main = row.querySelector('.v48a-row-main') || row;
      main.appendChild(editor);

      editor.querySelector('.v48c-cancel')?.addEventListener('click',() => editor.remove());
      editor.querySelector('.v48c-clear')?.addEventListener('click',() => saveTarget(editor,assignment,null));
      editor.querySelector('.v48c-save')?.addEventListener('click',() => {
        const raw = text(editor.querySelector('.v48c-target-input')?.value);
        if (!raw){
          setFeedback(editor,'Choose a target date and time, or use Clear due date.','error');
          return;
        }
        const due = new Date(raw);
        if (Number.isNaN(due.getTime())){
          setFeedback(editor,'Choose a valid target date and time.','error');
          return;
        }
        if (assignment.opens_at){
          const opens = new Date(assignment.opens_at);
          if (!Number.isNaN(opens.getTime()) && due.getTime() <= opens.getTime()){
            setFeedback(editor,'Target due date must be after the suggested start.','error');
            return;
          }
        }
        saveTarget(editor,assignment,due.toISOString());
      });
    } catch (error){
      const main = row.querySelector('.v48a-row-main') || row;
      const message = document.createElement('div');
      message.className = 'help';
      message.textContent = `Could not open target editor: ${error?.message || error}`;
      main.appendChild(message);
      setTimeout(() => message.remove(),3500);
    } finally {
      if (document.contains(button)){
        button.disabled = false;
        button.textContent = previousLabel;
      }
    }
  }

  function decorate(){
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.querySelectorAll('.v48a-row[data-assignment-id]').forEach(row => {
      if (row.dataset.v48cFollowUp === '1') return;
      const review = row.querySelector('.v48a-review[data-id]');
      if (!review) return;

      row.dataset.v48cFollowUp = '1';
      const actions = document.createElement('div');
      actions.className = 'v48c-actions';
      review.replaceWith(actions);
      actions.appendChild(review);

      const adjust = document.createElement('button');
      adjust.type = 'button';
      adjust.className = 'outline v48c-adjust';
      adjust.dataset.id = review.dataset.id || row.dataset.assignmentId || '';
      adjust.textContent = 'Adjust target';
      adjust.addEventListener('click',() => openEditor(row,adjust));
      actions.appendChild(adjust);
    });
  }

  function queueDecorate(delay=0){
    window.setTimeout(() => {
      if (decorateQueued) return;
      decorateQueued = true;
      window.requestAnimationFrame(() => {
        decorateQueued = false;
        wirePanelObserver();
        decorate();
      });
    },delay);
  }

  function wirePanelObserver(){
    const panel = document.getElementById(PANEL_ID);
    if (!panel || panel.dataset.v48cWatch === '1') return;
    panel.dataset.v48cWatch = '1';
    panelObserver?.disconnect();
    panelObserver = new MutationObserver(() => queueDecorate(40));
    panelObserver.observe(panel,{childList:true,subtree:true});
  }

  function wire(){
    injectStyles();
    document.getElementById('teacher')?.addEventListener('click',() => {
      queueDecorate(120);
      queueDecorate(450);
    },true);
    queueDecorate(120);
    queueDecorate(450);
    queueDecorate(900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
