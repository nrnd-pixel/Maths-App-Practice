const { test, expect } = require('@playwright/test');
const {
  STUDENT,
  installSupabaseMock,
  openApp,
  signInStudent,
  answerPracticeCorrectly,
} = require('./helpers.cjs');

const EXAM_YEAR = 2025;
const PAPER = 'Paper 1';
const STORAGE_KEY = 'mathPastPaperResumeV55C';

function pastPaperQuestion(number,id,paper=PAPER,sourceType='past_paper'){
  return {
    id,
    year_level:6,
    strand:'number',
    topic:'Whole Numbers',
    subtopic:'Addition',
    skill:'Past Paper equivalence fixture',
    difficulty:'foundation',
    marks:1,
    exam_year:EXAM_YEAR,
    paper,
    question_number:String(number),
    parent_question_number:null,
    part_label:null,
    part_order:null,
    group_prompt:null,
    source_type:sourceType,
    source:`${EXAM_YEAR} ${paper} E2E`,
    question_text:`Past Paper Q${number}: enter 7.`,
    image_url:'',
    response_type:'number',
    response_config:{},
    active:true,
    practice_eligible:true,
  };
}

const Q1=pastPaperQuestion(1,'10000000-0000-4000-8000-000000000001');
const Q2=pastPaperQuestion(2,'10000000-0000-4000-8000-000000000002');
const Q10=pastPaperQuestion(10,'10000000-0000-4000-8000-000000000010');
const OTHER_PAPER=pastPaperQuestion(3,'20000000-0000-4000-8000-000000000003','Paper 2');
const WRONG_SOURCE=pastPaperQuestion(4,'30000000-0000-4000-8000-000000000004',PAPER,'topical_exercise');

function corsHeaders(){
  return {
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS,HEAD',
    'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,range',
    'access-control-expose-headers':'content-range',
  };
}

async function fulfillRpc(route,body){
  if(route.request().method().toUpperCase()==='OPTIONS'){
    await route.fulfill({status:204,headers:corsHeaders()});
    return;
  }
  await route.fulfill({
    status:200,
    headers:{...corsHeaders(),'content-type':'application/json; charset=utf-8'},
    body:JSON.stringify(body),
  });
}

function requestJson(request){
  try{return request.postDataJSON()||{};}catch{return {};}
}

async function installPastPaperOverrides(page,{
  questions=[Q10,Q2,Q1,OTHER_PAPER],
  initialServerCheckpoint=null,
  persistServer=false,
}={}){
  const server={checkpoint:initialServerCheckpoint ? {...initialServerCheckpoint} : null,saves:[],deletes:[]};

  // Register these after the broad Phase 0 Supabase mock. Playwright evaluates
  // matching routes in reverse registration order, so these narrowly override
  // only the Past Paper fixtures while the maintained mock owns everything else.
  await page.route('**/rest/v1/rpc/get_student_practice_questions_v53d3',async route=>{
    await fulfillRpc(route,questions);
  });

  await page.route('**/rest/v1/rpc/get_student_past_paper_checkpoints_v57a',async route=>{
    await fulfillRpc(route,{
      student:{
        roster_student_id:'e2e-roster-student-1',
        student_id:STUDENT.id,
        student_name:STUDENT.name,
        year_level:STUDENT.year,
        class_name:STUDENT.className,
      },
      checkpoints:server.checkpoint ? [server.checkpoint] : [],
    });
  });

  await page.route('**/rest/v1/rpc/save_student_past_paper_checkpoint_v57a',async route=>{
    const body=requestJson(route.request());
    server.saves.push(body);
    if(persistServer && body.p_snapshot){
      server.checkpoint={
        ...body.p_snapshot,
        studentId:STUDENT.id,
        studentName:STUDENT.name,
        yearLevel:STUDENT.year,
        savedAt:new Date().toISOString(),
      };
      await fulfillRpc(route,{saved:true});
      return;
    }
    await fulfillRpc(route,{saved:false});
  });

  await page.route('**/rest/v1/rpc/delete_student_past_paper_checkpoint_v57a',async route=>{
    const body=requestJson(route.request());
    server.deletes.push(body);
    if(persistServer) server.checkpoint=null;
    await fulfillRpc(route,{deleted:true});
  });

  return server;
}

async function waitForFullPastPaperRuntime(page){
  await page.waitForFunction(() =>
    !!window.V55APastPaperPractice
    && !!window.V55BFullPaperPractice
    && !!window.V55CResumePastPaperPractice
    && !!window.V55DPastPaperResultAttribution
    && !!window.V57ACrossDevicePastPaperResume
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

async function selectPastPaper(page,{scope='quick'}={}){
  await openLearn(page);
  await expect(page.locator('#v55a-practice-source')).toBeVisible();
  await page.locator('.v55a-practice-type[data-type="past_paper"]').click();

  const year=page.locator('#v55a-paper-year');
  const paper=page.locator('#v55a-paper-name');
  await expect(year.locator(`option[value="${EXAM_YEAR}"]`)).toHaveCount(1);
  await year.selectOption(String(EXAM_YEAR));
  await expect(paper.locator(`option[value="${PAPER}"]`)).toHaveCount(1);
  await paper.selectOption(PAPER);

  if(scope==='all'){
    await page.locator('.v55b-paper-scope-btn[data-scope="all"]').click();
    await expect(page.locator('.v55b-paper-scope-btn[data-scope="all"]')).toHaveAttribute('aria-pressed','true');
  }else{
    await page.locator('.v55b-paper-scope-btn[data-scope="quick"]').click();
    await expect(page.locator('.v55b-paper-scope-btn[data-scope="quick"]')).toHaveAttribute('aria-pressed','true');
  }
}

async function startSelectedPastPaper(page){
  await page.locator('#start-btn').click();
  await expect(page.locator('#quiz')).toHaveClass(/active/);
}

async function runtimeState(page){
  return page.evaluate(() => ({
    index:state.index,
    count:state.count,
    type:state.v55a_practice_type,
    examYear:state.v55a_exam_year,
    paper:state.v55a_paper,
    scope:state.v55b_paper_scope,
    first:state.first,
    mastered:state.mastered,
    answers:state.answers.map(answer=>({questionId:answer.questionId,finalAnswer:answer.finalAnswer,correct:answer.correct})),
    questions:state.questions.map(item=>({id:item.id,question_number:item.question_number,exam_year:item.exam_year,paper:item.paper,source_type:item.source_type})),
  }));
}

async function currentLocalSnapshot(page){
  return page.evaluate(key=>{
    const store=JSON.parse(localStorage.getItem(key)||'{}');
    const rows=Object.values(store);
    return rows.length ? rows.sort((a,b)=>Date.parse(b.savedAt||0)-Date.parse(a.savedAt||0))[0] : null;
  },STORAGE_KEY);
}

async function createLocalCheckpointAndReload(page){
  await selectPastPaper(page,{scope:'all'});
  await startSelectedPastPaper(page);
  await expect(page.locator('#q-text')).toContainText('Q1');
  await answerPracticeCorrectly(page);
  await page.locator('#next-btn').click();
  await expect(page.locator('#q-text')).toContainText('Q2');
  await expect.poll(async()=>Number((await currentLocalSnapshot(page))?.nextIndex||0)).toBe(1);

  await page.reload();
  await expect(page.locator('#cloud-status')).toContainText('Cloud Connected');
  await expect(page.locator('.v40c-session-panel')).toHaveClass(/v40c-authenticated/);
  await waitForFullPastPaperRuntime(page);
  await selectPastPaper(page,{scope:'quick'});
}

function serverResumeSnapshot(){
  return {
    version:1,
    studentId:STUDENT.id,
    studentName:STUDENT.name,
    yearLevel:STUDENT.year,
    examYear:EXAM_YEAR,
    paper:PAPER,
    scope:'all',
    questionIds:[Q1.id,Q2.id,Q10.id],
    nextIndex:1,
    first:1,
    mastered:1,
    hints:0,
    second:0,
    answers:[{
      questionId:Q1.id,
      responseType:'number',
      finalAnswer:'7',
      correct:true,
      firstTry:true,
      attempts:1,
      hintUsed:false,
      manualReview:false,
      responsePayload:{},
      marksPossible:1,
    }],
    startedAt:'2026-09-08T01:00:00.000Z',
    savedAt:'2026-09-08T01:05:00.000Z',
  };
}

test.describe('Phase 4 V55 Past Paper lifecycle equivalence',()=>{
  test('scenario 1: Quick Past Paper starts through the full staged Practice runtime',async({page})=>{
    const mock=await installSupabaseMock(page);
    await installPastPaperOverrides(page);
    await openApp(page);
    await signInStudent(page);
    await waitForFullPastPaperRuntime(page);
    await selectPastPaper(page,{scope:'quick'});
    await startSelectedPastPaper(page);

    const s=await runtimeState(page);
    expect(s.type).toBe('past_paper');
    expect(s.examYear).toBe(EXAM_YEAR);
    expect(s.paper).toBe(PAPER);
    expect(s.questions.length).toBeGreaterThan(0);
    expect(s.questions.every(row=>Number(row.exam_year)===EXAM_YEAR&&row.paper===PAPER&&row.source_type==='past_paper')).toBe(true);
    await expect(page.locator('#path-pill')).toContainText(`${EXAM_YEAR} · ${PAPER}`);

    await answerPracticeCorrectly(page);
    await expect(page.locator('#first-score')).toContainText('First try: 1');
    await expect(page.locator('#mastery-score')).toContainText('Mastered: 1');
    expect(mock.rpcCalls.some(call=>call.rpc==='grade_practice_response_v53b')).toBe(true);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('scenario 2: Past Paper source guard rejects same-paper non-past-paper rows',async({page})=>{
    await installSupabaseMock(page);
    await installPastPaperOverrides(page,{questions:[Q1,Q2,WRONG_SOURCE]});
    await openApp(page);
    await signInStudent(page);
    await waitForFullPastPaperRuntime(page);
    await selectPastPaper(page,{scope:'all'});
    await startSelectedPastPaper(page);

    const s=await runtimeState(page);
    expect(s.questions.map(row=>row.id)).toEqual([Q1.id,Q2.id]);
    expect(s.questions.some(row=>row.id===WRONG_SOURCE.id)).toBe(false);
  });

  test('scenario 3: All Available uses every eligible logical question in source order and restores count control',async({page})=>{
    await installSupabaseMock(page);
    await installPastPaperOverrides(page,{questions:[Q10,Q2,Q1,OTHER_PAPER]});
    await openApp(page);
    await signInStudent(page);
    await waitForFullPastPaperRuntime(page);
    await openLearn(page);
    await page.locator('#question-count').selectOption('5');
    await selectPastPaper(page,{scope:'all'});
    await expect(page.locator('#question-count')).toBeDisabled();
    await startSelectedPastPaper(page);

    const s=await runtimeState(page);
    expect(s.questions.map(row=>String(row.question_number))).toEqual(['1','2','10']);
    expect(s.count).toBe(3);
    expect(s.scope).toBe('all_available');
    await expect(page.locator('#path-pill')).toContainText('All Available Practice');
    await expect(page.locator('#question-count')).toHaveValue('5');
    await expect(page.locator('#question-count')).toBeDisabled();
  });

  test('scenario 4: completed-question local checkpoint is written before Next advances',async({page})=>{
    await installSupabaseMock(page);
    await installPastPaperOverrides(page,{questions:[Q10,Q2,Q1],persistServer:false});
    await openApp(page);
    await signInStudent(page);
    await waitForFullPastPaperRuntime(page);
    await selectPastPaper(page,{scope:'all'});
    await startSelectedPastPaper(page);
    await expect(page.locator('#q-text')).toContainText('Q1');
    await answerPracticeCorrectly(page);

    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toContainText('Q2');
    const s=await runtimeState(page);
    expect(s.index).toBe(1);

    const snapshot=await currentLocalSnapshot(page);
    expect(snapshot).not.toBeNull();
    expect(snapshot.nextIndex).toBe(1);
    expect(snapshot.questionIds).toEqual([Q1.id,Q2.id,Q10.id]);
    expect(snapshot.answers).toHaveLength(1);
    expect(snapshot.answers[0].questionId).toBe(Q1.id);
    expect(snapshot.answers[0].correct).toBe(true);
    await expect(page.locator('#next-btn')).toHaveAttribute('data-v57a-next-bridge','true');
  });

  test('scenario 5: reload resumes the same-device checkpoint without fresh-start reinitialization',async({page})=>{
    await installSupabaseMock(page);
    await installPastPaperOverrides(page,{questions:[Q10,Q2,Q1],persistServer:false});
    await openApp(page);
    await signInStudent(page);
    await waitForFullPastPaperRuntime(page);
    await createLocalCheckpointAndReload(page);

    const localCard=page.locator('#v55c-resume-card');
    await expect(localCard).toBeVisible();
    await expect(page.locator('#v57a-cross-device-resume-card')).toHaveClass(/hidden/);

    const before=await currentLocalSnapshot(page);
    const serialized=JSON.stringify(before);
    for(const forbidden of ['4827','practice-ticket-e2e','correctAnswer','explanation']){
      expect(serialized.includes(forbidden)).toBe(false);
    }

    await localCard.locator('[data-v55c-resume]').click();
    await expect(page.locator('#quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-text')).toContainText('Q2');
    const s=await runtimeState(page);
    expect(s.index).toBe(1);
    expect(s.first).toBe(1);
    expect(s.mastered).toBe(1);
    expect(s.answers).toHaveLength(1);
    await expect(page.locator('#path-pill')).toContainText('Resumed Practice');
  });

  test('scenario 6: resumed paper finishes, clears local checkpoint, and submits Past Paper attribution through V58.1A',async({page})=>{
    const mock=await installSupabaseMock(page);
    await installPastPaperOverrides(page,{questions:[Q10,Q2,Q1],persistServer:false});
    await openApp(page);
    await signInStudent(page);
    await waitForFullPastPaperRuntime(page);
    await createLocalCheckpointAndReload(page);

    await page.locator('#v55c-resume-card [data-v55c-resume]').click();
    await expect(page.locator('#q-text')).toContainText('Q2');
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toContainText('Q10');
    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();

    await expect(page.locator('#result')).toHaveClass(/active/);
    await expect(page.getByRole('heading',{name:'Practice Complete'})).toBeVisible();
    await expect(page.locator('#result-name')).toContainText(`${EXAM_YEAR} · ${PAPER}`);
    await expect.poll(async()=>await currentLocalSnapshot(page)).toBeNull();
    await expect(page.locator('#res-sync')).toHaveText('Cloud ✓');

    const submit=mock.rpcCalls.find(call=>call.rpc==='submit_practice_session_v53b');
    expect(submit).toBeTruthy();
    const submitted=JSON.stringify(submit.body);
    expect(submitted).toContain('past_paper');
    expect(submitted).toContain(String(EXAM_YEAR));
    expect(submitted).toContain(PAPER);
    expect(mock.practiceSubmissions).toBe(1);
    expect(mock.unexpectedWrites).toEqual([]);
  });

  test('scenario 7: untouched V57A restores and re-wraps the consolidated V55 start/next boundary',async({page})=>{
    await installSupabaseMock(page);
    const server=await installPastPaperOverrides(page,{
      questions:[Q10,Q2,Q1],
      initialServerCheckpoint:serverResumeSnapshot(),
      persistServer:true,
    });
    await openApp(page);
    await signInStudent(page);
    await waitForFullPastPaperRuntime(page);
    await selectPastPaper(page,{scope:'quick'});

    await expect(page.locator('#start-btn')).toHaveAttribute('data-v57a-start-bridge','true');
    await expect(page.locator('#next-btn')).toHaveAttribute('data-v57a-next-bridge','true');
    const serverCard=page.locator('#v57a-cross-device-resume-card');
    await expect(serverCard).toBeVisible();
    await serverCard.locator('[data-v57a-resume]').click();

    await expect(page.locator('#quiz')).toHaveClass(/active/);
    await expect(page.locator('#q-text')).toContainText('Q2');
    let s=await runtimeState(page);
    expect(s.index).toBe(1);
    expect(s.answers).toHaveLength(1);
    expect(s.scope).toBe('all_available');
    await expect(page.locator('#path-pill')).toContainText('Resumed across devices');

    await answerPracticeCorrectly(page);
    await page.locator('#next-btn').click();
    await expect(page.locator('#q-text')).toContainText('Q10');
    s=await runtimeState(page);
    expect(s.index).toBe(2);
    await expect.poll(()=>Number(server.checkpoint?.nextIndex||0)).toBe(2);
    expect(server.saves.length).toBeGreaterThan(0);
  });
});
