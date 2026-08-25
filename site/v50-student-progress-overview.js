/* V5.0B3 — Student Progress Overview.
   Consolidates the existing V4.9 Progress Snapshot and Next Steps presentation
   into one student-facing overview. Reuses already-rendered secure progress,
   recent activity and previously-loaded Practice deadline evidence only.
   No progress request, mastery calculation, grading change or persistence. */
(() => {
  'use strict';

  const STYLE_ID = 'v50-student-progress-overview-style';
  const OVERVIEW_ID = 'v50-student-progress-overview';
  const SUMMARY_ID = 'student-dashboard-summary';
  const FOCUS_ID = 'student-progress-focus';
  const STRENGTHS_ID = 'student-progress-strengths';
  const RECENT_ID = 'student-progress-recent';
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
      #student-dashboard .v50-retired-progress-source{display:none!important}
      #${OVERVIEW_ID}{
        margin:16px 0 18px;
        border:1px solid var(--border);
        border-radius:18px;
        padding:15px;
        background:color-mix(in srgb,var(--soft) 26%,var(--card));
      }
      #${OVERVIEW_ID} .v50-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:11px;
      }
      #${OVERVIEW_ID} .v50-head h2{margin:0 0 4px;font-size:21px}
      #${OVERVIEW_ID} .v50-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${OVERVIEW_ID} .v50-primary{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:14px;
        align-items:center;
        border:1px solid color-mix(in srgb,var(--primary) 34%,var(--border));
        border-radius:14px;
        padding:13px;
        background:var(--card);
      }
      #${OVERVIEW_ID} .v50-primary[data-kind="urgent"]{
        border-color:color-mix(in srgb,var(--danger) 42%,var(--border));
        background:color-mix(in srgb,var(--dangerbg) 55%,var(--card));
      }
      #${OVERVIEW_ID} .v50-primary[data-kind="today"]{
        border-color:color-mix(in srgb,var(--warn) 38%,var(--border));
        background:color-mix(in srgb,var(--warnbg) 45%,var(--card));
      }
      #${OVERVIEW_ID} .v50-primary small,
      #${OVERVIEW_ID} .v50-card small{
        display:block;
        color:var(--muted);
        font-size:11px;
        font-weight:750;
        margin-bottom:4px;
      }
      #${OVERVIEW_ID} .v50-primary strong{display:block;font-size:17px;line-height:1.3}
      #${OVERVIEW_ID} .v50-detail{margin-top:4px;color:var(--muted);font-size:12px;line-height:1.45}
      #${OVERVIEW_ID} .v50-primary-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      #${OVERVIEW_ID} .v50-primary-actions button{white-space:nowrap}
      #${OVERVIEW_ID} .v50-grid{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
        margin-top:9px;
      }
      #${OVERVIEW_ID} .v50-card{
        min-width:0;
        border:1px solid var(--border);
        border-radius:13px;
        padding:11px;
        background:var(--card);
      }
      #${OVERVIEW_ID} .v50-card strong{display:block;line-height:1.3;overflow-wrap:anywhere}
      #${OVERVIEW_ID} .v50-card .v50-detail{font-size:11px}
      #${OVERVIEW_ID} .v50-card-actions{margin-top:8px}
      #${OVERVIEW_ID} .v50-card-actions button{min-height:34px;padding:6px 10px;font-size:11px}
      #${OVERVIEW_ID} .v50-latest{
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:4px 10px;
        align-items:start;
        margin-top:9px;
        padding:10px 11px;
        border:1px solid var(--border);
        border-radius:12px;
        background:color-mix(in srgb,var(--soft) 14%,var(--card));
      }
      #${OVERVIEW_ID} .v50-latest span:first-child{font-size:11px;font-weight:750;color:var(--muted)}
      #${OVERVIEW_ID} .v50-latest strong{font-size:13px;overflow-wrap:anywhere}
      #${OVERVIEW_ID} .v50-latest .v50-latest-detail{grid-column:2;color:var(--muted);font-size:11px;line-height:1.4}
      #${OVERVIEW_ID} .v50-note{margin-top:9px;color:var(--muted);font-size:11px;line-height:1.45}
      @media(max-width:820px){#${OVERVIEW_ID} .v50-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:600px){
        #${OVERVIEW_ID} .v50-primary{grid-template-columns:1fr}
        #${OVERVIEW_ID} .v50-primary-actions{justify-content:flex-start}
        #${OVERVIEW_ID} .v50-primary-actions button{width:100%}
        #${OVERVIEW_ID} .v50-latest{grid-template-columns:1fr}
        #${OVERVIEW_ID} .v50-latest .v50-latest-detail{grid-column:auto}
      }
      @media(max-width:520px){#${OVERVIEW_ID} .v50-grid{grid-template-columns:1fr}}
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
    return {topic,state,percent};
  }

  function summaryInfo(){
    const value = id => text(document.getElementById(id)?.textContent) || '—';
    return {
      practice:value('student-progress-practice'),
      exams:value('student-progress-exams'),
      topics:value('student-progress-topics'),
      last:value('student-progress-last')
    };
  }

  function latestActivityInfo(){
    const item = document.getElementById(RECENT_ID)?.querySelector('.student-insight-activity');
    if (!item) return null;
    const strongs = [...item.querySelectorAll('strong')].map(node => text(node.textContent)).filter(Boolean);
    const helps = [...item.querySelectorAll('.help')].map(node => text(node.textContent)).filter(Boolean);
    return {title:strongs[0]||'Recent activity',result:strongs[1]||'',detail:helps[0]||''};
  }

  function numberFromDeadline(pattern){
    const root = document.getElementById(DEADLINE_ID);
    if (!root) return null;
    for (const value of [...root.querySelectorAll('.tag')].map(node => text(node.textContent))){
      const match = value.match(pattern);
      if (match) return Number(match[1]);
    }
    return 0;
  }

  function assignmentSummary(){
    if (!document.getElementById(DEADLINE_ID)) return null;
    return {
      outstanding:numberFromDeadline(/^(\d+)\s+outstanding$/i) ?? 0,
      overdue:numberFromDeadline(/^(\d+)\s+overdue$/i) ?? 0,
      today:numberFromDeadline(/^(\d+)\s+due today$/i) ?? 0,
      soon:numberFromDeadline(/^(\d+)\s+due soon$/i) ?? 0
    };
  }

  function priorityFor(focus,assignments){
    if (assignments?.overdue > 0) return {
      kind:'urgent',title:'Finish overdue Practice',
      detail:`${assignments.overdue} assigned Practice target${assignments.overdue===1?' is':'s are'} overdue.`,
      action:'assignments',button:'Open Assignments'
    };
    if (assignments?.today > 0) return {
      kind:'today',title:'Complete today’s Practice',
      detail:`${assignments.today} assigned Practice target${assignments.today===1?' is':'s are'} due today.`,
      action:'assignments',button:'Open Assignments'
    };
    if (assignments?.soon > 0) return {
      kind:'normal',title:'Practice due soon',
      detail:`${assignments.soon} assigned Practice target${assignments.soon===1?' is':'s are'} due within the next 48 hours.`,
      action:'assignments',button:'Open Assignments'
    };
    if (assignments?.outstanding > 0) return {
      kind:'normal',title:'Continue assigned Practice',
      detail:`You have ${assignments.outstanding} outstanding Practice assignment${assignments.outstanding===1?'':'s'}.`,
      action:'assignments',button:'Open Assignments'
    };
    if (focus) return {
      kind:'normal',title:`Focus on ${focus.topic}`,
      detail:[focus.state,focus.percent].filter(Boolean).join(' · ') || 'This is your current Focus Area.',
      action:'topic',button:'View focus details'
    };
    return {
      kind:'normal',title:'Build more learning evidence',
      detail:'Complete scored Practice or Exam work so My Progress can identify a clear focus area.',
      action:'assignments',button:'Check Assignments'
    };
  }

  function retireOldPresentation(){
    const summary = document.getElementById(SUMMARY_ID);
    summary?.classList.add('v50-retired-progress-source');
    if (summary?.previousElementSibling?.classList.contains('v39-section-label')) {
      summary.previousElementSibling.classList.add('v50-retired-progress-source');
    }
    document.querySelector('#student-dashboard .v39-dashboard-intro')?.classList.add('v50-retired-progress-source');
    document.getElementById('v49a-progress-snapshot')?.classList.add('v50-retired-progress-source');
    document.getElementById('v49c-student-next-steps')?.classList.add('v50-retired-progress-source');
  }

  function ensureOverview(){
    const dashboard = document.getElementById('student-dashboard');
    const header = dashboard?.querySelector(':scope > .header');
    if (!dashboard || !header) return null;
    let root = document.getElementById(OVERVIEW_ID);
    if (!root){
      root = document.createElement('section');
      root.id = OVERVIEW_ID;
      root.setAttribute('aria-label','My progress overview');
    }
    if (root.previousElementSibling !== header) header.insertAdjacentElement('afterend',root);
    return root;
  }

  function openAssignments(){
    const button = document.getElementById('my-assignments-btn');
    if (button && !button.classList.contains('hidden')) button.click();
  }

  function openTopic(topic){
    for (const id of [FOCUS_ID,STRENGTHS_ID]){
      const card = [...(document.getElementById(id)?.querySelectorAll('.insight-card') || [])]
        .find(node => text(node.querySelector('.row strong')?.textContent).toLowerCase() === text(topic).toLowerCase());
      const button = card?.querySelector('.v49b-topic-open');
      if (button){ button.click(); return; }
    }
  }

  function sourceSignature(){
    return [
      text(document.getElementById(SUMMARY_ID)?.textContent),
      text(document.getElementById(FOCUS_ID)?.textContent),
      text(document.getElementById(STRENGTHS_ID)?.textContent),
      text(document.getElementById(RECENT_ID)?.textContent),
      text(document.getElementById(DEADLINE_ID)?.textContent)
    ].join('||');
  }

  function render(){
    retireOldPresentation();
    const root = ensureOverview();
    if (!root) return;
    const signature = sourceSignature();
    if (signature === lastSignature && root.childElementCount) return;
    lastSignature = signature;

    const focus = cardInfo(FOCUS_ID);
    const strength = cardInfo(STRENGTHS_ID);
    const summary = summaryInfo();
    const latest = latestActivityInfo();
    const assignments = assignmentSummary();
    const priority = priorityFor(focus,assignments);

    const focusTitle = focus?.topic || 'No focus topic yet';
    const focusDetail = focus ? [focus.state,focus.percent].filter(Boolean).join(' · ') : 'Complete more scored work to identify a focus topic.';
    const strengthTitle = strength?.topic || 'No secure topic yet';
    const strengthDetail = strength ? [strength.state,strength.percent].filter(Boolean).join(' · ') : 'A strong topic will appear after enough scored evidence.';
    const latestDetail = latest ? [latest.result,latest.detail].filter(Boolean).join(' · ') : 'Your latest completed Practice or Exam will appear here.';

    root.innerHTML = `
      <div class="v50-head">
        <div>
          <h2>🎯 My progress</h2>
          <p>Your next step and current learning in one place.</p>
        </div>
      </div>
      <div class="v50-primary" data-kind="${escapeHtml(priority.kind)}">
        <div>
          <small>What to work on next</small>
          <strong>${escapeHtml(priority.title)}</strong>
          <div class="v50-detail">${escapeHtml(priority.detail)}</div>
        </div>
        <div class="v50-primary-actions">
          <button id="v50-primary-action" class="primary" type="button">${escapeHtml(priority.button)}</button>
          ${priority.action === 'topic' && assignments === null ? '<button id="v50-check-assignments" class="outline" type="button">Check Assignments</button>' : ''}
        </div>
      </div>
      <div class="v50-grid">
        <article class="v50-card">
          <small>Current focus</small>
          <strong>${escapeHtml(focusTitle)}</strong>
          <div class="v50-detail">${escapeHtml(focusDetail)}</div>
          ${focus ? '<div class="v50-card-actions"><button id="v50-focus-action" class="outline" type="button">View topic</button></div>' : ''}
        </article>
        <article class="v50-card">
          <small>Strongest topic</small>
          <strong>${escapeHtml(strengthTitle)}</strong>
          <div class="v50-detail">${escapeHtml(strengthDetail)}</div>
          ${strength ? '<div class="v50-card-actions"><button id="v50-strength-action" class="outline" type="button">View topic</button></div>' : ''}
        </article>
        <article class="v50-card">
          <small>Practice sessions</small>
          <strong>${escapeHtml(summary.practice)}</strong>
          <div class="v50-detail">Exam papers: ${escapeHtml(summary.exams)}</div>
        </article>
        <article class="v50-card">
          <small>Topics practised</small>
          <strong>${escapeHtml(summary.topics)}</strong>
          <div class="v50-detail">Last activity: ${escapeHtml(summary.last)}</div>
        </article>
      </div>
      <div class="v50-latest">
        <span>Latest activity</span>
        <strong>${escapeHtml(latest?.title || 'No recent activity yet')}</strong>
        <div class="v50-latest-detail">${escapeHtml(latestDetail)}</div>
      </div>
      ${assignments === null ? '<div class="v50-note">Open Assignments to check whether your teacher has set Practice with a target date.</div>' : ''}
    `;

    document.getElementById('v50-primary-action')?.addEventListener('click',() => {
      if (priority.action === 'topic' && focus) openTopic(focus.topic);
      else openAssignments();
    });
    document.getElementById('v50-check-assignments')?.addEventListener('click',openAssignments);
    document.getElementById('v50-focus-action')?.addEventListener('click',() => focus && openTopic(focus.topic));
    document.getElementById('v50-strength-action')?.addEventListener('click',() => strength && openTopic(strength.topic));
  }

  function schedule(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  }

  function observeSources(){
    [SUMMARY_ID,FOCUS_ID,STRENGTHS_ID,RECENT_ID].forEach(id => {
      const root = document.getElementById(id);
      if (!root || root.dataset.v50OverviewWatch === '1') return;
      root.dataset.v50OverviewWatch = '1';
      new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
    });
  }

  function observeDeadlineIfPresent(){
    const root = document.getElementById(DEADLINE_ID);
    if (!root || root.dataset.v50OverviewWatch === '1') return;
    root.dataset.v50OverviewWatch = '1';
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  }

  function refresh(){
    observeSources();
    observeDeadlineIfPresent();
    lastSignature = '';
    schedule();
  }

  function wire(){
    injectStyles();
    refresh();

    document.getElementById('my-progress-btn')?.addEventListener('click',() => {
      setTimeout(refresh,80);
      setTimeout(refresh,350);
    });
    document.getElementById('my-assignments-btn')?.addEventListener('click',() => {
      setTimeout(refresh,350);
      setTimeout(refresh,900);
    });
    window.addEventListener('math-practice-assignments-changed',refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
