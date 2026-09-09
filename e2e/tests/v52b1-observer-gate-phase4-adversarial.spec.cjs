'use strict';

const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'../..');
const SITE=path.join(ROOT,'site');
const read=name=>fs.readFileSync(path.join(SITE,name),'utf8');
const sources=Object.freeze({
  gate:read('v52b1-question-bank-observer-gate.js'),
  foundation:read('v52-topical-exercise-foundation.js'),
  selection:read('question-bank-selection-qa.js'),
  topicalGuard:read('v52-topical-activation-guard.js'),
  metadataReview:read('question-bank-metadata-review.js'),
  topicalLibrary:read('v52-teacher-topical-library.js'),
  auditMultipart:read('question-bank-audit-multipart.js'),
  performance:read('v52b1-question-bank-performance.js'),
  topicalRoute:read('topical-legacy-student-route.js'),
  v58d:read('v58d-content-workflow-consolidation.js')
});
const add=(page,key)=>page.addScriptTag({content:sources[key]});

function questionBankShell({student=false}={}){
  return `<!doctype html><html><head><style>.hidden{display:none!important}</style></head><body>
    <section id="teacher" class="active">
      <div class="tabs">
        <button class="tab" data-panel="import-panel">Import</button>
        <button class="tab active" data-panel="questions-panel">Questions</button>
      </div>
      <section id="import-panel" class="panel">
        <div class="dropzone"></div><div id="import-summary"></div>
        <div id="v51a4-package-report"></div><div id="v51a5-import-panel"></div>
        <button id="preview-csv"></button><button id="clear-import"></button><input id="csv-file" type="file"><button id="import-btn"></button>
        <button id="v51a5-import-paper"></button><div id="v51a5-import-status"></div><div id="v51a2-bulk-image-panel"></div>
      </section>
      <section id="questions-panel" class="panel active">
        <div class="filtergrid">
          <input id="question-search">
          <select id="question-year"><option value="all">All</option><option value="6">6</option></select>
          <select id="question-strand"><option value="all">All</option><option value="number">number</option></select>
          <input id="question-exam-year"><input id="question-paper">
          <select id="question-status"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        <div id="question-bank-count"></div>
        <div id="questions-cards"></div>
      </section>
    </section>
    ${student ? `<section id="start" class="active"><div class="mode-switch"><button id="practice-mode-btn" class="mode-btn active">Practice</button><button id="exam-mode-btn" class="mode-btn">Exam</button></div><select id="year-level"><option value="6" selected>6</option></select><input id="student-name" value="Alya"><input id="student-id" value="S1"><select id="class-group"><option value="A" selected>A</option></select><div id="practice-strand-wrap"></div><div id="practice-topic-wrap"></div><div id="practice-difficulty-wrap"></div><div id="practice-count-wrap"></div><select id="question-count"><option value="1" selected>1</option></select><div id="mode-note"></div><button id="start-btn">Start</button></section><section id="quiz"><div id="student-pill"></div><div id="class-pill"></div><div id="path-pill"></div><button id="hint-btn">Hint</button><div id="hint-box" class="hidden"></div><div id="feedback"></div></section><section id="result"><h1>Practice Complete</h1><div id="progress-bar"></div><div id="result-name"></div><div id="result-score"></div><div id="res-mastery"></div><div id="res-hints"></div><div id="res-second"></div><div id="res-sync"></div><div id="result-message"></div><div id="result-code-box"><span id="result-code"></span><span class="help">Private code</span></div><button id="check-this-result"></button><div id="review"></div><button id="again-btn">Practice Again</button></section>` : ''}
  </body></html>`;
}

async function installQuestionBankGlobals(page,count=60,{topical=true}={}){
  await page.evaluate(({count,topical})=>{
    window.__alerts=[];
    window.__baseRenderCount=0;
    window.importRows=[];
    window.teacherQuestions=Array.from({length:count},(_,i)=>{
      const multipart=i<2;
      return {
        id:`q${i+1}`,year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
        question_text:`Question ${i+1}`,marks:1,answer:String(i+1),response_type:'text',exam_year:null,paper:'',
        question_number:multipart?`1(${i===0?'a':'b'})`:String(i+1),source_type:topical?'topical_exercise':'practice',
        source:topical?'Set A':'Bank',active:topical?false:i%3!==1,
        review_status:i===2?'reviewed':'none',review_note:i===2?'Checked':'',
        parent_question_number:multipart?'1':'',part_label:multipart?(i===0?'a':'b'):'',part_order:multipart?i+1:null,
        group_prompt:multipart?'Shared prompt':'',image_url:'',practice_eligible:i%2===0
      };
    });
    window.renderQuestions=function baseRenderQuestions(){
      window.__baseRenderCount+=1;
      const root=document.getElementById('questions-cards');
      if(!root)return null;
      root.innerHTML=window.teacherQuestions.map(q=>`<article class="qcard"><div class="qcard-head"></div><div class="qcard-main"><div class="qcard-meta"></div><div class="qcard-detail"></div><div class="qcard-actions"><button class="edit-q" data-id="${q.id}">Edit</button><button class="toggle-q" data-id="${q.id}" data-active="${q.active!==false?'true':'false'}">Toggle</button></div></div></article>`).join('');
      return {base:true,count:window.teacherQuestions.length};
    };
    window.loadTeacher=async()=>true;
    window.cloudReady=true;
    window.teacherUser={id:'t1'};
    window.alert=message=>{window.__alerts.push(String(message||''));};
    window.confirm=()=>true;
    window.prompt=(_message,value)=>value;
    window.cloud={
      from(){return {update(){return {in:async()=>({error:null})}}};},
      rpc:async()=>({data:{},error:null})
    };
  },{count,topical});
}

async function installStudentGlobals(page){
  await page.evaluate(()=>{
    window.__rpcCalls=[];
    window.activeStudentAccess=null;
    window.state={done:false,questions:[],index:0,hints:0,hintUsed:false,groupStatus:[]};
    window.setStartMode=()=>{};
    window.validateStudentAccess=async()=>({student_name:'Alya',student_id:'S1',year_level:6,class_name:'A',access_token:'practice-token',roster_student_id:'r1',class_id:'c1'});
    window.resetState=()=>{window.state={done:false,questions:[],index:0,hints:0,hintUsed:false,groupStatus:[]};};
    window.buildPracticeItems=rows=>rows.map(row=>({...row}));
    window.shuffle=items=>items.slice();
    window.renderQuestion=()=>{};
    window.show=name=>['start','quiz','result'].forEach(id=>document.getElementById(id)?.classList.toggle('active',id===name));
    window.gradeCloudPracticeQuestion=async()=>({correct:false});
    window.finishPractice=async()=>{};
    window.resultRecord=()=>({student_name:'Alya',student_id:'S1',year_level:6,class_group:'A',first_try_score:1,auto_total:1,first_try_percent:100,mastery_score:1,mastery_percent:100,hints_used:0,second_try_successes:0,pending_review_count:0,completed_at:'2026-09-09T00:00:00Z',details:[]});
    window.saveLocalResult=()=>{};
    window.normalizeResultCode=value=>String(value||'');
    window.rememberResultCode=()=>{};
    window.STRANDS={number:'Number'};
  });
}

async function installQuestionBankStack(page,{performance=true}={}){
  await add(page,'gate');
  await add(page,'selection');
  await add(page,'topicalGuard');
  await add(page,'metadataReview');
  await add(page,'topicalLibrary');
  await add(page,'auditMultipart');
  if(performance) await add(page,'performance');
}

test('B - suppression positives stay exact for Question Bank cards, panel and the real B2D-style body callback',async({page})=>{
  await page.setContent(questionBankShell());
  await add(page,'gate');
  const result=await page.evaluate(async()=>{
    const counts=window.__positive={cards:0,panel:0,body:0};
    const cards=document.getElementById('questions-cards');
    const panel=document.getElementById('questions-panel');
    const bind=()=>{};
    const renderSelectionState=()=>{};
    function historyCallback(){bind();renderSelectionState();counts.body+=1;}
    new MutationObserver(()=>{counts.cards+=1;}).observe(cards,{childList:true,subtree:true});
    new MutationObserver(()=>{counts.panel+=1;}).observe(panel,{childList:true,subtree:true});
    new MutationObserver(historyCallback).observe(document.body,{childList:true,subtree:true});
    cards.appendChild(document.createElement('span'));
    panel.appendChild(document.createElement('span'));
    document.body.appendChild(document.createElement('aside'));
    await new Promise(resolve=>setTimeout(resolve,70));
    return {
      counts:{...counts},
      markers:{cards:cards.dataset.v52b1ObserverGated||'',panel:panel.dataset.v52b1ObserverGated||'',body:document.body.dataset.v52b1ObserverGated||''},
      reasons:{
        cards:V52B1QuestionBankObserverGate.suppressionReason(cards,()=>{}),
        panel:V52B1QuestionBankObserverGate.suppressionReason(panel,()=>{}),
        body:V52B1QuestionBankObserverGate.suppressionReason(document.body,historyCallback)
      }
    };
  });
  expect(result.counts).toEqual({cards:0,panel:0,body:0});
  expect(result.markers).toEqual({cards:'1',panel:'1',body:'1'});
  expect(result.reasons).toEqual({cards:'question-card-observer',panel:'question-panel-observer',body:'question-history-body-observer'});
});

test('C - suppression negatives stay narrow: unrelated, partial body patterns, V52B cards and import observers remain native',async({page})=>{
  await page.setContent(questionBankShell()+`<div id="v52b-cards"></div><div id="ordinary-node"></div>`);
  await add(page,'gate');
  const result=await page.evaluate(async()=>{
    const counts=window.__negative={ordinary:0,bodyBind:0,bodySelection:0,bodyNeither:0,topicalCards:0,importStatus:0,imagePanel:0};
    const bindHelper=()=>{};
    const renderSelectionStateHelper=()=>{};
    function callbackOne(){bindHelper();counts.bodyBind+=1;}
    function callbackTwo(){renderSelectionStateHelper();counts.bodySelection+=1;}
    function callbackThree(){counts.bodyNeither+=1;}
    const ordinary=document.getElementById('ordinary-node');
    const topicalCards=document.getElementById('v52b-cards');
    const importStatus=document.getElementById('v51a5-import-status');
    const imagePanel=document.getElementById('v51a2-bulk-image-panel');
    new MutationObserver(()=>{counts.ordinary+=1;}).observe(ordinary,{childList:true});
    new MutationObserver(callbackOne).observe(document.body,{childList:true,subtree:true});
    new MutationObserver(callbackTwo).observe(document.body,{childList:true,subtree:true});
    new MutationObserver(callbackThree).observe(document.body,{childList:true,subtree:true});
    new MutationObserver(()=>{counts.topicalCards+=1;}).observe(topicalCards,{childList:true});
    new MutationObserver(()=>{counts.importStatus+=1;}).observe(importStatus,{childList:true});
    new MutationObserver(()=>{counts.imagePanel+=1;}).observe(imagePanel,{childList:true});
    ordinary.appendChild(document.createElement('i'));
    topicalCards.appendChild(document.createElement('i'));
    importStatus.appendChild(document.createElement('i'));
    imagePanel.appendChild(document.createElement('i'));
    document.body.appendChild(document.createElement('footer'));
    await new Promise(resolve=>setTimeout(resolve,70));
    return {
      counts:{...counts},
      reasons:{
        ordinary:V52B1QuestionBankObserverGate.suppressionReason(ordinary,()=>{}),
        bodyBind:V52B1QuestionBankObserverGate.suppressionReason(document.body,callbackOne),
        bodySelection:V52B1QuestionBankObserverGate.suppressionReason(document.body,callbackTwo),
        bodyNeither:V52B1QuestionBankObserverGate.suppressionReason(document.body,callbackThree),
        topicalCards:V52B1QuestionBankObserverGate.suppressionReason(topicalCards,()=>{}),
        importStatus:V52B1QuestionBankObserverGate.suppressionReason(importStatus,()=>{}),
        imagePanel:V52B1QuestionBankObserverGate.suppressionReason(imagePanel,()=>{})
      },
      markers:{body:document.body.dataset.v52b1ObserverGated||'',topicalCards:topicalCards.dataset.v52b1ObserverGated||'',importStatus:importStatus.dataset.v52b1ObserverGated||''}
    };
  });
  for(const value of Object.values(result.counts)) expect(value).toBeGreaterThan(0);
  expect(Object.values(result.reasons).every(value=>value==='')).toBe(true);
  expect(result.markers).toEqual({body:'',topicalCards:'',importStatus:''});
});

test('D - real consolidated V51 owners register the same observer targets and callback sources the V52B1 gate expects',async({page})=>{
  await page.setContent(questionBankShell());
  await installQuestionBankGlobals(page,4,{topical:true});
  await add(page,'gate');
  await page.evaluate(()=>{
    window.__observerRegistrationPhase='';
    window.__observerRegistrations=[];
    const GatedMutationObserver=window.MutationObserver;
    window.MutationObserver=new Proxy(GatedMutationObserver,{
      construct(target,args){
        const callback=args[0];
        const observer=Reflect.construct(target,args,target);
        const gatedObserve=observer.observe.bind(observer);
        observer.observe=function(node,options){
          const reason=window.V52B1QuestionBankObserverGate.suppressionReason(node,callback);
          window.__observerRegistrations.push({
            phase:window.__observerRegistrationPhase,
            target:node===document.body?'body':String(node?.id||node?.tagName||''),
            reason,
            callbackName:String(callback?.name||''),
            callbackSource:Function.prototype.toString.call(callback)
          });
          return gatedObserve(node,options);
        };
        return observer;
      }
    });
  });
  for(const key of ['selection','metadataReview','auditMultipart']){
    await page.evaluate(key=>{window.__observerRegistrationPhase=key;},key);
    await add(page,key);
  }
  const logs=await page.evaluate(()=>window.__observerRegistrations);
  const selection=logs.filter(item=>item.phase==='selection');
  const metadata=logs.filter(item=>item.phase==='metadataReview');
  const audit=logs.filter(item=>item.phase==='auditMultipart');
  expect(selection.filter(item=>item.target==='questions-cards'&&item.reason==='question-card-observer').length).toBeGreaterThanOrEqual(2);
  expect(metadata.some(item=>item.target==='questions-cards'&&item.reason==='question-card-observer'&&item.callbackSource.includes('renderAll'))).toBe(true);
  expect(audit.some(item=>item.target==='body'&&item.reason==='question-history-body-observer'&&item.callbackSource.includes('renderSelectionState')&&item.callbackSource.includes('bind'))).toBe(true);
  expect(audit.some(item=>item.target==='questions-cards'&&item.reason==='question-card-observer'&&item.callbackSource.includes('renderGroup'))).toBe(true);
  expect(logs.some(item=>item.phase==='selection'&&item.callbackSource.includes('requestAnimationFrame(render)'))).toBe(true);
});

test('G - actual RAF callback shapes are pinned, including the currently unrecognized anonymous QA callback',async({page})=>{
  await page.setContent(questionBankShell());
  await installQuestionBankGlobals(page,4,{topical:true});
  await installQuestionBankStack(page,{performance:false});
  await page.evaluate(()=>{
    window.__capturedRafCallbacks=[];
    const nativeRaf=window.requestAnimationFrame;
    window.requestAnimationFrame=function(callback){window.__capturedRafCallbacks.push(callback);return window.__capturedRafCallbacks.length;};
    try{window.renderQuestions();}finally{window.requestAnimationFrame=nativeRaf;}
  });
  await add(page,'performance');
  const callbacks=await page.evaluate(()=>window.__capturedRafCallbacks.map(callback=>({
    name:callback.name||'',
    source:Function.prototype.toString.call(callback),
    kind:window.V52B1QuestionBankPerformance.refreshCallbackKind(callback)
  })));
  const bulk=callbacks.find(item=>item.name==='renderSummary');
  const review=callbacks.find(item=>item.name==='renderAll');
  const qa=callbacks.find(item=>item.name===''&&/=>\s*render\(\)/.test(item.source)&&!item.source.includes('applyFocusedCards'));
  const topical=callbacks.find(item=>item.source.includes('applyFocusedCards')&&item.source.includes('render()'));
  expect(bulk?.kind).toBe('bulk-status');
  expect(review?.kind).toBe('review');
  expect(topical?.kind).toBe('topical-library');
  expect(qa).toBeTruthy();
  expect(qa.kind).toBe('');
  console.log(`[V52B1 G] current real QA RAF classifier contract: ${qa.source} => ${qa.kind||'UNRECOGNIZED'} (historical behavior intentionally pinned; this PR does not fix it)`);
});

test('A - global replacement is one-time, prototype-compatible and still delegates unrelated observers to native behavior',async({page})=>{
  await page.setContent('<!doctype html><html><body><div id="target"></div></body></html>');
  await page.evaluate(()=>{window.__nativeMutationObserver=window.MutationObserver;});
  await add(page,'gate');
  const first=await page.evaluate(()=>window.MutationObserver);
  const proof=await page.evaluate(async()=>{
    const Native=window.__nativeMutationObserver;
    const Wrapped=window.MutationObserver;
    let fired=0;
    const target=document.getElementById('target');
    new MutationObserver(()=>{fired+=1;}).observe(target,{childList:true});
    target.appendChild(document.createElement('span'));
    await new Promise(resolve=>setTimeout(resolve,50));
    return {
      installed:window.__v52b1QuestionBankObserverGateInstalled===true,
      replaced:Wrapped!==Native,
      prototypeCompatible:Wrapped.prototype===Native.prototype,
      constructorPrototype:Object.getPrototypeOf(Wrapped)===Native,
      apiFrozen:Object.isFrozen(window.V52B1QuestionBankObserverGate),
      fired
    };
  });
  await add(page,'gate');
  const second=await page.evaluate(()=>window.MutationObserver);
  expect(proof).toEqual({installed:true,replaced:true,prototypeCompatible:true,constructorPrototype:true,apiFrozen:true,fired:1});
  expect(second).toBe(first);
});

test('E - observers created before the global replacement remain live while equivalent post-gate Question Bank observers are suppressed',async({page})=>{
  await page.setContent('<!doctype html><html><body><div id="questions-cards"></div></body></html>');
  await page.evaluate(()=>{
    window.__preGateCount=0;
    window.__postGateCount=0;
    const cards=document.getElementById('questions-cards');
    new MutationObserver(()=>{window.__preGateCount+=1;}).observe(cards,{childList:true});
  });
  await add(page,'gate');
  const result=await page.evaluate(async()=>{
    const cards=document.getElementById('questions-cards');
    new MutationObserver(()=>{window.__postGateCount+=1;}).observe(cards,{childList:true});
    cards.appendChild(document.createElement('span'));
    await new Promise(resolve=>setTimeout(resolve,60));
    return {pre:window.__preGateCount,post:window.__postGateCount,marker:cards.dataset.v52b1ObserverGated||''};
  });
  expect(result).toEqual({pre:1,post:0,marker:'1'});
});

test('F - full V51/V52 wrapper composition preserves 50-card paging, full-scope selection and safety decorations after suppression',async({page})=>{
  await page.setContent(questionBankShell());
  await installQuestionBankGlobals(page,60,{topical:true});
  await installQuestionBankStack(page,{performance:true});
  await page.evaluate(()=>window.renderQuestions());
  await expect.poll(()=>page.locator('#questions-cards .qcard').count()).toBe(50);
  await page.waitForTimeout(220);
  await expect(page.locator('#v52b1-page-next')).toHaveCount(1);
  await expect(page.locator('#questions-cards .v51b1-qa-chips').first()).toBeVisible();
  await expect(page.locator('#questions-cards [data-v52-topical-locked="1"]').first()).toHaveCount(1);
  await expect(page.locator('#questions-cards .v51b2c-review-badge')).toHaveCount(1);
  await expect(page.locator('#questions-cards .v51b2e-multipart-badge')).toHaveCount(2);

  await page.locator('#questions-cards .toggle-q').first().click();
  await expect.poll(()=>page.evaluate(()=>window.__alerts.length)).toBe(1);

  await page.locator('#questions-cards .v51b2a-select').first().check();
  await expect.poll(()=>page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length)).toBe(1);
  await expect(page.locator('#v52b1-page-next')).toBeDisabled();

  await page.locator('#v51b2a-clear-selection').click();
  await expect.poll(()=>page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length)).toBe(0);
  await page.locator('#v51b2a-select-visible').click();
  await expect.poll(()=>page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length)).toBe(60);

  await page.locator('#v51b2a-clear-selection').click();
  await expect.poll(()=>page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length)).toBe(0);
  await expect(page.locator('#v52b-cards .v52b-select').first()).toHaveCount(1);
  await page.locator('#v52b-cards .v52b-select').first().click();
  await expect.poll(()=>page.evaluate(()=>window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length)).toBe(60);
});

test('H - large-bank mutation and filter storms stay bounded with no card-mutation render cascade',async({page})=>{
  await page.setContent(questionBankShell());
  await installQuestionBankGlobals(page,529,{topical:true});
  await page.evaluate(()=>{
    const nativeRaf=window.requestAnimationFrame.bind(window);
    window.__rafCount=0;
    window.requestAnimationFrame=callback=>{window.__rafCount+=1;return nativeRaf(callback);};
  });
  await installQuestionBankStack(page,{performance:true});
  await page.evaluate(()=>window.renderQuestions());
  await expect.poll(()=>page.locator('#questions-cards .qcard').count()).toBe(50);
  await page.waitForTimeout(180);

  const before=await page.evaluate(()=>({renders:window.__baseRenderCount,raf:window.__rafCount}));
  await page.evaluate(()=>{
    const input=document.getElementById('question-search');
    for(let i=0;i<40;i+=1){
      input.value=i%2?'Question 1':'';
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    input.value='';
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForTimeout(220);
  const afterFilters=await page.evaluate(()=>({renders:window.__baseRenderCount,raf:window.__rafCount,cards:document.querySelectorAll('#questions-cards .qcard').length}));
  expect(afterFilters.cards).toBe(50);
  expect(afterFilters.renders-before.renders).toBeLessThanOrEqual(8);

  await page.evaluate(()=>{
    const cards=document.getElementById('questions-cards');
    for(let i=0;i<200;i+=1){
      const badge=document.createElement('span');
      badge.className='storm-probe';
      cards.appendChild(badge);
      badge.remove();
    }
  });
  const renderBeforeMutations=await page.evaluate(()=>window.__baseRenderCount);
  await page.waitForTimeout(180);
  const afterMutations=await page.evaluate(()=>({renders:window.__baseRenderCount,raf:window.__rafCount,marker:document.getElementById('questions-cards')?.dataset.v52b1ObserverGated||''}));
  expect(afterMutations.renders).toBe(renderBeforeMutations);
  expect(afterMutations.raf-before.raf).toBeLessThan(400);
  expect(afterMutations.marker).toBe('1');
});

test('I - downstream V52C and V58D observers remain allowed: publication redecorates after library rerender and Step 5 still targets it',async({page})=>{
  await page.setContent(questionBankShell({student:true}));
  await installQuestionBankGlobals(page,1,{topical:true});
  await installStudentGlobals(page);
  await page.evaluate(()=>{
    window.cloud={
      from(){return {update(){return {in:async()=>({error:null})}}};},
      rpc:async(name,args)=>{
        window.__rpcCalls.push({name,args});
        if(name==='get_topical_exercise_publication_states_v52c') return {data:[{year_level:6,source:'Set A',is_available:false,ready:true,physical_rows:1,review_blockers:0,reasons:[]}],error:null};
        if(name==='get_available_topical_exercise_sets_v52c') return {data:[],error:null};
        if(name==='save_topical_exercise_setting_v52c') return {data:{year_level:6,source:'Set A',is_available:true,ready:true,physical_rows:1,review_blockers:0,reasons:[]},error:null};
        return {data:{},error:null};
      }
    };
  });
  await installQuestionBankStack(page,{performance:true});
  await page.evaluate(()=>window.renderQuestions());
  await expect.poll(()=>page.locator('#v52b-cards .v52b-set-card').count()).toBe(1);

  await add(page,'topicalRoute');
  await expect.poll(()=>page.locator('#v52b-cards .v52c-publication').count()).toBe(1);
  const before=await page.evaluate(()=>({
    cardsGated:document.getElementById('v52b-cards')?.dataset.v52b1ObserverGated||'',
    reason:window.V52B1QuestionBankObserverGate.suppressionReason(document.getElementById('v52b-cards'),()=>{}),
    publication:!!window.V52CTopicalPublication
  }));
  expect(before).toEqual({cardsGated:'',reason:'',publication:true});

  await page.evaluate(()=>window.V52TeacherTopicalLibrary.render());
  await expect.poll(()=>page.locator('#v52b-cards .v52c-publication').count()).toBe(1);

  await add(page,'v58d');
  await expect(page.locator('#v58d-content-workflow-questions [data-v58d-step="publish"]')).toHaveCount(1);
  await page.locator('#v58d-content-workflow-questions [data-v58d-step="publish"]').click();
  await page.waitForTimeout(120);
  await expect(page.locator('#v52b-topical-library')).toHaveClass(/v58d-highlight/);
  await expect(page.locator('#v58d-content-workflow-questions .v58d-content-workflow-status')).toContainText('Opened Step 5: Publish topical set.');
  const final=await page.evaluate(()=>({gate:window.__v52b1QuestionBankObserverGateInstalled===true,teacherObserverGated:document.getElementById('teacher')?.dataset.v52b1ObserverGated||''}));
  expect(final).toEqual({gate:true,teacherObserverGated:''});
});
