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
  topicalLibrary: read('v52-teacher-topical-library.js'),
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
        <div id="questions-cards"></div>
      </section>
    </section>
  </body></html>`;
}

async function installGlobals(page){
  await page.evaluate(()=>{
    window.teacherQuestions=[
      {id:'a1',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Set A 1',marks:1,answer:'1',response_type:'text',exam_year:null,paper:'',question_number:'1',
       source_type:'topical_exercise',source:'Set A',active:false,review_status:'none',review_note:'',parent_question_number:'',
       part_label:'',part_order:null,group_prompt:'',image_url:'',practice_eligible:false},
      {id:'a2',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Set A 2',marks:1,answer:'2',response_type:'text',exam_year:null,paper:'',question_number:'2',
       source_type:'topical_exercise',source:'Set A',active:false,review_status:'none',review_note:'',parent_question_number:'',
       part_label:'',part_order:null,group_prompt:'',image_url:'',practice_eligible:false},
      {id:'b1',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Set B 1',marks:1,answer:'3',response_type:'text',exam_year:null,paper:'',question_number:'3',
       source_type:'topical_exercise',source:'Set B',active:false,review_status:'none',review_note:'',parent_question_number:'',
       part_label:'',part_order:null,group_prompt:'',image_url:'',practice_eligible:false}
    ];
    window.renderQuestions=function(){
      const root=document.getElementById('questions-cards');
      root.innerHTML=window.teacherQuestions.map(q=>`
        <article class="qcard" data-v51b2a-id="${q.id}">
          <button class="edit-q" data-id="${q.id}">Edit</button>
          <input class="v51b2a-select" type="checkbox" data-id="${q.id}">
        </article>`).join('');
      return {count:window.teacherQuestions.length};
    };
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.cloud={from(){return {update(){return {in:async()=>({error:null})}}};}};
    window.loadTeacher=async()=>true;
    window.alert=()=>{};
    window.confirm=()=>true;
    window.prompt=()=>null;
  });
}

test.describe('Phase 7C-F3 — retire Topical Library suppressed observer',()=>{
  test('owner source removes the dead card observer while preserving wrapper/public refresh contracts',async()=>{
    expect(sources.topicalLibrary).not.toContain('MutationObserver');
    expect(sources.topicalLibrary).not.toContain("const cards=document.getElementById('questions-cards')");
    expect(sources.topicalLibrary).toContain('__v52bTopicalLibraryRenderWrapped');
    expect(sources.topicalLibrary).toContain('ROOT.requestAnimationFrame?.(()=>{render();applyFocusedCards();})');
    expect(sources.topicalLibrary).toContain("Object.defineProperty(window,'V52TeacherTopicalLibrary'");
    expect(sources.performance).toContain("source.includes('buildSetSummaries')");
    expect(sources.performance).toContain("return 'topical-library'");

    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{cwd:ROOT,encoding:'utf8'}).trim();
    expect(gateBlob).toBe('d0c4745afdd78fc326b39748eca559e9d530503a');
  });

  test('normal Question Bank render refreshes Topical Library through the production scheduler with no owner observer attempt',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.topicalLibrary});
    await page.addScriptTag({content:sources.performance});

    await page.evaluate(()=>window.renderQuestions());
    await expect.poll(()=>page.locator('#v52b-cards .v52b-set-card').count()).toBe(2);

    const state=await page.evaluate(()=>({
      wrapped:!!window.__v52bTopicalLibraryRenderWrapped,
      performance:!!window.__v52b1QuestionBankPerformanceInstalled,
      marker:document.getElementById('questions-cards')?.dataset?.v52b1ObserverGated || '',
      sets:window.V52TeacherTopicalLibrary.buildSetSummaries().length
    }));
    expect(state).toEqual({wrapped:true,performance:true,marker:'',sets:2});

    await page.evaluate(()=>{
      document.getElementById('v52b-cards').innerHTML='<div id="stale">stale</div>';
      window.renderQuestions();
    });
    await expect.poll(()=>page.locator('#v52b-cards .v52b-set-card').count()).toBe(2);
    await expect(page.locator('#stale')).toHaveCount(0);
  });

  test('public render still restores focused-set presentation',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.topicalLibrary});

    await page.evaluate(()=>window.renderQuestions());
    const key=await page.evaluate(()=>window.V52TeacherTopicalLibrary.buildSetSummaries()[0].key);
    await page.evaluate(key=>window.V52TeacherTopicalLibrary.viewSet(key),key);
    await page.waitForTimeout(80);

    const before=await page.evaluate(()=>({
      focus:document.getElementById('v52b-focus')?.textContent?.replace(/\s+/g,' ').trim() || '',
      visible:[...document.querySelectorAll('#questions-cards .qcard')].filter(x=>!x.classList.contains('hidden')).length
    }));
    expect(before.focus).toContain('Set A');
    expect(before.visible).toBe(2);

    await page.evaluate(()=>{
      document.querySelectorAll('#questions-cards .qcard').forEach(x=>x.classList.remove('hidden'));
      const focus=document.getElementById('v52b-focus'); focus.classList.add('hidden'); focus.innerHTML='';
      window.V52TeacherTopicalLibrary.render();
    });
    await page.waitForTimeout(80);

    const after=await page.evaluate(()=>({
      focus:document.getElementById('v52b-focus')?.textContent?.replace(/\s+/g,' ').trim() || '',
      visible:[...document.querySelectorAll('#questions-cards .qcard')].filter(x=>!x.classList.contains('hidden')).length
    }));
    expect(after).toEqual(before);
  });

  test('retired shim keeps historical card classification while all synthetic card observers stay native',async({page})=>{
    await page.setContent(shell()+'<div id="v52b-cards"></div><div id="unrelated"></div>');
    await page.addScriptTag({content:sources.gate});
    const result=await page.evaluate(async()=>{
      const counts={cards:0,topicalCards:0,unrelated:0};
      const cards=document.getElementById('questions-cards');
      const topicalCards=document.getElementById('v52b-cards');
      const unrelated=document.getElementById('unrelated');
      new MutationObserver(()=>counts.cards++).observe(cards,{childList:true});
      new MutationObserver(()=>counts.topicalCards++).observe(topicalCards,{childList:true});
      new MutationObserver(()=>counts.unrelated++).observe(unrelated,{childList:true});
      cards.appendChild(document.createElement('span'));
      topicalCards.appendChild(document.createElement('span'));
      unrelated.appendChild(document.createElement('span'));
      await new Promise(r=>setTimeout(r,60));
      return {
        counts,
        marker:cards.dataset.v52b1ObserverGated || '',
        reasons:{
          cards:window.V52B1QuestionBankObserverGate.suppressionReason(cards,()=>{}),
          topicalCards:window.V52B1QuestionBankObserverGate.suppressionReason(topicalCards,()=>{}),
          unrelated:window.V52B1QuestionBankObserverGate.suppressionReason(unrelated,()=>{})
        }
      };
    });
    expect(result.counts.cards).toBeGreaterThan(0);
    expect(result.counts.topicalCards).toBeGreaterThan(0);
    expect(result.counts.unrelated).toBeGreaterThan(0);
    expect(result.marker).toBe('');
    expect(result.reasons).toEqual({cards:'question-card-observer',topicalCards:'',unrelated:''});
  });
});
