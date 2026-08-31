/* V5.3D5 — Practice selection intelligence.
   Mixed Practice + Any difficulty only: preserves D3 repeat avoidance, then
   uses aggregate weak-area evidence, skill diversity and a soft Challenge cap.
   Explicit student strand/topic/difficulty choices, grading and Exam Mode stay unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d5PracticeSelectionInstalled) return;
  ROOT.__v53d5PracticeSelectionInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  let previousShuffle = null;

  function isOrdinaryPracticeRequest(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (rpcName === 'get_student_practice_questions_v53b' || rpcName === 'get_student_practice_questions_v53d3') return true;
    return rpcName === 'get_student_questions'
      && input.p_exam_year == null
      && (input.p_paper == null || trim(input.p_paper) === '');
  }

  function routeRpc(name,args={}){
    const input = args && typeof args === 'object' ? args : {};
    if (isOrdinaryPracticeRequest(name,input)) {
      return {
        name:'get_student_practice_questions_v53d5',
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

  function itemHistory(item){
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

  function evidenceLevel(percent,responses,minResponses){
    const n = Number(responses || 0);
    const p = Number(percent);
    if (!Number.isFinite(p) || n < minResponses) return 0;
    if (p < 60) return 2;
    if (p < 80) return 1;
    return 0;
  }

  function rowLearningNeed(row){
    if (!row) return {level:0,source:'none',percent:null,responses:0};
    const skillResponses = Number(row.practice_skill_scored_responses || 0);
    const skillPercent = Number(row.practice_skill_percent);
    if (skillResponses >= 2 && Number.isFinite(skillPercent)) {
      return {
        level:evidenceLevel(skillPercent,skillResponses,2),
        source:'skill',percent:skillPercent,responses:skillResponses
      };
    }
    const topicResponses = Number(row.practice_topic_scored_responses || 0);
    const topicPercent = Number(row.practice_topic_percent);
    if (topicResponses >= 3 && Number.isFinite(topicPercent)) {
      return {
        level:evidenceLevel(topicPercent,topicResponses,3),
        source:'topic',percent:topicPercent,responses:topicResponses
      };
    }
    return {level:0,source:'none',percent:null,responses:0};
  }

  function itemLearningNeed(item){
    const needs = itemRows(item).filter(Boolean).map(rowLearningNeed);
    if (!needs.length) return {level:0,source:'none',percent:null,responses:0};
    return needs.sort((a,b) => b.level-a.level || b.responses-a.responses)[0];
  }

  function topicKey(item){
    return `${norm(item?.strand || 'unclassified')}|${norm(item?.topic || 'unclassified')}`;
  }

  function skillKey(item){
    const skill = norm(item?.skill || item?.subtopic || 'general');
    return `${topicKey(item)}|${skill}`;
  }

  function itemDifficulty(item){
    return norm(item?.difficulty || 'standard') || 'standard';
  }

  function challengeLimit(count){
    const n = Math.max(1,Number(count) || 1);
    return Math.max(1,Math.floor(n*0.2));
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

  function difficultyRank(entry){
    if (entry.difficulty === 'challenge') return 2;
    if (entry.need.level >= 2) return entry.difficulty === 'foundation' ? 0 : 1;
    return entry.difficulty === 'standard' ? 0 : 1;
  }

  function adaptiveOrderPracticeItems(items,context={},rng=Math.random){
    const source = Array.isArray(items) ? items : [];
    if (!source.length) return [];
    if (!isAdaptiveContext(context)) return randomOrder(source,rng);

    const remaining = source.map((item,index) => {
      const history = itemHistory(item);
      const need = itemLearningNeed(item);
      const random = Number(rng());
      return {
        item,index,need,
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
    const ordered = [];
    const requestedCount = Math.max(1,Number(context.count) || 10);
    const maxChallenges = challengeLimit(requestedCount);
    let selectedChallenges = 0;

    while (remaining.length){
      const minSeen = Math.min(...remaining.map(entry => entry.seenCount));
      let candidates = remaining.filter(entry => entry.seenCount === minSeen);

      if (ordered.length < requestedCount && selectedChallenges >= maxChallenges) {
        const nonChallenge = candidates.filter(entry => entry.difficulty !== 'challenge');
        if (nonChallenge.length) candidates = nonChallenge;
      }

      const projectedLoads = candidates.map(entry => {
        const weight = 1 + (0.5 * entry.need.level);
        return ((topicSelections.get(entry.topic) || 0) + 1) / weight;
      });
      const minProjectedLoad = Math.min(...projectedLoads);
      candidates = candidates.filter((entry,i) => Math.abs(projectedLoads[i]-minProjectedLoad) < 1e-9);

      const highestNeed = Math.max(...candidates.map(entry => entry.need.level));
      candidates = candidates.filter(entry => entry.need.level === highestNeed);

      const minSkillSelections = Math.min(...candidates.map(entry => skillSelections.get(entry.skill) || 0));
      candidates = candidates.filter(entry => (skillSelections.get(entry.skill) || 0) === minSkillSelections);

      const bestDifficultyRank = Math.min(...candidates.map(difficultyRank));
      candidates = candidates.filter(entry => difficultyRank(entry) === bestDifficultyRank);

      const oldestSeen = Math.min(...candidates.map(entry => entry.lastSeenMs || 0));
      candidates = candidates.filter(entry => (entry.lastSeenMs || 0) === oldestSeen);

      candidates.sort((a,b) => a.random-b.random || a.index-b.index);
      const chosen = candidates[0];
      ordered.push(chosen.item);
      topicSelections.set(chosen.topic,(topicSelections.get(chosen.topic) || 0)+1);
      skillSelections.set(chosen.skill,(skillSelections.get(chosen.skill) || 0)+1);
      if (chosen.difficulty === 'challenge') selectedChallenges += 1;
      remaining.splice(remaining.indexOf(chosen),1);
    }

    return ordered;
  }

  function intelligentShuffle(items){
    const context = getSelectionContext();
    if (!isAdaptiveContext(context) && typeof previousShuffle === 'function') return previousShuffle(items);
    return adaptiveOrderPracticeItems(items,context,Math.random);
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
        const routed = routeRpc(name,args);
        return previousRpc(routed.name,routed.args,options);
      };
      Object.defineProperty(cloud,'__v53d5PreviousRpc',{value:previousRpc,writable:false,configurable:false});
      cloud.rpc = bridgedRpc;
      Object.defineProperty(cloud,'__v53d5PracticeSelectionRpcBridge',{value:true,writable:false,configurable:false});
      return true;
    } catch (error){
      console.warn('V5.3D5 Practice selection RPC bridge could not be installed.',error);
      return false;
    }
  }

  function install(){
    let tries = 0;
    const attempt = () => {
      tries += 1;
      installSelection();
      const rpcReady = installRpcBridge();
      let d3Settled = true;
      try {
        d3Settled = typeof cloud === 'undefined'
          || !cloud
          || cloud.__v53d3PracticeSelectionRpcBridge === true
          || tries >= 80;
      } catch { d3Settled = tries >= 80; }
      if (rpcReady && d3Settled) {
        installSelection();
        return true;
      }
      return tries >= 80;
    };
    if (attempt()) return;
    const timer = setInterval(() => {
      if (attempt()) clearInterval(timer);
    },50);
  }

  const api = Object.freeze({
    isOrdinaryPracticeRequest,
    routeRpc,
    itemHistory,
    evidenceLevel,
    rowLearningNeed,
    itemLearningNeed,
    topicKey,
    skillKey,
    itemDifficulty,
    challengeLimit,
    getSelectionContext,
    isAdaptiveContext,
    randomOrder,
    adaptiveOrderPracticeItems
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
