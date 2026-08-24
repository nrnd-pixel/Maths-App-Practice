/* V4.7C — Class Intervention Overview.
   Read-only teacher planning summary built from the already-rendered V4.5
   intervention queue. Reuses the queue's tested intervention states and the
   current Analytics scope; introduces no assignment, grading or database logic. */
(() => {
  'use strict';

  const STYLE_ID = 'v47c-class-intervention-overview-style';
  const SECTION_ID = 'v47c-class-intervention-overview';
  const ROOT_ID = 'v42-support-list';
  let observer = null;
  let queued = false;

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
      #${SECTION_ID}{
        margin-top:14px;
        border-top:1px solid var(--border);
        padding-top:16px;
      }
      .v47c-overview-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:12px;
      }
      .v47c-overview-head h4{margin:0 0 4px}
      .v47c-overview-summary{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
        margin-bottom:12px;
      }
      .v47c-overview-stat{
        border:1px solid var(--border);
        border-radius:12px;
        padding:10px;
        background:var(--card);
        min-width:0;
      }
      .v47c-overview-stat strong{
        display:block;
        font-size:20px;
        line-height:1.15;
        margin-bottom:3px;
      }
      .v47c-overview-stat span{
        display:block;
        color:var(--muted);
        font-size:11px;
        line-height:1.35;
      }
      .v47c-overview-table-wrap{
        overflow:auto;
        border:1px solid var(--border);
        border-radius:12px;
        background:var(--card);
      }
      .v47c-overview-table{
        width:100%;
        border-collapse:collapse;
        font-size:12px;
      }
      .v47c-overview-table th,
      .v47c-overview-table td{
        padding:9px 10px;
        border-bottom:1px solid var(--border);
        text-align:left;
        vertical-align:top;
        white-space:nowrap;
      }
      .v47c-overview-table tbody tr:last-child td{border-bottom:0}
      .v47c-overview-table th{
        color:var(--muted);
        font-size:11px;
      }
      .v47c-focus-patterns{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        margin-top:10px;
      }
      .v47c-focus-pattern{
        display:inline-flex;
        align-items:center;
        gap:5px;
        padding:6px 8px;
        border:1px solid var(--border);
        border-radius:999px;
        background:var(--card);
        font-size:11px;
      }
      .v47c-overview-note{
        margin-top:8px;
        color:var(--muted);
        font-size:11px;
        line-height:1.45;
      }
      .v47c-overview-empty{
        border:1px dashed var(--border);
        border-radius:12px;
        padding:13px;
        color:var(--muted);
        font-size:12px;
      }
      @media(max-width:760px){
        .v47c-overview-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:480px){
        .v47c-overview-summary{grid-template-columns:1fr 1fr}
        .v47c-overview-table th,
        .v47c-overview-table td{padding:8px}
      }
    `;
    document.head.appendChild(style);
  }

  function activeRows(){
    return typeof analyticsVisibleRows !== 'undefined' && Array.isArray(analyticsVisibleRows)
      ? analyticsVisibleRows
      : [];
  }

  function analyticsRowForKey(key){
    return activeRows().find(row => String(row?.key) === String(key)) || null;
  }

  function rowState(row){
    const status = row.querySelector('.v44c-intervention-status');
    if (status?.classList.contains('completed')) return 'completed';
    if (status?.classList.contains('not-started') || status?.classList.contains('in-progress')) return 'outstanding';

    const actions = row.querySelector('.v44a-action-buttons');
    const assign = row.querySelector('.v44a-assign-practice');
    if (actions && assign && !assign.classList.contains('hidden')) return 'needs-assignment';
    return 'pending';
  }

  function focusTopicForRow(row){
    const info = row.firstElementChild;
    const help = info?.querySelector?.('.help');
    const raw = text(help?.textContent);
    return raw ? text(raw.split(' · ')[0]) : 'Focus topic';
  }

  function queueItems(){
    const root = document.getElementById(ROOT_ID);
    if (!root) return [];

    return [...root.querySelectorAll(':scope > .v42-action-row')].map(rowElement => {
      const profile = rowElement.querySelector('.v42-open-profile[data-key]');
      if (!profile) return null;
      const row = analyticsRowForKey(profile.dataset.key || '');
      if (!row?.registered || row?.active === false) return null;
      return {
        row,
        state:rowState(rowElement),
        topic:focusTopicForRow(rowElement)
      };
    }).filter(Boolean);
  }

  function classKey(row){
    return `${text(row?.class_name) || 'Class'}|${text(row?.year_level) || '—'}`;
  }

  function classLabel(row){
    const name = text(row?.class_name) || 'Class';
    const year = text(row?.year_level);
    return year ? `${name} · Year ${year}` : name;
  }

  function increment(map,key){
    map.set(key,(map.get(key) || 0) + 1);
  }

  function leadingTopic(topicCounts){
    const entries = [...topicCounts.entries()];
    if (!entries.length) return {topic:'—',count:0};
    entries.sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],undefined,{numeric:true}));
    return {topic:entries[0][0],count:entries[0][1]};
  }

  function summarize(items){
    const totals = {all:items.length,'needs-assignment':0,outstanding:0,completed:0,pending:0};
    const classes = new Map();
    const topics = new Map();
    const topicClasses = new Map();

    items.forEach(item => {
      totals[item.state] = (totals[item.state] || 0) + 1;
      increment(topics,item.topic);

      const key = classKey(item.row);
      if (!topicClasses.has(item.topic)) topicClasses.set(item.topic,new Set());
      topicClasses.get(item.topic).add(key);

      let group = classes.get(key);
      if (!group){
        group = {
          key,
          label:classLabel(item.row),
          all:0,
          'needs-assignment':0,
          outstanding:0,
          completed:0,
          pending:0,
          topics:new Map()
        };
        classes.set(key,group);
      }
      group.all += 1;
      group[item.state] = (group[item.state] || 0) + 1;
      increment(group.topics,item.topic);
    });

    const classRows = [...classes.values()].map(group => ({...group,leading:leadingTopic(group.topics)}))
      .sort((a,b) => b.all-a.all || a.label.localeCompare(b.label,undefined,{numeric:true}));

    const focusPatterns = [...topics.entries()].map(([topic,count]) => ({
      topic,
      count,
      classes:topicClasses.get(topic)?.size || 0
    })).sort((a,b) => b.count-a.count || a.topic.localeCompare(b.topic,undefined,{numeric:true}));

    return {totals,classRows,focusPatterns};
  }

  function ensureSection(){
    let section = document.getElementById(SECTION_ID);
    if (section) return section;

    const center = document.querySelector('.v42-action-center');
    if (!center) return null;

    section = document.createElement('section');
    section.id = SECTION_ID;
    section.innerHTML = `
      <div class="v47c-overview-head">
        <div>
          <h4>🏫 Class intervention overview</h4>
          <div class="help">Class-level summary of the current priority intervention queue for lesson planning and follow-up.</div>
        </div>
        <span class="tag">V4.7C</span>
      </div>
      <div class="v47c-overview-content"></div>
    `;
    center.appendChild(section);
    return section;
  }

  function stat(label,value){
    return `<div class="v47c-overview-stat"><strong>${Number(value || 0)}</strong><span>${html(label)}</span></div>`;
  }

  function render(){
    const section = ensureSection();
    if (!section) return;
    const root = section.querySelector('.v47c-overview-content');
    if (!root) return;

    const items = queueItems();
    if (!items.length){
      root.innerHTML = '<div class="v47c-overview-empty">No priority learners currently match the selected Analytics scope.</div>';
      return;
    }

    const {totals,classRows,focusPatterns} = summarize(items);
    const pendingNote = totals.pending
      ? `${totals.pending} learner${totals.pending===1?'':'s'} still checking intervention status.`
      : 'Intervention status is up to date for this Analytics view.';

    const rowsHtml = classRows.map(group => {
      const focus = group.leading.count > 1
        ? `${group.leading.topic} (${group.leading.count})`
        : group.leading.topic;
      return `
        <tr>
          <td><strong>${html(group.label)}</strong></td>
          <td>${group.all}</td>
          <td>${group['needs-assignment']}</td>
          <td>${group.outstanding}</td>
          <td>${group.completed}</td>
          <td>${html(focus)}</td>
        </tr>`;
    }).join('');

    const patternsHtml = focusPatterns.slice(0,6).map(item => `
      <span class="v47c-focus-pattern">
        <strong>${html(item.topic)}</strong>
        <span>${item.count} learner${item.count===1?'':'s'} · ${item.classes} class${item.classes===1?'':'es'}</span>
      </span>`).join('');

    root.innerHTML = `
      <div class="v47c-overview-summary">
        ${stat('priority learners',totals.all)}
        ${stat('need assignment',totals['needs-assignment'])}
        ${stat('outstanding',totals.outstanding)}
        ${stat('completed',totals.completed)}
      </div>
      <div class="v47c-overview-table-wrap">
        <table class="v47c-overview-table">
          <thead><tr><th>Class</th><th>Priority</th><th>Need assignment</th><th>Outstanding</th><th>Completed</th><th>Leading focus</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      ${patternsHtml ? `<div class="v47c-focus-patterns" aria-label="Common intervention focus topics">${patternsHtml}</div>` : ''}
      <div class="v47c-overview-note">${html(pendingNote)} Counts follow the current Analytics filters and use the same intervention states as the V4.5 queue. No new mastery or intervention threshold is applied.</div>
    `;
  }

  function queueRender(){
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      wireObserver();
      render();
    });
  }

  function wireObserver(){
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.v47cOverviewWatch === '1') return;
    root.dataset.v47cOverviewWatch = '1';
    observer?.disconnect();
    observer = new MutationObserver(() => queueRender());
    observer.observe(root,{childList:true,subtree:true});
  }

  function wireAnalytics(){
    document.querySelector('#teacher .tab[data-panel="analytics-panel"]')?.addEventListener('click',() => {
      window.setTimeout(queueRender,120);
      window.setTimeout(queueRender,420);
    });
    document.getElementById('refresh-analytics')?.addEventListener('click',() => {
      window.setTimeout(queueRender,350);
      window.setTimeout(queueRender,900);
    });
  }

  function wire(){
    injectStyles();
    wireAnalytics();
    queueRender();
    window.setTimeout(queueRender,300);
    window.setTimeout(queueRender,850);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
