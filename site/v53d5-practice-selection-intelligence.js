/* V5.3D5 — Practice selection intelligence.
   Broad Mixed Practice only: preserves V5.3D3 repeat avoidance, adds a
   controlled weak-area boost, keeps strand/topic variety, and limits Challenge
   density when enough non-Challenge questions exist in the same exposure tier.
   Explicit strand/topic/difficulty choices, grading, assignments and Exam Mode
   remain unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d5PracticeSelectionIntelligenceInstalled) return;
  ROOT.__v53d5PracticeSelectionIntelligenceInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');

  function currentPracticeState(){
    try {
      return typeof state !== 'undefined' && state && typeof state === 'object'
        ? state
        : null;
    } catch {
      return null;
    }
  }

  function isBroadMixedState(value){
    const s = value && typeof value === 'object' ? value : {};
    return norm(s.strand || 'all') === 'all'
      && norm(s.topic || 'all') === 'all'
      && norm(s.difficulty || 'all') === 'all';
  }

  function isOrdinaryPracticeQuestionRequest(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (['get_student_practice_questions_v53b','get_student_practice_questions_v53d3'].includes(rpcName)) return true;
    return rpcName === 'get_student_questions'
      && input.p_exam_year == null
      && (input.p_paper == null || trim(input.p_paper) === '');
  }

  function itemRows(item){
    return item?._kind === 'multipart' && Array.isArray(item.parts) && item.parts.length
      ? item.parts
      : [item];
  }

  function recommendationMeta(rec){
    const r = rec && typeof rec === 'object' ? rec : {};
    return {
      v53d5_focus_reason:trim(r.reason),
      v53d5_focus_scope:trim(r.practice_scope),
      v53d5_focus_strand:trim(r.practice_strand || r.focus_strand),
      v53d5_focus_topic:trim(r.practice_topic || r.focus_topic),
      v53d5_focus_percent:r.performance_percent == null ? null : Number(r.performance_percent),
      v53d5_focus_scored_responses:Number(r.scored_responses || 0)
    };
  }

  function enrichQuestionRows(rows,rec){
    if (!Array.isArray(rows)) return rows;
    const meta = recommendationMeta(rec);
    return rows.map(row => row && typeof row === 'object' ? {...row,...meta} : row);
  }

  function recommendationFromItems(items){
    for (const item of Array.isArray(items) ? items : []){
      for (const row of itemRows(item)){
        if (!row || !Object.prototype.hasOwnProperty.call(row,'v53d5_focus_reason')) continue;
        return {
          reason:trim(row.v53d5_focus_reason),
          scope:trim(row.v53d5_focus_scope),
          strand:trim(row.v53d5_focus_strand),
          topic:trim(row.v53d5_focus_topic),
          percent:row.v53d5_focus_percent == null ? null : Number(row.v53d5_focus_percent),
          scoredResponses:Number(row.v53d5_focus_scored_responses || 0)
        };
      }
    }
    return null;
  }

  function hasAdaptiveFocus(rec){
    if (!rec || !['needs_attention','developing'].includes(norm(rec.reason))) return false;
    if (Number(rec.scoredResponses || 0) < 2) return false;
    return !!norm(rec.strand);
  }

  function focusMatches(item,rec){
    if (!hasAdaptiveFocus(rec)) return false;
    const rows = itemRows(item).filter(Boolean);
    const scope = norm(rec.scope);
    const focusStrand = norm(rec.strand);
    const focusTopic = norm(rec.topic);
    return rows.some(row => {
      if (norm(row.strand) !== focusStrand) return false;
      if (scope === 'topic' && focusTopic && focusTopic !== 'all') return norm(row.topic) === focusTopic;
      return true;
    });
  }

  function itemDifficulty(item){
    const direct = norm(item?.difficulty);
    if (direct) return direct;
    const row = itemRows(item).find(Boolean);
    return norm(row?.difficulty || 'standard');
  }

  function isChallenge(item){
    return itemDifficulty(item) === 'challenge';
  }

  function fallbackHistory(item){
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

  function fallbackBalanceKey(item){
    const row = itemRows(item).find(Boolean) || item || {};
    return `${norm(row.strand || 'unclassified')}|${norm(row.topic || 'unclassified')}`;
  }

  function fallbackRandomOrder(items,rng=Math.random){
    const copy = Array.isArray(items) ? [...items] : [];
    for (let i=copy.length-1;i>0;i--){
      const r = Number(rng());
      const safe = Number.isFinite(r) ? Math.max(0,Math.min(0.999999999,r)) : 0.5;
      const j = Math.floor(safe*(i+1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy;
  }

  function d3Api(){
    return ROOT.V53D3PracticeSelection || null;
  }

  function historyFor(item,api){
    return api && typeof api.itemHistory === 'function'
      ? api.itemHistory(item)
      : fallbackHistory(item);
  }

  function balanceKeyFor(item,api){
    return api && typeof api.balanceKey === 'function'
      ? api.balanceKey(item)
      : fallbackBalanceKey(item);
  }

  function d3Order(items,rng,api){
    if (api && typeof api.orderPracticeItems === 'function') return api.orderPracticeItems(items,rng);
    return fallbackRandomOrder(items,rng);
  }

  function orderIntelligentItems(items,practiceState={},rng=Math.random,api=d3Api()){
    const source = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!source.length) return [];
    if (!isBroadMixedState(practiceState)) return d3Order(source,rng,api);

    const target = Math.max(1,Math.min(source.length,Number(practiceState.count || 10) || 10));
    const rec = recommendationFromItems(source);
    const adaptiveFocus = hasAdaptiveFocus(rec);
    const focusLimit = adaptiveFocus ? Math.min(target,Math.ceil(target*0.4)) : 0;
    const challengeLimit = Math.floor(target*0.2);

    const remaining = source.map((item,index) => {
      const history = historyFor(item,api);
      const random = Number(rng());
      return {
        item,
        index,
        key:balanceKeyFor(item,api),
        seenCount:Number(history?.seenCount || 0),
        lastSeenMs:Number(history?.lastSeenMs || 0),
        focus:adaptiveFocus && focusMatches(item,rec),
        challenge:isChallenge(item),
        random:Number.isFinite(random) ? random : 0.5
      };
    });

    const selected = [];
    const selectedByKey = new Map();
    let focusUsed = 0;
    let challengeUsed = 0;

    while (selected.length < target && remaining.length){
      const minSeen = Math.min(...remaining.map(entry => entry.seenCount));
      let candidates = remaining.filter(entry => entry.seenCount === minSeen);

      if (challengeUsed >= challengeLimit){
        const nonChallenge = candidates.filter(entry => !entry.challenge);
        if (nonChallenge.length) candidates = nonChallenge;
      }

      if (adaptiveFocus){
        const desiredFocusByNow = Math.min(
          focusLimit,
          Math.floor(((selected.length + 1) * focusLimit) / target)
        );
        const focusCandidates = candidates.filter(entry => entry.focus);
        const nonFocusCandidates = candidates.filter(entry => !entry.focus);
        if (focusUsed < desiredFocusByNow && focusCandidates.length) candidates = focusCandidates;
        else if (focusUsed >= focusLimit && nonFocusCandidates.length) candidates = nonFocusCandidates;
      }

      const minSelectedForKey = Math.min(...candidates.map(entry => selectedByKey.get(entry.key) || 0));
      candidates = candidates.filter(entry => (selectedByKey.get(entry.key) || 0) === minSelectedForKey);
      const oldestSeen = Math.min(...candidates.map(entry => entry.lastSeenMs || 0));
      candidates = candidates
        .filter(entry => (entry.lastSeenMs || 0) === oldestSeen)
        .sort((a,b) => a.random-b.random || a.index-b.index);

      const chosen = candidates[0];
      selected.push(chosen.item);
      if (chosen.focus) focusUsed += 1;
      if (chosen.challenge) challengeUsed += 1;
      selectedByKey.set(chosen.key,(selectedByKey.get(chosen.key) || 0)+1);
      remaining.splice(remaining.indexOf(chosen),1);
    }

    const tail = d3Order(remaining.map(entry => entry.item),rng,api);
    return [...selected,...tail];
  }

  function smartShuffle(items){
    return orderIntelligentItems(items,currentPracticeState() || {},Math.random,d3Api());
  }

  function installSelection(){
    const api = d3Api();
    if (!api || typeof api.orderPracticeItems !== 'function') return false;
    try { if (typeof shuffle !== 'undefined') shuffle = smartShuffle; } catch {}
    try { ROOT.shuffle = smartShuffle; } catch {}
    return true;
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53d5PracticeSelectionIntelligenceRpcBridge === true) return true;
      const previousRpc = cloud.rpc.bind(cloud);
      const bridgedRpc = async function(name,args,options){
        const input = args && typeof args === 'object' ? args : {};
        if (!isBroadMixedState(currentPracticeState()) || !isOrdinaryPracticeQuestionRequest(name,input)){
          return previousRpc(name,args,options);
        }

        const questionPromise = previousRpc(name,args,options);
        const token = trim(input.p_access_token);
        if (!token) return questionPromise;

        let recommendationResult = null;
        try {
          recommendationResult = await previousRpc(
            'get_student_practice_recommendation_v53d4',
            {p_access_token:token}
          );
        } catch (error){
          console.warn('V5.3D5 weak-area signal could not be loaded; using V5.3D3 selection.',error);
        }

        const questionResult = await questionPromise;
        if (!questionResult || questionResult.error || !Array.isArray(questionResult.data)) return questionResult;
        if (!recommendationResult || recommendationResult.error || !recommendationResult.data) return questionResult;

        return {
          ...questionResult,
          data:enrichQuestionRows(questionResult.data,recommendationResult.data)
        };
      };
      Object.defineProperty(cloud,'__v53d5PreviousRpc',{value:previousRpc,writable:false,configurable:false});
      cloud.rpc = bridgedRpc;
      Object.defineProperty(cloud,'__v53d5PracticeSelectionIntelligenceRpcBridge',{value:true,writable:false,configurable:false});
      return true;
    } catch (error){
      console.warn('V5.3D5 Practice selection intelligence RPC bridge could not be installed.',error);
      return false;
    }
  }

  function install(){
    const selectionReady = installSelection();
    const bridgeReady = installRpcBridge();
    if (selectionReady && bridgeReady) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const s = installSelection();
      const b = installRpcBridge();
      if ((s && b) || tries >= 80) clearInterval(timer);
    },50);
  }

  const api = Object.freeze({
    isBroadMixedState,
    isOrdinaryPracticeQuestionRequest,
    recommendationMeta,
    enrichQuestionRows,
    recommendationFromItems,
    hasAdaptiveFocus,
    focusMatches,
    itemDifficulty,
    isChallenge,
    orderIntelligentItems
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53D5PracticeSelectionIntelligence',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
