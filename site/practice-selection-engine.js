/* Phase 4 — deterministic V5.3 Practice selection/recommendation engine.
   Consolidates the active V5.3B -> V5.3D3 -> V5.3D4 -> V5.3D5 browser chain
   while preserving every historical public API, install flag and cloud bridge marker.
   One coordinated installer now owns multipart grouping, RPC wrapper composition and
   final shuffle ownership so delayed cloud availability cannot reorder the phases. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__phase4PracticeSelectionEngineInstalled) return;
  ROOT.__phase4PracticeSelectionEngineInstalled = true;

  // Historical module-presence flags were set as soon as each old file evaluated.
  // Preserve that observable contract even though installation is now coordinated.
  ROOT.__v53bUnifiedPracticeInstalled = true;
  ROOT.__v53d3PracticeSelectionInstalled = true;
  ROOT.__v53d4StudentRecommendationInstalled = true;
  ROOT.__v53d5PracticeSelectionInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');

  // ---------------------------------------------------------------------------
  // V5.3B — unified ordinary-Practice retrieval + multipart identity
  // ---------------------------------------------------------------------------
  function topicalSessionActive(){
    try { return typeof state !== 'undefined' && !!state?.topicalSource; } catch { return false; }
  }

  function routeV53B(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    const topical = topicalSessionActive();

    if (rpcName === 'get_student_questions'
        && input.p_exam_year == null
        && (input.p_paper == null || trim(input.p_paper) === '')){
      return {
        name:'get_student_practice_questions_v53b',
        args:{p_access_token:input.p_access_token,p_year_level:input.p_year_level}
      };
    }

    if (!topical && rpcName === 'grade_practice_response_v3')
      return {name:'grade_practice_response_v53b',args:input};
    if (!topical && rpcName === 'request_practice_hint_v3')
      return {name:'request_practice_hint_v53b',args:input};
    if (!topical && rpcName === 'submit_practice_session_v3')
      return {name:'submit_practice_session_v53b',args:input};
    if (!topical && rpcName === 'begin_student_ai_help_request'
        && ['practice','recommended_practice'].includes(norm(input.p_mode || 'practice')))
      return {name:'begin_student_ai_help_request_v53b',args:input};

    return {name:rpcName,args:input};
  }

  function unifiedMultipartKey(q){
    if (!q?.parent_question_number) return '';
    const parent = trim(q.parent_question_number);
    const examYear = trim(q.exam_year);
    const paper = norm(q.paper);
    if (examYear || paper) return `${examYear}|${paper}|${parent}`;
    return `resource|${norm(q.source_type || 'unknown')}|${norm(q.source || 'unknown')}|${parent}`;
  }

  const v53bApi = Object.freeze({routeRpc:routeV53B,unifiedMultipartKey});

  // ---------------------------------------------------------------------------
  // V5.3D3 — repeat-aware retrieval + exposure ordering
  // ---------------------------------------------------------------------------
  function d3IsOrdinaryPracticeRequest(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (rpcName === 'get_student_practice_questions_v53b') return true;
    return rpcName === 'get_student_questions'
      && input.p_exam_year == null
      && (input.p_paper == null || trim(input.p_paper) === '');
  }

  function routeV53D3(name,args={}){
    const input = args && typeof args === 'object' ? args : {};
    if (d3IsOrdinaryPracticeRequest(name,input)) {
      return {
        name:'get_student_practice_questions_v53d3',
        args:{p_access_token:input.p_access_token,p_year_level:input.p_year_level}
      };
    }
    return {name:String(name || ''),args:input};
  }

  function itemRows(item){
    return item?._kind === 'multipart' && Array.isArray(item.parts) && item.parts.length
      ? item.parts
      : [item];
  }

  function hasHistoryMetadata(item){
    return itemRows(item).some(row => row && Object.prototype.hasOwnProperty.call(row,'practice_seen_count'));
  }

  function itemHistoryD3(item){
    const rows = itemRows(item).filter(Boolean);
    let seenCount = 0;
    let lastSeenMs = 0;
    rows.forEach(row => {
      const seen = Number(row.practice_seen_count || 0);
      if (Number.isFinite(seen) && seen > seenCount) seenCount = seen;
      const time = Date.parse(row.practice_last_seen_at || '');
      if (Number.isFinite(time) && time > lastSeenMs) lastSeenMs = time;
    });
    return {seenCount,lastSeenMs};
  }

  function balanceKey(item){
    const strand = norm(item?.strand || 'unclassified');
    const topic = norm(item?.topic || 'unclassified');
    return `${strand}|${topic}`;
  }

  function randomOrder(items,rng=Math.random){
    const copy = Array.isArray(items) ? [...items] : [];
    for (let i=copy.length-1;i>0;i--){
      const r = Number(rng());
      const safe = Number.isFinite(r) ? Math.max(0,Math.min(0.999999999,r)) : 0.5;
      const j = Math.floor(safe*(i+1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy;
  }

  function orderPracticeItems(items,rng=Math.random){
    const source = Array.isArray(items) ? items : [];
    if (!source.length) return [];
    if (!source.some(hasHistoryMetadata)) return randomOrder(source,rng);

    const remaining = source.map((item,index) => {
      const history = itemHistoryD3(item);
      const random = Number(rng());
      return {
        item,
        index,
        key:balanceKey(item),
        seenCount:history.seenCount,
        lastSeenMs:history.lastSeenMs,
        random:Number.isFinite(random) ? random : 0.5
      };
    });
    const selectedByKey = new Map();
    const ordered = [];

    while (remaining.length){
      const minSeen = Math.min(...remaining.map(entry => entry.seenCount));
      const exposureTier = remaining.filter(entry => entry.seenCount === minSeen);
      const minSelectedForKey = Math.min(...exposureTier.map(entry => selectedByKey.get(entry.key) || 0));
      const balanced = exposureTier.filter(entry => (selectedByKey.get(entry.key) || 0) === minSelectedForKey);
      const oldestSeen = Math.min(...balanced.map(entry => entry.lastSeenMs || 0));
      const finalists = balanced
        .filter(entry => (entry.lastSeenMs || 0) === oldestSeen)
        .sort((a,b) => a.random-b.random || a.index-b.index);
      const chosen = finalists[0];
      ordered.push(chosen.item);
      selectedByKey.set(chosen.key,(selectedByKey.get(chosen.key) || 0)+1);
      remaining.splice(remaining.indexOf(chosen),1);
    }

    return ordered;
  }

  const v53d3Api = Object.freeze({
    isOrdinaryPracticeRequest:d3IsOrdinaryPracticeRequest,
    routeRpc:routeV53D3,
    hasHistoryMetadata,
    itemHistory:itemHistoryD3,
    balanceKey,
    randomOrder,
    orderPracticeItems
  });

  // ---------------------------------------------------------------------------
  // V5.3D4 — student recommendation alignment
  // ---------------------------------------------------------------------------
  function routeV53D4(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (rpcName === 'get_student_practice_recommendation') {
      return {name:'get_student_practice_recommendation_v53d4',args:input};
    }
    return {name:rpcName,args:input};
  }

  const v53d4Api = Object.freeze({routeRpc:routeV53D4});

  // ---------------------------------------------------------------------------
  // V5.3D5 — adaptive Mixed Practice selection
  // ---------------------------------------------------------------------------
  let latestRecommendation = null;

  function currentState(){
    try { return typeof state !== 'undefined' && state ? state : null; } catch { return null; }
  }

  function isBroadMixedState(snapshot=currentState()){
    return !!snapshot
      && norm(snapshot.strand || 'all') === 'all'
      && norm(snapshot.topic || 'all') === 'all'
      && norm(snapshot.difficulty || 'all') === 'all'
      && !snapshot.topicalSource;
  }

  function d5IsOrdinaryPracticeRequest(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (['get_student_practice_questions_v53b','get_student_practice_questions_v53d3'].includes(rpcName)) return true;
    return rpcName === 'get_student_questions'
      && input.p_exam_year == null
      && (input.p_paper == null || trim(input.p_paper) === '');
  }

  function activeD3Api(){
    try {
      const external = ROOT.V53D3PracticeSelection;
      if (external && typeof external === 'object') return external;
    } catch {}
    return v53d3Api;
  }

  function itemHistoryD5(item){
    const d3 = activeD3Api();
    if (d3 && typeof d3.itemHistory === 'function') return d3.itemHistory(item);
    return itemHistoryD3(item);
  }

  function itemField(item,field){
    const direct = trim(item?.[field]);
    if (direct) return direct;
    const row = itemRows(item).find(part => trim(part?.[field]));
    return trim(row?.[field]);
  }

  function itemDifficulty(item){ return norm(itemField(item,'difficulty') || 'standard'); }
  function itemTopicKey(item){
    return `${norm(itemField(item,'strand') || 'unclassified')}|${norm(itemField(item,'topic') || 'unclassified')}`;
  }
  function itemSkillKey(item){ return `${itemTopicKey(item)}|${norm(itemField(item,'skill') || 'unclassified')}`; }

  function matchesFocus(item,recommendation){
    if (!recommendation) return false;
    const focusTopic = norm(recommendation.focus_topic);
    const focusStrand = norm(recommendation.focus_strand);
    if (!focusTopic) return false;
    return norm(itemField(item,'topic')) === focusTopic
      && (!focusStrand || norm(itemField(item,'strand')) === focusStrand);
  }

  function challengeCap(targetCount){
    const count = Math.max(1,Number(targetCount) || 1);
    return Math.max(1,Math.floor(count * 0.2));
  }

  function focusTarget(targetCount,recommendation){
    if (!norm(recommendation?.focus_topic)) return 0;
    return Math.min(5,Math.ceil(Math.max(1,Number(targetCount) || 1) * 0.4));
  }

  function difficultyRank(difficulty,reason){
    const d = norm(difficulty || 'standard');
    const r = norm(reason);
    if (r === 'needs_attention') return d === 'foundation' ? 0 : d === 'standard' ? 1 : 2;
    if (r === 'developing') return d === 'standard' ? 0 : d === 'foundation' ? 1 : 2;
    if (r === 'consolidation') return d === 'standard' ? 0 : d === 'challenge' ? 1 : 2;
    return d === 'standard' ? 0 : d === 'foundation' ? 1 : 2;
  }

  function fallbackOrder(items,rng=Math.random){
    const d3 = activeD3Api();
    if (d3 && typeof d3.orderPracticeItems === 'function') return d3.orderPracticeItems(items,rng);
    return randomOrder(items,rng);
  }

  function adaptiveOrder(items,{targetCount=10,recommendation=latestRecommendation,broadMixed=isBroadMixedState()}={},rng=Math.random){
    const source = Array.isArray(items) ? items : [];
    if (!source.length || !broadMixed) return fallbackOrder(source,rng);

    const limit = Math.min(source.length,Math.max(1,Number(targetCount) || 10));
    const maxChallenge = challengeCap(limit);
    const desiredFocus = focusTarget(limit,recommendation);
    const remaining = source.map((item,index) => {
      const history = itemHistoryD5(item);
      const random = Number(rng());
      return {
        item,index,
        seenCount:Number(history.seenCount || 0),
        lastSeenMs:Number(history.lastSeenMs || 0),
        topicKey:itemTopicKey(item),
        skillKey:itemSkillKey(item),
        difficulty:itemDifficulty(item),
        focus:matchesFocus(item,recommendation),
        random:Number.isFinite(random) ? random : 0.5
      };
    });

    const selected = [];
    const topicCounts = new Map();
    const skillCounts = new Map();
    let challengeSelected = 0;
    let focusSelected = 0;

    while (remaining.length && selected.length < limit){
      const minSeen = Math.min(...remaining.map(entry => entry.seenCount));
      let candidates = remaining.filter(entry => entry.seenCount === minSeen);
      let focusMode = false;

      if (challengeSelected >= maxChallenge){
        const nonChallenge = candidates.filter(entry => entry.difficulty !== 'challenge');
        if (nonChallenge.length) candidates = nonChallenge;
      }

      const desiredFocusSoFar = Math.min(desiredFocus,Math.ceil((selected.length + 1) * 0.4));
      if (focusSelected < desiredFocusSoFar){
        const focusCandidates = candidates.filter(entry => entry.focus);
        if (focusCandidates.length){ candidates = focusCandidates; focusMode = true; }
      } else if (focusSelected >= desiredFocus){
        const nonFocus = candidates.filter(entry => !entry.focus);
        if (nonFocus.length) candidates = nonFocus;
      }

      if (focusMode){
        const bestDifficulty = Math.min(...candidates.map(entry => difficultyRank(entry.difficulty,recommendation?.reason)));
        candidates = candidates.filter(entry => difficultyRank(entry.difficulty,recommendation?.reason) === bestDifficulty);
      }

      const minTopicCount = Math.min(...candidates.map(entry => topicCounts.get(entry.topicKey) || 0));
      candidates = candidates.filter(entry => (topicCounts.get(entry.topicKey) || 0) === minTopicCount);
      const minSkillCount = Math.min(...candidates.map(entry => skillCounts.get(entry.skillKey) || 0));
      candidates = candidates.filter(entry => (skillCounts.get(entry.skillKey) || 0) === minSkillCount);
      const oldest = Math.min(...candidates.map(entry => entry.lastSeenMs || 0));
      candidates = candidates.filter(entry => (entry.lastSeenMs || 0) === oldest)
        .sort((a,b) => a.random-b.random || a.index-b.index);

      const chosen = candidates[0];
      selected.push(chosen.item);
      topicCounts.set(chosen.topicKey,(topicCounts.get(chosen.topicKey) || 0)+1);
      skillCounts.set(chosen.skillKey,(skillCounts.get(chosen.skillKey) || 0)+1);
      if (chosen.difficulty === 'challenge') challengeSelected += 1;
      if (chosen.focus) focusSelected += 1;
      remaining.splice(remaining.indexOf(chosen),1);
    }

    const tail = fallbackOrder(remaining.map(entry => entry.item),rng);
    return [...selected,...tail];
  }

  function smartShuffleV53D5(items){
    const snapshot = currentState();
    return adaptiveOrder(items,{
      targetCount:Number(snapshot?.count || 10),
      recommendation:latestRecommendation,
      broadMixed:isBroadMixedState(snapshot)
    },Math.random);
  }

  const v53d5Api = Object.freeze({
    isBroadMixedState,
    isOrdinaryPracticeRequest:d5IsOrdinaryPracticeRequest,
    itemHistory:itemHistoryD5,
    itemDifficulty,
    itemTopicKey,
    itemSkillKey,
    matchesFocus,
    challengeCap,
    focusTarget,
    difficultyRank,
    adaptiveOrder,
    getLatestRecommendation:() => latestRecommendation
  });

  // ---------------------------------------------------------------------------
  // Compatibility API publication happens immediately, like the retired files.
  // ---------------------------------------------------------------------------
  function publishApi(name,api){
    if (typeof window === 'undefined') return;
    if (Object.prototype.hasOwnProperty.call(window,name)) return;
    Object.defineProperty(window,name,{value:api,writable:false,configurable:false});
  }

  publishApi('V53BUnifiedPractice',v53bApi);
  publishApi('V53D3PracticeSelection',v53d3Api);
  publishApi('V53D4StudentRecommendation',v53d4Api);
  publishApi('V53D5PracticeSelection',v53d5Api);

  if (typeof module !== 'undefined' && module.exports){
    module.exports = Object.freeze({
      V53BUnifiedPractice:v53bApi,
      V53D3PracticeSelection:v53d3Api,
      V53D4StudentRecommendation:v53d4Api,
      V53D5PracticeSelection:v53d5Api
    });
  }

  // ---------------------------------------------------------------------------
  // Deterministic installation. One retry loop waits only for cloud.rpc. Once
  // available, wrappers are composed synchronously B -> D3 -> D4 -> D5.
  // D3 never owns a retry timer and therefore cannot reclaim shuffle after D5.
  // ---------------------------------------------------------------------------
  let multipartInstalled = false;
  let chainSettled = false;

  function installMultipartKeyOnce(){
    if (multipartInstalled) return true;
    let assigned = false;
    try {
      if (typeof multipartKey !== 'undefined'){
        multipartKey = unifiedMultipartKey;
        assigned = multipartKey === unifiedMultipartKey;
      }
    } catch {}
    try {
      ROOT.multipartKey = unifiedMultipartKey;
      assigned = ROOT.multipartKey === unifiedMultipartKey || assigned;
    } catch {}
    multipartInstalled = assigned;
    return assigned;
  }

  function installBBridge(){
    if (cloud.__v53bUnifiedPracticeRpcBridge === true) return true;
    const originalRpc = cloud.rpc.bind(cloud);
    const bridgedRpc = function(name,args,options){
      const routed = routeV53B(name,args);
      return originalRpc(routed.name,routed.args,options);
    };
    Object.defineProperty(cloud,'__v53bOriginalRpc',{value:originalRpc,writable:false,configurable:false});
    cloud.rpc = bridgedRpc;
    Object.defineProperty(cloud,'__v53bUnifiedPracticeRpcBridge',{value:true,writable:false,configurable:false});
    return true;
  }

  function installD3Bridge(){
    if (cloud.__v53d3PracticeSelectionRpcBridge === true) return true;
    if (cloud.__v53bUnifiedPracticeRpcBridge !== true) return false;
    const previousRpc = cloud.rpc.bind(cloud);
    const bridgedRpc = function(name,args,options){
      const routed = routeV53D3(name,args);
      return previousRpc(routed.name,routed.args,options);
    };
    Object.defineProperty(cloud,'__v53d3PreviousRpc',{value:previousRpc,writable:false,configurable:false});
    cloud.rpc = bridgedRpc;
    Object.defineProperty(cloud,'__v53d3PracticeSelectionRpcBridge',{value:true,writable:false,configurable:false});
    return true;
  }

  function installD4Bridge(){
    if (cloud.__v53d4StudentRecommendationRpcBridge === true) return true;
    if (cloud.__v53d3PracticeSelectionRpcBridge !== true) return false;
    const previousRpc = cloud.rpc.bind(cloud);
    const bridgedRpc = function(name,args,options){
      const routed = routeV53D4(name,args);
      return previousRpc(routed.name,routed.args,options);
    };
    Object.defineProperty(cloud,'__v53d4PreviousRpc',{value:previousRpc,writable:false,configurable:false});
    cloud.rpc = bridgedRpc;
    Object.defineProperty(cloud,'__v53d4StudentRecommendationRpcBridge',{value:true,writable:false,configurable:false});
    return true;
  }

  function installFinalShuffle(){
    let assigned = false;
    try {
      if (typeof shuffle !== 'undefined'){
        shuffle = smartShuffleV53D5;
        assigned = shuffle === smartShuffleV53D5;
      }
    } catch {}
    try {
      ROOT.shuffle = smartShuffleV53D5;
      assigned = ROOT.shuffle === smartShuffleV53D5 || assigned;
    } catch {}
    return assigned;
  }

  function installD5BridgeAndFinalize(){
    if (cloud.__v53d5PracticeSelectionRpcBridge === true) return true;
    if (cloud.__v53d4StudentRecommendationRpcBridge !== true) return false;

    const previousRpc = cloud.rpc.bind(cloud);
    const bridgedRpc = function(name,args,options){
      const input = args && typeof args === 'object' ? args : {};
      if (!d5IsOrdinaryPracticeRequest(name,input)) return previousRpc(name,args,options);

      latestRecommendation = null;
      const questionPromise = Promise.resolve(previousRpc(name,args,options));
      const accessToken = input.p_access_token;
      const broadMixed = isBroadMixedState(currentState());
      const recommendationPromise = accessToken && broadMixed
        ? Promise.resolve(previousRpc('get_student_practice_recommendation',{
            p_access_token:accessToken
          })).catch(error => {
            console.warn('V5.3D5 recommendation context could not be loaded.',error);
            return null;
          })
        : Promise.resolve(null);

      return questionPromise.then(async result => {
        const recResult = await recommendationPromise;
        latestRecommendation = recResult?.data || null;
        return result;
      });
    };

    Object.defineProperty(cloud,'__v53d5PreviousRpc',{value:previousRpc,writable:false,configurable:false});
    cloud.rpc = bridgedRpc;

    // The aggregate D5 marker is deliberately last. Past Paper already waits on
    // this exact marker, so true now means B, D3, D4, D5 and final shuffle are settled.
    if (!installFinalShuffle()) return false;
    Object.defineProperty(cloud,'__v53d5PracticeSelectionRpcBridge',{value:true,writable:false,configurable:false});
    return true;
  }

  function installRpcChain(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (!installBBridge()) return false;
      if (!installD3Bridge()) return false;
      if (!installD4Bridge()) return false;
      if (!installD5BridgeAndFinalize()) return false;
      chainSettled = cloud.__v53bUnifiedPracticeRpcBridge === true
        && cloud.__v53d3PracticeSelectionRpcBridge === true
        && cloud.__v53d4StudentRecommendationRpcBridge === true
        && cloud.__v53d5PracticeSelectionRpcBridge === true
        && ROOT.shuffle === smartShuffleV53D5;
      return chainSettled;
    } catch (error){
      console.warn('V5.3 deterministic Practice selection engine could not be installed.',error);
      return false;
    }
  }

  function install(){
    installMultipartKeyOnce();
    if (installRpcChain()) return;
    let tries = 0;
    const retry = () => {
      tries += 1;
      if (installRpcChain() || tries >= 80) return;
      ROOT.setTimeout?.(retry,50);
    };
    ROOT.setTimeout?.(retry,50);
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined'){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})();
