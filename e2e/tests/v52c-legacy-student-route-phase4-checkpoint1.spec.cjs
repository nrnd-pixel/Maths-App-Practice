const {test,expect}=require('@playwright/test');
const fs=require('fs');
const path=require('path');
const read=name=>fs.readFileSync(path.resolve(__dirname,'../../site',name),'utf8');

const OBSERVER_GATE=read('v52b1-question-bank-observer-gate.js');
const TOPICAL_ROUTE=read('topical-legacy-student-route.js');
const CLARITY=read('practice-ui-resource-clarity.js');

function stagedHtml(){
  return `<!doctype html><html><head></head><body>
    <section id="start" class="active">
      <div class="mode-switch"><button id="practice-mode-btn" class="mode-btn active">Practice</button><button id="exam-mode-btn" class="mode-btn">Exam</button></div>
      <select id="year-level"><option value="6" selected>6</option></select>
      <input id="student-name" value="Alya"><input id="student-id" value="S1"><select id="class-group"><option value="A" selected>A</option></select>
      <div id="practice-strand-wrap"></div><div id="practice-topic-wrap"></div><div id="practice-difficulty-wrap"></div><div id="practice-count-wrap"></div>
      <select id="question-count"><option value="1" selected>1</option></select>
      <div id="mode-note"></div><button id="start-btn">Start</button>
    </section>
    <section id="quiz"><div id="student-pill"></div><div id="class-pill"></div><div id="path-pill"></div><button id="hint-btn">Hint</button><div id="hint-box" class="hidden"></div><div id="feedback"></div></section>
    <section id="result"><h1>Practice Complete</h1><div id="progress-bar"></div><div id="result-name"></div><div id="result-score"></div><div id="res-mastery"></div><div id="res-hints"></div><div id="res-second"></div><div id="res-sync"></div><div id="result-message"></div><div id="result-code-box"><span id="result-code"></span><span class="help">Private code</span></div><button id="check-this-result"></button><div id="review"></div><button id="again-btn">Practice Again</button><button>Practice what I struggled with</button></section>
  </body></html>`;
}

async function installStagedGlobals(page){
  await page.evaluate(()=>{
    window.__nativeMutationObserver=window.MutationObserver;
    window.__rpcCalls=[];
    window.__renderQuestionCalls=0;
    window.__baseGradeCalls=0;
    window.__baseFinishCalls=0;
    window.cloudReady=true;
    window.activeStudentAccess=null;
    window.state={done:false,questions:[],index:0,hints:0,hintUsed:false,groupStatus:[]};
    window.setStartMode=()=>{};
    window.validateStudentAccess=async()=>({student_name:'Alya',student_id:'S1',year_level:6,class_name:'A',access_token:'practice-token',roster_student_id:'r1',class_id:'c1'});
    window.resetState=()=>{window.state={done:false,questions:[],index:0,hints:0,hintUsed:false,groupStatus:[]};};
    window.buildPracticeItems=rows=>rows.map(row=>({...row}));
    window.shuffle=items=>items.slice();
    window.renderQuestion=()=>{window.__renderQuestionCalls+=1;};
    window.show=name=>{
      ['start','quiz','result'].forEach(id=>document.getElementById(id)?.classList.toggle('active',id===name));
    };
    window.gradeCloudPracticeQuestion=async()=>{window.__baseGradeCalls+=1;return {correct:false};};
    window.finishPractice=async()=>{window.__baseFinishCalls+=1;};
    window.resultRecord=()=>({
      student_name:'Alya',student_id:'S1',year_level:6,class_group:'A',
      first_try_score:1,auto_total:1,first_try_percent:100,mastery_score:1,mastery_percent:100,
      hints_used:0,second_try_successes:0,pending_review_count:0,completed_at:'2026-09-09T00:00:00Z',
      details:[{questionId:'q1',question:'2 + 2',finalAnswer:'4',correctAnswer:'4',firstTry:true,correct:true,explanation:'',strand:'number',topic:'Addition',skill:'Add'}]
    });
    window.saveLocalResult=()=>{};
    window.normalizeResultCode=value=>String(value||'');
    window.rememberResultCode=()=>{};
    window.STRANDS={number:'Number'};
    window.cloud={rpc:async(name,args)=>{
      window.__rpcCalls.push({name,args});
      if(name==='get_available_topical_exercise_sets_v52c') return {data:[{source:'Addition Set',logical_questions:1,physical_rows:1,total_marks:1,image_rows:0,manual_rows:0}],error:null};
      if(name==='bind_student_topical_access_v52c') return {data:{allowed:true},error:null};
      if(name==='get_student_topical_questions_v52c') return {data:[{id:'q1',question_text:'2 + 2',response_type:'number',strand:'number',topic:'Addition',skill:'Add'}],error:null};
      if(name==='grade_topical_response_v52c') return {data:{correct:true,correct_answer:'4',explanation:'',hint:'Think addition'},error:null};
      if(name==='request_topical_hint_v52c') return {data:{hint:'Think addition'},error:null};
      if(name==='submit_topical_practice_session_v52c') return {data:{summary:{first_try_score:1,auto_total:1,first_try_percent:100,mastery_score:1,mastery_percent:100,pending_review_count:0},result_code:'TOP-1'},error:null};
      if(name==='renew_student_practice_access_v52c2') return {data:{allowed:true,access_token:'fresh-practice-token'},error:null};
      throw new Error(`Unexpected RPC: ${name}`);
    }};
  });
}

test.describe('Phase 4 V52C legacy Topical Practice consolidation',()=>{
  test('A - active V52B1 observer gate drives C1 deferred mount, then topical session starts and completes through dedicated RPCs',async({page})=>{
    await page.setContent(stagedHtml());
    await installStagedGlobals(page);

    await page.addScriptTag({content:OBSERVER_GATE});
    const gate=await page.evaluate(()=>({
      flag:window.__v52b1QuestionBankObserverGateInstalled,
      wrapped:window.MutationObserver!==window.__nativeMutationObserver,
      startSuppressed:window.V52B1QuestionBankObserverGate.suppressionReason(document.getElementById('start'),()=>{})
    }));
    expect(gate).toEqual({flag:true,wrapped:true,startSuppressed:''});

    // Load V52C while the current Learn-shell anchor is intentionally absent. C1 must
    // create a MutationObserver using the already-wrapped global constructor.
    await page.addScriptTag({content:TOPICAL_ROUTE});
    await expect(page.locator('#v52c-student-topical-library')).toHaveCount(0);

    await page.evaluate(()=>{
      const setup=document.createElement('div');
      setup.className='v40c-learn-setup';
      setup.innerHTML='<div class="v40c-practice-summary" id="current-practice-anchor">Current Practice setup</div>';
      document.getElementById('start').appendChild(setup);
    });
    await expect(page.locator('#v52c-student-topical-library')).toHaveCount(1);
    const mountProof=await page.evaluate(()=>{
      const root=document.getElementById('v52c-student-topical-library');
      return {
        next:root?.nextElementSibling?.id||'',
        parentClass:root?.parentElement?.className||'',
        gateFlag:window.__v52b1QuestionBankObserverGateInstalled,
        constructorStillWrapped:window.MutationObserver!==window.__nativeMutationObserver,
        startWasNotSuppressed:!document.getElementById('start').hasAttribute('data-v52b1-observer-gated')
      };
    });
    expect(mountProof).toEqual({next:'current-practice-anchor',parentClass:'v40c-learn-setup',gateFlag:true,constructorStillWrapped:true,startWasNotSuppressed:true});

    await page.locator('#v52c-topical-mode-btn').click();
    await expect(page.locator('#v52c-student-topical-library .v52c-set-card')).toHaveCount(1);
    await page.locator('#v52c-student-topical-library .v52c-set-card').click();
    await page.locator('#start-btn').click();
    await expect.poll(()=>page.evaluate(()=>window.state.topicalSource||'')).toBe('Addition Set');
    await expect.poll(()=>page.evaluate(()=>window.__renderQuestionCalls)).toBe(1);
    await expect(page.locator('#quiz')).toHaveClass(/active/);

    await page.evaluate(()=>window.finishPractice(false));
    await expect(page.locator('#result')).toHaveClass(/active/);
    await expect(page.locator('#result-score')).toContainText('1/1');
    await expect.poll(()=>page.evaluate(()=>document.getElementById('result')?.dataset.v52c2TopicalResult||'')).toBe('1');
    await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.some(call=>call.name==='renew_student_practice_access_v52c2'))).toBe(true);

    const proof=await page.evaluate(()=>({
      names:window.__rpcCalls.map(call=>call.name),
      baseFinishCalls:window.__baseFinishCalls,
      observerFlag:window.__v52b1QuestionBankObserverGateInstalled,
      constructorStillWrapped:window.MutationObserver!==window.__nativeMutationObserver
    }));
    expect(proof.names).toContain('get_available_topical_exercise_sets_v52c');
    expect(proof.names).toContain('bind_student_topical_access_v52c');
    expect(proof.names).toContain('get_student_topical_questions_v52c');
    expect(proof.names).toContain('submit_topical_practice_session_v52c');
    expect(proof.names).not.toContain('get_student_questions');
    expect(proof.names).not.toContain('grade_practice_response_v3');
    expect(proof.names).not.toContain('submit_practice_session_v3');
    expect(proof.baseFinishCalls).toBe(0);
    expect(proof.observerFlag).toBe(true);
    expect(proof.constructorStillWrapped).toBe(true);
  });

  test('B - full current runtime keeps consolidated V52C as hidden rollback infrastructure and V53C owns the student entry boundary',async({page})=>{
    await page.setContent(stagedHtml());
    await installStagedGlobals(page);
    await page.evaluate(()=>{
      const setup=document.createElement('div');
      setup.className='v40c-learn-setup';
      setup.innerHTML='<div class="v40c-practice-summary" id="current-practice-anchor">Current Practice setup</div>';
      document.getElementById('start').appendChild(setup);
    });
    await page.addScriptTag({content:OBSERVER_GATE});
    await page.addScriptTag({content:TOPICAL_ROUTE});
    await expect(page.locator('#v52c-topical-mode-btn')).toHaveCount(1);
    await page.addScriptTag({content:CLARITY});

    const hidden=await page.evaluate(()=>({
      buttonHidden:document.getElementById('v52c-topical-mode-btn')?.hidden===true,
      libraryHidden:document.getElementById('v52c-student-topical-library')?.hidden===true,
      twoModes:document.querySelector('.mode-switch')?.classList.contains('v53c-two-modes')===true,
      cFlag:window.__v52cStudentTopicalLibraryInstalled===true,
      v53Flag:window.__v53cTwoModeStudentUiInstalled===true,
      observerFlag:window.__v52b1QuestionBankObserverGateInstalled===true
    }));
    expect(hidden).toEqual({buttonHidden:true,libraryHidden:true,twoModes:true,cFlag:true,v53Flag:true,observerFlag:true});

    const before=await page.evaluate(()=>window.__rpcCalls.length);
    await page.evaluate(()=>document.getElementById('v52c-topical-mode-btn').click());
    await page.waitForTimeout(50);
    const after=await page.evaluate(()=>window.__rpcCalls.length);
    expect(after).toBe(before);
    await expect(page.locator('#practice-mode-btn')).toHaveClass(/active/);
  });
});
