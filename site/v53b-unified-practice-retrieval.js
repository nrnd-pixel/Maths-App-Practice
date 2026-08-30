/* V5.3B — Unified ordinary-Practice retrieval bridge.
   Routes only ordinary Practice to the versioned practice_eligible RPCs.
   Exam Mode and the temporary V5.2C Topical Practice route remain unchanged.
   Also hardens multipart grouping for non-exam resource-bank sources. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53bUnifiedPracticeInstalled) return;
  ROOT.__v53bUnifiedPracticeInstalled = true;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');

  function topicalSessionActive(){
    try { return typeof state !== 'undefined' && !!state?.topicalSource; } catch { return false; }
  }

  function routeRpc(name,args={}){
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

  function installMultipartKey(){
    try { if (typeof multipartKey !== 'undefined') multipartKey = unifiedMultipartKey; } catch {}
    try { ROOT.multipartKey = unifiedMultipartKey; } catch {}
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53bUnifiedPracticeRpcBridge === true) return true;
      const originalRpc = cloud.rpc.bind(cloud);
      const bridgedRpc = function(name,args,options){
        const routed = routeRpc(name,args);
        return originalRpc(routed.name,routed.args,options);
      };
      Object.defineProperty(cloud,'__v53bOriginalRpc',{value:originalRpc,writable:false,configurable:false});
      cloud.rpc = bridgedRpc;
      Object.defineProperty(cloud,'__v53bUnifiedPracticeRpcBridge',{value:true,writable:false,configurable:false});
      return true;
    } catch (error){
      console.warn('V5.3B Practice RPC bridge could not be installed.',error);
      return false;
    }
  }

  function install(){
    installMultipartKey();
    if (installRpcBridge()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      installMultipartKey();
      if (installRpcBridge() || tries >= 80) clearInterval(timer);
    },50);
  }

  const api = Object.freeze({routeRpc,unifiedMultipartKey});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53BUnifiedPractice',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
