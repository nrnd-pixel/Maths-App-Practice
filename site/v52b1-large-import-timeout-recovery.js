/* V5.2B.1 — Large-package image-upload timeout recovery clarity.
   V5.1A5 has a fixed two-minute wait window while V5.1A2 uploads images sequentially.
   A large healthy batch can outlive that wait even though A2 is still progressing. This
   additive layer never starts, cancels, retries or writes an upload. It only replaces the
   misleading timeout feedback while the established A2 upload is demonstrably continuing,
   then tells the teacher when it is safe to press Import Paper again. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  let timeoutSeen = false;
  let scheduled = false;

  const trim = value => String(value ?? '').trim().replace(/\s+/g,' ');

  function parseUploadProgress(text){
    const match = trim(text).match(/Uploading\s+(\d+)\s*\/\s*(\d+)/i);
    if (!match) return null;
    return Object.freeze({current:Number(match[1]),total:Number(match[2])});
  }

  function uploadStageState(text){
    const value = trim(text);
    const progress = parseUploadProgress(value);
    if (progress && progress.total>0 && progress.current<=progress.total) return Object.freeze({kind:'progress',...progress});
    if (/matched images? uploaded successfully|\d+ images? uploaded\.|Ready import rows now use Supabase public image URLs|No local image upload required/i.test(value)) return Object.freeze({kind:'complete'});
    if (/Upload stopped|requires Cloud Teacher|Resolve missing, duplicate or invalid|could not be generated|Storage upload failed/i.test(value)) return Object.freeze({kind:'failed'});
    return Object.freeze({kind:'unknown'});
  }

  function timedOutText(text){ return /Image upload did not finish within two minutes/i.test(trim(text)); }

  function setStatus(kind,message){
    const status = typeof document!=='undefined' ? document.getElementById('v51a5-import-status') : null;
    if (!status) return false;
    const className = `feedback ${kind}`;
    if (status.className===className && trim(status.textContent)===trim(message)) return false;
    status.className=className;
    status.textContent=message;
    return true;
  }

  function renderRecovery(){
    scheduled=false;
    if (typeof document==='undefined') return null;
    const status=document.getElementById('v51a5-import-status');
    const a2=document.getElementById('v51a2-bulk-image-panel');
    if (!status || !a2) return null;
    if (timedOutText(status.textContent)) timeoutSeen=true;
    if (!timeoutSeen) return {active:false};

    const stage=uploadStageState(a2.textContent);
    if (stage.kind==='progress'){
      setStatus('try',`Large package is still uploading normally: ${stage.current}/${stage.total} images. Keep this tab open. When the image stage turns green, click Import Paper again; already-uploaded images will not be uploaded twice.`);
    } else if (stage.kind==='complete'){
      setStatus('correct','The image upload completed after the original two-minute wait window. The preview is still safe. Click Import Paper again to continue with the question import; the completed images will be reused.');
    } else if (stage.kind==='failed'){
      setStatus('incorrect','The image uploader reports a real upload problem. Review the V5.1A2 image message below before retrying. The established rollback/cleanup safeguards remain in control.');
    } else {
      setStatus('try','The original two-minute wait window ended. Check the V5.1A2 image stage below before retrying. If it is still uploading, keep this tab open until it finishes.');
    }
    return {active:true,stage};
  }

  function schedule(){
    if (scheduled) return;
    scheduled=true;
    if (ROOT.requestAnimationFrame) ROOT.requestAnimationFrame(renderRecovery);
    else ROOT.setTimeout?.(renderRecovery,0);
  }

  function install(){
    if (typeof document==='undefined' || ROOT.__v52b1LargeImportTimeoutRecoveryInstalled) return;
    ROOT.__v52b1LargeImportTimeoutRecoveryInstalled=true;
    const a5=document.getElementById('v51a5-import-status');
    const a2=document.getElementById('v51a2-bulk-image-panel');
    if (typeof MutationObserver!=='undefined'){
      const observer=new MutationObserver(schedule);
      if (a5) observer.observe(a5,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
      if (a2) observer.observe(a2,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
    }
    document.addEventListener('click',event=>{
      if (!event.target?.closest?.('#v51a5-import-paper')) return;
      const stage=uploadStageState(document.getElementById('v51a2-bulk-image-panel')?.textContent || '');
      if (timeoutSeen && stage.kind==='complete') timeoutSeen=false;
    },true);
    schedule();
  }

  const api=Object.freeze({parseUploadProgress,uploadStageState,timedOutText});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52B1LargeImportTimeoutRecovery',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();