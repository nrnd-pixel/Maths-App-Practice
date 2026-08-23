/* V4.0C3 / V4.1D — Home learning priorities and continuity.
   Uses the existing secure student RPCs and purpose-specific access tickets.
   V4.1D promotes existing server-classified Focus Areas ahead of generic
   Recommended Practice. No new authentication, grading, question-selection or
   assignment-state logic is introduced. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-learning-priorities-style';
  let requestId = 0;
  let lastLoadedAt = 0;
  let lastIdentityKey = '';

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .v40c3-home-dashboard{
        display:none;
        gap:12px;
        margin-top:2px;
      }

      #start .v40c3-home-dashboard.v40c3-ready{
        display:grid;
      }

      #start .v40c3-priority-card{
        border:1px solid color-mix(in srgb,var(--primary) 32%,var(--border));
        border-radius:19px;
        padding:18px;
        background:linear-gradient(135deg,
          color-mix(in srgb,var(--soft) 58%,var(--card)),
          var(--card));
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:16px;
        align-items:center;
      }

      #start .v40c3-priority-kicker{
        color:var(--primary);
        font-size:11px;
        font-weight:900;
        letter-spacing:.07em;
        text-transform:uppercase;
        margin-bottom:5px;
      }

      #start .v40c3-priority-title{
        margin:0 0 5px;
        font-size:clamp(19px,2.6vw,25px);
        line-height:1.25;
      }

      #start .v40c3-priority-text{
        margin:0;
        color:var(--muted);
        line-height:1.48;
        font-size:13px;
      }

      #start .v40c3-priority-meta{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        margin-top:11px;
      }

      #start .v40c3-priority-meta span{
        display:inline-flex;
        align-items:center;
        min-height:29px;
        padding:5px 8px;
        border:1px solid var(--border);
        border-radius:999px;
        background:var(--card);
        font-size:11px;
        font-weight:800;
      }

      #start .v40c3-priority-action{
        min-width:190px;
        min-height:49px;
      }

      #start .v40c3-glance{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
      }

      #start .v40c3-glance-card{
        border:1px solid var(--border);
        border-radius:15px;
        padding:12px;
        background:var(--card);
        min-width:0;
      }

      #start .v40c3-glance-card strong{
        display:block;
        font-size:17px;
        line-height:1.25;
        margin-bottom:2px;
      }

      #start .v40c3-glance-card span{
        display:block;
        color:var(--muted);
        font-size:11px;
        line-height:1.35;
      }

      #start .v40c3-secondary-row{
        display:flex;
        gap:9px;
        flex-wrap:wrap;
        align-items:center;
      }

      #start .v40c3-secondary-row button{
        min-height:40px;
        padding:8px 12px;
        font-size:12px;
      }

      #start .v40c3-loading{
        border:1px solid var(--border);
        border-radius:16px;
        padding:14px;
        color:var(--muted);
        font-size:13px;
        background:var(--card);
      }

      html[data-theme="dark"] #start .v40c3-priority-card{
        background:linear-gradient(135deg,
          color-mix(in srgb,var(--soft) 23%,var(--card)),
          var(--card));
      }

      @media(max-width:760px){
        #start .v40c3-priority-card{
          grid-template-columns:1fr;
        }

        #start .v40c3-priority-action{
          width:100%;
          min-width:0;
        }

        #start .v40c3-glance{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }

      @media(max-width:420px){
        #start .v40c3-glance{
          grid-template-columns:1fr 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function sessionPanel(){
    return document.querySelector('#start .v40c-session-panel');
  }

  function signedIn(){
    return !!sessionPanel()?.classList.contains('v40c-authenticated');
  }

  function studentKey(access){
    return String(access?.roster_student_id || access?.student_id || access?.student_name || '');
  }

  function buildDashboard(){
    const hub = document.querySelector('#start .v39-home-hub');
    const hero = hub?.querySelector('.v40-learning-hub-hero');
    if (!hub || !hero || hub.querySelector('.v40c3-home-dashboard')) return;

    const dashboard = document.createElement('section');
    dashboard.className = 'v40c3-home-dashboard';
    dashboard.setAttribute('aria-label', 'Learning priorities');
    dashboard.innerHTML = '<div class="v40c3-loading">Preparing your learning priorities…</div>';
    hero.insertAdjacentElement('afterend', dashboard);
  }

  function setHero(studentName){
    const hero = document.querySelector('#start .v40-learning-hub-hero');
    if (!hero) return;

    const heading = hero.querySelector('h2');
    const paragraph = hero.querySelector('p');

    if (signedIn() && studentName) {
      if (heading) heading.textContent = `Welcome back, ${studentName}.`;
      if (paragraph) paragraph.textContent = 'Here is the most useful next step from your assignments, mastery focus areas and learning progress.';
    } else {
      if (heading) heading.textContent = 'Learn, check your progress, and keep improving.';
      if (paragraph) paragraph.textContent = 'Everything you need for Maths is organised here — start learning, complete teacher assignments, follow recommended practice, and review feedback.';
    }
  }

  async function rpc(name, token){
    const { data, error } = await cloud.rpc(name, { p_access_token: token });
    if (error) throw error;
    return data || {};
  }

  function dueText(value){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `Due ${date.toLocaleDateString(undefined,{day:'numeric',month:'short'})}`;
  }

  function recommendationTitle(rec){
    if (!rec || Number(rec.recommended_count || 0) < 1) return 'Choose your next Maths activity';
    if (rec.practice_scope === 'topic' && rec.focus_topic) return `${rec.focus_topic} Practice`;
    if (rec.practice_scope === 'strand' && rec.focus_strand) {
      const strand = typeof STRANDS === 'object' ? (STRANDS[rec.focus_strand] || rec.focus_strand) : rec.focus_strand;
      return `${strand} Practice`;
    }
    return rec.reason === 'no_history' ? 'Start with Mixed Practice' : 'Mixed Practice';
  }

  function recommendationText(rec){
    const pct = Number(rec?.performance_percent);
    const topic = rec?.focus_topic || 'this area';

    switch (rec?.reason) {
      case 'needs_attention':
        return Number.isFinite(pct)
          ? `${topic} is currently at ${pct}%. A short focused practice set is the best next step.`
          : `A short focused practice set in ${topic} is the best next step.`;
      case 'developing':
        return Number.isFinite(pct)
          ? `You are developing ${topic} at ${pct}%. Keep building it with a short focused set.`
          : `Keep building ${topic} with a short focused set.`;
      case 'consolidation':
        return `You are doing well. A short ${topic} set will help consolidate your learning.`;
      case 'no_history':
        return 'Complete a short mixed set to start building your learning profile.';
      case 'mixed_refresh':
        return 'A short mixed set will refresh your skills across the available question bank.';
      default:
        return 'Choose Practice or Exam and continue your Maths learning.';
    }
  }

  function focusPracticeFromProgress(progress){
    const topics = Array.isArray(progress?.topics) ? progress.topics : [];
    const rank = status => status === 'needs_attention' ? 0 : 1;

    const target = topics
      .filter(topic =>
        (topic?.status === 'needs_attention' || topic?.status === 'developing') &&
        String(topic?.strand || '').trim() &&
        String(topic?.topic || '').trim()
      )
      .sort((a, b) =>
        rank(a.status) - rank(b.status) ||
        Number(a.percent || 0) - Number(b.percent || 0) ||
        Number(b.scored_responses || 0) - Number(a.scored_responses || 0)
      )[0];

    if (!target) return null;

    const percent = Number(target.percent);
    return {
      practice_scope: 'topic',
      practice_strand: target.strand,
      practice_topic: target.topic,
      focus_strand: target.strand,
      focus_topic: target.topic,
      recommended_count: 5,
      reason: 'focus_area',
      mastery_status: target.status,
      performance_percent: Number.isFinite(percent) ? Math.round(percent) : null
    };
  }

  function choosePriority(assignments, recommendation, focusPractice){
    const rows = Array.isArray(assignments) ? assignments : [];
    const active = rows.filter(row => row?.timing_status === 'active');

    const resume = active.find(row => row?.primary_action === 'resume');
    if (resume) {
      const latest = resume.latest_attempt || {};
      const answered = Number(latest.answered_questions || 0);
      const total = Number(latest.question_count || 0);
      return {
        kind: 'assignment',
        icon: '📚',
        title: `Continue ${resume.exam_year} · ${resume.paper}`,
        text: total > 0
          ? `You already have an assignment in progress. Continue from ${answered} of ${total} questions answered.`
          : 'You already have an assignment in progress. Continue where you left off.',
        action: 'Continue Assignment',
        meta: [
          total > 0 ? `${answered}/${total} answered` : 'In progress',
          dueText(resume.closes_at)
        ].filter(Boolean)
      };
    }

    const start = active.find(row => row?.primary_action === 'start' && !row?.target_reached);
    if (start) {
      return {
        kind: 'assignment',
        icon: '📚',
        title: `Start ${start.exam_year} · ${start.paper}`,
        text: 'Your teacher has an active assignment ready for you. Completing assigned work comes before optional practice.',
        action: 'Open Assignment',
        meta: [
          'Teacher assignment',
          dueText(start.closes_at)
        ].filter(Boolean)
      };
    }

    if (focusPractice) {
      const pct = Number(focusPractice.performance_percent);
      const needsAttention = focusPractice.mastery_status === 'needs_attention';
      return {
        kind: 'focus',
        icon: '🌱',
        title: `Strengthen ${focusPractice.focus_topic}`,
        text: needsAttention
          ? `This is your clearest current focus area. A short targeted set will help you rebuild confidence and mastery.`
          : `You are developing this topic. A short targeted set will help you make it more secure.`,
        action: 'Practice this Focus',
        meta: [
          '5 questions',
          Number.isFinite(pct) ? `${pct}% current mastery` : '',
          needsAttention ? 'Needs attention' : 'Developing'
        ].filter(Boolean)
      };
    }

    if (recommendation && Number(recommendation.recommended_count || 0) > 0) {
      return {
        kind: 'recommendation',
        icon: '✏️',
        title: recommendationTitle(recommendation),
        text: recommendationText(recommendation),
        action: 'Start Recommended Practice',
        meta: [
          `${Number(recommendation.recommended_count || 0)} questions`,
          Number.isFinite(Number(recommendation.performance_percent))
            ? `${Number(recommendation.performance_percent)}% current performance`
            : ''
        ].filter(Boolean)
      };
    }

    return {
      kind: 'learn',
      icon: '✏️',
      title: 'Choose your next Maths activity',
      text: 'Open Learn to choose Practice or a past-paper Exam.',
      action: 'Open Learn',
      meta: []
    };
  }

  function openAssignments(){
    document.getElementById('my-assignments-btn')?.click();
  }

  function openProgress(){
    document.getElementById('my-progress-btn')?.click();
  }

  function openLearn(){
    const open = document.querySelector('#start .v40c-open-learn');
    if (open) {
      open.click();
      return;
    }
    document.querySelector('#start .v40c-learn-setup')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  async function startRecommendation(rec){
    const practiceAccess = await validateStudentAccess('practice');
    if (!practiceAccess?.access_token) return;

    if (
      rec &&
      typeof startRecommendedPracticeV35 === 'function' &&
      typeof studentPracticeRecommendationV35 !== 'undefined'
    ) {
      studentPracticeRecommendationV35 = rec;
      startRecommendedPracticeV35();
      return;
    }
    openProgress();
  }

  function renderDashboard(data){
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard) return;

    const assignments = Array.isArray(data.assignments?.assignments)
      ? data.assignments.assignments
      : [];
    const recommendation = data.recommendation || {};
    const progress = data.progress || {};
    const motivation = data.motivation || {};
    const messages = data.messages || {};
    const student = progress.student || data.assignments?.student || {};
    const focusPractice = focusPracticeFromProgress(progress);
    const priority = choosePriority(assignments, recommendation, focusPractice);

    const streak = Math.max(0, Number(motivation.streak?.current_days || 0));
    const weeklyDone = Math.max(0, Number(motivation.weekly_goal?.completed_days || 0));
    const weeklyGoal = Math.max(1, Number(motivation.weekly_goal?.goal_days || 3));
    const unread = Math.max(0, Number(messages.unread_count || 0));
    const sessions = Math.max(0, Number(progress.summary?.practice_sessions || 0));

    dashboard.innerHTML = `
      <article class="v40c3-priority-card">
        <div>
          <div class="v40c3-priority-kicker">Your next step</div>
          <h2 class="v40c3-priority-title">${priority.icon} ${esc(priority.title)}</h2>
          <p class="v40c3-priority-text">${esc(priority.text)}</p>
          ${priority.meta.length ? `
            <div class="v40c3-priority-meta">
              ${priority.meta.map(item => `<span>${esc(item)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <button type="button" class="primary v40c3-priority-action">${esc(priority.action)}</button>
      </article>

      <div class="v40c3-glance" aria-label="Learning at a glance">
        <div class="v40c3-glance-card"><strong>🔥 ${streak}</strong><span>day learning streak</span></div>
        <div class="v40c3-glance-card"><strong>🎯 ${weeklyDone}/${weeklyGoal}</strong><span>learning days this week</span></div>
        <div class="v40c3-glance-card"><strong>✏️ ${sessions}</strong><span>completed Practice sessions</span></div>
        <div class="v40c3-glance-card"><strong>💬 ${unread}</strong><span>unread teacher message${unread === 1 ? '' : 's'}</span></div>
      </div>

      <div class="v40c3-secondary-row">
        <button type="button" class="outline v40c3-view-progress">View Mastery Progress</button>
        ${unread > 0 ? '<button type="button" class="outline v40c3-view-messages">Read Teacher Messages</button>' : ''}
      </div>
    `;

    const priorityButton = dashboard.querySelector('.v40c3-priority-action');
    priorityButton?.addEventListener('click', () => {
      if (priority.kind === 'assignment') openAssignments();
      else if (priority.kind === 'focus') startRecommendation(focusPractice);
      else if (priority.kind === 'recommendation') startRecommendation(recommendation);
      else openLearn();
    });

    dashboard.querySelector('.v40c3-view-progress')?.addEventListener('click', openProgress);
    dashboard.querySelector('.v40c3-view-messages')?.addEventListener('click', openProgress);

    dashboard.classList.add('v40c3-ready');
    setHero(student.student_name || activeStudentAccess?.student_name || 'Student');
  }

  function renderLoadProblem(){
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard) return;
    dashboard.innerHTML = `
      <article class="v40c3-priority-card">
        <div>
          <div class="v40c3-priority-kicker">Your next step</div>
          <h2 class="v40c3-priority-title">✏️ Continue learning</h2>
          <p class="v40c3-priority-text">Your personalised priority could not be refreshed right now, but you can still open Learn, Assignments or Progress.</p>
        </div>
        <button type="button" class="primary v40c3-priority-action">Open Learn</button>
      </article>
    `;
    dashboard.querySelector('.v40c3-priority-action')?.addEventListener('click', openLearn);
    dashboard.classList.add('v40c3-ready');
  }

  async function loadHomePriorities(force = false){
    if (!signedIn() || !cloudReady) return;

    const currentRequest = ++requestId;
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard) return;

    if (!force && Date.now() - lastLoadedAt < 20000) return;

    dashboard.classList.remove('v40c3-ready');
    dashboard.innerHTML = '<div class="v40c3-loading">Refreshing your learning priorities…</div>';

    try {
      const practiceAccess = await validateStudentAccess('practice');
      const examAccess = await validateStudentAccess('exam');
      if (!practiceAccess?.access_token || !examAccess?.access_token) return;

      const identity = studentKey(practiceAccess);
      const results = await Promise.allSettled([
        rpc('get_student_assignments', examAccess.access_token),
        rpc('get_student_practice_recommendation', practiceAccess.access_token),
        rpc('get_student_learning_dashboard', practiceAccess.access_token),
        rpc('get_student_motivation', practiceAccess.access_token),
        rpc('get_student_motivation_messages', practiceAccess.access_token)
      ]);

      if (currentRequest !== requestId || !signedIn()) return;

      const value = index => results[index].status === 'fulfilled' ? results[index].value : {};
      const data = {
        assignments: value(0),
        recommendation: value(1),
        progress: value(2),
        motivation: value(3),
        messages: value(4)
      };

      if (results.every(result => result.status === 'rejected')) {
        throw new Error('Learning data unavailable');
      }

      lastLoadedAt = Date.now();
      lastIdentityKey = identity;
      renderDashboard(data);
    } catch (error) {
      console.warn('Could not load V4.1 learning priorities.', error);
      if (currentRequest === requestId) renderLoadProblem();
    }
  }

  function clearDashboard(){
    ++requestId;
    lastLoadedAt = 0;
    lastIdentityKey = '';
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (dashboard) {
      dashboard.classList.remove('v40c3-ready');
      dashboard.innerHTML = '<div class="v40c3-loading">Sign in to see your personalised next step.</div>';
    }
    setHero('');
  }

  function watchSession(){
    const panel = sessionPanel();
    if (!panel || panel.dataset.v40c3Watch === 'true') return;
    panel.dataset.v40c3Watch = 'true';

    new MutationObserver(() => {
      if (signedIn()) loadHomePriorities(true);
      else clearDashboard();
    }).observe(panel, {
      attributes:true,
      attributeFilter:['class']
    });
  }

  function wireRefreshPoints(){
    document.querySelectorAll('.back-home, [data-v40-nav="home"]').forEach(button => {
      if (button.dataset.v40c3Refresh === 'true') return;
      button.dataset.v40c3Refresh = 'true';
      button.addEventListener('click', () => {
        window.setTimeout(() => loadHomePriorities(true), 120);
      });
    });
  }

  function applyV40C3(){
    injectStyles();
    buildDashboard();
    watchSession();
    wireRefreshPoints();

    if (signedIn()) loadHomePriorities(true);
    else clearDashboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV40C3, { once:true });
  } else {
    applyV40C3();
  }
})();