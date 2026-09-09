const {test,expect}=require('@playwright/test');
const fs=require('fs');
const path=require('path');
const read=name=>fs.readFileSync(path.resolve(__dirname,'../../site',name),'utf8');

const CLARITY=read('practice-ui-resource-clarity.js');
const ELIGIBILITY=read('practice-eligibility-ui.js');
const UI=read('resource-bank-ui.js');
const BULK=read('resource-bank-bulk.js');
const PERFORMANCE=read('v52b1-question-bank-performance.js');
const V56A=read('v56a-question-bank-response-filter.js');
const V56A1=read('v56a1-bulk-practice-confirmation-bridge.js');
const V58D=read('v58d-content-workflow-consolidation.js');

function bankHtml(extra=''){
  return `<!doctype html><html><head></head><body>
    <section id="teacher" class="active">
      <button class="tab" data-panel="questions-panel">Questions</button>
      <button class="tab" data-panel="import-panel">Import</button>
      <section id="questions-panel" class="active">
        <div class="filtergrid">
          <input id="question-search"><select id="question-year"><option value="all">all</option></select>
          <select id="question-strand"><option value="all">all</option></select><input id="question-exam-year"><input id="question-paper">
          <select id="question-status"><option value="all">all</option></select>
          <select id="v51b1-qa-filter"><option value="all">all</option></select><select id="v51b1-source-filter"><option value="all">all</option></select>
          <select id="v51b2c-review-filter"><option value="all">all</option></select>
        </div>
        <div id="v51b2a-bulk-status"><button id="v51b2a-select-visible">Select all filtered</button><button id="v51b2a-clear-selection">Clear selection</button><div id="v51b2a-summary"></div></div>
        <div id="question-bank-count"></div><div id="questions-cards"></div>${extra}
      </section>
      <section id="import-panel"></section>
    </section>
  </body></html>`;
}

async function installBaseRenderer(page){
  await page.evaluate(()=>{
    window.__baseCalls=[];
    window.renderQuestions=function baseRender(){
      window.__baseCalls.push(window.teacherQuestions.map(row=>row.id));
      const root=document.getElementById('questions-cards');
      if(root) root.innerHTML=window.teacherQuestions.map(row=>`<article class="qcard" data-v51b2a-id="${row.id}"><div class="qcard-head"></div><div class="qcard-title">${row.id}</div><div class="qcard-detail">detail</div><div class="qcard-meta"></div><div class="qcard-actions"><button class="toggle-q" data-id="${row.id}" ${row.source_type==='topical_exercise'?'data-v52-topical-locked="1"':''}>Active</button></div></article>`).join('');
      return {rows:window.teacherQuestions.slice(),page:{total:window.teacherQuestions.length,start:window.teacherQuestions.length?1:0,end:window.teacherQuestions.length,renderAll:true}};
    };
    window.__baseRender=window.renderQuestions;
  });
}

test.describe('Phase 4 V54 Resource Bank consolidation',()=>{
  test('A - D6 → A → B composition preserves synchronous badge reuse and renderer ownership order',async({page})=>{
    await page.setContent(bankHtml());
    await page.evaluate(()=>{window.teacherQuestions=[
      {id:'top',source_type:'topical_exercise',source:'Set A',year_level:6,practice_eligible:true,review_status:'reviewed',active:false},
      {id:'off',source_type:'past_paper',year_level:6,practice_eligible:false,active:true}
    ];});
    await installBaseRenderer(page);
    await page.evaluate(()=>window.renderQuestions());
    await page.addScriptTag({content:CLARITY});
    await page.addScriptTag({content:UI});
    const proof=await page.evaluate(()=>({
      aPrevBase:window.__v54aPreviousRenderQuestions===window.__baseRender,
      bPrevBase:window.__v54bPreviousRenderQuestions===window.__baseRender,
      bPrevFinal:window.__v54bPreviousRenderQuestions===window.renderQuestions,
      flags:[window.__v54aResourceBankVisibilityInstalled,window.__v54bPracticeEligibilityControlsInstalled],
      d6Badge:document.querySelector('.v53d6-practice-eligibility-badge')?.classList.contains('v54a-resource-badge')||false
    }));
    expect(proof).toEqual({aPrevBase:true,bPrevBase:false,bPrevFinal:false,flags:[true,true],d6Badge:true});

    await page.selectOption('#v54a-eligibility-filter','eligible');
    await page.evaluate(()=>window.renderQuestions());
    const last=await page.evaluate(()=>window.__baseCalls.at(-1));
    expect(last).toEqual(['top']);
  });

  test('B - V54B single and multipart actions each stay on one guarded RPC and keep active untouched',async({page})=>{
    await page.setContent(bankHtml());
    await page.evaluate(()=>{
      window.teacherQuestions=[
        {id:'single',source_type:'past_paper',year_level:6,question_number:'1',parent_question_number:'',practice_eligible:false,active:true},
        {id:'group-a',source_type:'past_paper',year_level:6,question_number:'2(a)',parent_question_number:'2',practice_eligible:false,active:true},
        {id:'group-b',source_type:'past_paper',year_level:6,question_number:'2(b)',parent_question_number:'2',practice_eligible:false,active:true}
      ];
      window.cloudReady=true;window.teacherUser={id:'t'};window.confirm=()=>true;window.__rpcCalls=[];window.__reloads=0;
      window.cloud={rpc:async(name,args)=>{window.__rpcCalls.push({name,args});return {data:{logical_rows:args.p_question_id==='single'?1:2,updated_rows:1},error:null};}};
      window.loadTeacher=async()=>{window.__reloads+=1;};
    });
    await installBaseRenderer(page);await page.evaluate(()=>window.renderQuestions());await page.addScriptTag({content:UI});
    await page.locator('.v54b-practice-toggle[data-id="single"]').click();
    await page.locator('.v54b-practice-toggle[data-id="group-a"]').click();
    await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.length)).toBe(2);
    const proof=await page.evaluate(()=>({calls:window.__rpcCalls,reloads:window.__reloads,active:window.teacherQuestions.map(r=>r.active)}));
    expect(proof.calls.map(c=>c.name)).toEqual(['save_question_practice_eligibility_v54b','save_question_practice_eligibility_v54b']);
    expect(proof.calls.map(c=>c.args.p_question_id)).toEqual(['single','group-a']);
    expect(proof.reloads).toBe(2);
    expect(proof.active).toEqual([true,true,true]);
  });

  test('C - topical rows remain whole-set managed: B/E refuse them while V53A set eligibility remains authoritative',async({page})=>{
    await page.setContent(bankHtml(`<section id="v52b-topical-library"><div id="v52b-cards"><article class="v52b-set-card" data-v52b-key="6|set a"><div class="qcard-head"><div class="pills"></div></div><div class="v52c-publication"></div><div class="qcard-actions"></div></article></div></section>`));
    await page.evaluate(()=>{
      window.teacherQuestions=[{id:'top',year_level:6,source_type:'topical_exercise',source:'set a',practice_eligible:false,active:false}];
      window.cloudReady=true;window.teacherUser={id:'t'};window.confirm=()=>true;window.__eligible=false;window.__rpcCalls=[];
      window.V51QuestionBankBulkStatus={buildPlan(rows){return {selected:rows.slice()};},clearSelection(){}};
      window.V53D1TeacherPracticePoolAlignment={logicalQuestionKey:r=>`single|${r.id}`};
      window.cloud={rpc:async(name,args)=>{window.__rpcCalls.push({name,args});if(name==='get_topical_practice_eligibility_states_v53a')return {data:[{year_level:6,source:'set a',physical_rows:1,logical_questions:1,eligible_rows:window.__eligible?1:0,reviewed_rows:1,active_rows:0,all_eligible:window.__eligible,partially_eligible:false,ready:true,readiness_reasons:[],student_retrieval_live:true}],error:null};if(name==='save_topical_practice_eligibility_v53a'){window.__eligible=!!args.p_eligible;window.teacherQuestions[0].practice_eligible=window.__eligible;return {data:{updated_rows:1},error:null};}throw new Error(`forbidden V54 topical write ${name}`);}};
    });
    await installBaseRenderer(page);await page.evaluate(()=>window.renderQuestions());
    await page.addScriptTag({content:ELIGIBILITY});await page.addScriptTag({content:UI});await page.addScriptTag({content:BULK});
    await expect(page.locator('.v54b-practice-toggle[data-id="top"]')).toBeDisabled();
    await expect(page.locator('.v54b-practice-toggle[data-id="top"]')).toHaveText('Managed by set');
    await expect(page.locator('#v54e-add-practice')).toBeDisabled();
    await page.locator('.v53a-eligibility-toggle').click();
    await expect(page.locator('.v53a-eligibility-toggle')).toHaveText('Remove from Practice pool');
    const names=await page.evaluate(()=>window.__rpcCalls.map(c=>c.name));
    expect(names).toEqual(['get_topical_practice_eligibility_states_v53a','save_topical_practice_eligibility_v53a','get_topical_practice_eligibility_states_v53a']);
  });

  test('D - compact/topical presentation keeps A/B/V53A current controls visible and hides only legacy surfaces',async({page})=>{
    await page.setContent(bankHtml(`<section id="v52b-topical-library"><div class="v52c-publication">legacy publication</div><div class="v53a-practice-eligibility">current set eligibility</div></section>`));
    await page.evaluate(()=>{window.teacherQuestions=[{id:'q1',source_type:'past_paper',year_level:6,practice_eligible:true,active:true}];});
    await installBaseRenderer(page);await page.evaluate(()=>window.renderQuestions());await page.addScriptTag({content:UI});
    // Add a locked topical Active control to prove D's exact suppression rule.
    await page.evaluate(()=>{const b=document.createElement('button');b.className='toggle-q';b.dataset.v52TopicalLocked='1';b.textContent='legacy active';document.getElementById('questions-cards').appendChild(b);});
    const compact=await page.evaluate(()=>({
      detail:getComputedStyle(document.querySelector('.qcard-detail')).display,
      meta:getComputedStyle(document.querySelector('.qcard-meta')).display,
      actions:getComputedStyle(document.querySelector('.qcard-actions')).display,
      badge:getComputedStyle(document.querySelector('.v54a-resource-badge')).display,
      toggle:getComputedStyle(document.querySelector('.v54b-practice-toggle')).display,
      publication:getComputedStyle(document.querySelector('.v52c-publication')).display,
      legacyActive:getComputedStyle(document.querySelector('.toggle-q[data-v52-topical-locked="1"]')).display,
      v53a:getComputedStyle(document.querySelector('.v53a-practice-eligibility')).display
    }));
    expect(compact.detail).toBe('none');expect(compact.meta).not.toBe('none');expect(compact.actions).not.toBe('none');expect(compact.badge).not.toBe('none');expect(compact.toggle).not.toBe('none');expect(compact.publication).toBe('none');expect(compact.legacyActive).toBe('none');expect(compact.v53a).not.toBe('none');
    await page.evaluate(()=>window.V54CCompactQuestionBank.setView('detailed'));
    await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('.qcard-detail')).display)).not.toBe('none');
  });

  test('E - E/F reuse V51 selection while V54G paging locks manual scope and explicit full-scope selection still expands',async({page})=>{
    await page.setContent(bankHtml());
    await page.evaluate(()=>{
      window.teacherQuestions=Array.from({length:60},(_,i)=>({id:i===0?'g1':i===1?'g2':`q${i+1}`,year_level:6,source_type:'past_paper',exam_year:2025,paper:'1',parent_question_number:i<2?'1':'',practice_eligible:false,active:true}));
      window.__selected=[];window.__rpcCalls=[];window.cloudReady=true;window.teacherUser={id:'t'};window.confirm=()=>true;
      window.V51QuestionBankBulkStatus={buildPlan(rows){return {selected:rows.filter(r=>window.__selected.includes(r.id))};},clearSelection(){window.__selected=[];}};
      window.V53D1TeacherPracticePoolAlignment={logicalQuestionKey:r=>r.parent_question_number?`group|${r.parent_question_number}`:`single|${r.id}`};
      window.cloud={rpc:async(name,args)=>{window.__rpcCalls.push({name,args});return {data:{logical_questions:1,updated_rows:2},error:null};}};
      window.loadTeacher=async()=>{};
      document.getElementById('v51b2a-select-visible').addEventListener('click',()=>{window.__selected=[...document.querySelectorAll('#questions-cards .qcard')].map(c=>c.dataset.v51b2aId);});
      document.getElementById('v51b2a-clear-selection').addEventListener('click',()=>{window.__selected=[];});
    });
    await installBaseRenderer(page);await page.addScriptTag({content:PERFORMANCE});await page.evaluate(()=>window.renderQuestions());
    await expect(page.locator('#questions-cards .qcard')).toHaveCount(50);
    await page.evaluate(()=>{window.__selected=['g1'];window.renderQuestions();});
    await expect(page.locator('#v52b1-page-next')).toBeDisabled();
    await page.evaluate(()=>{window.__selected=[];});
    await page.locator('#v51b2a-select-visible').click();
    await expect(page.locator('#questions-cards .qcard')).toHaveCount(60);

    await page.evaluate(()=>{window.__selected=['g1'];});
    await page.addScriptTag({content:BULK});
    await page.evaluate(()=>{const box=document.createElement('input');box.className='v51b2a-select';document.body.appendChild(box);box.dispatchEvent(new Event('change',{bubbles:true}));});
    await expect.poll(()=>page.evaluate(()=>document.getElementById('question-search').disabled)).toBe(true);
    await page.locator('#v54e-add-practice').click();
    await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.length)).toBe(1);
    const proof=await page.evaluate(()=>({call:window.__rpcCalls[0],selected:window.__selected.slice(),filterLocked:document.getElementById('question-search').disabled}));
    expect(proof.call.name).toBe('save_questions_practice_eligibility_v54e');
    expect(proof.call.args.p_question_ids).toEqual(['g1']);
    expect(proof.selected).toEqual([]);
    await expect.poll(()=>page.evaluate(()=>document.getElementById('question-search').disabled)).toBe(false);
  });

  test('F - V56A/V56A1/V58D downstream contracts resolve against consolidated V54 owners',async({page})=>{
    await page.setContent(bankHtml());
    await page.evaluate(()=>{
      window.teacherQuestions=[{id:'q1',year_level:6,source_type:'past_paper',practice_eligible:false,active:true,response_type:'drawing'}];
      window.__selected=['q1'];window.cloudReady=true;window.teacherUser={id:'t'};window.confirm=()=>true;
      window.V51QuestionBankBulkStatus={buildPlan(rows){return {selected:rows.filter(r=>window.__selected.includes(r.id))};},clearSelection(){window.__selected=[];}};
      window.V53D1TeacherPracticePoolAlignment={logicalQuestionKey:r=>`single|${r.id}`};
      window.cloud={rpc:async()=>({data:{logical_questions:1,updated_rows:1},error:null})};window.loadTeacher=async()=>{};
    });
    await installBaseRenderer(page);await page.evaluate(()=>window.renderQuestions());await page.addScriptTag({content:CLARITY});await page.addScriptTag({content:UI});await page.addScriptTag({content:BULK});
    const before=await page.evaluate(()=>window.renderQuestions);
    await page.evaluate(()=>{window.__v52b1QuestionBankPerformanceInstalled=true;});
    await page.addScriptTag({content:V56A});
    const wrapped=await page.evaluate(()=>window.__v56aQuestionBankResponseFilterRenderWrapped===true);
    expect(wrapped).toBe(true);
    await page.addScriptTag({content:V56A1});
    const bridge=await page.evaluate(()=>{
      const add=document.getElementById('v54e-add-practice');const plan=window.V56A1BulkPracticeConfirmationBridge.planFor(add);
      return {fReady:window.__v54fBulkSelectionScopeSafetyInstalled,planCanRun:!!plan?.canRun,text:window.V56A1BulkPracticeConfirmationBridge.modalText(plan),buttons:[!!add,!!document.getElementById('v54e-remove-practice')]};
    });
    expect(bridge.fReady).toBe(true);expect(bridge.planCanRun).toBe(true);expect(bridge.text).toContain('ordinary Practice');expect(bridge.buttons).toEqual([true,true]);

    await page.addScriptTag({content:V58D});
    await page.locator('[data-v58d-step="practice"]').first().click();
    await expect.poll(()=>page.evaluate(()=>document.querySelector('.v58d-highlight')?.id||'')).toMatch(/v54a-resource-bank-summary|v54b-eligibility-feedback/);
  });
});
