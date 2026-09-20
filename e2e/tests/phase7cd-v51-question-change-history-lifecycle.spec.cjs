'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const read = name => fs.readFileSync(path.join(SITE, name), 'utf8');

const sources = Object.freeze({
  gate: read('v52b1-question-bank-observer-gate.js'),
  selection: read('question-bank-selection-qa.js'),
  auditMultipart: read('question-bank-audit-multipart.js'),
});

const add = (page, key) => page.addScriptTag({ content: sources[key] });

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

async function installGlobals(page,count=4){
  await page.evaluate(count=>{
    window.teacherQuestions=Array.from({length:count},(_,i)=>({
      id:`q${i+1}`,
      year_level:6,
      strand:'number',
      topic:'Number',
      subtopic:'',
      skill:'Counting',
      difficulty:'standard',
      question_text:`Question ${i+1}`,
      marks:1,
      answer:String(i+1),
      response_type:'text',
      exam_year:2026,
      paper:'Paper 1',
      question_number:i<2?`1(${i===0?'a':'b'})`:String(i+1),
      source_type:'practice',
      source:'Bank',
      active:true,
      review_status:'none',
      review_note:'',
      parent_question_number:i<2?'1':'',
      part_label:i<2?(i===0?'a':'b'):'',
      part_order:i<2?(i===0?2:1):null,
      group_prompt:i<2?'Shared prompt':'',
      image_url:'',
      practice_eligible:true
    }));

    window.renderQuestions=function(){
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
              <button class="toggle-q" data-id="${q.id}" data-active="true">Toggle</button>
            </div>
          </div>
        </article>`).join('');
      return {count:window.teacherQuestions.length};
    };

    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.__rpcCalls=[];
    window.cloud={
      rpc:async(name,args)=>{
        window.__rpcCalls.push({name,args});
        if(name==='get_question_change_history_v51b2d') return {data:{history:[]},error:null};
        return {data:{},error:null};
      },
      from(){ throw new Error('direct table access not expected'); }
    };
    window.alert=()=>{};
    window.confirm=()=>true;
    window.prompt=(_message,value)=>value;
  },count);
}

async function installOwnerStack(page){
  await add(page,'gate');
  await add(page,'selection');
  await add(page,'auditMultipart');
  await page.evaluate(()=>window.renderQuestions());
  await page.waitForTimeout(120);
}

test.describe('Phase 7C-D — Correction History owner lifecycle contract',()=>{
  test('owner exposes an idempotent refreshLifecycle() with no RPC side effect',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4);
    await installOwnerStack(page);

    const result=await page.evaluate(()=>{
      window.__rpcCalls.length=0;
      const api=window.V51QuestionChangeHistory;
      const first=api.refreshLifecycle();
      const second=api.refreshLifecycle();
      const third=api.refreshLifecycle();
      return {
        type:typeof api.refreshLifecycle,
        counts:[first.length,second.length,third.length],
        panels:document.querySelectorAll('#v51b2d-question-history').length,
        buttons:document.querySelectorAll('#v51b2d-load').length,
        bound:document.getElementById('v51b2d-load')?.dataset?.bound || '',
        rpcCalls:window.__rpcCalls.length,
        bodySuppressed:document.body?.dataset?.v52b1ObserverGated || ''
      };
    });

    expect(result).toEqual({
      type:'function',
      counts:[0,0,0],
      panels:1,
      buttons:1,
      bound:'1',
      rpcCalls:0,
      bodySuppressed:''
    });
  });

  test('explicit lifecycle deterministically repairs the historical Clear / Select all stale state',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4);
    await installOwnerStack(page);

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.locator('#v51b2d-selection').textContent()).toContain('Selected:');
    const manualText=await page.locator('#v51b2d-selection').textContent();

    await page.locator('#v51b2a-clear-selection').click();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(0);
    await page.waitForTimeout(100);
    expect(await page.locator('#v51b2d-selection').textContent()).toBe(manualText);

    await page.evaluate(()=>window.V51QuestionChangeHistory.refreshLifecycle());
    await expect(page.locator('#v51b2d-selection')).toHaveText('Select one question to view its history.');

    await page.locator('#v51b2a-select-visible').click();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(4);
    await page.waitForTimeout(100);
    await expect(page.locator('#v51b2d-selection')).toHaveText('Select one question to view its history.');

    await page.evaluate(()=>window.V51QuestionChangeHistory.refreshLifecycle());
    await expect(page.locator('#v51b2d-selection')).toHaveText('4 selected · choose exactly one question for audit history.');
  });

  test('late panel removal is owner-recovered and the recreated Load history button binds exactly once',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4);
    await installOwnerStack(page);

    await page.locator('#v51b2d-question-history').evaluate(node=>node.remove());
    await expect(page.locator('#v51b2d-question-history')).toHaveCount(0);

    await page.evaluate(()=>{
      window.V51QuestionChangeHistory.refreshLifecycle();
      window.V51QuestionChangeHistory.refreshLifecycle();
      window.V51QuestionChangeHistory.refreshLifecycle();
    });

    await expect(page.locator('#v51b2d-question-history')).toHaveCount(1);
    await expect(page.locator('#v51b2d-load')).toHaveCount(1);
    await expect(page.locator('#v51b2d-load')).toHaveAttribute('data-bound','1');

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.locator('#v51b2d-load').isEnabled()).toBe(true);

    await page.evaluate(()=>{ window.__rpcCalls.length=0; });
    await page.locator('#v51b2d-load').click();
    await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.length)).toBe(1);

    const calls=await page.evaluate(()=>window.__rpcCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('get_question_change_history_v51b2d');
    expect(calls[0].args).toMatchObject({p_question_id:'q1',p_limit:50});
  });

  test('lifecycle stays read-only and B2E multipart behavior remains unchanged',async({page})=>{
    expect(sources.auditMultipart).toContain("cloud.rpc('get_question_change_history_v51b2d'");
    expect(sources.auditMultipart).not.toMatch(/cloud\.from\(['"]question_change_history/);
    expect(sources.auditMultipart).not.toMatch(/\.insert\s*\(/);
    expect(sources.auditMultipart).not.toMatch(/\.upsert\s*\(/);

    await page.setContent(shell());
    await installGlobals(page,4);
    await installOwnerStack(page);

    const group=await page.evaluate(()=>window.V51MultipartQuestionManagement.analyzeGroup(
      window.teacherQuestions.slice(0,2)
    ));
    expect(group.normalizationNeeded).toBe(true);
    expect(group.safeNormalize).toBe(true);
    expect(await page.evaluate(()=>typeof window.V51MultipartQuestionManagement.renderGroup)).toBe('function');
  });

  test('V52B1 gate remains byte-identical and native negative-control observers remain live',async({page})=>{
    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{
      cwd:ROOT,encoding:'utf8'
    }).trim();
    expect(gateBlob).toBe('d0c4745afdd78fc326b39748eca559e9d530503a');

    await page.setContent(shell()+'<div id="v52b-cards"></div><div id="ordinary"></div>');
    await installGlobals(page,2);
    await add(page,'gate');
    await add(page,'selection');
    await add(page,'auditMultipart');

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
        },
        gateInstalled:!!window.__v52b1QuestionBankObserverGateInstalled
      };
    });

    expect(result.gateInstalled).toBe(true);
    expect(result.counts.topical).toBeGreaterThan(0);
    expect(result.counts.ordinary).toBeGreaterThan(0);
    expect(result.reasons).toEqual({topical:'',ordinary:''});
  });
});
