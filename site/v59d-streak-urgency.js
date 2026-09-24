/* V5.9D — Streak urgency visual.
   Patches the streak chip rendered by gamification-student.js to show urgency
   styling (amber colour + pulse) when a student has an active streak but hasn't
   yet qualified today. Adds time-remaining language to make the streak feel
   time-sensitive. No streak data, scoring or persistence is changed. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59dStreakUrgencyInstalled) return;
  ROOT.__v59dStreakUrgencyInstalled = true;

  const STYLE_ID = 'v59d-streak-urgency-style';
  const CHIP_SELECTOR = '.v571b-streak-chip';
  const DASHBOARD_SELECTOR = '#start .v40c3-home-dashboard';

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v571b-streak-chip.v59d-urgent {
        background: color-mix(in srgb, #f59e0b 18%, var(--card)) !important;
        border-color: color-mix(in srgb, #f59e0b 45%, var(--border)) !important;
        color: #92400e !important;
        animation: v59d-pulse 2s ease-in-out infinite;
      }
      html[data-theme="dark"] .v571b-streak-chip.v59d-urgent {
        background: color-mix(in srgb, #f59e0b 22%, var(--card)) !important;
        color: #fcd34d !important;
      }
      @keyframes v59d-pulse {
        0%, 100% { box-shadow: 0 0 0 0 transparent; }
        50%       { box-shadow: 0 0 0 4px color-mix(in srgb, #f59e0b 25%, transparent); }
      }
      .v571b-streak-chip.v59d-safe {
        background: color-mix(in srgb, #10b981 14%, var(--card)) !important;
        border-color: color-mix(in srgb, #10b981 35%, var(--border)) !important;
        color: #065f46 !important;
      }
      html[data-theme="dark"] .v571b-streak-chip.v59d-safe {
        color: #6ee7b7 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function hoursUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight - now) / 3600000);
  }

  function patchChip(chip) {
    if (!chip) return;
    const text = chip.textContent || '';

    // Already qualified today → green safe state
    if (/secured today/i.test(text) || /completed today/i.test(text)) {
      chip.classList.add('v59d-safe');
      chip.classList.remove('v59d-urgent');
      return;
    }

    // Has an active streak but not yet qualified → urgent
    const streakMatch = text.match(/(\d+)-day streak/i);
    if (streakMatch) {
      const hours = hoursUntilMidnight();
      const urgentText = hours <= 3
        ? `🔥 ${streakMatch[1]}-day streak — ${hours}h left to keep it!`
        : `🔥 ${streakMatch[1]}-day streak — practise today to keep it`;
      chip.textContent = urgentText;
      chip.classList.add('v59d-urgent');
      chip.classList.remove('v59d-safe');
      return;
    }

    // No streak yet — neutral, no change
  }

  function applyUrgency() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll(CHIP_SELECTOR).forEach(patchChip);
  }

  function observe() {
    if (typeof MutationObserver === 'undefined') return;
    const dashboard = document.querySelector(DASHBOARD_SELECTOR);
    if (!dashboard) return;

    const observer = new MutationObserver(() => applyUrgency());
    observer.observe(dashboard, { childList: true, subtree: true });

    // Also run immediately
    applyUrgency();
  }

  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe, { once: true });
  } else {
    observe();
  }
})();
