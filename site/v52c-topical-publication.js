/* V5.2C — Teacher Topical Exercise publication controls.
   Adds a set-level publication gate to the existing V5.2B Topical Exercise Library.
   Publication is controlled only through guarded teacher RPCs; questions remain inactive. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52cTopicalPublicationInstalled) return;
  ROOT.__v52cTopicalPublicationInstalled = true;

  const state = {byKey:new Map(),loading:false,queued:false,lastLoadedAt:0};
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const setKey = (year,source) => `${Number(year)||0}|${norm(source)}`;
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function publicationStateLabel(item){
    if (!item) return 'Publication status unavailable';
    if (item.is_available === true && item.ready === true) return 'Published to students';
    if (item.is_available === true) return 'Automatically hidden — readiness changed';
    if (item.ready === true) return 'Ready to publish';
    return 'Not ready to publish';
  }

  function canPublish(item){ return !!item && item.ready === true && item.is_available !== true; }
  function canUnpublish(item){ return !!item && item.is_available === true; }

  function reasons(item){
    return Array.isArray(item?.reasons) ? item.reasons.map(trim).filter(Boolean) : [];
  }

  function normalizeRows(data){
    const rows = Array.isArray(data) ? data : [];
    return rows.map(item => ({
      ...item,
      year_level:Number(item?.year_level)||0,
      source:trim(item?.source),
      ready:item?.ready === true,
      is_available:item?.is_available === true,
      reasons:reasons(item)
    }));
  }

  function replaceStates(rows){
    state.byKey.clear();
    normalizeRows(rows).forEach(item => state.byKey.set(setKey(item.year_level,item.source),item));
  }

  function cardIdentity(card){
    const raw = trim(card?.dataset?.v52bKey);
    if (!raw) return {key:'',year:0,source:''};
    const split = raw.indexOf('|');
    const year = Number(split >= 0 ? raw.slice(0,split) : '') || 0;
    const source = split >= 0 ? raw.slice(split+1) : '';
    return {key:setKey(year,source),year,source};
  }

  function statusClass(item){
    if (item?.is_available && item?.ready) return 'status-active';
    if (item?.ready) return '';
    return 'status-inactive';
  }

  function renderCard(card){
    const identity = cardIdentity(card);
    if (!identity.key) return;
    const item = state.byKey.get(identity.key) || null;
    let root = card.querySelector('.v52c-publication');
    if (!root){
      root = document.createElement('div');
      root.className = 'v52c-publication info';
      root.style.marginTop = '10px';
      const actions = card.querySelector('.qcard-actions,.toolbar');
      if (actions) actions.insertAdjacentElement('beforebegin',root); else card.appendChild(root);
    }

    if (!item){
      root.innerHTML = '<strong>V5.2C student publication</strong><br><span class="help">Publication readiness is loading…</span>';
      return;
    }

    const blockers = reasons(item);
    const reviewed = Math.max(0,Number(item.physical_rows||0)-Number(item.review_blockers||0));
    const button = item.is_available
      ? `<button type="button" class="outline v52c-publish-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="false">Unpublish</button>`
      : `<button type="button" class="primary v52c-publish-toggle" data-year="${esc(item.year_level)}" data-source="${esc(item.source)}" data-target="true" ${item.ready?'':'disabled'}>Publish to students</button>`;
    root.innerHTML = `
      <div class="header" style="align-items:center;gap:8px">
        <div>
          <strong>V5.2C student publication</strong>
          <div class="pills" style="margin-top:6px">
            <span class="tag ${statusClass(item)}">${esc(publicationStateLabel(item))}</span>
            <span class="tag">${esc(reviewed)}/${esc(item.physical_rows||0)} reviewed</span>
          </div>
        </div>
        ${button}
      </div>
      <div class="help" style="margin-top:7px">${blockers.length ? esc(blockers.join(' • ')) : 'All publication readiness checks passed. Topical question rows remain inactive; student access uses the dedicated V5.2C route.'}</div>`;
  }

  function decorate(){
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#v52b-cards .v52b-set-card').forEach(renderCard);
  }

  async function loadStates(force=false){
    if (!cloudTeacherReady() || state.loading) { decorate(); return false; }
    if (!force && Date.now()-state.lastLoadedAt < 1000 && state.byKey.size){ decorate(); return true; }
    state.loading=true;
    try{
      const {data,error}=await cloud.rpc('get_topical_exercise_publication_states_v52c');
      if (error) throw error;
      replaceStates(data || []);
      state.lastLoadedAt=Date.now();
      decorate();
      return true;
    }catch(error){
      console.warn('V5.2C topical publication states could not be loaded.',error);
      decorate();
      return false;
    }finally{ state.loading=false; }
  }

  async function saveSetting(year,source,target){
    if (!cloudTeacherReady()) return;
    const item=state.byKey.get(setKey(year,source));
    if (target && !canPublish(item)){
      window.alert(reasons(item).join('\n') || 'This topical set is not ready to publish.');
      return;
    }
    const action=target?'Publish':'Unpublish';
    if (!window.confirm(`${action} “${source}” for Year ${year}?\n\nTopical question rows will remain inactive. Student access is controlled only by the dedicated V5.2C publication setting.`)) return;
    try{
      const {data,error}=await cloud.rpc('save_topical_exercise_setting_v52c',{p_year_level:Number(year),p_source:source,p_is_available:!!target});
      if (error) throw error;
      const normalized=normalizeRows([data])[0];
      if (normalized) state.byKey.set(setKey(normalized.year_level,normalized.source),normalized);
      decorate();
    }catch(error){
      window.alert(`Could not ${target?'publish':'unpublish'} this topical set. ${error?.message||''}`.trim());
      await loadStates(true);
    }
  }

  function scheduleLoad(force=false){
    if (state.queued) return;
    state.queued=true;
    setTimeout(()=>{ state.queued=false; loadStates(force); },0);
  }

  function wire(){
    if (typeof document === 'undefined') return;
    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('.v52c-publish-toggle');
      if (button){
        saveSetting(Number(button.dataset.year),button.dataset.source||'',button.dataset.target==='true');
        return;
      }
      const tab=event.target?.closest?.('.tab[data-panel="questions-panel"]');
      if (tab) scheduleLoad(true);
      if (event.target?.closest?.('#v52b-refresh')) scheduleLoad(true);
    });

    const cards=document.getElementById('v52b-cards');
    if (cards && typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{ decorate(); if (!state.byKey.size) scheduleLoad(false); }).observe(cards,{childList:true});
    }
    scheduleLoad(false);
  }

  const api=Object.freeze({norm,setKey,publicationStateLabel,canPublish,canUnpublish,normalizeRows,reasons});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52CTopicalPublication',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true}); else wire();
    }
  }
})();
