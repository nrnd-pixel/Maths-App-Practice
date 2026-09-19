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
  performance: read('v52b1-question-bank-performance.js'),
});

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
      question_number:String(i+1),
      source_type:'practice',
      source:'Bank',
      active:true,
      review_status:'none',
      review_note:'',
      parent_question_number:'',
      part_label:'',
      part_order:null,
      group_prompt:'',
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
    window.cloud={
      rpc:async()=>({data:{},error:null}),
      from(){return {update(){return {in:async()=>({error:null})}}};}
    };
    window.loadTeacher=async()=>true;
    window.alert=()=>{};
    window.confirm=()=>true;
  },count);
}

test.describe('Phase 7C-F1 — retire Selection/QA suppressed observers',()=>{
  test('owner source removes both dead card observers while preserving wrapper and public refresh contracts',async()=>{
    expect(sources.selection).not.toContain('MutationObserver');
    expect(sources.selection).not.toContain('observer.observe(cards,{childList:true})');
    expect(sources.selection).toContain('__v51QuestionBankQaRenderWrapped');
    expect(sources.selection).toContain('window.requestAnimationFrame(()=>render())');
    expect(sources.selection).toContain('__v51QuestionBankBulkStatusRenderWrapped');
    expect(sources.selection).toContain('window.requestAnimationFrame(renderSummary)');
    expect(sources.selection).toContain('summaryStats,render');
    expect(sources.selection).toContain('clearSelection,');
    expect(sources.selection).toContain('renderSummary');
    expect(sources.performance).toContain("name === 'renderSummary'");
    expect(sources.performance).toContain('captureLegacyRefreshes');

    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{
      cwd:ROOT,encoding:'utf8'
    }).trim();
    expect(gateBlob).toBe('82a87ffed9091b76c9008a3949c3bd432c2d06ce');
  });

  test('QA and Bulk Status still refresh through their existing wrapper/event paths with no owner observer attempt',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,4);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.selection});
    await page.addScriptTag({content:sources.performance});

    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(280);

    const state=await page.evaluate(()=>({
      qaWrapped:!!window.__v51QuestionBankQaRenderWrapped,
      bulkWrapped:!!window.__v51QuestionBankBulkStatusRenderWrapped,
      performance:!!window.__v52b1QuestionBankPerformanceInstalled,
      qaSummary:document.getElementById('v51b1-qa-summary')?.textContent || '',
      bulkPanel:!!document.getElementById('v51b2a-bulk-status'),
      checkboxes:document.querySelectorAll('#questions-cards .v51b2a-select').length,
      gatedMarker:document.getElementById('questions-cards')?.dataset?.v52b1ObserverGated || ''
    }));

    expect(state.qaWrapped).toBe(true);
    expect(state.bulkWrapped).toBe(true);
    expect(state.performance).toBe(true);
    expect(state.qaSummary.length).toBeGreaterThan(0);
    expect(state.bulkPanel).toBe(true);
    expect(state.checkboxes).toBe(4);
    expect(state.gatedMarker).toBe('');

    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.evaluate(()=>
      window.V51QuestionBankBulkStatus.buildPlan(window.teacherQuestions,undefined,false).selected.length
    )).toBe(1);
  });

  test('V52B1 card suppression remains available for remaining owners and unrelated observers remain native',async({page})=>{
    await page.setContent(shell()+'<div id="unrelated"></div>');
    await page.addScriptTag({content:sources.gate});

    const result=await page.evaluate(async()=>{
      const counts={cards:0,unrelated:0};
      const cards=document.getElementById('questions-cards');
      const unrelated=document.getElementById('unrelated');

      new MutationObserver(()=>{counts.cards+=1;}).observe(cards,{childList:true});
      new MutationObserver(()=>{counts.unrelated+=1;}).observe(unrelated,{childList:true});

      cards.appendChild(document.createElement('span'));
      unrelated.appendChild(document.createElement('span'));
      await new Promise(resolve=>setTimeout(resolve,60));

      return {
        counts,
        marker:cards.dataset.v52b1ObserverGated || '',
        reasons:{
          cards:window.V52B1QuestionBankObserverGate.suppressionReason(cards,()=>{}),
          unrelated:window.V52B1QuestionBankObserverGate.suppressionReason(unrelated,()=>{})
        }
      };
    });

    expect(result.counts.cards).toBe(0);
    expect(result.counts.unrelated).toBeGreaterThan(0);
    expect(result.marker).toBe('1');
    expect(result.reasons).toEqual({cards:'question-card-observer',unrelated:''});
  });
});
