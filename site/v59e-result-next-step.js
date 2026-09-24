/* V5.9E — Result screen "What's next" prompt.
   Adds a warm, child-friendly next-step suggestion below the score on the
   Practice result screen. Reads the recommended topic from the existing V5.7C
   home mini-card (already loaded) — no network calls, no new data authority.
   Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59eResultNextStepInstalled) return;
  ROOT.__v59eResultNextStepInstalled = true;

  const STYLE_ID  = 'v59e-result-next-step-style';
  const PROMPT_ID = 'v59e-next-step-prompt';
  const RESULT_ID = 'result';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${PROMPT_ID} {
        margin: 18px 0 4px;
        padding: 16px 18px;
        border-radius: 18px;
        background: color-mix(in srgb, var(--primary, #3b82f6) 8%, var(--card, #fff));
        border: 1px solid color-mix(in srgb, var(--primary, #3b82f6) 22%, var(--border, #e2e8f0));
        display: grid;
        gap: 10px;
        animation: v59e-slide-in 0.35s ease;
      }
      @keyframes v59e-slide-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #${PROMPT_ID} .v59e-label {
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--primary, #3b82f6);
        margin-bottom: 2px;
      }
      #${PROMPT_ID} .v59e-title {
        font-size: 15px;
        font-weight: 800;
        color: var(--text, #1e293b);
        margin: 0 0 2px;
      }
      #${PROMPT_ID} .v59e-sub {
        font-size: 12px;
        color: var(--muted, #64748b);
        margin: 0 0 8px;
        line-height: 1.45;
      }
      #${PROMPT_ID} .v59e-action {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      #${PROMPT_ID} .v59e-btn-primary {
        flex: 1 1 auto;
        min-height: 44px;
        padding: 10px 18px;
        border-radius: 12px;
        border: none;
        background: var(--primary, #3b82f6);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        text-align: center;
      }
      #${PROMPT_ID} .v59e-btn-primary:hover {
        opacity: 0.88;
      }
      #${PROMPT_ID} .v59e-btn-home {
        min-height: 44px;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid var(--border, #e2e8f0);
        background: transparent;
        color: var(--text, #1e293b);
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(s);
  }

  /* Read the recommendation topic from the v57c home mini-card.
     This element is already populated by V5.7C after sign-in — we just read it. */
  function getRecommendation() {
    const titleEl = document.querySelector('[data-v57c-card="recommendation"] [data-v57c-recommendation-title]');
    const title = titleEl?.textContent?.trim();
    if (!title || title.includes('Preparing') || title.includes('Loading') || title.length < 3) return null;
    return title;
  }

  /* Read the last completed topic from the result screen's own pill. */
  function getLastTopic() {
    const pill = document.querySelector('#result #path-pill');
    const text = pill?.textContent?.trim();
    if (!text || text.length < 2) return null;
    return text;
  }

  /* Score-aware message — warm, encouraging, child-friendly. */
  function scoreMessage(pct) {
    if (pct >= 90) return 'Brilliant work! 🌟';
    if (pct >= 70) return 'Well done! 💪';
    if (pct >= 50) return 'Good effort! Keep going 🎯';
    return 'Keep practising — you\'re improving! 🔄';
  }

  function buildPrompt(scorePercent) {
    const recommendation = getRecommendation();
    const lastTopic = getLastTopic();
    const msg = scoreMessage(scorePercent);

    const prompt = document.createElement('div');
    prompt.id = PROMPT_ID;

    if (recommendation && recommendation !== lastTopic) {
      // We have a specific recommendation different from what they just did
      prompt.innerHTML = `
        <div>
          <div class="v59e-label">⭐ What to do next</div>
          <p class="v59e-title">${esc(msg)}</p>
          <p class="v59e-sub">Your next recommended practice is <strong>${esc(recommendation)}</strong>.</p>
        </div>
        <div class="v59e-action">
          <button class="v59e-btn-primary" id="v59e-practice-again">Practise Again ✏️</button>
          <button class="v59e-btn-home" id="v59e-go-home">🏠 Home</button>
        </div>`;
    } else {
      // Generic next-step
      prompt.innerHTML = `
        <div>
          <div class="v59e-label">⭐ What to do next</div>
          <p class="v59e-title">${esc(msg)}</p>
          <p class="v59e-sub">Every practice session builds your skills. Try another one!</p>
        </div>
        <div class="v59e-action">
          <button class="v59e-btn-primary" id="v59e-practice-again">Practise Again ✏️</button>
          <button class="v59e-btn-home" id="v59e-go-home">🏠 Home</button>
        </div>`;
    }

    return prompt;
  }

  function attachHandlers(prompt) {
    prompt.querySelector('#v59e-practice-again')?.addEventListener('click', () => {
      // Delegate to the existing "Practise Again" button
      document.getElementById('again-btn')?.click();
    });
    prompt.querySelector('#v59e-go-home')?.addEventListener('click', () => {
      document.querySelector('[data-v40-nav="home"]:not([disabled])')?.click();
    });
  }

  function showPrompt(scorePercent) {
    const result = byId(RESULT_ID);
    if (!result) return;
    byId(PROMPT_ID)?.remove();

    injectStyles();
    const prompt = buildPrompt(scorePercent);
    attachHandlers(prompt);

    // Insert before the existing buttons row
    const buttons = result.querySelector('.buttons');
    if (buttons) {
      result.insertBefore(prompt, buttons);
    } else {
      result.appendChild(prompt);
    }
  }

  /* Parse first-try percent from the result screen score text, e.g. "8/10 (80%)" */
  function parsePercent() {
    const scoreEl = byId('result-score');
    const text = scoreEl?.textContent || '';
    const m = text.match(/\((\d+)%\)/);
    return m ? parseInt(m[1]) : 50; // default to 50 if unparseable
  }

  /* Wrap finishPractice to show the prompt after the result screen appears. */
  function installWrapper() {
    if (typeof finishPractice === 'undefined') return false;
    const base = finishPractice;

    finishPractice = async function(early) {
      await base(early);
      // Wait for result screen to render and v57c to refresh recommendation
      setTimeout(() => {
        const pct = parsePercent();
        showPrompt(pct);
      }, 2200);
    };
    return true;
  }

  function tryInstall() {
    if (installWrapper()) return;
    const t = setInterval(() => { if (installWrapper()) clearInterval(t); }, 200);
    setTimeout(() => clearInterval(t), 10000);
  }

  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInstall, { once: true });
  } else {
    tryInstall();
  }
})();
