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
  metadataReview: read('question-bank-metadata-review.js'),
  performance: read('v52b1-question-bank-performance.js'),
});

function shell(){
  return `<!doctype html><html><body>
    <section id="teacher" class="active">
      <button class="tab active" data-panel="questions-panel">Questions</button>
      <section id="questions-panel" class="panel active">
        <div class="filtergrid">
          <input id="question-search">
          <select id="question-year"><option value="all">All</option><option value="6">6</option></select>
          <select id="question-strand"><option value="all">All</option><option value="number">number</option></select>
          <input id="question-exam-year"><input id="question-paper">
          <select id="question-status"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        <div id="question-bank-count"></div>
        <section id="v51b2a-bulk-status" class="info">
          <button id="v51b2a-activate" type="button">Activate</button>
          <button id="v51b2a-deactivate" type="button">Deactivate</button>
          <button id="v51b2a-select-visible" type="button">Select visible</button>
          <button id="v51b2a-clear-selection" type="button">Clear</button>
          <div id="v51b2a-summary">0 selected</div>
        </section>
        <div id="questions-cards"></div>
      </section>
    </section>
  </body></html>`;
}

async function installGlobals(page){
  await page.evaluate(()=>{
    window.teacherQuestions=[
      {id:'q1',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Question 1',marks:1,answer:'1',response_type:'text',exam_year:null,paper:'',question_number:'1',
       source_type:'practice',source:'Bank',active:false,review_status:'needs_review',review_note:'Check wording'},
      {id:'q2',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Question 2',marks:1,answer:'2',response_type:'text',exam_year:null,paper:'',question_number:'2',
       source_type:'practice',source:'Bank',active:false,review_status:'reviewed',review_note:'Checked'},
      {id:'q3',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Question 3',marks:1,answer:'3',response_type:'text',exam_year:null,paper:'',question_number:'3',
       source_type:'practice',source:'Bank',active:true,review_status:'none',review_note:''}
    ];
    window.renderQuestions=function(){
      const root=document.getElementById('questions-cards');
      root.innerHTML=window.teacherQuestions.map(q=>`
        <article class="qcard" data-v51b2a-id="${q.id}">
          <label class="v51b2a-select-wrap"><input class="v51b2a-select" type="checkbox" data-id="${q.id}"></label>
          <button class="toggle-q" data-id="${q.id}" data-active="${q.active!==false?'true':'false'}">Toggle</button>
          <button class="edit-q" data-id="${q.id}">Edit</button>
        </article>`).join('');
      return {count:window.teacherQuestions.length};
    };
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.cloud={from(){return {update(){return {in:async()=>({error:null})}}};}};
    window.loadTeacher=async()=>true;
    window.alert=()=>{};
    window.confirm=()=>true;
  });
}

test.describe('Phase 7C-F4 — retire Review suppressed cards observer',()=>{
  test('owner source removes only the Review cards observer and preserves the native B2A-summary observer',async()=>{
    const count=(sources.metadataReview.match(/MutationObserver/g)||[]).length;
    expect(count).toBe(1);
    expect(sources.metadataReview).not.toContain("const cards = document.getElementById('questions-cards')");
    expect(sources.metadataReview).not.toContain('observer.observe(cards,{childList:true})');
    expect(sources.metadataReview).toContain('__v51QuestionReviewRenderWrapped');
    expect(sources.metadataReview).toContain('window.requestAnimationFrame(renderAll)');
    expect(sources.metadataReview).toContain("if (b2aSummary && typeof MutationObserver !== 'undefined')");
    expect(sources.metadataReview).toContain('observe(b2aSummary,{childList:true,characterData:true,subtree:true})');
    expect(sources.metadataReview).toContain("Object.defineProperty(window,'V51QuestionReviewWorkflow'");
    expect(sources.performance).toContain("if (name === 'renderAll') return 'review'");

    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{cwd:ROOT,encoding:'utf8'}).trim();
    expect(gateBlob).toBe('82a87ffed9091b76c9008a3949c3bd432c2d06ce');
  });

  test('normal Question Bank render restores review badges through the production scheduler with no cards observer attempt',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.metadataReview});
    await page.addScriptTag({content:sources.performance});

    await page.evaluate(()=>window.renderQuestions());
    await expect.poll(()=>page.locator('#questions-cards .v51b2c-review-badge').count()).toBe(2);

    const state=await page.evaluate(()=>({
      wrapped:!!window.__v51QuestionReviewRenderWrapped,
      performance:!!window.__v52b1QuestionBankPerformanceInstalled,
      cardsMarker:document.getElementById('questions-cards')?.dataset?.v52b1ObserverGated || '',
      summaryMarker:document.getElementById('v51b2a-summary')?.dataset?.v52b1ObserverGated || '',
      stats:window.V51QuestionReviewWorkflow.reviewStats(window.teacherQuestions)
    }));
    expect(state.wrapped).toBe(true);
    expect(state.performance).toBe(true);
    expect(state.cardsMarker).toBe('');
    expect(state.summaryMarker).toBe('');
    expect(state.stats).toEqual({needsReview:1,reviewed:1,none:1,total:3});

    await page.evaluate(()=>{
      document.querySelectorAll('#questions-cards .v51b2c-review-badge').forEach(node=>node.remove());
      window.renderQuestions();
    });
    await expect.poll(()=>page.locator('#questions-cards .v51b2c-review-badge').count()).toBe(2);
  });

  test('public renderAll and selection-change trigger still repair owned review state',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.metadataReview});
    await page.evaluate(()=>window.renderQuestions());
    await page.waitForTimeout(60);

    await page.evaluate(()=>{
      document.querySelectorAll('#questions-cards .v51b2c-review-badge').forEach(node=>node.remove());
      const stats=document.getElementById('v51b2c-stats');
      if(stats) stats.textContent='stale';
      window.V51QuestionReviewWorkflow.renderAll();
    });
    await expect(page.locator('#questions-cards .v51b2c-review-badge')).toHaveCount(2);
    await expect(page.locator('#v51b2c-stats')).not.toHaveText('stale');

    await page.evaluate(()=>{
      document.querySelectorAll('#questions-cards .v51b2c-review-badge').forEach(node=>node.remove());
    });
    await page.locator('#questions-cards .v51b2a-select').first().check();
    await expect.poll(()=>page.locator('#questions-cards .v51b2c-review-badge').count()).toBe(2);
    await expect(page.locator('#v51b2c-summary')).toContainText('1 selected');
  });

  test('native B2A-summary observer remains live while synthetic questions-cards suppression stays active',async({page})=>{
    await page.setContent(shell()+'<div id="unrelated"></div>');
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.metadataReview});

    await page.evaluate(()=>{
      window.renderQuestions();
      const box=document.querySelector('#questions-cards .v51b2a-select');
      if(box) box.checked=true;
      document.getElementById('v51b2a-summary').textContent='1 selected';
    });
    await expect.poll(()=>page.locator('#v51b2b-summary').textContent()).toContain('1 selected');

    const result=await page.evaluate(async()=>{
      const counts={cards:0,summary:0,unrelated:0};
      const cards=document.getElementById('questions-cards');
      const summary=document.getElementById('v51b2a-summary');
      const unrelated=document.getElementById('unrelated');
      new MutationObserver(()=>counts.cards++).observe(cards,{childList:true});
      new MutationObserver(()=>counts.summary++).observe(summary,{childList:true,characterData:true,subtree:true});
      new MutationObserver(()=>counts.unrelated++).observe(unrelated,{childList:true});
      cards.appendChild(document.createElement('span'));
      summary.textContent='0 selected';
      unrelated.appendChild(document.createElement('span'));
      await new Promise(r=>setTimeout(r,70));
      return {
        counts,
        markers:{
          cards:cards.dataset.v52b1ObserverGated || '',
          summary:summary.dataset.v52b1ObserverGated || '',
          unrelated:unrelated.dataset.v52b1ObserverGated || ''
        },
        reasons:{
          cards:window.V52B1QuestionBankObserverGate.suppressionReason(cards,()=>{}),
          summary:window.V52B1QuestionBankObserverGate.suppressionReason(summary,()=>{}),
          unrelated:window.V52B1QuestionBankObserverGate.suppressionReason(unrelated,()=>{})
        }
      };
    });
    expect(result.counts.cards).toBe(0);
    expect(result.counts.summary).toBeGreaterThan(0);
    expect(result.counts.unrelated).toBeGreaterThan(0);
    expect(result.markers).toEqual({cards:'1',summary:'',unrelated:''});
    expect(result.reasons).toEqual({cards:'question-card-observer',summary:'',unrelated:''});
  });
});
