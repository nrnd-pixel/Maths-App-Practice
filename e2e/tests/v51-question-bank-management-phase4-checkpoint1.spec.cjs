'use strict';

const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'../..');
const SITE=path.join(ROOT,'site');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');
const sources=Object.freeze({
  importOwner:read('paper-import-management.js'),
  observerGate:read('v52b1-question-bank-observer-gate.js'),
  selection:read('question-bank-selection-qa.js'),
  topicalGuard:read('v52-topical-activation-guard.js'),
  metadataReview:read('question-bank-metadata-review.js'),
  topicalLibrary:read('v52-teacher-topical-library.js'),
  auditMultipart:read('question-bank-audit-multipart.js'),
  b3:read('v51-exam-publication-safety.js'),
  b3ui:read('v51-exam-publication-ui-polish.js'),
  studentExam:read('student-exam-ui.js'),
  performance:read('v52b1-question-bank-performance.js'),
  resourceUi:read('resource-bank-ui.js'),
  resourceBulk:read('resource-bank-bulk.js'),
  v56a:read('v56a-question-bank-response-filter.js'),
  v58d:read('v58d-content-workflow-consolidation.js'),
  practiceEngine:read('practice-selection-engine.js')
});
const add=(page,key)=>page.addScriptTag({content:sources[key]});

function questionBankShell(){
  return `<!doctype html><html><head><style>.hidden{display:none!important}</style></head><body>
    <section id="teacher" class="active">
      <div class="tabs"><button class="tab active" data-panel="questions-panel">Questions</button></div>
      <section id="questions-panel" class="panel active">
        <div class="filtergrid">
          <input id="question-search"><select id="question-year"><option value="all">All</option><option value="6">6</option></select>
          <select id="question-strand"><option value="all">All</option><option value="number">number</option></select>
          <input id="question-exam-year"><input id="question-paper">
          <select id="question-status"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        <div id="question-bank-count"></div>
        <div id="questions-cards"></div>
      </section>
    </section>
  </body></html>`;
}

async function installBaseQuestionRenderer(page,count=3,{topical=false}={}){
  await page.evaluate(({count,topical})=>{
    window.teacherQuestions=Array.from({length:count},(_,i)=>({
      id:`q${i+1}`,year_level:6,strand:'number',topic:'Number',skill:'Counting',question_text:`Question ${i+1}`,
      marks:1,answer:String(i+1),response_type:'text',source_type:topical?'topical_exercise':'practice',source:topical?'Set A':'Bank',
      active:i%3!==1,review_status:'none',practice_eligible:i%2===0,question_number:String(i+1)
    }));
    window.renderQuestions=function baseRenderQuestions(){
      const root=document.getElementById('questions-cards');
      if(!root)return null;
      root.innerHTML=window.teacherQuestions.map(q=>`<article class="qcard"><div class="qcard-head"></div><div class="qcard-main"><div class="qcard-meta"></div><div class="qcard-detail"></div><div class="qcard-actions"><button class="edit-q" data-id="${q.id}">Edit</button><button class="toggle-q" data-id="${q.id}" data-active="${q.active!==false?'true':'false'}">Toggle</button></div></div></article>`).join('');
      return {base:true,count:window.teacherQuestions.length};
    };
    window.loadTeacher=async()=>true;
    window.cloudReady=true;
    window.teacherUser={id:'t1'};
    window.cloud={from(){return {update(){return {in:async()=>({error:null})}}}},rpc:async()=>({data:{},error:null})};
  },{count,topical});
}

test('V51 hard gate 1: validated paper-import owner keeps A1→A6 APIs and existing staged import authority',async({page})=>{
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.evaluate(()=>{window.teacherQuestions=[];window.importRows=[];});
  await add(page,'importOwner');
  const result=await page.evaluate(()=>{
    const rows=[{id:'preview-1',_valid:true,_duplicate:false,year_level:6,source_type:'teacher',source:'Demo',question_number:'1',marks:1,active:false,image_url:'',question_text:'1+1',answer:'2'}];
    const profile=window.V51PaperProfileValidator.paperProfile('Paper 1');
    const images=window.V51BulkQuestionImageUpload.buildMatchReport(rows,[]);
    const counts=window.V51PaperPackagePreview.importCounts(rows);
    const plan=window.V51OneConfirmationPaperImport.buildPlan({rows,packageReady:true,cloudReadyForTeacher:true,files:[]});
    const expected=window.V51PostImportIntegrity.packageExpectations(rows);
    const report=window.V51PostImportIntegrity.buildIntegrityReport({identity:{yearLevel:6,examYear:2026,paper:'Demo',sourceType:'teacher'},expected,rows,examSettings:[]});
    return {
      profile:{logical:profile.expectedLogicalQuestions,marks:profile.expectedMarks},
      images:{required:images.requiredCount,ready:images.readyToUpload},counts,planReady:plan.ready,
      expected:{rows:expected.physicalRows,marks:expected.totalMarks},integrity:report.integrityPass,
      apis:['V51PaperProfileValidator','V51BulkQuestionImageUpload','V51BulkQuestionImageCleanup','V51BulkQuestionImageSafety','V51PaperPackagePreview','V51PaperPackagePreviewStatus','V51OneConfirmationPaperImport','V51PostImportIntegrity'].map(k=>!!window[k])
    };
  });
  expect(result.profile).toEqual({logical:40,marks:90});
  expect(result.images.required).toBe(0);
  expect(result.counts.ready).toBe(1);
  expect(result.planReady).toBe(true);
  expect(result.integrity).toBe(true);
  expect(result.apis.every(Boolean)).toBe(true);
  expect(sources.importOwner).toContain("document.getElementById('v51a2-upload-images')");
  expect(sources.importOwner).toContain("document.getElementById('import-btn')");
  expect(sources.importOwner).toContain('const originalAlert = window.alert');
  expect(sources.importOwner).toContain('window.alert = originalAlert');
});

test('V51 hard gate 2: image cleanup protects committed objects and image safety blocks unresolved refs',async({page})=>{
  await page.setContent('<!doctype html><html><body></body></html>');
  await add(page,'importOwner');
  const result=await page.evaluate(()=>{
    const rows=[
      {_v51a2_storage_path:'v51-imports/a.png',image_url:'https://cdn/a.png'},
      {_v51a2_storage_path:'v51-imports/b.png',image_url:'https://cdn/b.png'}
    ];
    const cleanup=[...window.V51BulkQuestionImageCleanup.uncommittedPaths(rows,[{image_url:'https://cdn/a.png'}])];
    const match=window.V51BulkQuestionImageUpload.buildMatchReport([{_valid:true,_duplicate:false,image_url:'images/missing.png'}],[]);
    return {cleanup,missing:match.missing,ready:match.readyToUpload};
  });
  expect(result.cleanup).toEqual(['v51-imports/b.png']);
  expect(result.missing).toEqual(['missing.png']);
  expect(result.ready).toBe(false);
  expect(sources.importOwner).toContain('storage.from(ctx.bucket).remove(paths)');
  expect(sources.importOwner).toContain('stopImmediatePropagation');
  expect(sources.importOwner).toContain('committedImageUrls');
});

test('V51 hard gate 3: V52B1 observer boundary and renderer-wrapper composition survive consolidation',async({page})=>{
  await page.setContent(questionBankShell()+`<section id="import-panel"><div id="import-summary"></div><button id="preview-csv"></button><button id="clear-import"></button><input id="csv-file" type="file"><button id="import-btn"></button></section>`);
  await page.evaluate(()=>{
    const Native=window.MutationObserver;
    let backing=Native;
    const cache=new WeakMap();
    window.__observerPhase='early';window.__observerLog=[];window.__observerAssignments=[];
    const proxied=target=>{
      if(cache.has(target))return cache.get(target);
      const p=new Proxy(target,{construct(fn,args){window.__observerLog.push({phase:window.__observerPhase,callback:args[0]?.name||'',source:String(args[0]||'').slice(0,240)});return Reflect.construct(fn,args,fn);}});
      cache.set(target,p);return p;
    };
    Object.defineProperty(window,'MutationObserver',{configurable:true,get(){return proxied(backing);},set(v){backing=v;window.__observerAssignments.push(v?.name||'');}});
    window.teacherQuestions=[];window.importRows=[];
    window.renderQuestions=function baseRenderQuestions(){return {base:true};};
    window.loadTeacher=async()=>true;
  });
  await add(page,'importOwner');
  const early=await page.evaluate(()=>window.__observerLog.filter(x=>x.phase==='early').length);
  expect(early).toBeGreaterThan(0);

  await page.evaluate(()=>{window.__observerPhase='late';});
  await add(page,'observerGate');
  await add(page,'selection');
  await add(page,'topicalGuard');
  await add(page,'metadataReview');
  await add(page,'topicalLibrary');
  await add(page,'auditMultipart');
  const boundary=await page.evaluate(()=>({
    assignments:window.__observerAssignments,
    cardsGated:document.getElementById('questions-cards')?.dataset?.v52b1ObserverGated||'',
    flags:{qa:!!window.__v51QuestionBankQaRenderWrapped,bulk:!!window.__v51QuestionBankBulkStatusRenderWrapped,review:!!window.__v51QuestionReviewRenderWrapped,topical:!!window.__v52bTopicalLibraryRenderWrapped},
    late:window.__observerLog.filter(x=>x.phase==='late').length
  }));
  expect(boundary.assignments).toContain('WrappedMutationObserver');
  expect(boundary.cardsGated).toBe('1');
  expect(boundary.flags).toEqual({qa:true,bulk:true,review:true,topical:true});
  expect(boundary.late).toBeGreaterThan(0);

  await add(page,'performance');
  await add(page,'resourceUi');
  await add(page,'resourceBulk');
  await add(page,'v56a');
  const final=await page.evaluate(()=>({performance:!!window.__v52b1QuestionBankPerformanceInstalled,v54:!!window.__v54aPreviousRenderQuestions,v56:!!window.__v56aQuestionBankResponseFilterRenderWrapped}));
  expect(final.performance).toBe(true);
  expect(final.v54).toBe(true);
  expect(final.v56).toBe(true);
  expect(sources.performance).toContain("name === 'renderSummary'");
  expect(sources.performance).toContain("name === 'renderAll'");
  expect(sources.performance).toContain("source.includes('buildQaContext')");
  expect(sources.performance).toContain('V51MultipartQuestionManagement?.renderGroup?.()');
});

test('V51 hard gate 4: B2A remains the canonical selection across paging, full-scope selection and V54 bulk',async({page})=>{
  await page.setContent(questionBankShell());
  await installBaseQuestionRenderer(page,60);
  await add(page,'observerGate');
  await add(page,'selection');
  await add(page,'performance');
  await page.evaluate(()=>window.renderQuestions());
  await expect.poll(()=>page.locator('#questions-cards .v51b2a-select').count()).toBe(50);

  await page.locator('#questions-cards .v51b2a-select').first().check();
  const one=await page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length);
  expect(one).toBe(1);
  await expect(page.locator('#v52b1-page-next')).toBeDisabled();

  await page.locator('#v51b2a-clear-selection').click();
  await expect.poll(()=>page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length)).toBe(0);
  await page.locator('#v51b2a-select-visible').click();
  await expect.poll(()=>page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length)).toBe(60);

  await add(page,'resourceBulk');
  const shared=await page.evaluate(()=>({v51:window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length,v54:window.V54EBulkPracticeEligibility.selectedRows(window.teacherQuestions).length,locked:window.V54FBulkSelectionScopeSafety.selectionCount(window.teacherQuestions)}));
  expect(shared).toEqual({v51:60,v54:60,locked:60});
  await page.evaluate(()=>window.V51QuestionBankBulkStatus.clearSelection());
  await expect.poll(()=>page.evaluate(()=>window.V54FBulkSelectionScopeSafety.selectionCount(window.teacherQuestions))).toBe(0);
});

test('V51 hard gate 5: bulk status, metadata and review preserve their narrow write boundaries',async({page})=>{
  await page.setContent(questionBankShell());
  await page.evaluate(()=>{window.teacherQuestions=[];window.renderQuestions=()=>null;});
  await add(page,'observerGate');
  await add(page,'selection');
  await add(page,'metadataReview');
  const result=await page.evaluate(()=>{
    const rows=[
      {id:'inactive',year_level:6,exam_year:2026,paper:'Paper 2',question_number:'1',strand:'number',topic:'Old',skill:'Old',question_text:'Q',marks:1,answer:'1',active:false,review_status:'none'},
      {id:'active',year_level:6,exam_year:2026,paper:'Paper 2',question_number:'2',strand:'number',topic:'Old',skill:'Old',question_text:'Q',marks:1,answer:'2',active:true,review_status:'none'}
    ];
    const ids=new Set(['inactive']);
    const status=window.V51QuestionBankBulkStatus.buildPlan(rows,ids,true,{profileByKey:new Map()});
    const metadata=window.V51QuestionBankBulkMetadata.buildMetadataPlan(rows,ids,{topic:'New',answer:'PROTECTED'});
    const badReview=window.V51QuestionReviewWorkflow.buildReviewPlan(rows,new Set(['active']),'needs_review','Check');
    const goodReview=window.V51QuestionReviewWorkflow.buildReviewPlan(rows,ids,'needs_review','Check');
    return {status:{changing:status.changing.length,canRun:status.canRun},metadata:{fields:metadata.fields,blockers:metadata.blockers},badReview:{canRun:badReview.canRun,blockers:badReview.blockers},goodReview:{canRun:goodReview.canRun,patch:goodReview.patch}};
  });
  expect(result.status).toEqual({changing:1,canRun:true});
  expect(result.metadata.fields).toEqual(['topic']);
  expect(result.metadata.blockers.some(x=>x.includes('answer'))).toBe(true);
  expect(result.badReview.canRun).toBe(false);
  expect(result.goodReview.canRun).toBe(true);
  expect(result.goodReview.patch).toEqual({review_status:'needs_review',review_note:'Check'});
  expect(sources.selection).toContain("update({active:!!targetActive}).in('id',ids)");
  expect(sources.metadataReview).toContain("const ALLOWED_FIELDS = Object.freeze(['strand','topic','subtopic','skill','difficulty','source_type'])");
  expect(sources.metadataReview).toContain("document.addEventListener('click',guardActivationClick,true)");
});

test('V51 hard gate 6: correction history remains read-only and multipart corrections stay group-scoped',async({page})=>{
  await page.setContent(questionBankShell());
  await page.evaluate(()=>{window.teacherQuestions=[];window.cloudReady=false;window.renderQuestions=()=>null;});
  await add(page,'observerGate');
  await add(page,'auditMultipart');
  const result=await page.evaluate(()=>{
    const rows=[
      {id:'a',year_level:6,exam_year:2026,paper:'Paper 1',parent_question_number:'10',question_number:'10(a)',part_label:'a',part_order:2,group_prompt:'Shared',marks:1,active:false,review_status:'reviewed',question_text:'A'},
      {id:'b',year_level:6,exam_year:2026,paper:'Paper 1',parent_question_number:'10',question_number:'10(b)',part_label:'b',part_order:1,group_prompt:'Shared',marks:1,active:false,review_status:'reviewed',question_text:'B'}
    ];
    const group=window.V51MultipartQuestionManagement.analyzeGroup(rows);
    return {safeNormalize:group.safeNormalize,normalizationNeeded:group.normalizationNeeded,issues:group.issues};
  });
  expect(result.safeNormalize).toBe(true);
  expect(result.normalizationNeeded).toBe(true);
  expect(sources.auditMultipart).toContain("cloud.rpc('get_question_change_history_v51b2d'");
  expect(sources.auditMultipart).toContain("cloud.rpc('manage_multipart_group_v51b2e'");
  expect(sources.auditMultipart).not.toMatch(/cloud\.from\(['\"]question_change_history/);
  expect(sources.auditMultipart).toContain("p_action:action");
});

test('V51 hard gate 7: Exam publication keeps exact hardened global ownership and blocks writes before readiness',async({page})=>{
  await page.setContent(`<!doctype html><html><body><div id="exam-settings-feedback"></div><div id="exam-settings-list"></div><section id="exam-settings-panel" class="panel active"></section><button id="refresh-exam-settings"></button><button class="tab" data-panel="exam-settings-panel"></button></body></html>`);
  await page.evaluate(()=>{
    window.__calls=[];window.__ready=false;window.__confirm=true;
    window.confirm=()=>window.__confirm;
    window.cloudReady=true;window.teacherUser={id:'t'};
    window.loadExamSettingsEditor=async function legacyLoadExamSettingsEditor(){return true;};
    window.saveExamSetting=async function legacySaveExamSetting(){};
    window.cloud={
      rpc:async(name,args)=>{window.__calls.push({kind:'rpc',name,args});if(name==='get_exam_paper_readiness_v51b3')return {data:{ready:window.__ready,reasons:window.__ready?[]:['Not ready'],logical_questions:39,expected_logical_questions:40,total_marks:89,expected_marks:90},error:null};if(name==='save_exam_paper_setting_v51b3')return {data:{},error:null};return {data:{saved_count:1},error:null};},
      from:()=>({select:async()=>({data:[],error:null})})
    };
  });
  await add(page,'b3');
  await add(page,'b3ui');
  const ownership=await page.evaluate(()=>({load:window.loadExamSettingsEditor.name,save:window.saveExamSetting.name,safe:window.V51ExamPublicationUiPolish.safetyIsActive(),missing:window.V51ExamPublicationSafety.safeMissingSetting(null)}));
  expect(ownership.load).toBe('hardenedLoadExamSettingsEditor');
  expect(ownership.save).toBe('hardenedSaveExamSetting');
  expect(ownership.safe).toBe(true);
  expect(ownership.missing.is_available).toBe(false);

  await page.evaluate(()=>{
    const card=document.createElement('article');card.className='settings-card';card.dataset.year='6';card.dataset.examYear='2026';card.dataset.paper='Paper 1';card.dataset.v51b3CurrentAvailable='false';
    card.innerHTML='<div class="settings-fields"></div><div class="settings-card-head"><span class="tag"></span></div><input class="setting-duration" value="60"><select class="setting-release"><option value="after_manual_review" selected>After</option></select><select class="setting-available"><option value="false">No</option><option value="true" selected>Yes</option></select><button class="save-exam-setting"></button>';
    document.body.appendChild(card);window.__testCard=card;
  });
  await page.evaluate(()=>window.saveExamSetting(window.__testCard));
  let calls=await page.evaluate(()=>window.__calls.map(x=>x.name));
  expect(calls).toContain('get_exam_paper_readiness_v51b3');
  expect(calls).not.toContain('save_exam_paper_setting_v51b3');

  await page.evaluate(()=>{window.__ready=true;window.__testCard.dataset.examYear='2027';});
  await page.evaluate(()=>window.saveExamSetting(window.__testCard));
  calls=await page.evaluate(()=>window.__calls.map(x=>x.name));
  expect(calls).toContain('save_exam_paper_setting_v51b3');
  expect(sources.b3).toContain("cloud.rpc('save_exam_paper_settings_bulk_v51b3'");
  expect(sources.b3).toContain('The full batch is validated before any write.');
  expect(sources.b3ui).toContain("fn.name === 'hardenedLoadExamSettingsEditor'");
});

test('V51 hard gate 8: student Exam UI wraps existing selectors and only presents existing recovery state',async({page})=>{
  await page.setContent(`<!doctype html><html><body>
    <input id="student-id" value="S1"><input id="student-name" value="Ali"><select id="year-level"><option value="6" selected>6</option></select>
    <div id="exam-year-wrap"><select id="exam-year"><option value="2026" selected>2026</option></select></div>
    <div id="exam-paper-wrap"><select id="exam-paper"><option value="Paper 1" selected>Paper 1</option></select></div>
    <div id="exam-paper-note"></div><button id="start-btn">Start Exam</button><button id="practice-mode-btn"></button><button id="exam-mode-btn"></button>
    <section id="start"></section><div id="student-access-note"></div>
  </body></html>`);
  await page.evaluate(()=>{
    window.__studentCalls=[];
    window.examMetaRows=[{exam_year:2026,paper:'Paper 1',question_number:'1',marks:1}];
    window.settingFor=()=>({duration_minutes:60,answer_release_rule:'after_manual_review'});
    window.fillExamPapers=()=>window.__studentCalls.push('fillExamPapers');
    window.loadExamOptions=async function baseLoadExamOptions(){window.__studentCalls.push('baseLoadExamOptions');};
    window.updateExamPaperNote=async function baseUpdateExamPaperNote(){window.__studentCalls.push('baseUpdateExamPaperNote');};
  });
  await add(page,'studentExam');
  await page.evaluate(async()=>{await window.loadExamOptions();await window.updateExamPaperNote();});
  const wraps=await page.evaluate(()=>({calls:window.__studentCalls.slice(),loadWrapped:window.loadExamOptions.__v51c1Wrapped===true,noteWrapped:window.updateExamPaperNote.__v51c1Wrapped===true}));
  expect(wraps.calls).toEqual(['baseLoadExamOptions','baseUpdateExamPaperNote']);
  expect(wraps.loadWrapped).toBe(true);
  expect(wraps.noteWrapped).toBe(true);

  await page.evaluate(()=>{
    const api=window.V51StudentExamResumeProgress;
    const key=api.identityKey('S1','Ali',6,2026,'Paper 1');
    localStorage.setItem('mathV32F1ActiveAttempts',JSON.stringify({[key]:{status:'in_progress',questionCount:40,answeredItems:12,index:12,flags:['q2'],lastSavedAt:new Date().toISOString(),durationMinutes:60}}));
    api.renderResumeStatus();
  });
  await expect(page.locator('#start-btn')).toHaveText('Continue Exam');
  await expect(page.locator('#v51c2-exam-resume-status')).toContainText('12/40 answered');
  expect(sources.studentExam).not.toContain("cloud.from('exam_attempts').insert");
});

test('V51 hard gate 9: downstream V52/V54/V56/V58 contracts still consume V51 while V53 Practice stays independent',async({page})=>{
  await page.setContent(questionBankShell());
  await installBaseQuestionRenderer(page,2,{topical:true});
  await add(page,'observerGate');
  await add(page,'selection');
  await page.evaluate(()=>window.renderQuestions());
  await expect.poll(()=>page.locator('.v51b2a-select').count()).toBe(2);
  await page.locator('.v51b2a-select').first().check();
  await add(page,'topicalGuard');
  await add(page,'resourceBulk');
  await add(page,'v56a');
  const contracts=await page.evaluate(()=>({
    v51:window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length,
    v54:window.V54EBulkPracticeEligibility.selectedRows(window.teacherQuestions).length,
    v56:window.V56AQuestionBankResponseFilter.selectedCount(window.teacherQuestions),
    topical:window.V52TopicalActivationGuard.selectedTopicalRows(window.teacherQuestions).length
  }));
  expect(contracts).toEqual({v51:1,v54:1,v56:1,topical:1});
  for(const anchor of ['#v51a4-package-panel','#v51-paper-profile-audit','#v51a6-integrity-panel','#v51b1-question-bank-qa','#v51b2c-review-workflow','#v51b2d-question-history']) expect(sources.v58d).toContain(anchor);
  expect(sources.resourceBulk).toContain('V51QuestionBankBulkStatus');
  expect(sources.v56a).toContain('V51QuestionBankBulkStatus');
  expect(sources.practiceEngine).not.toContain('V51QuestionBank');
});
