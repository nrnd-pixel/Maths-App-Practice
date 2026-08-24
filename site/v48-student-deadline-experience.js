/* V4.8B — Student Deadline Experience.
   Adds student-facing deadline urgency around the already-rendered secure
   Practice assignment cards. Does not make a second assignment-data request. */
(() => {
  'use strict';

  const STYLE_ID = 'v48b-student-deadline-style';
  const SUMMARY_ID = 'v48b-student-deadline-summary';
  let lastSignature = '';

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

  function dueTextFromCard(card){
    const helpText = [...card.querySelectorAll('.help')].map(node => text(node.textContent)).join(' · ');
    const matches = [...helpText.matchAll(/Target due\s+(?!passed\b)([^·\n]+)/gi)];
    return matches.length ? text(matches[matches.length-1][1]) : '';
  }

  function deadlineState(card, nowMs=Date.now()){
    const cardText = text(card?.textContent);
    const dueText = dueTextFromCard(card);
    const dueMs = dueText ? Date.parse(dueText) : NaN;

    if (/Target due passed/i.test(cardText)){
      return {key:'overdue',label:'Overdue',dueText,dueMs:Number.isFinite(dueMs)?dueMs:null};
    }
    if (!dueText || !Number.isFinite(dueMs)){
      return {key:'none',label:'No due date',dueText:'',dueMs:null};
    }

    const diff = dueMs - nowMs;
    if (diff < 0) return {key:'overdue',label:'Overdue',dueText,dueMs};
    if (localDayKey(dueMs) === localDayKey(nowMs)) return {key:'today',label:'Due today',dueText,dueMs};
    if (diff <= 48 * 60 * 60 * 1000) return {key:'soon',label:'Due soon',dueText,dueMs};
    return {key:'later',label:'Due later',dueText,dueMs};
  }

  function cardSignature(){
    const section = document.getElementById('v42b-student-practice-assignments');
    if (!section) return '';
    const cards = [...section.querySelectorAll('.v42b-student-card')];
    return cards.map(card => {
      const button = card.querySelector('.v42b-start-practice-assignment[data-id]');
      const result = card.querySelector('.v42b-view-practice-result');
      const help = [...card.querySelectorAll('.help')].map(node => text(node.textContent)).join('|');
      return `${button?.dataset.id || ''}:${result?'done':'open'}:${help}`;
    }).join('||');
  }

  function renderSummary(states){
    const section = document.getElementById('v42b-student-practice-assignments');
    const grid = section?.querySelector('.v42b-assignment-grid');
    if (!section || !grid) return;

    let root = document.getElementById(SUMMARY_ID);
    if (!root){
      root = document.createElement('div');
      root.id = SUMMARY_ID;
      grid.insertAdjacentElement('beforebegin',root);
    }

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
        <span class="tag">${states.length} outstanding</span>
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

  function decorate(){
    const section = document.getElementById('v42b-student-practice-assignments');
    if (!section) return;

    const openCards = [...section.querySelectorAll('.v42b-student-card')]
      .filter(card => card.querySelector('.v42b-start-practice-assignment[data-id]'));

    const states = [];
    openCards.forEach(card => {
      card.querySelector('.v48b-deadline-chip')?.remove();
      card.classList.remove('v48b-deadline-overdue','v48b-deadline-today','v48b-deadline-soon');

      const state = deadlineState(card);
      states.push(state);

      const chip = document.createElement('span');
      chip.className = 'tag v48b-deadline-chip';
      chip.textContent = state.key === 'none'
        ? 'No due date'
        : `${state.label}${state.dueText ? ` · ${state.dueText}` : ''}`;

      if (state.key === 'overdue'){
        chip.classList.add('availability-off');
        card.classList.add('v48b-deadline-overdue');
      } else if (state.key === 'today'){
        card.classList.add('v48b-deadline-today');
      } else if (state.key === 'soon'){
        card.classList.add('v48b-deadline-soon');
      }

      card.querySelector('.v42b-student-card-head')?.appendChild(chip);
    });

    renderSummary(states);
  }

  function refreshIfChanged(force=false){
    const signature = cardSignature();
    if (!signature) return;
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    decorate();
  }

  function watch(){
    injectStyles();

    let tries = 0;
    const finder = setInterval(() => {
      tries += 1;
      const section = document.getElementById('v42b-student-practice-assignments');
      if (!section){
        if (tries >= 120) clearInterval(finder);
        return;
      }

      clearInterval(finder);
      refreshIfChanged(true);

      const grid = section.querySelector('.v42b-assignment-grid');
      if (grid){
        const observer = new MutationObserver(() => setTimeout(() => refreshIfChanged(),60));
        observer.observe(grid,{childList:true});
      }

      setInterval(() => refreshIfChanged(true),60 * 1000);
    },250);
  }

  watch();
})();
