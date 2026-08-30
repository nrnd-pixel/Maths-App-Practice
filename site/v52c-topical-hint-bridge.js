/* V5.2C — Topical Practice hint bridge.
   The existing Practice Hint button is wired once during core boot, so this bridge
   preserves that handler for ordinary Practice and diverts only topical sessions
   to the dedicated inactive-question hint RPC. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52cTopicalHintBridgeInstalled) return;
  ROOT.__v52cTopicalHintBridgeInstalled = true;

  const html=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  async function showTopicalHint(){
    if (typeof state==='undefined' || !state?.topicalSource || state.done) return;
    const box=document.getElementById('hint-box');
    if (!box) return;
    if (!box.classList.contains('hidden')){
      box.classList.add('hidden');
      return;
    }

    const item=state.questions?.[state.index];
    if (!item) return;
    const multipart=typeof isMultipartItem==='function' && isMultipartItem(item);
    const parts=multipart
      ? item.parts.filter((part,index)=>{
          const manual=typeof isManualType==='function' ? isManualType(part) : ['drawing','manual'].includes(String(part?.response_type||'text'));
          const status=state.groupStatus?.[index];
          return !manual && !status?.correct && !status?.submitted;
        })
      : [item].filter(part=>{
          const manual=typeof isManualType==='function' ? isManualType(part) : ['drawing','manual'].includes(String(part?.response_type||'text'));
          return !manual;
        });
    if (!parts.length) return;

    try{
      const token=state.accessToken || (typeof activeStudentAccess!=='undefined' ? activeStudentAccess?.access_token : '') || '';
      if (!token) throw new Error('Student access must be verified first.');
      const rows=await Promise.all(parts.map(async part=>{
        const {data,error}=await cloud.rpc('request_topical_hint_v52c',{p_access_token:token,p_question_id:part.id});
        if (error) throw error;
        part.hint=data?.hint||'';
        return {part,hint:data?.hint||''};
      }));
      if (!state.hintUsed){ state.hintUsed=true; state.hints++; }
      box.innerHTML=multipart
        ? rows.map(({part,hint},index)=>`<div><strong>${html(part.part_label?`(${part.part_label})`:`Part ${index+1}`)}:</strong> ${html(hint||'No hint added.')}</div>`).join('<hr style="border:0;border-top:1px solid #efd8b8;margin:8px 0">')
        : html(rows[0]?.hint||'No hint added.');
      box.classList.remove('hidden');
    }catch(error){
      console.warn('V5.2C topical hint could not be loaded.',error);
      const feedback=document.getElementById('feedback');
      if (feedback){
        feedback.className='feedback incorrect';
        feedback.textContent=`Could not load the hint. ${error?.message||''}`.trim();
      }
    }
  }

  function wire(){
    if (typeof document==='undefined') return;
    const button=document.getElementById('hint-btn');
    if (!button || button.__v52cTopicalHintWrapped) return;
    const baseHandler=button.onclick;
    button.__v52cTopicalHintWrapped=true;
    button.onclick=function(event){
      if (typeof state!=='undefined' && state?.topicalSource){
        event?.preventDefault?.();
        return showTopicalHint();
      }
      return typeof baseHandler==='function' ? baseHandler.call(this,event) : undefined;
    };
  }

  const api=Object.freeze({showTopicalHint});
  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52CTopicalHintBridge',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
