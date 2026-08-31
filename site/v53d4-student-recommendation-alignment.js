/* V5.3D4 — Student Practice recommendation alignment.
   Routes only the existing student Practice recommendation request to the
   versioned unified-resource-bank RPC. Practice selection, grading, hints,
   submission, assignments and Exam Mode remain unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d4StudentRecommendationInstalled) return;
  ROOT.__v53d4StudentRecommendationInstalled = true;

  function routeRpc(name,args={}){
    const rpcName = String(name || '');
    const input = args && typeof args === 'object' ? args : {};

    if (rpcName === 'get_student_practice_recommendation') {
      return {
        name:'get_student_practice_recommendation_v53d4',
        args:input
      };
    }

    return {name:rpcName,args:input};
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53d4StudentRecommendationRpcBridge === true) return true;

      const previousRpc = cloud.rpc.bind(cloud);
      const bridgedRpc = function(name,args,options){
        const routed = routeRpc(name,args);
        return previousRpc(routed.name,routed.args,options);
      };

      Object.defineProperty(cloud,'__v53d4PreviousRpc',{
        value:previousRpc,writable:false,configurable:false
      });
      cloud.rpc = bridgedRpc;
      Object.defineProperty(cloud,'__v53d4StudentRecommendationRpcBridge',{
        value:true,writable:false,configurable:false
      });
      return true;
    } catch (error){
      console.warn('V5.3D4 student recommendation bridge could not be installed.',error);
      return false;
    }
  }

  function install(){
    if (installRpcBridge()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (installRpcBridge() || tries >= 80) clearInterval(timer);
    },50);
  }

  const api = Object.freeze({routeRpc});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53D4StudentRecommendation',{
      value:api,writable:false,configurable:false
    });
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
