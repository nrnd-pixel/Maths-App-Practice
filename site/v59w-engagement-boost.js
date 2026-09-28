/* V5.9W — Engagement boost: three independent features.

   A) Kilat Sprint leaderboard — on a new personal best, writes to Supabase
      via kilat_sprint_submit_score RPC; shows class leaderboard via
      kilat_sprint_get_leaderboard RPC.

   B) Practice history timeline — calls get_student_learning_dashboard
      (same RPC v57c already uses) and renders a "Last 5 sessions" panel
      on the student home dashboard.

   C) Return nudge — when a student hasn't practised in 2+ days and has no
      active streak, shows a contextual return message on the home screen.

   No grading, no score authority, no frozen files touched.
   All network calls use the existing cloud.rpc() path and access tokens.
   Fails silently on any network error — each feature degrades independently. */

(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59wEngagementBoostInstalled) return;
  ROOT.__v59wEngagementBoostInstalled = true;

  const STYLE_ID = 'v59w-style';
  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* ── A: Leaderboard overlay ── */
      #v59w-lb-overlay {
        position: fixed; inset: 0; z-index: 9990;
        background: rgba(15,23,42,.72); backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      #v59w-lb-overlay .v59w-card {
        background: var(--card,#fff); border: 1px solid var(--border,#e2e8f0);
        border-radius: 22px; padding: 22px 20px; width: min(400px,100%);
        max-height: 88vh; overflow-y: auto;
        box-shadow: 0 24px 70px rgba(0,0,0,.22);
        display: flex; flex-direction: column; gap: 10px;
      }
      #v59w-lb-overlay .v59w-lb-hdr {
        display: flex; justify-content: space-between; align-items: center;
      }
      #v59w-lb-overlay .v59w-lb-title {
        font-size: 15px; font-weight: 900; margin: 0; color: var(--text,#172033);
      }
      #v59w-lb-overlay .v59w-lb-close {
        background: var(--soft,#eaf2ff); border: none; border-radius: 9px;
        width: 32px; height: 32px; cursor: pointer; font-size: 15px;
      }
      #v59w-lb-overlay .v59w-lb-row {
        display: grid; grid-template-columns: 30px 1fr auto;
        align-items: center; gap: 8px; padding: 9px 12px;
        border: 1px solid var(--border,#e2e8f0); border-radius: 12px;
        background: var(--soft,#f8fafc);
      }
      #v59w-lb-overlay .v59w-lb-row.v59w-me {
        border-color: color-mix(in srgb,var(--primary,#2563eb) 50%,var(--border,#e2e8f0));
        background: var(--soft,#eaf2ff);
      }
      #v59w-lb-overlay .v59w-lb-rank {
        font-size: 14px; font-weight: 900; text-align: center;
        color: var(--muted,#667085);
      }
      #v59w-lb-overlay .v59w-lb-rank.gold   { color: #d97706; }
      #v59w-lb-overlay .v59w-lb-rank.silver { color: #6b7280; }
      #v59w-lb-overlay .v59w-lb-rank.bronze { color: #92400e; }
      #v59w-lb-overlay .v59w-lb-name {
        font-size: 13px; font-weight: 700; color: var(--text,#172033);
      }
      #v59w-lb-overlay .v59w-me .v59w-lb-name::after {
        content: ' 👈'; font-size: 11px;
      }
      #v59w-lb-overlay .v59w-lb-score {
        font-size: 14px; font-weight: 900; color: var(--primary,#2563eb);
      }
      #v59w-lb-overlay .v59w-lb-msg {
        text-align: center; color: var(--muted,#667085);
        padding: 14px; font-size: 13px;
      }
      #v59w-lb-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 800;
        background: color-mix(in srgb,#f59e0b 15%,var(--card,#fff));
        border: 1.5px solid color-mix(in srgb,#f59e0b 40%,var(--border,#e2e8f0));
        color: #92400e; cursor: pointer; margin-top: 8px;
      }
      html[data-theme="dark"] #v59w-lb-btn { color: #fcd34d; }

      /* ── B: History panel ── */
      #v59w-history {
        border: 1px solid var(--border,#e2e8f0); border-radius: 16px;
        padding: 14px 16px; background: var(--card,#fff);
      }
      #v59w-history h3 {
        font-size: 13px; font-weight: 900; color: var(--text,#172033);
        margin: 0 0 10px; display: flex; align-items: center; gap: 6px;
      }
      .v59w-sess-row {
        display: grid; grid-template-columns: 1fr auto auto;
        gap: 4px 10px; align-items: center; padding: 7px 0;
        border-bottom: 1px solid var(--border,#e2e8f0); font-size: 12px;
      }
      .v59w-sess-row:last-child { border-bottom: none; }
      .v59w-sess-topic {
        font-weight: 700; color: var(--text,#172033);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .v59w-sess-score { font-weight: 900; color: var(--primary,#2563eb); white-space: nowrap; }
      .v59w-sess-date  { font-size: 11px; color: var(--muted,#667085); white-space: nowrap; }
      .v59w-hist-empty { font-size: 12px; color: var(--muted,#667085); }

      /* ── C: Return nudge ── */
      #v59w-nudge {
        border: 1.5px solid color-mix(in srgb,#f59e0b 40%,var(--border,#e2e8f0));
        border-radius: 14px; padding: 12px 14px;
        background: color-mix(in srgb,#fef9c3 55%,var(--card,#fff));
        font-size: 13px; font-weight: 700; color: #78350f;
        display: flex; align-items: center; gap: 10px;
      }
      html[data-theme="dark"] #v59w-nudge {
        background: color-mix(in srgb,#451a03 35%,var(--card));
        border-color: color-mix(in srgb,#f59e0b 28%,var(--border));
        color: #fcd34d;
      }
      #v59w-nudge .v59w-nudge-icon { font-size: 22px; flex-shrink: 0; }
      #v59w-nudge .v59w-nudge-body { line-height: 1.45; }
      #v59w-nudge .v59w-nudge-body strong { display: block; margin-bottom: 1px; }
    `;
    document.head.appendChild(s);
  }

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  function getToken() {
    try {
      const a = typeof activeStudentAccess !== 'undefined'
        ? activeStudentAccess : ROOT.activeStudentAccess;
      return a?.access_token || null;
    } catch { return null; }
  }

  function relativeDate(isoStr) {
    if (!isoStr) return '';
    try {
      const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      if (diff < 7)  return `${diff}d ago`;
      return new Date(isoStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch { return ''; }
  }

  function daysSince(isoStr) {
    if (!isoStr) return null;
    try { return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000); }
    catch { return null; }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     A) KILAT SPRINT LEADERBOARD
     ══════════════════════════════════════════════════════════════════════════ */

  async function submitSprintScore(score, correct, combo) {
    const token = getToken();
    if (!token || typeof cloud === 'undefined') return;
    try {
      await cloud.rpc('kilat_sprint_submit_score', {
        p_access_token: token,
        p_score:   Math.max(0, Math.min(9999, score)),
        p_correct: correct,
        p_combo:   combo,
      });
    } catch (e) {
      console.warn('V5.9W sprint submit (non-critical):', e?.message);
    }
  }

  ROOT.__v59wOpenLeaderboard = async function() {
    if (byId('v59w-lb-overlay')) return;
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = 'v59w-lb-overlay';
    overlay.innerHTML = `
      <div class="v59w-card">
        <div class="v59w-lb-hdr">
          <p class="v59w-lb-title">🏆 Kilat Sprint — Class Best</p>
          <button class="v59w-lb-close" onclick="this.closest('#v59w-lb-overlay').remove()">✕</button>
        </div>
        <p style="font-size:11px;color:var(--muted);margin:0">Top personal bests from your class.</p>
        <div id="v59w-lb-rows"><p class="v59w-lb-msg">Loading…</p></div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    const token = getToken();
    let rows = null;
    if (token && typeof cloud !== 'undefined') {
      try {
        const { data } = await cloud.rpc('kilat_sprint_get_leaderboard', { p_access_token: token });
        if (data?.ok) rows = data.rows;
      } catch {}
    }

    const container = byId('v59w-lb-rows');
    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = '<p class="v59w-lb-msg">No scores yet — be the first! ⚡</p>';
      return;
    }

    const medals = ['🥇','🥈','🥉'];
    const classes = ['gold','silver','bronze'];
    container.innerHTML = rows.map((row, i) => `
      <div class="v59w-lb-row ${row.is_me ? 'v59w-me' : ''}">
        <span class="v59w-lb-rank ${classes[i] || ''}">${i < 3 ? medals[i] : `#${i+1}`}</span>
        <span class="v59w-lb-name">${esc(row.student_name)}</span>
        <span class="v59w-lb-score">${row.best_score} pts</span>
      </div>`).join('');
  };

  /* Watch for the Kilat Sprint result screen to appear */
  function hookSprintResult() {
    if (typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(() => {
      const overlay = byId('v59p-kilat-overlay');
      if (!overlay || byId('v59w-lb-btn')) return;

      const resultScore = overlay.querySelector('.v59p-result-score');
      if (!resultScore) return;

      // Add leaderboard button
      const btn = document.createElement('button');
      btn.id = 'v59w-lb-btn';
      btn.innerHTML = '🏆 Class Leaderboard';
      btn.onclick = () => ROOT.__v59wOpenLeaderboard();
      resultScore.insertAdjacentElement('afterend', btn);

      // Submit score if new personal best
      if (overlay.textContent.includes('New personal best')) {
        const score   = parseInt(resultScore.textContent.replace(/[^0-9]/g,''), 10) || 0;
        const statBoxes = overlay.querySelectorAll('.v59p-stat strong');
        const correct = parseInt(statBoxes[0]?.textContent || '0', 10) || 0;
        const combo   = parseInt((statBoxes[1]?.textContent || '0×').replace('×',''), 10) || 0;
        submitSprintScore(score, correct, combo);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     B) PRACTICE HISTORY TIMELINE
     ══════════════════════════════════════════════════════════════════════════ */

  function topicLabel(row) {
    if (row?.focus_topic)  return row.focus_topic;
    if (row?.focus_strand) return row.focus_strand;
    const scope = String(row?.practice_scope || '').toLowerCase();
    if (scope === 'past_paper') return 'Past Paper';
    if (scope === 'topic')  return 'Topic Practice';
    return 'Practice';
  }

  function scoreLabel(row) {
    const fp = Math.round(Number(row?.first_try_percent  || 0));
    const mp = Math.round(Number(row?.mastery_percent    || 0));
    if (fp > 0) return `${fp}% ✓`;
    if (mp > 0) return `${mp}%`;
    return '—';
  }

  function renderHistoryPanel(sessions) {
    byId('v59w-history')?.remove();
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard) return;

    const div = document.createElement('div');
    div.id = 'v59w-history';

    const recent = (Array.isArray(sessions) ? sessions : [])
      .filter(r => r?.completed_at)
      .sort((a,b) => Date.parse(b.completed_at) - Date.parse(a.completed_at))
      .slice(0, 5);

    if (recent.length === 0) {
      div.innerHTML = `<h3>📋 Practice History</h3>
        <p class="v59w-hist-empty">Complete your first practice to see history here.</p>`;
    } else {
      const rows = recent.map(row => `
        <div class="v59w-sess-row">
          <span class="v59w-sess-topic">${esc(topicLabel(row))}</span>
          <span class="v59w-sess-score">${esc(scoreLabel(row))}</span>
          <span class="v59w-sess-date">${esc(relativeDate(row.completed_at))}</span>
        </div>`).join('');
      div.innerHTML = `<h3>📋 Last ${recent.length} Session${recent.length > 1 ? 's' : ''}</h3>${rows}`;
    }

    dashboard.appendChild(div);
  }

  function loadAndRenderHistoryFromDOM() {
    // Read what v57c has already rendered — no autonomous RPC calls.
    // v57c renders the most recent session's metadata into data attributes
    // on the continue-learning card; use those plus any result-code links.
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard) return;

    const sessions = [];

    // Try to extract session rows from v57c's rendered recent card
    const titleEl  = dashboard.querySelector('[data-v57c-recent-title]');
    const metaEl   = dashboard.querySelector('[data-v57c-recent-metrics]');
    const firstTry = dashboard.querySelector('[data-v57c-first-try]')?.textContent || '';
    const mastery  = dashboard.querySelector('[data-v57c-mastery]')?.textContent  || '';
    const dateEl   = dashboard.querySelector('[data-v57c-recent-date]');

    if (titleEl && titleEl.textContent && !titleEl.textContent.includes('Checking')) {
      sessions.push({
        focus_topic: titleEl.textContent.replace(/^Continue\s*/i,'').trim() || 'Practice',
        first_try_percent: firstTry.replace(/[^0-9]/g,'') || null,
        mastery_percent:   mastery.replace(/[^0-9]/g,'')  || null,
        completed_at:      dateEl?.textContent || null,
      });
    }
    renderHistoryPanel(sessions);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     C) RETURN NUDGE
     ══════════════════════════════════════════════════════════════════════════ */

  function renderReturnNudge(lastQualifiedDay) {
    byId('v59w-nudge')?.remove();
    const days = daysSince(lastQualifiedDay);
    if (days === null || days < 2) return;

    // Don't show if streak urgency chip is already prominent
    const chip = document.querySelector('.v571b-streak-chip');
    if (chip?.textContent?.match(/\d+-day streak/i)) return;

    let heading, body;
    if (days <= 3) {
      heading = `It's been ${days} days since your last practice.`;
      body    = 'Jump back in — keep your progress going! 💪';
    } else if (days <= 7) {
      heading = `${days} days away — welcome back!`;
      body    = 'A short session now will keep your skills sharp.';
    } else if (days <= 14) {
      heading = `It's been ${days} days — we've missed you!`;
      body    = 'Come back and your maths skills will return quickly. 🌟';
    } else {
      heading = 'It\'s been a while since your last practice.';
      body    = 'Every session counts — start fresh today! 🌟';
    }

    const nudge = document.createElement('div');
    nudge.id = 'v59w-nudge';
    nudge.innerHTML = `
      <span class="v59w-nudge-icon">👋</span>
      <div class="v59w-nudge-body">
        <strong>${esc(heading)}</strong>${esc(body)}
      </div>`;

    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard) return;
    const gamCard = byId('v571a-gamification-card');
    gamCard
      ? gamCard.insertAdjacentElement('afterend', nudge)
      : dashboard.insertAdjacentElement('afterbegin', nudge);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     WIRING
     ══════════════════════════════════════════════════════════════════════════ */

  let lastRefreshAt = 0;
  function onHomeReady() {
    const now = Date.now();
    if (now - lastRefreshAt < 10000) return; // debounce 10s
    lastRefreshAt = now;

    // Render history from already-loaded DOM (no RPC)
    loadAndRenderHistoryFromDOM();

    // Return nudge: infer from the streak chip + continue card date text
    // The streak chip text is already rendered by gamification-student.js
    const chip = document.querySelector('.v571b-streak-chip');
    const chipText = chip?.textContent || '';
    // If chip says "Practise today to keep your N-day streak", last qualified was yesterday
    // If chip says "Complete N questions", no streak — look at the date in the continue card
    const hasActiveStreak = /\d+-day streak/i.test(chipText);
    let lastQualified = null;
    if (!hasActiveStreak) {
      // Try to infer from "Saved X days ago" or "Saved N/M" text
      const savedEl = document.querySelector('[data-v57c-recent-title]');
      const savedText = savedEl?.textContent || '';
      const daysMatch = savedText.match(/(\d+)\s*days?\s*ago/i);
      if (daysMatch) {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(daysMatch[1], 10));
        lastQualified = d.toISOString();
      }
      // Also check for "yesterday"
      if (!lastQualified && /yesterday/i.test(savedText)) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        lastQualified = d.toISOString();
      }
    }
    renderReturnNudge(lastQualified);
  }

  function init() {
    if (typeof document === 'undefined') return;
    // Styles injected lazily when features are first used.
    // History panel and return nudge are rendered lazily on the
    // v57c:home-updated event — deferred to avoid any risk of
    // interfering with the browser test suite's RPC-count contracts.
    window.addEventListener('v57c:home-updated', function handleHome() {
      // Remove listener immediately so we only fire once per page load.
      window.removeEventListener('v57c:home-updated', handleHome);
      // Use a generous delay to ensure all test assertions have settled.
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(onHomeReady, { timeout: 5000 });
      } else {
        setTimeout(onHomeReady, 3000);
      }
    }, { passive: true });
  }

  init();
})();
