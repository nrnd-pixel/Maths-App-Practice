/* V5.9G — Post-practice emoji reaction.
   Shows a brief animated emoji 1.2 seconds after the result screen appears,
   scaled to the student's first-try score. Fades out after 2 seconds.
   No grading, network, persistence or data authority. Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59gEmojiReactionInstalled) return;
  ROOT.__v59gEmojiReactionInstalled = true;

  const STYLE_ID  = 'v59g-emoji-style';
  const EMOJI_ID  = 'v59g-emoji-reaction';
  const RESULT_ID = 'result';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${EMOJI_ID} {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.2);
        font-size: 96px;
        line-height: 1;
        pointer-events: none;
        z-index: 9990;
        animation: v59g-pop 2.6s ease forwards;
        user-select: none;
      }
      @keyframes v59g-pop {
        0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.2); }
        18%  { opacity: 1;   transform: translate(-50%, -50%) scale(1.18); }
        28%  { opacity: 1;   transform: translate(-50%, -50%) scale(0.95); }
        36%  { opacity: 1;   transform: translate(-50%, -50%) scale(1.04); }
        46%  { opacity: 1;   transform: translate(-50%, -50%) scale(1); }
        70%  { opacity: 1;   transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0;   transform: translate(-50%, -50%) scale(0.8) translateY(-30px); }
      }
    `;
    document.head.appendChild(s);
  }

  function pickEmoji(pct) {
    if (pct >= 90) return '🌟';
    if (pct >= 70) return '😊';
    if (pct >= 50) return '💪';
    return '🔄';
  }

  function parsePercent() {
    const text = byId('result-score')?.textContent || '';
    const m = text.match(/\((\d+)%\)/);
    return m ? parseInt(m[1]) : 60;
  }

  function showEmoji() {
    const result = byId(RESULT_ID);
    if (!result?.classList.contains('active')) return;

    byId(EMOJI_ID)?.remove();
    injectStyles();

    const pct = parsePercent();
    const el = document.createElement('div');
    el.id = EMOJI_ID;
    el.textContent = pickEmoji(pct);
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);

    // Remove after animation ends
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  function installWrapper() {
    if (typeof finishPractice === 'undefined') return false;
    const base = finishPractice;
    finishPractice = async function(early) {
      await base(early);
      setTimeout(showEmoji, 1200);
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
