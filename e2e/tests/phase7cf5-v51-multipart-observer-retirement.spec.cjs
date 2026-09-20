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
  owner: read('question-bank-audit-multipart.js'),
  performance: read('v52b1-question-bank-performance.js'),
});

function shell(){
  return `<!doctype html><html><body>
    <section id="teacher" class="active">
      <button class="tab active" data-panel="questions-panel">Questions</button>
      <section id="questions-panel" class="panel active">
        <input id="question-search">
        <select id="question-year"><option value="all">All</option><option value="6">6</option></select>
        <select id="question-strand"><option value="all">All</option><option value="number">number</option></select>
        <input id="question-exam-year"><input id="question-paper">
        <select id="question-status"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <div id="question-bank-count"></div>
        <section id="v51b2a-bulk-status" class="info"></section>
        <div id="questions-cards"></div>
      </section>
    </section>
  </body></html>`;
}

async function installGlobals(page){
  await page.evaluate(()=>{
    window.teacherQuestions=[
      {id:'a',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Part a',marks:1,answer:'1',response_type:'text',exam_year:2020,paper:'Paper 2',question_number:'1(a)',
       source_type:'practice',source:'Bank',active:true,review_status:'none',review_note:'',parent_question_number:'1',
       part_label:'a',part_order:1,group_prompt:'Shared prompt',image_url:'',practice_eligible:true},
      {id:'b',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Part b',marks:1,answer:'2',response_type:'text',exam_year:2020,paper:'Paper 2',question_number:'1(b)',
       source_type:'practice',source:'Bank',active:true,review_status:'none',review_note:'',parent_question_number:'1',
       part_label:'b',part_order:2,group_prompt:'Shared prompt',image_url:'',practice_eligible:true},
      {id:'c',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Single',marks:1,answer:'3',response_type:'text',exam_year:2020,paper:'Paper 2',question_number:'2',
       source_type:'practice',source:'Bank',active:true,review_status:'none',review_note:'',parent_question_number:'',
       part_label:'',part_order:null,group_prompt:'',image_url:'',practice_eligible:true}
    ];
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
    window.cloud={
      rpc:async()=>({data:{},error:null}),
      from(){return {update(){return {in:async()=>({error:null})}}};}
    };
    window.loadTeacher=async()=>true;
    window.alert=()=>{};
    window.confirm=()=>true;
    window.prompt=(_m,v)=>v;
  });
}

test.describe('Phase 7C-F5 — retire Multipart suppressed cards observer',()=>{
  test('owner removes only the Multipart cards observer and preserves Correction History body observer',async()=>{
    const registrations=(sources.owner.match(/new MutationObserver/g)||[]).length;
    expect(registrations).toBe(1);
    expect(sources.owner).toContain('observer.observe(document.body,{childList:true,subtree:true})');
    expect(sources.owner).toContain('function refreshLifecycle()');
    expect(sources.owner).not.toContain("const cards=document.getElementById('questions-cards')");
    expect(sources.owner).not.toContain('new MutationObserver(()=>window.requestAnimationFrame(renderGroup))');
    expect(sources.owner).toContain("if (event.target?.classList?.contains('v51b2a-select')) { promptDirty=false; clearFeedback(); window.requestAnimationFrame(renderGroup); }");
    expect(sources.owner).toContain('window.V51MultipartQuestionManagement=api');
    expect(sources.performance).toContain('V51MultipartQuestionManagement?.renderGroup?.()');

    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{cwd:ROOT,encoding:'utf8'}).trim();
    expect(gateBlob).toBe('82a87ffed9091b76c9008a3949c3bd432c2d06ce');
  });

  test('normal Question Bank render restores multipart badges through the production scheduler with no cards observer attempt',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.owner});
    await page.addScriptTag({content:sources.performance});

    await page.evaluate(()=>window.renderQuestions());
    await expect.poll(()=>page.locator('#questions-cards .v51b2e-multipart-badge').count()).toBe(2);

    const state=await page.evaluate(()=>({
      performance:!!window.__v52b1QuestionBankPerformanceInstalled,
      cardsMarker:document.getElementById('questions-cards')?.dataset?.v52b1ObserverGated || '',
      bodyMarker:document.body?.dataset?.v52b1ObserverGated || '',
      groups:window.V51MultipartQuestionManagement.buildMultipartGroups(window.teacherQuestions).length
    }));
    expect(state).toEqual({performance:true,cardsMarker:'',bodyMarker:'1',groups:1});

    await page.evaluate(()=>{
      document.querySelectorAll('#questions-cards .v51b2e-multipart-badge').forEach(node=>node.remove());
      window.renderQuestions();
    });
    await expect.poll(()=>page.locator('#questions-cards .v51b2e-multipart-badge').count()).toBe(2);
  });

  test('selection-change and public renderGroup still repair Multipart-owned state',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.owner});
    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(60);

    await page.evaluate(()=>{
      document.querySelectorAll('#questions-cards .v51b2e-multipart-badge').forEach(node=>node.remove());
    });
    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.locator('#questions-cards .v51b2e-multipart-badge').count()).toBe(2);
    await expect(page.locator('#v51b2e-selection')).toContainText('Q1');

    await page.evaluate(()=>{
      document.querySelectorAll('#questions-cards .v51b2e-multipart-badge').forEach(node=>node.remove());
      window.V51MultipartQuestionManagement.renderGroup();
    });
    await expect(page.locator('#questions-cards .v51b2e-multipart-badge')).toHaveCount(2);
  });

  test('real owner leaves cards ungated while body suppression remains and synthetic cards suppression is still available',async({page})=>{
    await page.setContent(shell()+'<div id="v52b-cards"></div><div id="ordinary"></div>');
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.owner});

    const ownerState=await page.evaluate(()=>({
      cards:document.getElementById('questions-cards')?.dataset?.v52b1ObserverGated || '',
      body:document.body?.dataset?.v52b1ObserverGated || ''
    }));
    expect(ownerState).toEqual({cards:'',body:'1'});

    const result=await page.evaluate(async()=>{
      const counts={cards:0,topical:0,ordinary:0};
      const cards=document.getElementById('questions-cards');
      const topical=document.getElementById('v52b-cards');
      const ordinary=document.getElementById('ordinary');
      new MutationObserver(()=>counts.cards++).observe(cards,{childList:true});
      new MutationObserver(()=>counts.topical++).observe(topical,{childList:true});
      new MutationObserver(()=>counts.ordinary++).observe(ordinary,{childList:true});
      cards.appendChild(document.createElement('span'));
      topical.appendChild(document.createElement('span'));
      ordinary.appendChild(document.createElement('span'));
      await new Promise(r=>setTimeout(r,70));
      return {
        counts,
        reasons:{
          cards:window.V52B1QuestionBankObserverGate.suppressionReason(cards,()=>{}),
          topical:window.V52B1QuestionBankObserverGate.suppressionReason(topical,()=>{}),
          ordinary:window.V52B1QuestionBankObserverGate.suppressionReason(ordinary,()=>{})
        }
      };
    });
    expect(result.counts.cards).toBe(0);
    expect(result.counts.topical).toBeGreaterThan(0);
    expect(result.counts.ordinary).toBeGreaterThan(0);
    expect(result.reasons).toEqual({cards:'question-card-observer',topical:'',ordinary:''});
  });
});
