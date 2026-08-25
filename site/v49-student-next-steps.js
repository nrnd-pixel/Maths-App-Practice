/* V4.9C — Student Next Steps.
   Presentation-only guidance for the existing secure My Progress experience.
   Reuses already-rendered focus/strength evidence and, when previously loaded,
   the existing Practice deadline summary. Does not fetch, score or auto-start work. */
(() => {
  'use strict';

  const STYLE_ID = 'v49c-student-next-steps-style';
  const PANEL_ID = 'v49c-student-next-steps';
  const SNAPSHOT_ID = 'v49a-progress-snapshot';
  const FOCUS_ID = 'student-progress-focus';
  const STRENGTHS_ID = 'student-progress-strengths';
  const DEADLINE_ID = 'v48b-student-deadline-summary';

  let queued = false;
  let lastSignature = '';

  function text(value){ return String(value ?? '').replace(/\s+/g,' ').trim(); }
  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{
        margin:0 0 18px;
        border:1px solid var(--border);
        border-radius:18px;
        padding:15px;
        background:color-mix(in srgb,var(--soft) 22%,var(--card));
      }
      #${PANEL_ID} .v49c-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:11px;
      }
      #${PANEL_ID} .v49c-head h2{margin:0 0 4px;font-size:20px}
      #${PANEL_ID} .v49c-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${PANEL_ID} .v49c-primary{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:14px;
        align-items:center;
        border:1px solid color-mix(in srgb,var(--primary) 34%,var(--border));
        border-radius:14px;
        padding:13px;
        background:var(--card);
      }
      #${PANEL_ID} .v49c-primary[data-kind="urgent"]{
        border-color:color-mix(in srgb,var(--danger) 42%,var(--border));
        background:color-mix(in srgb,var(--dangerbg) 55%,var(--card));
      }
      #${PANEL_ID} .v49c-primary[data-kind="today"]{
        border-color:color-mix(in srgb,var(--warn) 38%,var(--border));
        background:color-mix(in srgb,var(--warnbg) 45%,var(--card));
      }
      #${PANEL_ID} .v49c-primary small{display:block;color:var(--muted);font-weight:700;margin-bottom:4px}
      #${PANEL_ID} .v49c-primary strong{display:block;font-size:17px;line-height:1.3}
      #${PANEL_ID} .v49c-primary .v49c-detail{margin-top:4px;color:var(--muted);font-size:12px;line-height:1.45}
      #${PANEL_ID} .v49c-primary button{white-space:nowrap}
      #${PANEL_ID} .v49c-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
        margin-top:9px;
      }
      #${PANEL_ID} .v49c-card{
        border:1px solid var(--border);
        border-radius:13px;
        padding:11px;
        background:var(--card);
        min-width:0;
      }
      #${PANEL_ID} .v49c-card small{display:block;color:var(--muted);font-weight:700;margin-bottom:4px}
      #${PANEL_ID} .v49c-card strong{display:block;line-height:1.3;overflow-wrap:anywhere}
      #${PANEL_ID} .v49c-card .v49c-detail{margin-top:4px;color:var(--muted);font-size:11px;line-height:1.4}
      #${PANEL_ID} .v49c-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
      #${PANEL_ID} .v49c-actions button{min-height:36px;padding:7px 11px;font-size:12px}
      #${PANEL_ID} .v49c-note{margin-top:10px;color:var(--muted);font-size:11px;line-height:1.45}
      @media(max-width:700px){
        #${PANEL_ID} .v49c-primary{grid-template-columns:1fr}
        #${PANEL_ID} .v49c-primary button{justify-self:start;width:100%}
        #${PANEL_ID} .v49c-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function cardInfo(rootId){
    const card = document.getElementById(rootId)?.querySelector('.insight-card');
    if (!card) return null;
    const topic = text(card.querySelector('.row strong')?.textContent);
    if (!topic) return null;
    const state = text(card.querySelector('.tag')?.textContent);
    const percent = [...card.querySelectorAll('strong')]
      .map(node => text(node.textContent))
      .find(value => /^\d+(?:\.\d+)?%$/.test(value)) || '';
    return {topic,state,percent,card};
  }

  function numberFromSummary(pattern){
    const root = document.getElementById(DEADLINE_ID);
    if (!root) return null;
    const nodes = [...root.querySelectorAll('.tag')].map(node => text(node.textContent));
    for (const value of nodes){
      const match = value.match(pattern);
      if (match) return Number(match[1]);
    }
    return 0;
  }

  function assignmentSummary(){
    const root = document.getElementById(DEADLINE_ID);
    if (!root) return null;
    return {
      outstanding:numberFromSummary(/^(\d+)\s+outstanding$/i) ?? 0,
      overdue:numberFromSummary(/^(\d+)\s+overdue$/i) ?? 0,
      today:numberFromSummary(/^(\d+)\s+due today$/i) ?? 0,
      soon:numberFromSummary(/^(\d+)\s+due soon$/i) ?? 0,
      noDue:numberFromSummary(/^(\d+)\s+without due date$/i) ?? 0
    };
  }

  function priorityFor(focus, assignments){
    if (assignments?.overdue > 0){
      return {
        kind:'urgent', label:'Priority now', title:'Finish overdue Practice',
        detail:`${assignments.overdue} assigned Practice target${assignments.overdue===1?' is':'s are'} overdue. Overdue work remains available to complete.`,
        action:'assignments', button:'Open Assignments'
      };
    }
    if (assignments?.today > 0){
      return {
        kind:'today', label:'Priority now', title:'Complete today’s Practice',
        detail:`${assignments.today} assigned Practice target${assignments.today===1?' is':'s are'} due today.`,
        action:'assignments', button:'Open Assignments'
      };
    }
    if (assignments?.soon > 0){
      return {
        kind:'normal', label:'Priority now', title:'Practice due soon',
        detail:`${assignments.soon} assigned Practice target${assignments.soon===1?' is':'s are'} due within the next 48 hours.`,
        action:'assignments', button:'Open Assignments'
      };
    }
    if (assignments?.outstanding > 0){
      return {
        kind:'normal', label:'Priority now', title:'Continue assigned Practice',
        detail:`You have ${assignments.outstanding} outstanding Practice assignment${assignments.outstanding===1?'':'s'}.`,
        action:'assignments', button:'Open Assignments'
      };
    }
    if (focus){
      return {
        kind:'normal', label:'Priority now', title:`Focus on ${focus.topic}`,
        detail:[focus.state,focus.percent].filter(Boolean).join(' · ') || 'This is your first current Focus Area.',
        action:'topic', button:'View topic progress'
      };
    }
    return {
      kind:'normal', label:'Priority now', title:'Build more learning evidence',
      detail:'Complete scored Practice or Exam work so My Progress can identify a clear focus area.',
      action:'assignments', button:'Check Assignments'
    };
  }

  function ensurePanel(){
    const snapshot = document.getElementById(SNAPSHOT_ID);
    const summary = document.getElementById('student-dashboard-summary');
    const anchor = snapshot || summary;
    if (!anchor) return null;
    let root = document.getElementById(PANEL_ID);
    if (!root){
      root = document.createElement('section');
      root.id = PANEL_ID;
      root.setAttribute('aria-label','What to work on next');
      anchor.insertAdjacentElement('afterend',root);
    }
    return root;
  }

  function openAssignments(){
    const button = document.getElementById('my-assignments-btn');
    if (button && !button.classList.contains('hidden')) button.click();
  }

  function openTopic(topic){
    const roots = [FOCUS_ID,STRENGTHS_ID];
    for (const id of roots){
      const card = [...(document.getElementById(id)?.querySelectorAll('.insight-card') || [])]
        .find(node => text(node.querySelector('.row strong')?.textContent).toLowerCase() === text(topic).toLowerCase());
      const button = card?.querySelector('.v49b-topic-open');
      if (button){ button.click(); return; }
    }
  }

  function sourceSignature(){
    return [
      text(document.getElementById(FOCUS_ID)?.textContent),
      text(document.getElementById(STRENGTHS_ID)?.textContent),
      text(document.getElementById(DEADLINE_ID)?.textContent)
    ].join('||');
  }

  function render(){
    const root = ensurePanel();
    if (!root) return;
    const signature = sourceSignature();
    if (signature === lastSignature && root.childElementCount) return;
    lastSignature = signature;

    const focus = cardInfo(FOCUS_ID);
    const strength = cardInfo(STRENGTHS_ID);
    const assignments = assignmentSummary();
    const priority = priorityFor(focus,assignments);

    const focusTitle = focus?.topic || 'No focus topic yet';
    const focusDetail = focus
      ? [focus.state,focus.percent].filter(Boolean).join(' · ')
      : 'More scored evidence is needed before a focus area can be identified.';
    const strengthTitle = strength?.topic || 'No secure topic yet';
    const strengthDetail = strength
      ? [strength.state,strength.percent].filter(Boolean).join(' · ')
      : 'A secure topic will appear after enough strong scored evidence.';

    const assignmentDetail = assignments
      ? assignments.outstanding
        ? `${assignments.outstanding} outstanding · ${assignments.overdue} overdue · ${assignments.today} due today · ${assignments.soon} due soon`
        : 'No outstanding Practice assignments in the last securely loaded assignment view.'
      : 'Open Assignments to load your current teacher-set Practice securely.';

    root.innerHTML = `
      <div class="v49c-head">
        <div>
          <h2>🎯 What to work on next</h2>
          <p>Uses your existing Focus Areas and teacher-set Practice priorities. It does not create a new progress score.</p>
        </div>
        <span class="tag">V4.9C</span>
      </div>
      <div class="v49c-primary" data-kind="${escapeHtml(priority.kind)}">
        <div>
          <small>${escapeHtml(priority.label)}</small>
          <strong>${escapeHtml(priority.title)}</strong>
          <div class="v49c-detail">${escapeHtml(priority.detail)}</div>
        </div>
        <button id="v49c-primary-action" class="primary" type="button">${escapeHtml(priority.button)}</button>
      </div>
      <div class="v49c-grid">
        <article class="v49c-card">
          <small>Learning focus</small>
          <strong>${escapeHtml(focusTitle)}</strong>
          <div class="v49c-detail">${escapeHtml(focusDetail)}</div>
          ${focus ? '<div class="v49c-actions"><button id="v49c-focus-action" class="outline" type="button">View topic progress</button></div>' : ''}
        </article>
        <article class="v49c-card">
          <small>Keep strong</small>
          <strong>${escapeHtml(strengthTitle)}</strong>
          <div class="v49c-detail">${escapeHtml(strengthDetail)}</div>
          ${strength ? '<div class="v49c-actions"><button id="v49c-strength-action" class="outline" type="button">View topic progress</button></div>' : ''}
        </article>
      </div>
      <div class="v49c-actions">
        <button id="v49c-assignments-action" class="outline" type="button">📚 Open Assignments</button>
      </div>
      <div class="v49c-note">${escapeHtml(assignmentDetail)} Assignment urgency is only shown here after the existing Assignments screen has securely loaded it; V4.9C does not make a second assignment-data request.</div>
    `;

    document.getElementById('v49c-primary-action')?.addEventListener('click',() => {
      if (priority.action === 'topic' && focus) openTopic(focus.topic);
      else openAssignments();
    });
    document.getElementById('v49c-focus-action')?.addEventListener('click',() => focus && openTopic(focus.topic));
    document.getElementById('v49c-strength-action')?.addEventListener('click',() => strength && openTopic(strength.topic));
    document.getElementById('v49c-assignments-action')?.addEventListener('click',openAssignments);
  }

  function schedule(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  }

  function observeProgress(){
    [FOCUS_ID,STRENGTHS_ID].forEach(id => {
      const root = document.getElementById(id);
      if (!root || root.dataset.v49cNextWatch === '1') return;
      root.dataset.v49cNextWatch = '1';
      new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
    });
  }

  function observeDeadlineIfPresent(){
    const root = document.getElementById(DEADLINE_ID);
    if (!root || root.dataset.v49cNextWatch === '1') return;
    root.dataset.v49cNextWatch = '1';
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  }

  function refreshAfterNavigation(){
    observeProgress();
    observeDeadlineIfPresent();
    lastSignature = '';
    schedule();
  }

  function wire(){
    injectStyles();
    observeProgress();
    observeDeadlineIfPresent();
    schedule();

    document.getElementById('my-progress-btn')?.addEventListener('click',() => {
      setTimeout(refreshAfterNavigation,80);
      setTimeout(refreshAfterNavigation,350);
    });
    document.getElementById('my-assignments-btn')?.addEventListener('click',() => {
      setTimeout(observeDeadlineIfPresent,350);
      setTimeout(observeDeadlineIfPresent,900);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
