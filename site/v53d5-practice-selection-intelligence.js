/* V5.3D5 — Practice selection intelligence.
   True Mixed Practice + Any difficulty only. Builds on V5.3D3 repeat
   avoidance, then gently weights weak/developing topics, improves skill
   variety, and caps Challenge density when same-exposure alternatives exist.
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

  function shouldUseIntelligence(value=currentPracticeState()){
    const s = value && typeof value === 'object' ? value : {};
    return norm(s.strand || 'all') === 'all'
      && norm(s.topic || 'all') === 'all'
      && norm(s.difficulty || 'all') === 'all'
      && !trim(s.topicalSource);
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

  function d3Api(){
    return ROOT.V53D3PracticeSelection || null;
  }

  function itemHistory(item,api=d3Api()){
    if (api && typeof api.itemHistory === 'function') return api.itemHistory(item);
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

  function itemField(item,field){
    const direct = trim(item?.[field]);
    if (direct) return direct;
    const row = itemRows(item).find(part => trim(part?.[field]));
    return trim(row?.[field]);
  }

  function topicKey(item){
    return `${norm(itemField(item,'strand') || 'unclassified')}|${norm(itemField(item,'topic') || 'unclassified')}`;
  }

  function skillKey(item){
    const skills = [...new Set(itemRows(item)
      .map(row => norm(row?.skill || row?.subtopic || 'general'))
      .filter(Boolean))]
      .sort();
    return `${topicKey(item)}|${skills.join('+') || 'general'}`;
  }

  function itemDifficulty(item){
    const rows = itemRows(item).filter(Boolean);
    if (rows.some(row => norm(row.difficulty) === 'challenge')) return 'challenge';
    if (rows.some(row => norm(row.difficulty) === 'standard')) return 'standard';
    if (rows.some(row => norm(row.difficulty) === 'foundation')) return 'foundation';
    return norm(item?.difficulty || 'standard') || 'standard';
  }

  function topicEvidence(item){
    const rows = itemRows(item).filter(Boolean);
    const evidence = rows
      .filter(row => Object.prototype.hasOwnProperty.call(row,'practice_topic_percent'))
      .map(row => ({
        percent:row.practice_topic_percent == null ? null : Number(row.practice_topic_percent),
        scored:Number(row.practice_topic_scored_responses || 0)
      }));
    if (!evidence.length) return {available:false,percent:null,scored:0};
    const scored = Math.max(...evidence.map(row => Number.isFinite(row.scored) ? row.scored : 0),0);
    const percents = evidence.map(row => row.percent).filter(Number.isFinite);
    const percent = percents.length ? Math.min(...percents) : null;
    return {available:true,percent,scored};
  }

  function learningWeight(evidence){
    if (!evidence || Number(evidence.scored || 0) < 2 || !Number.isFinite(evidence.percent)) return 1;
    if (evidence.percent < 60) return 1.5;
    if (evidence.percent < 80) return 1.2;
    return 0.9;
  }

  function isWeakOrDeveloping(evidence){
    return !!evidence
      && Number(evidence.scored || 0) >= 2
      && Number.isFinite(evidence.percent)
      && evidence.percent < 80;
  }

  function difficultyRank(difficulty,evidence){
    const d = norm(difficulty || 'standard');
    const percent = Number(evidence?.percent);
    const scored = Number(evidence?.scored || 0);
    if (scored >= 2 && Number.isFinite(percent) && percent < 60)
      return d === 'foundation' ? 0 : d === 'standard' ? 1 : 2;
    if (scored >= 2 && Number.isFinite(percent) && percent < 80)
      return d === 'standard' ? 0 : d === 'foundation' ? 1 : 2;
    if (scored >= 2 && Number.isFinite(percent) && percent >= 80)
      return d === 'standard' ? 0 : d === 'challenge' ? 1 : 2;
    return d === 'standard' ? 0 : d === 'foundation' ? 1 : 2;
  }

  function challengeCap(targetCount){
    const count = Math.max(1,Number(targetCount) || 1);
    return Math.max(1,Math.floor(count*0.2));
  }

  function weakAreaCap(targetCount){
    const count = Math.max(1,Number(targetCount) || 1);
    return Math.max(1,Math.ceil(count*0.6));
  }

  function fallbackRandomOrder(items,rng=Math.random){
    const copy = Array.isArray(items) ? [...items] : [];
    for (let i=copy.length-1;i>0;i--){
      const raw = Number(rng());
      const safe = Number.isFinite(raw) ? Math.max(0,Math.min(0.999999999,raw)) : 0.5;
      const j = Math.floor(safe*(i+1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy;
  }

  function d3Order(items,rng=Math.random,api=d3Api()){
    if (api && typeof api.orderPracticeItems === 'function') return api.orderPracticeItems(items,rng);
    return fallbackRandomOrder(items,rng);
  }

  function orderIntelligentMixed(items,practiceState={},rng=Math.random,api=d3Api()){
    const source = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!source.length) return [];
    if (!shouldUseIntelligence(practiceState)) return d3Order(source,rng,api);
    if (!source.some(item => topicEvidence(item).available)) return d3Order(source,rng,api);

    const target = Math.max(1,Math.min(source.length,Number(practiceState.count || 10) || 10));
    const maxChallenge = challengeCap(target);
    const maxWeak = weakAreaCap(target);
    const remaining = source.map((item,index) => {
      const history = itemHistory(item,api);
      const evidence = topicEvidence(item);
      const random = Number(rng());
      return {
        item,index,evidence,
        topic:topicKey(item),
        skill:skillKey(item),
        difficulty:itemDifficulty(item),
        seenCount:Number(history?.seenCount || 0),
        lastSeenMs:Number(history?.lastSeenMs || 0),
        weak:isWeakOrDeveloping(evidence),
        random:Number.isFinite(random) ? random : 0.5
      };
    });

    const selected = [];
    const selectedByTopic = new Map();
    const selectedBySkill = new Map();
    let challengeUsed = 0;
    let weakUsed = 0;

    while (selected.length < target && remaining.length){
      // Preserve V5.3D3's strongest rule: never select a more-seen item while
      // a less-seen item remains available.
      const minSeen = Math.min(...remaining.map(entry => entry.seenCount));
      let candidates = remaining.filter(entry => entry.seenCount === minSeen);

      if (challengeUsed >= maxChallenge){
        const nonChallenge = candidates.filter(entry => entry.difficulty !== 'challenge');
        if (nonChallenge.length) candidates = nonChallenge;
      }

      if (weakUsed >= maxWeak){
        const nonWeak = candidates.filter(entry => !entry.weak);
        if (nonWeak.length) candidates = nonWeak;
      }

      const topicOptions = [...new Set(candidates.map(entry => entry.topic))]
        .map(key => {
          const rows = candidates.filter(entry => entry.topic === key);
          const evidence = rows[0]?.evidence || {percent:null,scored:0};
          const selectedCount = selectedByTopic.get(key) || 0;
          const percent = Number.isFinite(evidence.percent) ? evidence.percent : 75;
          return {
            key,evidence,
            load:(selectedCount + 0.25) / learningWeight(evidence),
            percent,
            scored:Number(evidence.scored || 0)
          };
        })
        .sort((a,b) => a.load-b.load
          || a.percent-b.percent
          || b.scored-a.scored
          || a.key.localeCompare(b.key));

      const chosenTopic = topicOptions[0];
      candidates = candidates.filter(entry => entry.topic === chosenTopic.key);

      const bestDifficulty = Math.min(...candidates.map(entry => difficultyRank(entry.difficulty,entry.evidence)));
      candidates = candidates.filter(entry => difficultyRank(entry.difficulty,entry.evidence) === bestDifficulty);

      const minSkillCount = Math.min(...candidates.map(entry => selectedBySkill.get(entry.skill) || 0));
      candidates = candidates.filter(entry => (selectedBySkill.get(entry.skill) || 0) === minSkillCount);

      const oldestSeen = Math.min(...candidates.map(entry => entry.lastSeenMs || 0));
      candidates = candidates
        .filter(entry => (entry.lastSeenMs || 0) === oldestSeen)
        .sort((a,b) => a.random-b.random || a.index-b.index);

      const chosen = candidates[0];
      selected.push(chosen.item);
      selectedByTopic.set(chosen.topic,(selectedByTopic.get(chosen.topic) || 0)+1);
      selectedBySkill.set(chosen.skill,(selectedBySkill.get(chosen.skill) || 0)+1);
      if (chosen.difficulty === 'challenge') challengeUsed += 1;
      if (chosen.weak) weakUsed += 1;
      remaining.splice(remaining.indexOf(chosen),1);
    }

    // The app slices only the first requested session size. Keep the remaining
    // output in accepted D3 order so callers that inspect the whole array still
    // receive a stable repeat-aware fallback ordering.
    const tail = d3Order(remaining.map(entry => entry.item),rng,api);
    return [...selected,...tail];
  }

  function smartShuffle(items){
    return orderIntelligentMixed(items,currentPracticeState() || {},Math.random,d3Api());
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
      const bridgedRpc = function(name,args,options){
        const input = args && typeof args === 'object' ? args : {};
        if (!isOrdinaryPracticeQuestionRequest(name,input)) return previousRpc(name,args,options);
        return previousRpc('get_student_practice_questions_v53d5',{
          p_access_token:input.p_access_token,
          p_year_level:input.p_year_level
        },options);
      };
      Object.defineProperty(cloud,'__v53d5PreviousRpc',{value:previousRpc,writable:false,configurable:false});
      cloud.rpc = bridgedRpc;
      Object.defineProperty(cloud,'__v53d5PracticeSelectionIntelligenceRpcBridge',{value:true,writable:false,configurable:false});
      return true;
    } catch (error){
      console.warn('V5.3D5 Practice selection intelligence bridge could not be installed.',error);
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
    shouldUseIntelligence,
    isOrdinaryPracticeQuestionRequest,
    itemHistory,
    topicKey,
    skillKey,
    itemDifficulty,
    topicEvidence,
    learningWeight,
    isWeakOrDeveloping,
    difficultyRank,
    challengeCap,
    weakAreaCap,
    orderIntelligentMixed
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
