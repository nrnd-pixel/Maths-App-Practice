/* V5.3D3 — Practice question selection quality.
   Ordinary Practice only: prefers unseen / less-seen / older-seen logical
   questions and balances topics within the selected exposure tier.
   Exam Mode, eligibility, grading, hints and submission remain unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d3PracticeSelectionInstalled) return;
  ROOT.__v53d3PracticeSelectionInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');

  function isOrdinaryPracticeRequest(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};
    if (rpcName === 'get_student_practice_questions_v53b') return true;
    return rpcName === 'get_student_questions'
      && input.p_exam_year == null
      && (input.p_paper == null || trim(input.p_paper) === '');
  }

  function routeRpc(name,args={}){
    const input = args && typeof args === 'object' ? args : {};
    if (isOrdinaryPracticeRequest(name,input)) {
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
      const history = itemHistory(item);
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

  function smartShuffle(items){
    return orderPracticeItems(items,Math.random);
  }

  function installSelection(){
    try { if (typeof shuffle !== 'undefined') shuffle = smartShuffle; } catch {}
    try { ROOT.shuffle = smartShuffle; } catch {}
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53d3PracticeSelectionRpcBridge === true) return true;
      const previousRpc = cloud.rpc.bind(cloud);
      const bridgedRpc = function(name,args,options){
        const routed = routeRpc(name,args);
        return previousRpc(routed.name,routed.args,options);
      };
      Object.defineProperty(cloud,'__v53d3PreviousRpc',{value:previousRpc,writable:false,configurable:false});
      cloud.rpc = bridgedRpc;
      Object.defineProperty(cloud,'__v53d3PracticeSelectionRpcBridge',{value:true,writable:false,configurable:false});
      return true;
    } catch (error){
      console.warn('V5.3D3 Practice selection RPC bridge could not be installed.',error);
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
    isOrdinaryPracticeRequest,
    routeRpc,
    hasHistoryMetadata,
    itemHistory,
    balanceKey,
    randomOrder,
    orderPracticeItems
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53D3PracticeSelection',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
