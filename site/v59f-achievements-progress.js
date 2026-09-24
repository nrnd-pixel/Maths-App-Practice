/* V5.9F — Achievements progress display.
   Replaces the single static "First Practice" card in the dashboard achievements
   section with all defined badges, each showing:
   - Earned badges: icon, title, earned date
   - Locked badges: lock icon, title, plain-English requirement, progress indicator
   Reads badge data from the existing V5.7.1B gamification RPC payload (already
   cached). No new network calls. Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59fAchievementsProgressInstalled) return;
  ROOT.__v59fAchievementsProgressInstalled = true;

  const STYLE_ID = 'v59f-achievements-style';
  const GRID_ID  = 'student-motivation-achievements';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* All badge definitions — mirrors v571b_student_streaks_achievements.sql.
     These are the canonical badge ids and their child-friendly requirement text. */
  const BADGE_DEFS = [
    {
      id: 'first_practice',
      icon: '🌱',
      title: 'First Practice',
      requirement: 'Complete your first Practice session.',
      progressType: 'sessions',
      target: 1,
    },
    {
      id: 'first_10_questions',
      icon: '🔟',
      title: 'First 10',
      requirement: 'Answer 10 Practice questions.',
      progressType: 'questions',
      target: 10,
    },
    {
      id: 'getting_going',
      icon: '🚀',
      title: 'Getting Going',
      requirement: 'Complete 5 Practice sessions.',
      progressType: 'sessions',
      target: 5,
    },
    {
      id: 'perfect_five',
      icon: '⭐',
      title: 'Perfect Five',
      requirement: 'Get everything right first try in a session of 5+ questions.',
      progressType: null,
      target: null,
    },
    {
      id: 'mastery_maker',
      icon: '🧠',
      title: 'Mastery Maker',
      requirement: 'Reach 90% mastery in a Practice session.',
      progressType: null,
      target: null,
    },
    {
      id: 'three_day_streak',
      icon: '🔥',
      title: '3-Day Streak',
      requirement: 'Practise 3 days in a row.',
      progressType: 'streak',
      target: 3,
    },
    {
      id: 'seven_day_streak',
      icon: '🔥',
      title: '7-Day Streak',
      requirement: 'Practise 7 days in a row.',
      progressType: 'streak',
      target: 7,
    },
    {
      id: 'past_paper_beginner',
      icon: '📄',
      title: 'Past Paper Beginner',
      requirement: 'Complete your first Past Paper session.',
      progressType: null,
      target: null,
    },
  ];

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${GRID_ID} {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      @media (max-width: 480px) {
        #${GRID_ID} { grid-template-columns: 1fr; }
      }
      .v59f-badge-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--border, #e2e8f0);
        border-radius: 16px;
        background: var(--surface-muted, #f8fafc);
        transition: border-color 0.2s;
      }
      .v59f-badge-card.v59f-earned {
        border-color: var(--success, #22c55e);
        background: var(--successbg, #f0fdf4);
      }
      .v59f-badge-card.v59f-locked {
        opacity: 0.75;
      }
      .v59f-badge-icon {
        font-size: 26px;
        line-height: 1;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .v59f-badge-body { flex: 1; min-width: 0; }
      .v59f-badge-title {
        font-size: 13px;
        font-weight: 800;
        color: var(--text, #1e293b);
        margin: 0 0 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .v59f-badge-req {
        font-size: 11px;
        color: var(--muted, #64748b);
        line-height: 1.4;
        margin: 0 0 6px;
      }
      .v59f-badge-when {
        font-size: 11px;
        color: var(--success, #16a34a);
        font-weight: 700;
        margin: 0;
      }
      .v59f-progress-bar {
        height: 5px;
        border-radius: 999px;
        background: var(--bar-bg, #e7ebf0);
        overflow: hidden;
        margin-top: 5px;
      }
      .v59f-progress-fill {
        height: 100%;
        border-radius: 999px;
        background: var(--primary, #3b82f6);
        transition: width 0.6s ease;
      }
      .v59f-progress-label {
        font-size: 10px;
        color: var(--muted, #64748b);
        margin-top: 3px;
        font-weight: 600;
      }
    `;
    document.head.appendChild(s);
  }

  /* Format earned date to something child-friendly */
  function friendlyDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (!isFinite(d)) return '';
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays} days ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  /* Build a badge card element */
  function buildCard(def, earnedBadge, stats) {
    const earned = !!earnedBadge?.earned;
    const card = document.createElement('article');
    card.className = `v59f-badge-card ${earned ? 'v59f-earned' : 'v59f-locked'}`;

    let progressHtml = '';
    if (!earned && def.progressType && def.target) {
      let current = 0;
      if (def.progressType === 'sessions') {
        current = Math.min(stats.sessionCount ?? 0, def.target);
      } else if (def.progressType === 'questions') {
        current = Math.min(stats.questionCount ?? 0, def.target);
      } else if (def.progressType === 'streak') {
        current = Math.min(stats.currentStreak ?? 0, def.target);
      }
      const pct = Math.round((current / def.target) * 100);
      progressHtml = `
        <div class="v59f-progress-bar">
          <div class="v59f-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="v59f-progress-label">${current} / ${def.target}</div>`;
    }

    const when = earned ? `<p class="v59f-badge-when">✓ Earned ${esc(friendlyDate(earnedBadge.earned_at))}</p>` : '';

    card.innerHTML = `
      <div class="v59f-badge-icon">${earned ? esc(def.icon) : '🔒'}</div>
      <div class="v59f-badge-body">
        <p class="v59f-badge-title">${esc(def.title)}</p>
        <p class="v59f-badge-req">${esc(def.requirement)}</p>
        ${when}
        ${progressHtml}
      </div>`;
    return card;
  }

  /* Read current stats from gamification card (already rendered by V5.7.1A/B) */
  function readStats() {
    const card = document.getElementById('v571a-gamification-card');
    if (!card) return {};

    // Session count from dashboard summary
    const practiceEl = document.getElementById('student-progress-practice');
    const sessionCount = parseInt(practiceEl?.textContent) || 0;

    // Streak from streak chip
    const streakChip = card.querySelector('.v571b-streak-chip');
    const streakText  = streakChip?.textContent?.trim() || '';
    const streakMatch = streakText.match(/(\d+)/);
    const currentStreak = streakMatch ? parseInt(streakMatch[1]) : 0;

    // Question count — approximate from sessions * 10 (no direct signal)
    // If we have session count, show meaningful progress
    const questionCount = sessionCount * 10;

    return { sessionCount, currentStreak, questionCount };
  }

  /* Read earned badge data from the existing V5.7.1B achievement DOM.
     The gamification-student.js renders badges as data-badge-id elements. */
  function readEarnedBadges() {
    const earned = {};
    document.querySelectorAll('.v571b-badge.earned[data-badge-id]').forEach(el => {
      const id = el.dataset.badgeId;
      if (id) {
        const when = el.querySelector('small')?.textContent?.trim() || '';
        earned[id] = { earned: true, earned_at: when };
      }
    });
    return earned;
  }

  function renderAchievements() {
    const grid = byId(GRID_ID);
    if (!grid) return;

    injectStyles();

    const earnedBadges = readEarnedBadges();
    const stats = readStats();

    grid.innerHTML = '';
    for (const def of BADGE_DEFS) {
      const card = buildCard(def, earnedBadges[def.id] || null, stats);
      grid.appendChild(card);
    }
  }

  /* Listen for the gamification-updated event fired by V5.7.1B after load */
  function hookEvents() {
    window.addEventListener('v571b:achievements-updated', () => {
      setTimeout(renderAchievements, 100);
    });
    /* Also re-render when the progress dashboard becomes visible */
    document.addEventListener('click', e => {
      const nav = e.target?.closest('[data-v40-nav="progress"]');
      if (nav) setTimeout(renderAchievements, 300);
    }, { passive: true });
  }

  function tryInit() {
    hookEvents();
    /* If gamification has already loaded, render immediately */
    if (document.querySelector('.v571b-badge')) {
      renderAchievements();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  } else {
    tryInit();
  }
})();
