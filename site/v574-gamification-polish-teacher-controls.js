/* V5.7.4 — Gamification Polish + Teacher Class Challenge Controls.
   Adds a polished student teamwork card and a teacher-only settings overlay for
   enabling/pausing the cooperative challenge and choosing 5/10/15/20 questions
   per active student. No leaderboard, Exam activity or grading path is added. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if (ROOT.__v574GamificationPolishTeacherControlsInstalled) return;
  ROOT.__v574GamificationPolishTeacherControlsInstalled=true;

  const RPC_STUDENT='get_student_class_challenge_v574';
  const RPC_TEACHER='get_teacher_class_gamification_v574';
  const RPC_UPDATE='update_teacher_class_challenge_v574';
  const STUDENT_CARD_ID='v574-class-challenge-card';
  const SETTINGS_TRIGGER_ID='v574-class-challenge-settings';
  const SETTINGS_OVERLAY_ID='v574-class-challenge-settings-overlay';
  const SETTINGS_CLASS_ID='v574-settings-class';
  const SETTINGS_CONTENT_ID='v574-settings-content';
  const STYLE_ID='v574-gamification-polish-style';
  const TOAST_ID='v574-class-challenge-toast';
  const CACHE_MS=15000;

  let studentCache=null;
  let studentLoadedAt=0;
  let studentLoading=false;
  let studentRetry=0;
  let settingsData=null;
  let settingsLoading=false;
  let settingsReturnFocus=null;
  let previousOverflow='';
  let patchTimer=0;
  let installed=false;

  const trim=value=>String(value??'').trim();
  const integer=value=>Math.max(0,Math.round(Number(value)||0));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const html=value=>String(value??'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function normalize(payload){
    const active=integer(payload?.class?.active_students ?? payload?.summary?.active_students);
    const questions=integer(payload?.challenge?.questions_completed);
    const perStudent=Math.max(1,integer(payload?.settings?.questions_per_active_student ?? payload?.rules?.questions_per_active_student ?? 10));
    const target=Math.max(1,integer(payload?.challenge?.target_questions || active*perStudent || 10));
    const percent=clamp(integer(payload?.challenge?.progress_percent ?? Math.round(100*questions/target)),0,100);
    const enabled=payload?.challenge?.enabled!==false && payload?.settings?.challenge_enabled!==false;
    return Object.freeze({
      class:Object.freeze({
        class_id:trim(payload?.class?.class_id),
        class_name:trim(payload?.class?.class_name)||'Your class',
        year_level:integer(payload?.class?.year_level),
        active_students:active
      }),
      week:Object.freeze({
        start_date:trim(payload?.week?.start_date)||null,
        end_date:trim(payload?.week?.end_date)||null,
        today:trim(payload?.week?.today)||null,
        timezone:trim(payload?.week?.timezone)||'Asia/Brunei'
      }),
      challenge:Object.freeze({
        enabled,
        questions_completed:questions,
        target_questions:target,
        contributors:integer(payload?.challenge?.contributors),
        progress_percent:percent,
        complete:enabled && (payload?.challenge?.complete===true || questions>=target)
      }),
      settings:Object.freeze({
        challenge_enabled:enabled,
        questions_per_active_student:perStudent,
        allowed:Object.freeze((Array.isArray(payload?.settings?.allowed_questions_per_active_student)?payload.settings.allowed_questions_per_active_student:[5,10,15,20]).map(integer).filter(Boolean)),
        updated_at:trim(payload?.settings?.updated_at)||null
      })
    });
  }

  function phaseLabel(model){
    if (!model?.challenge?.enabled) return 'Paused';
    if (model.challenge.complete) return 'Challenge complete';
    const pct=integer(model.challenge.progress_percent);
    if (pct>=75) return 'Final push';
    if (pct>=50) return 'Halfway there';
    if (pct>=25) return 'Building momentum';
    return 'Getting started';
  }

  function dateLabel(value){
    if (!value) return '';
    const date=new Date(`${value}T12:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString([],{day:'numeric',month:'short'});
  }

  function weekLabel(model){
    const start=dateLabel(model?.week?.start_date);
    const end=dateLabel(model?.week?.end_date);
    return start&&end?`${start} – ${end}`:'This week';
  }

  function studentSignedIn(){
    return typeof document!=='undefined' && !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    if (!studentSignedIn()) return null;
    try {
      const from573=ROOT.V573ClassChallengesTeacherGamification?.passivePracticeAccess?.();
      if (from573?.access_token) return from573;
      const from572=ROOT.V572WeeklyMissions?.passivePracticeAccess?.();
      if (from572?.access_token) return from572;
      const access=typeof activeStudentAccess!=='undefined'?activeStudentAccess:ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose!=='practice') return null;
      return access;
    } catch { return null; }
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html.v574-class-challenge-ready #start #v573-class-challenge-card{display:none!important}
      #start #${STUDENT_CARD_ID}{border:1px solid color-mix(in srgb,#0d9a91 38%,var(--border));border-radius:20px;padding:16px;background:linear-gradient(135deg,color-mix(in srgb,#e7fbf8 72%,var(--card)),var(--card));display:grid;gap:12px;box-shadow:0 8px 24px rgba(20,120,115,.06)}
      #start .v574-challenge-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #start .v574-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.065em;color:#087e77}
      #start .v574-challenge-head h3{margin:2px 0 3px;font-size:19px;line-height:1.25}
      #start .v574-challenge-head p{margin:0;font-size:10px;color:var(--muted);line-height:1.45}
      #start .v574-week{font-size:10px;font-weight:850;border:1px solid var(--border);border-radius:999px;padding:5px 8px;background:var(--card)}
      #start .v574-progress-head{display:flex;justify-content:space-between;gap:8px;align-items:end;flex-wrap:wrap}
      #start .v574-progress-head strong{font-size:14px}#start .v574-phase{font-size:10px;font-weight:950;color:#087e77;text-transform:uppercase;letter-spacing:.04em}
      #start .v574-bar{height:11px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--border) 72%,transparent)}
      #start .v574-bar span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#109a92,#3ac5a8);transition:width .3s ease}
      #start .v574-milestones{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;font-size:9px;color:var(--muted);text-align:center}
      #start .v574-milestones span:first-child{text-align:left}#start .v574-milestones span:last-child{text-align:right}
      #start .v574-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:10px}
      #start .v574-foot p{margin:0;font-size:10px;color:var(--muted);line-height:1.45;max-width:70ch}
      #start .v574-foot button{border:1px solid var(--primary);border-radius:10px;padding:8px 11px;background:var(--primary);color:#fff;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
      html[data-theme="dark"] #start #${STUDENT_CARD_ID}{background:linear-gradient(135deg,color-mix(in srgb,#15968d 14%,var(--card)),var(--card))}
      #${TOAST_ID}{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(340px,calc(100vw - 36px));border:1px solid rgba(16,154,146,.35);border-radius:18px;padding:14px 15px;background:var(--card,#fff);box-shadow:0 18px 45px rgba(0,0,0,.18);display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center}
      #${TOAST_ID} .v574-toast-icon{font-size:32px}#${TOAST_ID} strong{display:block;font-size:13px}#${TOAST_ID} span{display:block;font-size:11px;color:var(--muted);margin-top:2px}

      #${SETTINGS_TRIGGER_ID}{white-space:nowrap}
      #${SETTINGS_OVERLAY_ID}{position:fixed;inset:0;z-index:131;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${SETTINGS_OVERLAY_ID}.hidden{display:none!important}
      #${SETTINGS_OVERLAY_ID} .v574-sheet{width:min(760px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:22px}
      #${SETTINGS_OVERLAY_ID} .v574-settings-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #${SETTINGS_OVERLAY_ID} .v574-settings-head h2{margin:0 0 4px;font-size:23px}
      #${SETTINGS_OVERLAY_ID} .v574-settings-head p{margin:0;font-size:11px;color:var(--muted);line-height:1.45}
      #${SETTINGS_OVERLAY_ID} .v574-settings-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      #${SETTINGS_OVERLAY_ID} .v574-controls{display:grid;grid-template-columns:minmax(200px,1fr) auto;gap:10px;align-items:end;margin:16px 0}
      #${SETTINGS_OVERLAY_ID} .v574-settings-card{border:1px solid var(--border);border-radius:16px;padding:14px;display:grid;gap:12px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${SETTINGS_OVERLAY_ID} .v574-toggle-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--border)}
      #${SETTINGS_OVERLAY_ID} .v574-toggle-copy strong{display:block;font-size:13px}#${SETTINGS_OVERLAY_ID} .v574-toggle-copy span{display:block;font-size:10px;color:var(--muted);margin-top:3px}
      #${SETTINGS_OVERLAY_ID} .v574-toggle{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:900}
      #${SETTINGS_OVERLAY_ID} .v574-target-grid{display:grid;grid-template-columns:minmax(210px,1fr) minmax(180px,.7fr);gap:12px;align-items:end}
      #${SETTINGS_OVERLAY_ID} .v574-preview{border:1px solid color-mix(in srgb,#0d9a91 35%,var(--border));border-radius:14px;padding:12px;background:color-mix(in srgb,#e7fbf8 48%,var(--card));display:grid;gap:6px}
      #${SETTINGS_OVERLAY_ID} .v574-preview strong{font-size:20px}#${SETTINGS_OVERLAY_ID} .v574-preview span{font-size:10px;color:var(--muted)}
      #${SETTINGS_OVERLAY_ID} .v574-save-row{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      #${SETTINGS_OVERLAY_ID} .v574-message{font-size:11px;color:var(--muted);min-height:16px}
      #${SETTINGS_OVERLAY_ID} .v574-message.ok{color:#16805d;font-weight:850}#${SETTINGS_OVERLAY_ID} .v574-message.err{color:#b42318;font-weight:850}
      #v573-class-motivation-overlay .v574-managed-note{margin-top:7px;padding:7px 9px;border:1px solid color-mix(in srgb,#0d9a91 28%,var(--border));border-radius:10px;font-size:10px;color:var(--muted)}
      @media(max-width:620px){#${SETTINGS_OVERLAY_ID}{padding:8px}#${SETTINGS_OVERLAY_ID} .v574-sheet{padding:15px;border-radius:16px}#${SETTINGS_OVERLAY_ID} .v574-controls,#${SETTINGS_OVERLAY_ID} .v574-target-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function studentRpc(token){
    const {data,error}=await cloud.rpc(RPC_STUDENT,{p_access_token:token});
    if (error) throw error;
    return data||{};
  }

  function maybeCelebrate(model){
    if (!model?.challenge?.complete || typeof window==='undefined') return;
    const key=`v574:class-complete:${model.class.class_id}:${model.week.start_date||'week'}`;
    try { if (sessionStorage.getItem(key)==='1') return; sessionStorage.setItem(key,'1'); } catch {}
    document.getElementById(TOAST_ID)?.remove();
    const toast=document.createElement('div');
    toast.id=TOAST_ID;
    toast.setAttribute('role','status');
    toast.innerHTML='<div class="v574-toast-icon">🎉</div><div><strong>Class challenge complete!</strong><span>Great teamwork — your class reached this week\'s Practice target.</span></div>';
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),5000);
  }

  function renderStudent(payload){
    if (!studentSignedIn()) return false;
    const model=normalize(payload);
    const root=document.querySelector('#start .v40c3-home-dashboard');
    if (!root?.querySelector('.v57c-continue-card')) return false;
    document.documentElement.classList.add('v574-class-challenge-ready');
    let card=document.getElementById(STUDENT_CARD_ID);
    if (!model.challenge.enabled){ card?.remove(); return true; }

    const missions=document.getElementById('v572-weekly-missions-card');
    const achievement=document.getElementById('v571b-latest-achievement');
    const fallback=root.querySelector('.v57c-secondary');
    if (!missions && !achievement && !fallback) return false;
    if (!card){ card=document.createElement('article'); card.id=STUDENT_CARD_ID; }
    if (missions){
      const old=document.getElementById('v573-class-challenge-card');
      const anchor=old||missions;
      anchor.insertAdjacentElement('afterend',card);
    } else {
      const anchor=achievement||fallback;
      anchor.insertAdjacentElement('beforebegin',card);
    }

    const c=model.challenge;
    const remaining=Math.max(0,c.target_questions-c.questions_completed);
    const classLabel=model.class.year_level?`${model.class.class_name} · Year ${model.class.year_level}`:model.class.class_name;
    const footer=c.complete
      ? `Target reached! ${c.contributors} classmates contributed this week.`
      : `${remaining} question${remaining===1?'':'s'} to go. ${c.contributors} of ${model.class.active_students} classmates have contributed so far.`;

    card.innerHTML=`
      <div class="v574-challenge-head">
        <div><div class="v574-kicker">Cooperative Class Challenge</div><h3>${c.complete?'🎉':'🤝'} ${html(model.class.class_name)} Class Question Quest</h3><p>${html(classLabel)} · Work together — no student rankings.</p></div>
        <span class="v574-week">${html(weekLabel(model))}</span>
      </div>
      <div class="v574-progress-head"><strong>${c.questions_completed} / ${c.target_questions} Practice questions</strong><span class="v574-phase">${html(phaseLabel(model))} · ${c.progress_percent}%</span></div>
      <div class="v574-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.progress_percent}"><span style="width:${c.progress_percent}%"></span></div>
      <div class="v574-milestones"><span>Start</span><span>25%</span><span>50%</span><span>Goal</span></div>
      <div class="v574-foot"><p>${html(footer)} Current target: ${model.settings.questions_per_active_student} questions × each active student.</p><button type="button" data-v574-action="learn">Keep Practising</button></div>`;
    maybeCelebrate(model);
    return true;
  }

  async function loadStudent(force=false){
    if (studentLoading || !studentSignedIn()) return false;
    if (!force && studentCache && studentLoadedAt && Date.now()-studentLoadedAt<CACHE_MS) return renderStudent(studentCache);
    const access=passivePracticeAccess();
    if (!access?.access_token) return false;
    studentLoading=true;
    try {
      const data=await studentRpc(access.access_token);
      if (!studentSignedIn()) return false;
      studentCache=data; studentLoadedAt=Date.now();
      return renderStudent(data);
    } catch(error){
      console.warn('V5.7.4 class challenge could not be refreshed.',error);
      return studentCache?renderStudent(studentCache):false;
    } finally { studentLoading=false; }
  }

  function scheduleStudent(force=false,attempt=0){
    if (studentRetry) clearTimeout(studentRetry);
    studentRetry=setTimeout(async()=>{
      studentRetry=0;
      if (!studentSignedIn()) return;
      const ok=await loadStudent(force);
      if (!ok && attempt<28) scheduleStudent(force,attempt+1);
    },attempt?180:80);
  }

  function openLearn(){
    if (ROOT.V573ClassChallengesTeacherGamification?.openLearn) return ROOT.V573ClassChallengesTeacherGamification.openLearn();
    document.querySelector('[data-v40-nav="learn"]')?.click?.();
    return true;
  }

  function currentTeacherClasses(){
    try {
      return Array.isArray(teacherClasses)
        ? teacherClasses.filter(row=>row?.active!==false).slice().sort((a,b)=>Number(a.year_level)-Number(b.year_level)||trim(a.name).localeCompare(trim(b.name),undefined,{numeric:true}))
        : [];
    } catch { return []; }
  }

  function preferredClassId(){
    const settings=document.getElementById(SETTINGS_CLASS_ID)?.value;
    if (settings) return settings;
    const motivation=document.getElementById('v573-teacher-class')?.value;
    if (motivation) return motivation;
    try { if (selectedClassId) return String(selectedClassId); } catch {}
    return String(currentTeacherClasses()[0]?.id||'');
  }

  function ensureSettingsTrigger(){
    if (typeof document==='undefined' || document.getElementById(SETTINGS_TRIGGER_ID)) return false;
    const motivation=document.getElementById('v573-open-class-motivation');
    const exportButton=document.getElementById('export-analytics');
    const anchor=motivation||exportButton;
    if (!anchor) return false;
    const button=document.createElement('button');
    button.id=SETTINGS_TRIGGER_ID;
    button.type='button';
    button.className='secondary';
    button.textContent='⚙ Class Challenge';
    button.addEventListener('click',openSettings);
    anchor.insertAdjacentElement('afterend',button);
    return true;
  }

  function ensureSettingsOverlay(){
    let overlay=document.getElementById(SETTINGS_OVERLAY_ID);
    if (overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id=SETTINGS_OVERLAY_ID;
    overlay.className='hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v574-settings-title');
    overlay.innerHTML=`<div class="v574-sheet">
      <div class="v574-settings-head">
        <div><h2 id="v574-settings-title">⚙ Class Challenge Settings</h2><p>Choose how demanding the cooperative weekly Question Quest should be. These controls never rank students or change XP.</p></div>
        <div class="v574-settings-actions"><span class="tag">V5.7.4</span><button type="button" class="outline" id="v574-settings-close">Close</button></div>
      </div>
      <div class="v574-controls"><label>Class<select id="${SETTINGS_CLASS_ID}"></select></label><button type="button" class="secondary" id="v574-settings-refresh">Refresh</button></div>
      <div id="${SETTINGS_CONTENT_ID}"><div class="v573-loading">Choose a class.</div></div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('v574-settings-close')?.addEventListener('click',closeSettings);
    document.getElementById('v574-settings-refresh')?.addEventListener('click',()=>loadSettings(true));
    document.getElementById(SETTINGS_CLASS_ID)?.addEventListener('change',()=>loadSettings(true));
    overlay.addEventListener('click',event=>{ if (event.target===overlay) closeSettings(); });
    overlay.addEventListener('keydown',event=>{ if (event.key==='Escape'){event.preventDefault();closeSettings();} });
    return overlay;
  }

  function populateSettingsClasses(){
    const select=document.getElementById(SETTINGS_CLASS_ID);
    if (!select) return;
    const classes=currentTeacherClasses();
    const preferred=preferredClassId();
    select.innerHTML=classes.length?classes.map(row=>`<option value="${html(row.id)}">${html(row.name)} · Year ${Number(row.year_level)||''}</option>`).join(''):'<option value="">No active classes</option>';
    if (classes.some(row=>String(row.id)===String(preferred))) select.value=String(preferred);
  }

  async function teacherRpc(classId){
    if (!classId) throw new Error('Choose a class.');
    const {data,error}=await cloud.rpc(RPC_TEACHER,{p_class_id:classId});
    if (error) throw error;
    return data||{};
  }

  async function updateRpc(classId,enabled,perStudent){
    const {data,error}=await cloud.rpc(RPC_UPDATE,{
      p_class_id:classId,
      p_challenge_enabled:enabled,
      p_questions_per_active_student:perStudent
    });
    if (error) throw error;
    return data||{};
  }

  function renderSettings(payload){
    settingsData=normalize(payload);
    const model=settingsData;
    const content=document.getElementById(SETTINGS_CONTENT_ID);
    if (!content) return false;
    const enabled=model.settings.challenge_enabled;
    const allowed=model.settings.allowed.length?model.settings.allowed:[5,10,15,20];
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
      const count=integer(perStudent?.value||10);
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
    const classId=document.getElementById(SETTINGS_CLASS_ID)?.value||'';
    const content=document.getElementById(SETTINGS_CONTENT_ID);
    if (!classId || !content) return false;
    settingsLoading=true;
    content.innerHTML='<div class="v573-loading">Loading class challenge settings…</div>';
    try { return renderSettings(await teacherRpc(classId)); }
    catch(error){ content.innerHTML=`<div class="v573-empty">${html(error?.message||'Settings could not be loaded.')}</div>`; return false; }
    finally { settingsLoading=false; }
  }

  async function saveSettings(){
    if (settingsLoading) return false;
    const classId=document.getElementById(SETTINGS_CLASS_ID)?.value||'';
    const enabled=!!document.getElementById('v574-enabled')?.checked;
    const perStudent=integer(document.getElementById('v574-per-student')?.value||10);
    const message=document.getElementById('v574-settings-message');
    const save=document.getElementById('v574-save');
    if (!classId) return false;
    settingsLoading=true;
    if (save) save.disabled=true;
    if (message){message.className='v574-message';message.textContent='Saving…';}
    try {
      const data=await updateRpc(classId,enabled,perStudent);
      renderSettings(data);
      const msg=document.getElementById('v574-settings-message');
      if (msg){msg.className='v574-message ok';msg.textContent=enabled?'Class challenge settings saved.':'Class challenge paused for students.';}
      studentLoadedAt=0;
      scheduleStudent(true);
      document.getElementById('v573-teacher-refresh')?.click?.();
      scheduleTeacherPatch(500);
      return true;
    } catch(error){
      if (message){message.className='v574-message err';message.textContent=error?.message||'Settings could not be saved.';}
      return false;
    } finally { settingsLoading=false; if (save) save.disabled=false; }
  }

  function openSettings(){
    const overlay=ensureSettingsOverlay();
    if (!overlay) return false;
    settingsReturnFocus=document.activeElement;
    populateSettingsClasses();
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.classList.remove('hidden');
    loadSettings(true);
    setTimeout(()=>document.getElementById(SETTINGS_CLASS_ID)?.focus(),0);
    return true;
  }

  function closeSettings(){
    const overlay=document.getElementById(SETTINGS_OVERLAY_ID);
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow=previousOverflow;
    settingsReturnFocus?.focus?.();
    settingsReturnFocus=null;
  }

  function patchTeacherChallenge(payload){
    const overlay=document.getElementById('v573-class-motivation-overlay');
    const card=overlay?.querySelector?.('.v573-class-challenge');
    if (!overlay || overlay.classList.contains('hidden') || !card) return false;
    const model=normalize(payload);
    const selected=document.getElementById('v573-teacher-class')?.value||'';
    if (selected && model.class.class_id && String(selected)!==String(model.class.class_id)) return false;
    const c=model.challenge;
    card.innerHTML=c.enabled?`
      <div class="v573-class-challenge-head"><div><div class="v573-kicker">Cooperative Class Challenge</div><h3>${c.complete?'🎉':'🤝'} ${html(model.class.class_name)} · Class Question Quest</h3></div><strong>${c.questions_completed} / ${c.target_questions} questions · ${c.progress_percent}%</strong></div>
      <div class="v573-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.progress_percent}"><span style="width:${c.progress_percent}%"></span></div>
      <p>${c.contributors} of ${model.class.active_students} students have contributed questions this week. Target = ${model.settings.questions_per_active_student} questions × each active student.</p>
      <div class="v574-managed-note">Teacher-controlled challenge · ${html(phaseLabel(model))}. Use <strong>⚙ Class Challenge</strong> to adjust or pause it.</div>`:`
      <div class="v573-class-challenge-head"><div><div class="v573-kicker">Cooperative Class Challenge</div><h3>⏸ ${html(model.class.class_name)} · Class Question Quest paused</h3></div><strong>Paused</strong></div>
      <p>Students do not currently see the class challenge. XP, streaks, badges and weekly missions continue normally.</p>
      <div class="v574-managed-note">Use <strong>⚙ Class Challenge</strong> to re-enable it or change the weekly target.</div>`;
    return true;
  }

  async function patchTeacherFromCurrentClass(){
    const classId=document.getElementById('v573-teacher-class')?.value||'';
    if (!classId) return false;
    try { return patchTeacherChallenge(await teacherRpc(classId)); }
    catch { return false; }
  }

  function scheduleTeacherPatch(delay=250){
    if (patchTimer) clearTimeout(patchTimer);
    patchTimer=setTimeout(()=>{patchTimer=0;patchTeacherFromCurrentClass();},delay);
  }

  function clearStudent(){
    studentCache=null; studentLoadedAt=0;
    document.getElementById(STUDENT_CARD_ID)?.remove();
    document.documentElement.classList.remove('v574-class-challenge-ready');
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    injectStyles(); installed=true;
    ensureSettingsTrigger();

    window.addEventListener('v573:class-challenge-updated',()=>scheduleStudent(true));
    window.addEventListener('v572:missions-updated',()=>scheduleStudent(false));
    window.addEventListener('v57c:home-updated',()=>scheduleStudent(true));
    window.addEventListener('pageshow',()=>{if(studentSignedIn())scheduleStudent(false);});
    window.addEventListener('focus',()=>{if(studentSignedIn()&&document.getElementById('start')?.classList.contains('active'))scheduleStudent(false);});

    document.addEventListener('click',event=>{
      if (event.target?.closest?.('[data-v574-action="learn"]')){event.preventDefault();openLearn();}
      if (event.target?.closest?.('#v573-open-class-motivation,#v573-teacher-refresh')) scheduleTeacherPatch(550);
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleStudent(true);
      if (event.target?.closest?.('#v40c-student-logout')) clearStudent();
    },true);
    document.addEventListener('change',event=>{
      if (event.target?.id==='v573-teacher-class') scheduleTeacherPatch(500);
    },true);

    new MutationObserver(()=>ensureSettingsTrigger()).observe(document.body,{childList:true,subtree:true});
    scheduleStudent(true);
    return true;
  }

  const api=Object.freeze({
    RPC_STUDENT,RPC_TEACHER,RPC_UPDATE,normalize,phaseLabel,weekLabel,passivePracticeAccess,
    renderStudent,loadStudent,openSettings,closeSettings,renderSettings,loadSettings,saveSettings,
    patchTeacherChallenge,teacherRpc,updateRpc,openLearn
  });

  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V574GamificationPolishTeacherControls',{value:api,writable:false,configurable:false});
    wire();
  }
})();
