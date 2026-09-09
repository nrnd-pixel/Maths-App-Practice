/* V5.0C1 — Teacher Class Performance Report.
   Presentation/reporting only: reuses the existing Teacher Analytics scope,
   learner rows, topic evidence and mastery bands already loaded in memory.
   No new RPC, database read, grading rule or mastery threshold is introduced. */
(() => {
  'use strict';

  const STYLE_ID = 'v50c1-class-report-style';
  const OVERLAY_ID = 'v50c1-class-report-overlay';
  const TRIGGER_ID = 'v50c1-open-class-report';
  let returnFocus = null;
  let previousOverflow = '';

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TRIGGER_ID}{white-space:nowrap}
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:120;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${OVERLAY_ID}.hidden{display:none!important}
      #${OVERLAY_ID} .v50c1-sheet{width:min(1180px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:24px}
      #${OVERLAY_ID} .v50c1-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}
      #${OVERLAY_ID} .v50c1-toolbar h2{margin:0 0 4px;font-size:24px}
      #${OVERLAY_ID} .v50c1-toolbar p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
      #${OVERLAY_ID} .v50c1-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${OVERLAY_ID} .v50c1-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:14px 0 20px}
      #${OVERLAY_ID} .v50c1-stat{border:1px solid var(--border);border-radius:14px;padding:12px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${OVERLAY_ID} .v50c1-stat strong{display:block;font-size:22px;line-height:1.2;margin-bottom:4px}
      #${OVERLAY_ID} .v50c1-stat span{display:block;color:var(--muted);font-size:11px;line-height:1.35}
      #${OVERLAY_ID} .v50c1-section{margin-top:18px}
      #${OVERLAY_ID} .v50c1-section h3{margin:0 0 4px;font-size:18px}
      #${OVERLAY_ID} .v50c1-section-note{margin:0 0 10px;color:var(--muted);font-size:12px;line-height:1.45}
      #${OVERLAY_ID} .v50c1-topic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${OVERLAY_ID} .v50c1-topic-card{border:1px solid var(--border);border-radius:13px;padding:11px 12px;background:var(--card)}
      #${OVERLAY_ID} .v50c1-topic-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
      #${OVERLAY_ID} .v50c1-topic-head strong{line-height:1.35}
      #${OVERLAY_ID} .v50c1-topic-meta{margin-top:5px;color:var(--muted);font-size:11px;line-height:1.45}
      #${OVERLAY_ID} .v50c1-focus{border-color:color-mix(in srgb,var(--warn) 30%,var(--border));background:color-mix(in srgb,var(--warnbg) 45%,var(--card))}
      #${OVERLAY_ID} .v50c1-secure{border-color:color-mix(in srgb,var(--success) 30%,var(--border));background:color-mix(in srgb,var(--successbg) 45%,var(--card))}
      #${OVERLAY_ID} .v50c1-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:14px}
      #${OVERLAY_ID} table{width:100%;border-collapse:collapse;background:var(--card)}
      #${OVERLAY_ID} th,#${OVERLAY_ID} td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top;white-space:nowrap;font-size:12px}
      #${OVERLAY_ID} th{position:static;background:color-mix(in srgb,var(--soft) 35%,var(--card));color:var(--muted);font-size:11px}
      #${OVERLAY_ID} td.v50c1-student{white-space:normal;min-width:170px}
      #${OVERLAY_ID} td.v50c1-focus-cell{white-space:normal;min-width:190px;max-width:260px}
      #${OVERLAY_ID} .v50c1-empty{padding:16px;border:1px dashed var(--border);border-radius:13px;color:var(--muted);font-size:12px}
      #${OVERLAY_ID} .v50c1-footer{margin-top:16px;padding-top:12px;border-top:1px solid var(--border);color:var(--muted);font-size:10px;line-height:1.45}
      @media(max-width:900px){#${OVERLAY_ID} .v50c1-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:620px){#${OVERLAY_ID}{padding:8px}#${OVERLAY_ID} .v50c1-sheet{padding:16px;border-radius:16px}#${OVERLAY_ID} .v50c1-summary{grid-template-columns:repeat(2,minmax(0,1fr))}#${OVERLAY_ID} .v50c1-topic-grid{grid-template-columns:1fr}}
      @media print{
        @page{size:A4 landscape;margin:10mm}
        body.v50c1-printing>*:not(#${OVERLAY_ID}){display:none!important}
        body.v50c1-printing{background:#fff!important;color:#111!important}
        body.v50c1-printing #${OVERLAY_ID}{display:block!important;position:static!important;inset:auto!important;overflow:visible!important;padding:0!important;background:#fff!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-sheet{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-actions{display:none!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-stat,
        body.v50c1-printing #${OVERLAY_ID} .v50c1-topic-card,
        body.v50c1-printing #${OVERLAY_ID} table{background:#fff!important;color:#111!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-summary{grid-template-columns:repeat(6,1fr)!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-topic-grid{grid-template-columns:repeat(2,1fr)!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-tablewrap{overflow:visible!important;border-radius:0!important}
        body.v50c1-printing #${OVERLAY_ID} th,body.v50c1-printing #${OVERLAY_ID} td{font-size:9px!important;padding:5px 6px!important;color:#111!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-section{break-inside:avoid;page-break-inside:avoid}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-student-section{break-inside:auto;page-break-inside:auto}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-student-section h3,
        body.v50c1-printing #${OVERLAY_ID} .v50c1-student-section .v50c1-section-note{break-after:avoid-page;page-break-after:avoid}
        body.v50c1-printing #${OVERLAY_ID} table{break-inside:auto;page-break-inside:auto}
        body.v50c1-printing #${OVERLAY_ID} thead{display:table-header-group}
        body.v50c1-printing #${OVERLAY_ID} tbody{display:table-row-group}
        body.v50c1-printing #${OVERLAY_ID} tr{break-inside:avoid;page-break-inside:avoid}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-footer{break-inside:avoid;page-break-inside:avoid}
      }
    `;
    document.head.appendChild(style);
  }

  function filterScope(){
    const period = byId('analytics-period');
    const cls = byId('analytics-class');
    const year = byId('analytics-year');
    const mode = byId('analytics-mode');
    const search = byId('analytics-search');
    const text = select => select?.selectedOptions?.[0]?.textContent?.trim() || 'All';
    return {
      period:text(period),
      className:text(cls),
      year:text(year),
      mode:text(mode),
      search:String(search?.value || '').trim()
    };
  }

  function average(values){
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? Math.round(clean.reduce((sum,value)=>sum+value,0)/clean.length) : null;
  }

  function reportMetrics(rows){
    const activeRoster = rows.filter(row=>row.registered && row.active !== false).length;
    const participants = rows.filter(row=>Number(row.practice||0)+Number(row.examStarted||0)>0).length;
    const practice = rows.reduce((sum,row)=>sum+Number(row.practice||0),0);
    const exams = rows.reduce((sum,row)=>sum+Number(row.examSubmitted||0),0);
    const pending = rows.reduce((sum,row)=>sum+Number(row.awaitingReview||0),0);
    const examPercents = rows.flatMap(row=>Array.isArray(row.examPercents)?row.examPercents:[]);
    return {activeRoster,participants,practice,exams,pending,averageExam:average(examPercents)};
  }

  function topicBand(row){
    try { return typeof learningBand === 'function' ? learningBand(row) : {key:'',label:'Learning evidence'}; }
    catch { return {key:'',label:'Learning evidence'}; }
  }

  function topicCards(rows, kind){
    if (!rows.length) return '<div class="v50c1-empty">No matching topic evidence in the current Analytics scope.</div>';
    return `<div class="v50c1-topic-grid">${rows.map(row=>{
      const band = topicBand(row);
      const percent = Number.isFinite(Number(row.percent)) ? `${Math.round(Number(row.percent))}%` : '—';
      return `<article class="v50c1-topic-card ${kind==='secure'?'v50c1-secure':'v50c1-focus'}"><div class="v50c1-topic-head"><strong>${safe(row.topic||'Unclassified')}</strong><span class="tag">${safe(band.label||'Learning evidence')}</span></div><div class="v50c1-topic-meta">${safe(percent)} · ${safe(`${Number(row.scored||0)} scored response${Number(row.scored||0)===1?'':'s'}`)} · ${safe(`${Number(row.students||0)} learner${Number(row.students||0)===1?'':'s'}`)}</div></article>`;
    }).join('')}</div>`;
  }

  function studentFocus(row){
    try {
      const sessions = (analyticsContext?.sessions || []).filter(session=>analyticsKey(session)===row.key);
      const ids = new Set(sessions.map(session=>String(session.id)));
      const answers = (analyticsContext?.answers || []).filter(answer=>ids.has(String(answer.session_id)));
      const topics = typeof aggregateLearning === 'function' ? aggregateLearning(answers) : [];
      const focus = topics.find(topic=>['needs-attention','developing'].includes(topicBand(topic).key));
      if (focus) return `${focus.topic}${Number.isFinite(Number(focus.percent))?` · ${Math.round(Number(focus.percent))}%`:''}`;
      if (topics.some(topic=>topicBand(topic).key==='secure')) return 'No current focus in scored evidence';
      return 'No scored topic evidence';
    } catch {
      return 'Not available';
    }
  }

  function participation(row){
    if (Number(row.examSubmitted||0)>0) return 'Completed paper';
    if (Number(row.inProgress||0)>0) return 'In progress';
    if (Number(row.practice||0)+Number(row.examStarted||0)>0) return 'Participated';
    return 'No activity';
  }

  function studentRows(rows){
    if (!rows.length) return '<tr><td colspan="8">No students or activity match the current Analytics filters.</td></tr>';
    return rows.map(row=>{
      const avg = average(Array.isArray(row.examPercents)?row.examPercents:[]);
      const marking = Number(row.awaitingReview||0)>0 ? `${Number(row.awaitingReview)} pending` : (Number(row.examSubmitted||0)>0 ? `${Number(row.examFullyMarked||0)} fully marked` : '—');
      return `<tr><td class="v50c1-student"><strong>${safe(row.student_name||'Student')}</strong><div class="help">${safe(row.student_id||'No Student ID')}${row.registered?' · Registered':' · Activity only'}</div></td><td>${safe(row.class_name||row.class_group||'—')}<div class="help">Year ${safe(row.year_level||'—')}</div></td><td>${safe(participation(row))}</td><td>${Number(row.practice||0)}</td><td>${Number(row.examSubmitted||0)} submitted<div class="help">${Number(row.examStarted||0)} started</div></td><td>${avg==null?'—':`${avg}%`}</td><td class="v50c1-focus-cell">${safe(studentFocus(row))}</td><td>${safe(marking)}</td></tr>`;
    }).join('');
  }

  function reportTitle(scope){
    const allClass = /all/i.test(scope.className || '');
    return allClass ? 'Performance report' : `${scope.className} performance report`;
  }

  function localDateStamp(date = new Date()){
    const year = date.getFullYear();
    const month = String(date.getMonth()+1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }

  function reportDocumentTitle(scope){
    const rawClass = /all/i.test(scope.className || '') ? 'All Classes' : (scope.className || 'Class');
    const className = String(rawClass).replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim() || 'Class';
    return `Class Performance Report - ${className} - ${localDateStamp()}`;
  }

  function buildReport(){
    const rows = Array.isArray(analyticsVisibleRows) ? analyticsVisibleRows : [];
    const topics = Array.isArray(analyticsLearningRows) ? analyticsLearningRows : [];
    const scope = filterScope();
    const metrics = reportMetrics(rows);
    const focusTopics = topics.filter(row=>['needs-attention','developing'].includes(topicBand(row).key)).slice(0,6);
    const secureTopics = topics.filter(row=>topicBand(row).key==='secure').slice().sort((a,b)=>(Number(b.percent)||0)-(Number(a.percent)||0)).slice(0,6);
    const generated = new Date();
    const scopeParts = [scope.period,scope.className,scope.year,scope.mode].filter(Boolean);
    if (scope.search) scopeParts.push(`Search: ${scope.search}`);

    return `
      <div class="v50c1-toolbar">
        <div><h2 id="v50c1-report-title">📄 ${safe(reportTitle(scope))}</h2><p>${safe(scopeParts.join(' · '))}</p><p>Generated ${safe(generated.toLocaleString())}</p></div>
        <div class="v50c1-actions"><button id="v50c1-print" class="primary" type="button">Print / Save PDF</button><button id="v50c1-close" class="outline" type="button">Close report</button></div>
      </div>
      <div class="v50c1-summary">
        <div class="v50c1-stat"><strong>${metrics.activeRoster}</strong><span>Active roster students</span></div>
        <div class="v50c1-stat"><strong>${metrics.participants}</strong><span>Participating students</span></div>
        <div class="v50c1-stat"><strong>${metrics.practice}</strong><span>Practice sessions</span></div>
        <div class="v50c1-stat"><strong>${metrics.exams}</strong><span>Exam papers submitted</span></div>
        <div class="v50c1-stat"><strong>${metrics.averageExam==null?'—':`${metrics.averageExam}%`}</strong><span>Average final exam</span></div>
        <div class="v50c1-stat"><strong>${metrics.pending}</strong><span>Responses awaiting review</span></div>
      </div>
      <section class="v50c1-section"><h3>Topics to work on</h3><p class="v50c1-section-note">Uses the same existing Needs attention / Developing bands already shown in Teacher Analytics.</p>${topicCards(focusTopics,'focus')}</section>
      <section class="v50c1-section"><h3>Strongest current topics</h3><p class="v50c1-section-note">Secure topics are ranked by current scored accuracy in this Analytics scope.</p>${topicCards(secureTopics,'secure')}</section>
      <section class="v50c1-section v50c1-student-section"><h3>Student summary</h3><p class="v50c1-section-note">Participation, activity, marking status and topic focus mirror the current Analytics filters.</p><div class="v50c1-tablewrap"><table><thead><tr><th>Student</th><th>Class</th><th>Participation</th><th>Practice</th><th>Exam</th><th>Avg final exam</th><th>Current focus</th><th>Marking</th></tr></thead><tbody>${studentRows(rows)}</tbody></table></div></section>
      <div class="v50c1-footer">This report is a presentation of existing teacher-authorized Analytics evidence. It does not create a new grade, mastery score or intervention threshold. Topic bands use the same rules already displayed in Teacher Analytics.</div>
    `;
  }

  function focusable(root){
    return [...root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(node=>!node.disabled && node.getClientRects().length>0);
  }

  function closeReport(){
    const overlay = byId(OVERLAY_ID);
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow = previousOverflow;
    const target = returnFocus;
    returnFocus = null;
    if (target && typeof target.focus === 'function' && document.contains(target)) target.focus({preventScroll:true});
  }

  function printReport(){
    const previousTitle = document.title;
    document.body.classList.add('v50c1-printing');
    document.title = reportDocumentTitle(filterScope());
    let cleared = false;
    const clear = ()=>{
      if (cleared) return;
      cleared = true;
      document.body.classList.remove('v50c1-printing');
      document.title = previousTitle;
    };
    window.addEventListener('afterprint',clear,{once:true});
    window.print();
    setTimeout(clear,1500);
  }

  function openReport(){
    if (typeof renderAnalytics === 'function') renderAnalytics();
    const overlay = byId(OVERLAY_ID);
    const sheet = overlay?.querySelector('.v50c1-sheet');
    if (!overlay || !sheet) return;
    returnFocus = document.activeElement;
    sheet.innerHTML = buildReport();
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay.classList.remove('hidden');
    byId('v50c1-print')?.addEventListener('click',printReport);
    byId('v50c1-close')?.addEventListener('click',closeReport);
    byId('v50c1-close')?.focus({preventScroll:true});
  }

  function ensureOverlay(){
    if (byId(OVERLAY_ID)) return;
    const overlay = document.createElement('section');
    overlay.id = OVERLAY_ID;
    overlay.className = 'hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v50c1-report-title');
    overlay.innerHTML = '<div class="v50c1-sheet"></div>';
    overlay.addEventListener('click',event=>{ if (event.target===overlay) closeReport(); });
    overlay.addEventListener('keydown',event=>{
      if (event.key==='Escape') { event.preventDefault(); closeReport(); return; }
      if (event.key!=='Tab') return;
      const items = focusable(overlay);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length-1];
      if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
    });
    document.body.appendChild(overlay);
  }

  function ensureTrigger(){
    const exportButton = byId('export-analytics');
    if (!exportButton || byId(TRIGGER_ID)) return;
    const button = document.createElement('button');
    button.id = TRIGGER_ID;
    button.type = 'button';
    button.className = 'primary';
    button.textContent = '📄 Class report';
    button.addEventListener('click',openReport);
    exportButton.insertAdjacentElement('beforebegin',button);
  }

  function wire(){
    injectStyles();
    ensureOverlay();
    ensureTrigger();
    document.querySelector('[data-panel="analytics-panel"]')?.addEventListener('click',()=>setTimeout(ensureTrigger,0));
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();

/* V5.0C2 — Teacher Student Performance Report.
   Teacher-facing individual learner reporting only. Reuses the currently loaded
   Teacher Analytics student row, filtered sessions, answers, official final Exam
   percentages and established topic mastery bands. No new request, grade,
   mastery threshold, AI score or persistence is introduced. */
(() => {
  'use strict';

  const STYLE_ID = 'v50c2-student-report-style';
  const OVERLAY_ID = 'v50c2-student-report-overlay';
  const TRIGGER_ID = 'v50c2-open-student-report';
  let returnFocus = null;
  let previousOverflow = '';

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TRIGGER_ID}{white-space:nowrap}
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:122;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${OVERLAY_ID}.hidden{display:none!important}
      #${OVERLAY_ID} .v50c2-sheet{width:min(980px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:24px}
      #${OVERLAY_ID} .v50c2-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}
      #${OVERLAY_ID} .v50c2-toolbar h2{margin:0 0 4px;font-size:24px}
      #${OVERLAY_ID} .v50c2-toolbar p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
      #${OVERLAY_ID} .v50c2-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${OVERLAY_ID} .v50c2-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 20px}
      #${OVERLAY_ID} .v50c2-stat{border:1px solid var(--border);border-radius:14px;padding:12px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${OVERLAY_ID} .v50c2-stat strong{display:block;font-size:21px;line-height:1.2;margin-bottom:4px}
      #${OVERLAY_ID} .v50c2-stat span{display:block;color:var(--muted);font-size:11px;line-height:1.35}
      #${OVERLAY_ID} .v50c2-section{margin-top:18px}
      #${OVERLAY_ID} .v50c2-section h3{margin:0 0 4px;font-size:18px}
      #${OVERLAY_ID} .v50c2-section-note{margin:0 0 10px;color:var(--muted);font-size:12px;line-height:1.45}
      #${OVERLAY_ID} .v50c2-callouts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${OVERLAY_ID} .v50c2-callout{border:1px solid var(--border);border-radius:13px;padding:11px 12px;background:var(--card)}
      #${OVERLAY_ID} .v50c2-callout strong{display:block;line-height:1.35}
      #${OVERLAY_ID} .v50c2-callout .help{margin-top:5px;line-height:1.45}
      #${OVERLAY_ID} .v50c2-focus{border-color:color-mix(in srgb,var(--warn) 30%,var(--border));background:color-mix(in srgb,var(--warnbg) 45%,var(--card))}
      #${OVERLAY_ID} .v50c2-secure{border-color:color-mix(in srgb,var(--success) 30%,var(--border));background:color-mix(in srgb,var(--successbg) 45%,var(--card))}
      #${OVERLAY_ID} .v50c2-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:14px}
      #${OVERLAY_ID} table{width:100%;border-collapse:collapse;background:var(--card)}
      #${OVERLAY_ID} th,#${OVERLAY_ID} td{padding:8px 9px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top;font-size:12px}
      #${OVERLAY_ID} th{position:static;background:color-mix(in srgb,var(--soft) 35%,var(--card));color:var(--muted);font-size:11px;white-space:nowrap}
      #${OVERLAY_ID} td{white-space:normal}
      #${OVERLAY_ID} td.v50c2-nowrap{white-space:nowrap}
      #${OVERLAY_ID} .v50c2-empty{padding:16px;border:1px dashed var(--border);border-radius:13px;color:var(--muted);font-size:12px}
      #${OVERLAY_ID} .v50c2-footer{margin-top:16px;padding-top:12px;border-top:1px solid var(--border);color:var(--muted);font-size:10px;line-height:1.45}
      @media(max-width:760px){#${OVERLAY_ID} .v50c2-summary{grid-template-columns:repeat(2,minmax(0,1fr))}#${OVERLAY_ID} .v50c2-callouts{grid-template-columns:1fr}}
      @media(max-width:520px){#${OVERLAY_ID}{padding:8px}#${OVERLAY_ID} .v50c2-sheet{padding:16px;border-radius:16px}#${OVERLAY_ID} .v50c2-summary{grid-template-columns:1fr}}
      @media print{
        @page{size:A4 portrait;margin:10mm}
        body.v50c2-printing>*:not(#${OVERLAY_ID}){display:none!important}
        body.v50c2-printing{background:#fff!important;color:#111!important}
        body.v50c2-printing #${OVERLAY_ID}{display:block!important;position:static!important;inset:auto!important;overflow:visible!important;padding:0!important;background:#fff!important}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-sheet{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-actions{display:none!important}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-stat,
        body.v50c2-printing #${OVERLAY_ID} .v50c2-callout,
        body.v50c2-printing #${OVERLAY_ID} table{background:#fff!important;color:#111!important}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-summary{grid-template-columns:repeat(4,1fr)!important}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-callouts{grid-template-columns:repeat(2,1fr)!important}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-section{break-inside:avoid;page-break-inside:avoid}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-paged{break-inside:auto;page-break-inside:auto}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-paged h3,
        body.v50c2-printing #${OVERLAY_ID} .v50c2-paged .v50c2-section-note{break-after:avoid-page;page-break-after:avoid}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-tablewrap{overflow:visible!important;border-radius:0!important}
        body.v50c2-printing #${OVERLAY_ID} table{break-inside:auto;page-break-inside:auto}
        body.v50c2-printing #${OVERLAY_ID} thead{display:table-header-group}
        body.v50c2-printing #${OVERLAY_ID} tbody{display:table-row-group}
        body.v50c2-printing #${OVERLAY_ID} tr{break-inside:avoid;page-break-inside:avoid}
        body.v50c2-printing #${OVERLAY_ID} th,body.v50c2-printing #${OVERLAY_ID} td{font-size:8.5px!important;padding:4px 5px!important;color:#111!important}
        body.v50c2-printing #${OVERLAY_ID} .v50c2-footer{break-inside:avoid;page-break-inside:avoid}
      }
    `;
    document.head.appendChild(style);
  }

  function filterScope(){
    const period = byId('analytics-period');
    const cls = byId('analytics-class');
    const year = byId('analytics-year');
    const mode = byId('analytics-mode');
    const search = byId('analytics-search');
    const selectedText = select => select?.selectedOptions?.[0]?.textContent?.trim() || 'All';
    return {
      period:selectedText(period),
      className:selectedText(cls),
      year:selectedText(year),
      mode:selectedText(mode),
      search:String(search?.value || '').trim()
    };
  }

  function selectedStudent(){
    try {
      if (!Array.isArray(analyticsVisibleRows) || typeof selectedAnalyticsStudentKey === 'undefined') return null;
      return analyticsVisibleRows.find(row=>row.key===selectedAnalyticsStudentKey) || null;
    } catch { return null; }
  }

  function average(values){
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? Math.round(clean.reduce((sum,value)=>sum+value,0)/clean.length) : null;
  }

  function topicBand(row){
    try { return typeof learningBand === 'function' ? learningBand(row) : {key:'',label:'Learning evidence'}; }
    catch { return {key:'',label:'Learning evidence'}; }
  }

  function scoreAnswer(answer){
    try { return typeof analyticsAnswerScore === 'function' ? analyticsAnswerScore(answer) : {pending:false,possible:0,awarded:0}; }
    catch { return {pending:false,possible:0,awarded:0}; }
  }

  function finalExamPercent(session){
    try { return typeof analyticsFinalExamPercent === 'function' ? analyticsFinalExamPercent(session) : null; }
    catch { return null; }
  }

  function displayPercent(value){
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    return Number.isFinite(number) ? `${Math.round(number)}%` : '—';
  }

  function evidenceFor(row){
    const sessions = (analyticsContext?.sessions || []).filter(session=>analyticsKey(session)===row.key);
    const ids = new Set(sessions.map(session=>String(session.id)));
    const answers = (analyticsContext?.answers || []).filter(answer=>ids.has(String(answer.session_id)));
    const scores = answers.map(scoreAnswer);
    const scored = scores.filter(score=>!score.pending);
    const possible = scored.reduce((sum,score)=>sum+Number(score.possible||0),0);
    const awarded = scored.reduce((sum,score)=>sum+Number(score.awarded||0),0);
    const pending = scores.filter(score=>score.pending).length;
    const practice = sessions.filter(session=>session.practice_mode!=='exam');
    const exams = sessions.filter(session=>session.practice_mode==='exam');
    const examPercents = exams.map(finalExamPercent).filter(Number.isFinite);
    const topics = typeof aggregateLearning === 'function' ? aggregateLearning(answers) : [];
    return {
      sessions,answers,scored,possible,awarded,pending,practice,exams,topics,
      evidencePercent:possible?Math.round(awarded/possible*100):null,
      averageExam:average(examPercents)
    };
  }

  function topicRows(topics){
    if (!topics.length) return '<tr><td colspan="7">No topic-level evidence for this learner in the selected Analytics scope.</td></tr>';
    return topics.map(topic=>{
      const band = topicBand(topic);
      const score = displayPercent(topic.percent);
      const skills = Array.isArray(topic.skills) && topic.skills.length ? topic.skills.join(' · ') : '—';
      return `<tr><td><strong>${safe(topic.topic||'Unclassified')}</strong></td><td class="v50c2-nowrap">${safe(band.label||'Learning evidence')}</td><td class="v50c2-nowrap">${safe(score)}</td><td class="v50c2-nowrap">${safe(`${Number(topic.awarded||0)}/${Number(topic.possible||0)}`)}</td><td class="v50c2-nowrap">${Number(topic.scored||0)}</td><td class="v50c2-nowrap">${Number(topic.pending||0)}</td><td>${safe(skills)}</td></tr>`;
    }).join('');
  }

  function activityRows(sessions){
    if (!sessions.length) return '<tr><td colspan="5">No completed activity matches the selected Analytics scope.</td></tr>';
    return sessions.slice().sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at)).map(session=>{
      const exam = session.practice_mode==='exam';
      const pending = Number(session.pending_review_count||0);
      const label = exam ? `${session.exam_year||''} ${session.paper||'Exam'}`.trim() : (session.topic||STRANDS?.[session.strand]||'Practice');
      const result = exam
        ? (pending ? `${Number(session.auto_marks_awarded||0)} marks so far` : `${finalExamPercent(session)??'—'}% final`)
        : `${Number(session.mastery_percent||0)}% mastery`;
      const review = pending ? `${pending} pending` : 'Complete';
      return `<tr><td><strong>${safe(label)}</strong></td><td class="v50c2-nowrap">${exam?'Exam':'Practice'}</td><td>${safe(session.completed_at?new Date(session.completed_at).toLocaleString():'—')}</td><td class="v50c2-nowrap">${safe(result)}</td><td class="v50c2-nowrap">${safe(review)}</td></tr>`;
    }).join('');
  }

  function callout(topic, kind, emptyText){
    if (!topic) return `<div class="v50c2-callout"><strong>${safe(emptyText)}</strong><div class="help">More scored evidence is needed in the current Analytics scope.</div></div>`;
    const band = topicBand(topic);
    const score = displayPercent(topic.percent);
    return `<div class="v50c2-callout ${kind==='secure'?'v50c2-secure':'v50c2-focus'}"><strong>${safe(topic.topic||'Unclassified')}</strong><div class="help">${safe(band.label||'Learning evidence')} · ${safe(score)} · ${safe(`${Number(topic.scored||0)} scored response${Number(topic.scored||0)===1?'':'s'}`)}</div></div>`;
  }

  function localDateStamp(date = new Date()){
    const year = date.getFullYear();
    const month = String(date.getMonth()+1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }

  function reportDocumentTitle(row){
    const student = String(row?.student_name||'Student').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim() || 'Student';
    return `Student Performance Report - ${student} - ${localDateStamp()}`;
  }

  function buildReport(row){
    const evidence = evidenceFor(row);
    const scope = filterScope();
    const generated = new Date();
    const focus = evidence.topics.find(topic=>['needs-attention','developing'].includes(topicBand(topic).key));
    const strength = evidence.topics.filter(topic=>topicBand(topic).key==='secure').slice().sort((a,b)=>(Number(b.percent)||0)-(Number(a.percent)||0))[0];
    const latestFullyMarkedExam = evidence.exams
      .filter(session=>Number(session.pending_review_count||0)===0 && Number.isFinite(finalExamPercent(session)))
      .slice()
      .sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at))[0] || null;
    const latestExamPercent = latestFullyMarkedExam ? finalExamPercent(latestFullyMarkedExam) : null;
    const scopeParts = [scope.period,scope.className,scope.year,scope.mode].filter(Boolean);
    if (scope.search) scopeParts.push(`Search: ${scope.search}`);

    return `
      <div class="v50c2-toolbar">
        <div>
          <h2 id="v50c2-report-title">📄 ${safe(row.student_name||'Student')} — Performance report</h2>
          <p>${safe(row.student_id||'No Student ID')} · ${safe(row.class_name||row.class_group||'—')} · Year ${safe(row.year_level||'—')}</p>
          <p>${safe(scopeParts.join(' · '))}</p>
          <p>Generated ${safe(generated.toLocaleString())}</p>
        </div>
        <div class="v50c2-actions"><button id="v50c2-print" class="primary" type="button">Print / Save PDF</button><button id="v50c2-close" class="outline" type="button">Close report</button></div>
      </div>

      <div class="v50c2-summary">
        <div class="v50c2-stat"><strong>${evidence.practice.length}</strong><span>Practice sessions completed</span></div>
        <div class="v50c2-stat"><strong>${Number(row.examSubmitted||0)}</strong><span>Exam papers submitted</span></div>
        <div class="v50c2-stat"><strong>${evidence.averageExam==null?'—':`${evidence.averageExam}%`}</strong><span>Average final Exam</span></div>
        <div class="v50c2-stat"><strong>${latestExamPercent==null?'—':`${Math.round(Number(latestExamPercent))}%`}</strong><span>Latest fully marked Exam</span></div>
        <div class="v50c2-stat"><strong>${evidence.scored.length}</strong><span>Scored responses</span></div>
        <div class="v50c2-stat"><strong>${evidence.evidencePercent==null?'—':`${evidence.evidencePercent}%`}</strong><span>Marks across scored evidence</span></div>
        <div class="v50c2-stat"><strong>${evidence.topics.length}</strong><span>Topics with evidence</span></div>
        <div class="v50c2-stat"><strong>${evidence.pending}</strong><span>Responses awaiting review</span></div>
      </div>

      <section class="v50c2-section">
        <h3>Teaching focus</h3>
        <p class="v50c2-section-note">Uses the same existing Teacher Analytics mastery bands; no new intervention threshold is introduced.</p>
        <div class="v50c2-callouts">
          ${callout(focus,'focus','No current focus topic')}
          ${callout(strength,'secure','No secure topic yet')}
        </div>
      </section>

      <section class="v50c2-section v50c2-paged">
        <h3>Topic performance</h3>
        <p class="v50c2-section-note">Accuracy and marks come from the currently selected Analytics period and filters.</p>
        <div class="v50c2-tablewrap"><table><thead><tr><th>Topic</th><th>Status</th><th>Accuracy</th><th>Marks</th><th>Scored</th><th>Pending</th><th>Skills / subtopics</th></tr></thead><tbody>${topicRows(evidence.topics)}</tbody></table></div>
      </section>

      <section class="v50c2-section v50c2-paged">
        <h3>Completed activity</h3>
        <p class="v50c2-section-note">Practice mastery and final Exam percentages remain separate. Pending Exam review is never presented as a final percentage.</p>
        <div class="v50c2-tablewrap"><table><thead><tr><th>Activity</th><th>Mode</th><th>Completed</th><th>Result</th><th>Review</th></tr></thead><tbody>${activityRows(evidence.sessions)}</tbody></table></div>
      </section>

      <div class="v50c2-footer">This teacher report presents existing authorized Analytics evidence only. Official Exam results continue to use the app's deterministic marking and teacher-review workflow. Practice mastery, Exam marks and topic evidence are shown as separate evidence types; no AI-generated grade or new learning-independence score is created.</div>
    `;
  }

  function focusable(root){
    return [...root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(node=>!node.disabled && node.getClientRects().length>0);
  }

  function closeReport(){
    const overlay = byId(OVERLAY_ID);
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow = previousOverflow;
    const target = returnFocus;
    returnFocus = null;
    if (target && typeof target.focus === 'function' && document.contains(target)) target.focus({preventScroll:true});
  }

  function printReport(){
    const row = selectedStudent();
    if (!row) return;
    const previousTitle = document.title;
    document.body.classList.add('v50c2-printing');
    document.title = reportDocumentTitle(row);
    let cleared = false;
    const clear = ()=>{
      if (cleared) return;
      cleared = true;
      document.body.classList.remove('v50c2-printing');
      document.title = previousTitle;
    };
    window.addEventListener('afterprint',clear,{once:true});
    window.print();
    setTimeout(clear,1500);
  }

  function openReport(){
    const row = selectedStudent();
    const overlay = byId(OVERLAY_ID);
    const sheet = overlay?.querySelector('.v50c2-sheet');
    if (!row || !overlay || !sheet) return;
    returnFocus = document.activeElement;
    sheet.innerHTML = buildReport(row);
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay.classList.remove('hidden');
    byId('v50c2-print')?.addEventListener('click',printReport);
    byId('v50c2-close')?.addEventListener('click',closeReport);
    byId('v50c2-close')?.focus({preventScroll:true});
  }

  function ensureOverlay(){
    if (byId(OVERLAY_ID)) return;
    const overlay = document.createElement('section');
    overlay.id = OVERLAY_ID;
    overlay.className = 'hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v50c2-report-title');
    overlay.innerHTML = '<div class="v50c2-sheet"></div>';
    overlay.addEventListener('click',event=>{ if (event.target===overlay) closeReport(); });
    overlay.addEventListener('keydown',event=>{
      if (event.key==='Escape') { event.preventDefault(); closeReport(); return; }
      if (event.key!=='Tab') return;
      const items = focusable(overlay);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length-1];
      if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
    });
    document.body.appendChild(overlay);
  }

  function ensureTrigger(){
    const closeButton = byId('close-student-insight');
    const head = closeButton?.closest('.student-insight-head');
    if (!closeButton || !head || byId(TRIGGER_ID)) return;
    const button = document.createElement('button');
    button.id = TRIGGER_ID;
    button.type = 'button';
    button.className = 'primary';
    button.textContent = '📄 Student report';
    button.addEventListener('click',openReport);
    closeButton.insertAdjacentElement('beforebegin',button);
  }

  function wire(){
    injectStyles();
    ensureOverlay();
    ensureTrigger();
    document.querySelector('[data-panel="analytics-panel"]')?.addEventListener('click',()=>setTimeout(ensureTrigger,0));
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();

/* V5.0C3A/C3B — Reporting Export + Snapshot API.
   Adds structured, Excel-friendly CSV exports to the existing Class and Student
   Performance Reports and exposes the same immutable-in-memory snapshot builders
   to the teacher-only Report Archive layer. Reuses already-loaded Analytics
   evidence only; no data request, grading rule or mastery threshold is added. */
(() => {
  'use strict';

  if (window.__v50ReportingExportInstalled) return;
  window.__v50ReportingExportInstalled = true;

  const CLASS_EXPORT_ID = 'v50c3a-export-class-csv';
  const STUDENT_EXPORT_ID = 'v50c3a-export-student-csv';
  const byId = id => document.getElementById(id);

  function visibleRows(){
    try { return Array.isArray(analyticsVisibleRows) ? analyticsVisibleRows : []; }
    catch { return []; }
  }

  function learningRows(){
    try { return Array.isArray(analyticsLearningRows) ? analyticsLearningRows : []; }
    catch { return []; }
  }

  function analyticsData(){
    try {
      return (typeof analyticsContext !== 'undefined' && analyticsContext)
        ? analyticsContext
        : {sessions:[],attempts:[],answers:[]};
    } catch {
      return {sessions:[],attempts:[],answers:[]};
    }
  }

  function selectedStudent(){
    try {
      if (typeof selectedAnalyticsStudentKey === 'undefined') return null;
      return visibleRows().find(row=>row.key===selectedAnalyticsStudentKey) || null;
    } catch { return null; }
  }

  function scope(){
    const selectedText = id => byId(id)?.selectedOptions?.[0]?.textContent?.trim() || 'All';
    return {
      period:selectedText('analytics-period'),
      className:selectedText('analytics-class'),
      year:selectedText('analytics-year'),
      mode:selectedText('analytics-mode'),
      search:String(byId('analytics-search')?.value || '').trim()
    };
  }

  function average(values){
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? Math.round(clean.reduce((sum,value)=>sum+value,0)/clean.length) : null;
  }

  function topicPercent(value){
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : null;
  }

  function topicBand(row){
    try { return typeof learningBand === 'function' ? learningBand(row) : {key:'',label:'Learning evidence'}; }
    catch { return {key:'',label:'Learning evidence'}; }
  }

  function answerScore(answer){
    try { return typeof analyticsAnswerScore === 'function' ? analyticsAnswerScore(answer) : {pending:false,possible:0,awarded:0}; }
    catch { return {pending:false,possible:0,awarded:0}; }
  }

  function finalExamPercent(session){
    try { return typeof analyticsFinalExamPercent === 'function' ? analyticsFinalExamPercent(session) : null; }
    catch { return null; }
  }

  function keyFor(value){
    try { return typeof analyticsKey === 'function' ? analyticsKey(value) : ''; }
    catch { return ''; }
  }

  function aggregate(answers){
    try { return typeof aggregateLearning === 'function' ? aggregateLearning(answers) : []; }
    catch { return []; }
  }

  function strandName(session){
    try { return typeof STRANDS !== 'undefined' ? (STRANDS[session?.strand] || '') : ''; }
    catch { return ''; }
  }

  function participation(row){
    if (Number(row.examSubmitted||0)>0) return 'Completed paper';
    if (Number(row.inProgress||0)>0) return 'In progress';
    if (Number(row.practice||0)+Number(row.examStarted||0)>0) return 'Participated';
    return 'No activity';
  }

  function markingStatus(row){
    if (Number(row.awaitingReview||0)>0) return `${Number(row.awaitingReview)} pending`;
    if (Number(row.examSubmitted||0)>0) return `${Number(row.examFullyMarked||0)} fully marked`;
    return '';
  }

  function studentTopics(row){
    const context = analyticsData();
    const sessions = (context.sessions || []).filter(session=>keyFor(session)===row.key);
    const ids = new Set(sessions.map(session=>String(session.id)));
    const answers = (context.answers || []).filter(answer=>ids.has(String(answer.session_id)));
    return aggregate(answers);
  }

  function studentFocus(row){
    const topics = studentTopics(row);
    const focus = topics.find(topic=>['needs-attention','developing'].includes(topicBand(topic).key));
    if (focus) return {
      topic:focus.topic || 'Unclassified',
      status:topicBand(focus).label || 'Learning evidence',
      percent:topicPercent(focus.percent)
    };
    if (topics.some(topic=>topicBand(topic).key==='secure')) return {topic:'',status:'No current focus in scored evidence',percent:null};
    return {topic:'',status:'No scored topic evidence',percent:null};
  }

  function studentEvidence(row){
    const context = analyticsData();
    const sessions = (context.sessions || []).filter(session=>keyFor(session)===row.key);
    const ids = new Set(sessions.map(session=>String(session.id)));
    const answers = (context.answers || []).filter(answer=>ids.has(String(answer.session_id)));
    const scores = answers.map(answerScore);
    const scored = scores.filter(score=>!score.pending);
    const possible = scored.reduce((sum,score)=>sum+Number(score.possible||0),0);
    const awarded = scored.reduce((sum,score)=>sum+Number(score.awarded||0),0);
    const pending = scores.filter(score=>score.pending).length;
    const practice = sessions.filter(session=>session.practice_mode!=='exam');
    const exams = sessions.filter(session=>session.practice_mode==='exam');
    const examPercents = exams.map(finalExamPercent).filter(Number.isFinite);
    const topics = aggregate(answers);
    const fullyMarkedExams = exams
      .filter(session=>Number(session.pending_review_count||0)===0 && Number.isFinite(finalExamPercent(session)))
      .sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at));
    const focus = topics.find(topic=>['needs-attention','developing'].includes(topicBand(topic).key)) || null;
    const strength = topics
      .filter(topic=>topicBand(topic).key==='secure')
      .slice()
      .sort((a,b)=>(topicPercent(b.percent)??-1)-(topicPercent(a.percent)??-1))[0] || null;

    return {
      sessions,answers,scored,possible,awarded,pending,practice,exams,topics,focus,strength,
      evidencePercent:possible?Math.round(awarded/possible*100):null,
      averageExam:average(examPercents),
      latestFullyMarkedExam:fullyMarkedExams[0] || null
    };
  }

  function localDateStamp(date = new Date()){
    const year = date.getFullYear();
    const month = String(date.getMonth()+1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }

  function filenamePart(value, fallback){
    return String(value || fallback || '')
      .replace(/[\\/:*?"<>|]+/g,' ')
      .replace(/\s+/g,' ')
      .trim() || fallback || 'Report';
  }

  function classSubject(reportScope){
    return /all/i.test(reportScope.className || '') ? 'All Classes' : (reportScope.className || 'Class');
  }

  function classFilename(reportScope){
    return `Class Performance Report - ${filenamePart(classSubject(reportScope),'Class')} - ${localDateStamp()}.csv`;
  }

  function studentFilename(row){
    return `Student Performance Report - ${filenamePart(row?.student_name,'Student')} - ${localDateStamp()}.csv`;
  }

  function csvCell(value){
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    let text = String(value).replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g,'""')}"`;
  }

  function makeCsv(headers, records){
    const lines = [headers.map(csvCell).join(',')];
    for (const record of records) lines.push(headers.map(header=>csvCell(record[header])).join(','));
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  }

  function downloadCsv(filename, headers, records){
    const blob = new Blob([makeCsv(headers,records)],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }

  function buildClassSnapshot(){
    const rows = visibleRows();
    const topics = learningRows();
    const reportScope = scope();
    const generatedAt = new Date().toISOString();
    const examPercents = rows.flatMap(row=>Array.isArray(row.examPercents)?row.examPercents:[]);
    const metrics = [
      ['active_roster_students',rows.filter(row=>row.registered&&row.active!==false).length],
      ['participating_students',rows.filter(row=>Number(row.practice||0)+Number(row.examStarted||0)>0).length],
      ['practice_sessions',rows.reduce((sum,row)=>sum+Number(row.practice||0),0)],
      ['exam_papers_submitted',rows.reduce((sum,row)=>sum+Number(row.examSubmitted||0),0)],
      ['average_final_exam_percent',average(examPercents)],
      ['responses_awaiting_review',rows.reduce((sum,row)=>sum+Number(row.awaitingReview||0),0)]
    ];
    const common = {
      report_name:'Class Performance Report',generated_at:generatedAt,
      scope_period:reportScope.period,scope_class:reportScope.className,scope_year:reportScope.year,
      scope_mode:reportScope.mode,scope_search:reportScope.search
    };
    const records = [];

    for (const [metric,value] of metrics) records.push({...common,record_type:'metric',metric_name:metric,metric_value:value});

    for (const topic of topics){
      const band = topicBand(topic);
      records.push({
        ...common,record_type:'topic',topic:topic.topic||'Unclassified',topic_status:band.label||'Learning evidence',
        topic_accuracy_percent:topicPercent(topic.percent),topic_marks_awarded:Number(topic.awarded||0),
        topic_marks_possible:Number(topic.possible||0),topic_scored_responses:Number(topic.scored||0),
        topic_learners:Number(topic.students||0),topic_pending_review:Number(topic.pending||0),
        topic_skills:Array.isArray(topic.skills)?topic.skills.join(' | '):''
      });
    }

    for (const row of rows){
      const avg = average(Array.isArray(row.examPercents)?row.examPercents:[]);
      const focus = studentFocus(row);
      records.push({
        ...common,record_type:'student',student_name:row.student_name||'Student',student_id:row.student_id||'',
        student_class:row.class_name||row.class_group||'',student_year:row.year_level||'',registered:!!row.registered,
        participation:participation(row),practice_sessions:Number(row.practice||0),exam_papers_started:Number(row.examStarted||0),
        exam_papers_submitted:Number(row.examSubmitted||0),exam_papers_fully_marked:Number(row.examFullyMarked||0),
        exam_in_progress:Number(row.inProgress||0),exam_incomplete:Number(row.incomplete||0),
        average_final_exam_percent:avg,current_focus_topic:focus.topic,current_focus_status:focus.status,
        current_focus_accuracy_percent:focus.percent,responses_awaiting_review:Number(row.awaitingReview||0),
        marking_status:markingStatus(row),last_activity:row.lastActivity||''
      });
    }

    const headers = [
      'record_type','report_name','generated_at','scope_period','scope_class','scope_year','scope_mode','scope_search',
      'metric_name','metric_value','topic','topic_status','topic_accuracy_percent','topic_marks_awarded','topic_marks_possible',
      'topic_scored_responses','topic_learners','topic_pending_review','topic_skills','student_name','student_id','student_class',
      'student_year','registered','participation','practice_sessions','exam_papers_started','exam_papers_submitted',
      'exam_papers_fully_marked','exam_in_progress','exam_incomplete','average_final_exam_percent','current_focus_topic',
      'current_focus_status','current_focus_accuracy_percent','responses_awaiting_review','marking_status','last_activity'
    ];
    const filename = classFilename(reportScope);
    return {
      reportType:'class',
      title:filename.replace(/\.csv$/i,''),
      filename,
      generatedAt,
      subjectName:classSubject(reportScope),
      className:reportScope.className || '',
      studentId:'',studentName:'',
      scope:reportScope,
      headers,records
    };
  }

  function buildStudentSnapshot(){
    const row = selectedStudent();
    if (!row) return null;
    const evidence = studentEvidence(row);
    const reportScope = scope();
    const generatedAt = new Date().toISOString();
    const latestExamPercent = evidence.latestFullyMarkedExam ? finalExamPercent(evidence.latestFullyMarkedExam) : null;
    const metrics = [
      ['practice_sessions_completed',evidence.practice.length],
      ['exam_papers_submitted',Number(row.examSubmitted||0)],
      ['average_final_exam_percent',evidence.averageExam],
      ['latest_fully_marked_exam_percent',latestExamPercent],
      ['scored_responses',evidence.scored.length],
      ['marks_across_scored_evidence_percent',evidence.evidencePercent],
      ['topics_with_evidence',evidence.topics.length],
      ['responses_awaiting_review',evidence.pending],
      ['current_focus_topic',evidence.focus?.topic||''],
      ['strongest_current_topic',evidence.strength?.topic||'']
    ];
    const common = {
      report_name:'Student Performance Report',generated_at:generatedAt,
      scope_period:reportScope.period,scope_class:reportScope.className,scope_year:reportScope.year,
      scope_mode:reportScope.mode,scope_search:reportScope.search,
      student_name:row.student_name||'Student',student_id:row.student_id||'',
      student_class:row.class_name||row.class_group||'',student_year:row.year_level||''
    };
    const records = [];

    for (const [metric,value] of metrics) records.push({...common,record_type:'metric',metric_name:metric,metric_value:value});

    for (const topic of evidence.topics){
      const band = topicBand(topic);
      records.push({
        ...common,record_type:'topic',topic:topic.topic||'Unclassified',topic_status:band.label||'Learning evidence',
        topic_accuracy_percent:topicPercent(topic.percent),topic_marks_awarded:Number(topic.awarded||0),
        topic_marks_possible:Number(topic.possible||0),topic_scored_responses:Number(topic.scored||0),
        topic_pending_review:Number(topic.pending||0),topic_skills:Array.isArray(topic.skills)?topic.skills.join(' | '):''
      });
    }

    for (const session of evidence.sessions.slice().sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at))){
      const exam = session.practice_mode==='exam';
      const pending = Number(session.pending_review_count||0);
      const practiceMastery = !exam && session.mastery_percent !== null && session.mastery_percent !== undefined && Number.isFinite(Number(session.mastery_percent))
        ? Number(session.mastery_percent) : null;
      const examFinal = exam && pending===0 ? finalExamPercent(session) : null;
      const label = exam
        ? `${session.exam_year||''} ${session.paper||'Exam'}`.trim()
        : (session.topic||strandName(session)||'Practice');
      records.push({
        ...common,record_type:'activity',activity_name:label,activity_mode:exam?'Exam':'Practice',
        activity_completed_at:session.completed_at||'',practice_mastery_percent:practiceMastery,
        exam_final_percent:Number.isFinite(examFinal)?examFinal:null,
        exam_auto_marks_so_far:exam&&pending>0?Number(session.auto_marks_awarded||0):null,
        activity_pending_review:pending,activity_review_status:pending>0?'Pending review':'Complete'
      });
    }

    const headers = [
      'record_type','report_name','generated_at','scope_period','scope_class','scope_year','scope_mode','scope_search',
      'student_name','student_id','student_class','student_year','metric_name','metric_value','topic','topic_status',
      'topic_accuracy_percent','topic_marks_awarded','topic_marks_possible','topic_scored_responses','topic_pending_review','topic_skills',
      'activity_name','activity_mode','activity_completed_at','practice_mastery_percent','exam_final_percent','exam_auto_marks_so_far',
      'activity_pending_review','activity_review_status'
    ];
    const filename = studentFilename(row);
    return {
      reportType:'student',
      title:filename.replace(/\.csv$/i,''),
      filename,
      generatedAt,
      subjectName:row.student_name||'Student',
      className:row.class_name||row.class_group||'',
      studentId:row.student_id||'',studentName:row.student_name||'Student',
      scope:reportScope,
      headers,records
    };
  }

  function downloadSnapshot(snapshot){
    if (!snapshot || !Array.isArray(snapshot.headers) || !Array.isArray(snapshot.records)) return;
    downloadCsv(snapshot.filename || 'Performance Report.csv',snapshot.headers,snapshot.records);
  }

  function exportClassReport(){ downloadSnapshot(buildClassSnapshot()); }
  function exportStudentReport(){ downloadSnapshot(buildStudentSnapshot()); }

  function insertButton(printId,buttonId,label,handler){
    const printButton = byId(printId);
    if (!printButton || byId(buttonId)) return;
    const button = document.createElement('button');
    button.id = buttonId;
    button.type = 'button';
    button.className = 'outline';
    button.textContent = label;
    button.title = 'Export this report data as CSV';
    button.addEventListener('click',handler);
    printButton.insertAdjacentElement('beforebegin',button);
  }

  function ensureButtons(){
    insertButton('v50c1-print',CLASS_EXPORT_ID,'Export CSV',exportClassReport);
    insertButton('v50c2-print',STUDENT_EXPORT_ID,'Export CSV',exportStudentReport);
  }

  const api = Object.freeze({
    buildClassSnapshot,
    buildStudentSnapshot,
    downloadSnapshot,
    makeCsv
  });
  Object.defineProperty(window,'V50ReportingExport',{value:api,writable:false,configurable:false});

  function wire(){
    ensureButtons();
    const observer = new MutationObserver(()=>ensureButtons());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();

/* V5.0C3B — Teacher Report Archive.
   Saves immutable structured Class/Student report snapshots to the teacher-owned
   report_archives table. Snapshots remain until the creating teacher deletes
   them. Student-facing flows and report calculations are unchanged. */
(() => {
  'use strict';

  if (window.__v50ReportArchiveInstalled) return;
  window.__v50ReportArchiveInstalled = true;

  const TAB_ID = 'v50c3b-report-archive-tab';
  const PANEL_ID = 'report-archive-panel';
  const COUNT_ID = 'v50c3b-report-archive-count';
  const FEEDBACK_ID = 'v50c3b-report-archive-feedback';
  const LIST_ID = 'v50c3b-report-archive-body';
  const FILTER_ID = 'v50c3b-report-archive-filter';
  const SEARCH_ID = 'v50c3b-report-archive-search';
  const CLASS_SAVE_ID = 'v50c3b-save-class-report';
  const STUDENT_SAVE_ID = 'v50c3b-save-student-report';
  const STYLE_ID = 'v50c3b-report-archive-style';
  let archiveRows = [];
  let loading = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

  function cloudAvailable(){
    try { return !!cloudReady && !!cloud && !!teacherUser; }
    catch { return false; }
  }

  function reportingApi(){ return window.V50ReportingExport || null; }

  function injectStyles(){
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} .v50c3b-retention{margin:14px 0}
      #${PANEL_ID} .v50c3b-type{font-weight:800}
      #${PANEL_ID} .v50c3b-actions{display:flex;gap:7px;flex-wrap:wrap}
      #${PANEL_ID} .v50c3b-actions button{min-height:36px;padding:7px 10px;font-size:12px}
      #${PANEL_ID} .v50c3b-title{white-space:normal;min-width:220px}
      #${PANEL_ID} .v50c3b-scope{white-space:normal;min-width:180px;max-width:300px}
      #${PANEL_ID} .v50c3b-date{white-space:nowrap}
      #${CLASS_SAVE_ID},#${STUDENT_SAVE_ID}{white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function ensureArchivePanel(){
    const tabs = document.querySelector('#teacher .tabs');
    const analyticsPanel = byId('analytics-panel');
    if (!tabs || !analyticsPanel) return;

    let tab = byId(TAB_ID);
    if (!tab){
      tab = document.createElement('button');
      tab.id = TAB_ID;
      tab.type = 'button';
      tab.className = 'tab';
      tab.dataset.panel = PANEL_ID;
      tab.innerHTML = `Report Archive <span id="${COUNT_ID}" class="tag">0</span>`;
      const analyticsTab = tabs.querySelector('[data-panel="analytics-panel"]');
      analyticsTab?.insertAdjacentElement('afterend',tab);
    }

    if (!byId(PANEL_ID)){
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="header">
          <div><h2>Report Archive</h2><p class="muted">Saved Class and Student Performance Report snapshots.</p></div>
          <button id="v50c3b-refresh-archive" class="secondary" type="button">Refresh Archive</button>
        </div>
        <div class="info v50c3b-retention"><strong>Retention:</strong> archived reports are private to the teacher account that saved them and remain stored until that teacher deletes them. V5.0C3B does not automatically purge archives.</div>
        <div id="${FEEDBACK_ID}" class="feedback hidden" aria-live="polite"></div>
        <div class="teachertools">
          <select id="${FILTER_ID}" aria-label="Filter archived reports"><option value="all">All report types</option><option value="class">Class reports</option><option value="student">Student reports</option></select>
          <input id="${SEARCH_ID}" type="search" placeholder="Search report, class, student or ID" aria-label="Search archived reports">
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>Saved</th><th>Type</th><th>Report</th><th>Scope</th><th>Records</th><th>Actions</th></tr></thead>
            <tbody id="${LIST_ID}"><tr><td colspan="6" class="empty">Open Report Archive to load saved reports.</td></tr></tbody>
          </table>
        </div>
      `;
      analyticsPanel.insertAdjacentElement('afterend',panel);
    }
  }

  function feedback(kind,message){
    const root = byId(FEEDBACK_ID);
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function clearFeedback(){ byId(FEEDBACK_ID)?.classList.add('hidden'); }

  function formatDate(value){
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
  }

  function scopeText(row){
    const scope = row.scope && typeof row.scope === 'object' ? row.scope : {};
    const parts = [scope.period,scope.className,scope.year,scope.mode].filter(Boolean);
    if (scope.search) parts.push(`Search: ${scope.search}`);
    return parts.join(' · ') || 'Saved report scope';
  }

  function visibleArchiveRows(){
    const filter = byId(FILTER_ID)?.value || 'all';
    const search = String(byId(SEARCH_ID)?.value || '').trim().toLowerCase();
    return archiveRows.filter(row=>{
      if (filter !== 'all' && row.report_type !== filter) return false;
      if (!search) return true;
      return [row.title,row.subject_name,row.class_name,row.student_name,row.student_id,scopeText(row)]
        .some(value=>String(value||'').toLowerCase().includes(search));
    });
  }

  function renderArchives(){
    const body = byId(LIST_ID);
    if (!body) return;
    const rows = visibleArchiveRows();
    const count = byId(COUNT_ID);
    if (count) count.textContent = String(archiveRows.length);

    if (!rows.length){
      body.innerHTML = `<tr><td colspan="6" class="empty">${archiveRows.length?'No archived reports match these filters.':'No reports have been archived yet.'}</td></tr>`;
      return;
    }

    body.innerHTML = rows.map(row=>`
      <tr>
        <td class="v50c3b-date">${esc(formatDate(row.created_at))}</td>
        <td><span class="tag v50c3b-type">${row.report_type==='student'?'Student':'Class'}</span></td>
        <td class="v50c3b-title"><strong>${esc(row.title||'Archived report')}</strong><div class="help">${esc(row.subject_name||'')}</div></td>
        <td class="v50c3b-scope">${esc(scopeText(row))}</td>
        <td>${Number(row.record_count||0)}</td>
        <td><div class="v50c3b-actions"><button class="outline" type="button" data-archive-download="${esc(row.id)}">Download CSV</button><button class="danger" type="button" data-archive-delete="${esc(row.id)}">Delete</button></div></td>
      </tr>
    `).join('');
  }

  async function loadArchives(){
    if (loading) return;
    clearFeedback();
    if (!cloudAvailable()){
      archiveRows = [];
      renderArchives();
      feedback('try','Sign in as a teacher with cloud access to use Report Archive.');
      return;
    }
    loading = true;
    try {
      const {data,error} = await cloud
        .from('report_archives')
        .select('id,report_type,title,subject_name,class_name,student_id,student_name,scope,record_count,snapshot_version,retention_policy,created_at')
        .order('created_at',{ascending:false})
        .limit(250);
      if (error) throw error;
      archiveRows = Array.isArray(data) ? data : [];
      renderArchives();
    } catch (error){
      console.warn('Could not load report archive.',error);
      archiveRows = [];
      renderArchives();
      feedback('incorrect',`Report Archive could not be loaded. ${error?.message||''}`.trim());
    } finally {
      loading = false;
    }
  }

  function snapshotFor(kind){
    const api = reportingApi();
    if (!api) return null;
    return kind==='student' ? api.buildStudentSnapshot() : api.buildClassSnapshot();
  }

  async function saveSnapshot(kind,button){
    if (!cloudAvailable()){
      alert('Sign in as a teacher with cloud access before archiving a report.');
      return;
    }
    const snapshot = snapshotFor(kind);
    if (!snapshot || !Array.isArray(snapshot.headers) || !Array.isArray(snapshot.records)){
      alert('This report snapshot is not available yet. Refresh Analytics and try again.');
      return;
    }
    if (snapshot.records.length > 5000){
      alert('This report is too large to archive safely in one snapshot. Narrow the Analytics scope and try again.');
      return;
    }

    const original = button?.textContent || 'Save to Archive';
    if (button){ button.disabled = true; button.textContent = 'Saving…'; }
    try {
      const payload = {
        report_type:snapshot.reportType,
        title:snapshot.title,
        subject_name:snapshot.subjectName || null,
        class_name:snapshot.className || null,
        student_id:snapshot.studentId || null,
        student_name:snapshot.studentName || null,
        scope:snapshot.scope || {},
        snapshot:{
          schema_version:1,
          generated_at:snapshot.generatedAt,
          filename:snapshot.filename,
          headers:snapshot.headers,
          records:snapshot.records
        },
        record_count:snapshot.records.length,
        snapshot_version:1,
        retention_policy:'manual_delete'
      };
      const {error} = await cloud.from('report_archives').insert(payload);
      if (error) throw error;
      if (button) button.textContent = 'Saved ✓';
      await loadArchives();
      setTimeout(()=>{ if (button && document.contains(button)) button.textContent = original; },1400);
    } catch (error){
      console.warn('Could not archive report.',error);
      alert(`Report could not be archived. ${error?.message||''}`.trim());
      if (button) button.textContent = original;
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function downloadArchive(id){
    if (!cloudAvailable()) return;
    const api = reportingApi();
    if (!api) return;
    try {
      const {data,error} = await cloud
        .from('report_archives')
        .select('title,snapshot,snapshot_version')
        .eq('id',id)
        .single();
      if (error) throw error;
      if (Number(data?.snapshot_version||0)!==1) throw new Error('Unsupported archived snapshot version.');
      const snapshot = data?.snapshot || {};
      if (!Array.isArray(snapshot.headers) || !Array.isArray(snapshot.records)) throw new Error('Archived snapshot is incomplete.');
      api.downloadSnapshot({
        filename:snapshot.filename || `${data.title||'Archived Performance Report'}.csv`,
        headers:snapshot.headers,
        records:snapshot.records
      });
    } catch (error){
      console.warn('Could not download archived report.',error);
      feedback('incorrect',`Archived report could not be downloaded. ${error?.message||''}`.trim());
    }
  }

  async function deleteArchive(id){
    if (!cloudAvailable()) return;
    const row = archiveRows.find(item=>String(item.id)===String(id));
    const label = row?.title || 'this archived report';
    if (!confirm(`Delete ${label}? This removes only the saved snapshot and does not change student results.`)) return;
    try {
      const {error} = await cloud.from('report_archives').delete().eq('id',id);
      if (error) throw error;
      archiveRows = archiveRows.filter(item=>String(item.id)!==String(id));
      renderArchives();
      feedback('correct','Archived report deleted. Student results and live Analytics were not changed.');
    } catch (error){
      console.warn('Could not delete archived report.',error);
      feedback('incorrect',`Archived report could not be deleted. ${error?.message||''}`.trim());
    }
  }

  function insertSaveButton(anchorId,buttonId,kind){
    const anchor = byId(anchorId);
    if (!anchor || byId(buttonId)) return;
    const button = document.createElement('button');
    button.id = buttonId;
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = 'Save to Archive';
    button.title = 'Save an immutable teacher-only snapshot of this report';
    button.addEventListener('click',()=>saveSnapshot(kind,button));
    anchor.insertAdjacentElement('beforebegin',button);
  }

  function ensureReportButtons(){
    insertSaveButton('v50c3a-export-class-csv',CLASS_SAVE_ID,'class');
    if (!byId(CLASS_SAVE_ID)) insertSaveButton('v50c1-print',CLASS_SAVE_ID,'class');
    insertSaveButton('v50c3a-export-student-csv',STUDENT_SAVE_ID,'student');
    if (!byId(STUDENT_SAVE_ID)) insertSaveButton('v50c2-print',STUDENT_SAVE_ID,'student');
  }

  function activateArchive(){
    const tab = byId(TAB_ID);
    const panel = byId(PANEL_ID);
    if (!tab || !panel) return;
    document.querySelectorAll('#teacher .tab').forEach(item=>item.classList.remove('active'));
    document.querySelectorAll('#teacher .panel').forEach(item=>item.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    loadArchives();
  }

  function wireArchivePanel(){
    ensureArchivePanel();
    const tabs = document.querySelector('#teacher .tabs');
    tabs?.addEventListener('click',event=>{
      const clicked = event.target.closest('.tab');
      if (!clicked) return;
      if (clicked.id===TAB_ID){
        event.preventDefault();
        activateArchive();
      } else {
        byId(TAB_ID)?.classList.remove('active');
        byId(PANEL_ID)?.classList.remove('active');
      }
    });
    byId('v50c3b-refresh-archive')?.addEventListener('click',loadArchives);
    byId(FILTER_ID)?.addEventListener('change',renderArchives);
    byId(SEARCH_ID)?.addEventListener('input',renderArchives);
    byId(LIST_ID)?.addEventListener('click',event=>{
      const download = event.target.closest('[data-archive-download]');
      if (download){ downloadArchive(download.dataset.archiveDownload); return; }
      const remove = event.target.closest('[data-archive-delete]');
      if (remove) deleteArchive(remove.dataset.archiveDelete);
    });
  }

  function wire(){
    injectStyles();
    wireArchivePanel();
    ensureReportButtons();
    const observer = new MutationObserver(()=>ensureReportButtons());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
