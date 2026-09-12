const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const {
  installSupabaseMock,
  openApp,
  loginTeacher,
  signInStudent,
  STUDENT,
} = require('./helpers.cjs');

const CLASS_1 = Object.freeze({ id:'class-6a', name:'6A', year_level:6, active:true });
const CLASS_2 = Object.freeze({ id:'class-6b', name:'6B', year_level:6, active:true });
const STUDENTS = Object.freeze([
  { id:'roster-a', class_id:CLASS_1.id, student_id:'A001', student_name:'Aisha', active:true },
  { id:'roster-b', class_id:CLASS_1.id, student_id:'B002', student_name:'Bilal', active:true },
  { id:'roster-c', class_id:CLASS_1.id, student_id:'C003', student_name:'Citra', active:true },
  { id:'roster-d', class_id:CLASS_2.id, student_id:'D004', student_name:'Danish', active:true },
]);

const QUESTIONS = Object.freeze([
  {
    id:'ta-q-number-1', year_level:6, strand:'number', topic:'Whole Numbers',
    question_number:'TA1', source_type:'practice', source:'Teacher checkpoint 2',
    question_text:'Teacher checkpoint 2 number fixture', active:true, practice_eligible:true,
  },
  {
    id:'ta-q-number-2', year_level:6, strand:'number', topic:'Whole Numbers',
    question_number:'TA2', source_type:'practice', source:'Teacher checkpoint 2',
    question_text:'Teacher checkpoint 2 number fixture 2', active:true, practice_eligible:true,
  },
  {
    id:'ta-q-fraction-1', year_level:6, strand:'number', topic:'Fractions',
    question_number:'TA3', source_type:'practice', source:'Teacher checkpoint 2',
    question_text:'Teacher checkpoint 2 fractions fixture', active:true, practice_eligible:true,
  },
]);

function pastIso(hours=1){ return new Date(Date.now()-hours*60*60*1000).toISOString(); }
function futureIso(hours=1){ return new Date(Date.now()+hours*60*60*1000).toISOString(); }
function localInputValue(value){
  const date = new Date(value);
  const shifted = new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return shifted.toISOString().slice(0,16);
}
function dueTodayIso(){
  const now = new Date();
  const end = new Date(now);
  end.setHours(23,59,59,999);
  const remaining = Math.max(2_000,end.getTime()-now.getTime());
  const offset = Math.max(1_000,Math.min(30*60*1000,Math.floor(remaining/2)));
  return new Date(now.getTime()+offset).toISOString();
}

function corsHeaders(extra={}){
  return {
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS,HEAD',
    'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,range',
    'access-control-expose-headers':'content-range',
    ...extra,
  };
}

async function fulfillJson(route,body,status=200,extra={}){
  await route.fulfill({
    status,
    headers:corsHeaders({'content-type':'application/json; charset=utf-8',...extra}),
    body:JSON.stringify(body),
  });
}

function requestJson(request){
  try { return request.postDataJSON() || {}; }
  catch { return {}; }
}

function eqFilter(url,key){
  const raw=url.searchParams.get(key) || '';
  return raw.startsWith('eq.') ? raw.slice(3) : '';
}

function clone(value){ return JSON.parse(JSON.stringify(value)); }

function assignment(id,{
  classId=CLASS_1.id,
  strand='number',
  topic='Whole Numbers',
  questionCount=5,
  active=true,
  createdAt=pastIso(48),
  opensAt=null,
  closesAt=futureIso(24),
}={}){
  return {
    id,
    class_id:classId,
    strand,
    topic,
    question_count:questionCount,
    active,
    created_at:createdAt,
    updated_at:createdAt,
    opens_at:opensAt,
    closes_at:closesAt,
  };
}

function recipient(assignmentId,studentId){
  return { assignment_id:assignmentId, roster_student_id:studentId };
}

function attempt(assignmentId,studentId,{
  status='in_progress',
  sessionId=null,
  startedAt=pastIso(6),
  completedAt=null,
}={}){
  return {
    id:`attempt-${assignmentId}-${studentId}`,
    assignment_id:assignmentId,
    roster_student_id:studentId,
    status,
    practice_session_id:sessionId,
    started_at:startedAt,
    completed_at:completedAt,
    updated_at:completedAt || startedAt,
  };
}

function analyticsFixture(priorityIds=['roster-a','roster-b'],sessionOverrides={}){
  const sessions=[];
  const answers=[];
  for(const student of STUDENTS){
    if(!priorityIds.includes(student.id)) continue;
    const override=sessionOverrides[student.id] || {};
    const session={
      id:override.id || `result-${student.id}`,
      roster_student_id:student.id,
      student_id:student.student_id,
      student_name:student.student_name,
      year_level:6,
      class_group:student.class_id===CLASS_1.id ? CLASS_1.name : CLASS_2.name,
      practice_mode:'mixed',
      strand:'number',
      topic:'Whole Numbers',
      auto_total:override.auto_total ?? 5,
      total:override.total ?? 5,
      mastery_percent:override.mastery_percent ?? 40,
      first_try_percent:override.first_try_percent ?? 35,
      hints_used:override.hints_used ?? 0,
      pending_review_count:0,
      completed_at:override.completed_at || pastIso(2),
      result_code:override.result_code || `RESULT-${student.student_id}`,
    };
    sessions.push(session);
    for(let i=0;i<3;i++){
      answers.push({
        id:`answer-${student.id}-${i}`,
        session_id:session.id,
        strand:'number',
        topic:'Whole Numbers',
        skill:'Whole-number support',
        marks_possible:1,
        marks_awarded:0,
        correct:false,
        review_status:'auto',
        practice_sessions:session,
      });
    }
  }
  return {sessions,answers};
}

async function installTeacherAssignmentRoutes(page,{
  assignments=[],
  recipients=[],
  attempts=[],
}={}){
  const state={
    assignments:clone(assignments),
    recipients:clone(recipients),
    attempts:clone(attempts),
    assignmentReads:0,
    recipientReads:0,
    attemptReads:0,
    assignmentWrites:[],
    createRpcs:[],
  };

  await page.route('**/rest/v1/practice_assignments*',async route=>{
    const request=route.request();
    const method=request.method().toUpperCase();
    if(method==='OPTIONS'){
      await route.fulfill({status:204,headers:corsHeaders()});
      return;
    }
    const url=new URL(request.url());
    if(method==='GET' || method==='HEAD'){
      state.assignmentReads += 1;
      let rows=state.assignments.slice();
      const id=eqFilter(url,'id');
      const classId=eqFilter(url,'class_id');
      if(id) rows=rows.filter(row=>String(row.id)===id);
      if(classId) rows=rows.filter(row=>String(row.class_id)===classId);
      await fulfillJson(route,rows,200,{'content-range':rows.length?`0-${rows.length-1}/${rows.length}`:'*/0'});
      return;
    }
    if(method==='PATCH'){
      const body=requestJson(request);
      const id=eqFilter(url,'id');
      state.assignmentWrites.push({id,body:clone(body)});
      state.assignments=state.assignments.map(row=>
        !id || String(row.id)===id ? {...row,...clone(body)} : row
      );
      await fulfillJson(route,[]);
      return;
    }
    await fulfillJson(route,{message:`Unexpected assignment method ${method}`},409);
  });

  await page.route('**/rest/v1/practice_assignment_recipients*',async route=>{
    const method=route.request().method().toUpperCase();
    if(method==='OPTIONS'){
      await route.fulfill({status:204,headers:corsHeaders()});
      return;
    }
    if(method==='GET' || method==='HEAD'){
      state.recipientReads += 1;
      await fulfillJson(route,state.recipients,200,{'content-range':state.recipients.length?`0-${state.recipients.length-1}/${state.recipients.length}`:'*/0'});
      return;
    }
    await fulfillJson(route,{message:`Unexpected recipient method ${method}`},409);
  });

  await page.route('**/rest/v1/practice_assignment_attempts*',async route=>{
    const method=route.request().method().toUpperCase();
    if(method==='OPTIONS'){
      await route.fulfill({status:204,headers:corsHeaders()});
      return;
    }
    if(method==='GET' || method==='HEAD'){
      state.attemptReads += 1;
      await fulfillJson(route,state.attempts,200,{'content-range':state.attempts.length?`0-${state.attempts.length-1}/${state.attempts.length}`:'*/0'});
      return;
    }
    await fulfillJson(route,{message:`Unexpected attempt method ${method}`},409);
  });

  await page.route('**/rest/v1/rpc/create_teacher_practice_assignments*',async route=>{
    const body=requestJson(route.request());
    state.createRpcs.push(clone(body));
    await fulfillJson(route,{
      audience:Array.isArray(body.p_target_student_ids) && body.p_target_student_ids.length ? 'students' : 'class',
      student_count:Array.isArray(body.p_target_student_ids) ? body.p_target_student_ids.length : 0,
      class_count:Array.isArray(body.p_class_ids) ? body.p_class_ids.length : 1,
      recommended_count:Number(body.p_question_count || 5),
    });
  });

  return state;
}

async function seedTeacherGlobals(page,{priorityIds=['roster-a','roster-b'],sessionOverrides={}}={}){
  const analytics=analyticsFixture(priorityIds,sessionOverrides);
  await page.evaluate(({classes,students,questions,sessions,answers})=>{
    teacherClasses=classes;
    teacherStudents=students;
    teacherQuestions=questions;
    teacherResults=sessions;
    teacherAllAnswers=answers;
    teacherReviewAnswers=[];
    teacherAttempts=[];
    selectedClassId=classes[0].id;
    renderClassAdmin();
    renderAnalytics();
  },{
    classes:[CLASS_1,CLASS_2],
    students:STUDENTS,
    questions:QUESTIONS,
    sessions:analytics.sessions,
    answers:analytics.answers,
  });
  await page.evaluate(async()=>{
    await window.AssignmentsTeacher.refresh();
    renderAnalytics();
  });
  const analyticsTab=page.locator('#teacher .tab[data-panel="analytics-panel"]');
  await analyticsTab.click();
  await expect(page.locator('#analytics-panel')).toHaveClass(/active/);
  await page.evaluate(()=>renderAnalytics());
  await expect(page.locator('.v42-action-center')).toBeVisible();
  return analytics;
}

async function setupTeacher(page,options={}){
  const base=await installSupabaseMock(page);
  const data=await installTeacherAssignmentRoutes(page,options);
  await openApp(page);
  await loginTeacher(page);
  await page.waitForTimeout(100);
  const analytics=await seedTeacherGlobals(page,options);
  return {base,data,analytics};
}

function supportRow(page,studentName){
  return page.locator('#v42-support-list .v42-action-row').filter({hasText:studentName}).first();
}

async function openClasses(page){
  await page.locator('#teacher .tab[data-panel="classes-panel"]').click();
  await expect(page.locator('#classes-panel')).toHaveClass(/active/);
  await page.evaluate(async()=>{
    renderClassAdmin();
    await window.AssignmentsTeacher.refresh();
  });
  await expect(page.locator('#v43b-practice-assignment-admin')).toBeAttached();
}

async function openAnalytics(page){
  await page.locator('#teacher .tab[data-panel="analytics-panel"]').click();
  await expect(page.locator('#analytics-panel')).toHaveClass(/active/);
  await page.evaluate(()=>renderAnalytics());
  await expect(page.locator('#v42-support-list')).toBeAttached();
}

function cardForAssignment(page,id){
  return page.locator(`#v43b-list .v43b-toggle[data-id="${id}"]`).locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " v43b-card ")][1]');
}

async function installHighlightRecorder(page){
  await page.evaluate(()=>{
    window.__phase4AssignmentHighlightEvents=[];
    window.__phase4AssignmentHighlightObserver?.disconnect?.();
    const record=card=>{
      if(!(card instanceof Element) || !card.classList?.contains('v43b-card')) return;
      const toggle=card.querySelector('.v43b-toggle[data-id]');
      const id=toggle?.dataset.id || '';
      for(const name of ['v44c-highlight','v44c-highlight-strong','v47-history-highlight']){
        if(card.classList.contains(name)){
          const key=`${id}:${name}`;
          if(!window.__phase4AssignmentHighlightEvents.includes(key)) window.__phase4AssignmentHighlightEvents.push(key);
        }
      }
    };
    // Observe document.body so the recorder catches mutations in any panel,
    // including panels that don't exist in the DOM at recorder-install time
    // (e.g. #v43b-practice-assignment-admin is only rendered after openClasses).
    const observer=new MutationObserver(records=>{
      for(const mutation of records){
        if(mutation.type==='attributes') record(mutation.target);
        mutation.addedNodes?.forEach(node=>{
          if(!(node instanceof Element)) return;
          if(node.matches?.('.v43b-card')) record(node);
          node.querySelectorAll?.('.v43b-card').forEach(record);
        });
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    window.__phase4AssignmentHighlightObserver=observer;
  });
}

async function waitForRecordedHighlight(page,id,className){
  await expect.poll(()=>page.evaluate(({id,className})=>
    (window.__phase4AssignmentHighlightEvents || []).includes(`${id}:${className}`),{id,className}),
  {timeout:20_000}).toBe(true);
}

async function waitForQueueSettled(page){
  await expect.poll(async()=>{
    const rows=page.locator('#v42-support-list > .v42-action-row');
    const count=await rows.count();
    for(let i=0;i<count;i++){
      const row=rows.nth(i);
      const status=row.locator('.v44c-intervention-status');
      const assign=row.locator('.v44a-assign-practice');
      if(await status.count()) continue;
      if(await assign.count()) continue;
      return false;
    }
    return count>0;
  },{timeout:12_000}).toBe(true);
}

test.describe('Phase 4 teacher assignments checkpoint 2 — full staged UI-contract gates A-L',()=>{
  test('A — assignments-teacher still renders the exact V43B browser contract',async({page})=>{
    const a=assignment('assign-a');
    await setupTeacher(page,{assignments:[a]});
    await openClasses(page);

    for(const selector of [
      '#v43b-practice-assignment-admin',
      '#v43b-audience',
      '#v43b-student-options',
      '#v43b-strand',
      '#v43b-topic',
      '#v43b-count',
      '#v43b-list',
    ]) await expect(page.locator(selector)).toHaveCount(1);

    const toggle=page.locator('#v43b-list .v43b-toggle[data-id="assign-a"][data-active="true"]');
    await expect(toggle).toHaveCount(1);
    await expect(toggle.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " v43b-card ")][1]')).toHaveCount(1);
  });

  test('B — Action Center individual prefill preserves V43B values and never auto-creates',async({page})=>{
    const {data}=await setupTeacher(page,{assignments:[],priorityIds:['roster-a','roster-b']});
    const row=supportRow(page,'Aisha');
    await expect(row.locator('.v44a-assign-practice')).toBeVisible();
    await row.locator('.v44a-assign-practice').click();

    await expect(page.locator('#classes-panel')).toHaveClass(/active/);
    await expect(page.locator('#v43b-audience')).toHaveValue('students');
    await expect(page.locator('#v43b-student-options')).toHaveAttribute('data-class-id',CLASS_1.id);
    await expect(page.locator('#v43b-student-options input[value="roster-a"]')).toBeChecked();
    await expect(page.locator('#v43b-student-options input[value="roster-b"]')).not.toBeChecked();
    await expect(page.locator('#v43b-strand')).toHaveValue('number');
    await expect(page.locator('#v43b-topic')).toHaveValue('Whole Numbers');
    await expect(page.locator('#v43b-count')).toHaveValue('5');
    expect(data.createRpcs).toEqual([]);
  });

  test('C — shared-focus prefill selects all and only the intended learners without auto-create',async({page})=>{
    const {data}=await setupTeacher(page,{assignments:[],priorityIds:['roster-a','roster-b']});
    const group=page.locator('#v44b-shared-focus-groups .v44b-card').filter({hasText:'Whole Numbers'}).first();
    await expect(group).toBeVisible();
    await expect(group).toContainText('2 learners');
    await group.locator('.v44b-assign').click();

    await expect(page.locator('#v43b-audience')).toHaveValue('students');
    await expect(page.locator('#v43b-student-options input[value="roster-a"]')).toBeChecked();
    await expect(page.locator('#v43b-student-options input[value="roster-b"]')).toBeChecked();
    await expect(page.locator('#v43b-student-options input[value="roster-c"]')).not.toBeChecked();
    await expect(page.locator('#v43b-strand')).toHaveValue('number');
    await expect(page.locator('#v43b-topic')).toHaveValue('Whole Numbers');
    await expect(page.locator('#v43b-count')).toHaveValue('5');
    expect(data.createRpcs).toEqual([]);
  });

  test('D — existing intervention Review Practice targets the exact V43B card and clarity layer',async({page})=>{
    const a=assignment('assign-review');
    await setupTeacher(page,{
      assignments:[a],
      recipients:[recipient(a.id,'roster-a')],
      attempts:[attempt(a.id,'roster-a',{status:'in_progress'})],
      priorityIds:['roster-a'],
    });
    await installHighlightRecorder(page);
    const row=supportRow(page,'Aisha');
    await expect(row.locator('.v44c-intervention-status.in-progress')).toBeVisible();
    await expect(row.locator('.v44c-review-practice')).toBeVisible();
    await expect(row.locator('.v44a-assign-practice')).toHaveClass(/hidden/);
    await row.locator('.v44c-review-practice').click();

    await waitForRecordedHighlight(page,a.id,'v44c-highlight');
    await waitForRecordedHighlight(page,a.id,'v44c-highlight-strong');
    await expect(cardForAssignment(page,a.id)).toHaveCount(1);
    await expect(page.locator('#v44c-review-note')).toContainText('Aisha');
  });

  test('E — completed intervention displays recorded outcome only and opens the authoritative Results row',async({page})=>{
    const a=assignment('assign-completed');
    const sessionId='result-roster-a';
    await setupTeacher(page,{
      assignments:[a],
      recipients:[recipient(a.id,'roster-a')],
      attempts:[attempt(a.id,'roster-a',{status:'completed',sessionId,completedAt:pastIso(1)})],
      priorityIds:['roster-a'],
      sessionOverrides:{'roster-a':{id:sessionId,mastery_percent:63,first_try_percent:55,auto_total:5,hints_used:1}},
    });

    const row=supportRow(page,'Aisha');
    await expect(row.locator('.v44c-intervention-status.completed')).toBeVisible();
    await expect(row.locator('.v45b-outcome-detail')).toContainText('63% mastery');
    await expect(row.locator('.v45b-outcome-detail')).toContainText('55% first try');
    await expect(row.locator('.v45b-outcome-detail')).toContainText('5 questions');
    await expect(row.locator('.v45b-outcome-detail')).toContainText('1 hint');
    await expect(row).toHaveAttribute('data-v45b-outcome-session',sessionId);
    expect((await row.locator('.v45b-outcome-detail').innerText()).toLowerCase()).not.toContain('improvement');

    await row.locator('.v45b-open-results').click();
    await expect(page.locator('#results-panel')).toHaveClass(/active/);
    await expect(page.locator('#v45b-results-note')).toContainText('Aisha');
    await expect(page.locator('#results-body tr.v45b-result-highlight')).toHaveCount(1);
  });

  test('F — CSV export follows the real V45A filter, includes recorded outcomes, and performs no mutations',async({page})=>{
    const a=assignment('assign-export');
    const sessionId='result-roster-a';
    const {data}=await setupTeacher(page,{
      assignments:[a],
      recipients:[recipient(a.id,'roster-a')],
      attempts:[attempt(a.id,'roster-a',{status:'completed',sessionId,completedAt:pastIso(1)})],
      priorityIds:['roster-a','roster-b'],
      sessionOverrides:{'roster-a':{id:sessionId,mastery_percent:72,first_try_percent:61,auto_total:5,hints_used:2}},
    });
    await waitForQueueSettled(page);
    const completedFilter=page.locator('#v45-intervention-queue-tools .v45-queue-filter[data-filter="completed"]');
    await expect(completedFilter).toBeVisible();
    await completedFilter.click();
    await expect(completedFilter).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.v46-export-queue')).toBeVisible();

    const beforeAnalytics=await page.evaluate(()=>JSON.stringify({
      visible:analyticsVisibleRows,
      context:analyticsContext,
      results:teacherResults,
    }));
    const writesBefore=data.assignmentWrites.length;
    const createsBefore=data.createRpcs.length;

    const [download]=await Promise.all([
      page.waitForEvent('download'),
      page.locator('.v46-export-queue').click(),
    ]);
    const path=await download.path();
    const csv=fs.readFileSync(path,'utf8');

    expect(csv).toContain('queue_filter');
    expect(csv).toContain('completed');
    expect(csv).toContain('Aisha');
    expect(csv).not.toContain('Bilal');
    expect(csv).toContain('Whole Numbers');
    expect(csv).toContain('72');
    expect(csv).toContain('61');
    expect(csv).toContain('analytics_period');
    expect(csv).toContain('analytics_class');

    const afterAnalytics=await page.evaluate(()=>JSON.stringify({
      visible:analyticsVisibleRows,
      context:analyticsContext,
      results:teacherResults,
    }));
    expect(afterAnalytics).toBe(beforeAnalytics);
    expect(data.assignmentWrites.length).toBe(writesBefore);
    expect(data.createRpcs.length).toBe(createsBefore);
  });

  test('G — history Review/Open Results/Assign Again preserve V43B and no-auto-create boundaries',async({page})=>{
    const completed=assignment('assign-history-completed',{createdAt:pastIso(72),questionCount:5});
    const outstanding=assignment('assign-history-outstanding',{topic:'Fractions',questionCount:10,createdAt:pastIso(24)});
    const sessionId='result-roster-a';
    const {data}=await setupTeacher(page,{
      assignments:[outstanding,completed],
      recipients:[recipient(outstanding.id,'roster-a'),recipient(completed.id,'roster-a')],
      attempts:[
        attempt(outstanding.id,'roster-a',{status:'in_progress'}),
        attempt(completed.id,'roster-a',{status:'completed',sessionId,completedAt:pastIso(2)}),
      ],
      priorityIds:['roster-a'],
      sessionOverrides:{'roster-a':{id:sessionId,mastery_percent:68,first_try_percent:58,auto_total:5,hints_used:1}},
    });

    let row=supportRow(page,'Aisha');
    await expect(row.locator('.v47-history-button')).toBeVisible();
    await row.locator('.v47-history-button').click();
    await expect(page.locator('#v47-intervention-history .v47-history-card')).toHaveCount(2);

    await installHighlightRecorder(page);
    const outstandingHistory=page.locator('#v47-intervention-history .v47-history-card').filter({hasText:'Fractions'});
    await outstandingHistory.locator('.v47-review-practice').click();
    await waitForRecordedHighlight(page,outstanding.id,'v47-history-highlight');
    await expect(cardForAssignment(page,outstanding.id)).toHaveCount(1);

    await openAnalytics(page);
    row=supportRow(page,'Aisha');
    await row.locator('.v47-history-button').click();
    const completedHistory=page.locator('#v47-intervention-history .v47-history-card').filter({hasText:'Whole Numbers'});
    await completedHistory.locator('.v47-open-results').click();
    await expect(page.locator('#results-panel')).toHaveClass(/active/);
    await expect(page.locator('#v47-history-results-note')).toContainText('Aisha');
    await expect(page.locator('#results-body tr.v47-history-highlight')).toHaveCount(1);

    await openAnalytics(page);
    row=supportRow(page,'Aisha');
    await row.locator('.v47-history-button').click();
    const completedAgain=page.locator('#v47-intervention-history .v47-history-card').filter({hasText:'Whole Numbers'});
    await expect(completedAgain.locator('.v47b-assign-again')).toBeVisible();
    await completedAgain.locator('.v47b-assign-again').click();
    await expect(page.locator('#v43b-audience')).toHaveValue('students');
    await expect(page.locator('#v43b-student-options input[value="roster-a"]')).toBeChecked();
    await expect(page.locator('#v43b-strand')).toHaveValue('number');
    await expect(page.locator('#v43b-topic')).toHaveValue('Whole Numbers');
    await expect(page.locator('#v43b-count')).toHaveValue('5');
    expect(data.createRpcs).toEqual([]);
  });

  test('H — class overview derives needs-assignment/outstanding/completed from the decorated queue',async({page})=>{
    const inProgress=assignment('assign-h-inprogress');
    const completed=assignment('assign-h-completed');
    await setupTeacher(page,{
      assignments:[inProgress,completed],
      recipients:[recipient(inProgress.id,'roster-b'),recipient(completed.id,'roster-c')],
      attempts:[
        attempt(inProgress.id,'roster-b',{status:'in_progress'}),
        attempt(completed.id,'roster-c',{status:'completed'}),
      ],
      priorityIds:['roster-a','roster-b','roster-c'],
    });
    await waitForQueueSettled(page);
    const overview=page.locator('#v47c-class-intervention-overview');
    await expect(overview).toBeVisible();
    const stats=overview.locator('.v47c-overview-stat');
    await expect(stats.filter({hasText:'priority learners'}).locator('strong')).toHaveText('3');
    await expect(stats.filter({hasText:'need assignment'}).locator('strong')).toHaveText('1');
    await expect(stats.filter({hasText:'outstanding'}).locator('strong')).toHaveText('1');
    await expect(stats.filter({hasText:'completed'}).locator('strong')).toHaveText('1');
  });

  test('I — teacher deadline monitor classifies selected-class deadlines and Review reaches V43B',async({page})=>{
    const rows=[
      assignment('deadline-overdue',{closesAt:pastIso(24)}),
      assignment('deadline-today',{closesAt:dueTodayIso()}),
      assignment('deadline-soon',{closesAt:futureIso(30)}),
      assignment('deadline-none',{closesAt:null}),
    ];
    await setupTeacher(page,{assignments:rows,priorityIds:[]});
    await openClasses(page);
    const panel=page.locator('#v48a-deadline-monitoring');
    await expect(panel).toBeVisible();
    const summary=panel.locator('.v48a-summary-card');
    await expect(summary.nth(0).locator('strong')).toHaveText('1');
    await expect(summary.nth(1).locator('strong')).toHaveText('1');
    await expect(summary.nth(2).locator('strong')).toHaveText('1');
    await expect(summary.nth(3).locator('strong')).toHaveText('1');

    const review=panel.locator('.v48a-row[data-assignment-id="deadline-overdue"] .v48a-review');
    await review.click();
    await expect(cardForAssignment(page,'deadline-overdue')).toHaveCount(1);
  });

  test('J — deadline edit updates only target fields, emits event, refreshes V48A and V43B, and preserves access state',async({page})=>{
    const a=assignment('deadline-edit',{closesAt:futureIso(24),active:true});
    const {data}=await setupTeacher(page,{assignments:[a],priorityIds:[]});
    await openClasses(page);
    await page.evaluate(()=>{
      window.__deadlineAssignmentEvents=0;
      window.addEventListener('math-practice-assignments-changed',()=>{ window.__deadlineAssignmentEvents += 1; });
    });

    const panel=page.locator('#v48a-deadline-monitoring');
    const oldCardHelp=await cardForAssignment(page,a.id).locator('.v43b-card-head .help').nth(1).innerText();
    const adjust=panel.locator(`.v48a-row[data-assignment-id="${a.id}"] .v48c-adjust`);
    await expect(adjust).toBeVisible();
    await adjust.click();
    const target=futureIso(36);
    await page.locator('#v48c-target-dialog .v48c-target-input').fill(localInputValue(target));
    await page.locator('#v48c-target-dialog .v48c-save').click();

    await expect.poll(()=>data.assignmentWrites.length,{timeout:10_000}).toBe(1);
    const write=data.assignmentWrites[0];
    expect(Object.keys(write.body).sort()).toEqual(['closes_at','updated_at']);
    expect(write.body.closes_at).toBeTruthy();
    expect(data.assignments.find(row=>row.id===a.id)?.active).toBe(true);
    await expect.poll(()=>page.evaluate(()=>window.__deadlineAssignmentEvents)).toBe(1);

    await expect.poll(async()=>{
      const help=await cardForAssignment(page,a.id).locator('.v43b-card-head .help').nth(1).innerText();
      return help;
    },{timeout:10_000}).not.toBe(oldCardHelp);
    await expect(panel.locator(`.v48a-row[data-assignment-id="${a.id}"]`)).toHaveCount(1);
  });

  test('K — student deadline experience decorates existing assignment cards with no second assignment fetch and overdue remains startable',async({page})=>{
    const base=await installSupabaseMock(page);
    await openApp(page);
    await signInStudent(page);
    await page.waitForTimeout(500);
    const readsBefore=base.rpcCalls.filter(call=>/get_student_practice_assignments/.test(call.rpc)).length;
    const assignments=[
      {assignment_id:'student-overdue',strand:'number',topic:'Whole Numbers',status:'not_started',timing_status:'due_passed',recommended_count:5,question_count:5,closes_at:pastIso(24),attempt:null},
      {assignment_id:'student-today',strand:'number',topic:'Whole Numbers',status:'not_started',timing_status:'active',recommended_count:5,question_count:5,closes_at:dueTodayIso(),attempt:null},
      {assignment_id:'student-soon',strand:'number',topic:'Whole Numbers',status:'not_started',timing_status:'active',recommended_count:5,question_count:5,closes_at:futureIso(30),attempt:null},
      {assignment_id:'student-none',strand:'number',topic:'Whole Numbers',status:'not_started',timing_status:'active',recommended_count:5,question_count:5,closes_at:null,attempt:null},
    ];
    await page.evaluate(({student,assignments})=>{
      show('student-assignments');
      window.AssignmentsStudent.renderStudentPracticeAssignments({
        student:{student_name:student.name,student_id:student.id,year_level:student.year,class_name:student.className},
        assignments,
      });
    },{student:STUDENT,assignments});

    const summary=page.locator('#v48b-student-deadline-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('1 overdue');
    await expect(summary).toContainText('1 due today');
    await expect(summary).toContainText('1 due soon');
    await expect(summary).toContainText('1 without due date');
    const overdue=page.locator('.v42b-student-card').filter({has:page.locator('.v42b-start-practice-assignment[data-id="student-overdue"]')});
    await expect(overdue).toHaveClass(/v48b-deadline-overdue/);
    await expect(overdue.locator('.v42b-start-practice-assignment')).toBeEnabled();

    await page.waitForTimeout(500);
    const readsAfter=base.rpcCalls.filter(call=>/get_student_practice_assignments/.test(call.rpc)).length;
    expect(readsAfter).toBe(readsBefore);
  });

  test('L — ordinary V43B toggle rerender refreshes V48A through the list observer without the V48C event',async({page})=>{
    const a=assignment('deadline-toggle',{closesAt:futureIso(24),active:true});
    const {data}=await setupTeacher(page,{assignments:[a],priorityIds:[]});
    await openClasses(page);
    await expect(page.locator(`#v48a-deadline-monitoring .v48a-row[data-assignment-id="${a.id}"]`)).toHaveCount(1);
    await page.evaluate(()=>{
      window.__ordinaryAssignmentEvents=0;
      window.addEventListener('math-practice-assignments-changed',()=>{ window.__ordinaryAssignmentEvents += 1; });
    });

    // The legacy assignment card may be presentation-collapsed by later teacher-workspace polish.
    // Trigger its real V43B listener directly: this gate is about the list MutationObserver refresh path,
    // not about whether that legacy card is the currently exposed teacher control.
    await page.locator(`#v43b-list .v43b-toggle[data-id="${a.id}"]`).evaluate(button=>button.click());
    await expect.poll(()=>data.assignmentWrites.length,{timeout:10_000}).toBe(1);
    expect(data.assignmentWrites[0].body.active).toBe(false);
    await expect.poll(()=>page.evaluate(()=>window.__ordinaryAssignmentEvents)).toBe(0);
    await expect(page.locator(`#v48a-deadline-monitoring .v48a-row[data-assignment-id="${a.id}"]`)).toHaveCount(0);
    await expect(page.locator('#v48a-deadline-monitoring .v48a-empty')).toContainText('No active Practice assignments');
  });
});
