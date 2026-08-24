/* V4.8B — Student Deadline Experience.
   Adds student-facing deadline urgency around the existing secure Practice
   assignment cards. Reuses existing assignment timing data and start actions. */
(() => {
  'use strict';

  const STYLE_ID = 'v48b-student-deadline-style';
  const SUMMARY_ID = 'v48b-student-deadline-summary';
  let cachedAssignments = [];
  let lastSignature = '';
  let refreshBusy = false;
  let refreshQueued = false;

  function text(value){ return String(value ?? '').trim(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SUMMARY_ID}{
        border:1px solid var(--border);
        border-radius:14px;
        padding:12px 14px;
        background:var(--surface-soft,var(--card));
        margin:0 0 12px;
      }
      #${SUMMARY_ID} .v48b-summary-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
      #${SUMMARY_ID} h3{margin:0 0 3px;font-size:1rem}
      #${SUMMARY_ID} .v48b-summary-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      .v48b-deadline-chip{display:inline-flex;align-items:center;gap:5px;font-weight:700;white-space:nowrap}
      .v48b-deadline-overdue{border-color:color-mix(in srgb,var(--danger,#c0392b) 48%,var(--border))!important;background:color-mix(in srgb,var(--danger,#c0392b) 7%,var(--card))!important}
      .v48b-deadline-today{border-color:color-mix(in srgb,var(--warning,#b7791f) 45%,var(--border))!important}
      .v48b-deadline-soon{border-color:color-mix(in srgb,var(--primary) 38%,var(--border))!important}
      .v48b-deadline-note{margin-top:7px}
      @media(max-width:700px){
        #${SUMMARY_ID} .v48b-summary-head{display:block}
        .v48b-deadline-chip{white-space:normal}
      }
    `;
    document.head.appendChild(style);
  }

  function localDayKey(value){
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function deadlineState(row, nowMs=Date.now()){
    if (!row || row.status === 'completed') return {key:'completed',label:'Completed',rank:9};
    if (!row.closes_at) return {key:'none',label:'No due date',rank:5};
    const dueMs = Date.parse(row.closes_at);
    if (!Number.isFinite(dueMs)) return {key:'none',label:'No due date',rank:5};
    const diff = dueMs - nowMs;
    if (diff < 0) return {key:'overdue',label:'Overdue',rank:0};
    if (localDayKey(dueMs) === localDayKey(nowMs)) return {key:'today',label:'Due today',rank:1};
    if (diff <= 48 * 60 * 60 * 1000) return {key:'soon',label:'Due soon',rank:2};
    return {key:'later',label:'Due later',rank:4};
  }

  function dueLabel(value){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([],{
      weekday:'short',
      day:'numeric',
      month:'short',
      hour:'numeric',
      minute:'2-digit'
    });
  }

  function cardSignature(){
    const section = document.getElementById('v42b-student-practice-assignments');
    if (!section) return '';
    const startIds = [...section.querySelectorAll('.v42b-start-practice-assignment[data-id]')]
      .map(button => text(button.dataset.id)).filter(Boolean).sort();
    const results = section.querySelectorAll('.v42b-view-practice-result').length;
    return `${startIds.join('|')}::${results}`;
  }

  async function fetchAssignments(){
    if (typeof cloud === 'undefined' || !cloud || typeof validateStudentAccess !== 'function') return [];
    const access = await validateStudentAccess('practice');
    if (!access?.access_token) return [];
    const {data,error} = await cloud.rpc('get_student_practice_assignments',{p_access_token:access.access_token});
    if (error) throw error;
    return Array.isArray(data?.assignments) ? data.assignments : [];
  }

  function renderSummary(rows){
    const section = document.getElementById('v42b-student-practice-assignments');
    const grid = section?.querySelector('.v42b-assignment-grid');
    if (!section || !grid) return;

    let root = document.getElementById(SUMMARY_ID);
    if (!root){
      root = document.createElement('div');
      root.id = SUMMARY_ID;
      grid.insertAdjacentElement('beforebegin',root);
    }

    const outstanding = rows.filter(row => row?.status !== 'completed');
    const states = outstanding.map(row => deadlineState(row));
    const overdue = states.filter(state => state.key === 'overdue').length;
    const today = states.filter(state => state.key === 'today').length;
    const soon = states.filter(state => state.key === 'soon').length;
    const noDue = states.filter(state => state.key === 'none').length;

    root.innerHTML = `
      <div class="v48b-summary-head">
        <div>
          <h3>⏱️ Your Practice deadlines</h3>
          <div class="help">Target dates help you decide what to finish first.</div>
        </div>
        <span class="tag">${outstanding.length} outstanding</span>
      </div>
      <div class="v48b-summary-chips">
        <span class="tag">${overdue} overdue</span>
        <span class="tag">${today} due today</span>
        <span class="tag">${soon} due soon</span>
        <span class="tag">${noDue} without due date</span>
      </div>
      ${overdue ? '<div class="help v48b-deadline-note">An overdue Practice target is still available to complete.</div>' : ''}
    `;
  }

  function decorateCards(rows){
    const section = document.getElementById('v42b-student-practice-assignments');
    if (!section) return;
    const byId = new Map(rows.map(row => [String(row?.assignment_id ?? row?.id ?? ''),row]));

    section.querySelectorAll('.v42b-student-card').forEach(card => {
      card.querySelector('.v48b-deadline-chip')?.remove();
      card.classList.remove('v48b-deadline-overdue','v48b-deadline-today','v48b-deadline-soon');

      const button = card.querySelector('.v42b-start-practice-assignment[data-id]');
      if (!button) return;
      const row = byId.get(String(button.dataset.id));
      if (!row) return;

      const state = deadlineState(row);
      const chip = document.createElement('span');
      chip.className = `tag v48b-deadline-chip`;
      const due = dueLabel(row.closes_at);
      chip.textContent = state.key === 'none' ? 'No due date' : `${state.label}${due ? ` · ${due}` : ''}`;

      if (state.key === 'overdue'){
        chip.classList.add('availability-off');
        card.classList.add('v48b-deadline-overdue');
      } else if (state.key === 'today'){
        card.classList.add('v48b-deadline-today');
      } else if (state.key === 'soon'){
        card.classList.add('v48b-deadline-soon');
      }

      const head = card.querySelector('.v42b-student-card-head');
      if (head) head.appendChild(chip);
    });
  }

  function applyDecorations(){
    if (!cachedAssignments.length && !document.getElementById('v42b-student-practice-assignments')) return;
    renderSummary(cachedAssignments);
    decorateCards(cachedAssignments);
  }

  async function refresh(){
    const section = document.getElementById('v42b-student-practice-assignments');
    if (!section) return;
    if (refreshBusy){ refreshQueued = true; return; }

    const signature = cardSignature();
    if (signature && signature === lastSignature && cachedAssignments.length){
      applyDecorations();
      return;
    }

    refreshBusy = true;
    try {
      cachedAssignments = await fetchAssignments();
      lastSignature = cardSignature();
      applyDecorations();
    } catch (error){
      console.warn('Could not refresh V4.8B Practice deadlines.',error);
    } finally {
      refreshBusy = false;
      if (refreshQueued){
        refreshQueued = false;
        setTimeout(refresh,80);
      }
    }
  }

  function watchForStudentAssignments(){
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const section = document.getElementById('v42b-student-practice-assignments');
      if (section){
        clearInterval(timer);
        refresh();
        const observer = new MutationObserver(() => setTimeout(refresh,80));
        observer.observe(section,{childList:true,subtree:true});
      } else if (tries >= 120){
        clearInterval(timer);
      }
    },250);
  }

  injectStyles();
  watchForStudentAssignments();
  setInterval(() => {
    if (cachedAssignments.length) applyDecorations();
  },60 * 1000);
})();
