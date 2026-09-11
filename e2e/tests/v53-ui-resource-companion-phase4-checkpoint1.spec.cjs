const {test,expect}=require('@playwright/test');
const fs=require('fs');
const path=require('path');

const ELIGIBILITY=fs.readFileSync(path.resolve(__dirname,'../../site/practice-eligibility-ui.js'),'utf8');
const CLARITY=fs.readFileSync(path.resolve(__dirname,'../../site/practice-ui-resource-clarity.js'),'utf8');
// Phase 5A: v52c2 and v54a deleted — read with fallback; tests that depend on them
// will be skipped if the file is absent.
const _v52c2Path=path.resolve(__dirname,'../../site/v52c2-topical-result-ux.js');
const _v54aPath=path.resolve(__dirname,'../../site/v54a-resource-bank-visibility.js');
const LEGACY_RESULT=fs.existsSync(_v52c2Path)?fs.readFileSync(_v52c2Path,'utf8'):'';
const V54A=fs.existsSync(_v54aPath)?fs.readFileSync(_v54aPath,'utf8'):'';

const RESOURCE_HTML=`<!doctype html><html><head></head><body>
  <section id="v52b-topical-library">
    <div class="header"><strong>Topical Exercise Library</strong><span class="help">Legacy help</span></div>
    <div id="v52b-summary"><span class="tag">1 staged</span></div>
    <div id="v52b-cards">
      <article class="v52b-set-card" data-v52b-key="6|set a">
        <div class="qcard-head"><div class="pills"><span class="tag">Student exposure off</span></div></div>
        <div class="v52c-publication"><strong>Topical Practice publication</strong><div class="pills"><span class="tag">Ready to publish</span></div><div class="help">Dedicated V5.2C route</div></div>
        <div class="qcard-actions"></div>
      </article>
    </div>
  </section>
</body></html>`;

const STUDENT_HTML=`<!doctype html><html><head></head><body>
  <main id="start">
    <div class="mode-switch v52c-three-modes">
      <button id="practice-mode-btn" class="active">Practice</button>
      <button id="exam-mode-btn">Exam</button>
      <button id="v52c-topical-mode-btn" class="active">Topical</button>
    </div>
    <section id="v52c-student-topical-library">Topical sets</section>
  </main>
  <section id="result"><button id="again-btn">Again</button></section>
</body></html>`;

test.describe('Phase 4 V53 UI/resource companion consolidation',()=>{
  test('A - topical whole-set eligibility keeps the guarded write boundary and refreshes through D6 clarity',async({page})=>{
    await page.setContent(RESOURCE_HTML);
    await page.evaluate(()=>{
      window.teacherQuestions=[
        {id:'q1',year_level:6,source_type:'topical_exercise',source:'set a',practice_eligible:false,active:false},
        {id:'q2',year_level:6,source_type:'topical_exercise',source:'set a',practice_eligible:false,active:false}
      ];
      window.cloudReady=true;
      window.teacherUser={id:'teacher'};
      window.__eligible=false;
      window.__rpcCalls=[];
      window.__fromCalls=0;
      window.confirm=()=>true;
      window.alert=message=>{window.__alert=String(message||'');};
      window.cloud={
        from(){window.__fromCalls+=1;throw new Error('direct table access is forbidden');},
        async rpc(name,args){
          window.__rpcCalls.push({name,args:args||null});
          if(name==='get_topical_practice_eligibility_states_v53a'){
            return {data:[{
              year_level:6,source:'set a',physical_rows:2,logical_questions:2,
              eligible_rows:window.__eligible?2:0,reviewed_rows:2,active_rows:0,
              all_eligible:window.__eligible,partially_eligible:false,ready:true,
              readiness_reasons:[],student_retrieval_live:false
            }],error:null};
          }
          if(name==='save_topical_practice_eligibility_v53a'){
            window.__eligible=args?.p_eligible===true;
            window.teacherQuestions.forEach(row=>{row.practice_eligible=window.__eligible;});
            return {data:{updated_rows:2},error:null};
          }
          throw new Error(`unexpected RPC ${name}`);
        }
      };
    });

    await page.addScriptTag({content:ELIGIBILITY});
    await page.addScriptTag({content:CLARITY});
    const toggle=page.locator('.v53a-eligibility-toggle');
    await expect(toggle).toHaveText('Add to Practice pool');
    await toggle.click();
    await expect(toggle).toHaveText('Remove from Practice pool');
    await expect(page.locator('.v53a-practice-eligibility strong')).toHaveText('Practice resource bank');
    await expect(page.locator('.v53a-practice-eligibility .tag').first()).toHaveText('Available in Practice');
    await expect(page.locator('.v53a-practice-eligibility')).toContainText('Student retrieval live');

    const proof=await page.evaluate(()=>({
      calls:window.__rpcCalls,
      fromCalls:window.__fromCalls,
      rows:window.teacherQuestions.map(row=>({eligible:row.practice_eligible,active:row.active})),
      flags:{a:window.__v53aPracticeEligibilityInstalled,d6:window.__v53d6ResourceBankStatusClarityInstalled},
      apis:{a:!!window.V53APracticeEligibility,d6Decorate:typeof window.V53D6ResourceBankStatusClarity?.decorate}
    }));
    expect(proof.calls.map(call=>call.name)).toEqual([
      'get_topical_practice_eligibility_states_v53a',
      'save_topical_practice_eligibility_v53a',
      'get_topical_practice_eligibility_states_v53a'
    ]);
    expect(proof.calls[1].args).toEqual({p_year_level:6,p_source:'set a',p_eligible:true});
    expect(proof.fromCalls).toBe(0);
    expect(proof.rows).toEqual([{eligible:true,active:false},{eligible:true,active:false}]);
    expect(proof.flags).toEqual({a:true,d6:true});
    expect(proof.apis).toEqual({a:true,d6Decorate:'function'});
  });

  test('B - student Learn remains two-mode while the retained V52C topical entry points stay hidden',async({page})=>{
    await page.setContent(STUDENT_HTML);
    await page.evaluate(()=>{
      window.__modes=[];
      window.setStartMode=mode=>window.__modes.push(mode);
    });
    await page.addScriptTag({content:CLARITY});

    const proof=await page.evaluate(()=>{
      const modeSwitch=document.querySelector('.mode-switch');
      const topical=document.getElementById('v52c-topical-mode-btn');
      const library=document.getElementById('v52c-student-topical-library');
      return {
        classes:[...modeSwitch.classList],
        topical:{hidden:topical.hidden,aria:topical.getAttribute('aria-hidden'),tabIndex:topical.tabIndex,display:getComputedStyle(topical).display,active:topical.classList.contains('active')},
        library:{hidden:library.hidden,aria:library.getAttribute('aria-hidden'),classHidden:library.classList.contains('hidden'),display:getComputedStyle(library).display},
        practiceDisplay:getComputedStyle(document.getElementById('practice-mode-btn')).display,
        examDisplay:getComputedStyle(document.getElementById('exam-mode-btn')).display,
        flags:{c:window.__v53cTwoModeStudentUiInstalled,d6:window.__v53d6ResourceBankStatusClarityInstalled},
        apis:{c:!!window.V53CTwoModeStudentUi,d6:!!window.V53D6ResourceBankStatusClarity}
      };
    });
    expect(proof.classes).toContain('v53c-two-modes');
    expect(proof.classes).not.toContain('v52c-three-modes');
    expect(proof.topical).toEqual({hidden:true,aria:'true',tabIndex:-1,display:'none',active:false});
    expect(proof.library).toEqual({hidden:true,aria:'true',classHidden:true,display:'none'});
    expect(proof.practiceDisplay).not.toBe('none');
    expect(proof.examDisplay).not.toBe('none');
    expect(proof.flags).toEqual({c:true,d6:true});
    expect(proof.apis).toEqual({c:true,d6:true});
  });

  test.skip(!LEGACY_RESULT, 'Phase 5A: v52c2-topical-result-ux.js deleted');
  test('C - window capture wins before the frozen V52C.2 document-capture Again handler',async({page})=>{
    await page.setContent(`<!doctype html><html><head></head><body>
      <main id="start">
        <div class="mode-switch v52c-three-modes">
          <button id="practice-mode-btn" class="active">Practice</button>
          <button id="exam-mode-btn">Exam</button>
          <button id="v52c-topical-mode-btn">Topical</button>
        </div>
        <section id="v52c-student-topical-library"><button class="v52c-set-card" data-source="Set A">Set A</button></section>
      </main>
      <section id="result" class="active"><h1>Results</h1><button id="again-btn">Again</button></section>
    </body></html>`);
    await page.evaluate(()=>{
      window.state={topicalSource:'Set A',year:6,count:5,accessToken:'old-ticket'};
      window.cloud={rpc:async name=>name==='renew_student_practice_access_v52c2'?{data:{allowed:true,access_token:'fresh-ticket'},error:null}:{data:{},error:null}};
      window.validateStudentAccess=async()=>({access_token:'old-ticket'});
      window.__shows=[];
      window.__modes=[];
      window.__topicalClicks=0;
      window.__setClicks=0;
      window.__documentCaptureSeen=0;
      window.show=id=>window.__shows.push(id);
      window.setStartMode=mode=>window.__modes.push(mode);
      document.getElementById('v52c-topical-mode-btn').addEventListener('click',()=>{window.__topicalClicks+=1;});
      document.querySelector('.v52c-set-card').addEventListener('click',()=>{window.__setClicks+=1;});
      window.alert=()=>{};
    });
    await page.addScriptTag({content:LEGACY_RESULT});
    await expect.poll(()=>page.evaluate(()=>document.getElementById('result').dataset.v52c2TopicalResult)).toBe('1');
    await page.evaluate(()=>{
      document.addEventListener('click',()=>{window.__documentCaptureSeen+=1;},true);
    });
    await page.addScriptTag({content:CLARITY});

    await page.locator('#again-btn').click();
    const proof=await page.evaluate(()=>({
      documentCaptureSeen:window.__documentCaptureSeen,
      topicalClicks:window.__topicalClicks,
      setClicks:window.__setClicks,
      modes:window.__modes,
      shows:window.__shows,
      topicalResult:document.getElementById('result').dataset.v52c2TopicalResult||null,
      practiceActive:document.getElementById('practice-mode-btn').classList.contains('active')
    }));
    expect(proof.documentCaptureSeen).toBe(0);
    expect(proof.topicalClicks).toBe(0);
    expect(proof.setClicks).toBe(0);
    expect(proof.modes).toContain('practice');
    expect(proof.shows).toContain('start');
    expect(proof.topicalResult).toBeNull();
    expect(proof.practiceActive).toBe(true);
  });

  test.skip(!V54A, 'Phase 5A: v54a-resource-bank-visibility.js deleted');
  test('D - V54A synchronously calls D6.decorate and reuses the exact D6 topical badge node contract',async({page})=>{
    await page.setContent(`<!doctype html><html><head></head><body>
      <section id="questions-panel">
        <div class="filtergrid"><select id="question-status"><option>all</option></select></div>
        <div id="question-bank-count"></div>
        <div id="questions-cards">
          <article class="qcard" data-v51b2a-id="q1">
            <div class="qcard-meta"></div>
            <div class="qcard-actions"><button class="toggle-q" data-id="q1" data-active="false" data-v52-topical-locked="1">Staged — inactive</button></div>
          </article>
        </div>
      </section>
    </body></html>`);
    await page.evaluate(()=>{
      window.teacherQuestions=[{id:'q1',year_level:6,source_type:'topical_exercise',source:'set a',practice_eligible:true,review_status:'reviewed',active:false}];
    });
    await page.addScriptTag({content:CLARITY});
    await expect(page.locator('.v53d6-practice-eligibility-badge')).toHaveCount(1);
    await page.waitForTimeout(820);
    await page.evaluate(()=>document.querySelector('.v53d6-practice-eligibility-badge')?.remove());
    await expect(page.locator('.v53d6-practice-eligibility-badge')).toHaveCount(0);

    await page.addScriptTag({content:V54A});
    const proof=await page.evaluate(()=>{
      const badges=[...document.querySelectorAll('.v53d6-practice-eligibility-badge')];
      const badge=badges[0]||null;
      return {
        count:badges.length,
        v54Reuse:badge?.classList.contains('v54a-resource-badge')||false,
        text:badge?.textContent||'',
        d6Decorate:typeof window.V53D6ResourceBankStatusClarity?.decorate,
        v54Api:!!window.V54AResourceBankVisibility
      };
    });
    expect(proof).toEqual({count:1,v54Reuse:true,text:'Practice resource',d6Decorate:'function',v54Api:true});
  });
});
