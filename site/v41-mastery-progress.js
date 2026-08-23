/* V4.1C — Mastery Progress.
   Presentation-only: clarifies the existing secure Progress classifications and
   reuses the existing V3.7 topic-improvement milestone. No mastery thresholds,
   grading rules, answer data or student identity rules are calculated here. */
(() => {
  'use strict';

  const STYLE_ID = 'v41-mastery-progress-style';

  const STATES = {
    secure: {
      label: 'Secure',
      icon: '🟢',
      description: 'Strong current performance'
    },
    developing: {
      label: 'Developing',
      icon: '🟠',
      description: 'Keep practising to build consistency'
    },
    needs_attention: {
      label: 'Needs attention',
      icon: '🔴',
      description: 'A good place to focus next'
    }
  };

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #student-dashboard .v41-mastery-overview{
        margin:18px 0 20px;
        padding:16px;
        border:1px solid var(--border);
        border-radius:18px;
        background:color-mix(in srgb,var(--soft) 22%,var(--card));
      }

      #student-dashboard .v41-mastery-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
      }

      #student-dashboard .v41-mastery-head h2{
        margin:0 0 5px;
        font-size:20px;
      }

      #student-dashboard .v41-mastery-head p{
        margin:0;
        color:var(--muted);
        font-size:13px;
        line-height:1.45;
      }

      #student-dashboard .v41-mastery-legend{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:9px;
        margin-top:13px;
      }

      #student-dashboard .v41-mastery-key{
        border:1px solid var(--border);
        border-radius:13px;
        padding:11px;
        background:var(--card);
      }

      #student-dashboard .v41-mastery-key strong{
        display:block;
        margin-bottom:3px;
        font-size:13px;
      }

      #student-dashboard .v41-mastery-key span{
        color:var(--muted);
        font-size:11px;
        line-height:1.35;
      }

      #student-dashboard .v41-mastery-note{
        margin-top:10px;
        color:var(--muted);
        font-size:11px;
        line-height:1.4;
      }

      #student-dashboard .v41-mastery-trend{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:12px;
        align-items:center;
        margin-top:13px;
        padding:12px 13px;
        border:1px solid color-mix(in srgb,var(--success) 34%,var(--border));
        border-radius:14px;
        background:var(--successbg);
      }

      #student-dashboard .v41-mastery-trend.hidden{
        display:none!important;
      }

      #student-dashboard .v41-mastery-trend strong{
        display:block;
        margin-bottom:3px;
        color:var(--success);
      }

      #student-dashboard .v41-mastery-trend p{
        margin:0;
        font-size:12px;
        line-height:1.45;
      }

      #student-dashboard .v41-mastery-gain{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:34px;
        padding:7px 10px;
        border-radius:999px;
        background:var(--card);
        border:1px solid color-mix(in srgb,var(--success) 32%,var(--border));
        color:var(--success);
        font-size:12px;
        font-weight:900;
        white-space:nowrap;
      }

      #student-progress-strengths .v41-mastery-state,
      #student-progress-focus .v41-mastery-state{
        white-space:nowrap;
      }

      #student-progress-strengths .insight-card[data-v41-mastery-state="secure"]{
        border-color:color-mix(in srgb,var(--success) 34%,var(--border));
      }

      #student-progress-focus .insight-card[data-v41-mastery-state="developing"]{
        border-color:color-mix(in srgb,var(--warn) 28%,var(--border));
      }

      #student-progress-focus .insight-card[data-v41-mastery-state="needs_attention"]{
        border-color:color-mix(in srgb,var(--danger) 28%,var(--border));
      }

      @media(max-width:700px){
        #student-dashboard .v41-mastery-legend{
          grid-template-columns:1fr;
        }

        #student-dashboard .v41-mastery-trend{
          grid-template-columns:1fr;
        }

        #student-dashboard .v41-mastery-gain{
          justify-self:start;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function stateForCard(card){
    const text = String(card.querySelector('.tag')?.textContent || '')
      .trim()
      .toLowerCase();

    if (card.classList.contains('secure') || text.includes('secure')) {
      return 'secure';
    }

    if (text.includes('needs attention')) {
      return 'needs_attention';
    }

    return 'developing';
  }

  function decorateMasteryCard(card){
    const stateKey = stateForCard(card);
    const state = STATES[stateKey];
    const tag = card.querySelector('.tag');

    card.dataset.v41MasteryState = stateKey;

    if (tag) {
      const label = `${state.icon} ${state.label}`;
      tag.classList.add('v41-mastery-state');
      if (tag.textContent !== label) tag.textContent = label;
      tag.title = state.description;
    }

    const performanceLabel = [...card.querySelectorAll('span.help')]
      .find(node => /scored performance/i.test(node.textContent || ''));

    if (performanceLabel) {
      performanceLabel.textContent = ' current mastery';
    }

    const topic = card.querySelector('.row strong')?.textContent?.trim() || 'Topic';
    const percent = [...card.querySelectorAll('strong')]
      .map(node => node.textContent?.trim() || '')
      .find(value => /^\d+%$/.test(value));

    card.setAttribute(
      'aria-label',
      `${topic}: ${state.label}${percent ? `, ${percent}` : ''}`
    );
  }

  function decorateMasteryCards(){
    [
      document.getElementById('student-progress-strengths'),
      document.getElementById('student-progress-focus')
    ].forEach(root => {
      root?.querySelectorAll('.insight-card').forEach(decorateMasteryCard);
    });
  }

  function createLegendKey(stateKey){
    const state = STATES[stateKey];
    const key = document.createElement('div');
    key.className = 'v41-mastery-key';

    const title = document.createElement('strong');
    title.textContent = `${state.icon} ${state.label}`;

    const description = document.createElement('span');
    description.textContent = state.description;

    key.append(title, description);
    return key;
  }

  function buildMasteryOverview(){
    const dashboard = document.getElementById('student-dashboard');
    const summary = document.getElementById('student-dashboard-summary');
    if (!dashboard || !summary) return null;

    let overview = dashboard.querySelector('.v41-mastery-overview');
    if (overview) return overview;

    overview = document.createElement('section');
    overview.className = 'v41-mastery-overview';
    overview.setAttribute('aria-label', 'Mastery progress guide');

    const head = document.createElement('div');
    head.className = 'v41-mastery-head';

    const copy = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = '🌱 Mastery Progress';
    const description = document.createElement('p');
    description.textContent = 'Use these learning states to see what is strong now and what to practise next.';
    copy.append(title, description);
    head.appendChild(copy);

    const legend = document.createElement('div');
    legend.className = 'v41-mastery-legend';
    ['needs_attention', 'developing', 'secure'].forEach(stateKey => {
      legend.appendChild(createLegendKey(stateKey));
    });

    const trend = document.createElement('div');
    trend.className = 'v41-mastery-trend hidden';
    trend.id = 'v41-mastery-trend';

    const note = document.createElement('div');
    note.className = 'v41-mastery-note';
    note.textContent = 'These states reuse the app’s existing secure progress calculation and can change as you complete more scored work.';

    overview.append(head, legend, trend, note);
    summary.insertAdjacentElement('afterend', overview);
    return overview;
  }

  function cleanMilestoneText(text){
    return String(text || '')
      .replace(/📈\s*Improvement Milestone/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function syncImprovementTrend(){
    const source = document.getElementById('student-motivation-milestone');
    const trend = document.getElementById('v41-mastery-trend');
    if (!source || !trend) return;

    const text = cleanMilestoneText(source.textContent);
    const visible = !source.classList.contains('hidden') && !!text;

    if (!visible) {
      trend.classList.add('hidden');
      trend.replaceChildren();
      return;
    }

    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = '📈 Recent improvement';
    const body = document.createElement('p');
    body.textContent = text;
    copy.append(title, body);

    trend.replaceChildren(copy);

    const match = text.match(/from\s+(\d+(?:\.\d+)?)%\s+to\s+(\d+(?:\.\d+)?)%/i);
    if (match) {
      const previous = Number(match[1]);
      const recent = Number(match[2]);
      const gain = recent - previous;

      if (Number.isFinite(gain) && gain > 0) {
        const badge = document.createElement('span');
        badge.className = 'v41-mastery-gain';
        badge.textContent = `+${Math.round(gain)} pts`;
        trend.appendChild(badge);
      }
    }

    trend.classList.remove('hidden');
  }

  function wireMasteryObservers(){
    const roots = [
      document.getElementById('student-progress-strengths'),
      document.getElementById('student-progress-focus')
    ].filter(Boolean);

    roots.forEach(root => {
      if (root.dataset.v41MasteryWatch === '1') return;
      root.dataset.v41MasteryWatch = '1';

      new MutationObserver(() => decorateMasteryCards())
        .observe(root, { childList:true, subtree:true });
    });

    const milestone = document.getElementById('student-motivation-milestone');
    if (milestone && milestone.dataset.v41MasteryWatch !== '1') {
      milestone.dataset.v41MasteryWatch = '1';

      new MutationObserver(() => syncImprovementTrend())
        .observe(milestone, {
          childList:true,
          subtree:true,
          attributes:true,
          attributeFilter:['class']
        });
    }
  }

  function applyV41CMasteryProgress(){
    injectStyles();
    buildMasteryOverview();
    wireMasteryObservers();
    decorateMasteryCards();
    syncImprovementTrend();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV41CMasteryProgress, { once:true });
  } else {
    applyV41CMasteryProgress();
  }
})();
