from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def write(rel, text):
    (ROOT / rel).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def replace_between(text, start, end, new, label):
    i = text.find(start)
    if i < 0:
        raise RuntimeError(f'{label}: start marker not found')
    j = text.find(end, i + len(start))
    if j < 0:
        raise RuntimeError(f'{label}: end marker not found')
    return text[:i] + new + text[j:]


# -----------------------------------------------------------------------------
# index.html — move the stable authenticated Home structure into source HTML.
# -----------------------------------------------------------------------------
index = read('site/index.html')

pre_js_css = r'''

/* Option 2B: authenticated Home is source HTML, but stays hidden while logged out
   even before the staged presentation scripts install their equivalent rules. */
#start.v40-shell-logged-out .v40-learning-hub-hero,
#start.v40-shell-logged-out .v40c3-home-dashboard,
#start.v40-shell-logged-out .v40-platform-section,
#start.v40-shell-logged-out .v40-section-note{
  display:none!important;
}
'''
if 'Option 2B: authenticated Home is source HTML' not in index:
    index = replace_once(index, '\n</style>\n</head>', pre_js_css + '\n</style>\n</head>', 'index pre-JS CSS')

old_buttons = '''<div class="buttons">
  <button id="start-btn" class="primary">Start Practice</button>
  <button id="my-progress-btn" class="secondary hidden">📊 My Progress</button>
  <button id="my-assignments-btn" class="secondary hidden">
  📚 My Assignments
</button>
  <button id="check-reviewed-btn" class="secondary">Check Reviewed Work</button>
  <button id="teacher-btn" class="secondary">Teacher Dashboard</button>
  <button id="setup-btn" class="outline">Cloud Setup</button>
</div>  
'''

static_home = '''<div class="v39-home-hub v40-platform-ready">
  <section class="v40-learning-hub-hero" aria-label="Student learning hub">
    <div>
      <div class="v40-learning-hub-kicker">Your learning hub</div>
      <h2>Learn, check your progress, and keep improving.</h2>
      <p>Sign in to load your current learning priorities, assignments, Practice progress and achievements.</p>
    </div>
    <div class="v40-learning-cycle" aria-label="Learning cycle">
      <span>✏️ Learn</span><b>→</b><span>📊 Check</span><b>→</b><span>🌱 Improve</span>
    </div>
  </section>

  <section class="v40c3-home-dashboard v40c3-ready" data-v40-static-home="true" data-v57c-rendered="false" aria-label="Learning priorities">
    <article id="v571a-gamification-card" class="hidden" data-v40-static-card="xp" aria-label="XP and level">
      <div class="v40-static-placeholder">XP and level will appear after sign-in.</div>
    </article>

    <article id="v58a-first-use-card" class="hidden" data-v40-static-card="first-use" aria-label="First Practice">
      <div class="v58a-icon" aria-hidden="true">👋</div>
      <div class="v58a-main">
        <div class="v58a-kicker">Your first step</div>
        <h2>Ready for your first short Practice?</h2>
        <p>Your starter activity will appear here when it is the best next step.</p>
        <div class="v58a-meta"><span>5 questions</span><span>Mixed Practice</span><span>Hints available</span></div>
      </div>
      <button type="button" class="primary v58a-start">Start My First 5 Questions</button>
    </article>

    <article class="v57c-continue-card" data-v57c-kind="loading" data-v40-static-card="continue">
      <div>
        <div class="v57c-kicker">Continue Learning</div>
        <h2 data-v57c-priority-title>Preparing your next learning step…</h2>
        <p data-v57c-priority-text>Your assignments, saved Practice and recommendations will appear here after sign-in.</p>
        <div class="v57c-meta" data-v57c-priority-meta></div>
      </div>
      <button type="button" class="primary v57c-primary" disabled>Preparing…</button>
    </article>

    <div class="v57c-home-grid">
      <article class="v57c-mini-card" data-v57c-card="assignments" data-v40-static-card="teacher-work">
        <div class="v57c-mini-kicker">Teacher work</div>
        <strong data-v57c-assignment-title>Checking assignments…</strong>
        <p data-v57c-assignment-text>Your current teacher Practice will appear here.</p>
        <button type="button" class="outline v57c-assignments">My Assignments</button>
      </article>

      <article class="v57c-mini-card" data-v57c-card="recommendation" data-v40-static-card="recommendation">
        <div class="v57c-mini-kicker">Recommended next</div>
        <strong data-v57c-recommendation-title>Preparing recommendation…</strong>
        <p data-v57c-recommendation-text>Your next recommended Practice will appear here.</p>
        <button type="button" class="outline v57c-recommend" disabled>Practice Recommendation</button>
      </article>

      <article class="v57c-mini-card" data-v57c-card="recent" data-v40-static-card="recent-practice">
        <div class="v57c-mini-kicker">Recent Practice</div>
        <strong data-v57c-recent-title>Checking recent Practice…</strong>
        <div class="v57c-recent-metrics hidden" data-v57c-recent-metrics>
          <span data-v57c-first-try>First try —</span>
          <span data-v57c-mastery>Mastery —</span>
        </div>
        <p data-v57c-recent-text>Your latest completed Practice result will appear here.</p>
        <button type="button" class="outline v57c-result hidden">View Result</button>
        <button type="button" class="outline v57c-progress" data-v57c-recent-progress>My Progress</button>
      </article>
    </div>

    <article id="v572-weekly-missions-card" class="hidden" data-v40-static-card="missions" aria-label="Weekly missions">
      <div class="v40-static-placeholder">Weekly missions will appear after sign-in.</div>
    </article>

    <article id="v574-class-challenge-card" class="hidden" data-v40-static-card="class-challenge" aria-label="Class challenge">
      <div class="v40-static-placeholder">Class challenge will appear when enabled.</div>
    </article>

    <article id="v571b-latest-achievement" class="hidden" data-v40-static-card="achievement" aria-label="Latest achievement">
      <div class="v40-static-placeholder">Achievements will appear after sign-in.</div>
    </article>

    <div class="v57c-secondary">
      <button type="button" class="outline v57c-learn">Open Learn</button>
      <button type="button" class="outline v57c-progress">My Progress</button>
    </div>
  </section>

  <section class="v40-platform-section" data-section="continue">
    <div class="v39-section-head">
      <div>
        <h2>Continue Learning</h2>
        <p>Start a new activity or continue work from your teacher.</p>
      </div>
    </div>
    <div class="v39-student-action-grid">
      <article class="v39-action-card" data-action-for="start-btn" data-emphasis="primary">
        <div class="v39-action-icon" aria-hidden="true">✏️</div>
        <div class="v39-action-copy">
          <div class="v39-action-title">Learn</div>
          <div class="v39-action-description">Choose Practice or Exam, adjust your activity if needed, then start.</div>
        </div>
        <button id="start-btn" class="primary">Start Practice</button>
      </article>
      <article class="v39-action-card" data-action-for="my-assignments-btn">
        <div class="v39-action-icon" aria-hidden="true">📚</div>
        <div class="v39-action-copy">
          <div class="v39-action-title">My Assignments</div>
          <div class="v39-action-description">See work your teacher has assigned and continue where you left off.</div>
        </div>
        <button id="my-assignments-btn" class="secondary hidden">📚 My Assignments</button>
      </article>
    </div>
  </section>

  <section class="v40-platform-section" data-section="learning">
    <div class="v39-section-head">
      <div>
        <h2>My Learning</h2>
        <p>See what to practise next and learn from your previous work.</p>
      </div>
    </div>
    <div class="v39-student-action-grid">
      <article class="v39-action-card" data-action-for="my-progress-btn">
        <div class="v39-action-icon" aria-hidden="true">📊</div>
        <div class="v39-action-copy">
          <div class="v39-action-title">My Progress</div>
          <div class="v39-action-description">See your progress, achievements and recommended practice.</div>
        </div>
        <button id="my-progress-btn" class="secondary hidden">📊 My Progress</button>
      </article>
      <article class="v39-action-card" data-action-for="check-reviewed-btn">
        <div class="v39-action-icon" aria-hidden="true">✅</div>
        <div class="v39-action-copy">
          <div class="v39-action-title">Reviewed Work</div>
          <div class="v39-action-description">Check feedback on work that has been reviewed by your teacher.</div>
        </div>
        <button id="check-reviewed-btn" class="secondary">Check Reviewed Work</button>
      </article>
    </div>
    <p class="v40-section-note">Recommended Practice, achievements and teacher messages are available inside My Progress.</p>
  </section>

  <section class="v39-teacher-zone" aria-label="Teacher tools">
    <div class="v39-teacher-zone-head"><span aria-hidden="true">🔒</span><span>Teacher tools</span></div>
    <div class="v39-teacher-actions">
      <button id="teacher-btn" class="secondary">Teacher Dashboard</button>
      <button id="setup-btn" class="outline">Cloud Setup</button>
    </div>
  </section>
</div>
'''
index = replace_once(index, old_buttons, static_home, 'index static Home')
write('site/index.html', index)


# -----------------------------------------------------------------------------
# v40-learning-priorities.js — retain compatibility but enhance stable Home nodes.
# -----------------------------------------------------------------------------
v40 = read('site/v40-learning-priorities.js')
v40 = replace_once(
    v40,
    "  let lastIdentityKey = '';\n",
    "  let lastIdentityKey = '';\n  let legacyPriorityContext = null;\n",
    'v40 legacy context',
)

v40_build_and_helpers = r'''  function buildDashboard(){
    const hub = document.querySelector('#start .v39-home-hub');
    const hero = hub?.querySelector('.v40-learning-hub-hero');
    if (!hub || !hero) return null;

    let dashboard = hub.querySelector('.v40c3-home-dashboard');
    if (dashboard) return dashboard;

    // Compatibility fallback for isolated/legacy hosts. The production index owns
    // this structure statically; this branch only runs if that source HTML is absent.
    dashboard = document.createElement('section');
    dashboard.className = 'v40c3-home-dashboard v40c3-ready';
    dashboard.setAttribute('aria-label', 'Learning priorities');
    dashboard.innerHTML = `
      <article class="v57c-continue-card" data-v57c-kind="loading">
        <div>
          <div class="v57c-kicker">Continue Learning</div>
          <h2 data-v57c-priority-title>Preparing your next learning step…</h2>
          <p data-v57c-priority-text>Your learning priorities will appear here after sign-in.</p>
          <div class="v57c-meta" data-v57c-priority-meta></div>
        </div>
        <button type="button" class="primary v57c-primary" disabled>Preparing…</button>
      </article>`;
    hero.insertAdjacentElement('afterend', dashboard);
    return dashboard;
  }

  function priorityNodes(dashboard){
    const card = dashboard?.querySelector('.v57c-continue-card') || dashboard?.querySelector('.v40c3-priority-card');
    return {
      card,
      title: card?.querySelector('[data-v57c-priority-title],.v40c3-priority-title') || null,
      text: card?.querySelector('[data-v57c-priority-text],.v40c3-priority-text') || null,
      meta: card?.querySelector('[data-v57c-priority-meta],.v40c3-priority-meta') || null,
      button: card?.querySelector('.v57c-primary,.v40c3-priority-action') || null
    };
  }

  function setPriorityMeta(container, values){
    if (!container) return;
    const fragment = document.createDocumentFragment();
    (Array.isArray(values) ? values : []).forEach(value => {
      const span = document.createElement('span');
      span.textContent = String(value || '');
      fragment.appendChild(span);
    });
    container.replaceChildren(fragment);
  }

  function setPriorityShell(dashboard, priority, { disabled = false } = {}){
    const nodes = priorityNodes(dashboard);
    if (!nodes.card) return false;
    nodes.card.dataset.v57cKind = priority?.kind || 'learn';
    nodes.card.dataset.v40c3Kind = priority?.kind || 'learn';
    if (nodes.title) nodes.title.textContent = `${priority?.icon || '✏️'} ${priority?.title || 'Continue learning'}`;
    if (nodes.text) nodes.text.textContent = priority?.text || 'Your personalised next step will appear here.';
    setPriorityMeta(nodes.meta, priority?.meta || []);
    if (nodes.button) {
      nodes.button.textContent = priority?.action || 'Open Learn';
      nodes.button.disabled = !!disabled;
    }
    dashboard.classList.add('v40c3-ready');
    return true;
  }

  function setPriorityLoading(dashboard, text){
    if (!dashboard || dashboard.dataset.v57cRendered === 'true') return;
    legacyPriorityContext = null;
    setPriorityShell(dashboard, {
      kind:'loading', icon:'⏳', title:'Preparing your next learning step',
      text:text || 'Refreshing your learning priorities…', action:'Preparing…', meta:[]
    }, { disabled:true });
  }

  function bindLegacyPriorityAction(dashboard){
    if (!dashboard || dashboard.dataset.v40c3ActionBound === 'true') return;
    dashboard.dataset.v40c3ActionBound = 'true';
    dashboard.addEventListener('click', event => {
      if (dashboard.dataset.v57cRendered === 'true') return;
      const button = event.target?.closest?.('.v57c-primary,.v40c3-priority-action');
      if (!button || !dashboard.contains(button) || button.disabled) return;
      const context = legacyPriorityContext;
      if (!context?.priority) return;
      if (context.priority.kind === 'assignment') openAssignments();
      else if (context.priority.kind === 'focus') startRecommendation(context.focusPractice);
      else if (context.priority.kind === 'recommendation') startRecommendation(context.recommendation);
      else openLearn();
    });
  }

'''
v40 = replace_between(v40, '  function buildDashboard(){', '  function setHero(', v40_build_and_helpers, 'v40 buildDashboard')

v40_render = r'''  function renderDashboard(data){
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard || dashboard.dataset.v57cRendered === 'true') return;

    const assignments = Array.isArray(data.assignments?.assignments)
      ? data.assignments.assignments
      : [];
    const recommendation = data.recommendation || {};
    const progress = data.progress || {};
    const student = progress.student || data.assignments?.student || {};
    const focusPractice = focusPracticeFromProgress(progress);
    const priority = choosePriority(assignments, recommendation, focusPractice);

    legacyPriorityContext = { priority, recommendation, focusPractice };
    bindLegacyPriorityAction(dashboard);
    setPriorityShell(dashboard, priority);
    dashboard.dataset.v40c3LegacyRendered = 'true';
    setHero(student.student_name || activeStudentAccess?.student_name || 'Student');
  }

  function renderLoadProblem(){
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard || dashboard.dataset.v57cRendered === 'true') return;
    legacyPriorityContext = {
      priority:{ kind:'learn' }, recommendation:null, focusPractice:null
    };
    bindLegacyPriorityAction(dashboard);
    setPriorityShell(dashboard, {
      kind:'learn', icon:'✏️', title:'Continue learning',
      text:'Your personalised priority could not be refreshed right now, but you can still open Learn, Assignments or Progress.',
      action:'Open Learn', meta:[]
    });
  }

'''
v40 = replace_between(v40, '  function renderDashboard(data){', '  async function loadHomePriorities(', v40_render, 'v40 renderDashboard')

old_loading = """    dashboard.classList.remove('v40c3-ready');
    dashboard.innerHTML = '<div class=\"v40c3-loading\">Refreshing your learning priorities…</div>';
"""
v40 = replace_once(v40, old_loading, "    setPriorityLoading(dashboard, 'Refreshing your learning priorities…');\n", 'v40 loading wipe')

v40_clear = r'''  function clearDashboard(){
    ++requestId;
    lastLoadedAt = 0;
    lastIdentityKey = '';
    legacyPriorityContext = null;
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (dashboard) {
      dashboard.dataset.v40c3LegacyRendered = 'false';
      dashboard.dataset.v57cRendered = 'false';
      setPriorityShell(dashboard, {
        kind:'loading', icon:'⏳', title:'Preparing your next learning step',
        text:'Sign in to load your assignments, saved Practice and recommendations.',
        action:'Preparing…', meta:[]
      }, { disabled:true });
    }
    setHero('');
  }

'''
v40 = replace_between(v40, '  function clearDashboard(){', '  function watchSession(){', v40_clear, 'v40 clearDashboard')
write('site/v40-learning-priorities.js', v40)


# -----------------------------------------------------------------------------
# v57c-student-continue-learning-home.js — targeted enhancement of static cards.
# -----------------------------------------------------------------------------
v57 = read('site/v57c-student-continue-learning-home.js')
v57 = replace_once(
    v57,
    '  let retryTimer = 0;\n',
    '  let retryTimer = 0;\n  let currentHomeModel = null;\n',
    'v57 current model',
)

v57_helpers = r'''  function dashboard(){ return typeof document==='undefined'?null:document.querySelector(DASHBOARD_SELECTOR); }

  function setText(root, selector, value){
    const node=root?.querySelector(selector);
    if (node) node.textContent=String(value ?? '');
    return node;
  }

  function setHidden(root, selector, hidden){
    const node=root?.querySelector(selector);
    node?.classList.toggle('hidden', !!hidden);
    return node;
  }

  function renderMeta(container, values){
    if (!container) return;
    const fragment=document.createDocumentFragment();
    (Array.isArray(values)?values:[]).forEach(value=>{
      const span=document.createElement('span');
      span.textContent=String(value ?? '');
      fragment.appendChild(span);
    });
    container.replaceChildren(fragment);
  }

  function resetHome(){
    const root=dashboard();
    currentHomeModel=null;
    if (!root) return false;

    root.dataset.v57cRendered='false';
    root.classList.remove('v57c-ready');
    root.classList.add('v40c3-ready');

    const continueCard=root.querySelector('.v57c-continue-card');
    if (continueCard) continueCard.dataset.v57cKind='loading';
    setText(root,'[data-v57c-priority-title]','Preparing your next learning step…');
    setText(root,'[data-v57c-priority-text]','Sign in to load your assignments, saved Practice and recommendations.');
    renderMeta(root.querySelector('[data-v57c-priority-meta]'),[]);
    const primary=root.querySelector('.v57c-primary');
    if (primary){ primary.textContent='Preparing…'; primary.disabled=true; }

    setText(root,'[data-v57c-assignment-title]','Checking assignments…');
    setText(root,'[data-v57c-assignment-text]','Your current teacher Practice will appear here.');
    setText(root,'[data-v57c-recommendation-title]','Preparing recommendation…');
    setText(root,'[data-v57c-recommendation-text]','Your next recommended Practice will appear here.');
    const recommend=root.querySelector('.v57c-recommend');
    if (recommend) recommend.disabled=true;

    setText(root,'[data-v57c-recent-title]','Checking recent Practice…');
    setText(root,'[data-v57c-recent-text]','Your latest completed Practice result will appear here.');
    setText(root,'[data-v57c-first-try]','First try —');
    setText(root,'[data-v57c-mastery]','Mastery —');
    setHidden(root,'[data-v57c-recent-metrics]',true);
    setHidden(root,'.v57c-result',true);
    setHidden(root,'[data-v57c-recent-progress]',false);

    const hero=document.querySelector('#start .v40-learning-hub-hero');
    const heading=hero?.querySelector('h2');
    const paragraph=hero?.querySelector('p');
    if (heading) heading.textContent='Learn, check your progress, and keep improving.';
    if (paragraph) paragraph.textContent='Sign in to load your current learning priorities, assignments, Practice progress and achievements.';
    return true;
  }

  function bindDashboardActions(root){
    if (!root || root.dataset.v57cActionsBound==='true') return;
    root.dataset.v57cActionsBound='true';
    root.addEventListener('click',async event=>{
      if (root.dataset.v57cRendered!=='true') return;
      const target=event.target;
      if (target?.closest?.('.v57c-primary')){
        await runPriority(currentHomeModel?.priority,target.closest('.v57c-primary'));
        return;
      }
      if (target?.closest?.('.v57c-assignments')){ openAssignments(); return; }
      if (target?.closest?.('.v57c-recommend')){ await startRecommendation(currentHomeModel?.recommendation); return; }
      if (target?.closest?.('.v57c-result')){ openResult(currentHomeModel?.recent?.result_code); return; }
      if (target?.closest?.('.v57c-progress')){ openProgress(); return; }
      if (target?.closest?.('.v57c-learn')) openLearn();
    });
  }

'''
v57 = replace_between(v57, '  function dashboard(){ return typeof document===\'undefined\'?null:document.querySelector(DASHBOARD_SELECTOR); }', '  function openLearn(){', v57_helpers, 'v57 dashboard helpers')

v57_render = r'''  function render(model){
    const root=dashboard();
    if (!root) return false;
    const now=Date.now();
    const priority=chooseContinuePriority(model,now);
    const assignmentStats=assignmentSummary(model?.assignments,now);
    const rec=model?.recommendation || {};
    const recTitle=recommendationTitle(rec) || 'Mixed Practice';
    const recent=recentPractice(model?.progress);
    const mastery=Number(recent?.mastery_percent);
    const first=Number(recent?.first_try_percent);
    const recentDate=recent?.completed_at ? new Date(recent.completed_at) : null;
    const recentWhen=recentDate && !Number.isNaN(recentDate.getTime()) ? recentDate.toLocaleDateString([],{day:'numeric',month:'short'}) : '';
    const student=model?.progress?.student || model?.student || {};

    const continueCard=root.querySelector('.v57c-continue-card');
    const assignmentCard=root.querySelector('[data-v57c-card="assignments"]');
    const recommendationCard=root.querySelector('[data-v57c-card="recommendation"]');
    const recentCard=root.querySelector('[data-v57c-card="recent"]');
    if (!continueCard || !assignmentCard || !recommendationCard || !recentCard) return false;

    renderBusy=true;
    try {
      currentHomeModel={priority,recommendation:rec,recent};
      bindDashboardActions(root);

      continueCard.dataset.v57cKind=priority.kind;
      setText(root,'[data-v57c-priority-title]',`${priority.icon} ${priority.title}`);
      setText(root,'[data-v57c-priority-text]',priority.text);
      renderMeta(root.querySelector('[data-v57c-priority-meta]'),priority.meta);
      const primary=root.querySelector('.v57c-primary');
      if (primary){ primary.textContent=priority.action; primary.disabled=false; }

      setText(assignmentCard,'[data-v57c-assignment-title]',assignmentStats.incomplete
        ? `${assignmentStats.incomplete} assignment${assignmentStats.incomplete===1?'':'s'} to check`
        : 'All caught up');
      setText(assignmentCard,'[data-v57c-assignment-text]',
        `${assignmentStats.overdue?`${assignmentStats.overdue} overdue. `:''}${assignmentStats.active?`${assignmentStats.active} currently available.`:assignmentStats.upcoming?`${assignmentStats.upcoming} upcoming.`:'No active teacher Practice right now.'}`);

      setText(recommendationCard,'[data-v57c-recommendation-title]',recTitle);
      setText(recommendationCard,'[data-v57c-recommendation-text]',Number(rec.recommended_count||0)>0
        ? `${Number(rec.recommended_count)} questions selected from your current learning evidence.`
        : 'Complete some Practice and recommendations will appear here.');
      const recommendationButton=recommendationCard.querySelector('.v57c-recommend');
      if (recommendationButton) recommendationButton.disabled=Number(rec.recommended_count||0)<1;

      setText(recentCard,'[data-v57c-recent-title]',recent?recent.title||'Practice result':'No completed Practice yet');
      setText(recentCard,'[data-v57c-first-try]',`First try ${Number.isFinite(first)?`${Math.round(first)}%`:'—'}`);
      setText(recentCard,'[data-v57c-mastery]',`Mastery ${Number.isFinite(mastery)?`${Math.round(mastery)}%`:'—'}`);
      setHidden(recentCard,'[data-v57c-recent-metrics]',!recent);
      setText(recentCard,'[data-v57c-recent-text]',recent
        ? (recentWhen?`Completed ${recentWhen}.`:'')
        : 'Your latest completed Practice result will appear here.');
      setHidden(recentCard,'.v57c-result',!recent?.result_code);
      setHidden(recentCard,'[data-v57c-recent-progress]',!!recent?.result_code);

      root.classList.add('v40c3-ready','v57c-ready');
      root.dataset.v57cRendered='true';

      const hero=document.querySelector('#start .v40-learning-hub-hero');
      const heading=hero?.querySelector('h2');
      const paragraph=hero?.querySelector('p');
      if (heading && student?.student_name) heading.textContent=`Welcome back, ${student.student_name}.`;
      if (paragraph) paragraph.textContent='Continue where you left off, complete teacher work, or follow your recommended Practice.';
      window.dispatchEvent(new CustomEvent('v57c:home-updated',{detail:{kind:priority.kind}}));
      return true;
    } finally {
      renderBusy=false;
    }
  }

'''
v57 = replace_between(v57, '  function render(model){', '  async function rpc(', v57_render, 'v57 render')

v57_watch_session = r'''  function watchSession(){
    const panel=document.querySelector('#start .v40c-session-panel');
    if (!panel || panel.dataset.v57cWatch==='true' || typeof MutationObserver==='undefined') return;
    panel.dataset.v57cWatch='true';
    new MutationObserver(()=>{
      lastLoadedAt=0;
      if (signedIn()) scheduleLoad(true);
      else resetHome();
    }).observe(panel,{attributes:true,attributeFilter:['class']});
  }

'''
v57 = replace_between(v57, '  function watchSession(){', '  function wire(){', v57_watch_session, 'v57 watchSession')

old_wire_head = """  function wire(){
    if (typeof document==='undefined') return false;
    injectStyles();
    watchDashboard();
    watchSession();
"""
new_wire_head = """  function wire(){
    if (typeof document==='undefined') return false;
    injectStyles();
    bindDashboardActions(dashboard());
    watchDashboard();
    watchSession();
"""
v57 = replace_once(v57, old_wire_head, new_wire_head, 'v57 wire head')
old_wire_tail = """    if (signedIn()) scheduleLoad(true);
    return true;
  }
"""
new_wire_tail = """    if (signedIn()) scheduleLoad(true);
    else resetHome();
    return true;
  }
"""
v57 = replace_once(v57, old_wire_tail, new_wire_tail, 'v57 wire tail')
write('site/v57c-student-continue-learning-home.js', v57)


# -----------------------------------------------------------------------------
# gamification-student.js — keep static card containers and reset/hide on logout.
# -----------------------------------------------------------------------------
gam = read('site/gamification-student.js')

render_xp = r'''  function renderXp(payload){
    const root=dashboard();
    const anchor=root?.querySelector('.v57c-continue-card');
    if (!root || !anchor || !signedIn()) return false;

    const model=CORE.normalizeXpPayload(payload);
    const {xp,level,rules}=model;
    const next=level.next_level_xp;
    const remaining=next==null ? 0 : Math.max(0,next-xp);
    const xpText=next==null ? `${xp} XP` : `${xp} / ${next} XP`;
    const note=next==null
      ? '<strong>Top starter level reached</strong><span>Keep practising to build your Maths record.</span>'
      : xp===0
        ? `<strong>Start earning XP</strong><span>${remaining} XP to Level ${level.number+1}.</span>`
        : `<strong>${remaining} XP to Level ${level.number+1}</strong><span>XP comes from verified Practice already saved in the app.</span>`;

    let card=document.getElementById(IDS.xpCard);
    const staticCard=!!card?.hasAttribute('data-v40-static-card');
    if (!card){
      card=document.createElement('article');
      card.id=IDS.xpCard;
      anchor.insertAdjacentElement('beforebegin',card);
    } else if (!staticCard && card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    card.classList.remove('hidden');
    card.dataset.level=String(level.number);
    card.dataset.xp=String(xp);
    card.innerHTML=`
      <div class="v571a-level-badge" aria-label="Level ${level.number}">${level.number}</div>
      <div class="v571a-level-main">
        <div class="v571a-level-head">
          <div><div class="v571a-level-kicker">XP &amp; Level</div><h2 class="v571a-level-title">Level ${level.number} — ${html(level.title)}</h2></div>
          <div class="v571a-xp-label">⭐ ${html(xpText)}</div>
        </div>
        <div class="v571a-progress" role="progressbar" aria-label="XP progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${level.progress_percent}"><span style="width:${level.progress_percent}%"></span></div>
        <div class="v571a-level-note">${note}</div>
        <details class="v571a-rules">
          <summary>How XP works ▾</summary>
          <div class="v571a-rule-chips">
            <span>+${rules.first_try_correct_xp} First Try correct</span>
            <span>+${rules.second_try_correct_xp} Second Try correct</span>
            <span>+${rules.completed_session_xp} Completed Practice</span>
            <span>+${rules.past_paper_extra_xp} Past Paper bonus</span>
            <span>+${rules.completed_assignment_xp} Assignment bonus</span>
          </div>
        </details>
      </div>`;

    root.classList.add('v571a-gamified-home');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('v571a:gamification-updated',{detail:{xp,level:level.number}}));
    }
    return true;
  }

'''
gam = replace_between(gam, '  function renderXp(payload){', '  function renderStreak(', render_xp, 'gam renderXp')

render_achievement = r'''  function renderAchievement(model){
    const root=dashboard();
    const anchor=root?.querySelector('.v57c-secondary');
    if (!root || !anchor || !signedIn()) return false;
    const latest=model.latest_badge;
    const total=model.badges.length;
    const earned=model.earned_count;

    let card=document.getElementById(IDS.achievementCard);
    const staticCard=!!card?.hasAttribute('data-v40-static-card');
    if (!card){
      card=document.createElement('article');
      card.id=IDS.achievementCard;
      anchor.insertAdjacentElement('beforebegin',card);
    } else if (!staticCard && card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    card.classList.remove('hidden');
    const latestDate=latest?.earned_at ? CORE.dateLabel(latest.earned_at) : '';
    card.innerHTML=`
      <div class="v571b-achievement-icon">${latest?html(latest.icon):'🏅'}</div>
      <div class="v571b-achievement-main">
        <div class="v571b-kicker">Latest Achievement</div>
        <h3>${latest?html(latest.title):'Your first badge is waiting'}</h3>
        <p>${latest?html(latest.description):'Complete Practice to start unlocking achievement badges.'}</p>
        <div class="v571b-achievement-meta">
          <span>${earned}/${total || 8} badges earned</span>
          <span>Longest streak ${model.streak.longest} day${model.streak.longest===1?'':'s'}</span>
          ${latestDate?`<span>Earned ${html(latestDate)}</span>`:''}
        </div>
      </div>
      <details class="v571b-achievements">
        <summary>View achievements ▾</summary>
        <div class="v571b-badge-grid">${model.badges.map(badgeMarkup).join('')}</div>
      </details>`;
    return true;
  }

'''
gam = replace_between(gam, '  function renderAchievement(model){', '  function maybeCelebrateAchievement(', render_achievement, 'gam renderAchievement')

render_missions = r'''  function renderMissions(payload){
    if (!signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    const model=CORE.normalizeMissionsPayload(payload);
    const achievement=document.getElementById(IDS.achievementCard);
    const fallback=root.querySelector('.v57c-secondary');
    const anchor=achievement || fallback;
    if (!anchor) return false;

    let card=document.getElementById(IDS.missionsCard);
    const staticCard=!!card?.hasAttribute('data-v40-static-card');
    if (!card){
      card=document.createElement('article');
      card.id=IDS.missionsCard;
      anchor.insertAdjacentElement('beforebegin',card);
    } else if (!staticCard && card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    card.classList.remove('hidden');
    const done=model.summary.completed;
    const total=model.summary.total || 3;
    const footer=model.summary.all_complete
      ? 'Excellent work — all three weekly missions are complete.'
      : `${total-done} mission${total-done===1?'':'s'} remaining. Missions reset every Monday.`;

    card.innerHTML=`
      <div class="v572-mission-head">
        <div><div class="v572-kicker">Weekly Missions</div><h3>${model.summary.all_complete?'🎉 Weekly missions complete!':'This Week\'s Missions'}</h3></div>
        <div class="v572-week-meta"><span>${html(CORE.weekLabel(model))}</span><span class="v572-overall">${done}/${total} complete</span></div>
      </div>
      <div class="v572-mission-list">${model.missions.map(missionMarkup).join('')}</div>
      <div class="v572-mission-footer">
        <p>${html(footer)}</p>
        <div class="v572-actions">
          <button type="button" data-v572-action="assignments">My Assignments</button>
          <button type="button" class="primary" data-v572-action="learn">Keep Practising</button>
        </div>
      </div>`;

    maybeCelebrateMissions(model);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('v572:missions-updated',{detail:{completed:done,total,allComplete:model.summary.all_complete}}));
    }
    return true;
  }

'''
gam = replace_between(gam, '  function renderMissions(payload){', '  function maybeCelebrateClassChallenge(', render_missions, 'gam renderMissions')

render_challenge = r'''  function renderClassChallenge(payload){
    if (!signedIn()) return false;
    const model=CORE.normalizeClassChallengeV574(payload);
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    document.documentElement.classList.add('v574-class-challenge-ready');

    let card=document.getElementById(IDS.classChallengeCard);
    const staticCard=!!card?.hasAttribute('data-v40-static-card');
    if (!model.challenge.enabled){
      if (card && staticCard){
        card.classList.add('hidden');
        card.innerHTML='<div class="v40-static-placeholder">Class challenge will appear when enabled.</div>';
      } else {
        card?.remove();
      }
      emitClassChallengeCompatibility(model);
      return true;
    }

    const missions=document.getElementById(IDS.missionsCard);
    const achievement=document.getElementById(IDS.achievementCard);
    const fallback=root.querySelector('.v57c-secondary');
    const anchor=missions || achievement || fallback;
    if (!anchor) return false;
    if (!card){ card=document.createElement('article'); card.id=IDS.classChallengeCard; }
    if (!staticCard){
      if (missions){
        if (missions.nextElementSibling!==card) missions.insertAdjacentElement('afterend',card);
      } else if (card.nextElementSibling!==anchor){
        anchor.insertAdjacentElement('beforebegin',card);
      }
    }

    card.classList.remove('hidden');
    const c=model.challenge;
    const remaining=Math.max(0,c.target_questions-c.questions_completed);
    const classLabel=model.class.year_level?`${model.class.class_name} · Year ${model.class.year_level}`:model.class.class_name;
    const footer=c.complete
      ? `Target reached! ${c.contributors} classmates contributed this week.`
      : `${remaining} question${remaining===1?'':'s'} to go. ${c.contributors} of ${model.class.active_students} classmates have contributed so far.`;

    card.innerHTML=`
      <div class="v574-challenge-head">
        <div><div class="v574-kicker">Cooperative Class Challenge</div><h3>${c.complete?'🎉':'🤝'} ${html(model.class.class_name)} Class Question Quest</h3><p>${html(classLabel)} · Work together — no student rankings.</p></div>
        <span class="v574-week">${html(CORE.weekLabel(model))}</span>
      </div>
      <div class="v574-progress-head"><strong>${c.questions_completed} / ${c.target_questions} Practice questions</strong><span class="v574-phase">${html(CORE.phaseLabel(model))} · ${c.progress_percent}%</span></div>
      <div class="v574-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.progress_percent}"><span style="width:${c.progress_percent}%"></span></div>
      <div class="v574-milestones"><span>Start</span><span>25%</span><span>50%</span><span>Goal</span></div>
      <div class="v574-foot"><p>${html(footer)} Current target: ${model.settings.questions_per_active_student} questions × each active student.</p><button type="button" data-v574-action="learn">Keep Practising</button></div>`;

    maybeCelebrateClassChallenge(model);
    emitClassChallengeCompatibility(model);
    return true;
  }

'''
gam = replace_between(gam, '  function renderClassChallenge(payload){', '  function openLearn(){', render_challenge, 'gam renderClassChallenge')

clear_block = r'''  function resetStaticCard(card, markup){
    if (!card) return false;
    if (!card.hasAttribute('data-v40-static-card')){
      card.remove();
      return false;
    }
    card.classList.add('hidden');
    card.innerHTML=markup;
    return true;
  }

  function clearXp(){
    xpCache.clear();
    const card=document.getElementById(IDS.xpCard);
    if (card){
      delete card.dataset.level;
      delete card.dataset.xp;
      resetStaticCard(card,'<div class="v40-static-placeholder">XP and level will appear after sign-in.</div>');
    }
  }

  function clearAchievements(){
    achievementsCache.clear();
    document.querySelector('.v571b-streak-note')?.remove();
    const card=document.getElementById(IDS.achievementCard);
    if (card) resetStaticCard(card,'<div class="v40-static-placeholder">Achievements will appear after sign-in.</div>');
    document.getElementById(IDS.achievementToast)?.remove();
  }

  function clearMissions(){
    missionsCache.clear();
    const card=document.getElementById(IDS.missionsCard);
    if (card) resetStaticCard(card,'<div class="v40-static-placeholder">Weekly missions will appear after sign-in.</div>');
    document.getElementById(IDS.missionsToast)?.remove();
  }

  function clearClassChallenge(){
    classChallengeCache.clear();
    const card=document.getElementById(IDS.classChallengeCard);
    if (card) resetStaticCard(card,'<div class="v40-static-placeholder">Class challenge will appear when enabled.</div>');
    document.getElementById(IDS.classChallengeToast)?.remove();
    document.documentElement?.classList?.remove('v574-class-challenge-ready');
  }

  function clear(){
    clearClassChallenge();
    clearMissions();
    clearAchievements();
    clearXp();
  }

'''
gam = replace_between(gam, '  function clearXp(){', '  function hasFirstPracticeAchievement(){', clear_block, 'gam clear block')
write('site/gamification-student.js', gam)


# -----------------------------------------------------------------------------
# v58a-student-first-use-experience.js — one static card, toggle/reset in place.
# -----------------------------------------------------------------------------
v58 = read('site/v58a-student-first-use-experience.js')

v58_ensure = r'''  function ensureCard(){
    let card=document.getElementById(CARD_ID);
    if(card) return card;
    card=document.createElement('article');
    card.id=CARD_ID;
    card.className='hidden';
    card.setAttribute('aria-label','First Practice');
    card.innerHTML=`
      <div class="v58a-icon" aria-hidden="true">👋</div>
      <div class="v58a-main">
        <div class="v58a-kicker">Your first step</div>
        <h2>Ready for your first short Practice?</h2>
        <p>Start with a short Mixed Practice. Hints and a second try are available, and finishing unlocks your First Practice achievement.</p>
        <div class="v58a-meta"><span>5 questions</span><span>Mixed Practice</span><span>Hints available</span><span>Earn XP + first badge</span></div>
      </div>
      <button type="button" class="primary v58a-start">Start My First 5 Questions</button>`;
    return card;
  }

  function removeCard(){
    const card=document.getElementById(CARD_ID);
    if(!card) return;
    if(!card.hasAttribute('data-v40-static-card')){
      card.remove();
      return;
    }
    card.classList.add('hidden');
    const heading=card.querySelector('h2');
    if(heading) heading.textContent='Ready for your first short Practice?';
  }

'''
v58 = replace_between(v58, '  function removeCard(){', '  function eligible(){', v58_ensure, 'v58 ensure/remove')

v58_render = r'''  function render(){
    injectStyles();
    const root=dashboard();
    const anchor=root?.querySelector('.v57c-continue-card');
    if(!root || !anchor || !eligible()){
      removeCard();
      return false;
    }

    const card=ensureCard();
    const staticCard=card.hasAttribute('data-v40-static-card');
    if(!staticCard && card.nextElementSibling!==anchor) anchor.insertAdjacentElement('beforebegin',card);

    const name=studentName();
    const heading=card.querySelector('h2');
    if(heading) heading.textContent=`${name?`Welcome, ${name}! `:''}Ready for 5 quick questions?`;
    const paragraph=card.querySelector('p');
    if(paragraph) paragraph.textContent='Start with a short Mixed Practice. Hints and a second try are available, and finishing unlocks your First Practice achievement.';
    const button=card.querySelector('.v58a-start');
    if(button && button.dataset.v58aBound!=='true'){
      button.dataset.v58aBound='true';
      button.addEventListener('click',event=>startFirstPractice(event.currentTarget));
    }
    card.classList.remove('hidden');
    return true;
  }

'''
v58 = replace_between(v58, '  function render(){', '  function escapeHtml(', v58_render, 'v58 render')
write('site/v58a-student-first-use-experience.js', v58)

print('Option 2B patch applied successfully.')
