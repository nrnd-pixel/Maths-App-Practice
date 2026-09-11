const { test, expect } = require('@playwright/test');
const {
  STUDENT,
  installSupabaseMock,
  openApp,
  signInStudent,
  answerPracticeCorrectly,
  loginTeacher,
} = require('./helpers.cjs');

const EXAM_YEAR = 2025;
const PAPER = 'Paper 1';
const PAPER_2 = 'Paper 2';
const STORAGE_KEY = 'mathPastPaperResumeV55C';
const ASSIGNMENT_CONTEXT_KEY = 'mathPastPaperAssignmentV56B';
const CLASS_ID = 'e2e-class-1';
const ROSTER_ID = 'e2e-roster-student-1';
const ASSIGNMENT_ID = 'e2e-past-paper-assignment-1';
const ATTEMPT_ID = 'e2e-past-paper-attempt-1';

function pastPaperQuestion(number,id,paper=PAPER){
  return {
    id,
    year_level:6,
    strand:'number',
    topic:'Whole Numbers',
    subtopic:'Addition',
    skill:'Phase 4 Past Paper gate fixture',
    difficulty:'foundation',
    marks:1,
    exam_year:EXAM_YEAR,
    paper,
    question_number:String(number),
    parent_question_number:null,
    part_label:null,
    part_order:null,
    group_prompt:null,
    source_type:'past_paper',
    source:`${EXAM_YEAR} ${paper} Phase 4 gate`,
    question_text:`Past Paper Q${number}: enter 7.`,
    image_url:'',
    response_type:'number',
    response_config:{},
    active:true,
    practice_eligible:true,
  };
}

const Q1 = pastPaperQuestion(1,'41000000-0000-4000-8000-000000000001');
const Q2 = pastPaperQuestion(2,'41000000-0000-4000-8000-000000000002');
const Q3 = pastPaperQuestion(3,'41000000-0000-4000-8000-000000000003');
const QUESTIONS = [Q1,Q2,Q3];

function corsHeaders(){
  return {
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS,HEAD',
    'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,range',
    'access-control-expose-headers':'content-range',
  };
}

function requestJson(request){
  try { return request.postDataJSON() || {}; } catch { return {}; }
}

async function fulfillRpc(route,body,status=200){
  if(route.request().method().toUpperCase()==='OPTIONS'){
    await route.fulfill({status:204,headers:corsHeaders()});
    return;
  }
  await route.fulfill({
    status,
    headers:{...corsHeaders(),'content-type':'application/json; charset=utf-8'},
    body:JSON.stringify(body),
  });
}

function studentMeta(){
  return {
    roster_student_id:ROSTER_ID,
    student_id:STUDENT.id,
    student_name:STUDENT.name,
    year_level:STUDENT.year,
    class_name:STUDENT.className,
    class_id:CLASS_ID,
  };
}

function answerEvidence(question,index){
  return {
    questionId:question.id,
    responseType:'number',
    finalAnswer:'7',
    correct:true,
    firstTry:true,
    attempts:1,
    hintUsed:false,
    manualReview:false,
    responsePayload:{},
    marksPossible:1,
    order:index,
  };
}

function checkpoint({
  paper=PAPER,
  nextIndex=1,
  savedAt='2026-09-08T02:00:00.000Z',
  assignmentContext=null,
}={}){
  const ids=QUESTIONS.map(row=>row.id);
  const answers=QUESTIONS.slice(0,nextIndex).map(answerEvidence);
  return {
    version:1,
    studentId:STUDENT.id,
    studentName:STUDENT.name,
    yearLevel:STUDENT.year,
    examYear:EXAM_YEAR,
    paper,
    scope:'all',
    questionIds:ids,
    nextIndex,
    first:nextIndex,
    mastered:nextIndex,
    hints:0,
    second:0,
    answers,
    startedAt:'2026-09-08T01:00:00.000Z',
    savedAt,
    ...(assignmentContext ? {assignmentContext} : {}),
  };
}

async function installPastPaperRoutes(page,{
  questions=QUESTIONS,
  serverCheckpoint=null,
  persistServer=true,
  saveFailure=false,
  saveDelayMs=0,
  completions=[],
}={}){
  const state={
    checkpoint:serverCheckpoint ? {...serverCheckpoint} : null,
    saves:[],
    deletes:[],
    completionReads:0,
  };

  await page.route('**/rest/v1/rpc/get_student_practice_questions_v53d3',async route=>{
    await fulfillRpc(route,questions);
  });
  await page.route('**/rest/v1/rpc/get_student_past_paper_checkpoints_v57a',async route=>{
    await fulfillRpc(route,{student:studentMeta(),checkpoints:state.checkpoint?[state.checkpoint]:[]});
  });
  await page.route('**/rest/v1/rpc/save_student_past_paper_checkpoint_v57a',async route=>{
    const body=requestJson(route.request());
    state.saves.push(body);
    if(saveDelayMs) await new Promise(resolve=>setTimeout(resolve,saveDelayMs));
    if(saveFailure){
      await fulfillRpc(route,{message:'simulated checkpoint outage'},500);
      return;
    }
    if(persistServer && body.p_snapshot){
      state.checkpoint={
        ...body.p_snapshot,
        studentId:STUDENT.id,
        studentName:STUDENT.name,
        yearLevel:STUDENT.year,
        savedAt:new Date().toISOString(),
        ...(body.p_assignment_id ? {assignmentContext:{
          assignmentId:body.p_assignment_id,
          attemptId:body.p_assignment_attempt_id,
          selectionMode:'all_available',
          target:QUESTIONS.length,
        }} : {}),
      };
      await fulfillRpc(route,{saved:true});
      return;
    }
    await fulfillRpc(route,{saved:false});
  });
  await page.route('**/rest/v1/rpc/delete_student_past_paper_checkpoint_v57a',async route=>{
    const body=requestJson(route.request());
    state.deletes.push(body);
    state.checkpoint=null;
    await fulfillRpc(route,{deleted:true});
  });
  await page.route('**/rest/v1/rpc/get_student_past_paper_completion_watermarks_v57a',async route=>{
    state.completionReads += 1;
    await fulfillRpc(route,{student:studentMeta(),completions});
  });
  return state;
}

async function installAssignmentRoutes(page,{assignmentStatus='not_started'}={}){
  const state={lists:0,starts:[],completes:[]};
  const row={
    assignment_id:ASSIGNMENT_ID,
    assignment_type:'past_paper',
    exam_year:EXAM_YEAR,
    paper:PAPER,
    selection_mode:'all_available',
    question_count:QUESTIONS.length,
    recommended_count:QUESTIONS.length,
    strand:'past_paper',
    topic:null,
    status:assignmentStatus,
    timing_status:'active',
    opens_at:null,
    closes_at:'2026-09-20T12:00:00.000Z',
    attempt:null,
  };

  await page.route('**/rest/v1/rpc/get_student_practice_assignments_v56b',async route=>{
    state.lists += 1;
    await fulfillRpc(route,{student:studentMeta(),assignments:[row]});
  });
  await page.route('**/rest/v1/rpc/start_student_practice_assignment_v56b',async route=>{
    const body=requestJson(route.request());
    state.starts.push(body);
    await fulfillRpc(route,{
      ...row,
      assignment_id:ASSIGNMENT_ID,
      attempt_id:ATTEMPT_ID,
      already_completed:false,
      status:'in_progress',
      recommended_count:QUESTIONS.length,
    });
  });
  await page.route('**/rest/v1/rpc/complete_student_practice_assignment_v56b',async route=>{
    const body=requestJson(route.request());
    state.completes.push(body);
    await fulfillRpc(route,{completed:true,assignment_id:ASSIGNMENT_ID,mastery_percent:100});
  });
  return state;
}

async function installProgressRoute(page){
  const state={calls:0};
  await page.route('**/rest/v1/rpc/get_student_past_paper_progress_v56c',async route=>{
    state.calls += 1;
    await fulfillRpc(route,{
      student:studentMeta(),
      papers:[{
        exam_year:EXAM_YEAR,
        paper:PAPER,
        available_questions:QUESTIONS.length,
        questions_practised:1,
        progress_status:'in_progress',
        session_count:1,
        last_practised_at:'2026-09-08T02:00:00.000Z',
        latest_session:{
          first_try_percent:100,
          mastery_percent:100,
          completed_at:'2026-09-08T02:00:00.000Z',
          result_code:'',
        },
        teacher_assignment:null,
      }],
    });
  });
  return state;
}

function analyticsPayload({withWeak=true,withAssigned=false}={}){
  const assignment=withAssigned?{
    assignment_id:ASSIGNMENT_ID,
    status:'in_progress',
  }:null;
  return {
    class:{class_id:CLASS_ID,class_name:'6A',year_level:6},
    selected:{exam_year:EXAM_YEAR,paper:PAPER,available_questions:QUESTIONS.length},
    summary:{
      total_students:1,
      attempted_students:1,
      completed_students:0,
      in_progress_students:1,
      not_started_students:0,
      teacher_assigned_students:withAssigned?1:0,
      self_selected_students:withAssigned?0:1,
      completion_percent:0,
      average_first_try_percent:45,
      average_mastery_percent:65,
    },
    students:[{
      roster_student_id:ROSTER_ID,
      student_id:STUDENT.id,
      student_name:STUDENT.name,
      progress_status:'in_progress',
      practice_source:withAssigned?'teacher_assigned':'self_selected',
      session_count:1,
      questions_practised:1,
      available_questions:QUESTIONS.length,
      last_practised_at:'2026-09-08T02:00:00.000Z',
      latest_session:{first_try_percent:45,mastery_percent:65},
      teacher_assignment:assignment,
    }],
    questions:withWeak?[{
      question_number:'1',topic:'Whole Numbers',skill:'Addition',attempts:1,
      first_try_percent:45,mastery_percent:65,hint_percent:0,
    }]:[],
    topics:withWeak?[{
      topic:'Whole Numbers',skill:'Addition',attempts:1,
      first_try_percent:45,mastery_percent:65,
    }]:[],
  };
}

async function installTeacherAnalyticsRoutes(page,{withWeak=true,withAssigned=false}={}){
  const state={analyticsCalls:[],createCalls:[],managerCalls:[]};
  const data=analyticsPayload({withWeak,withAssigned});
  await page.route('**/rest/v1/rpc/get_teacher_past_paper_analytics_v56d',async route=>{
    const body=requestJson(route.request());
    state.analyticsCalls.push(body);
    if(body.p_exam_year==null){
      await fulfillRpc(route,{
        class:data.class,
        papers:[{exam_year:EXAM_YEAR,paper:PAPER,available_questions:QUESTIONS.length}],
      });
      return;
    }
    await fulfillRpc(route,data);
  });
  await page.route('**/rest/v1/rpc/create_teacher_past_paper_assignments_v56b',async route=>{
    state.createCalls.push(requestJson(route.request()));
    await fulfillRpc(route,{created:true});
  });
  await page.route('**/rest/v1/rpc/get_teacher_past_paper_assignment_management_v57b',async route=>{
    state.managerCalls.push(requestJson(route.request()));
    await fulfillRpc(route,{
      class:data.class,
      assignments:withAssigned?[{
        assignment_id:ASSIGNMENT_ID,
        exam_year:EXAM_YEAR,
        paper:PAPER,
        selection_mode:'all_available',
        question_count:QUESTIONS.length,
        audience:'whole_class',
        created_at:'2026-09-07T00:00:00.000Z',
        opens_at:null,
        closes_at:'2026-09-20T12:00:00.000Z',
        active:true,
        timing_status:'active',
        created_by_current_teacher:true,
        assigned_count:1,
        not_started_count:0,
        in_progress_count:1,
        completed_count:0,
        overdue_count:0,
        students:[{
          student_name:STUDENT.name,student_id:STUDENT.id,status:'in_progress',overdue:false,
          first_try_percent:45,mastery_percent:65,latest_activity:'2026-09-08T02:00:00.000Z',
        }],
      }]:[],
    });
  });
  return state;
}

async function waitForPhase4Runtime(page){
  await page.waitForFunction(() =>
    !!window.V55APastPaperPractice
    && !!window.V55CResumePastPaperPractice
    && !!window.V56BTeacherAssignedPastPaperPractice
    && !!window.V56CStudentPastPaperProgress
    && !!window.V56DTeacherPastPaperAnalytics
    && !!window.V57ACrossDevicePastPaperResume
    && !!window.V57A1CrossDeviceLocalBridge
    && !!window.V57A2StaleLocalCheckpointCleanup
    && !!window.V57BTeacherAssignmentManagement
    && !!window.V57CStudentContinueLearningHome
    && !!window.V57DPastPaperAnalyticsActions
    && !!window.V57D1FocusPlanCopyFallback
    && !!window.V581APracticeCloudResultReconciliation
    && window.__v55cResumePastPaperPracticeWrappersInstalled === true
  );
}

async function openLearn(page){
  const startButton=page.locator('#start-btn');
  if(!(await startButton.isVisible())){
    const learnNav=page.locator('#start .v40-student-nav [data-v40-nav="learn"]');
    await expect(learnNav).toBeVisible();
    await learnNav.click();
  }
  await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view','learn');
  await expect(startButton).toBeVisible();
}

async function selectPastPaper(page,{scope='all'}={}){
  await openLearn(page);
  await page.locator('.v55a-practice-type[data-type="past_paper"]').click();
  const year=page.locator('#v55a-paper-year');
  const paper=page.locator('#v55a-paper-name');
  await expect(year.locator(`option[value="${EXAM_YEAR}"]`)).toHaveCount(1);
  await year.selectOption(String(EXAM_YEAR));
  await expect(paper.locator(`option[value="${PAPER}"]`)).toHaveCount(1);
  await paper.selectOption(PAPER);
  const scopeButton=scope==='all'
    ? page.locator('.v55b-paper-scope-btn[data-scope="all"]')
    : page.locator('.v55b-paper-scope-btn[data-scope="quick"]');
  await scopeButton.click();
}

async function startSelectedPaper(page){
  await page.locator('#start-btn').click();
  await expect(page.locator('#quiz')).toHaveClass(/active/);
}

async function seedLocal(page,snapshot,key='fixture'){
  await page.evaluate(({snapshot,key})=>{
    const api=window.V55CResumePastPaperPractice;
    const store=api.pruneStore(api.readStore(localStorage));
    store[key]={...snapshot,version:1};
    api.writeStore(localStorage,store);
  },{snapshot,key});
}

async function seedLocalIdentity(page,snapshot){
  await page.evaluate(snapshot=>{
    const api=window.V55CResumePastPaperPractice;
    const store=api.pruneStore(api.readStore(localStorage));
    const key=api.identityKey(snapshot.studentId,snapshot.studentName,snapshot.yearLevel,snapshot.examYear,snapshot.paper);
    store[key]={...snapshot,version:1};
    api.writeStore(localStorage,store);
  },snapshot);
}

async function localStore(page){
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}'),STORAGE_KEY);
}

async function localForPaper(page,paper=PAPER){
  return page.evaluate(({storageKey,paper})=>{
    const rows=Object.values(JSON.parse(localStorage.getItem(storageKey)||'{}'));
    return rows.find(row=>Number(row.examYear)===2025&&String(row.paper).trim().toLowerCase()===String(paper).trim().toLowerCase())||null;
  },{storageKey:STORAGE_KEY,paper});
}

async function signInWithPastPaper(page,routes={}){
  const mock=await installSupabaseMock(page);
  const past=await installPastPaperRoutes(page,routes);
  await openApp(page);
  await signInStudent(page);
  await waitForPhase4Runtime(page);
  return {mock,past};
}

async function prepareTeacherRuntime(page){
  await page.evaluate(questions=>{
    try {
      teacherClasses=[{id:'e2e-class-1',name:'6A',year_level:6,active:true}];
      teacherStudents=[{id:'e2e-roster-student-1',class_id:'e2e-class-1',student_name:'E2E Student',student_id:'E2E-001',active:true}];
      teacherQuestions=questions;
      selectedClassId='e2e-class-1';
      if(typeof renderClassAdmin==='function') renderClassAdmin();
    } catch(error){
      throw new Error(`Could not seed teacher runtime: ${error?.message||error}`);
    }
  },QUESTIONS);
  await page.locator('button.tab[data-panel="classes-panel"]').click();
  await expect(page.locator('#v56b-past-paper-assignment-admin')).toBeAttached();
  await expect(page.locator('#v56b-paper option[value="2025|paper 1"]')).toHaveCount(1);
}

async function openTeacherAnalytics(page){
  const analyticsTab=page.locator('button.tab[data-panel="analytics-panel"]');
  await analyticsTab.click();
  const trigger=page.locator('#v56d-open-past-paper-analytics');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator('#v56d-past-paper-analytics-overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('#v56d-content .v56d-summary')).toBeVisible();
  await expect(page.locator('#v57d-analytics-actions')).toBeVisible();
}

test.describe('Phase 4 V56/V57 Past Paper checkpoint hard gates',()=>{
  test('A — server resume remains an outer cross-device path over the frozen V55 local resume',async({page})=>{
    const server=checkpoint({nextIndex:1});
    await signInWithPastPaper(page,{serverCheckpoint:server,persistServer:true});
    await selectPastPaper(page,{scope:'all'});

    await expect(page.locator('#start-btn')).toHaveAttribute('data-v57a-start-bridge','true');
    await expect(page.locator('#next-btn')).toHaveAttribute('data-v57a-next-bridge','true');
    const serverCard=page.locator('#v57a-cross-device-resume-card');
    await expect(serverCard).toBeVisible();
    await serverCard.locator('[data-v57a-resume]').click();

    await expect(page.locator('#quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-text')).toHaveText(Q2.question_text);
    await expect(page.locator('#path-pill')).toContainText('Resumed across devices');
    const stateView=await page.evaluate(()=>({index:state.index,answers:state.answers.length,marker:window.__v55cResumePastPaperPracticeWrappersInstalled}));
    expect(stateView).toEqual({index:1,answers:1,marker:true});
  });

  test('B — nextQuestion stays synchronous while local boundary precedes asynchronous server checkpointing',async({page})=>{
    const {past}=await signInWithPastPaper(page,{persistServer:true,saveDelayMs:350});
    await selectPastPaper(page,{scope:'all'});
    await startSelectedPaper(page);
    await expect(page.locator('#q-text')).toHaveText(Q1.question_text);
    await answerPracticeCorrectly(page);

    const call=await page.evaluate(()=>{
      const before=state.index;
      const output=window.nextQuestion();
      return {before,after:state.index,thenable:!!output&&typeof output.then==='function'};
    });
    expect(call).toEqual({before:0,after:1,thenable:false});
    await expect(page.locator('#q-text')).toHaveText(Q2.question_text);

    const local=await localForPaper(page);
    expect(local).not.toBeNull();
    expect(local.nextIndex).toBe(1);
    expect(local.answers).toHaveLength(1);
    await expect.poll(()=>past.saves.length,{timeout:5000}).toBe(1);
    expect(past.saves[0].p_snapshot.nextIndex).toBe(1);
    expect(past.saves[0].p_snapshot.questionIds).toEqual(QUESTIONS.map(row=>row.id));
  });

  test('C — a cloud checkpoint failure leaves the V55 same-device fallback usable',async({page})=>{
    await signInWithPastPaper(page,{persistServer:false,saveFailure:true});
    await selectPastPaper(page,{scope:'all'});
    await startSelectedPaper(page);
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toHaveText(Q2.question_text);
    await expect(page.locator('#v57a-cross-device-save-banner')).toContainText('Saved on this device only');
    expect((await localForPaper(page))?.nextIndex).toBe(1);

    await page.reload();
    await expect(page.locator('.v40c-session-panel')).toHaveClass(/v40c-authenticated/);
    await waitForPhase4Runtime(page);
    await selectPastPaper(page,{scope:'all'});
    const localCard=page.locator('#v55c-resume-card');
    await expect(localCard).toBeVisible();
    await localCard.locator('[data-v55c-resume]').click();
    await expect(page.locator('#q-text')).toHaveText(Q2.question_text);
    await expect(page.locator('#path-pill')).toContainText('Resumed Practice');
  });

  test('D — V57A1 keeps newer local evidence and intercepts a local resume button when server evidence is authoritative',async({page})=>{
    const server=checkpoint({nextIndex:2,savedAt:'2026-09-08T04:00:00.000Z'});
    await signInWithPastPaper(page,{serverCheckpoint:server,persistServer:true});
    await selectPastPaper(page,{scope:'all'});

    const precedence=await page.evaluate(({older,newer})=>{
      const api=window.V55CResumePastPaperPractice;
      const bridge=window.V57A1CrossDeviceLocalBridge;
      const key=api.identityKey(older.studentId,older.studentName,older.yearLevel,older.examYear,older.paper);
      api.writeStore(localStorage,{[key]:older});
      const rejected=bridge.mirror({...newer,savedAt:'2026-09-08T03:00:00.000Z'});
      const afterReject=api.readStore(localStorage)[key];
      const accepted=bridge.mirror({...newer,savedAt:'2026-09-08T05:00:00.000Z'});
      const afterAccept=api.readStore(localStorage)[key];
      return {rejected,afterReject:afterReject.nextIndex,accepted,afterAccept:afterAccept.nextIndex};
    },{
      older:checkpoint({nextIndex:1,savedAt:'2026-09-08T04:30:00.000Z'}),
      newer:server,
    });
    expect(precedence).toEqual({rejected:false,afterReject:1,accepted:true,afterAccept:2});

    // Put a deliberately newer but less-progressed local snapshot back in storage.
    // Clicking the local V55 button must still be intercepted and restored from
    // the authoritative server checkpoint currently held by V57A.
    await seedLocal(page,checkpoint({nextIndex:1,savedAt:'2026-09-08T06:00:00.000Z'}),'intercept-local');
    await page.locator('#v55a-paper-name').dispatchEvent('change');
    const localResume=page.locator('#v55c-resume-card [data-v55c-resume]');
    await expect(localResume).toHaveCount(1);
    await page.evaluate(()=>document.querySelector('#v55c-resume-card [data-v55c-resume]')?.click());
    await expect(page.locator('#quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-text')).toHaveText(Q3.question_text);
    await expect(page.locator('#path-pill')).toContainText('Resumed across devices');
  });

  test('E — V57A2 prunes only stale same-device checkpoints older than server completion watermarks',async({page})=>{
    const completions=[
      {examYear:EXAM_YEAR,paper:PAPER,completedAt:'2026-09-08T05:00:00.000Z'},
      {examYear:EXAM_YEAR,paper:PAPER_2,completedAt:'2026-09-08T05:00:00.000Z'},
    ];
    await signInWithPastPaper(page,{persistServer:false,completions});
    await seedLocal(page,checkpoint({paper:PAPER,nextIndex:1,savedAt:'2026-09-08T04:00:00.000Z'}),'old');
    await seedLocal(page,checkpoint({paper:PAPER_2,nextIndex:1,savedAt:'2026-09-08T06:00:00.000Z'}),'new');

    const removed=await page.evaluate(()=>window.V57A2StaleLocalCheckpointCleanup.refresh(true));
    expect(removed).toBe(1);
    const store=await localStore(page);
    expect(store.old).toBeUndefined();
    expect(store.new).toBeTruthy();
    expect(store.new.paper).toBe(PAPER_2);
  });

  test('F — teacher-assigned Past Paper runs through assignment start, checkpoint context, finish and server completion',async({page})=>{
    const mock=await installSupabaseMock(page);
    const past=await installPastPaperRoutes(page,{persistServer:true});
    const assignments=await installAssignmentRoutes(page);
    await openApp(page);
    await signInStudent(page);
    await waitForPhase4Runtime(page);

    const assignmentsHome=page.locator('#start .v57c-assignments');
    await expect(assignmentsHome).toBeVisible();
    await assignmentsHome.click();
    const start=page.locator('#v42b-student-practice-assignments .v42b-start-practice-assignment[data-id="'+ASSIGNMENT_ID+'"]');
    await expect(start).toBeVisible();
    await start.click();
    await expect(page.locator('#quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-text')).toHaveText(Q1.question_text);
    await expect(page.locator('#path-pill')).toContainText('Assigned');

    const context=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),ASSIGNMENT_CONTEXT_KEY);
    expect(context.assignmentId).toBe(ASSIGNMENT_ID);
    expect(context.attemptId).toBe(ATTEMPT_ID);
    expect(context.examYear).toBe(EXAM_YEAR);
    expect(context.paper).toBe(PAPER);

    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toHaveText(Q2.question_text);
    await expect.poll(()=>past.saves.length,{timeout:5000}).toBeGreaterThan(0);
    expect(past.saves[0].p_assignment_id).toBe(ASSIGNMENT_ID);
    expect(past.saves[0].p_assignment_attempt_id).toBe(ATTEMPT_ID);

    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toHaveText(Q3.question_text);
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();

    await expect(page.locator('#result')).toHaveClass(/active/);
    await expect.poll(()=>assignments.completes.length,{timeout:7000}).toBe(1);
    expect(assignments.completes[0].p_attempt_id).toBe(ATTEMPT_ID);
    await expect(page.locator('.v42b-assignment-result-note')).toContainText('Teacher Practice Assignment completed');
    expect(await page.evaluate(key=>localStorage.getItem(key),ASSIGNMENT_CONTEXT_KEY)).toBeNull();
    expect(mock.practiceSubmissions).toBe(1);
  });

  test('G — Student Past Paper Progress Continue action resumes the selected paper through the frozen V55 resume UI',async({page})=>{
    const mock=await installSupabaseMock(page);
    await installPastPaperRoutes(page,{persistServer:false});
    const progress=await installProgressRoute(page);
    await openApp(page);
    await signInStudent(page);
    await waitForPhase4Runtime(page);
    await seedLocalIdentity(page,checkpoint({nextIndex:1,savedAt:'2026-09-08T04:00:00.000Z'}));

    const progressHome=page.locator('#start .v57c-secondary .v57c-progress');
    await expect(progressHome).toBeVisible();
    await progressHome.click();
    const section=page.locator('#v56c-past-paper-progress');
    await expect(section).toBeVisible();
    await expect.poll(()=>progress.calls,{timeout:5000}).toBeGreaterThan(0);
    const action=section.locator('[data-v56c-action="continue"][data-year="2025"][data-paper="Paper 1"]');
    await expect(action).toHaveText('Continue Saved Practice');
    await action.click();
    await expect(page.locator('#quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-text')).toHaveText(Q2.question_text);
    await expect(page.locator('#path-pill')).toContainText('Resumed Practice');
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('H — teacher analytics prepares the existing V56B form and never auto-creates an assignment',async({page})=>{
    await installSupabaseMock(page);
    const teacherRoutes=await installTeacherAnalyticsRoutes(page,{withWeak:true,withAssigned:false});
    await openApp(page);
    await loginTeacher(page);
    await waitForPhase4Runtime(page);
    await prepareTeacherRuntime(page);
    await openTeacherAnalytics(page);

    const prepare=page.locator('#v57d-analytics-actions [data-v57d-prepare="unassigned"]');
    await expect(prepare).toBeEnabled();
    await prepare.click();
    const form=page.locator('#v56b-past-paper-assignment-admin');
    await expect(form).toBeVisible();
    await expect(page.locator('#v56b-audience')).toHaveValue('students');
    await expect(page.locator('#v56b-paper')).toHaveValue('2025|paper 1');
    await expect(page.locator('#v56b-student-options input[value="'+ROSTER_ID+'"]')).toBeChecked();
    await expect(form.locator('.v57d-prepared-note')).toContainText('Prepared from Past Paper Analytics');
    expect(teacherRoutes.createCalls).toHaveLength(0);
  });

  test('I — focus-plan fallback re-enables the action, opens an in-app plan, then leaves deterministic manual copy when clipboard paths fail',async({page})=>{
    await installSupabaseMock(page);
    await installTeacherAnalyticsRoutes(page,{withWeak:false,withAssigned:false});
    await openApp(page);
    await loginTeacher(page);
    await waitForPhase4Runtime(page);
    await prepareTeacherRuntime(page);
    await openTeacherAnalytics(page);

    const copyAction=page.locator('#v57d-analytics-actions [data-v57d-copy]');
    await expect(copyAction).toBeEnabled();
    await copyAction.click();
    const overlay=page.locator('#v57d1-focus-plan-overlay');
    await expect(overlay).not.toHaveClass(/hidden/);
    const textarea=page.locator('#v57d1-focus-plan-text');
    await expect(textarea).toHaveValue(/Past Paper Action Plan/);

    await page.evaluate(()=>{
      document.execCommand=()=>false;
      try {
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('blocked');}}});
      } catch {}
    });
    await overlay.locator('[data-v57d1-copy]').click();
    await expect(overlay.locator('[data-v57d1-feedback]')).toContainText('Clipboard access is blocked');
    const selection=await page.evaluate(()=>{
      const area=document.getElementById('v57d1-focus-plan-text');
      return {start:area.selectionStart,end:area.selectionEnd,length:area.value.length};
    });
    expect(selection.start).toBe(0);
    expect(selection.end).toBe(selection.length);
  });

  test('J — analytics management action delegates to untouched V57B openOverlay',async({page})=>{
    await installSupabaseMock(page);
    const teacherRoutes=await installTeacherAnalyticsRoutes(page,{withWeak:true,withAssigned:true});
    await openApp(page);
    await loginTeacher(page);
    await waitForPhase4Runtime(page);
    await prepareTeacherRuntime(page);
    await openTeacherAnalytics(page);

    const manage=page.locator('#v57d-analytics-actions [data-v57d-manage]');
    await expect(manage).toBeEnabled();
    await manage.click();
    const overlay=page.locator('#v57b-assignment-management-overlay');
    await expect(overlay).not.toHaveClass(/hidden/);
    await expect(overlay.getByRole('heading',{name:'Manage Past Paper Assignments'})).toBeVisible();
    await expect(overlay.locator('.v57b-card')).toContainText(`${EXAM_YEAR} · ${PAPER}`);
    await expect.poll(()=>teacherRoutes.managerCalls.length,{timeout:5000}).toBe(1);
    expect(teacherRoutes.createCalls).toHaveLength(0);
  });

  test('K — shared completion lock prevents double-fire when both result observers fire for the same Past Paper assignment',async({page})=>{
    // Scenario: the generic observer (assignments-student.js) fires immediately
    // when #result becomes active; the V56B observer fires 120 ms later via
    // setTimeout.  Without the shared lock the completion RPC can be called
    // twice if the first request is still in flight.
    //
    // This test injects artificial latency into the completion RPC so that
    // the 120 ms delayed observer always fires while the first call is in
    // flight, then asserts that exactly one completion RPC reached the server.

    const mock=await installSupabaseMock(page);
    const past=await installPastPaperRoutes(page,{persistServer:true});
    const assignments=await installAssignmentRoutes(page);

    // Override the completion route with a slow handler (200 ms) so the race
    // window is guaranteed to be open when the delayed observer fires.
    let completionCount=0;
    await page.route('**/rest/v1/rpc/complete_student_practice_assignment_v56b',async route=>{
      if(route.request().method().toUpperCase()==='OPTIONS'){
        await route.fulfill({status:204,headers:corsHeaders()});
        return;
      }
      completionCount+=1;
      const body=requestJson(route.request());
      assignments.completes.push(body);
      // 200 ms delay — forces the 120 ms V56B observer to see the lock set
      // by the generic observer and bail out rather than firing a second RPC.
      await new Promise(resolve=>setTimeout(resolve,200));
      await fulfillRpc(route,{completed:true,assignment_id:ASSIGNMENT_ID,mastery_percent:100});
    });

    await openApp(page);
    await signInStudent(page);
    await waitForPhase4Runtime(page);

    // Seed an activeAssignmentContext in the generic observer path so it will
    // attempt to call completeActivePracticeAssignment when result activates.
    await page.evaluate(({assignmentId,attemptId,token})=>{
      // Simulate what startPracticeAssignment sets on the activeAssignmentContext
      // (module-private in assignments-student.js).  We reach it by invoking the
      // assignment-start path directly through the exported API surface, or by
      // manually triggering the state via the studentPracticeRecommendationV35
      // hook — but the cleanest approach for E2E is to navigate the full start
      // flow, which also exercises the real path.
      //
      // We do not need to set this manually; the full assignment start below
      // sets it for us via startPracticeAssignment.
      void 0;
    },{assignmentId:ASSIGNMENT_ID,attemptId:ATTEMPT_ID,token:'e2e-token'});

    // Full assignment flow: open assignments panel → start → answer all → result
    const assignmentsHome=page.locator('#start .v57c-assignments');
    await expect(assignmentsHome).toBeVisible();
    await assignmentsHome.click();
    const start=page.locator(`#v42b-student-practice-assignments .v42b-start-practice-assignment[data-id="${ASSIGNMENT_ID}"]`);
    await expect(start).toBeVisible();
    await start.click();
    await expect(page.locator('#quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-text')).toHaveText(Q1.question_text);

    // Answer all questions to reach the result screen
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toHaveText(Q2.question_text);
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toHaveText(Q3.question_text);
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();

    // Result screen activates — both observers fire here
    await expect(page.locator('#result')).toHaveClass(/active/);

    // Wait for exactly one completion RPC to land (generous timeout for CI).
    // Once it lands, give the delayed observer a further 400 ms to prove it
    // does NOT fire a second call (the shared lock must block it).
    await expect.poll(()=>completionCount,{timeout:7000}).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(400);

    // Exactly one completion RPC must have reached the mock server
    expect(completionCount).toBe(1);
    expect(assignments.completes).toHaveLength(1);
    expect(assignments.completes[0].p_attempt_id).toBe(ATTEMPT_ID);

    // Result note from whichever path won must be visible
    await expect(page.locator('.v42b-assignment-result-note')).toBeVisible();
    await expect(page.locator('.v42b-assignment-result-note')).toContainText('completed');

    expect(mock.practiceSubmissions).toBe(1);
  });
});
