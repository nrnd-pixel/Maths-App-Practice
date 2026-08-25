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
