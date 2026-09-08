const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const {
  installSupabaseMock,
  openApp,
  loginTeacher,
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
    id:'hard-q-1', year_level:6, strand:'number', topic:'Whole Numbers',
    question_number:'HARD1', source_type:'practice', source:'Checkpoint 2 hardening',
    question_text:'Checkpoint 2 hardening fixture', active:true, practice_eligible:true,
  },
  {
    id:'hard-q-2', year_level:6, strand:'number', topic:'Whole Numbers',
    question_number:'HARD2', source_type:'practice', source:'Checkpoint 2 hardening',
    question_text:'Checkpoint 2 hardening fixture 2', active:true, practice_eligible:true,
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
  return new Date(now.getTime()+Math.max(1_000,Math.min(30*60*1000,Math.floor(remaining/2)))).toISOString();
}
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function requestJson(request){
  try { return request.postDataJSON() || {}; }
  catch { return {}; }
}
function eqFilter(url,key){
  const raw=url.searchParams.get(key) || '';
  return raw.startsWith('eq.') ? raw.slice(3) : '';
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
    id, class_id:classId, strand, topic, question_count:questionCount, active,
    created_at:createdAt, updated_at:createdAt, opens_at:opensAt, closes_at:closesAt,
  };
}
function recipient(assignmentId,studentId){ return {assignment_id:assignmentId,roster_student_id:studentId}; }
function attempt(assignmentId,studentId,{status='in_progress',sessionId=null,completedAt=null}={}){
  const startedAt=pastIso(6);
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
      practice_mode:'mixed', strand:'number', topic:'Whole Numbers',
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
        strand:'number', topic:'Whole Numbers', skill:'Whole-number support',
        marks_possible:1, marks_awarded:0, correct:false, review_status:'auto',
        practice_sessions:session,
      });
    }
  }
  return {sessions,answers};
}

async function installAssignmentRoutes(page,{assignments=[],recipients=[],attempts=[]}={}){
  const state={
    assignments:clone(assignments), recipients:clone(recipients), attempts:clone(attempts),
    assignmentWrites:[], createRpcs:[], assignmentReadClassIds:[],
  };

  await page.route('**/rest/v1/practice_assignments*',async route=>{
    const request=route.request();
    const method=request.method().toUpperCase();
    if(method==='OPTIONS') return route.fulfill({status:204,headers:corsHeaders()});
    const url=new URL(request.url());
    if(method==='GET' || method==='HEAD'){
      let rows=state.assignments.slice();
      const id=eqFilter(url,'id');
      const classId=eqFilter(url,'class_id');
      state.assignmentReadClassIds.push(classId || null);
      if(id) rows=rows.filter(row=>String(row.id)===id);
      if(classId) rows=rows.filter(row=>String(row.class_id)===classId);
      await fulfillJson(route,rows,200,{'content-range':rows.length?`0-${rows.length-1}/${rows.length}`:'*/0'});
      return;
    }
    if(method==='PATCH'){
      const body=requestJson(request);
      const id=eqFilter(url,'id');
      state.assignmentWrites.push({id,body:clone(body)});
      state.assignments=state.assignments.map(row=>String(row.id)===id ? {...row,...clone(body)} : row);
      await fulfillJson(route,[]);
      return;
    }
    await fulfillJson(route,{message:`Unexpected assignment method ${method}`},409);
  });

  for(const [path,key] of [
    ['practice_assignment_recipients','recipients'],
    ['practice_assignment_attempts','attempts'],
  ]){
    await page.route(`**/rest/v1/${path}*`,async route=>{
      const method=route.request().method().toUpperCase();
      if(method==='OPTIONS') return route.fulfill({status:204,headers:corsHeaders()});
      if(method==='GET' || method==='HEAD'){
        const rows=state[key];
        await fulfillJson(route,rows,200,{'content-range':rows.length?`0-${rows.length-1}/${rows.length}`:'*/0'});
        return;
      }
      await fulfillJson(route,{message:`Unexpected ${path} method ${method}`},409);
    });
  }

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

async function setupTeacher(page,options={}){
  await installSupabaseMock(page);
  const data=await installAssignmentRoutes(page,options);
  await openApp(page);
  await loginTeacher(page);
  const analytics=analyticsFixture(options.priorityIds,options.sessionOverrides);
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
    classes:[CLASS_1,CLASS_2], students:STUDENTS, questions:QUESTIONS,
    sessions:analytics.sessions, answers:analytics.answers,
  });
  await page.evaluate(async()=>{
    await window.AssignmentsTeacher.refresh();
    renderAnalytics();
  });
  await page.locator('#teacher .tab[data-panel="analytics-panel"]').click();
  await expect(page.locator('#analytics-panel')).toHaveClass(/active/);
  await page.evaluate(()=>renderAnalytics());
  await expect(page.locator('.v42-action-center')).toBeVisible();
  return {data,analytics};
}

function supportRow(page,name){
  return page.locator('#v42-support-list .v42-action-row').filter({hasText:name}).first();
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
async function waitForQueueSettled(page){
  await expect.poll(async()=>{
    const rows=page.locator('#v42-support-list > .v42-action-row');
    const count=await rows.count();
    for(let i=0;i<count;i++){
      const row=rows.nth(i);
      if(await row.locator('.v44c-intervention-status').count()) continue;
      if(await row.locator('.v44a-assign-practice').count()) continue;
      return false;
    }
    return count>0;
  },{timeout:12_000}).toBe(true);
}
function parseCsvLine(line){
  const values=[];
  let value='';
  let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted && line[i+1]==='"'){ value+='"'; i+=1; }
      else quoted=!quoted;
    } else if(ch===',' && !quoted){
      values.push(value); value='';
    } else value+=ch;
  }
  values.push(value);
  return values;
}


test.describe('Phase 4 teacher assignments checkpoint 2 — hard-gate coverage reinforcement',()=>{
  test('B+ — individual prefill makes no create RPC until the teacher explicitly clicks Assign Practice',async({page})=>{
    const {data}=await setupTeacher(page,{assignments:[],priorityIds:['roster-a','roster-b']});
    await supportRow(page,'Aisha').locator('.v44a-assign-practice').click();
    await expect(page.locator('#v43b-audience')).toHaveValue('students');
    await expect(page.locator('#v43b-student-options input[value="roster-a"]')).toBeChecked();
    await expect(page.locator('#v43b-student-options input[value="roster-b"]')).not.toBeChecked();
    expect(data.createRpcs).toEqual([]);

    await page.locator('#v43b-save').click();
    await expect.poll(()=>data.createRpcs.length,{timeout:8_000}).toBe(1);
    expect(data.createRpcs[0].p_target_student_ids).toEqual(['roster-a']);
    expect(data.createRpcs[0].p_class_ids).toEqual([CLASS_1.id]);
    expect(data.createRpcs[0].p_strand).toBe('number');
    expect(data.createRpcs[0].p_topic).toBe('Whole Numbers');
    expect(data.createRpcs[0].p_question_count).toBe(5);
  });

  test('F+ — CSV records every Analytics scope field plus focus/status/recorded outcome fields with zero mutation',async({page})=>{
    const completedAt=pastIso(1);
    const a=assignment('hard-export');
    const sessionId='hard-result-a';
    const {data}=await setupTeacher(page,{
      assignments:[a],
      recipients:[recipient(a.id,'roster-a')],
      attempts:[attempt(a.id,'roster-a',{status:'completed',sessionId,completedAt})],
      priorityIds:['roster-a','roster-b'],
      sessionOverrides:{'roster-a':{
        id:sessionId, mastery_percent:72, first_try_percent:61,
        auto_total:5, hints_used:2, completed_at:completedAt,
      }},
    });
    await waitForQueueSettled(page);

    const search=page.locator('#analytics-search');
    await expect(search).toHaveCount(1);
    await search.fill('a');
    const scope=await page.evaluate(()=>{
      const selected=id=>{
        const node=document.getElementById(id);
        return String(node?.options?.[node.selectedIndex]?.textContent || node?.value || '').trim();
      };
      return {
        period:selected('analytics-period'),
        classScope:selected('analytics-class'),
        yearScope:selected('analytics-year'),
        modeScope:selected('analytics-mode'),
        search:String(document.getElementById('analytics-search')?.value || '').trim(),
      };
    });
    expect(scope.period).not.toBe('');
    expect(scope.classScope).not.toBe('');
    expect(scope.yearScope).not.toBe('');
    expect(scope.modeScope).not.toBe('');
    expect(scope.search).toBe('a');

    const completedFilter=page.locator('#v45-intervention-queue-tools .v45-queue-filter[data-filter="completed"]');
    await completedFilter.click();
    await expect(completedFilter).toHaveAttribute('aria-pressed','true');

    const beforeAnalytics=await page.evaluate(()=>JSON.stringify({
      visible:analyticsVisibleRows, context:analyticsContext, results:teacherResults,
    }));
    const writesBefore=data.assignmentWrites.length;
    const createsBefore=data.createRpcs.length;
    const [download]=await Promise.all([
      page.waitForEvent('download'),
      page.locator('.v46-export-queue').click(),
    ]);
    const csv=fs.readFileSync(await download.path(),'utf8').trim();
    const lines=csv.split(/\r?\n/);
    expect(lines).toHaveLength(2);
    const headers=parseCsvLine(lines[0]);
    const values=parseCsvLine(lines[1]);
    const record=Object.fromEntries(headers.map((header,index)=>[header,values[index] ?? '']));

    expect(record.analytics_period).toBe(scope.period);
    expect(record.analytics_class).toBe(scope.classScope);
    expect(record.analytics_year).toBe(scope.yearScope);
    expect(record.analytics_mode).toBe(scope.modeScope);
    expect(record.analytics_student_search).toBe(scope.search);
    expect(record.queue_filter).toBe('completed');
    expect(record.student_name).toBe('Aisha');
    expect(csv).not.toContain('Bilal');
    expect(record.focus_strand).toBe('number');
    expect(record.focus_topic).toBe('Whole Numbers');
    expect(record.intervention_status).toBe('Completed');
    expect(record.outcome_mastery_percent).toBe('72');
    expect(record.outcome_first_try_percent).toBe('61');
    expect(record.outcome_question_count).toBe('5');
    expect(record.outcome_hints_used).toBe('2');
    expect(record.outcome_completed_at).toBe(completedAt);

    const afterAnalytics=await page.evaluate(()=>JSON.stringify({
      visible:analyticsVisibleRows, context:analyticsContext, results:teacherResults,
    }));
    expect(afterAnalytics).toBe(beforeAnalytics);
    expect(data.assignmentWrites.length).toBe(writesBefore);
    expect(data.createRpcs.length).toBe(createsBefore);
  });

  test('H+ — V47C derives needs-assignment, outstanding, completed and genuine pending fallback from real Action Center queue rows',async({page})=>{
    const outstanding=assignment('hard-outstanding');
    const completed=assignment('hard-completed');
    await setupTeacher(page,{
      assignments:[outstanding,completed],
      recipients:[recipient(outstanding.id,'roster-b'),recipient(completed.id,'roster-c')],
      attempts:[
        attempt(outstanding.id,'roster-b',{status:'in_progress'}),
        attempt(completed.id,'roster-c',{status:'completed'}),
      ],
      priorityIds:['roster-a','roster-b','roster-c','roster-d'],
    });
    await waitForQueueSettled(page);

    // Exercise V47C's real transitional fallback using the actual Danish Action Center row.
    // Keep the production profile/key and queue row, but deliberately leave this one row
    // between V42 render and V44 action decoration. V47C must classify that live row as pending.
    await supportRow(page,'Danish').evaluate(row=>{
      const actions=row.querySelector('.v44a-action-buttons');
      const profile=actions?.querySelector('.v42-open-profile[data-key]');
      if(profile) row.appendChild(profile);
      actions?.remove();
      row.querySelectorAll('.v44c-intervention-status').forEach(node=>node.remove());
      row.dataset.v44aDecorated='1';
      row.appendChild(document.createComment('checkpoint2-pending-transition'));
    });

    const overview=page.locator('#v47c-class-intervention-overview');
    await expect(overview).toBeVisible();
    const stats=overview.locator('.v47c-overview-stat');
    await expect(stats.filter({hasText:'priority learners'}).locator('strong')).toHaveText('4');
    await expect(stats.filter({hasText:'need assignment'}).locator('strong')).toHaveText('1');
    await expect(stats.filter({hasText:'outstanding'}).locator('strong')).toHaveText('1');
    await expect(stats.filter({hasText:'completed'}).locator('strong')).toHaveText('1');
    await expect(overview.locator('.v47c-overview-note')).toContainText('1 learner still checking intervention status');
  });

  test('I+ — V48A data reads and rendered deadline rows stay scoped to the selected class',async({page})=>{
    const rows=[
      assignment('hard-overdue',{closesAt:pastIso(24)}),
      assignment('hard-today',{closesAt:dueTodayIso()}),
      assignment('hard-soon',{closesAt:futureIso(30)}),
      assignment('hard-none',{closesAt:null}),
      assignment('hard-other-class',{classId:CLASS_2.id,closesAt:pastIso(72)}),
    ];
    const {data}=await setupTeacher(page,{assignments:rows,priorityIds:[]});
    await openClasses(page);

    const panel=page.locator('#v48a-deadline-monitoring');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.v48a-row[data-assignment-id="hard-overdue"]')).toHaveCount(1);
    await expect(panel.locator('.v48a-row[data-assignment-id="hard-today"]')).toHaveCount(1);
    await expect(panel.locator('.v48a-row[data-assignment-id="hard-soon"]')).toHaveCount(1);
    await expect(panel.locator('.v48a-row[data-assignment-id="hard-none"]')).toHaveCount(1);
    await expect(panel.locator('.v48a-row[data-assignment-id="hard-other-class"]')).toHaveCount(0);
    const summary=panel.locator('.v48a-summary-card');
    await expect(summary.nth(0).locator('strong')).toHaveText('1');
    await expect(summary.nth(1).locator('strong')).toHaveText('1');
    await expect(summary.nth(2).locator('strong')).toHaveText('1');
    await expect(summary.nth(3).locator('strong')).toHaveText('1');
    expect(data.assignmentReadClassIds).toContain(CLASS_1.id);
    expect(data.assignmentReadClassIds).not.toContain(CLASS_2.id);
  });

  test('J+ — deadline event/rerender path re-applies the V48C Adjust target decoration',async({page})=>{
    const a=assignment('hard-deadline-edit',{closesAt:futureIso(24),active:true});
    const {data}=await setupTeacher(page,{assignments:[a],priorityIds:[]});
    await openClasses(page);
    await page.evaluate(()=>{
      window.__hardDeadlineEvents=0;
      window.addEventListener('math-practice-assignments-changed',()=>{ window.__hardDeadlineEvents += 1; });
    });

    const selector=`#v48a-deadline-monitoring .v48a-row[data-assignment-id="${a.id}"]`;
    const adjust=page.locator(`${selector} .v48c-adjust`);
    await expect(adjust).toBeVisible();
    await adjust.click();
    await page.locator('#v48c-target-dialog .v48c-target-input').fill(localInputValue(futureIso(36)));
    await page.locator('#v48c-target-dialog .v48c-save').click();

    await expect.poll(()=>data.assignmentWrites.length,{timeout:10_000}).toBe(1);
    expect(Object.keys(data.assignmentWrites[0].body).sort()).toEqual(['closes_at','updated_at']);
    expect(data.assignments.find(row=>row.id===a.id)?.active).toBe(true);
    await expect.poll(()=>page.evaluate(()=>window.__hardDeadlineEvents)).toBe(1);
    await expect(page.locator('#v48c-target-dialog')).toHaveCount(0,{timeout:10_000});
    await expect(page.locator(`${selector} .v48c-adjust`)).toBeVisible();
  });
});
