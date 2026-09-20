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
  topicalGuard: read('v52-topical-activation-guard.js'),
  metadataReview: read('question-bank-metadata-review.js'),
  topicalLibrary: read('v52-teacher-topical-library.js'),
  auditMultipart: read('question-bank-audit-multipart.js'),
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
        <section id="v51b2a-bulk-status" class="info"><span id="v51b2a-summary">0 selected</span></section>
        <div id="questions-cards"></div>
      </section>
      <div id="v52b-cards"></div>
      <div id="unrelated"></div>
    </section>
  </body></html>`;
}

async function installGlobals(page){
  await page.evaluate(()=>{
    window.teacherQuestions=[
      {id:'q1',year_level:6,strand:'number',topic:'Number',subtopic:'',skill:'Counting',difficulty:'standard',
       question_text:'Question 1',marks:1,answer:'1',response_type:'text',exam_year:null,paper:'',question_number:'1',
       source_type:'practice',source:'Bank',active:true,review_status:'none',review_note:'',parent_question_number:'',
       part_label:'',part_order:null,group_prompt:'',image_url:'',practice_eligible:true}
    ];
    window.renderQuestions=function(){
      const root=document.getElementById('questions-cards');
      root.innerHTML='<article class="qcard" data-v51b2a-id="q1"><div class="qcard-head"></div><label class="v51b2a-select-wrap"><input class="v51b2a-select" type="checkbox" data-id="q1"></label><div class="qcard-main"><div class="qcard-meta"></div><div class="qcard-detail"></div><div class="qcard-actions"><button class="edit-q" data-id="q1">Edit</button><button class="toggle-q" data-id="q1" data-active="true">Toggle</button></div></div></article>';
      return {count:1};
    };
    window.loadTeacher=async()=>true;
    window.cloudReady=true;
    window.teacherUser={id:'teacher-1'};
    window.cloud={
      rpc:async()=>({data:{history:[]},error:null}),
      from(){return {update(){return {in:async()=>({error:null})}}};}
    };
    window.alert=()=>{};
    window.confirm=()=>true;
    window.prompt=(_m,v)=>v;
  });
}

test.describe('Phase 7C-G — retire V52B1 MutationObserver interception',()=>{
  test('source is a diagnostic compatibility shim with no interception path',async()=>{
    const gateBlob=execFileSync('git',['hash-object','site/v52b1-question-bank-observer-gate.js'],{cwd:ROOT,encoding:'utf8'}).trim();
    expect(gateBlob).toBe('d0c4745afdd78fc326b39748eca559e9d530503a');

    expect(sources.gate).toContain('__v52b1QuestionBankObserverGateRetired = true');
    expect(sources.gate).toContain('retired:true');
    expect(sources.gate).toContain('suppressionActive:false');
    expect(sources.gate).toContain("id === 'questions-cards'");
    expect(sources.gate).toContain("id === 'questions-panel'");
    expect(sources.gate).toContain('target === document.body');
    expect(sources.gate).not.toContain('WrappedMutationObserver');
    expect(sources.gate).not.toContain('ROOT.MutationObserver =');
    expect(sources.gate).not.toContain('nativeObserve');
    expect(sources.gate).not.toContain('data-v52b1-observer-gated');

    const forbiddenAuthority=/\bcloud\s*\.\s*(?:rpc|from)\b|\bfetch\s*\(|\b(?:localStorage|sessionStorage|XMLHttpRequest)\b|grade_practice_response|submit_practice_session|finalize_exam_attempt/i;
    expect(sources.gate).not.toMatch(forbiddenAuthority);
  });

  test('loading the shim preserves native constructor identity and former suppression targets now fire normally',async({page})=>{
    await page.setContent(shell());
    await page.evaluate(()=>{window.__nativeMutationObserver=window.MutationObserver;});
    await page.addScriptTag({content:sources.gate});

    const result=await page.evaluate(async()=>{
      const Native=window.__nativeMutationObserver;
      const api=window.V52B1QuestionBankObserverGate;
      const counts={cards:0,panel:0,history:0,unrelated:0};
      const cards=document.getElementById('questions-cards');
      const panel=document.getElementById('questions-panel');
      const unrelated=document.getElementById('unrelated');
      const bind=()=>{};
      const renderSelectionState=()=>{};
      function historyCallback(){bind();renderSelectionState();counts.history+=1;}

      new MutationObserver(()=>counts.cards++).observe(cards,{childList:true});
      new MutationObserver(()=>counts.panel++).observe(panel,{childList:true,subtree:true});
      new MutationObserver(historyCallback).observe(document.body,{childList:true,subtree:true});
      new MutationObserver(()=>counts.unrelated++).observe(unrelated,{childList:true});

      cards.appendChild(document.createElement('span'));
      panel.appendChild(document.createElement('aside'));
      unrelated.appendChild(document.createElement('i'));
      await new Promise(r=>setTimeout(r,70));

      return {
        nativeIdentity:window.MutationObserver===Native,
        installed:window.__v52b1QuestionBankObserverGateInstalled===true,
        retired:window.__v52b1QuestionBankObserverGateRetired===true,
        apiFrozen:Object.isFrozen(api),
        apiRetired:api?.retired===true,
        suppressionActive:api?.suppressionActive===false,
        counts,
        markers:{
          cards:cards.dataset.v52b1ObserverGated||'',
          panel:panel.dataset.v52b1ObserverGated||'',
          body:document.body.dataset.v52b1ObserverGated||''
        },
        reasons:{
          cards:api.suppressionReason(cards,()=>{}),
          panel:api.suppressionReason(panel,()=>{}),
          history:api.suppressionReason(document.body,historyCallback),
          unrelated:api.suppressionReason(unrelated,()=>{})
        }
      };
    });

    expect(result.nativeIdentity).toBe(true);
    expect(result.installed).toBe(true);
    expect(result.retired).toBe(true);
    expect(result.apiFrozen).toBe(true);
    expect(result.apiRetired).toBe(true);
    expect(result.suppressionActive).toBe(true);
    expect(result.counts.cards).toBeGreaterThan(0);
    expect(result.counts.panel).toBeGreaterThan(0);
    expect(result.counts.history).toBeGreaterThan(0);
    expect(result.counts.unrelated).toBeGreaterThan(0);
    expect(result.markers).toEqual({cards:'',panel:'',body:''});
    expect(result.reasons).toEqual({
      cards:'question-card-observer',
      panel:'question-panel-observer',
      history:'question-history-body-observer',
      unrelated:''
    });
  });

  test('real retired owners register no legacy observers while the native Review summary observer remains live',async({page})=>{
    await page.setContent(shell());
    await installGlobals(page);
    await page.addScriptTag({content:sources.gate});

    await page.evaluate(()=>{
      window.__registrations=[];
      const Native=window.MutationObserver;
      window.MutationObserver=new Proxy(Native,{
        construct(target,args){
          const callback=args[0];
          const record={
            target:'',
            reason:'',
            source:Function.prototype.toString.call(callback),
            fired:0
          };
          const wrappedCallback=(...callbackArgs)=>{
            record.fired+=1;
            return callback(...callbackArgs);
          };
          const observer=Reflect.construct(target,[wrappedCallback,...args.slice(1)],target);
          const nativeObserve=observer.observe.bind(observer);
          observer.observe=function(node,options){
            record.target=node===document.body?'body':String(node?.id||node?.tagName||'');
            record.reason=window.V52B1QuestionBankObserverGate.suppressionReason(node,callback);
            window.__registrations.push(record);
            return nativeObserve(node,options);
          };
          return observer;
        }
      });
    });

    for(const key of ['selection','topicalGuard','topicalLibrary','metadataReview','auditMultipart']){
      await page.addScriptTag({content:sources[key]});
    }

    const logs=await page.evaluate(()=>window.__registrations);
    expect(logs.filter(item=>item.target==='questions-cards')).toHaveLength(0);
    expect(logs.filter(item=>item.target==='questions-panel')).toHaveLength(0);
    expect(logs.filter(item=>item.target==='body'&&item.reason==='question-history-body-observer')).toHaveLength(0);

    const summary=logs.filter(item=>item.target==='v51b2a-summary');
    expect(summary).toHaveLength(1);
    expect(summary[0].reason).toBe('');
    expect(summary[0].source).toContain('renderSummary');

    await page.evaluate(()=>{
      document.getElementById('v51b2a-summary').textContent='native summary observer probe';
    });
    await expect.poll(()=>page.evaluate(()=>
      window.__registrations.find(item=>item.target==='v51b2a-summary')?.fired || 0
    )).toBeGreaterThan(0);
  });

  test('explicit refresh coordinator remains the production replacement for retired observer cascades',async()=>{
    expect(sources.performance).toContain('captureLegacyRefreshes');
    expect(sources.performance).toContain('V52TopicalActivationGuard?.decorate?.()');
    expect(sources.performance).toContain('V51MultipartQuestionManagement?.renderGroup?.()');
    expect(sources.performance).toContain('V51QuestionChangeHistory?.refreshLifecycle?.()');
    expect(sources.performance).not.toMatch(/\bnew\s+MutationObserver\b/);

    expect((sources.selection.match(/new MutationObserver/g)||[]).length).toBe(0);
    expect((sources.topicalGuard.match(/new MutationObserver/g)||[]).length).toBe(0);
    expect((sources.topicalLibrary.match(/new MutationObserver/g)||[]).length).toBe(0);
    expect((sources.auditMultipart.match(/new MutationObserver/g)||[]).length).toBe(0);
    expect((sources.metadataReview.match(/new MutationObserver/g)||[]).length).toBe(1);
  });
});
