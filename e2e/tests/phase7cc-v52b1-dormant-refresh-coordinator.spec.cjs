'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const PROTOTYPE = fs.readFileSync(
  path.join(ROOT, 'tooling/phase7c/v52b1-question-bank-refresh-coordinator-prototype.js'),
  'utf8'
);
const read = name => fs.readFileSync(path.join(SITE, name), 'utf8');

const sources = Object.freeze({
  gate: read('v52b1-question-bank-observer-gate.js'),
  selection: read('question-bank-selection-qa.js'),
  topicalGuard: read('v52-topical-activation-guard.js'),
  metadataReview: read('question-bank-metadata-review.js'),
  topicalLibrary: read('v52-teacher-topical-library.js'),
  auditMultipart: read('question-bank-audit-multipart.js'),
  performance: read('v52b1-question-bank-performance.js'),
});

const add = (page, key) => page.addScriptTag({ content: sources[key] });
const addPrototype = page => page.addScriptTag({ content: PROTOTYPE });

function shell(){
  return `<!doctype html><html><head><style>.hidden{display:none!important}</style></head><body>
    <section id="teacher" class="active">
      <div class="tabs"><button class="tab active" data-panel="questions-panel">Questions</button></div>
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
  </body></html>`;
}

async function installGlobals(page,count=6,{topical=true}={}){
  await page.evaluate(({count,topical})=>{
    window.__baseRenderCount=0;
    window.teacherQuestions=Array.from({length:count},(_,i)=>{
      const multipart=i<2;
      return {
        id:`q${i+1}`,year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',
        difficulty:'standard',question_text:`Question ${i+1}`,marks:1,answer:String(i+1),response_type:'text',
        exam_year:null,paper:'',question_number:multipart?`1(${i===0?'a':'b'})`:String(i+1),
        source_type:topical?'topical_exercise':'practice',source:topical?'Set A':'Bank',
        active:topical?false:i%3!==1,review_status:i===2?'reviewed':'none',review_note:i===2?'Checked':'',
        parent_question_number:multipart?'1':'',part_label:multipart?(i===0?'a':'b'):'',
        part_order:multipart?i+1:null,group_prompt:multipart?'Shared prompt':'',image_url:'',
        practice_eligible:i%2===0
      };
    });

    window.renderQuestions=function baseRenderQuestions(){
      window.__baseRenderCount+=1;
      const root=document.getElementById('questions-cards');
      if(!root)return null;
      root.innerHTML=window.teacherQuestions.map(q=>`
        <article class="qcard">
          <div class="qcard-head"></div>
          <div class="qcard-main">
            <div class="qcard-meta"></div>
            <div class="qcard-detail"></div>
            <div class="qcard-actions">
              <button class="edit-q" data-id="${q.id}">Edit</button>
              <button class="toggle-q" data-id="${q.id}" data-active="${q.active!==false?'true':'false'}">Toggle</button>
            </div>
          </div>
        </article>`).join('');
      return {base:true,count:window.teacherQuestions.length};
    };

    window.loadTeacher=async()=>true;
    window.cloudReady=true;
    window.teacherUser={id:'t1'};
    window.alert=()=>{};
    window.confirm=()=>true;
    window.prompt=(_message,value)=>value;
    window.cloud={
      from(){return {update(){return {in:async()=>({error:null})}}};},
      rpc:async()=>({data:{},error:null})
    };
  },{count,topical});
}

async function installStack(page){
  await add(page,'gate');
  await add(page,'selection');
  await add(page,'topicalGuard');
  await add(page,'metadataReview');
  await add(page,'topicalLibrary');
  await add(page,'auditMultipart');
  await add(page,'performance');
}

test.describe('Phase 7C-C — dormant local refresh coordinator prototype',()=>{
  test('prototype is tooling-only, inert on install and does not take global observer or render ownership',async({page})=>{
    expect(PROTOTYPE).not.toContain('MutationObserver');
    expect(PROTOTYPE).not.toMatch(/\bfetch\s*\(/);
    expect(PROTOTYPE).not.toMatch(/\.rpc\s*\(/);
    expect(PROTOTYPE).not.toContain('localStorage');
    expect(PROTOTYPE).not.toContain('sessionStorage');
    expect(PROTOTYPE).not.toMatch(/renderQuestions\s*=/);

    await page.setContent(shell());
    await installGlobals(page,4,{topical:true});
    await installStack(page);

    await page.evaluate(()=>{
      window.__phase7ccBeforeConstructor=window.MutationObserver;
      window.__phase7ccBeforeGate=window.V52B1QuestionBankObserverGate;
      window.__phase7ccBeforeRenderCount=window.__baseRenderCount;
    });

    await addPrototype(page);

    const after=await page.evaluate(()=>({
      sameConstructor:window.MutationObserver===window.__phase7ccBeforeConstructor,
      sameGateApi:window.V52B1QuestionBankObserverGate===window.__phase7ccBeforeGate,
      renderCountUnchanged:window.__baseRenderCount===window.__phase7ccBeforeRenderCount,
      gateInstalled:!!window.__v52b1QuestionBankObserverGateInstalled,
      prototypeFrozen:Object.isFrozen(window.Phase7CQuestionBankRefreshCoordinatorPrototype)
    }));

    expect(after).toEqual({
      sameConstructor:true,
      sameGateApi:true,
      renderCountUnchanged:true,
      gateInstalled:true,
      prototypeFrozen:true
    });
  });

  test('current production contracts include the owner-native Correction History refreshLifecycle()',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,6,{topical:true});
    await installStack(page);
    await addPrototype(page);

    const inspection=await page.evaluate(()=>window.Phase7CQuestionBankRefreshCoordinatorPrototype.inspectContracts());

    expect(inspection.contracts).toEqual({
      bulkStatus:true,
      qa:true,
      review:true,
      topicalLibrary:true,
      topicalActivation:true,
      multipart:true,
      correctionHistory:true
    });
    expect(inspection.readyForGateRetirement).toBe(true);
    expect(inspection.blocker).toBe('');

    const orders=await page.evaluate(()=>({
      cards:[...window.Phase7CQuestionBankRefreshCoordinatorPrototype.CARD_REFRESH_ORDER],
      selection:[...window.Phase7CQuestionBankRefreshCoordinatorPrototype.SELECTION_REFRESH_ORDER]
    }));
    expect(orders.cards).toEqual([
      'bulk-status','qa','review','topical-library','topical-activation','multipart','correction-history'
    ]);
    expect(orders.selection).toEqual([
      'bulk-status','topical-activation','review','multipart','correction-history'
    ]);
  });

  test('card refresh uses all seven explicit public contracts in deterministic order',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,6,{topical:true});
    await installStack(page);
    await addPrototype(page);

    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(180);

    const result=await page.evaluate(()=>window.Phase7CQuestionBankRefreshCoordinatorPrototype.refreshAfterCards());
    expect(result.order).toEqual([
      'bulk-status','qa','review','topical-library','topical-activation','multipart','correction-history'
    ]);
    expect(result.results.every(item=>item.status==='called')).toBe(true);
    expect(result.readyForGateRetirement).toBe(true);
    expect(result.blocker).toBe('');
  });

  test('narrow explicit selection refresh fixes the pinned Select all/Clear history state gap without broad DOM observation',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4,{topical:false});
    await installStack(page);
    await addPrototype(page);

    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(180);

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.locator('#v51b2d-selection').textContent()).toContain('Selected:');

    await page.locator('#v51b2a-clear-selection').click();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(0);
    await page.waitForTimeout(100);
    await expect(page.locator('#v51b2d-selection')).toContainText('Selected:');

    const afterClear=await page.evaluate(()=>
      window.Phase7CQuestionBankRefreshCoordinatorPrototype.refreshAfterSelection()
    );

    expect(afterClear.readyForGateRetirement).toBe(true);
    await expect(page.locator('#v51b2d-selection')).toHaveText('Select one question to view its history.');

    await page.locator('#v51b2a-select-visible').click();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(4);
    await page.waitForTimeout(100);
    await expect(page.locator('#v51b2d-selection')).toHaveText('Select one question to view its history.');

    const afterSelectAll=await page.evaluate(()=>
      window.Phase7CQuestionBankRefreshCoordinatorPrototype.refreshAfterSelection()
    );

    expect(afterSelectAll.readyForGateRetirement).toBe(true);
    await expect(page.locator('#v51b2d-selection')).toHaveText('4 selected · choose exactly one question for audit history.');
  });

  test('late Correction History panel loss is recovered by the owner-native lifecycle contract',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4,{topical:false});
    await installStack(page);
    await addPrototype(page);

    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(160);
    await expect(page.locator('#v51b2d-question-history')).toHaveCount(1);

    await page.locator('#v51b2d-question-history').evaluate(node=>node.remove());

    const result=await page.evaluate(()=>
      window.Phase7CQuestionBankRefreshCoordinatorPrototype.refreshAfterCards()
    );

    const history=result.results.find(item=>item.kind==='correction-history');
    expect(history.status).toBe('called');
    expect(result.readyForGateRetirement).toBe(true);
    expect(result.blocker).toBe('');
    await expect(page.locator('#v51b2d-question-history')).toHaveCount(1);
    await expect(page.locator('#v51b2d-load')).toHaveAttribute('data-bound','1');
  });

  test('native negative-control observers remain live while the dormant prototype is present',async({page})=>{
    await page.setContent(shell()+'<div id="v52b-cards"></div><div id="ordinary"></div>');
    await add(page,'gate');
    await addPrototype(page);

    const result=await page.evaluate(async()=>{
      const counts={topical:0,ordinary:0};
      const topical=document.getElementById('v52b-cards');
      const ordinary=document.getElementById('ordinary');
      new MutationObserver(()=>{counts.topical+=1;}).observe(topical,{childList:true});
      new MutationObserver(()=>{counts.ordinary+=1;}).observe(ordinary,{childList:true});
      topical.appendChild(document.createElement('span'));
      ordinary.appendChild(document.createElement('span'));
      await new Promise(resolve=>setTimeout(resolve,60));
      return {
        counts,
        reasons:{
          topical:window.V52B1QuestionBankObserverGate.suppressionReason(topical,()=>{}),
          ordinary:window.V52B1QuestionBankObserverGate.suppressionReason(ordinary,()=>{})
        }
      };
    });

    expect(result.counts.topical).toBeGreaterThan(0);
    expect(result.counts.ordinary).toBeGreaterThan(0);
    expect(result.reasons).toEqual({topical:'',ordinary:''});
  });
});
