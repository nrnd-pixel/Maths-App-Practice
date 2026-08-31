/* V5.3D5 — Practice selection intelligence.
   Broad Mixed Practice only: preserves V5.3D3 repeat avoidance, gives the
   current weak area a controlled boost, caps Challenge exposure, and improves
   topic/skill variety. Explicit student filters remain authoritative. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d5PracticeSelectionInstalled) return;
  ROOT.__v53d5PracticeSelectionInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
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

  function isOrdinaryPracticeRequest(name,args={}){
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

  function itemHistory(item){
    const d3 = ROOT.V53D3PracticeSelection;
    if (d3 && typeof d3.itemHistory === 'function') return d3.itemHistory(item);
    let seenCount = 0;
    let lastSeenMs = 0;
    itemRows(item).filter(Boolean).forEach(row => {
      const seen = Number(row.practice_seen_count || 0);
      if (Number.isFinite(seen) && seen > seenCount) seenCount = seen;
      const time = Date.parse(row.practice_last_seen_at || '');
      if (Number.isFinite(time) && time > lastSeenMs) lastSeenMs = time;
    });
    return {seenCount,lastSeenMs};
  }

  function itemField(item,field){
    const direct = trim(item?.[field]);
    if (direct) return direct;
    const row = itemRows(item).find(part => trim(part?.[field]));
    return trim(row?.[field]);
  }

  function itemDifficulty(item){
    return norm(itemField(item,'difficulty') || 'standard');
  }

  function itemTopicKey(item){
    return `${norm(itemField(item,'strand') || 'unclassified')}|${norm(itemField(item,'topic') || 'unclassified')}`;
  }

  function itemSkillKey(item){
    return `${itemTopicKey(item)}|${norm(itemField(item,'skill') || 'unclassified')}`;
  }

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
    const d3 = ROOT.V53D3PracticeSelection;
    if (d3 && typeof d3.orderPracticeItems === 'function') return d3.orderPracticeItems(items,rng);
    const copy = Array.isArray(items) ? [...items] : [];
    for (let i=copy.length-1;i>0;i--){
      const raw = Number(rng());
      const safe = Number.isFinite(raw) ? Math.max(0,Math.min(0.999999999,raw)) : 0.5;
      const j = Math.floor(safe*(i+1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy;
  }

  function adaptiveOrder(items,{targetCount=10,recommendation=latestRecommendation,broadMixed=isBroadMixedState()}={},rng=Math.random){
    const source = Array.isArray(items) ? items : [];
    if (!source.length || !broadMixed) return fallbackOrder(source,rng);

    const limit = Math.min(source.length,Math.max(1,Number(targetCount) || 10));
    const maxChallenge = challengeCap(limit);
    const desiredFocus = focusTarget(limit,recommendation);
    const remaining = source.map((item,index) => {
      const history = itemHistory(item);
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

      const desiredFocusSoFar = Math.min(
        desiredFocus,
        Math.ceil((selected.length + 1) * 0.4)
      );
      if (focusSelected < desiredFocusSoFar){
        const focusCandidates = candidates.filter(entry => entry.focus);
        if (focusCandidates.length){
          candidates = focusCandidates;
          focusMode = true;
        }
      } else if (focusSelected >= desiredFocus){
        const nonFocus = candidates.filter(entry => !entry.focus);
        if (nonFocus.length) candidates = nonFocus;
      }

      if (focusMode){
        const bestDifficulty = Math.min(...candidates.map(entry =>
          difficultyRank(entry.difficulty,recommendation?.reason)
        ));
        candidates = candidates.filter(entry =>
          difficultyRank(entry.difficulty,recommendation?.reason) === bestDifficulty
        );
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

  function smartShuffle(items){
    const snapshot = currentState();
    return adaptiveOrder(items,{
      targetCount:Number(snapshot?.count || 10),
      recommendation:latestRecommendation,
      broadMixed:isBroadMixedState(snapshot)
    },Math.random);
  }

  function installSelection(){
    try { if (typeof shuffle !== 'undefined') shuffle = smartShuffle; } catch {}
    try { ROOT.shuffle = smartShuffle; } catch {}
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53d5PracticeSelectionRpcBridge === true) return true;

      const previousRpc = cloud.rpc.bind(cloud);
      const bridgedRpc = function(name,args,options){
        const input = args && typeof args === 'object' ? args : {};
        if (!isOrdinaryPracticeRequest(name,input)) return previousRpc(name,args,options);

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
      Object.defineProperty(cloud,'__v53d5PracticeSelectionRpcBridge',{value:true,writable:false,configurable:false});
      return true;
    } catch (error){
      console.warn('V5.3D5 Practice selection bridge could not be installed.',error);
      return false;
    }
  }

  function install(){
    installSelection();
    if (installRpcBridge()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      installSelection();
      if (installRpcBridge() || tries >= 80) clearInterval(timer);
    },50);
  }

  const api = Object.freeze({
    isBroadMixedState,
    isOrdinaryPracticeRequest,
    itemHistory,
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

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53D5PracticeSelection',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
