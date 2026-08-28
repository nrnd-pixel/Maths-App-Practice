/* V5.1A6 — Post-import integrity check.
   Read-only verification of the actual teacher question bank after a validated A5 import.
   It does not insert/update/delete questions, Storage objects, or Exam Settings. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51PostImportIntegrityInstalled) return;
  if (typeof window !== 'undefined') window.__v51PostImportIntegrityInstalled = true;

  const state = {
    running:false,
    message:'',
    messageKind:'try',
    lastReport:null,
    pendingContext:null,
    consumedToken:''
  };

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const normPaper = value => norm(value).replace(/[._-]+/g,' ');

  function currentImportRows(){
    try {
      if (typeof importRows !== 'undefined' && Array.isArray(importRows)) return importRows;
    } catch {}
    return [];
  }

  function currentTeacherQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function cloudTeacherReady(){
    try {
      return typeof cloudReady !== 'undefined' && !!cloudReady && typeof teacherUser !== 'undefined' && !!teacherUser && typeof cloud !== 'undefined' && !!cloud;
    } catch {
      return false;
    }
  }

  function logicalQuestionNumber(row){
    try {
      const fn = window.V51PaperProfileValidator?.logicalQuestionNumber;
      if (typeof fn === 'function') return trim(fn(row));
    } catch {}
    const parent = trim(row?.parent_question_number);
    if (parent) return parent.replace(/^q\s*/i,'').trim();
    const raw = trim(row?.question_number).replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    return multipart ? multipart[1] : raw;
  }

  function qLabel(value){
    const raw = trim(value).replace(/^q\s*/i,'');
    return raw ? `Q${raw}` : '';
  }

  function sortedQuestionLabels(values){
    return [...new Set(Array.from(values || []).map(value => trim(value).replace(/^q\s*/i,'')).filter(Boolean))]
      .sort((a,b) => {
        const na = Number(a), nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na-nb;
        return String(a).localeCompare(String(b),undefined,{numeric:true});
      })
      .map(qLabel);
  }

  function sameList(a,b){
    const left = Array.from(a || []).map(norm).sort();
    const right = Array.from(b || []).map(norm).sort();
    return left.length === right.length && left.every((value,index) => value === right[index]);
  }

  function sumMarks(rows){
    return Array.from(rows || []).reduce((total,row) => {
      const marks = Number(row?.marks);
      return total + (Number.isFinite(marks) ? marks : 0);
    },0);
  }

  function packageExpectations(rows=currentImportRows()){
    const list = Array.from(rows || []).filter(row => row?._valid !== false);
    const active = list.filter(row => row?.active !== false);
    const logical = new Set(list.map(logicalQuestionNumber).filter(Boolean));
    const activeLogical = new Set(active.map(logicalQuestionNumber).filter(Boolean));
    const imageRefs = new Set(list.map(row => trim(row?.image_url)).filter(Boolean).map(norm));
    const multipart = sortedQuestionLabels(list.map(row => row?.parent_question_number).filter(value => trim(value)));
    const inactive = list.filter(row => row?.active === false);
    const inactiveLogical = sortedQuestionLabels(inactive.map(logicalQuestionNumber));

    return Object.freeze({
      physicalRows:list.length,
      activeRows:active.length,
      totalMarks:sumMarks(list),
      activeMarks:sumMarks(active),
      logicalQuestions:logical.size,
      activeLogicalQuestions:activeLogical.size,
      imageReferences:imageRefs.size,
      multipartGroups:multipart,
      inactiveRows:inactive.length,
      inactiveLogicalQuestions:inactiveLogical
    });
  }

  function standardPaperProfile(identity={}){
    if (norm(identity.sourceType) !== 'past_paper') return null;
    try {
      return window.V51PaperProfileValidator?.paperProfile?.(identity.paper) || null;
    } catch {
      const paper = normPaper(identity.paper);
      if (/^(?:paper\s*)?1$/.test(paper)) return {expectedLogicalQuestions:40,expectedMarks:90,label:'Paper 1'};
      if (/^(?:paper\s*)?2$/.test(paper)) return {expectedLogicalQuestions:30,expectedMarks:90,label:'Paper 2'};
      return null;
    }
  }

  function identityMatches(row,identity={}){
    return Number(row?.year_level) === Number(identity.yearLevel)
      && Number(row?.exam_year) === Number(identity.examYear)
      && normPaper(row?.paper) === normPaper(identity.paper);
  }

  function rowsForPaper(questions,identity){
    return Array.from(questions || []).filter(row => identityMatches(row,identity));
  }

  function auditPaperRows(rows,identity={}){
    const list = Array.from(rows || []);
    const active = list.filter(row => row?.active !== false);
    const logical = new Set(list.map(logicalQuestionNumber).filter(Boolean));
    const activeLogical = new Set(active.map(logicalQuestionNumber).filter(Boolean));
    const imageRows = list.filter(row => trim(row?.image_url));
    const distinctImageUrls = new Set(imageRows.map(row => trim(row.image_url)));
    const nonHttpsImageRows = imageRows
      .filter(row => !/^https:\/\//i.test(trim(row.image_url)))
      .map(row => qLabel(row.question_number || logicalQuestionNumber(row)));

    const qnoCounts = new Map();
    for (const row of list){
      const key = norm(row?.question_number);
      if (!key) continue;
      qnoCounts.set(key,(qnoCounts.get(key) || 0) + 1);
    }
    const duplicateQuestionNumbers = [...qnoCounts.entries()]
      .filter(([,count]) => count > 1)
      .map(([value,count]) => ({questionNumber:qLabel(value),count}));

    const multipartGroups = sortedQuestionLabels(list.map(row => row?.parent_question_number).filter(value => trim(value)));
    const inactive = list.filter(row => row?.active === false);
    const inactiveRows = inactive.map(row => ({
      questionNumber:qLabel(row.question_number || logicalQuestionNumber(row)),
      logicalQuestion:qLabel(logicalQuestionNumber(row)),
      marks:Number(row?.marks) || 0
    }));
    const inactiveLogicalQuestions = sortedQuestionLabels(inactive.map(logicalQuestionNumber));

    const profile = standardPaperProfile(identity);
    const missingLogicalQuestions = [];
    if (profile?.expectedLogicalQuestions){
      for (let number=1; number<=Number(profile.expectedLogicalQuestions); number+=1){
        if (!logical.has(String(number))) missingLogicalQuestions.push(`Q${number}`);
      }
    }

    return Object.freeze({
      physicalRows:list.length,
      activeRows:active.length,
      totalMarks:sumMarks(list),
      activeMarks:sumMarks(active),
      logicalQuestions:logical.size,
      activeLogicalQuestions:activeLogical.size,
      imageReferenceRows:imageRows.length,
      distinctImageUrls:distinctImageUrls.size,
      nonHttpsImageRows,
      duplicateQuestionNumbers,
      multipartGroups,
      inactiveRows,
      inactiveLogicalQuestions,
      missingLogicalQuestions
    });
  }

  function check(label,actual,expected,{severity='core',pass=null}={}){
    const ok = pass === null ? actual === expected : !!pass;
    return Object.freeze({label,actual,expected,severity,pass:ok});
  }

  function buildIntegrityReport({identity,expected,rows,examSettings=[],settingsError='',strictActiveState=false}={}){
    const actual = auditPaperRows(rows,identity);
    const profile = standardPaperProfile(identity);
    const checks = [];

    if (expected){
      checks.push(check('Physical rows',actual.physicalRows,expected.physicalRows));
      checks.push(check('Logical questions',actual.logicalQuestions,expected.logicalQuestions));
      checks.push(check('Total marks',actual.totalMarks,expected.totalMarks));
      checks.push(check('Distinct image URLs',actual.distinctImageUrls,expected.imageReferences));
      checks.push(check('Multipart groups',actual.multipartGroups.join(', ') || 'None',expected.multipartGroups.join(', ') || 'None',{pass:sameList(actual.multipartGroups,expected.multipartGroups)}));
      checks.push(check('Active rows',actual.activeRows,expected.activeRows,{severity:'state'}));
      checks.push(check('Active logical questions',actual.activeLogicalQuestions,expected.activeLogicalQuestions,{severity:'state'}));
      checks.push(check('Active marks',actual.activeMarks,expected.activeMarks,{severity:'state'}));
      checks.push(check('Inactive logical questions',actual.inactiveLogicalQuestions.join(', ') || 'None',expected.inactiveLogicalQuestions.join(', ') || 'None',{severity:'state',pass:sameList(actual.inactiveLogicalQuestions,expected.inactiveLogicalQuestions)}));
    }

    if (profile){
      checks.push(check('Paper logical profile',actual.logicalQuestions,Number(profile.expectedLogicalQuestions)));
      checks.push(check('Paper marks profile',actual.totalMarks,Number(profile.expectedMarks)));
    }
    checks.push(check('Non-HTTPS image rows',actual.nonHttpsImageRows.length,0));
    checks.push(check('Duplicate question-number groups',actual.duplicateQuestionNumbers.length,0));
    if (profile) checks.push(check('Missing logical questions',actual.missingLogicalQuestions.length,0));

    const settingRows = Array.from(examSettings || []);
    const settingExists = settingRows.length === 1;
    const settingAvailable = settingRows.some(row => row?.is_available === true);
    const activePaperComplete = profile
      ? actual.activeLogicalQuestions === Number(profile.expectedLogicalQuestions) && actual.activeMarks === Number(profile.expectedMarks)
      : actual.activeRows === actual.physicalRows;
    const availabilityConflict = settingAvailable && !activePaperComplete;

    const coreFailures = checks.filter(item => !item.pass && (item.severity === 'core' || (strictActiveState && item.severity === 'state')));
    const stateDifferences = checks.filter(item => !item.pass && item.severity === 'state');
    const settingsProblems = [];
    if (settingsError) settingsProblems.push(settingsError);
    if (settingRows.length > 1) settingsProblems.push(`${settingRows.length} Exam Setting rows found for one paper`);
    if (availabilityConflict) settingsProblems.push('Exam Setting is available while the active paper profile is incomplete');

    let status = 'pass';
    if (coreFailures.length) status = 'fail';
    else if (settingsProblems.length || (!strictActiveState && stateDifferences.length)) status = 'attention';
    else if (actual.inactiveRows.length) status = 'pass_with_review';

    return Object.freeze({
      identity:{...identity},
      expected:expected ? {...expected} : null,
      actual,
      profile,
      checks,
      coreFailures,
      stateDifferences,
      settingsError,
      settingRows:settingRows.length,
      settingExists,
      settingAvailable,
      activePaperComplete,
      availabilityConflict,
      settingsProblems,
      strictActiveState,
      status,
      integrityPass:coreFailures.length === 0,
      examReady:coreFailures.length === 0 && activePaperComplete && settingAvailable && !settingsProblems.length
    });
  }

  function currentA5Plan(){
    try { return window.V51OneConfirmationPaperImport?.buildPlan?.() || null; }
    catch { return null; }
  }

  function contextFromCurrentPackage({strictActiveState=false}={}){
    const plan = currentA5Plan();
    const identity = plan?.identity || {};
    if (!identity.examYear || !trim(identity.paper)) return null;
    const rows = currentImportRows();
    if (!rows.length) return null;
    return {
      token:`${Date.now()}-${Math.random().toString(36).slice(2)}`,
      identity:{...identity},
      expected:packageExpectations(rows),
      strictActiveState
    };
  }

  async function loadExamSettings(identity){
    if (!cloudTeacherReady()) return {rows:[],error:'Cloud Teacher mode is required for Exam Setting verification'};
    try {
      const {data,error} = await cloud.from('exam_paper_settings')
        .select('*')
        .eq('year_level',Number(identity.yearLevel))
        .eq('exam_year',Number(identity.examYear))
        .eq('paper',identity.paper);
      if (error) return {rows:[],error:error.message || String(error)};
      return {rows:Array.isArray(data) ? data : [],error:''};
    } catch (error){
      return {rows:[],error:String(error?.message || error || 'Exam Setting lookup failed')};
    }
  }

  async function refreshTeacherIfNeeded(identity,expected){
    let rows = rowsForPaper(currentTeacherQuestions(),identity);
    if (!expected?.physicalRows || rows.length >= expected.physicalRows) return rows;
    try {
      if (typeof loadTeacher === 'function') await loadTeacher();
    } catch {}
    rows = rowsForPaper(currentTeacherQuestions(),identity);
    return rows;
  }

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function paperLabel(identity={}){
    return [identity.examYear,identity.paper].filter(Boolean).join(' ') || 'Current paper';
  }

  function statusTitle(report){
    if (report.status === 'fail') return '❌ Post-import integrity FAILED';
    if (report.status === 'attention') return '⚠ Post-import integrity needs attention';
    if (report.status === 'pass_with_review') return '✅ Import integrity PASS · ⚠ Review item remains';
    return '✅ Post-import integrity PASS';
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById('v51a6-integrity-panel');
    if (root) return root;
    const a5 = document.getElementById('v51a5-import-panel');
    if (!a5) return null;
    root = document.createElement('div');
    root.id = 'v51a6-integrity-panel';
    root.className = 'info';
    root.style.marginTop = '12px';
    root.innerHTML = `
      <strong>V5.1A6 — Post-import integrity</strong>
      <p class="muted" style="margin:7px 0 10px">Read-only verification of the actual question bank and Exam Setting after import. It runs automatically after A5 and can also verify the currently previewed paper.</p>
      <div class="buttons">
        <button id="v51a6-verify-paper" class="outline" type="button" disabled>Verify Current Paper</button>
      </div>
      <div id="v51a6-integrity-status" class="help" style="margin-top:8px">Preview a paper package first.</div>`;
    a5.insertAdjacentElement('afterend',root);
    return root;
  }

  function render(){
    const root = ensurePanel();
    if (!root) return null;
    const button = document.getElementById('v51a6-verify-paper');
    const status = document.getElementById('v51a6-integrity-status');
    const currentContext = contextFromCurrentPackage();
    button.disabled = state.running || !currentContext || !cloudTeacherReady();
    button.textContent = state.running ? 'Verifying…' : 'Verify Current Paper';

    if (state.running){
      status.className = 'feedback try';
      status.textContent = state.message || 'Checking the actual question bank…';
      return state.lastReport;
    }

    const report = state.lastReport;
    if (!report){
      status.className = state.message ? `feedback ${state.messageKind}` : 'help';
      status.textContent = state.message || (currentContext ? 'Ready for a read-only integrity check.' : 'Preview a paper package first.');
      return null;
    }

    const actual = report.actual;
    const checkRows = report.checks.map(item => `<div>${item.pass?'✅':'⚠'} <strong>${esc(item.label)}:</strong> ${esc(item.actual)}${item.expected !== undefined ? ` / expected ${esc(item.expected)}` : ''}</div>`).join('');
    const inactive = actual.inactiveRows.length
      ? actual.inactiveRows.map(item => `${esc(item.questionNumber)} (${esc(item.marks)} mark${Number(item.marks)===1?'':'s'})`).join(', ')
      : 'None';
    const multipart = actual.multipartGroups.length ? actual.multipartGroups.map(esc).join(', ') : 'None';
    const duplicates = actual.duplicateQuestionNumbers.length
      ? actual.duplicateQuestionNumbers.map(item => `${esc(item.questionNumber)} ×${esc(item.count)}`).join(', ')
      : 'None';
    const missing = actual.missingLogicalQuestions.length ? actual.missingLogicalQuestions.map(esc).join(', ') : 'None';
    const settingText = report.settingRows === 0
      ? 'No setting row · unavailable in cloud Exam Mode'
      : `${report.settingRows} setting row${report.settingRows===1?'':'s'} · ${report.settingAvailable?'AVAILABLE':'unavailable'}`;
    const settingIssues = report.settingsProblems.length ? `<div style="margin-top:6px">⚠ ${report.settingsProblems.map(esc).join('<br>⚠ ')}</div>` : '';

    status.className = `feedback ${report.status === 'fail' ? 'incorrect' : report.status === 'pass' ? 'correct' : 'try'}`;
    status.innerHTML = `
      <div><strong>${esc(statusTitle(report))}</strong></div>
      <div style="margin-top:8px;display:grid;gap:6px">
        <div><strong>${esc(paperLabel(report.identity))}</strong></div>
        ${checkRows}
        <div><strong>Active state:</strong> ${actual.activeRows}/${actual.physicalRows} rows · ${actual.activeLogicalQuestions}/${actual.logicalQuestions} logical questions · ${actual.activeMarks}/${actual.totalMarks} marks</div>
        <div><strong>Images:</strong> ${actual.imageReferenceRows} row references · ${actual.distinctImageUrls} distinct HTTPS URLs · ${actual.nonHttpsImageRows.length} non-HTTPS</div>
        <div><strong>Multipart groups:</strong> ${multipart}</div>
        <div><strong>Duplicate question numbers:</strong> ${duplicates}</div>
        <div><strong>Missing logical questions:</strong> ${missing}</div>
        <div><strong>Inactive review rows:</strong> ${inactive}</div>
        <div><strong>Exam Setting:</strong> ${esc(settingText)}</div>
        <div><strong>Exam readiness:</strong> ${report.examReady?'READY':'Not ready'}</div>
        ${settingIssues}
      </div>`;
    return report;
  }

  async function verifyContext(context,{automatic=false}={}){
    if (!context?.identity?.examYear || !trim(context.identity.paper)) return null;
    if (!cloudTeacherReady()){
      state.message = 'Cloud Teacher mode is required for post-import integrity verification.';
      state.messageKind = 'incorrect';
      render();
      return null;
    }

    state.running = true;
    state.message = automatic ? 'Import finished. Verifying actual database state…' : 'Verifying actual database state…';
    state.messageKind = 'try';
    render();

    try {
      const rows = await refreshTeacherIfNeeded(context.identity,context.expected);
      const settings = await loadExamSettings(context.identity);
      const report = buildIntegrityReport({
        identity:context.identity,
        expected:context.expected,
        rows,
        examSettings:settings.rows,
        settingsError:settings.error,
        strictActiveState:!!context.strictActiveState
      });
      state.lastReport = report;
      state.message = '';
      state.messageKind = report.integrityPass ? 'correct' : 'incorrect';
      return report;
    } catch (error){
      state.message = String(error?.message || error || 'Post-import integrity verification failed.');
      state.messageKind = 'incorrect';
      return null;
    } finally {
      state.running = false;
      render();
    }
  }

  async function verifyCurrentPaper(){
    const context = contextFromCurrentPackage({strictActiveState:false});
    if (!context){
      state.message = 'Preview a paper package first so A6 knows what the database should contain.';
      state.messageKind = 'try';
      render();
      return null;
    }
    return verifyContext(context,{automatic:false});
  }

  function captureBeforeA5Import(){
    const context = contextFromCurrentPackage({strictActiveState:true});
    if (context) state.pendingContext = context;
  }

  function maybeAutoVerify(){
    if (state.running || !state.pendingContext) return;
    const status = typeof document !== 'undefined' ? document.getElementById('v51a5-import-status') : null;
    const text = status?.textContent || '';
    if (!/imported successfully/i.test(text)) return;
    const context = state.pendingContext;
    if (!context.token || state.consumedToken === context.token) return;
    state.consumedToken = context.token;
    state.pendingContext = null;
    verifyContext(context,{automatic:true});
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensurePanel()) return;
    document.getElementById('v51a6-verify-paper')?.addEventListener('click',verifyCurrentPaper);
    document.getElementById('v51a5-import-paper')?.addEventListener('click',captureBeforeA5Import,true);

    const a5Status = document.getElementById('v51a5-import-status');
    if (a5Status && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(() => window.requestAnimationFrame(() => { render(); maybeAutoVerify(); }));
      observer.observe(a5Status,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    for (const id of ['v51a4-package-report','import-summary']){
      const node = document.getElementById(id);
      if (node && typeof MutationObserver !== 'undefined'){
        const observer = new MutationObserver(() => window.requestAnimationFrame(render));
        observer.observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      }
    }
    render();
  }

  const api = Object.freeze({
    logicalQuestionNumber,
    packageExpectations,
    rowsForPaper,
    auditPaperRows,
    buildIntegrityReport,
    contextFromCurrentPackage,
    verifyCurrentPaper,
    verifyContext,
    render
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51PostImportIntegrity',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
