/* V5.9I — Personal best tracking on the result screen.
   Stores the highest first-try percent per topic in localStorage (keyed by
   student ID + topic). On the result screen, shows a "🏆 Personal best!"
   chip if the current session beats the stored record for that topic.
   No grading, network, Supabase or auth authority. localStorage only.
   Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59iPersonalBestInstalled) return;
  ROOT.__v59iPersonalBestInstalled = true;

  const STYLE_ID   = 'v59i-pb-style';
  const CHIP_ID    = 'v59i-pb-chip';
  const STORE_KEY  = 'v59i-personal-bests';
  const RESULT_ID  = 'result';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  // ── localStorage helpers ─────────────────────────────────────────────────

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    } catch { return {}; }
  }

  function saveStore(store) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  }

  /** Returns the stored best percent for this student+topic, or 0 if none. */
  function getBest(studentId, topicKey) {
    const store = loadStore();
    return Number(store[`${studentId}||${topicKey}`] || 0);
  }

  /** Records a new best if pct > stored best. Returns true if it's a new best. */
  function recordBest(studentId, topicKey, pct) {
    if (!studentId || !topicKey || !Number.isFinite(pct) || pct <= 0) return false;
    const store = loadStore();
    const key = `${studentId}||${topicKey}`;
    const prev = Number(store[key] || 0);
    if (pct > prev) {
      store[key] = pct;
      // Prune to 200 entries (FIFO not needed; just cap size)
      const keys = Object.keys(store);
      if (keys.length > 200) {
        const toDelete = keys.slice(0, keys.length - 200);
        toDelete.forEach(k => delete store[k]);
      }
      saveStore(store);
      return true;
    }
    return false;
  }

  // ── UI ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${CHIP_ID} {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 20px;
        background: linear-gradient(135deg,
          color-mix(in srgb, #f59e0b 15%, var(--card, #fff)),
          color-mix(in srgb, #ef4444 10%, var(--card, #fff)));
        border: 1px solid color-mix(in srgb, #f59e0b 35%, var(--border, #e2e8f0));
        color: #b45309;
        font-size: 13px;
        font-weight: 900;
        margin: 10px auto 2px;
        animation: v59i-pop-in 0.4s cubic-bezier(.175,.885,.32,1.275);
      }
      @keyframes v59i-pop-in {
        from { opacity: 0; transform: scale(0.7); }
        to   { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  function showChip(isNewBest, prevBest) {
    byId(CHIP_ID)?.remove();
    if (!isNewBest) return;

    injectStyles();
    const chip = document.createElement('div');
    chip.id = CHIP_ID;
    chip.setAttribute('role', 'status');
    chip.textContent = prevBest > 0
      ? `🏆 New personal best! (was ${prevBest}%)`
      : '🏆 First score recorded!';

    // Insert after the result score, before the muted "Your score" label
    const scoreEl = byId('result-score');
    if (scoreEl?.parentNode) {
      scoreEl.parentNode.insertBefore(chip, scoreEl.nextSibling);
    } else {
      byId(RESULT_ID)?.appendChild(chip);
    }
  }

  // ── Parse result context ─────────────────────────────────────────────────

  function parseResultContext() {
    // Student ID from sign-in input (already saved in field after sign-in)
    const studentId = String(
      document.getElementById('student-id')?.value?.trim() ||
      document.querySelector('.v40c-session-identity-text')?.textContent?.trim() ||
      'anon'
    ).slice(0, 60);

    // Topic from the path-pill on the quiz screen ("Mixed Practice" or "Fractions")
    const pathText = byId('path-pill')?.textContent?.trim() || 'Mixed Practice';

    // First-try percent from result-score text "8/10 (80%)"
    const scoreText = byId('result-score')?.textContent || '';
    const pctMatch = scoreText.match(/\((\d+)%\)/);
    const pct = pctMatch ? parseInt(pctMatch[1]) : -1;

    return { studentId, topicKey: pathText, pct };
  }

  // ── Wrapper ───────────────────────────────────────────────────────────────

  function installWrapper() {
    if (typeof finishPractice === 'undefined') return false;
    const base = finishPractice;
    finishPractice = async function(early) {
      await base(early);

      // Result screen is now shown — read context and check personal best
      setTimeout(() => {
        const { studentId, topicKey, pct } = parseResultContext();
        if (pct < 0) return;

        const prevBest = getBest(studentId, topicKey);
        const isNew = recordBest(studentId, topicKey, pct);
        showChip(isNew, prevBest);
      }, 300);
    };
    return true;
  }

  function tryInstall() {
    if (installWrapper()) return;
    const t = setInterval(() => { if (installWrapper()) clearInterval(t); }, 200);
    setTimeout(() => clearInterval(t), 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInstall, { once: true });
  } else {
    tryInstall();
  }
})();
