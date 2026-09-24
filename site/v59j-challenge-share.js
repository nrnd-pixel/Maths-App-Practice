/* V5.9J — "Challenge a classmate" share button on the result screen.
   Adds a share button below the result code that generates a friendly
   challenge message. Uses the Web Share API on mobile; falls back to
   clipboard copy on desktop. No network calls, no data authority. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59jChallengeShareInstalled) return;
  ROOT.__v59jChallengeShareInstalled = true;

  const STYLE_ID  = 'v59j-share-style';
  const BTN_ID    = 'v59j-share-btn';
  const RESULT_ID = 'result';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${BTN_ID} {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 44px;
        padding: 11px 18px;
        border-radius: 14px;
        border: 1.5px dashed color-mix(in srgb, var(--primary, #3b82f6) 40%, var(--border, #e2e8f0));
        background: color-mix(in srgb, var(--primary, #3b82f6) 5%, var(--card, #fff));
        color: var(--primary, #3b82f6);
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        margin-top: 10px;
        transition: background 0.15s, border-color 0.15s;
      }
      #${BTN_ID}:hover {
        background: color-mix(in srgb, var(--primary, #3b82f6) 10%, var(--card, #fff));
        border-color: var(--primary, #3b82f6);
      }
      #${BTN_ID}.v59j-copied {
        color: var(--success, #16a34a);
        border-color: var(--success, #16a34a);
        background: var(--successbg, #f0fdf4);
      }
    `;
    document.head.appendChild(s);
  }

  function buildShareText(scoreText, topicText, resultCode) {
    const parts = [];
    if (scoreText) parts.push(`I got ${scoreText} in Maths Practice!`);
    if (topicText && topicText !== 'Mixed Practice') parts.push(`Topic: ${topicText}.`);
    parts.push('Can you beat my score?');
    if (resultCode) parts.push(`Check my result: ${resultCode}`);
    return parts.join(' ');
  }

  function getResultContext() {
    const scoreText = (byId('result-score')?.textContent || '').trim();
    const topicText = (byId('path-pill')?.textContent || '').trim();
    const resultCode = (byId('result-code')?.textContent || '').trim();
    return { scoreText, topicText, resultCode };
  }

  function showFeedback(btn, text, cls) {
    btn.textContent = text;
    btn.className = `${BTN_ID.replace('#','')} ${cls}`;
    setTimeout(() => {
      btn.textContent = '🏆 Challenge a classmate';
      btn.className = '';
    }, 2200);
  }

  function handleShare() {
    const btn = byId(BTN_ID);
    if (!btn) return;

    const { scoreText, topicText, resultCode } = getResultContext();
    const text = buildShareText(scoreText, topicText, resultCode);

    if (navigator.share) {
      navigator.share({ title: 'Maths Practice Challenge', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        showFeedback(btn, '✓ Copied to clipboard!', 'v59j-copied');
      }).catch(() => {
        // Final fallback: show the text in a prompt
        window.prompt('Copy this challenge:', text);
      });
    }
  }

  function addShareButton() {
    const result = byId(RESULT_ID);
    if (!result || byId(BTN_ID)) return;

    injectStyles();
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.textContent = '🏆 Challenge a classmate';
    btn.addEventListener('click', handleShare);

    // Insert after the result-code-box (or before the buttons row)
    const codeBox = document.getElementById('result-code-box');
    const buttons = result.querySelector('.buttons');
    if (codeBox) {
      codeBox.insertAdjacentElement('afterend', btn);
    } else if (buttons) {
      result.insertBefore(btn, buttons);
    } else {
      result.appendChild(btn);
    }
  }

  function installWrapper() {
    if (typeof finishPractice === 'undefined') return false;
    const base = finishPractice;
    finishPractice = async function(early) {
      await base(early);
      setTimeout(addShareButton, 400);
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
