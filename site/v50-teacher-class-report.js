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
        body.v50c1-printing #${OVERLAY_ID} .v50c1-tablewrap{overflow:visible!important}
        body.v50c1-printing #${OVERLAY_ID} th,body.v50c1-printing #${OVERLAY_ID} td{font-size:9px!important;padding:5px 6px!important;color:#111!important}
        body.v50c1-printing #${OVERLAY_ID} .v50c1-section{break-inside:avoid}
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
      <section class="v50c1-section"><h3>Student summary</h3><p class="v50c1-section-note">Participation, activity, marking status and topic focus mirror the current Analytics filters.</p><div class="v50c1-tablewrap"><table><thead><tr><th>Student</th><th>Class</th><th>Participation</th><th>Practice</th><th>Exam</th><th>Avg final exam</th><th>Current focus</th><th>Marking</th></tr></thead><tbody>${studentRows(rows)}</tbody></table></div></section>
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
    document.body.classList.add('v50c1-printing');
    const clear = ()=>document.body.classList.remove('v50c1-printing');
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
