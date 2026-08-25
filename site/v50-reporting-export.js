/* V5.0C3A — Reporting Export.
   Adds structured, Excel-friendly CSV exports to the existing Class and Student
   Performance Reports. Reuses already-loaded Teacher Analytics evidence only.
   No database/API request, persistence, grading rule or mastery threshold. */
(() => {
  'use strict';

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

  function classFilename(reportScope){
    const rawClass = /all/i.test(reportScope.className || '') ? 'All Classes' : (reportScope.className || 'Class');
    return `Class Performance Report - ${filenamePart(rawClass,'Class')} - ${localDateStamp()}.csv`;
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

  function exportClassReport(){
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
    downloadCsv(classFilename(reportScope),headers,records);
  }

  function exportStudentReport(){
    const row = selectedStudent();
    if (!row) return;
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
    downloadCsv(studentFilename(row),headers,records);
  }

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

  function wire(){
    ensureButtons();
    const observer = new MutationObserver(()=>ensureButtons());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
