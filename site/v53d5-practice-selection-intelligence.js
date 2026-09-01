/* V5.3D5 — Practice selection intelligence.
   Mixed Practice + Any difficulty only. Builds on V5.3D3 exposure history and
   V5.3D4 recommendation evidence without adding a new question-metadata RPC.
   Explicit student strand/topic/difficulty choices, grading and Exam Mode stay unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d5PracticeSelectionInstalled) return;
  ROOT.__v53d5PracticeSelectionInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  let previousShuffle = null;
  let latestRecommendation = null;

  function isOrdinaryPracticeRequest(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (rpcName === 'get_student_practice_questions_v53b'
        || rpcName === 'get_student_practice_questions_v53d3') return true;
    return rpcName === 'get_student_questions'
      && input.p_exam_year == null
      && (input.p_paper == null || trim(input.p_paper) === '');
  }

  function itemRows(item){
    return item?._kind === 'multipart' && Array.isArray(item.parts) && item.parts.length
      ? item.parts
      : [item];
  }

  function fallbackItemHistory(item){
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

  function itemHistory(item){
    try {
      const api = ROOT.V53D3PracticeSelection;
      if (api && typeof api.itemHistory === 'function') return api.itemHistory(item);
    } catch {}
    return fallbackItemHistory(item);
  }

  function topicKey(item){
    return `${norm(item?.strand || 'unclassified')}|${norm(item?.topic || 'unclassified')}`;
  }

  function skillKey(item){
    const skill = norm(item?.skill || item?.subtopic || 'general');
    return `${topicKey(item)}|${skill}`;
  }

  function itemDifficulty(item){
    const value = norm(item?.difficulty || 'standard');
    return ['foundation','standard','challenge'].includes(value) ? value : 'standard';
  }

  function getSelectionContext(){
    const fallback = {strand:'all',topic:'all',difficulty:'all',count:10};
    try {
      if (typeof state !== 'undefined' && state) {
        return {
          strand:norm(state.strand || 'all') || 'all',
          topic:norm(state.topic || 'all') || 'all',
          difficulty:norm(state.difficulty || 'all') || 'all',
          count:Math.max(1,Number(state.count) || 10)
        };
      }
    } catch {}
    try {
      if (typeof document !== 'undefined') {
        return {
          strand:norm(document.getElementById('strand-filter')?.value || 'all') || 'all',
          topic:norm(document.getElementById('topic-filter')?.value || 'all') || 'all',
          difficulty:norm(document.getElementById('difficulty-filter')?.value || 'all') || 'all',
          count:Math.max(1,Number(document.getElementById('question-count')?.value) || 10)
        };
      }
    } catch {}
    return fallback;
  }

  function isAdaptiveContext(context={}){
    return norm(context.strand || 'all') === 'all'
      && norm(context.topic || 'all') === 'all'
      && norm(context.difficulty || 'all') === 'all';
  }

  function recommendationNeed(recommendation){
    const rec = recommendation && typeof recommendation === 'object' ? recommendation : null;
    if (!rec) return {level:0,key:'',strand:'',topic:'',percent:null};
    const percent = Number(rec.performance_percent);
    const strand = norm(rec.focus_strand || '');
    const topic = norm(rec.focus_topic || '');
    if (!strand || !topic || !Number.isFinite(percent)) {
      return {level:0,key:'',strand,topic,percent:Number.isFinite(percent)?percent:null};
    }
    const level = percent < 60 ? 2 : percent < 80 ? 1 : 0;
    return {level,key:`${strand}|${topic}`,strand,topic,percent};
  }

  function weakAreaLimit(count){
    const n = Math.max(1,Number(count) || 1);
    return Math.max(1,Math.ceil(n*0.4));
  }

  function challengeLimit(count){
    const n = Math.max(1,Number(count) || 1);
    return Math.max(1,Math.floor(n*0.2));
  }

  function difficultyTargets(items,count){
    const source = Array.isArray(items) ? items : [];
    const n = Math.max(1,Math.min(Number(count) || 1,source.length || 1));
    const totals = {foundation:0,standard:0,challenge:0};
    source.forEach(item => { totals[itemDifficulty(item)] += 1; });
    const total = Math.max(1,source.length);
    return {
      foundation:n*totals.foundation/total,
      standard:n*totals.standard/total,
      challenge:Math.min(n*totals.challenge/total,challengeLimit(n))
    };
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

  function d3Order(items,rng=Math.random){
    try {
      const api = ROOT.V53D3PracticeSelection;
      if (api && typeof api.orderPracticeItems === 'function') return api.orderPracticeItems(items,rng);
    } catch {}
    if (typeof previousShuffle === 'function' && rng === Math.random) return previousShuffle(items);
    return randomOrder(items,rng);
  }

  function adaptiveOrderPracticeItems(items,context={},recommendation=null,rng=Math.random){
    const source = Array.isArray(items) ? items : [];
    if (!source.length) return [];
    if (!isAdaptiveContext(context)) return d3Order(source,rng);

    const requestedCount = Math.max(1,Math.min(Number(context.count) || 10,source.length));
    const need = recommendationNeed(recommendation);
    const maxWeak = need.level > 0 ? weakAreaLimit(requestedCount) : 0;
    const maxChallenges = challengeLimit(requestedCount);
    const targets = difficultyTargets(source,requestedCount);
    const remaining = source.map((item,index) => {
      const history = itemHistory(item);
      const random = Number(rng());
      return {
        item,index,
        topic:topicKey(item),
        skill:skillKey(item),
        difficulty:itemDifficulty(item),
        seenCount:history.seenCount,
        lastSeenMs:history.lastSeenMs,
        random:Number.isFinite(random) ? random : 0.5
      };
    });

    const topicSelections = new Map();
    const skillSelections = new Map();
    const difficultySelections = {foundation:0,standard:0,challenge:0};
    const ordered = [];
    let weakSelections = 0;

    while (remaining.length){
      const minSeen = Math.min(...remaining.map(entry => entry.seenCount));
      let candidates = remaining.filter(entry => entry.seenCount === minSeen);

      if (ordered.length < requestedCount && difficultySelections.challenge >= maxChallenges) {
        const nonChallenge = candidates.filter(entry => entry.difficulty !== 'challenge');
        if (nonChallenge.length) candidates = nonChallenge;
      }

      const projectedLoads = candidates.map(entry => {
        const isWeak = maxWeak > weakSelections && entry.topic === need.key;
        const boost = isWeak ? (need.level === 2 ? 1.75 : 1.4) : 1;
        return ((topicSelections.get(entry.topic) || 0)+1)/boost;
      });
      const minProjectedLoad = Math.min(...projectedLoads);
      candidates = candidates.filter((entry,i) => Math.abs(projectedLoads[i]-minProjectedLoad) < 1e-9);

      const deficits = candidates.map(entry => {
        const target = Number(targets[entry.difficulty] || 0);
        return target - Number(difficultySelections[entry.difficulty] || 0);
      });
      const bestDeficit = Math.max(...deficits);
      candidates = candidates.filter((entry,i) => Math.abs(deficits[i]-bestDeficit) < 1e-9);

      const minSkillSelections = Math.min(...candidates.map(entry => skillSelections.get(entry.skill) || 0));
      candidates = candidates.filter(entry => (skillSelections.get(entry.skill) || 0) === minSkillSelections);

      const oldestSeen = Math.min(...candidates.map(entry => entry.lastSeenMs || 0));
      candidates = candidates.filter(entry => (entry.lastSeenMs || 0) === oldestSeen);

      candidates.sort((a,b) => a.random-b.random || a.index-b.index);
      const chosen = candidates[0];
      ordered.push(chosen.item);
      topicSelections.set(chosen.topic,(topicSelections.get(chosen.topic) || 0)+1);
      skillSelections.set(chosen.skill,(skillSelections.get(chosen.skill) || 0)+1);
      difficultySelections[chosen.difficulty] += 1;
      if (maxWeak > weakSelections && chosen.topic === need.key) weakSelections += 1;
      remaining.splice(remaining.indexOf(chosen),1);
    }

    return ordered;
  }

  function intelligentShuffle(items){
    const context = getSelectionContext();
    if (!isAdaptiveContext(context)) return d3Order(items,Math.random);
    return adaptiveOrderPracticeItems(items,context,latestRecommendation,Math.random);
  }

  function cacheRecommendation(value){
    latestRecommendation = value && typeof value === 'object' ? value : null;
    return latestRecommendation;
  }

  function getCachedRecommendation(){
    return latestRecommendation;
  }

  function installSelection(){
    try {
      if (typeof shuffle !== 'undefined') {
        if (!previousShuffle && shuffle !== intelligentShuffle) previousShuffle = shuffle;
        shuffle = intelligentShuffle;
      }
    } catch {}
    try { ROOT.shuffle = intelligentShuffle; } catch {}
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53d5PracticeSelectionRpcBridge === true) return true;
      const previousRpc = cloud.rpc.bind(cloud);
      const bridgedRpc = function(name,args,options){
        const input = args && typeof args === 'object' ? args : {};
        if (!isOrdinaryPracticeRequest(name,input) || !isAdaptiveContext(getSelectionContext())) {
          return previousRpc(name,input,options);
        }

        const token = input.p_access_token;
        const primary = previousRpc(name,input,options);
        if (!token) {
          cacheRecommendation(null);
          return primary;
        }

        const recommendation = previousRpc(
          'get_student_practice_recommendation',
          {p_access_token:token},
          options
        );

        return Promise.all([
          Promise.resolve(primary),
          Promise.resolve(recommendation).catch(() => null)
        ]).then(([primaryResult,recommendationResult]) => {
          if (recommendationResult && !recommendationResult.error) {
            cacheRecommendation(recommendationResult.data);
          } else {
            cacheRecommendation(null);
          }
          return primaryResult;
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
    let tries = 0;
    const attempt = () => {
      tries += 1;
      installSelection();
      const rpcReady = installRpcBridge();
      return rpcReady || tries >= 80;
    };
    if (attempt()) return;
    const timer = setInterval(() => {
      if (attempt()) clearInterval(timer);
    },50);
  }

  const api = Object.freeze({
    isOrdinaryPracticeRequest,
    itemHistory,
    topicKey,
    skillKey,
    itemDifficulty,
    getSelectionContext,
    isAdaptiveContext,
    recommendationNeed,
    weakAreaLimit,
    challengeLimit,
    difficultyTargets,
    randomOrder,
    adaptiveOrderPracticeItems,
    cacheRecommendation,
    getCachedRecommendation
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
