/* V5.9L — "Share with parent" button in My Progress.
   Adds a one-tap "Share with parent" button to the My Progress (student-dashboard)
   screen. Generates a read-only parent-friendly URL using the student's most recent
   result code (already stored in localStorage by the main app). On mobile uses
   navigator.share(); on desktop copies to clipboard.
   No new Supabase calls. No new data authority. Reads localStorage only.
   Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59lParentShareInstalled) return;
  ROOT.__v59lParentShareInstalled = true;

  const STYLE_ID   = 'v59l-parent-share-style';
  const BTN_WRAP_ID = 'v59l-parent-share-wrap';
  const RESULT_CODES_KEY = 'mathpractice_result_codes'; // same key as main app

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${BTN_WRAP_ID} {
        margin: 14px 0 2px;
        padding: 14px 16px;
        border-radius: 16px;
        background: color-mix(in srgb, var(--success, #22c55e) 7%, var(--card, #fff));
        border: 1px solid color-mix(in srgb, var(--success, #22c55e) 25%, var(--border, #e2e8f0));
        display: grid;
        gap: 8px;
      }
      #${BTN_WRAP_ID} .v59l-label {
        font-size: 12px;
        font-weight: 900;
        color: var(--success, #16a34a);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      #${BTN_WRAP_ID} .v59l-desc {
        font-size: 12px;
        color: var(--muted, #64748b);
        line-height: 1.45;
        margin: 0;
      }
      #${BTN_WRAP_ID} button {
        min-height: 44px;
        padding: 10px 18px;
        border-radius: 12px;
        border: none;
        background: var(--success, #22c55e);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        width: 100%;
      }
      #${BTN_WRAP_ID} button.v59l-copied {
        background: var(--primary, #3b82f6);
      }
      #${BTN_WRAP_ID} .v59l-no-code {
        font-size: 12px;
        color: var(--muted, #64748b);
        font-style: italic;
      }
    `;
    document.head.appendChild(s);
  }

  /** Reads the most recent result code from localStorage (same store as the main app). */
  function latestResultCode() {
    try {
      const rows = JSON.parse(localStorage.getItem(RESULT_CODES_KEY) || '[]');
      return rows[0]?.code || null;
    } catch { return null; }
  }

  /** Builds the parent-facing reviewed-work URL.
      The existing /student-review screen already accepts a result code parameter
      — we just pre-fill it as a hash so teachers and parents can open it directly. */
  function buildShareUrl(code) {
    const base = `${location.origin}${location.pathname}`;
    return `${base}#review:${encodeURIComponent(code)}`;
  }

  function buildShareText(code) {
    const url = buildShareUrl(code);
    return `Here is my Maths Practice progress! You can view it here: ${url}\n\nResult code: ${code}`;
  }

  function handleShare(code, btn) {
    const text = buildShareText(code);
    const url  = buildShareUrl(code);

    if (navigator.share) {
      navigator.share({
        title: 'Maths Practice — Progress Report',
        text,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Link copied!';
        btn.classList.add('v59l-copied');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('v59l-copied');
        }, 2500);
      }).catch(() => {
        window.prompt('Copy this link for your parent:', url);
      });
    }
  }

  function buildWidget(code) {
    injectStyles();
    const wrap = document.createElement('div');
    wrap.id = BTN_WRAP_ID;

    if (code) {
      wrap.innerHTML = `
        <div class="v59l-label">👪 Share with a parent</div>
        <p class="v59l-desc">Send your latest Maths Practice result to a parent or guardian.</p>
        <button type="button" id="v59l-share-btn">📤 Share progress with parent</button>`;
      wrap.querySelector('#v59l-share-btn').addEventListener('click', function() {
        handleShare(code, this);
      });
    } else {
      wrap.innerHTML = `
        <div class="v59l-label">👪 Share with a parent</div>
        <p class="v59l-no-code">Complete a Practice session to share your progress.</p>`;
    }
    return wrap;
  }

  function inject() {
    const dashboard = byId('student-dashboard');
    if (!dashboard || byId(BTN_WRAP_ID)) return false;

    const code   = latestResultCode();
    const widget = buildWidget(code);

    // Insert just before the achievement heading (always visible section)
    const achHeading = dashboard.querySelector('.student-achievement-heading');
    if (achHeading) {
      achHeading.insertAdjacentElement('beforebegin', widget);
    } else {
      // Fallback: insert after the motivation section
      const motivSection = dashboard.querySelector('.student-motivation-section');
      if (motivSection) {
        motivSection.insertAdjacentElement('afterend', widget);
      } else {
        dashboard.appendChild(widget);
      }
    }
    return true;
  }

  function tryInit() {
    if (inject()) return;
    document.addEventListener('click', e => {
      if (e.target?.closest('[data-v40-nav="progress"]')) setTimeout(inject, 400);
    }, { passive: true });
    window.addEventListener('v57c:home-updated', () => setTimeout(inject, 450));
    // Also re-inject after a practice finishes (result code may have updated)
    window.addEventListener('v571a:gamification-updated', () => {
      byId(BTN_WRAP_ID)?.remove();
      setTimeout(inject, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  } else {
    tryInit();
  }
})();
