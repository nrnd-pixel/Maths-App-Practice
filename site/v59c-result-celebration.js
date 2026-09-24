/* V5.9C — Result screen celebration.
   Adds two presentation-only enhancements to the Practice result screen:
   1. XP celebration banner: reads the XP card after finishPractice and shows
      "+N XP" and level/streak info directly on the result screen so students
      see their progress reward immediately, not only after returning to Home.
   2. First-practice moment: when the first_practice achievement badge is newly
      earned, shows a "You did it!" overlay with the badge and a clear next step.
   No grading, scoring, persistence or network authority is added. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59cResultCelebrationInstalled) return;
  ROOT.__v59cResultCelebrationInstalled = true;

  const STYLE_ID = 'v59c-result-celebration-style';
  const BANNER_ID = 'v59c-xp-banner';
  const OVERLAY_ID = 'v59c-first-practice-overlay';
  const BADGE_SELECTOR = '#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]';
  const XP_CARD_ID = 'v571a-gamification-card';
  const RESULT_SCREEN_ID = 'result';

  let lastXpSnapshot = null;
  let overlayShown = false;

  const trim = v => String(v ?? '').trim();
  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BANNER_ID} {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        margin: 12px 0 4px;
        padding: 13px 16px;
        border-radius: 16px;
        background: linear-gradient(135deg,
          color-mix(in srgb, #7c3aed 12%, var(--card)),
          color-mix(in srgb, #2563eb 10%, var(--card)));
        border: 1px solid color-mix(in srgb, #7c3aed 30%, var(--border));
        animation: v59c-slide-in 0.4s ease;
      }
      #${BANNER_ID} .v59c-xp-gained {
        font-size: 22px;
        font-weight: 900;
        color: #7c3aed;
        letter-spacing: -0.5px;
      }
      #${BANNER_ID} .v59c-level {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      #${BANNER_ID} .v59c-streak {
        font-size: 12px;
        color: var(--muted);
        font-weight: 600;
      }
      @keyframes v59c-slide-in {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0,0,0,0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: v59c-fade-in 0.3s ease;
      }
      #${OVERLAY_ID} .v59c-card {
        background: var(--card);
        border-radius: 24px;
        padding: 32px 28px 24px;
        max-width: 360px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      }
      #${OVERLAY_ID} .v59c-emoji { font-size: 56px; display: block; margin-bottom: 12px; }
      #${OVERLAY_ID} h2 { margin: 0 0 8px; font-size: 24px; }
      #${OVERLAY_ID} p { margin: 0 0 20px; color: var(--muted); font-size: 14px; line-height: 1.5; }
      #${OVERLAY_ID} .v59c-badge-earned {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 20px;
        background: color-mix(in srgb, #f59e0b 15%, var(--card));
        border: 1px solid color-mix(in srgb, #f59e0b 35%, var(--border));
        color: #b45309;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 20px;
      }
      #${OVERLAY_ID} .v59c-next { font-size: 13px; color: var(--muted); margin: 12px 0 0; }
      @keyframes v59c-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  function snapshotXp() {
    const card = byId(XP_CARD_ID);
    if (!card) return null;
    const xpText = trim(card.querySelector('.v571a-xp-label')?.textContent).replace(/^⭐\s*/, '');
    const levelTitle = trim(card.querySelector('.v571a-level-title')?.textContent);
    const streakText = trim(card.querySelector('.v571b-streak-chip')?.textContent);
    const xpNum = parseInt(xpText) || 0;
    return { xpNum, xpText, levelTitle, streakText };
  }

  function showXpBanner(xpBefore, xpAfter) {
    const result = byId(RESULT_SCREEN_ID);
    if (!result) return;
    byId(BANNER_ID)?.remove();

    const gained = xpAfter.xpNum - (xpBefore?.xpNum ?? xpAfter.xpNum);
    const banner = document.createElement('div');
    banner.id = BANNER_ID;

    const gainedPart = gained > 0
      ? `<span class="v59c-xp-gained">⭐ +${gained} XP</span>`
      : `<span class="v59c-xp-gained">⭐ ${xpAfter.xpText}</span>`;

    const levelPart = xpAfter.levelTitle
      ? `<span class="v59c-level">${xpAfter.levelTitle}</span>`
      : '';

    const streakPart = xpAfter.streakText
      ? `<span class="v59c-streak">${xpAfter.streakText}</span>`
      : '';

    banner.innerHTML = gainedPart + levelPart + streakPart;

    // Insert after the trophy emoji / h1, before the score
    const scoreEl = result.querySelector('#result-score');
    if (scoreEl?.parentNode) {
      scoreEl.parentNode.insertBefore(banner, scoreEl);
    } else {
      result.appendChild(banner);
    }
  }

  function firstPracticeBadgeState() {
    const badge = document.querySelector(BADGE_SELECTOR);
    if (!badge) return 'unknown';
    return badge.classList.contains('earned') ? 'earned' : 'not_earned';
  }

  function showFirstPracticeOverlay() {
    if (overlayShown || byId(OVERLAY_ID)) return;
    overlayShown = true;
    injectStyles();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'First practice complete');
    overlay.innerHTML = `
      <div class="v59c-card">
        <span class="v59c-emoji">🌟</span>
        <h2>First practice done!</h2>
        <p>You've taken your first step. Every session builds your skills — keep going and watch your XP grow.</p>
        <div class="v59c-badge-earned">🏅 Badge earned: First Practice</div>
        <button class="primary" id="v59c-close-overlay" style="width:100%;min-height:48px">Go to Home</button>
        <p class="v59c-next">Your progress is saved · try Practice again to build your streak</p>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      // Navigate home
      document.querySelector('[data-v40-nav="home"]')?.click();
    };
    byId('v59c-close-overlay')?.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }

  function installWrapper() {
    if (typeof finishPractice === 'undefined') return false;
    const base = finishPractice;

    finishPractice = async function(early) {
      // Snapshot XP before
      const before = snapshotXp();
      lastXpSnapshot = before;

      await base(early);

      // After result screen is shown, wait for gamification to refresh
      // then show the XP banner
      setTimeout(() => {
        const after = snapshotXp();
        if (after) showXpBanner(before, after);

        // Check for first-practice badge newly earned
        const badgeState = firstPracticeBadgeState();
        if (badgeState === 'earned') {
          // Give the result screen a moment to render, then show overlay
          setTimeout(showFirstPracticeOverlay, 600);
        }
      }, 1800); // gamification cards refresh after ~1.5s
    };
    return true;
  }

  function tryInstall() {
    if (installWrapper()) return;
    // Retry — finishPractice may not be defined yet at parse time
    const t = setInterval(() => {
      if (installWrapper()) clearInterval(t);
    }, 200);
    setTimeout(() => clearInterval(t), 10000);
  }

  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInstall, { once: true });
  } else {
    tryInstall();
  }
})();
