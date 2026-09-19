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
  performance: read('v52b1-question-bank-performance.js'),
});
const performanceApi = require(path.join(SITE, 'v52b1-question-bank-performance.js'));
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
      exam_year:null,
      paper:'',
      question_number:i<2?`1(${i===0?'a':'b'})`:String(i+1),
      source_type:'practice',
      source:'Bank',
      active:true,
      review_status:'none',
      review_note:'',
      parent_question_number:i<2?'1':'',
      part_label:i<2?(i===0?'a':'b'):'',
      part_order:i<2?i+1:null,
      group_prompt:i<2?'Shared prompt':'',
      image_url:'',
      practice_eligible:true
    }));

    window.renderQuestions=function baseRenderQuestions(){
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
      from(){ return {update(){return {in:async()=>({error:null})}}}; }
    };
    window.alert=()=>{};
    window.confirm=()=>true;
    window.prompt=(_message,value)=>value;
  },count);
}

async function installStack(page){
  await add(page,'gate');
  await add(page,'selection');
  await add(page,'auditMultipart');
  await add(page,'performance');
}

test.describe('Phase 7C-E — Correction History performance-scheduler integration',()=>{
  test('history stays an explicit post-render owner call outside legacy classification and adds no authority',async()=>{
    function refreshLifecycle(){}
    expect(performanceApi.refreshCallbackKind(refreshLifecycle)).toBe('');
    expect(sources.performance).toContain('V51QuestionChangeHistory?.refreshLifecycle?.()');
    expect(sources.performance).toContain('V51MultipartQuestionManagement?.renderGroup?.()');
    expect(sources.performance).toContain('V52TopicalActivationGuard?.decorate?.()');
    expect(sources.performance).not.toContain('MutationObserver');
    expect(sources.performance).not.toMatch(/cloud\.rpc\s*\(/);
    expect(sources.performance).not.toMatch(/cloud\.from\s*\(/);
    expect(sources.performance).not.toContain('localStorage.setItem');
    expect(sources.performance).not.toContain('sessionStorage.setItem');
  });

  test('normal scheduler repairs live Clear and Select all after the historical fallback stays briefly stale',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4);
    await installStack(page);

    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(280);

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(1);
    await expect.poll(()=>page.locator('#v51b2d-selection').textContent()).toContain('Selected:');
    await page.waitForTimeout(220);
    const manualText=await page.locator('#v51b2d-selection').textContent();

    await page.locator('#v51b2a-clear-selection').click();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(0);
    await page.waitForTimeout(25);
    expect(await page.locator('#v51b2d-selection').textContent()).toBe(manualText);
    await expect.poll(()=>page.locator('#v51b2d-selection').textContent(),{timeout:1500})
      .toBe('Select one question to view its history.');

    await page.locator('#v51b2a-select-visible').click();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(4);
    await page.waitForTimeout(25);
    await expect(page.locator('#v51b2d-selection')).toHaveText('Select one question to view its history.');
    await expect.poll(()=>page.locator('#v51b2d-selection').textContent(),{timeout:1500})
      .toBe('4 selected · choose exactly one question for audit history.');

    expect(sources.auditMultipart).toContain("#v51b2a-select-all,#v51b2a-clear");
    expect(sources.auditMultipart).not.toContain("#v51b2a-select-visible,#v51b2a-clear-selection");
  });

  test('normal Question Bank render recreates a removed history panel and repeated renders do not duplicate Load history RPC binding',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4);
    await installStack(page);

    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(280);
    await page.locator('#v51b2d-question-history').evaluate(node=>node.remove());
    await expect(page.locator('#v51b2d-question-history')).toHaveCount(0);

    await page.evaluate(()=>{
      window.renderQuestions();
      window.renderQuestions();
      window.renderQuestions();
    });

    await expect.poll(()=>page.locator('#v51b2d-question-history').count(),{timeout:1500}).toBe(1);
    await expect(page.locator('#v51b2d-load')).toHaveCount(1);
    await expect(page.locator('#v51b2d-load')).toHaveAttribute('data-bound','1');

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.locator('#v51b2d-load').isEnabled()).toBe(true);
    await page.waitForTimeout(220);

    await page.evaluate(()=>{window.__rpcCalls.length=0;});
    await page.locator('#v51b2d-load').click();
    await expect.poll(()=>page.evaluate(()=>window.__rpcCalls.length)).toBe(1);
    const calls=await page.evaluate(()=>window.__rpcCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('get_question_change_history_v51b2d');
  });

  test('scheduled history lifecycle obeys the existing generation/panel-active safety boundary',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4);
    await installStack(page);

    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(280);
    await page.locator('#v51b2d-question-history').evaluate(node=>node.remove());

    await page.evaluate(()=>{
      window.renderQuestions();
      document.getElementById('questions-panel').classList.remove('active');
    });
    await page.waitForTimeout(320);
    await expect(page.locator('#v51b2d-question-history')).toHaveCount(0);

    await page.evaluate(()=>{
      document.getElementById('questions-panel').classList.add('active');
      window.renderQuestions();
    });
    await expect.poll(()=>page.locator('#v51b2d-question-history').count(),{timeout:1500}).toBe(1);
  });

  test('V52B1 gate remains byte-identical and native negative-control observers remain live',async({page})=>{
    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{
      cwd:ROOT,encoding:'utf8'
    }).trim();
    expect(gateBlob).toBe('82a87ffed9091b76c9008a3949c3bd432c2d06ce');

    await page.setContent(shell()+'<div id="v52b-cards"></div><div id="ordinary"></div>');
    await add(page,'gate');

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
