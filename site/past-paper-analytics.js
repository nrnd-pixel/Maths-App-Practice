/* V5.6D — Teacher Past Paper Analytics.
   Read-only class analytics for Practice-mode past papers.
   Uses the authenticated teacher boundary and V5.5D Past Paper result attribution.
   Exam Mode, grading, assignments and question data are unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v56dTeacherPastPaperAnalyticsInstalled) return;
  ROOT.__v56dTeacherPastPaperAnalyticsInstalled = true;

  const RPC_NAME = 'get_teacher_past_paper_analytics_v56d';
  const TRIGGER_ID = 'v56d-open-past-paper-analytics';
  const OVERLAY_ID = 'v56d-past-paper-analytics-overlay';
  const STYLE_ID = 'v56d-past-paper-analytics-style';
  const CLASS_ID = 'v56d-class';
  const PAPER_ID = 'v56d-paper';
  const STUDENT_FILTER_ID = 'v56d-student-filter';

  let data = null;
  let libraryData = null;
  let loading = false;
  let studentFilter = 'all';
  let returnFocus = null;
  let previousOverflow = '';

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const safe = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  function paperKey(examYear,paper){
    return `${Number(examYear)||0}|${norm(paper)}`;
  }

  function statusLabel(status){
    if (status === 'completed') return 'Completed';
    if (status === 'in_progress') return 'In progress';
    return 'Not started';
  }

  function sourceLabel(source){
    if (source === 'teacher_assigned_plus_self') return 'Teacher assigned + extra practice';
    if (source === 'teacher_assigned') return 'Teacher assigned';
    if (source === 'teacher_assigned_pending') return 'Teacher assigned · not started';
    if (source === 'self_selected') return 'Self-selected';
    return 'No Past Paper activity';
  }

  function statusRank(row){
    const status = row?.progress_status;
    if (status === 'in_progress') return 0;
    if (status === 'not_started') return 1;
    return 2;
  }

  function studentSort(a,b){
    const rank = statusRank(a)-statusRank(b);
    if (rank) return rank;
    const af = Number(a?.latest_session?.first_try_percent);
    const bf = Number(b?.latest_session?.first_try_percent);
    if (Number.isFinite(af) || Number.isFinite(bf)){
      if (!Number.isFinite(af)) return 1;
      if (!Number.isFinite(bf)) return -1;
      if (af !== bf) return af-bf;
    }
    return trim(a?.student_name).localeCompare(trim(b?.student_name),undefined,{numeric:true,sensitivity:'base'});
  }

  function weakQuestions(rows,limit=8){
    return Array.from(rows || [])
      .filter(row => Number(row?.attempts || 0) > 0 && Number.isFinite(Number(row?.first_try_percent)))
      .sort((a,b) => Number(a.first_try_percent)-Number(b.first_try_percent)
        || Number(a.mastery_percent ?? 101)-Number(b.mastery_percent ?? 101)
        || String(a.question_number).localeCompare(String(b.question_number),undefined,{numeric:true}))
      .slice(0,limit);
  }

  function weakTopics(rows,limit=8){
    return Array.from(rows || [])
      .filter(row => Number(row?.attempts || 0) > 0 && Number.isFinite(Number(row?.first_try_percent)))
      .sort((a,b) => Number(a.first_try_percent)-Number(b.first_try_percent)
        || Number(a.mastery_percent ?? 101)-Number(b.mastery_percent ?? 101)
        || trim(a.topic).localeCompare(trim(b.topic)))
      .slice(0,limit);
  }

  function formatPercent(value){
    return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : '—';
  }

  function dateLabel(value){
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'});
  }

  function currentTeacherClasses(){
    try {
      return Array.isArray(teacherClasses)
        ? teacherClasses.filter(row => row?.active !== false).slice().sort((a,b)=>Number(a.year_level)-Number(b.year_level) || trim(a.name).localeCompare(trim(b.name),undefined,{numeric:true}))
        : [];
    } catch { return []; }
  }

  function preferredClassId(){
    try {
      if (selectedClassId && currentTeacherClasses().some(row=>String(row.id)===String(selectedClassId))) return String(selectedClassId);
    } catch {}
    const analyticsClass = byId('analytics-class');
    const selectedText = trim(analyticsClass?.selectedOptions?.[0]?.textContent);
    if (selectedText && !/^all/i.test(selectedText)){
      const found = currentTeacherClasses().find(row=>norm(row.name)===norm(selectedText) || norm(`Year ${row.year_level} ${row.name}`)===norm(selectedText));
      if (found) return String(found.id);
    }
    return String(currentTeacherClasses()[0]?.id || '');
  }

  function injectStyles(){
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TRIGGER_ID}{white-space:nowrap}
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:125;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${OVERLAY_ID}.hidden{display:none!important}
      #${OVERLAY_ID} .v56d-sheet{width:min(1220px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:22px}
      #${OVERLAY_ID} .v56d-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
      #${OVERLAY_ID} .v56d-head h2{margin:0 0 4px;font-size:24px}
      #${OVERLAY_ID} .v56d-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${OVERLAY_ID} .v56d-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${OVERLAY_ID} .v56d-controls{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(240px,1.2fr) auto;gap:10px;align-items:end;margin:16px 0}
      #${OVERLAY_ID} .v56d-controls label{margin:0}
      #${OVERLAY_ID} .v56d-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin:14px 0}
      #${OVERLAY_ID} .v56d-stat{border:1px solid var(--border);border-radius:13px;padding:11px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${OVERLAY_ID} .v56d-stat strong{display:block;font-size:21px;margin-bottom:3px}
      #${OVERLAY_ID} .v56d-stat span{font-size:10px;color:var(--muted);line-height:1.3}
      #${OVERLAY_ID} .v56d-note{margin:10px 0;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:color-mix(in srgb,var(--soft) 20%,var(--card));font-size:11px;color:var(--muted)}
      #${OVERLAY_ID} .v56d-section{margin-top:18px}
      #${OVERLAY_ID} .v56d-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}
      #${OVERLAY_ID} .v56d-section h3{margin:0;font-size:17px}
      #${OVERLAY_ID} .v56d-section p{margin:3px 0 0;color:var(--muted);font-size:11px}
      #${OVERLAY_ID} .v56d-focus-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #${OVERLAY_ID} .v56d-focus-card{border:1px solid var(--border);border-radius:12px;padding:10px 11px;background:var(--card)}
      #${OVERLAY_ID} .v56d-focus-card strong{display:block;line-height:1.35}
      #${OVERLAY_ID} .v56d-focus-card .help{margin-top:4px}
      #${OVERLAY_ID} .v56d-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:13px}
      #${OVERLAY_ID} table{width:100%;border-collapse:collapse;background:var(--card)}
      #${OVERLAY_ID} th,#${OVERLAY_ID} td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top;font-size:11px;white-space:nowrap}
      #${OVERLAY_ID} th{background:color-mix(in srgb,var(--soft) 35%,var(--card));color:var(--muted);font-size:10px}
      #${OVERLAY_ID} td.v56d-student{white-space:normal;min-width:170px}
      #${OVERLAY_ID} td.v56d-source{white-space:normal;min-width:155px}
      #${OVERLAY_ID} .v56d-filter-row{display:flex;gap:6px;flex-wrap:wrap}
      #${OVERLAY_ID} .v56d-filter{min-height:34px;padding:6px 10px;font-size:11px;border:1px solid var(--border);background:var(--card)}
      #${OVERLAY_ID} .v56d-filter[aria-pressed="true"]{border-color:var(--primary);color:var(--primary);background:color-mix(in srgb,var(--soft) 40%,var(--card))}
      #${OVERLAY_ID} .v56d-empty{padding:18px;border:1px dashed var(--border);border-radius:12px;color:var(--muted);font-size:12px;text-align:center}
      #${OVERLAY_ID} .v56d-loading{padding:28px;text-align:center;color:var(--muted)}
      @media(max-width:900px){#${OVERLAY_ID} .v56d-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){#${OVERLAY_ID}{padding:8px}#${OVERLAY_ID} .v56d-sheet{padding:15px;border-radius:16px}#${OVERLAY_ID} .v56d-controls{grid-template-columns:1fr}#${OVERLAY_ID} .v56d-focus-grid{grid-template-columns:1fr}}
      @media(max-width:480px){#${OVERLAY_ID} .v56d-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay(){
    if (typeof document === 'undefined') return null;
    injectStyles();
    let overlay = byId(OVERLAY_ID);
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v56d-title');
    overlay.innerHTML = `
      <div class="v56d-sheet">
        <div class="v56d-head">
          <div><h2 id="v56d-title">📊 Past Paper Analytics</h2><p>Class-level Practice evidence by past paper. Exam Mode results are not included.</p></div>
          <div class="v56d-actions"><span class="tag">V5.6D</span><button type="button" class="outline" id="v56d-close">Close</button></div>
        </div>
        <div class="v56d-controls">
          <label>Class<select id="${CLASS_ID}"></select></label>
          <label>Past paper<select id="${PAPER_ID}"><option value="">Choose a class first</option></select></label>
          <button type="button" class="secondary" id="v56d-refresh">Refresh</button>
        </div>
        <div id="v56d-content"><div class="v56d-loading">Choose a class and past paper.</div></div>
      </div>`;
    document.body.appendChild(overlay);
    byId('v56d-close')?.addEventListener('click',close);
    byId('v56d-refresh')?.addEventListener('click',()=>loadSelected(true));
    byId(CLASS_ID)?.addEventListener('change',()=>loadLibrary(true));
    byId(PAPER_ID)?.addEventListener('change',()=>loadSelected(true));
    overlay.addEventListener('click',event=>{ if (event.target===overlay) close(); });
    overlay.addEventListener('keydown',event=>{
      if (event.key==='Escape'){ event.preventDefault(); close(); }
    });
    return overlay;
  }

  function ensureTrigger(){
    if (typeof document === 'undefined' || byId(TRIGGER_ID)) return;
    const exportButton = byId('export-analytics');
    if (!exportButton) return;
    const button = document.createElement('button');
    button.id = TRIGGER_ID;
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = '📊 Past Paper Analytics';
    button.addEventListener('click',open);
    exportButton.insertAdjacentElement('beforebegin',button);
  }

  function populateClasses(){
    const select = byId(CLASS_ID);
    if (!select) return;
    const classes = currentTeacherClasses();
    const previous = select.value || preferredClassId();
    select.innerHTML = classes.length
      ? classes.map(row=>`<option value="${safe(row.id)}">${safe(row.name)} · Year ${Number(row.year_level)}</option>`).join('')
      : '<option value="">No active classes</option>';
    if (classes.some(row=>String(row.id)===String(previous))) select.value=String(previous);
  }

  async function rpc(classId,examYear=null,paper=null){
    if (!classId) throw new Error('Choose a class.');
    if (typeof cloud === 'undefined' || !cloud?.rpc) throw new Error('Teacher analytics connection is not ready.');
    const {data:result,error} = await cloud.rpc(RPC_NAME,{
      p_class_id:classId,
      p_exam_year:examYear == null ? null : Number(examYear),
      p_paper:paper == null ? null : String(paper)
    });
    if (error) throw error;
    return result || {};
  }

  async function loadLibrary(selectFirst=false){
    if (loading) return;
    const classId = byId(CLASS_ID)?.value || '';
    const paperSelect = byId(PAPER_ID);
    const content = byId('v56d-content');
    if (!classId || !paperSelect) return;
    loading=true;
    if (content) content.innerHTML='<div class="v56d-loading">Loading Past Paper library…</div>';
    try {
      libraryData = await rpc(classId,null,null);
      const papers = Array.isArray(libraryData?.papers) ? libraryData.papers : [];
      const previous = selectFirst ? '' : paperSelect.value;
      paperSelect.innerHTML = papers.length
        ? papers.map(row=>`<option value="${safe(paperKey(row.exam_year,row.paper))}" data-year="${Number(row.exam_year)}" data-paper="${safe(row.paper)}">${Number(row.exam_year)} · ${safe(row.paper)} · ${Number(row.available_questions||0)} available</option>`).join('')
        : '<option value="">No Practice-eligible past papers</option>';
      if (papers.some(row=>paperKey(row.exam_year,row.paper)===previous)) paperSelect.value=previous;
      loading=false;
      if (papers.length) await loadSelected(true);
      else if (content) content.innerHTML='<div class="v56d-empty">No Practice-eligible Past Paper questions are available for this class year.</div>';
    } catch(error){
      loading=false;
      if (content) content.innerHTML=`<div class="feedback incorrect">Could not load Past Paper Analytics. ${safe(error?.message||'')}</div>`;
    }
  }

  function selectedPaper(){
    const option = byId(PAPER_ID)?.selectedOptions?.[0];
    if (!option?.value) return null;
    return {examYear:Number(option.dataset.year||0),paper:trim(option.dataset.paper)};
  }

  async function loadSelected(force=false){
    if (loading && !force) return;
    const classId = byId(CLASS_ID)?.value || '';
    const selected = selectedPaper();
    const content = byId('v56d-content');
    if (!classId || !selected?.examYear || !selected.paper) return;
    loading=true;
    if (content) content.innerHTML='<div class="v56d-loading">Loading class Past Paper evidence…</div>';
    try {
      data = await rpc(classId,selected.examYear,selected.paper);
      studentFilter='all';
      render();
    } catch(error){
      if (content) content.innerHTML=`<div class="feedback incorrect">Could not load Past Paper Analytics. ${safe(error?.message||'')}</div>`;
    } finally { loading=false; }
  }

  function matchesStudentFilter(row){
    if (studentFilter==='all') return true;
    if (studentFilter==='incomplete') return row?.progress_status!=='completed';
    return row?.progress_status===studentFilter;
  }

  function studentRows(){
    return Array.from(data?.students || []).filter(matchesStudentFilter).sort(studentSort);
  }

  function studentTable(){
    const rows = studentRows();
    if (!rows.length) return '<div class="v56d-empty">No students match this filter.</div>';
    return `<div class="v56d-tablewrap"><table><thead><tr><th>Student</th><th>Status</th><th>Coverage</th><th>Sessions</th><th>Latest first try</th><th>Latest mastery</th><th>Practice source</th><th>Latest activity</th></tr></thead><tbody>${rows.map(row=>{
      const latest=row.latest_session||{};
      return `<tr><td class="v56d-student"><strong>${safe(row.student_name||'Student')}</strong><div class="help">${safe(row.student_id||'No Student ID')}</div></td><td>${safe(statusLabel(row.progress_status))}</td><td>${Number(row.questions_practised||0)}/${Number(row.available_questions||0)}</td><td>${Number(row.session_count||0)}</td><td>${formatPercent(latest.first_try_percent)}</td><td>${formatPercent(latest.mastery_percent)}</td><td class="v56d-source">${safe(sourceLabel(row.practice_source))}${row.teacher_assignment?`<div class="help">Assignment: ${safe(statusLabel(row.teacher_assignment.status))}</div>`:''}</td><td>${dateLabel(row.last_practised_at)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function questionFocus(){
    const rows = weakQuestions(data?.questions,8);
    if (!rows.length) return '<div class="v56d-empty">No Past Paper question attempts have been recorded for this class yet.</div>';
    return `<div class="v56d-focus-grid">${rows.map(row=>`<article class="v56d-focus-card"><strong>Q${safe(row.question_number)} · ${formatPercent(row.first_try_percent)} first try</strong><div class="help">${safe(row.topic||'Other')} · ${safe(row.skill||'Unclassified')}</div><div class="help">${formatPercent(row.mastery_percent)} mastery · ${Number(row.attempts||0)} attempt${Number(row.attempts||0)===1?'':'s'} · ${formatPercent(row.hint_percent)} used hints</div></article>`).join('')}</div>`;
  }

  function topicFocus(){
    const rows = weakTopics(data?.topics,8);
    if (!rows.length) return '<div class="v56d-empty">Topic and skill evidence will appear after students complete Past Paper Practice questions.</div>';
    return `<div class="v56d-focus-grid">${rows.map(row=>`<article class="v56d-focus-card"><strong>${safe(row.topic||'Other')}</strong><div class="help">${safe(row.skill||'Unclassified')}</div><div class="help">${formatPercent(row.first_try_percent)} first try · ${formatPercent(row.mastery_percent)} mastery · ${Number(row.attempts||0)} scored response${Number(row.attempts||0)===1?'':'s'}</div></article>`).join('')}</div>`;
  }

  function render(){
    const content = byId('v56d-content');
    if (!content || !data?.selected) return;
    const s = data.summary || {};
    const selected = data.selected || {};
    content.innerHTML = `
      <div class="v56d-summary">
        <div class="v56d-stat"><strong>${Number(s.total_students||0)}</strong><span>Students</span></div>
        <div class="v56d-stat"><strong>${Number(s.attempted_students||0)}</strong><span>Attempted</span></div>
        <div class="v56d-stat"><strong>${Number(s.completed_students||0)}</strong><span>Fully covered</span></div>
        <div class="v56d-stat"><strong>${formatPercent(s.completion_percent)}</strong><span>Class completion</span></div>
        <div class="v56d-stat"><strong>${formatPercent(s.average_first_try_percent)}</strong><span>Avg latest first try</span></div>
        <div class="v56d-stat"><strong>${formatPercent(s.average_mastery_percent)}</strong><span>Avg latest mastery</span></div>
      </div>
      <div class="v56d-note"><strong>${safe(data.class?.class_name||'Class')} · ${Number(selected.exam_year)} · ${safe(selected.paper)}</strong> · ${Number(selected.available_questions||0)} currently available Practice questions. ${Number(s.in_progress_students||0)} in progress · ${Number(s.not_started_students||0)} not started · ${Number(s.teacher_assigned_students||0)} teacher assigned · ${Number(s.self_selected_students||0)} self-selected. Coverage is cumulative and uses the current Practice-eligible paper bank.</div>
      <section class="v56d-section">
        <div class="v56d-section-head"><div><h3>Students</h3><p>Incomplete students appear first; completed students with lower latest first-try scores follow.</p></div><div class="v56d-filter-row" id="${STUDENT_FILTER_ID}">${[
          ['all','All'],['incomplete','Incomplete'],['completed','Completed'],['in_progress','In progress'],['not_started','Not started']
        ].map(([value,label])=>`<button type="button" class="v56d-filter" data-filter="${value}" aria-pressed="${studentFilter===value}">${label}</button>`).join('')}</div></div>
        <div id="v56d-student-table">${studentTable()}</div>
      </section>
      <section class="v56d-section"><div class="v56d-section-head"><div><h3>Weakest questions</h3><p>Lowest first-try success among questions this class has actually attempted.</p></div></div>${questionFocus()}</section>
      <section class="v56d-section"><div class="v56d-section-head"><div><h3>Topic & skill focus</h3><p>Lowest first-try evidence from the actual question-level topic and skill records.</p></div></div>${topicFocus()}</section>`;

    content.querySelectorAll('.v56d-filter').forEach(button=>button.addEventListener('click',()=>{
      studentFilter=button.dataset.filter||'all';
      content.querySelectorAll('.v56d-filter').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.filter===studentFilter)));
      const table=byId('v56d-student-table');
      if (table) table.innerHTML=studentTable();
    }));
  }

  async function open(){
    const overlay=ensureOverlay();
    if (!overlay) return;
    returnFocus=document.activeElement;
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.classList.remove('hidden');
    populateClasses();
    byId('v56d-close')?.focus();
    await loadLibrary(false);
  }

  function close(){
    const overlay=byId(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.style.overflow=previousOverflow;
    if (returnFocus?.focus) returnFocus.focus();
  }

  function wire(){
    if (typeof document==='undefined') return;
    injectStyles();
    ensureOverlay();
    ensureTrigger();
    document.querySelector('[data-panel="analytics-panel"]')?.addEventListener('click',()=>window.setTimeout(ensureTrigger,0));
    const observer = typeof MutationObserver!=='undefined' ? new MutationObserver(()=>ensureTrigger()) : null;
    const analyticsPanel=byId('analytics-panel');
    if (observer && analyticsPanel) observer.observe(analyticsPanel,{childList:true,subtree:true});
  }

  const api=Object.freeze({
    RPC_NAME,paperKey,statusLabel,sourceLabel,statusRank,studentSort,weakQuestions,weakTopics
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V56DTeacherPastPaperAnalytics',{value:api,writable:false,configurable:false});
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
