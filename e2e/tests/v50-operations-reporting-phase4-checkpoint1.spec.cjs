'use strict';

const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'../..');
const SITE=path.join(ROOT,'site');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');
const sources=Object.freeze({
  reporting:read('teacher-reporting.js'),
  operations:read('teacher-launch-operations.js'),
  observerGate:read('v52b1-question-bank-observer-gate.js'),
  security:read('v50-security-hardening.js'),
  audit:read('release-audit-ui.js')
});
const add=(page,key)=>page.addScriptTag({content:sources[key]});

function teacherShell(extra=''){
  return `<!doctype html><html><head><title>Math Practice Test</title></head><body>
    <section id="start"><div class="brand"><div></div><div><span class="badge">Current Version</span></div></div><div class="info"></div></section>
    <section id="teacher">
      <div class="header"><div><div id="teacher-subtitle"></div></div><div class="toolbar"></div></div>
      <div class="tabs"><button type="button" class="tab active" data-panel="analytics-panel">Analytics</button></div>
      <div id="analytics-panel" class="panel active">
        <button id="export-analytics" type="button">Export</button>
        <div class="student-insight-head"><button id="close-student-insight" type="button">Close</button></div>
      </div>
    </section>
    ${extra}
  </body></html>`;
}

function operationsSnapshot(){
  return {
    classes:[
      {id:'c1',name:'6A',year_level:6,active:true},
      {id:'c2',name:'6B',year_level:6,active:true}
    ],
    students:[{
      id:'s1',student_name:'Ali Example',student_id:'S001',class_id:'c1',class_name:'6A',year_level:6,
      active:true,pin_set:true,practice_sessions:0,exam_attempts:0,in_progress_exam_attempts:0,in_progress_practice_assignments:0
    }],
    assignments:[{
      id:'a1',kind:'practice',title:'Unused Practice',class_name:'6A',year_level:6,active:true,attempt_count:0,recipient_count:0
    }],
    summary:{
      active_students:1,inactive_students:0,pin_missing:0,active_practice_assignments:1,active_exam_assignments:0,
      pending_review_answers:0,in_progress_exam_attempts:0,in_progress_practice_attempts:0,student_history_total:0,report_archives:0
    }
  };
}

function readinessSnapshot(){
  return {
    active_classes:1,active_students:1,pin_missing:0,pin_ready:1,duplicate_student_ids:0,access_mode:'student_pin',
    active_questions:40,active_exam_papers:1,available_exam_settings:1,history_total:0,possible_test_students_count:0,
    possible_test_students:[],active_practice_assignments:0,active_exam_assignments:0,report_archives:0,
    generated_at:'2026-09-09T00:00:00Z',last_reset_at:null,history:{}
  };
}

async function installAnalyticsGlobals(page){
  await page.evaluate(()=>{
    window.analyticsVisibleRows=[{
      key:'student-1',student_name:'Ali Example',student_id:'S001',class_name:'6A',class_group:'6A',year_level:6,
      registered:true,active:true,practice:0,examStarted:0,examSubmitted:0,examFullyMarked:0,inProgress:0,incomplete:0,
      awaitingReview:0,examPercents:[],lastActivity:''
    }];
    window.analyticsLearningRows=[];
    window.selectedAnalyticsStudentKey='student-1';
    window.analyticsContext={sessions:[],attempts:[],answers:[]};
    window.learningBand=()=>({key:'',label:'Learning evidence'});
    window.aggregateLearning=()=>[];
    window.analyticsAnswerScore=()=>({pending:false,possible:0,awarded:0});
    window.analyticsFinalExamPercent=()=>null;
    window.analyticsKey=value=>value?.key||'';
    window.renderAnalytics=()=>{};
    window.STRANDS={};
  });
}

test('V50 hard gate 1: early owners construct native observers before V52B1 and late audit UI constructs through the wrapped observer boundary',async({page})=>{
  await page.setContent(teacherShell('<div id="v50-release-audit-root"></div>'));
  await page.evaluate(()=>{
    const RealMutationObserver=window.MutationObserver;
    let backing=RealMutationObserver;
    const cache=new WeakMap();
    window.__v50ObserverPhase='early';
    window.__v50ObserverLog=[];
    window.__v50ObserverAssignments=[];
    const proxied=target=>{
      if(cache.has(target)) return cache.get(target);
      const proxy=new Proxy(target,{
        construct(fn,args){
          window.__v50ObserverLog.push({phase:window.__v50ObserverPhase,kind:fn===RealMutationObserver?'native':'wrapped'});
          return Reflect.construct(fn,args,fn);
        }
      });
      cache.set(target,proxy);
      return proxy;
    };
    Object.defineProperty(window,'MutationObserver',{
      configurable:true,
      get(){ return proxied(backing); },
      set(value){ backing=value; window.__v50ObserverAssignments.push(value?.name||'anonymous'); }
    });
  });

  await add(page,'reporting');
  await add(page,'operations');
  const early=await page.evaluate(()=>window.__v50ObserverLog.slice());
  expect(early.length).toBeGreaterThan(0);
  expect(early.every(row=>row.phase==='early'&&row.kind==='native')).toBe(true);

  await page.evaluate(()=>{ window.__v50ObserverPhase='gate'; });
  await add(page,'observerGate');
  const gate=await page.evaluate(()=>({installed:window.__v52b1QuestionBankObserverGateInstalled===true,assignments:window.__v50ObserverAssignments.slice()}));
  expect(gate.installed).toBe(true);
  expect(gate.assignments).toContain('WrappedMutationObserver');

  await page.evaluate(()=>{ window.__v50ObserverPhase='late'; });
  await add(page,'audit');
  const after=await page.evaluate(()=>window.__v50ObserverLog.slice());
  const late=after.filter(row=>row.phase==='late');
  expect(late.some(row=>row.kind==='wrapped')).toBe(true);
  expect(after.filter(row=>row.phase==='early').every(row=>row.kind==='native')).toBe(true);
});

test('V50 hard gate 2: reporting API and downstream DOM contracts survive consolidation',async({page})=>{
  await page.setContent(teacherShell(`
    <select id="analytics-period"><option selected>All time</option></select>
    <select id="analytics-class"><option selected>All classes</option></select>
    <select id="analytics-year"><option selected>All years</option></select>
    <select id="analytics-mode"><option selected>All modes</option></select>
    <input id="analytics-search" value="">`));
  await installAnalyticsGlobals(page);
  await add(page,'reporting');

  const api=await page.evaluate(()=>({
    keys:Object.keys(window.V50ReportingExport||{}).sort(),
    types:['buildClassSnapshot','buildStudentSnapshot','downloadSnapshot','makeCsv'].map(key=>typeof window.V50ReportingExport?.[key])
  }));
  expect(api.keys).toEqual(['buildClassSnapshot','buildStudentSnapshot','downloadSnapshot','makeCsv'].sort());
  expect(api.types).toEqual(['function','function','function','function']);
  await expect(page.locator('#v50c1-open-class-report')).toHaveCount(1);
  await expect(page.locator('#v50c2-open-student-report')).toHaveCount(1);
  await expect(page.locator('#v50c2-student-report-overlay')).toHaveCount(1);
  await expect(page.locator('#report-archive-panel')).toHaveCount(1);

  await page.locator('#v50c1-open-class-report').click();
  await expect(page.locator('#v50c3a-export-class-csv')).toHaveCount(1);
  await expect(page.locator('#v50c3b-save-class-report')).toHaveCount(1);
  await page.locator('#v50c1-close').click();

  await page.locator('#v50c2-open-student-report').click();
  await expect(page.locator('#v50c3a-export-student-csv')).toHaveCount(1);
  await expect(page.locator('#v50c3b-save-student-report')).toHaveCount(1);
});

test('V50 hard gate 3: Launch Readiness keeps exact typed phrase plus independent browser confirmation',async({page})=>{
  await page.setContent(teacherShell());
  await installAnalyticsGlobals(page);
  await page.evaluate(data=>{
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.__rpcCalls=[];
    window.__confirmResult=false;
    window.confirm=()=>window.__confirmResult;
    window.cloud={rpc:async(name,args)=>{
      window.__rpcCalls.push({name,args:args||null});
      if(name==='get_teacher_launch_readiness_v50d1') return {data,error:null};
      if(name==='reset_student_launch_activity_v50d1') return {data:{deleted:{practice_sessions:0,session_answers:0,exam_attempts:0}},error:null};
      return {data:{},error:null};
    }};
  },readinessSnapshot());
  await add(page,'reporting');
  await add(page,'operations');

  await page.locator('#v50d1-launch-readiness-tab').click();
  await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='get_teacher_launch_readiness_v50d1').length)).toBeGreaterThan(0);
  const reset=page.locator('#v50d1-reset');
  await expect(reset).toBeDisabled();
  await page.locator('#v50d1-reset-confirm').fill('RESET STUDENT ACTIVIT');
  await expect(reset).toBeDisabled();
  await page.locator('#v50d1-reset-confirm').fill('RESET STUDENT ACTIVITY');
  await expect(reset).toBeEnabled();

  await reset.click();
  expect(await page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='reset_student_launch_activity_v50d1').length)).toBe(0);

  await page.evaluate(()=>{ window.__confirmResult=true; });
  await reset.click();
  await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='reset_student_launch_activity_v50d1').length)).toBe(1);
  const resetCall=await page.evaluate(()=>window.__rpcCalls.find(row=>row.name==='reset_student_launch_activity_v50d1'));
  expect(resetCall.args.p_confirm_text).toBe('RESET STUDENT ACTIVITY');
});

test('V50 hard gate 4: Teacher Operations preserves two-stage transfer and assignment-deletion preflights',async({page})=>{
  await page.setContent(teacherShell());
  await page.evaluate(data=>{
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.__rpcCalls=[];
    window.confirm=()=>true;
    window.cloud={rpc:async(name,args)=>{
      window.__rpcCalls.push({name,args:args||null});
      if(name==='get_teacher_operations_v50d2') return {data,error:null};
      if(name==='transfer_roster_student_v50d2'){
        if(args?.p_confirm) return {data:{transferred:true},error:null};
        return {data:{can_transfer:true,message:'Safe to transfer.',history:{practice_sessions:0,exam_attempts:0,learning_days:0},access_tickets_to_invalidate:0},error:null};
      }
      if(name==='manage_teacher_assignment_v50d2'){
        if(args?.p_action==='delete'&&args?.p_confirm) return {data:{deleted:true},error:null};
        if(args?.p_action==='delete') return {data:{can_delete:true,attempt_count:0,message:'This unused assignment can be permanently deleted.'},error:null};
      }
      return {data:{},error:null};
    }};
  },operationsSnapshot());
  await add(page,'operations');

  await page.locator('#v50d2-teacher-operations-tab').click();
  await expect(page.locator('.v50d2-transfer-student')).toHaveCount(1);
  await page.locator('.v50d2-transfer-student').click();
  await page.locator('#v50d2-transfer-check').click();
  await expect(page.locator('#v50d2-transfer-confirm')).toBeVisible();
  await page.locator('#v50d2-transfer-confirm').click();
  await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='transfer_roster_student_v50d2').length)).toBe(2);
  const transferCalls=await page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='transfer_roster_student_v50d2'));
  expect(transferCalls.map(row=>row.args.p_confirm)).toEqual([false,true]);

  await expect(page.locator('.v50d2-delete-assignment')).toHaveCount(1);
  await page.locator('.v50d2-delete-assignment').click();
  await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='manage_teacher_assignment_v50d2'&&row.args?.p_action==='delete').length)).toBe(2);
  const deleteCalls=await page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='manage_teacher_assignment_v50d2'&&row.args?.p_action==='delete'));
  expect(deleteCalls.map(row=>row.args.p_confirm)).toEqual([false,true]);
});

test('V50 hard gate 5: Roster Edit remains an extension of the D2 roster and refreshes D2 after save',async({page})=>{
  await page.setContent(teacherShell());
  await page.evaluate(data=>{
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.__rpcCalls=[];
    window.cloud={rpc:async(name,args)=>{
      window.__rpcCalls.push({name,args:args||null});
      if(name==='get_teacher_operations_v50d2') return {data,error:null};
      if(name==='edit_roster_student_identity_v50') return {data:{student_id_changed:false},error:null};
      return {data:{},error:null};
    }};
  },operationsSnapshot());
  await add(page,'operations');

  await page.locator('#v50d2-teacher-operations-tab').click();
  await expect(page.locator('#teacher-operations-panel')).toHaveCount(1);
  await expect(page.locator('.v50d2-edit-student')).toHaveCount(1);
  const before=await page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='get_teacher_operations_v50d2').length);
  await page.locator('.v50d2-edit-student').click();
  await expect(page.locator('#v50-roster-edit-modal')).toBeVisible();
  await page.locator('#v50-roster-edit-name').fill('Ali Example Updated');
  await page.locator('#v50-roster-edit-save').click();
  await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='edit_roster_student_identity_v50').length)).toBe(1);
  await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.filter(row=>row.name==='get_teacher_operations_v50d2').length)).toBeGreaterThan(before);
});

test('V50 hard gate 6: frozen Security Hardening remains the sole final refreshStudentAssignmentAccess owner',async({page})=>{
  await page.setContent(teacherShell('<div id="exam-access-status"></div><div id="v50-release-audit-root"></div>'));
  await page.evaluate(()=>{
    window.__legacyAssignmentAccess=function legacyAssignmentAccess(){ return 'legacy'; };
    window.refreshStudentAssignmentAccess=window.__legacyAssignmentAccess;
  });

  await add(page,'reporting');
  await add(page,'operations');
  await add(page,'observerGate');
  expect(await page.evaluate(()=>window.refreshStudentAssignmentAccess===window.__legacyAssignmentAccess)).toBe(true);

  await add(page,'security');
  const secured=await page.evaluate(()=>{
    window.__securedAssignmentAccess=window.refreshStudentAssignmentAccess;
    return {
      changed:window.__securedAssignmentAccess!==window.__legacyAssignmentAccess,
      installed:window.__v50SecurityHardeningInstalled===true,
      note:document.getElementById('exam-access-status')?.textContent||''
    };
  });
  expect(secured.changed).toBe(true);
  expect(secured.installed).toBe(true);
  expect(secured.note).toContain('verified securely when you start the paper');

  await add(page,'audit');
  expect(await page.evaluate(()=>window.refreshStudentAssignmentAccess===window.__securedAssignmentAccess)).toBe(true);
  expect(sources.reporting).not.toMatch(/refreshStudentAssignmentAccess\s*=/);
  expect(sources.operations).not.toMatch(/refreshStudentAssignmentAccess\s*=/);
  expect(sources.audit).not.toMatch(/refreshStudentAssignmentAccess\s*=/);
});

test('V50 hard gate 7: Production Polish API/event and RC3 consumer remain exact in the late consolidated owner',async({page})=>{
  await page.setContent(teacherShell(`
    <button id="setup-btn" type="button">Setup</button>
    <section id="student-review"><div class="header"><p class="muted"></p></div></section>
    <div id="result-code-box"><div class="help"></div></div>
    <div id="exam-result-code-box"><div class="help"></div></div>
    <div id="cloud-status"></div><div id="student-access-note"></div><div id="exam-save-status"></div><div id="mode-note"></div>
  `));
  await page.evaluate(()=>{
    window.MATH_APP_CONFIG={};
    window.MathAppVersion={
      CURRENT_RELEASE:{title:'Math Practice Test',badge:'Version Test'},
      applyIdentity(){
        document.title=this.CURRENT_RELEASE.title;
        const badge=document.querySelector('#start .brand .badge');
        if(badge) badge.textContent=this.CURRENT_RELEASE.badge;
      }
    };
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.cloud={rpc:async name=>{
      if(name==='get_teacher_release_audit_v50rc1') return {data:{functional_ready:true,summary:{active_exam_papers:1,configured_exam_papers:1,available_exam_papers:1,pending_review_count_mismatches:0,exam_result_link_issues:0,practice_assignment_link_issues:0,answer_marks_out_of_bounds:0,overdue_in_progress_exams:0,duplicate_active_student_id_groups:0,legacy_registered_exam_attempts_missing_class_id:0},missing_exam_settings:[]},error:null};
      if(name==='get_teacher_release_audit_v50rc2') return {data:{security_ready:true,summary:{access_mode:'student_pin',forbidden_anon_function_exposures:0,sensitive_anon_table_grants:0,required_student_rpc_missing:0,active_exam_assignments_missing_settings:0,active_exam_assignments_unavailable:0,result_code_min_length:19,result_code_duplicates:0,pin_missing:0,history_total:0,possible_test_students_count:0,missing_exam_settings_count:0},manual_platform_checks:[]},error:null};
      return {data:{},error:null};
    }};
    window.__polishEvents=[];
    window.addEventListener('v50rc3-production-polish-updated',event=>window.__polishEvents.push(event.detail));
  });
  await add(page,'observerGate');
  await add(page,'audit');

  const api=await page.evaluate(()=>({
    getAudit:typeof window.V50ProductionPolish?.getAudit,
    refresh:typeof window.V50ProductionPolish?.refresh,
    eventCount:window.__polishEvents.length
  }));
  expect(api.getAudit).toBe('function');
  expect(api.refresh).toBe('function');
  expect(api.eventCount).toBeGreaterThan(0);

  await page.evaluate(()=>window.V50ProductionPolish.refresh());
  const state=await page.evaluate(()=>window.V50ProductionPolish.getAudit());
  expect(state.ready).toBe(true);
  await page.locator('#v50-release-audit-tab').click();
  await expect(page.locator('#v50-release-audit-root .v50rc-section[data-v50rc3-decorated="1"]')).toHaveCount(1);
  await expect(page.locator('#v50-release-audit-badge')).toHaveText('RC3 ✓');
  expect(await page.evaluate(()=>window.__polishEvents.length)).toBeGreaterThan(1);
});
