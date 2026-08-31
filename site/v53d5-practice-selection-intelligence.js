/* V5.3D5 — Practice selection intelligence.
   Mixed Practice + Any difficulty only. Builds on V5.3D3 repeat avoidance,
   then gently weights weak topics, preserves skill variety, and uses a soft
   performance-aware difficulty mix. Explicit strand/topic/difficulty choices,
   grading, assignments and Exam Mode remain unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d5PracticeSelectionInstalled) return;
  ROOT.__v53d5PracticeSelectionInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  let latestProfile = null;

  function itemRows(item){
    return item?._kind === 'multipart' && Array.isArray(item.parts) && item.parts.length
      ? item.parts
      : [item];
  }

  function itemHistory(item){
    if (ROOT.V53D3PracticeSelection?.itemHistory)
      return ROOT.V53D3PracticeSelection.itemHistory(item);
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

  function topicKey(item){
    return `${norm(item?.strand || 'unclassified')}|${norm(item?.topic || 'unclassified')}`;
  }

  function skillKey(item){
    const skill = norm(item?.skill || item?.subtopic || 'general');
    return `${topicKey(item)}|${skill}`;
  }

  function itemDifficulty(item){
    const rows = itemRows(item).filter(Boolean);
    return norm(item?.difficulty || rows[0]?.difficulty || 'standard') || 'standard';
  }

  function profileMap(profile){
    const map = new Map();
    const topics = Array.isArray(profile?.topics) ? profile.topics : [];
    topics.forEach(row => {
      const key = `${norm(row?.strand)}|${norm(row?.topic)}`;
      if (key !== '|') map.set(key,row || {});
    });
    return map;
  }

  function topicWeight(row){
    const percent = Number(row?.performance_percent);
    if (!Number.isFinite(percent)) return 1;
    if (percent < 60) return 1.6;
    if (percent < 80) return 1.25;
    return 0.85;
  }

  function topicTiePercent(row){
    const percent = Number(row?.performance_percent);
    return Number.isFinite(percent) ? percent : 75;
  }

  function difficultyTargets(row){
    const percent = Number(row?.performance_percent);
    if (!Number.isFinite(percent))
      return {foundation:0.15,standard:0.80,challenge:0.05};
    if (percent < 60)
      return {foundation:0.45,standard:0.54,challenge:0.01};
    if (percent < 80)
      return {foundation:0.20,standard:0.70,challenge:0.10};
    return {foundation:0.10,standard:0.70,challenge:0.20};
  }

  function shouldUseIntelligence(sessionState){
    const s = sessionState && typeof sessionState === 'object' ? sessionState : {};
    return norm(s.strand || 'all') === 'all'
      && norm(s.topic || 'all') === 'all'
      && norm(s.difficulty || 'all') === 'all';
  }

  function currentSessionState(){
    try { return typeof state !== 'undefined' ? state : null; } catch { return null; }
  }

  function isOrdinaryPracticeQuestionRequest(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (rpcName === 'get_student_practice_questions_v53b'
        || rpcName === 'get_student_practice_questions_v53d3') return true;
    return rpcName === 'get_student_questions'
      && input.p_exam_year == null
      && (input.p_paper == null || trim(input.p_paper) === '');
  }

  function fallbackOrder(items,rng=Math.random){
    if (ROOT.V53D3PracticeSelection?.orderPracticeItems)
      return ROOT.V53D3PracticeSelection.orderPracticeItems(items,rng);
    const copy = Array.isArray(items) ? [...items] : [];
    for (let i=copy.length-1;i>0;i--){
      const r = Number(rng());
      const safe = Number.isFinite(r) ? Math.max(0,Math.min(0.999999999,r)) : 0.5;
      const j = Math.floor(safe*(i+1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy;
  }

  function orderIntelligentMixed(items,profile,rng=Math.random){
    const source = Array.isArray(items) ? items : [];
    if (!source.length) return [];
    const pMap = profileMap(profile);
    if (!pMap.size) return fallbackOrder(source,rng);

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

    const selectedByTopic = new Map();
    const selectedBySkill = new Map();
    const selectedDifficultyByTopic = new Map();
    const ordered = [];

    while (remaining.length){
      // D3 invariant: never choose a more-seen item while a less-seen one exists.
      const minSeen = Math.min(...remaining.map(entry => entry.seenCount));
      const exposureTier = remaining.filter(entry => entry.seenCount === minSeen);

      const topicCandidates = [...new Set(exposureTier.map(entry => entry.topic))]
        .map(key => {
          const row = pMap.get(key) || null;
          const selected = selectedByTopic.get(key) || 0;
          return {
            key,row,selected,
            load:selected / topicWeight(row),
            tiePercent:topicTiePercent(row),
            evidence:Number(row?.scored_responses || 0)
          };
        })
        .sort((a,b) => a.load-b.load
          || a.tiePercent-b.tiePercent
          || b.evidence-a.evidence
          || a.key.localeCompare(b.key));

      const chosenTopic = topicCandidates[0];
      let finalists = exposureTier.filter(entry => entry.topic === chosenTopic.key);
      const targets = difficultyTargets(chosenTopic.row);
      const topicSelected = selectedByTopic.get(chosenTopic.key) || 0;
      const diffCounts = selectedDifficultyByTopic.get(chosenTopic.key) || new Map();

      // Difficulty is a soft mix, not a quota. Challenge remains possible, but
      // is strongly delayed for weak topics and never overrides an explicit filter.
      let bestDifficultyLoad = Infinity;
      finalists.forEach(entry => {
        const target = Math.max(0.01,Number(targets[entry.difficulty] || 0.01));
        const current = diffCounts.get(entry.difficulty) || 0;
        const load = (current + 1) / (target * (topicSelected + 1));
        entry._v53d5DifficultyLoad = load;
        if (load < bestDifficultyLoad) bestDifficultyLoad = load;
      });
      finalists = finalists.filter(entry => Math.abs(entry._v53d5DifficultyLoad-bestDifficultyLoad) < 1e-9);

      const minSkillCount = Math.min(...finalists.map(entry => selectedBySkill.get(entry.skill) || 0));
      finalists = finalists.filter(entry => (selectedBySkill.get(entry.skill) || 0) === minSkillCount);

      const oldestSeen = Math.min(...finalists.map(entry => entry.lastSeenMs || 0));
      finalists = finalists
        .filter(entry => (entry.lastSeenMs || 0) === oldestSeen)
        .sort((a,b) => a.random-b.random || a.index-b.index);

      const chosen = finalists[0];
      ordered.push(chosen.item);
      selectedByTopic.set(chosen.topic,(selectedByTopic.get(chosen.topic) || 0)+1);
      selectedBySkill.set(chosen.skill,(selectedBySkill.get(chosen.skill) || 0)+1);
      const topicDiffCounts = selectedDifficultyByTopic.get(chosen.topic) || new Map();
      topicDiffCounts.set(chosen.difficulty,(topicDiffCounts.get(chosen.difficulty) || 0)+1);
      selectedDifficultyByTopic.set(chosen.topic,topicDiffCounts);
      remaining.splice(remaining.indexOf(chosen),1);
    }

    return ordered;
  }

  function intelligentShuffle(items){
    const session = currentSessionState();
    if (!shouldUseIntelligence(session) || !latestProfile)
      return fallbackOrder(items,Math.random);
    return orderIntelligentMixed(items,latestProfile,Math.random);
  }

  function installSelection(){
    try { if (typeof shuffle !== 'undefined') shuffle = intelligentShuffle; } catch {}
    try { ROOT.shuffle = intelligentShuffle; } catch {}
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53d5PracticeSelectionRpcBridge === true) return true;
      const previousRpc = cloud.rpc.bind(cloud);
      const bridgedRpc = async function(name,args,options){
        const input = args && typeof args === 'object' ? args : {};
        if (!isOrdinaryPracticeQuestionRequest(name,input))
          return previousRpc(name,input,options);

        const session = currentSessionState();
        const token = trim(input.p_access_token);
        const questionRequest = Promise.resolve(previousRpc(name,input,options));
        if (!shouldUseIntelligence(session) || !token){
          latestProfile = null;
          return questionRequest;
        }

        const profileRequest = Promise.resolve(
          previousRpc('get_student_practice_selection_profile_v53d5',{p_access_token:token})
        ).catch(error => ({data:null,error}));

        const [questionResult,profileResult] = await Promise.all([questionRequest,profileRequest]);
        latestProfile = !profileResult?.error && profileResult?.data ? profileResult.data : null;
        return questionResult;
      };
      Object.defineProperty(cloud,'__v53d5PreviousRpc',{value:previousRpc,writable:false,configurable:false});
      cloud.rpc = bridgedRpc;
      Object.defineProperty(cloud,'__v53d5PracticeSelectionRpcBridge',{value:true,writable:false,configurable:false});
      return true;
    } catch (error){
      console.warn('V5.3D5 Practice selection intelligence bridge could not be installed.',error);
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
    itemHistory,
    topicKey,
    skillKey,
    itemDifficulty,
    profileMap,
    topicWeight,
    difficultyTargets,
    shouldUseIntelligence,
    isOrdinaryPracticeQuestionRequest,
    fallbackOrder,
    orderIntelligentMixed
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
