/* V4.5A — Intervention Queue Filters & Show All.
   Presentation/workflow layer only. Reuses Teacher Action Center priority logic
   and the V4.4 intervention status/actions already rendered for each learner. */
(() => {
  'use strict';

  const STYLE_ID = 'v45-intervention-queue-style';
  const TOOLS_ID = 'v45-intervention-queue-tools';
  const ROOT_ID = 'v42-support-list';
  let currentFilter = 'all';
  let expanded = false;
  let observer = null;
  let queued = false;

  function text(value){ return String(value ?? '').trim(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TOOLS_ID}{
        display:grid;
        gap:9px;
        margin:0 0 10px;
        padding:10px;
        border:1px solid var(--border);
        border-radius:12px;
        background:color-mix(in srgb,var(--soft) 24%,var(--card));
      }
      .v45-queue-summary{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
      }
      .v45-queue-summary strong{font-size:12px}
      .v45-queue-summary .help{margin:0}
      .v45-queue-filters{
        display:flex;
        flex-wrap:wrap;
        gap:7px;
      }
      .v45-queue-filter,
      .v45-queue-expand{
        min-height:34px;
        padding:6px 9px;
        font-size:11px;
        border-radius:999px;
      }
      .v45-queue-filter[aria-pressed="true"]{
        background:var(--primary);
        color:#fff;
        border-color:var(--primary);
      }
      .v45-queue-expand{margin-left:auto}
      .v45-queue-empty{
        padding:10px 11px;
        border:1px dashed var(--border);
        border-radius:12px;
        color:var(--muted);
        font-size:12px;
      }
      .v45-extra-priority{display:none}
      @media(max-width:520px){
        .v45-queue-filters{display:grid;grid-template-columns:1fr 1fr}
        .v45-queue-filter,
        .v45-queue-expand{width:100%;margin-left:0}
      }
    `;
    document.head.appendChild(style);
  }

  function activeRows(){
    return typeof analyticsVisibleRows !== 'undefined' && Array.isArray(analyticsVisibleRows)
      ? analyticsVisibleRows
      : [];
  }

  function answersForRow(row){
    const answers = typeof analyticsContext !== 'undefined' && Array.isArray(analyticsContext?.answers)
      ? analyticsContext.answers
      : [];
    if (typeof analyticsKey !== 'function') return [];
    return answers.filter(answer => {
      try { return analyticsKey(answer?.practice_sessions || {}) === row?.key; }
      catch { return false; }
    });
  }

  function focusForRow(row){
    if (typeof aggregateLearning !== 'function' || typeof learningBand !== 'function') return null;
    const topics = aggregateLearning(answersForRow(row))
      .map(topic => ({topic,band:learningBand(topic)}))
      .filter(item => item.band?.key === 'needs-attention' || item.band?.key === 'developing')
      .sort((a,b) => {
        const rankA = a.band.key === 'needs-attention' ? 0 : 1;
        const rankB = b.band.key === 'needs-attention' ? 0 : 1;
        if (rankA !== rankB) return rankA-rankB;
        return Number(a.topic.percent ?? 101)-Number(b.topic.percent ?? 101) ||
          Number(b.topic.scored || 0)-Number(a.topic.scored || 0);
      });
    return topics[0] || null;
  }

  function priorityItems(){
    return activeRows()
      .filter(row => row?.registered && row?.active !== false)
      .map(row => ({row,focus:focusForRow(row)}))
      .filter(item => item.focus)
      .sort((a,b) => {
        const rankA = a.focus.band.key === 'needs-attention' ? 0 : 1;
        const rankB = b.focus.band.key === 'needs-attention' ? 0 : 1;
        if (rankA !== rankB) return rankA-rankB;
        return Number(a.focus.topic.percent ?? 101)-Number(b.focus.topic.percent ?? 101) ||
          String(a.row.student_name || '').localeCompare(String(b.row.student_name || ''));
      });
  }

  function openStudentProfile(key){
    const rows = activeRows();
    const index = rows.findIndex(row => String(row?.key) === String(key));
    if (index >= 0 && typeof openStudentAnalytics === 'function') openStudentAnalytics(index);
  }

  function buildExtraRow(item){
    const row = document.createElement('div');
    row.className = 'v42-action-row v45-extra-priority';
    row.dataset.v45Extra = '1';
    row.dataset.v45Key = text(item.row?.key);

    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = text(item.row?.student_name) || 'Student';
    const help = document.createElement('div');
    help.className = 'help';
    const pct = item.focus?.topic?.percent == null ? '—' : `${item.focus.topic.percent}%`;
    help.textContent = `${text(item.focus?.topic?.topic) || 'Topic'} · ${text(item.focus?.band?.label)} · ${pct}`;
    info.append(name,help);

    const profile = document.createElement('button');
    profile.type = 'button';
    profile.className = 'outline v42-open-profile';
    profile.dataset.key = text(item.row?.key);
    profile.textContent = 'View profile';
    profile.addEventListener('click',() => openStudentProfile(profile.dataset.key || ''));

    row.append(info,profile);
    return row;
  }

  function ensureAllPriorityRows(root){
    const items = priorityItems();
    const expectedKeys = new Set(items.map(item => String(item.row?.key || '')));

    root.querySelectorAll('.v45-extra-priority').forEach(row => {
      if (!expectedKeys.has(String(row.dataset.v45Key || ''))) row.remove();
    });

    const existing = new Set([...root.querySelectorAll('.v42-open-profile[data-key]')]
      .map(button => String(button.dataset.key || '')));
    const more = root.querySelector('.v42-action-more');

    items.forEach(item => {
      const key = String(item.row?.key || '');
      if (!key || existing.has(key)) return;
      const row = buildExtraRow(item);
      if (more) root.insertBefore(row,more);
      else root.appendChild(row);
      existing.add(key);
    });

    return items.length;
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

  function countsFor(root){
    const counts = {all:0,'needs-assignment':0,outstanding:0,completed:0,pending:0};
    root.querySelectorAll(':scope > .v42-action-row').forEach(row => {
      counts.all += 1;
      const state = rowState(row);
      counts[state] = (counts[state] || 0) + 1;
    });
    return counts;
  }

  function setFilterButtonCounts(tools,counts){
    tools.querySelectorAll('.v45-queue-filter[data-filter]').forEach(button => {
      const filter = button.dataset.filter;
      const label = button.dataset.label || button.textContent;
      button.textContent = `${label} ${counts[filter] ?? 0}`;
      button.setAttribute('aria-pressed',filter === currentFilter ? 'true' : 'false');
    });
  }

  function applyVisibility(root){
    let visible = 0;
    root.querySelectorAll(':scope > .v42-action-row').forEach(row => {
      const isExtra = row.dataset.v45Extra === '1';
      const state = rowState(row);
      let show = false;

      if (currentFilter === 'all') show = expanded || !isExtra;
      else show = state === currentFilter;

      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    const more = root.querySelector('.v42-action-more');
    if (more) more.style.display = currentFilter === 'all' && !expanded ? '' : 'none';

    let empty = root.querySelector('.v45-queue-empty');
    if (!visible && currentFilter !== 'all'){
      if (!empty){
        empty = document.createElement('div');
        empty.className = 'v45-queue-empty';
        root.appendChild(empty);
      }
      const names = {
        'needs-assignment':'No priority learners currently need a new Practice assignment.',
        outstanding:'No priority learners currently have outstanding matching Practice.',
        completed:'No priority learners currently have completed matching Practice.'
      };
      empty.textContent = names[currentFilter] || 'No learners match this intervention filter.';
      empty.style.display = '';
    } else if (empty) empty.style.display = 'none';
  }

  function updateTools(root,total){
    const tools = document.getElementById(TOOLS_ID);
    if (!tools) return;
    const counts = countsFor(root);
    setFilterButtonCounts(tools,counts);

    const summary = tools.querySelector('.v45-queue-summary-text');
    if (summary){
      summary.textContent = `${total} priority learner${total===1?'':'s'} · ${counts['needs-assignment']} need assignment · ${counts.outstanding} outstanding · ${counts.completed} completed`;
    }

    const checking = tools.querySelector('.v45-queue-checking');
    if (checking){
      checking.textContent = counts.pending ? `Checking intervention status for ${counts.pending} learner${counts.pending===1?'':'s'}…` : 'Intervention status is up to date for this view.';
    }

    const expand = tools.querySelector('.v45-queue-expand');
    if (expand){
      const extras = Math.max(0,total-6);
      expand.hidden = extras < 1 || currentFilter !== 'all';
      expand.textContent = expanded ? 'Show top 6' : `Show all${extras ? ` (+${extras})` : ''}`;
    }
  }

  function buildTools(root){
    let tools = document.getElementById(TOOLS_ID);
    if (tools) return tools;

    tools = document.createElement('div');
    tools.id = TOOLS_ID;
    tools.innerHTML = `
      <div class="v45-queue-summary">
        <div>
          <strong class="v45-queue-summary-text">Priority intervention queue</strong>
          <div class="help v45-queue-checking">Checking intervention status…</div>
        </div>
        <button type="button" class="outline v45-queue-expand">Show all</button>
      </div>
      <div class="v45-queue-filters" role="group" aria-label="Filter priority learners by Practice intervention status">
        <button type="button" class="outline v45-queue-filter" data-filter="all" data-label="All" aria-pressed="true">All</button>
        <button type="button" class="outline v45-queue-filter" data-filter="needs-assignment" data-label="Needs assignment" aria-pressed="false">Needs assignment</button>
        <button type="button" class="outline v45-queue-filter" data-filter="outstanding" data-label="Outstanding" aria-pressed="false">Outstanding</button>
        <button type="button" class="outline v45-queue-filter" data-filter="completed" data-label="Completed" aria-pressed="false">Completed</button>
      </div>
    `;
    root.insertAdjacentElement('beforebegin',tools);

    tools.querySelectorAll('.v45-queue-filter').forEach(button => {
      button.addEventListener('click',() => {
        currentFilter = button.dataset.filter || 'all';
        if (currentFilter !== 'all') expanded = true;
        queueRefresh();
      });
    });

    tools.querySelector('.v45-queue-expand')?.addEventListener('click',() => {
      expanded = !expanded;
      queueRefresh();
    });
    return tools;
  }

  function refresh(){
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    buildTools(root);
    const total = ensureAllPriorityRows(root);
    applyVisibility(root);
    updateTools(root,total);
  }

  function queueRefresh(){
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      wireObserver();
      refresh();
    });
  }

  function wireObserver(){
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.v45QueueWatch === '1') return;
    root.dataset.v45QueueWatch = '1';
    observer?.disconnect();
    observer = new MutationObserver(() => queueRefresh());
    observer.observe(root,{childList:true,subtree:true});
  }

  function wireAnalytics(){
    document.querySelector('#teacher .tab[data-panel="analytics-panel"]')?.addEventListener('click',() => {
      window.setTimeout(queueRefresh,100);
      window.setTimeout(queueRefresh,350);
    });
    document.getElementById('refresh-analytics')?.addEventListener('click',() => {
      window.setTimeout(queueRefresh,300);
      window.setTimeout(queueRefresh,800);
    });
  }

  function wire(){
    injectStyles();
    wireAnalytics();
    queueRefresh();
    window.setTimeout(queueRefresh,250);
    window.setTimeout(queueRefresh,700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
