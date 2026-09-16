window.MATH_APP_CONFIG = {
  supabaseUrl: 'https://lmveznstltjxzpalcmid.supabase.co',
  supabasePublishableKey: 'sb_publishable_0ArG2t1Zgln135ctDR6pQw_QY_z3yf8',
  // Optional. Leave blank to use the current deployed page URL.
  // Example: 'https://your-site.netlify.app/'
  authRedirectUrl: ''
};

/*
 * V3.8.1 AI Help connectivity hotfix.
 *
 * Keep the normal Supabase client unchanged for the rest of the app. AI Help
 * requests are routed through a small compatibility Edge Function whose only
 * job is to handle browser CORS robustly, then forward the unchanged JSON body
 * to the protected V3.8 AI Help function. Student authorization remains the
 * temporary practice token inside the request body; no protected content or
 * service-role credential is exposed to the browser.
 */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const oldPath = '/functions/v1/student-ai-help-v38';
  const compatibilityPath = '/functions/v1/student-ai-help-v381';

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string'
      ? input
      : (input instanceof Request ? input.url : String(input?.url || input || ''));

    if (!url.includes(oldPath)) {
      return nativeFetch(input, init);
    }

    const redirectedUrl = url.replace(oldPath, compatibilityPath);

    if (input instanceof Request) {
      const redirectedRequest = new Request(redirectedUrl, input);
      return nativeFetch(redirectedRequest, init);
    }

    return nativeFetch(redirectedUrl, init);
  };
})();

/* Current release title/badge identity is applied by version.js after the staged
   runtime list below is available. */

/* Stable V3.9/V4.x/V5.x foundation plus signed-off V5.4, V5.5 and V5.6 checkpoints.
   V5.6.1 keeps the student entry Practice-first. V5.7A adds secure cross-device
   Past Paper Practice checkpoints over the accepted V5.5C same-device fallback.
   V5.7A manual-test hardening keeps background checkpoint refreshes passive and
   preserves the explicit in-quiz cloud-save confirmation.
   V5.7B adds teacher assignment scheduling, close/reopen, reassign-as-new and
   student completion management without changing student grading or Exam Mode.
   V5.7C makes signed-in Home Practice-first: resume saved Past Paper work, surface
   teacher assignments, recommended Practice and the latest Practice result without
   requiring Exam access. V5.7D turns Past Paper Analytics into safe teacher actions:
   prepare targeted cohorts in the existing assignment form, open assignment
   management, or copy a teaching focus plan. V5.7D.1 hardens focus-plan copying
   with synchronous and selectable in-app fallbacks for restricted clipboard contexts.
   V5.7D performs no automatic assignment writes. V5.7E consolidates the accepted
   V5.7A-D sequence as the V5.7 stable release identity and audit checkpoint; the
   checkpoint itself makes no network or data writes. V5.7.1A adds a read-only
   student XP + level card on top of the accepted Continue Learning Home, derived
   from verified saved Practice activity and excluding Exam activity. V5.7.1B adds
   a gentle Practice streak and achievement badges derived from the same saved,
   non-Exam learning evidence; no streak/badge write path is introduced. V5.7.2 adds
   three weekly Practice missions that reset each Monday in Brunei time and are
   derived from saved non-Exam activity without a mission write path. V5.7.3 adds
   a cooperative class question challenge plus an alphabetical teacher motivation
   view for XP, streaks and weekly missions. It deliberately adds no leaderboard,
   class-v-class competition or gamification write path. V5.7.4 polishes the class
   challenge and adds teacher-only controls to enable/pause it and choose a target
   of 5, 10, 15 or 20 questions per active student. Student reads remain aggregate,
   Exam activity is excluded and XP rules are unchanged. V5.7.5 consolidates the
   accepted gamification sequence as a presentation/audit-only stable checkpoint;
   it adds no network calls, data writes or learning-rule changes. V5.7.6 adds an
   in-app student feedback form and secure teacher Feedback Inbox so classroom
   problems and suggestions can be captured without exposing access tokens, answers
   or grading data. V5.7.6.1 keeps that workflow unchanged while moving the student
   feedback trigger to a compact top-right Home icon. V5.7.6.3 mirrors that compact
   presentation for teachers by placing a proxy Feedback Inbox icon beside the
   Teacher Dashboard title without adding network calls. V5.8A adds a lightweight
   first-use Home card for students who have not yet earned the existing First
   Practice achievement. It prepares the established Mixed Practice controls for
   five questions and forwards to the existing Start Practice flow; assignments,
   saved Past Paper checkpoints, grading, XP and achievement ownership are unchanged.
   V5.8B adds a task-grouped Teacher Workspace launcher over the established teacher
   tools. It delegates to existing tabs and overlay triggers only; no analytics,
   assignment, reporting, content, feedback or data authority is duplicated.
   V5.8C adds a teacher-only parent/family progress summary derived entirely from
   the established Student Performance Report snapshot, with a printable Practice-
   focused view and no new reporting calculation, persistence or parent account.
   V5.8D consolidates the established content tools into a source-aware teacher route:
   Import, Validate, Review, Practice availability, topical publication and Audit.
   It is navigation/presentation only; Exam publication remains in Exam Settings and
   is intentionally not promoted while Exam Mode is deferred. V5.8 Stable then
   consolidates the accepted V5.8A-D sequence as the authoritative V5.8 release
   identity and audit checkpoint without adding network calls or data writes.
   V5.8.1A reconciles the Results screen against the saved cloud result so post-save
   browser/localStorage failures cannot mislabel a successful submission as a local
   backup, and it keeps stale pre-assignment results from being presented as the
   completion result for a newly started teacher assignment.
   V5.9A Student Home Refresh is accepted as the V5.9 production presentation layer.
   It remains a single presentation/navigation module over the established learning
   owners and adds no direct network, persistence, grading, assignment-write,
   recommendation or Exam authority.
   Legacy release-label-only scripts remain archived in the repository; current
   staged loading remains coordinated by v40-release.js. */

/* Phase 2: the current displayed release is derived from this exact staged list. */
const MATH_APP_STAGED_SCRIPTS = Object.freeze([
  './version.js',
  './v38-ai-help.js',
  './v38-ai-admin.js',
  './v38-ai-polish.js',
  './v39-student-polish.js',
  './v39-practice-polish.js',
  './v39-dashboard-polish.js',
  './v39-state-polish.js',
  './v40-student-platform.js',
  './v40-student-nav.js',
  './v40-student-session.js',
  './v40-learn-setup.js',
  './v40-learning-priorities.js',
  './v40-platform-polish.js',
  './v40-release.js',
  './v40-start-shell.js',
  './v54-stable-release-checkpoint.js',
  './past-paper-core.js',
  './past-paper-resume.js',
  './past-paper-results.js',
  './v55-stable-release-checkpoint.js',
  './v56a-question-bank-response-filter.js',
  './v56a1-bulk-practice-confirmation-bridge.js',
  './past-paper-assignments.js',
  './past-paper-progress.js',
  './past-paper-analytics.js',
  './v56-stable-release-checkpoint.js',
  './v561-practice-first-student-experience.js',
  './past-paper-cross-device.js',
  './v57b-teacher-assignment-management.js',
  './v57c-student-continue-learning-home.js',
  './past-paper-analytics-actions.js',
  './v57-stable-release-checkpoint.js',
  './gamification-core.js',
  './gamification-student.js',
  './gamification-teacher.js',
  './v575-gamification-stable-checkpoint.js',
  './v576-classroom-feedback-support.js',
  './v5761-feedback-trigger-position.js',
  './v5763-teacher-feedback-header-icon.js',
  './v58a-student-first-use-experience.js',
  './v58b-teacher-workspace-consolidation.js',
  './v58c-parent-friendly-student-report.js',
  './v58c-parent-summary-workspace-shortcut.js',
  './v58d-content-workflow-consolidation.js',
  './v581a-practice-cloud-result-reconciliation.js',
  './v58-stable-release-checkpoint.js',
  './v59a-student-home-refresh.js',
  './v59b-adaptive-diagnostic-pilot-v2.js'
]);

Object.defineProperty(window,'MATH_APP_STAGED_SCRIPTS',{
  value:MATH_APP_STAGED_SCRIPTS,
  writable:false,
  configurable:false
});

window.addEventListener('load', () => {
  MATH_APP_STAGED_SCRIPTS.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  });

}, { once: true });

/* Stage 3F deploy-preview-only supervised pilot selector.
   Temporary supervised classroom pilot aid only. It is inert unless all gates hold:
   Netlify deploy-preview hostname, ?adaptivePilot=2, and one of the five explicitly
   approved pilot roster UUIDs. It delegates to ordinary startPractice(), then pins
   an item already returned by the normal eligible Practice pool. No direct
   Supabase/adaptive RPC is introduced. */
(() => {
  const marker='__v59bAdaptivePilotSupervisedSelectorInstalled';
  const pilotRosters=new Set([
    '5e386522-ae0f-4c82-8cf3-6bf0979272f7',
    '02a5b3b6-c5d7-4ab4-bd35-2c7989b6b3d1',
    '7dae8fc9-cb6a-441f-9549-2de1f0ba158d',
    'd8ef6d90-f1f3-4f60-8a26-0f8d927b2c07',
    '7e4457ae-ba55-4bc4-8814-4a8bdf92ee6d'
  ]);
  const params=new URLSearchParams(location.search);
  const preview=/^deploy-preview-\d+--.+\.netlify\.app$/i.test(location.hostname);
  if(!preview||params.get('adaptivePilot')!=='2'||window[marker])return;
  window[marker]=true;

  const targets={
    q9b:{id:'c4feda04-6c85-4123-baf6-8e38deb1d1fa',label:'2025 P1 Q9(b)',topic:'Decimals'},
    q4:{id:'c2041abf-d204-47b3-ba92-3129c97681ae',label:'2025 P2 Q4',topic:'Fractions'}
  };

  const isPilot=()=>{
    try{
      return typeof activeStudentAccess!=='undefined'&&
        pilotRosters.has(String(activeStudentAccess?.roster_student_id||''));
    }catch{return false;}
  };
  const pick=(id,wanted)=>{
    const s=document.getElementById(id);if(!s)return false;
    const o=[...s.options].find(x=>String(x.value)===String(wanted)||String(x.textContent||'').trim()===String(wanted));
    if(!o)return false;s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return true;
  };
  const contains=(item,id)=>String(item?.id||'')===id||(item?._kind==='multipart'&&Array.isArray(item.parts)&&item.parts.some(p=>String(p?.id||'')===id));
  const status=(text,error=false)=>{const el=document.getElementById('v59b2-smoke-status');if(el){el.textContent=text;el.style.color=error?'var(--danger,#b42318)':'var(--muted,#667085)';}};

  async function launch(key){
    const target=targets[key];if(!target)return;
    if(!isPilot()){status('This selector is available only to approved pilot accounts.',true);return;}
    if(typeof startPractice!=='function'||typeof renderQuestion!=='function'){status('Normal Practice is not ready yet.',true);return;}
    const ids=['year-level','strand-filter','topic-filter','difficulty-filter','question-count'];
    const saved=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.value??null]));
    try{
      document.getElementById('practice-mode-btn')?.click();
      if(!pick('year-level','6')||!pick('strand-filter','number'))throw new Error('Year 6 Number Practice controls are unavailable.');
      await new Promise(r=>setTimeout(r,0));
      if(!pick('topic-filter',target.topic)||!pick('difficulty-filter','standard'))throw new Error(`${target.topic} Standard Practice controls are unavailable.`);
      const count=document.getElementById('question-count');if(!count)throw new Error('Question-count control is unavailable.');
      const option=document.createElement('option');option.value='500';option.textContent='500';option.dataset.v59b2SmokeCount='true';count.appendChild(option);count.value='500';
      status(`Loading ${target.label} through normal Practice…`);
      await startPractice();
      if(typeof state==='undefined'||!Array.isArray(state?.questions))throw new Error('Normal Practice did not start.');
      const item=state.questions.find(q=>contains(q,target.id));
      if(!item)throw new Error(`${target.label} was not returned by the normal eligible Practice pool.`);
      state.questions=[item];state.index=0;state.count=1;renderQuestion();
      status(`${target.label} loaded. Complete it using the normal Practice controls.`);
    }catch(error){
      console.warn('V5.9B deploy-preview supervised pilot selector failed.',error);
      try{if(typeof show==='function')show('start');}catch{}
      status(error?.message||'Could not launch the selected target.',true);
    }finally{
      document.querySelector('#question-count option[data-v59b2-smoke-count="true"]')?.remove();
      const year=document.getElementById('year-level');if(year&&saved['year-level']!==null)year.value=saved['year-level'];
      const strand=document.getElementById('strand-filter');if(strand&&saved['strand-filter']!==null){strand.value=saved['strand-filter'];strand.dispatchEvent(new Event('change',{bubbles:true}));}
      const topic=document.getElementById('topic-filter');if(topic&&saved['topic-filter']!==null)topic.value=saved['topic-filter'];
      const difficulty=document.getElementById('difficulty-filter');if(difficulty&&saved['difficulty-filter']!==null)difficulty.value=saved['difficulty-filter'];
      const count=document.getElementById('question-count');if(count&&saved['question-count']!==null)count.value=saved['question-count'];
    }
  }

  function install(){
    if(document.getElementById('v59b2-smoke-selector'))return true;
    if(!isPilot())return false;
    const setup=document.querySelector('#start .v40c-learn-setup');const actions=setup?.querySelector('.v40c-learn-actions');if(!setup||!actions)return false;
    const panel=document.createElement('section');panel.id='v59b2-smoke-selector';panel.style.cssText='margin:0 18px 18px;padding:14px;border:1px dashed var(--primary,#2563eb);border-radius:14px;background:var(--card,#fff)';
    panel.innerHTML='<strong style="display:block;margin-bottom:4px">Adaptive pilot practice</strong><p style="margin:0 0 10px;color:var(--muted,#667085);font-size:12px">Choose the question your teacher asks you to try. Pilot preview only.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="outline" data-v59b2-smoke-target="q9b">2025 P1 Q9(b)</button><button type="button" class="outline" data-v59b2-smoke-target="q4">2025 P2 Q4</button></div><p id="v59b2-smoke-status" aria-live="polite" style="margin:10px 0 0;font-size:12px"></p>';
    panel.querySelectorAll('[data-v59b2-smoke-target]').forEach(b=>b.addEventListener('click',()=>launch(b.dataset.v59b2SmokeTarget)));
    actions.insertAdjacentElement('beforebegin',panel);return true;
  }
  let tries=0;const timer=setInterval(()=>{tries+=1;if(install()||tries>=600)clearInterval(timer);},100);
})();