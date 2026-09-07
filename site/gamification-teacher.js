/* Phase 4 Checkpoint 2 — consolidated teacher gamification.
   Replaces the active V5.7.3/V5.7.4 teacher patch chain with one coordinated
   class-motivation/settings module. The existing V573/V574 RPC contracts, DOM
   ids/classes, teacher controls and historical compatibility APIs remain available.
   Supabase code and the V5.7.5 release checkpoint remain untouched. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const CORE = (typeof module !== 'undefined' && module.exports)
    ? require('./gamification-core.js')
    : ROOT.GamificationCore;
  if (!CORE) throw new Error('gamification-core.js must load before gamification-teacher.js');

  if (typeof window !== 'undefined' && ROOT.__gamificationTeacherInstalled) return;
  if (typeof window !== 'undefined') {
    ROOT.__gamificationTeacherInstalled = true;
    // These exact flags are read by the untouched V5.7.5 stable checkpoint.
    ROOT.__v573ClassChallengesTeacherGamificationInstalled = true;
    ROOT.__v574GamificationPolishTeacherControlsInstalled = true;
  }

  const {RPC,IDS,trim,html,integer}=CORE;
  let teacherData=null;
  let teacherLoading=false;
  let teacherFilter='all';
  let teacherReturnFocus=null;
  let teacherPreviousOverflow='';
  let settingsData=null;
  let settingsLoading=false;
  let settingsReturnFocus=null;
  let settingsPreviousOverflow='';
  let installed=false;

  function teacherRowsForFilter(model,filter=teacherFilter){
    const rows=Array.from(model?.students || []);
    if (filter==='nudge') return rows.filter(row=>row.weekly_questions===0 && row.weekly_challenges===0);
    if (filter==='active') return rows.filter(row=>row.weekly_questions>0 || row.weekly_challenges>0);
    if (filter==='missions') return rows.filter(row=>row.all_missions_complete);
    return rows;
  }

  function currentTeacherClasses(){
    try {
      return Array.isArray(teacherClasses)
        ? teacherClasses.filter(row=>row?.active!==false).slice().sort((a,b)=>
            Number(a.year_level)-Number(b.year_level)
            || trim(a.name).localeCompare(trim(b.name),undefined,{numeric:true})
          )
        : [];
    } catch { return []; }
  }

  function preferredTeacherClassId(){
    try {
      if (selectedClassId && currentTeacherClasses().some(row=>String(row.id)===String(selectedClassId))) return String(selectedClassId);
    } catch {}
    const pastPaper=document.getElementById('v56d-class');
    if (pastPaper?.value && currentTeacherClasses().some(row=>String(row.id)===String(pastPaper.value))) return String(pastPaper.value);
    return String(currentTeacherClasses()[0]?.id || '');
  }

  function preferredSettingsClassId(){
    const settings=document.getElementById(IDS.settingsClass)?.value;
    if (settings) return settings;
    const motivation=document.getElementById(IDS.teacherClass)?.value;
    if (motivation) return motivation;
    try { if (selectedClassId) return String(selectedClassId); } catch {}
    return String(currentTeacherClasses()[0]?.id || '');
  }

  function ensureTeacherTrigger(){
    if (typeof document==='undefined' || document.getElementById(IDS.teacherTrigger)) return false;
    const exportButton=document.getElementById('export-analytics');
    if (!exportButton) return false;
    const button=document.createElement('button');
    button.id=IDS.teacherTrigger;
    button.type='button';
    button.className='secondary';
    button.textContent='🎮 Class Motivation';
    button.addEventListener('click',openTeacher);
    const pastPaper=document.getElementById('v56d-open-past-paper-analytics');
    (pastPaper || exportButton).insertAdjacentElement('beforebegin',button);
    return true;
  }

  function ensureTeacherOverlay(){
    if (typeof document==='undefined') return null;
    let overlay=document.getElementById(IDS.teacherOverlay);
    if (overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id=IDS.teacherOverlay;
    overlay.className='hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v573-teacher-title');
    overlay.innerHTML=`<div class="v573-sheet">
      <div class="v573-head">
        <div><h2 id="v573-teacher-title">🎮 Class Motivation</h2><p>XP, streaks, weekly missions and the cooperative class challenge. Students are shown alphabetically — there is no leaderboard.</p></div>
        <div class="v573-head-actions"><span class="tag">V5.7.3</span><button type="button" class="outline" id="v573-teacher-close">Close</button></div>
      </div>
      <div class="v573-controls">
        <label>Class<select id="${IDS.teacherClass}"></select></label>
        <button type="button" class="secondary" id="v573-teacher-refresh">Refresh</button>
      </div>
      <div id="${IDS.teacherContent}"><div class="v573-loading">Choose a class.</div></div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('v573-teacher-close')?.addEventListener('click',closeTeacher);
    document.getElementById('v573-teacher-refresh')?.addEventListener('click',()=>loadTeacher(true));
    document.getElementById(IDS.teacherClass)?.addEventListener('change',()=>loadTeacher(true));
    overlay.addEventListener('click',event=>{ if (event.target===overlay) closeTeacher(); });
    overlay.addEventListener('keydown',event=>{ if (event.key==='Escape'){ event.preventDefault(); closeTeacher(); } });
    return overlay;
  }

  function populateTeacherClasses(){
    const select=document.getElementById(IDS.teacherClass);
    if (!select) return;
    const classes=currentTeacherClasses();
    const preferred=select.value || preferredTeacherClassId();
    select.innerHTML=classes.length
      ? classes.map(row=>`<option value="${html(row.id)}">${html(row.name)} · Year ${Number(row.year_level)||''}</option>`).join('')
      : '<option value="">No active classes</option>';
    if (classes.some(row=>String(row.id)===String(preferred))) select.value=String(preferred);
  }

  function teacherFilterButton(id,label,count){
    const pressed=teacherFilter===id;
    return `<button type="button" class="v573-filter" data-v573-filter="${id}" aria-pressed="${pressed?'true':'false'}">${html(label)}${Number.isFinite(count)?` · ${count}`:''}</button>`;
  }

  // This is the exact final V5.7.4 challenge markup that previously replaced the
  // V5.7.3 card via patchTeacherChallenge(). It is now produced directly by the
  // same module that renders the rest of the teacher view.
  function teacherChallengeMarkup(payload){
    const model=CORE.normalizeClassChallengeV574(payload);
    const c=model.challenge;
    return c.enabled?`
      <div class="v573-class-challenge">
        <div class="v573-class-challenge-head"><div><div class="v573-kicker">Cooperative Class Challenge</div><h3>${c.complete?'🎉':'🤝'} ${html(model.class.class_name)} · Class Question Quest</h3></div><strong>${c.questions_completed} / ${c.target_questions} questions · ${c.progress_percent}%</strong></div>
        <div class="v573-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.progress_percent}"><span style="width:${c.progress_percent}%"></span></div>
        <p>${c.contributors} of ${model.class.active_students} students have contributed questions this week. Target = ${model.settings.questions_per_active_student} questions × each active student.</p>
        <div class="v574-managed-note">Teacher-controlled challenge · ${html(CORE.phaseLabel(model))}. Use <strong>⚙ Class Challenge</strong> to adjust or pause it.</div>
      </div>`:`
      <div class="v573-class-challenge">
        <div class="v573-class-challenge-head"><div><div class="v573-kicker">Cooperative Class Challenge</div><h3>⏸ ${html(model.class.class_name)} · Class Question Quest paused</h3></div><strong>Paused</strong></div>
        <p>Students do not currently see the class challenge. XP, streaks, badges and weekly missions continue normally.</p>
        <div class="v574-managed-note">Use <strong>⚙ Class Challenge</strong> to re-enable it or change the weekly target.</div>
      </div>`;
  }

  function renderTeacher(payload){
    teacherData=payload;
    const model=CORE.normalizeTeacherPayload(payload);
    const content=document.getElementById(IDS.teacherContent);
    if (!content) return false;
    const c=model.challenge;
    const nudge=model.students.filter(row=>row.weekly_questions===0 && row.weekly_challenges===0).length;
    const active=model.students.filter(row=>row.weekly_questions>0 || row.weekly_challenges>0).length;
    const missions=model.students.filter(row=>row.all_missions_complete).length;
    const rows=teacherRowsForFilter(model);

    content.innerHTML=`
      ${teacherChallengeMarkup(payload)}
      <div class="v573-summary">
        <div class="v573-stat"><strong>${model.summary.active_this_week}/${model.summary.active_students}</strong><span>Students active this week</span></div>
        <div class="v573-stat"><strong>${model.summary.all_missions_complete}</strong><span>Completed all 3 weekly missions</span></div>
        <div class="v573-stat"><strong>${model.summary.active_streaks}</strong><span>Students with an active streak</span></div>
        <div class="v573-stat"><strong>${model.summary.average_xp}</strong><span>Average class XP</span></div>
        <div class="v573-stat"><strong>${c.contributors}</strong><span>Class challenge contributors</span></div>
      </div>
      <div class="v573-filters">
        ${teacherFilterButton('all','All students',model.students.length)}
        ${teacherFilterButton('nudge','Needs a nudge',nudge)}
        ${teacherFilterButton('active','Active this week',active)}
        ${teacherFilterButton('missions','All missions complete',missions)}
      </div>
      ${rows.length ? `<div class="v573-tablewrap"><table>
        <thead><tr><th>Student</th><th>XP</th><th>Level</th><th>Streak</th><th>Questions this week</th><th>Practice days</th><th>Weekly missions</th></tr></thead>
        <tbody>${rows.map(row=>`<tr class="${row.weekly_questions===0 && row.weekly_challenges===0?'v573-nudge':''}">
          <td class="v573-name"><strong>${html(row.student_name)}</strong><div class="help">${html(row.student_id)}</div></td>
          <td>${row.xp_total}</td>
          <td>Level ${row.level_number} · ${html(row.level_title)}</td>
          <td>${row.current_streak>0?`🔥 ${row.current_streak}`:'—'}</td>
          <td>${row.weekly_questions}</td>
          <td>${row.weekly_practice_days}</td>
          <td><span class="v573-pill ${row.all_missions_complete?'v573-mission-ok':''}">${row.missions_completed}/3${row.all_missions_complete?' ✓':''}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="v573-empty">No students match this filter.</div>'}
      <p class="v573-note">Motivation data is read-only and based on saved Practice evidence. Exam activity is excluded. This view intentionally avoids ranking students against one another.</p>`;
    return true;
  }

  async function cloudRpc(name,args){
    if (typeof cloud==='undefined' || !cloud?.rpc) throw new Error('Teacher connection is not ready.');
    const {data,error}=await cloud.rpc(name,args);
    if (error) throw error;
    return data || {};
  }

  async function teacherRpc(classId,name=RPC.teacherV574){
    if (!classId) throw new Error('Choose a class.');
    return cloudRpc(name,{p_class_id:classId});
  }

  async function updateRpc(classId,enabled,perStudent){
    if (!classId) throw new Error('Choose a class.');
    return cloudRpc(RPC.updateChallengeV574,{
      p_class_id:classId,
      p_challenge_enabled:enabled,
      p_questions_per_active_student:perStudent
    });
  }

  async function loadTeacher(force=false){
    if (teacherLoading) return false;
    const classId=document.getElementById(IDS.teacherClass)?.value || '';
    const content=document.getElementById(IDS.teacherContent);
    if (!classId || !content) return false;
    teacherLoading=true;
    content.innerHTML='<div class="v573-loading">Loading class motivation…</div>';
    try {
      // V574 already wraps the V573 teacher RPC and returns the same roster/summary
      // plus the configurable challenge state. One call now feeds one render pass.
      const data=await teacherRpc(classId,RPC.teacherV574);
      teacherFilter=force ? 'all' : teacherFilter;
      return renderTeacher(data);
    } catch(error){
      content.innerHTML=`<div class="v573-empty">${html(error?.message || 'Class motivation could not be loaded.')}</div>`;
      return false;
    } finally { teacherLoading=false; }
  }

  function openTeacher(){
    const overlay=ensureTeacherOverlay();
    if (!overlay) return false;
    teacherReturnFocus=document.activeElement;
    populateTeacherClasses();
    teacherFilter='all';
    teacherPreviousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.classList.remove('hidden');
    loadTeacher(true);
    setTimeout(()=>document.getElementById(IDS.teacherClass)?.focus(),0);
    return true;
  }

  function closeTeacher(){
    const overlay=document.getElementById(IDS.teacherOverlay);
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow=teacherPreviousOverflow;
    teacherReturnFocus?.focus?.();
    teacherReturnFocus=null;
  }

  function ensureSettingsTrigger(){
    if (typeof document==='undefined' || document.getElementById(IDS.settingsTrigger)) return false;
    const motivation=document.getElementById(IDS.teacherTrigger);
    const exportButton=document.getElementById('export-analytics');
    const anchor=motivation || exportButton;
    if (!anchor) return false;
    const button=document.createElement('button');
    button.id=IDS.settingsTrigger;
    button.type='button';
    button.className='secondary';
    button.textContent='⚙ Class Challenge';
    button.addEventListener('click',openSettings);
    anchor.insertAdjacentElement('afterend',button);
    return true;
  }

  function ensureSettingsOverlay(){
    let overlay=document.getElementById(IDS.settingsOverlay);
    if (overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id=IDS.settingsOverlay;
    overlay.className='hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v574-settings-title');
    overlay.innerHTML=`<div class="v574-sheet">
      <div class="v574-settings-head">
        <div><h2 id="v574-settings-title">⚙ Class Challenge Settings</h2><p>Choose how demanding the cooperative weekly Question Quest should be. These controls never rank students or change XP.</p></div>
        <div class="v574-settings-actions"><span class="tag">V5.7.4</span><button type="button" class="outline" id="v574-settings-close">Close</button></div>
      </div>
      <div class="v574-controls"><label>Class<select id="${IDS.settingsClass}"></select></label><button type="button" class="secondary" id="v574-settings-refresh">Refresh</button></div>
      <div id="${IDS.settingsContent}"><div class="v573-loading">Choose a class.</div></div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('v574-settings-close')?.addEventListener('click',closeSettings);
    document.getElementById('v574-settings-refresh')?.addEventListener('click',()=>loadSettings(true));
    document.getElementById(IDS.settingsClass)?.addEventListener('change',()=>loadSettings(true));
    overlay.addEventListener('click',event=>{ if (event.target===overlay) closeSettings(); });
    overlay.addEventListener('keydown',event=>{ if (event.key==='Escape'){ event.preventDefault(); closeSettings(); } });
    return overlay;
  }

  function populateSettingsClasses(){
    const select=document.getElementById(IDS.settingsClass);
    if (!select) return;
    const classes=currentTeacherClasses();
    const preferred=preferredSettingsClassId();
    select.innerHTML=classes.length
      ? classes.map(row=>`<option value="${html(row.id)}">${html(row.name)} · Year ${Number(row.year_level)||''}</option>`).join('')
      : '<option value="">No active classes</option>';
    if (classes.some(row=>String(row.id)===String(preferred))) select.value=String(preferred);
  }

  function renderSettings(payload){
    settingsData=CORE.normalizeClassChallengeV574(payload);
    const model=settingsData;
    const content=document.getElementById(IDS.settingsContent);
    if (!content) return false;
    const enabled=model.settings.challenge_enabled;
    const allowed=model.settings.allowed.length ? model.settings.allowed : [5,10,15,20];
    content.innerHTML=`<div class="v574-settings-card">
      <div class="v574-toggle-row">
        <div class="v574-toggle-copy"><strong>Class Question Quest</strong><span>Pause it at any time without removing XP, streaks, badges or weekly missions.</span></div>
        <label class="v574-toggle"><input type="checkbox" id="v574-enabled" ${enabled?'checked':''}> ${enabled?'Enabled':'Paused'}</label>
      </div>
      <div class="v574-target-grid">
        <label>Questions per active student<select id="v574-per-student">${allowed.map(value=>`<option value="${value}" ${value===model.settings.questions_per_active_student?'selected':''}>${value} questions</option>`).join('')}</select></label>
        <div class="v574-preview"><span>Current weekly class target</span><strong id="v574-target-preview">${model.challenge.target_questions} questions</strong><span>${model.class.active_students} active students × ${model.settings.questions_per_active_student}</span></div>
      </div>
      <div class="v574-message" id="v574-settings-message"></div>
      <div class="v574-save-row"><button type="button" class="outline" id="v574-defaults">Restore default</button><button type="button" class="primary" id="v574-save">Save Changes</button></div>
    </div>`;
    const enabledInput=document.getElementById('v574-enabled');
    const perStudent=document.getElementById('v574-per-student');
    const updatePreview=()=>{
      const count=integer(perStudent?.value || 10);
      document.getElementById('v574-target-preview').textContent=`${model.class.active_students*count} questions`;
      if (enabledInput?.parentElement) enabledInput.parentElement.lastChild.textContent=` ${enabledInput.checked?'Enabled':'Paused'}`;
    };
    enabledInput?.addEventListener('change',updatePreview);
    perStudent?.addEventListener('change',updatePreview);
    document.getElementById('v574-defaults')?.addEventListener('click',()=>{
      if (enabledInput) enabledInput.checked=true;
      if (perStudent) perStudent.value='10';
      updatePreview();
    });
    document.getElementById('v574-save')?.addEventListener('click',saveSettings);
    return true;
  }

  async function loadSettings(){
    if (settingsLoading) return false;
    const classId=document.getElementById(IDS.settingsClass)?.value || '';
    const content=document.getElementById(IDS.settingsContent);
    if (!classId || !content) return false;
    settingsLoading=true;
    content.innerHTML='<div class="v573-loading">Loading class challenge settings…</div>';
    try { return renderSettings(await teacherRpc(classId,RPC.teacherV574)); }
    catch(error){
      content.innerHTML=`<div class="v573-empty">${html(error?.message || 'Settings could not be loaded.')}</div>`;
      return false;
    } finally { settingsLoading=false; }
  }

  async function saveSettings(){
    if (settingsLoading) return false;
    const classId=document.getElementById(IDS.settingsClass)?.value || '';
    const enabled=!!document.getElementById('v574-enabled')?.checked;
    const perStudent=integer(document.getElementById('v574-per-student')?.value || 10);
    const message=document.getElementById('v574-settings-message');
    const save=document.getElementById('v574-save');
    if (!classId) return false;
    settingsLoading=true;
    if (save) save.disabled=true;
    if (message){ message.className='v574-message'; message.textContent='Saving…'; }
    try {
      const data=await updateRpc(classId,enabled,perStudent);
      renderSettings(data);
      const msg=document.getElementById('v574-settings-message');
      if (msg){
        msg.className='v574-message ok';
        msg.textContent=enabled?'Class challenge settings saved.':'Class challenge paused for students.';
      }

      // Direct module calls replace V574's old click + delayed DOM patch chain.
      try {
        ROOT.GamificationStudent?.classChallenge?.clear?.();
        ROOT.GamificationStudent?.classChallenge?.load?.(true);
      } catch {}
      const teacherOverlay=document.getElementById(IDS.teacherOverlay);
      const selected=document.getElementById(IDS.teacherClass)?.value || '';
      if (teacherOverlay && !teacherOverlay.classList.contains('hidden') && String(selected)===String(classId)) {
        renderTeacher(data);
      }
      return true;
    } catch(error){
      if (message){ message.className='v574-message err'; message.textContent=error?.message || 'Settings could not be saved.'; }
      return false;
    } finally {
      settingsLoading=false;
      const currentSave=document.getElementById('v574-save');
      if (currentSave) currentSave.disabled=false;
    }
  }

  function openSettings(){
    const overlay=ensureSettingsOverlay();
    if (!overlay) return false;
    settingsReturnFocus=document.activeElement;
    populateSettingsClasses();
    settingsPreviousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.classList.remove('hidden');
    loadSettings(true);
    setTimeout(()=>document.getElementById(IDS.settingsClass)?.focus(),0);
    return true;
  }

  function closeSettings(){
    const overlay=document.getElementById(IDS.settingsOverlay);
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow=settingsPreviousOverflow;
    settingsReturnFocus?.focus?.();
    settingsReturnFocus=null;
  }

  // Compatibility name retained for any historical caller. Unlike the old V574
  // implementation, this no longer finds and mutates a V573-owned challenge node;
  // it re-renders the consolidated teacher view in one pass.
  function patchTeacherChallenge(payload){
    const overlay=document.getElementById(IDS.teacherOverlay);
    if (!overlay || overlay.classList.contains('hidden')) return false;
    const selected=document.getElementById(IDS.teacherClass)?.value || '';
    const model=CORE.normalizeClassChallengeV574(payload);
    if (selected && model.class.class_id && String(selected)!==String(model.class.class_id)) return false;
    return renderTeacher(payload);
  }

  function openLearn(){
    if (ROOT.GamificationStudent?.openLearn) return ROOT.GamificationStudent.openLearn();
    if (ROOT.V572WeeklyMissions?.openLearn) return ROOT.V572WeeklyMissions.openLearn();
    document.querySelector('[data-v40-nav="learn"]')?.click?.();
    return true;
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    CORE.injectStyles();
    installed=true;
    ensureTeacherTrigger();
    ensureSettingsTrigger();

    document.addEventListener('click',event=>{
      const filter=event.target?.closest?.('[data-v573-filter]')?.dataset?.v573Filter;
      if (filter){
        event.preventDefault();
        teacherFilter=filter;
        if (teacherData) renderTeacher(teacherData);
      }
    },true);

    new MutationObserver(()=>{
      ensureTeacherTrigger();
      ensureSettingsTrigger();
    }).observe(document.body,{childList:true,subtree:true});
    return true;
  }

  const studentApi=()=>ROOT.GamificationStudent?.classChallenge;
  const passivePracticeAccess=()=>ROOT.GamificationStudent?.passivePracticeAccess?.() || null;

  const v573Api=Object.freeze({
    RPC_STUDENT:RPC.classChallengeV573,
    RPC_TEACHER:RPC.teacherV573,
    normalizeChallenge:CORE.normalizeClassChallengeV573,
    normalizeTeacherStudent:CORE.normalizeTeacherStudent,
    normalizeTeacherPayload:CORE.normalizeTeacherPayload,
    teacherRowsForFilter,
    passivePracticeAccess,
    weekLabel:CORE.weekLabel,
    renderStudent:payload=>studentApi()?.render?.(payload) || false,
    loadStudent:force=>studentApi()?.load?.(force) || false,
    renderTeacher,openTeacher,closeTeacher,openLearn
  });

  const v574Api=Object.freeze({
    RPC_STUDENT:RPC.classChallengeV574,
    RPC_TEACHER:RPC.teacherV574,
    RPC_UPDATE:RPC.updateChallengeV574,
    normalize:CORE.normalizeClassChallengeV574,
    phaseLabel:CORE.phaseLabel,
    weekLabel:CORE.weekLabel,
    passivePracticeAccess,
    renderStudent:payload=>studentApi()?.render?.(payload) || false,
    loadStudent:force=>studentApi()?.load?.(force) || false,
    openSettings,closeSettings,renderSettings,loadSettings,saveSettings,
    patchTeacherChallenge,teacherRpc,updateRpc,openLearn
  });

  const api=Object.freeze({
    v573:v573Api,v574:v574Api,
    teacherRowsForFilter,teacherChallengeMarkup,renderTeacher,loadTeacher,openTeacher,closeTeacher,
    renderSettings,loadSettings,saveSettings,openSettings,closeSettings,patchTeacherChallenge,
    teacherRpc,updateRpc,openLearn
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'GamificationTeacher',{value:api,writable:false,configurable:false});
    Object.defineProperty(window,'V573ClassChallengesTeacherGamification',{value:v573Api,writable:false,configurable:false});
    Object.defineProperty(window,'V574GamificationPolishTeacherControls',{value:v574Api,writable:false,configurable:false});
    wire();
  }
})();
