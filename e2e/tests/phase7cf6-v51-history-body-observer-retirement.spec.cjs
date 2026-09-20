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
  owner: read('question-bank-audit-multipart.js'),
  performance: read('v52b1-question-bank-performance.js'),
});

function shell(){
  return `<!doctype html><html><head><style>.hidden{display:none!important}</style></head><body>
    <section id="teacher" class="active">
      <button class="tab active" data-panel="questions-panel">Questions</button>
      <section id="questions-panel" class="panel active">
        <input id="question-search">
        <select id="question-year"><option value="all">All</option><option value="6">6</option></select>
        <select id="question-strand"><option value="all">All</option><option value="number">number</option></select>
        <input id="question-exam-year"><input id="question-paper">
        <select id="question-status"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <div id="question-bank-count"></div>
        <div id="questions-cards"></div>
      </section>
    </section>
  </body></html>`;
}

async function installGlobals(page,count=4){
  await page.evaluate(count=>{
    window.teacherQuestions=Array.from({length:count},(_,i)=>({
      id:`q${i+1}`,year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',
      difficulty:'standard',question_text:`Question ${i+1}`,marks:1,answer:String(i+1),response_type:'text',
      exam_year:2020,paper:'Paper 2',question_number:String(i+1),source_type:'practice',source:'Bank',
      active:true,review_status:'none',review_note:'',parent_question_number:'',part_label:'',part_order:null,
      group_prompt:'',image_url:'',practice_eligible:true
    }));
    window.renderQuestions=function(){
      const root=document.getElementById('questions-cards');
      root.innerHTML=window.teacherQuestions.map(q=>`
        <article class="qcard" data-v51b2a-id="${q.id}">
          <div class="qcard-head"></div>
          <input class="v51b2a-select" type="checkbox" data-id="${q.id}">
          <button class="edit-q" data-id="${q.id}">Edit</button>
        </article>`).join('');
      return {count:window.teacherQuestions.length};
    };
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.__rpcCalls=[];
    window.cloud={
      rpc:async(name,args)=>{window.__rpcCalls.push({name,args});return {data:{history:[]},error:null};},
      from(){return {update(){return {in:async()=>({error:null})}}};}
    };
    window.loadTeacher=async()=>true;
    window.alert=()=>{};
    window.confirm=()=>true;
    window.prompt=(_m,v)=>v;
  },count);
}

async function installStack(page){
  await page.addScriptTag({content:sources.gate});
  await page.addScriptTag({content:sources.selection});
  await page.addScriptTag({content:sources.owner});
  await page.addScriptTag({content:sources.performance});
}

test.describe('Phase 7C-F6 — retire final Correction History body observer',()=>{
  test('owner source has zero MutationObserver registrations and preserves explicit lifecycle contracts',async()=>{
    expect((sources.owner.match(/new MutationObserver/g)||[]).length).toBe(0);
    expect(sources.owner).not.toContain('function installObserver()');
    expect(sources.owner).not.toContain('v51b2dObserver');
    expect(sources.owner).not.toContain('observer.observe(document.body');
    expect(sources.owner).toContain('function refreshLifecycle()');
    expect(sources.owner).toContain('bind();\n    return renderSelectionState();');
    expect(sources.owner).toContain('bind();\n    renderSelectionState();');
    expect(sources.owner).toContain('renderHistory, refreshLifecycle');
    expect(sources.performance).toContain('V51QuestionChangeHistory?.refreshLifecycle?.()');

    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{cwd:ROOT,encoding:'utf8'}).trim();
    expect(gateBlob).toBe('82a87ffed9091b76c9008a3949c3bd432c2d06ce');
  });

  test('normal scheduler recreates a removed history panel and rebinds Load history exactly once with no owner body marker',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await installStack(page);

    await page.evaluate(()=>window.renderQuestions());
    await expect.poll(()=>page.locator('#v51b2d-question-history').count()).toBe(1);
    await expect(page.locator('#v51b2d-load')).toHaveAttribute('data-bound','1');

    let state=await page.evaluate(()=>({
      bodyMarker:document.body?.dataset?.v52b1ObserverGated||'',
      panels:document.querySelectorAll('#v51b2d-question-history').length,
      buttons:document.querySelectorAll('#v51b2d-load').length
    }));
    expect(state).toEqual({bodyMarker:'',panels:1,buttons:1});

    await page.locator('#v51b2d-question-history').evaluate(node=>node.remove());
    await page.evaluate(()=>{window.renderQuestions();window.renderQuestions();window.renderQuestions();});
    await expect.poll(()=>page.locator('#v51b2d-question-history').count()).toBe(1);
    await expect(page.locator('#v51b2d-load')).toHaveCount(1);
    await expect(page.locator('#v51b2d-load')).toHaveAttribute('data-bound','1');
    await expect.poll(()=>page.evaluate(()=>document.body?.dataset?.v52b1ObserverGated||'')).toBe('');
  });

  test('selection changes and explicit refreshLifecycle repair history state without DOM observation or RPC side effects',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.owner});
    await page.evaluate(()=>window.renderQuestions());

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.locator('#v51b2d-selection').textContent()).toContain('Selected:');

    await page.evaluate(()=>{
      window.__rpcCalls.length=0;
      for(const box of document.querySelectorAll('#questions-cards .v51b2a-select')) box.checked=true;
      window.V51QuestionChangeHistory.refreshLifecycle();
      window.V51QuestionChangeHistory.refreshLifecycle();
    });
    await expect(page.locator('#v51b2d-selection')).toHaveText('4 selected · choose exactly one question for audit history.');
    expect(await page.evaluate(()=>window.__rpcCalls.length)).toBe(0);

    await page.evaluate(()=>{
      for(const box of document.querySelectorAll('#questions-cards .v51b2a-select')) box.checked=false;
      window.V51QuestionChangeHistory.refreshLifecycle();
    });
    await expect(page.locator('#v51b2d-selection')).toHaveText('Select one question to view its history.');
  });

  test('real owner registers no observer while synthetic B2D-shaped body suppression remains active and unrelated body observers remain native',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.owner});

    expect(await page.evaluate(()=>document.body?.dataset?.v52b1ObserverGated||'')).toBe('');

    const result=await page.evaluate(async()=>{
      const counts={history:0,unrelated:0};
      const bind=()=>{};
      const renderSelectionState=()=>{};
      function historyCallback(){bind();renderSelectionState();counts.history+=1;}
      function unrelatedCallback(){counts.unrelated+=1;}

      new MutationObserver(historyCallback).observe(document.body,{childList:true,subtree:true});
      new MutationObserver(unrelatedCallback).observe(document.body,{attributes:true,attributeFilter:['data-f6-native']});

      document.body.appendChild(document.createElement('aside'));
      document.body.dataset.f6Native='1';
      await new Promise(r=>setTimeout(r,70));

      return {
        counts,
        marker:document.body.dataset.v52b1ObserverGated||'',
        reasons:{
          history:window.V52B1QuestionBankObserverGate.suppressionReason(document.body,historyCallback),
          unrelated:window.V52B1QuestionBankObserverGate.suppressionReason(document.body,unrelatedCallback)
        }
      };
    });

    expect(result.counts.history).toBe(0);
    expect(result.counts.unrelated).toBeGreaterThan(0);
    expect(result.marker).toBe('1');
    expect(result.reasons).toEqual({history:'question-history-body-observer',unrelated:''});
  });
});
