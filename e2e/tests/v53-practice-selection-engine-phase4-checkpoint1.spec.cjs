const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ENGINE = fs.readFileSync(path.resolve(__dirname,'../../site/practice-selection-engine.js'),'utf8');
const PAST_PAPER = fs.readFileSync(path.resolve(__dirname,'../../site/past-paper-core.js'),'utf8');

const BASE_HTML = `<!doctype html><html><head></head><body>
  <main id="start">
    <div class="v40c-practice-summary"><div class="v40c-summary-head"></div></div>
    <label id="practice-strand-wrap"><select id="strand-filter"><option value="all">All</option><option value="number">Number</option></select></label>
    <label id="practice-topic-wrap"><select id="topic-filter"><option value="all">All</option><option value="Algebra">Algebra</option></select></label>
    <label id="practice-difficulty-wrap"><select id="difficulty-filter"><option value="all">All</option></select></label>
    <label id="practice-count-wrap"><select id="question-count"><option value="5">5</option><option value="10" selected>10</option></select></label>
    <input id="year-level" value="6"><input id="student-id" value="S1"><input id="student-name" value="Student">
  </main>
  <section id="quiz"><span id="path-pill"></span></section>
</body></html>`;

async function prime(page,state={strand:'all',topic:'all',difficulty:'all',count:5}){
  await page.setContent(BASE_HTML);
  await page.evaluate(initialState=>{
    window.state={...initialState};
    window.Math.random=()=>0.5;
    window.__baseCalls=[];
    window.__shuffleAssignments=[];
    let shuffleValue=items=>Array.isArray(items)?[...items]:[];
    Object.defineProperty(window,'shuffle',{
      configurable:true,
      get(){ return shuffleValue; },
      set(fn){
        shuffleValue=fn;
        window.__shuffleAssignments.push({
          d5Ready:window.cloud?.__v53d5PracticeSelectionRpcBridge===true,
          at:performance.now()
        });
      }
    });
    let multipartValue=q=>String(q?.parent_question_number||'');
    Object.defineProperty(window,'multipartKey',{
      configurable:true,
      get(){ return multipartValue; },
      set(fn){ multipartValue=fn; }
    });
    window.__rpcHandler=async(name,args)=>({data:{name,args},error:null});
    window.__installCloud=()=>{
      window.cloud={
        rpc:async function(name,args,options){
          window.__baseCalls.push({name,args,options});
          return window.__rpcHandler(name,args,options);
        }
      };
    };
    window.getQuestions=async()=>[];
    window.startPractice=async()=>{};
    window.buildPracticeItems=rows=>rows;
    window.validateStudentAccess=async()=>({access_token:'ticket',year_level:6});
    window.cloudReady=true;
    window.alert=()=>{};
  },state);
}

async function injectEngine(page){
  await page.addScriptTag({content:ENGINE});
}

async function waitForD5(page){
  await expect.poll(()=>page.evaluate(()=>window.cloud?.__v53d5PracticeSelectionRpcBridge===true),{timeout:5000}).toBe(true);
}

test.describe('Phase 4 V53 deterministic Practice selection engine',()=>{
  test('A - delayed cloud publishes D5 readiness only after the complete B-D3-D4-D5 chain is settled',async({page})=>{
    await prime(page);
    await injectEngine(page);

    const before=await page.evaluate(()=>({
      b:window.__v53bUnifiedPracticeInstalled,
      d3:window.__v53d3PracticeSelectionInstalled,
      d4:window.__v53d4StudentRecommendationInstalled,
      d5:window.__v53d5PracticeSelectionInstalled,
      apis:[!!window.V53BUnifiedPractice,!!window.V53D3PracticeSelection,!!window.V53D4StudentRecommendation,!!window.V53D5PracticeSelection],
      cloud:typeof window.cloud
    }));
    expect(before).toEqual({b:true,d3:true,d4:true,d5:true,apis:[true,true,true,true],cloud:'undefined'});

    await page.waitForTimeout(140);
    await page.evaluate(()=>window.__installCloud());
    await waitForD5(page);

    const settled=await page.evaluate(()=>({
      b:window.cloud.__v53bUnifiedPracticeRpcBridge,
      d3:window.cloud.__v53d3PracticeSelectionRpcBridge,
      d4:window.cloud.__v53d4StudentRecommendationRpcBridge,
      d5:window.cloud.__v53d5PracticeSelectionRpcBridge,
      shuffleType:typeof window.shuffle,
      multipart:window.multipartKey({parent_question_number:'8',source_type:'topical_exercise',source:'Set A'})
    }));
    expect(settled.b).toBe(true);
    expect(settled.d3).toBe(true);
    expect(settled.d4).toBe(true);
    expect(settled.d5).toBe(true);
    expect(settled.shuffleType).toBe('function');
    expect(settled.multipart).toBe('resource|topical_exercise|set a|8');
  });

  test('B - D3 cannot reclaim shuffle after D5 becomes the final owner',async({page})=>{
    await prime(page);
    await injectEngine(page);
    await page.evaluate(()=>window.__installCloud());
    await waitForD5(page);

    // Capture the actual final-owner function inside the browser realm. Function
    // identity cannot be meaningfully serialized through Playwright, so both the
    // identity check and the setter-count check remain in-page for the full wait.
    const stability=await page.evaluate(async()=>{
      const readyShuffle=window.shuffle;
      const readyAssignments=window.__shuffleAssignments.length;
      const readyAt=performance.now();
      await new Promise(resolve=>setTimeout(resolve,1200));
      return {
        sameOwner:window.shuffle===readyShuffle,
        readyAssignments,
        finalAssignments:window.__shuffleAssignments.length,
        waitedMs:performance.now()-readyAt,
        markers:{
          d3:window.cloud.__v53d3PracticeSelectionRpcBridge,
          d5:window.cloud.__v53d5PracticeSelectionRpcBridge
        }
      };
    });

    expect(stability.waitedMs).toBeGreaterThanOrEqual(1100);
    expect(stability.markers).toEqual({d3:true,d5:true});
    expect(stability.sameOwner).toBe(true);
    expect(stability.finalAssignments).toBe(stability.readyAssignments);
  });

  test('C - D4 recommendation routing is always underneath D5 previousRpc',async({page})=>{
    await prime(page);
    await page.evaluate(()=>{
      window.__rpcHandler=async(name,args)=>{
        if(name==='get_student_practice_questions_v53d3') return {data:[],error:null};
        if(name==='get_student_practice_recommendation_v53d4') return {data:{focus_strand:'number',focus_topic:'Algebra',reason:'needs_attention'},error:null};
        return {data:{},error:null};
      };
    });
    await injectEngine(page);
    await page.evaluate(()=>window.__installCloud());
    await waitForD5(page);

    await page.evaluate(()=>window.cloud.rpc('get_student_questions',{p_access_token:'ticket',p_year_level:6,p_exam_year:null,p_paper:null}));
    const names=await page.evaluate(()=>window.__baseCalls.map(row=>row.name));
    expect(names).toContain('get_student_practice_questions_v53d3');
    expect(names).toContain('get_student_practice_recommendation_v53d4');
    expect(names).not.toContain('get_student_practice_recommendation');
  });

  test('D - D3 exposure metadata reaches final D5 ordering instead of silently degrading to all-unseen fallback',async({page})=>{
    await prime(page,{strand:'all',topic:'all',difficulty:'all',count:2});
    await page.evaluate(()=>{
      window.__rpcHandler=async(name)=>{
        if(name==='get_student_practice_questions_v53d3') return {data:[
          {id:'seen',strand:'number',topic:'Fractions',skill:'compare',difficulty:'standard',practice_seen_count:3,practice_last_seen_at:'2026-08-30T00:00:00Z'},
          {id:'unseen',strand:'number',topic:'Decimals',skill:'place',difficulty:'standard',practice_seen_count:0,practice_last_seen_at:null}
        ],error:null};
        if(name==='get_student_practice_recommendation_v53d4') return {data:null,error:null};
        return {data:{},error:null};
      };
    });
    await injectEngine(page);
    await page.evaluate(()=>window.__installCloud());
    await waitForD5(page);

    const result=await page.evaluate(async()=>{
      const response=await window.cloud.rpc('get_student_questions',{p_access_token:'ticket',p_year_level:6,p_exam_year:null,p_paper:null});
      return {
        rows:response.data.map(row=>({id:row.id,seen:row.practice_seen_count})),
        ordered:window.shuffle(response.data).map(row=>row.id),
        calls:window.__baseCalls.map(row=>row.name)
      };
    });
    expect(result.calls).toContain('get_student_practice_questions_v53d3');
    expect(result.rows).toEqual([{id:'seen',seen:3},{id:'unseen',seen:0}]);
    expect(result.ordered[0]).toBe('unseen');
  });

  test('E - frozen Past Paper core waits for aggregate D5 readiness and wraps the settled final D5 owner',async({page})=>{
    await prime(page,{strand:'all',topic:'all',difficulty:'all',count:2});
    await page.evaluate(()=>{
      window.__rpcHandler=async(name)=>{
        if(name==='get_student_practice_questions_v53d3') return {data:[
          {id:'other',strand:'number',topic:'Fractions',skill:'other',difficulty:'standard',practice_seen_count:0},
          {id:'focus',strand:'number',topic:'Algebra',skill:'focus',difficulty:'foundation',practice_seen_count:0}
        ],error:null};
        if(name==='get_student_practice_recommendation_v53d4') return {data:{focus_strand:'number',focus_topic:'Algebra',reason:'needs_attention'},error:null};
        return {data:{},error:null};
      };
    });
    await injectEngine(page);
    await page.addScriptTag({content:PAST_PAPER});

    await page.waitForTimeout(140);
    expect(await page.evaluate(()=>window.__phase4PastPaperCoreWrappersInstalled===true)).toBe(false);
    await page.evaluate(()=>window.__installCloud());
    await waitForD5(page);
    await expect.poll(()=>page.evaluate(()=>window.__phase4PastPaperCoreWrappersInstalled===true),{timeout:6000}).toBe(true);

    const proof=await page.evaluate(async()=>{
      const response=await window.cloud.rpc('get_student_questions',{p_access_token:'ticket',p_year_level:6,p_exam_year:null,p_paper:null});
      return {
        order:window.shuffle(response.data).map(row=>row.id),
        assignments:window.__shuffleAssignments,
        markers:{
          d3:window.cloud.__v53d3PracticeSelectionRpcBridge,
          d4:window.cloud.__v53d4StudentRecommendationRpcBridge,
          d5:window.cloud.__v53d5PracticeSelectionRpcBridge,
          past:window.__phase4PastPaperCoreWrappersInstalled
        }
      };
    });
    expect(proof.markers).toEqual({d3:true,d4:true,d5:true,past:true});
    expect(proof.assignments.some(row=>row.d5Ready===false)).toBe(true);
    expect(proof.assignments.some(row=>row.d5Ready===true)).toBe(true);
    expect(proof.order[0]).toBe('focus');
  });

  test('F - routing isolation remains exact for ordinary, Topic, assigned, Past Paper, V52C and Exam paths',async({page})=>{
    await prime(page);
    await page.evaluate(()=>{
      window.__rpcHandler=async(name,args)=>({data:{name,args},error:null});
    });
    await injectEngine(page);
    await page.evaluate(()=>window.__installCloud());
    await waitForD5(page);

    const matrix=await page.evaluate(async()=>{
      const call=async(label,name,args,statePatch={})=>{
        Object.assign(window.state,{strand:'all',topic:'all',difficulty:'all',topicalSource:null},statePatch);
        window.__baseCalls.length=0;
        await window.cloud.rpc(name,args);
        return [label,window.__baseCalls.map(row=>row.name)];
      };
      return [
        await call('ordinary','get_student_questions',{p_access_token:'t',p_year_level:6,p_exam_year:null,p_paper:null}),
        await call('topic','get_student_questions',{p_access_token:'t',p_year_level:6,p_exam_year:null,p_paper:null},{strand:'number',topic:'Algebra'}),
        await call('assigned','get_student_questions',{p_access_token:'t',p_year_level:6,p_exam_year:null,p_paper:null},{strand:'number',topic:'Algebra'}),
        await call('past-direct','get_student_practice_questions_v53d3',{p_access_token:'t',p_year_level:6},{strand:'number',topic:'Algebra'}),
        await call('topical','get_student_topical_questions_v52c',{p_access_token:'t'} ,{topicalSource:{source:'Set A'}}),
        await call('exam','get_student_questions',{p_access_token:'t',p_year_level:6,p_exam_year:2025,p_paper:'Paper 1'}),
        await call('ordinary-grade','grade_practice_response_v3',{p_access_token:'t'}),
        await call('topical-grade','grade_practice_response_v3',{p_access_token:'t'},{topicalSource:{source:'Set A'}}),
        await call('topical-hint','request_practice_hint_v3',{p_access_token:'t'},{topicalSource:{source:'Set A'}}),
        await call('topical-submit','submit_practice_session_v3',{p_access_token:'t'},{topicalSource:{source:'Set A'}})
      ];
    });
    const rows=Object.fromEntries(matrix);
    expect(rows.ordinary).toContain('get_student_practice_questions_v53d3');
    expect(rows.topic).toEqual(['get_student_practice_questions_v53d3']);
    expect(rows.assigned).toEqual(['get_student_practice_questions_v53d3']);
    expect(rows['past-direct']).toEqual(['get_student_practice_questions_v53d3']);
    expect(rows.topical).toEqual(['get_student_topical_questions_v52c']);
    expect(rows.exam).toEqual(['get_student_questions']);
    expect(rows['ordinary-grade']).toEqual(['grade_practice_response_v53b']);
    expect(rows['topical-grade']).toEqual(['grade_practice_response_v3']);
    expect(rows['topical-hint']).toEqual(['request_practice_hint_v3']);
    expect(rows['topical-submit']).toEqual(['submit_practice_session_v3']);
  });
});
