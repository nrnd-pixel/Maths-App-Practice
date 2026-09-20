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
  topicalGuard: read('v52-topical-activation-guard.js'),
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
        <button id="v51b2a-activate" type="button">Activate selected</button>
        <div id="question-bank-count"></div>
        <div id="questions-cards"></div>
      </section>
    </section>
  </body></html>`;
}

async function installGlobals(page,{renderImmediately=false}={}){
  await page.evaluate(renderImmediately=>{
    window.teacherQuestions=[
      {
        id:'topical-1',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',
        difficulty:'standard',question_text:'Topical staged',marks:1,answer:'1',response_type:'text',
        exam_year:2026,paper:'Paper 1',question_number:'1',source_type:'topical_exercise',source:'Bank',
        active:false,review_status:'none',review_note:'',parent_question_number:'',part_label:'',part_order:null,
        group_prompt:'',image_url:'',practice_eligible:false
      },
      {
        id:'practice-1',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',
        difficulty:'standard',question_text:'Practice active',marks:1,answer:'2',response_type:'text',
        exam_year:2026,paper:'Paper 1',question_number:'2',source_type:'practice',source:'Bank',
        active:true,review_status:'none',review_note:'',parent_question_number:'',part_label:'',part_order:null,
        group_prompt:'',image_url:'',practice_eligible:true
      }
    ];
    window.renderQuestions=function(){
      const root=document.getElementById('questions-cards');
      if(!root)return null;
      root.innerHTML=window.teacherQuestions.map(q=>`
        <article class="qcard" data-id="${q.id}">
          <input class="v51b2a-select" type="checkbox" data-id="${q.id}">
          <button class="toggle-q" type="button" data-id="${q.id}" data-active="${q.active===false?'false':'true'}">Toggle</button>
        </article>`).join('');
      return {count:window.teacherQuestions.length};
    };
    window.__alerts=[];
    window.alert=message=>window.__alerts.push(String(message));
    if(renderImmediately) window.renderQuestions();
  },renderImmediately);
}

test.describe('Phase 7C-F2 — retire Topical Activation suppressed observer',()=>{
  test('owner source removes the dead panel observer while preserving deterministic refresh and authority contracts',async()=>{
    expect(sources.topicalGuard).not.toContain('MutationObserver');
    expect(sources.topicalGuard).not.toContain("const panel = document.getElementById('questions-panel')");
    expect(sources.topicalGuard).toContain('function scheduleDecorate()');
    expect(sources.topicalGuard).toContain('window.requestAnimationFrame(decorate)');
    expect(sources.topicalGuard).toContain("event.target?.matches?.('.v51b2a-select')");
    expect(sources.topicalGuard).toContain("document.addEventListener('click',guardClick,true)");
    expect(sources.topicalGuard).toContain("Object.defineProperty(window,'V52TopicalActivationGuard'");
    expect(sources.performance).toContain('V52TopicalActivationGuard?.decorate?.()');

    const forbiddenAuthority=/\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|grade_practice_response|submit_practice_session|finalize_exam_attempt/i;
    expect(sources.topicalGuard).not.toMatch(forbiddenAuthority);

    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{
      cwd:ROOT,encoding:'utf8'
    }).trim();
    expect(gateBlob).toBe('d0c4745afdd78fc326b39748eca559e9d530503a');
  });

  test('normal Question Bank render reaches staged topical decoration through the production scheduler with no owner observer attempt',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.topicalGuard});
    await page.addScriptTag({content:sources.performance});

    await page.evaluate(()=>window.renderQuestions());
    await expect.poll(()=>page.locator('.toggle-q[data-id="topical-1"]').textContent()).toBe('Staged — inactive');

    const state=await page.evaluate(()=>({
      installed:!!window.__v52TopicalActivationGuardInstalled,
      performance:!!window.__v52b1QuestionBankPerformanceInstalled,
      locked:document.querySelector('.toggle-q[data-id="topical-1"]')?.dataset?.v52TopicalLocked || '',
      panelMarker:document.getElementById('questions-panel')?.dataset?.v52b1ObserverGated || ''
    }));
    expect(state).toEqual({installed:true,performance:true,locked:'1',panelMarker:''});
  });

  test('selection-change and activation-blocking paths still refresh directly without an observer',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page,{renderImmediately:true});
    await page.addScriptTag({content:sources.gate});
    await page.addScriptTag({content:sources.topicalGuard});

    const topicalBox=page.locator('.v51b2a-select[data-id="topical-1"]');
    await topicalBox.check();
    await expect.poll(()=>page.evaluate(()=>
      document.getElementById('v51b2a-activate')?.dataset?.v52TopicalBlocked || ''
    )).toBe('1');

    await page.locator('.toggle-q[data-id="topical-1"]').click();
    expect(await page.evaluate(()=>window.__alerts.length)).toBe(1);

    await topicalBox.uncheck();
    await expect.poll(()=>page.evaluate(()=>
      document.getElementById('v51b2a-activate')?.dataset?.v52TopicalBlocked || ''
    )).toBe('');

    expect(await page.evaluate(()=>
      document.getElementById('questions-panel')?.dataset?.v52b1ObserverGated || ''
    )).toBe('');
  });

  test('retired shim keeps historical panel classification while synthetic observers stay native',async({page})=>{
    await page.setContent(shell()+'<div id="unrelated"></div>');
    await page.addScriptTag({content:sources.gate});

    const result=await page.evaluate(async()=>{
      const counts={panel:0,unrelated:0};
      const panel=document.getElementById('questions-panel');
      const unrelated=document.getElementById('unrelated');

      new MutationObserver(()=>{counts.panel+=1;}).observe(panel,{childList:true,subtree:true});
      new MutationObserver(()=>{counts.unrelated+=1;}).observe(unrelated,{childList:true});

      panel.appendChild(document.createElement('span'));
      unrelated.appendChild(document.createElement('span'));
      await new Promise(resolve=>setTimeout(resolve,60));

      return {
        counts,
        marker:panel.dataset.v52b1ObserverGated || '',
        reasons:{
          panel:window.V52B1QuestionBankObserverGate.suppressionReason(panel,()=>{}),
          unrelated:window.V52B1QuestionBankObserverGate.suppressionReason(unrelated,()=>{})
        }
      };
    });

    expect(result.counts.panel).toBeGreaterThan(0);
    expect(result.counts.unrelated).toBeGreaterThan(0);
    expect(result.marker).toBe('');
    expect(result.reasons).toEqual({panel:'question-panel-observer',unrelated:''});
  });
});
