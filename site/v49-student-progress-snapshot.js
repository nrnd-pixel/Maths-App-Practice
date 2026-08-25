/* V4.9A — Student Progress Snapshot.
   Presentation-only summary for the existing secure My Progress dashboard.
   Reuses already-rendered student progress evidence; no second progress request,
   mastery recalculation, grading change or persistence. */
(() => {
  'use strict';

  const STYLE_ID = 'v49a-progress-snapshot-style';
  const SNAPSHOT_ID = 'v49a-progress-snapshot';
  const SUMMARY_ID = 'student-dashboard-summary';
  const STRENGTHS_ID = 'student-progress-strengths';
  const FOCUS_ID = 'student-progress-focus';
  const RECENT_ID = 'student-progress-recent';

  let queued = false;
  let lastSignature = '';

  function text(value){
    return String(value ?? '').replace(/\s+/g,' ').trim();
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SNAPSHOT_ID}{
        margin:16px 0 18px;
        border:1px solid var(--border);
        border-radius:18px;
        padding:15px;
        background:color-mix(in srgb,var(--soft) 30%,var(--card));
      }
      #${SNAPSHOT_ID} .v49a-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:11px;
      }
      #${SNAPSHOT_ID} .v49a-head h2{margin:0 0 4px;font-size:20px}
      #${SNAPSHOT_ID} .v49a-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${SNAPSHOT_ID} .v49a-grid{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
      }
      #${SNAPSHOT_ID} .v49a-card{
        min-width:0;
        border:1px solid var(--border);
        border-radius:13px;
        padding:11px;
        background:var(--card);
      }
      #${SNAPSHOT_ID} .v49a-card small{
        display:block;
        margin-bottom:5px;
        color:var(--muted);
        font-size:11px;
        font-weight:700;
      }
      #${SNAPSHOT_ID} .v49a-card strong{
        display:block;
        line-height:1.3;
        overflow-wrap:anywhere;
      }
      #${SNAPSHOT_ID} .v49a-detail{
        margin-top:4px;
        color:var(--muted);
        font-size:11px;
        line-height:1.4;
        overflow-wrap:anywhere;
      }
      #${SNAPSHOT_ID} .v49a-focus{border-color:color-mix(in srgb,var(--warn) 30%,var(--border))}
      #${SNAPSHOT_ID} .v49a-strength{border-color:color-mix(in srgb,var(--success) 32%,var(--border))}
      #${SNAPSHOT_ID} .v49a-note{
        margin-top:10px;
        color:var(--muted);
        font-size:11px;
        line-height:1.4;
      }
      @media(max-width:820px){
        #${SNAPSHOT_ID} .v49a-grid{grid-template-columns:1fr 1fr}
      }
      @media(max-width:520px){
        #${SNAPSHOT_ID} .v49a-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function topicCardInfo(rootId){
    const card = document.getElementById(rootId)?.querySelector('.insight-card');
    if (!card) return null;

    const topic = text(card.querySelector('.row strong')?.textContent) || 'Topic';
    const status = text(card.querySelector('.tag')?.textContent);
    const percent = [...card.querySelectorAll('strong')]
      .map(node => text(node.textContent))
      .find(value => /^\d+(?:\.\d+)?%$/.test(value)) || '';

    return {topic,status,percent};
  }

  function latestActivityInfo(){
    const root = document.getElementById(RECENT_ID);
    const item = root?.querySelector('.student-insight-activity');
    if (!item) return null;

    const strongs = [...item.querySelectorAll('strong')].map(node => text(node.textContent)).filter(Boolean);
    const helps = [...item.querySelectorAll('.help')].map(node => text(node.textContent)).filter(Boolean);

    return {
      title:strongs[0] || 'Recent activity',
      result:strongs[1] || '',
      detail:helps[0] || ''
    };
  }

  function practiceCount(){
    const value = text(document.getElementById('student-progress-practice')?.textContent);
    return /^\d+$/.test(value) ? value : '—';
  }

  function sourceSignature(){
    return [
      text(document.getElementById('student-progress-practice')?.textContent),
      text(document.getElementById(STRENGTHS_ID)?.textContent),
      text(document.getElementById(FOCUS_ID)?.textContent),
      text(document.getElementById(RECENT_ID)?.textContent)
    ].join('||');
  }

  function ensureSnapshot(){
    const summary = document.getElementById(SUMMARY_ID);
    if (!summary) return null;

    let root = document.getElementById(SNAPSHOT_ID);
    if (!root){
      root = document.createElement('section');
      root.id = SNAPSHOT_ID;
      root.setAttribute('aria-label','Student progress snapshot');
      summary.insertAdjacentElement('afterend',root);
    }
    return root;
  }

  function render(){
    const root = ensureSnapshot();
    if (!root) return;

    const signature = sourceSignature();
    if (signature === lastSignature && root.childElementCount) return;
    lastSignature = signature;

    const focus = topicCardInfo(FOCUS_ID);
    const strength = topicCardInfo(STRENGTHS_ID);
    const recent = latestActivityInfo();
    const completed = practiceCount();

    const focusTitle = focus?.topic || 'Keep building evidence';
    const focusDetail = focus
      ? [focus.status,focus.percent].filter(Boolean).join(' · ')
      : 'Complete more scored work to identify a focus topic.';

    const strengthTitle = strength?.topic || 'Still developing';
    const strengthDetail = strength
      ? [strength.status,strength.percent].filter(Boolean).join(' · ')
      : 'A secure topic will appear after enough strong scored evidence.';

    const recentTitle = recent?.title || 'No recent activity yet';
    const recentDetail = recent
      ? [recent.result,recent.detail].filter(Boolean).join(' · ')
      : 'Your latest completed Practice or Exam will appear here.';

    root.innerHTML = `
      <div class="v49a-head">
        <div>
          <h2>🧭 Progress snapshot</h2>
          <p>A quick view of the same secure learning evidence shown in detail below.</p>
        </div>
        <span class="tag">V4.9A</span>
      </div>
      <div class="v49a-grid">
        <article class="v49a-card v49a-focus">
          <small>Current focus</small>
          <strong>${escapeHtml(focusTitle)}</strong>
          <div class="v49a-detail">${escapeHtml(focusDetail)}</div>
        </article>
        <article class="v49a-card v49a-strength">
          <small>Strongest now</small>
          <strong>${escapeHtml(strengthTitle)}</strong>
          <div class="v49a-detail">${escapeHtml(strengthDetail)}</div>
        </article>
        <article class="v49a-card">
          <small>Practice completed</small>
          <strong>${escapeHtml(completed)}</strong>
          <div class="v49a-detail">Completed Practice sessions recorded for this student.</div>
        </article>
        <article class="v49a-card">
          <small>Latest activity</small>
          <strong>${escapeHtml(recentTitle)}</strong>
          <div class="v49a-detail">${escapeHtml(recentDetail)}</div>
        </article>
      </div>
      <div class="v49a-note">This snapshot does not create a new progress score. Mastery states, topic evidence and recent activity continue to come from the existing secure My Progress dashboard.</div>
    `;
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function schedule(){
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      render();
    });
  }

  function observeSources(){
    [SUMMARY_ID,STRENGTHS_ID,FOCUS_ID,RECENT_ID].forEach(id => {
      const root = document.getElementById(id);
      if (!root || root.dataset.v49aSnapshotWatch === '1') return;
      root.dataset.v49aSnapshotWatch = '1';
      new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
    });
  }

  function wire(){
    injectStyles();
    observeSources();
    schedule();

    document.getElementById('my-progress-btn')?.addEventListener('click',() => {
      window.setTimeout(() => {
        observeSources();
        schedule();
      },80);
      window.setTimeout(schedule,350);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
