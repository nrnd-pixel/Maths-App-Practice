/* V4.2A — Teacher Action Center.
   Presentation-only intervention queue built from the teacher analytics data
   already loaded by the stable application. No new RPC, SQL, grading, auth,
   assignment-state or mastery-calculation logic is introduced here. */
(() => {
  'use strict';

  const STYLE_ID = 'v42-teacher-action-center-style';
  let renderQueued = false;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v42-action-center{
        border-color:color-mix(in srgb,var(--primary) 28%,var(--border));
        background:linear-gradient(135deg,
          color-mix(in srgb,var(--soft) 30%,var(--card)),
          var(--card));
      }

      .v42-action-summary{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:10px;
        margin-top:14px;
      }

      .v42-action-stat{
        border:1px solid var(--border);
        border-radius:14px;
        padding:13px;
        background:var(--card);
        min-width:0;
      }

      .v42-action-stat strong{
        display:block;
        font-size:24px;
        line-height:1.15;
        margin-bottom:4px;
      }

      .v42-action-stat span{
        display:block;
        color:var(--muted);
        font-size:12px;
        line-height:1.35;
      }

      .v42-action-stat button{
        width:100%;
        min-height:36px;
        padding:7px 9px;
        margin-top:10px;
        font-size:12px;
      }

      .v42-action-columns{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
        margin-top:13px;
      }

      .v42-action-panel{
        border:1px solid var(--border);
        border-radius:14px;
        padding:14px;
        background:var(--surface-muted,#f8fafc);
        min-width:0;
      }

      .v42-action-panel h4{
        margin:0 0 4px;
      }

      .v42-action-panel > p{
        margin:0 0 10px;
        color:var(--muted);
        font-size:12px;
        line-height:1.4;
      }

      .v42-action-list{
        display:grid;
        gap:8px;
      }

      .v42-action-row{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:10px;
        align-items:center;
        border:1px solid var(--border);
        border-radius:12px;
        padding:10px 11px;
        background:var(--card);
      }

      .v42-action-row strong{
        display:block;
        line-height:1.3;
      }

      .v42-action-row .help{
        margin-top:3px;
        line-height:1.4;
      }

      .v42-action-row button{
        min-height:36px;
        padding:7px 10px;
        font-size:12px;
        white-space:nowrap;
      }

      .v42-action-more{
        margin-top:8px;
        color:var(--muted);
        font-size:11px;
      }

      html[data-theme="dark"] .v42-action-center{
        background:linear-gradient(135deg,
          color-mix(in srgb,var(--soft) 14%,var(--card)),
          var(--card));
      }

      @media(max-width:900px){
        .v42-action-summary{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }

      @media(max-width:700px){
        .v42-action-columns{
          grid-template-columns:1fr;
        }
      }

      @media(max-width:520px){
        .v42-action-summary{
          grid-template-columns:1fr;
        }

        .v42-action-row{
          grid-template-columns:1fr;
        }

        .v42-action-row button{
          width:100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function buildActionCenter(){
    const overview = document.getElementById('analytics-overview');
    if (!overview || document.querySelector('.v42-action-center')) return;

    const section = document.createElement('section');
    section.className = 'analytics-section v42-action-center';
    section.setAttribute('aria-label', 'Teacher action center');
    section.innerHTML = `
      <div class="analytics-section-head">
        <div>
          <h3>🧭 Teacher Action Center</h3>
          <p class="muted">Turn current analytics into clear next actions without changing how scores or mastery are calculated.</p>
        </div>
        <span class="tag">V4.2A</span>
      </div>

      <div class="v42-action-summary">
        <article class="v42-action-stat">
          <strong id="v42-support-count">—</strong>
          <span>learners needing topic support</span>
          <button type="button" class="outline" data-v42-scroll="v42-support-list">View learners</button>
        </article>
        <article class="v42-action-stat">
          <strong id="v42-no-activity-count">—</strong>
          <span>active roster students with no activity</span>
          <button type="button" class="outline" data-v42-scroll="v42-no-activity-list">View students</button>
        </article>
        <article class="v42-action-stat">
          <strong id="v42-review-count">—</strong>
          <span>responses awaiting teacher review</span>
          <button type="button" class="outline v42-open-review">Open Review Queue</button>
        </article>
        <article class="v42-action-stat">
          <strong id="v42-incomplete-count">—</strong>
          <span>incomplete exams in this view</span>
          <button type="button" class="outline v42-open-attempts">Open Exam Attempts</button>
        </article>
      </div>

      <div class="v42-action-columns">
        <section class="v42-action-panel">
          <h4>🎯 Priority learners</h4>
          <p>Students with a current Needs attention or Developing topic in the selected analytics view.</p>
          <div id="v42-support-list" class="v42-action-list"></div>
        </section>

        <section class="v42-action-panel">
          <h4>💤 No recent activity</h4>
          <p>Active roster students with no Practice or Exam activity matching the current analytics filters.</p>
          <div id="v42-no-activity-list" class="v42-action-list"></div>
        </section>
      </div>
    `;

    overview.insertAdjacentElement('afterend', section);

    section.querySelectorAll('[data-v42-scroll]').forEach(button => {
      button.addEventListener('click', () => {
        document.getElementById(button.dataset.v42Scroll)?.scrollIntoView({
          behavior:'smooth',
          block:'center'
        });
      });
    });

    section.querySelector('.v42-open-review')?.addEventListener('click', () => openTeacherPanel('review-panel'));
    section.querySelector('.v42-open-attempts')?.addEventListener('click', () => openTeacherPanel('attempts-panel'));
  }

  function openTeacherPanel(panelId){
    const tab = document.querySelector(`#teacher .tab[data-panel="${panelId}"]`);
    if (!tab) return;
    tab.click();
    window.setTimeout(() => {
      document.getElementById(panelId)?.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 80);
  }

  function activeAnalyticsRows(){
    return typeof analyticsVisibleRows !== 'undefined' && Array.isArray(analyticsVisibleRows)
      ? analyticsVisibleRows
      : [];
  }

  function filteredAnswers(){
    return typeof analyticsContext !== 'undefined' && Array.isArray(analyticsContext?.answers)
      ? analyticsContext.answers
      : [];
  }

  function answersForRow(row){
    if (typeof analyticsKey !== 'function') return [];

    return filteredAnswers().filter(answer => {
      try {
        return analyticsKey(answer?.practice_sessions || {}) === row.key;
      } catch {
        return false;
      }
    });
  }

  function focusForRow(row){
    if (typeof aggregateLearning !== 'function' || typeof learningBand !== 'function') return null;

    const topics = aggregateLearning(answersForRow(row))
      .map(topic => ({ topic, band:learningBand(topic) }))
      .filter(item => item.band?.key === 'needs-attention' || item.band?.key === 'developing')
      .sort((a,b) => {
        const rankA = a.band.key === 'needs-attention' ? 0 : 1;
        const rankB = b.band.key === 'needs-attention' ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
        return Number(a.topic.percent ?? 101) - Number(b.topic.percent ?? 101) ||
          Number(b.topic.scored || 0) - Number(a.topic.scored || 0);
      });

    return topics[0] || null;
  }

  function priorityLearners(){
    return activeAnalyticsRows()
      .filter(row => row?.registered && row?.active !== false)
      .map(row => ({ row, focus:focusForRow(row) }))
      .filter(item => item.focus)
      .sort((a,b) => {
        const rankA = a.focus.band.key === 'needs-attention' ? 0 : 1;
        const rankB = b.focus.band.key === 'needs-attention' ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
        return Number(a.focus.topic.percent ?? 101) - Number(b.focus.topic.percent ?? 101) ||
          String(a.row.student_name || '').localeCompare(String(b.row.student_name || ''));
      });
  }

  function noActivityLearners(){
    return activeAnalyticsRows()
      .filter(row =>
        row?.registered &&
        row?.active !== false &&
        Number(row.practice || 0) + Number(row.examStarted || 0) === 0
      )
      .sort((a,b) => String(a.student_name || '').localeCompare(String(b.student_name || '')));
  }

  function openStudentProfile(key){
    const rows = activeAnalyticsRows();
    const index = rows.findIndex(row => row.key === key);
    if (index < 0 || typeof openStudentAnalytics !== 'function') return;
    openStudentAnalytics(index);
  }

  function openClassTools(row){
    if (typeof teacherClasses !== 'undefined' && Array.isArray(teacherClasses)) {
      const wantedName = String(row?.class_name || '').trim().toLowerCase();
      const wantedYear = String(row?.year_level || '');
      const match = teacherClasses.find(cls =>
        String(cls?.name || '').trim().toLowerCase() === wantedName &&
        String(cls?.year_level || '') === wantedYear
      );

      if (match && typeof selectedClassId !== 'undefined') {
        selectedClassId = match.id;
      }
    }

    openTeacherPanel('classes-panel');

    window.setTimeout(() => {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
      document.querySelector('.teacher-engagement-v37')?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
    }, 100);
  }

  function renderPriorityLearners(items){
    const root = document.getElementById('v42-support-list');
    if (!root) return;

    if (!items.length) {
      root.innerHTML = '<div class="empty">No learners currently meet the topic-support criteria in this analytics view.</div>';
      return;
    }

    root.innerHTML = items.slice(0,6).map(item => {
      const pct = item.focus.topic.percent == null ? '—' : `${item.focus.topic.percent}%`;
      return `
        <div class="v42-action-row">
          <div>
            <strong>${esc(item.row.student_name || 'Student')}</strong>
            <div class="help">${esc(item.focus.topic.topic || 'Topic')} · ${esc(item.focus.band.label || '')} · ${esc(pct)}</div>
          </div>
          <button type="button" class="outline v42-open-profile" data-key="${esc(item.row.key || '')}">View profile</button>
        </div>
      `;
    }).join('');

    if (items.length > 6) {
      root.insertAdjacentHTML('beforeend', `<div class="v42-action-more">+${items.length - 6} more learner${items.length - 6 === 1 ? '' : 's'} in the current view.</div>`);
    }

    root.querySelectorAll('.v42-open-profile').forEach(button => {
      button.addEventListener('click', () => openStudentProfile(button.dataset.key || ''));
    });
  }

  function renderNoActivity(items){
    const root = document.getElementById('v42-no-activity-list');
    if (!root) return;

    if (!items.length) {
      root.innerHTML = '<div class="empty">Every active roster student in this analytics view has recorded activity.</div>';
      return;
    }

    root.innerHTML = items.slice(0,6).map((row,index) => `
      <div class="v42-action-row">
        <div>
          <strong>${esc(row.student_name || 'Student')}</strong>
          <div class="help">${esc(row.class_name || 'Class')} · Year ${esc(row.year_level || '—')} · No activity in this view</div>
        </div>
        <button type="button" class="outline v42-open-class-tools" data-index="${index}">Class tools</button>
      </div>
    `).join('');

    if (items.length > 6) {
      root.insertAdjacentHTML('beforeend', `<div class="v42-action-more">+${items.length - 6} more student${items.length - 6 === 1 ? '' : 's'} with no activity in the current view.</div>`);
    }

    root.querySelectorAll('.v42-open-class-tools').forEach(button => {
      button.addEventListener('click', () => {
        const row = items[Number(button.dataset.index) || 0];
        if (row) openClassTools(row);
      });
    });
  }

  function renderActionCenter(){
    buildActionCenter();

    const support = priorityLearners();
    const noActivity = noActivityLearners();
    const pendingReview = filteredAnswers().filter(answer => answer?.review_status === 'pending').length;
    const incomplete = activeAnalyticsRows().reduce((sum,row) => sum + Number(row?.incomplete || 0), 0);

    const supportCount = document.getElementById('v42-support-count');
    const noActivityCount = document.getElementById('v42-no-activity-count');
    const reviewCount = document.getElementById('v42-review-count');
    const incompleteCount = document.getElementById('v42-incomplete-count');

    if (supportCount) supportCount.textContent = String(support.length);
    if (noActivityCount) noActivityCount.textContent = String(noActivity.length);
    if (reviewCount) reviewCount.textContent = String(pendingReview);
    if (incompleteCount) incompleteCount.textContent = String(incomplete);

    renderPriorityLearners(support);
    renderNoActivity(noActivity);
  }

  function queueRender(){
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(() => {
      renderQueued = false;
      renderActionCenter();
    });
  }

  function wireUpdates(){
    const students = document.getElementById('analytics-students-body');
    const learning = document.getElementById('analytics-learning-grid');

    [students, learning].forEach(root => {
      if (!root || root.dataset.v42ActionWatch === '1') return;
      root.dataset.v42ActionWatch = '1';
      new MutationObserver(queueRender).observe(root, { childList:true, subtree:true });
    });

    document.querySelector('#teacher .tab[data-panel="analytics-panel"]')?.addEventListener('click', () => {
      window.setTimeout(queueRender, 80);
    });

    document.getElementById('refresh-analytics')?.addEventListener('click', () => {
      window.setTimeout(queueRender, 250);
      window.setTimeout(queueRender, 700);
    });
  }

  function applyV42A(){
    injectStyles();
    buildActionCenter();
    wireUpdates();
    queueRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV42A, { once:true });
  } else {
    applyV42A();
  }
})();
