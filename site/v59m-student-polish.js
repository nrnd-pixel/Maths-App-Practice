/* V5.9M — Student-facing language and UX polish.
   Five presentation-only improvements for Year 4–6 students:
   1. Hide the question metadata line (strand·topic·subtopic·skill·type·marks) during practice
   2. Child-friendly result stat labels (First try → Got it first time, etc.)
   3. Explain the result code in one plain sentence; hide "Storage" stat
   4. Hide version badge from student view; relabel "Student ID" → "Class number"
   5. Collapse the Learn setup by default — show a single prominent Start button;
      expose settings via a "Choose your own topic ▼" link
   All changes are CSS and lightweight DOM text patches. No grading, data, auth
   or network authority changed. Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59mStudentPolishInstalled) return;
  ROOT.__v59mStudentPolishInstalled = true;

  const STYLE_ID = 'v59m-student-polish-style';
  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  // ── 1. Styles ─────────────────────────────────────────────────────────────

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* ── 1. Hide question metadata line during practice ─────────── */
      #q-meta {
        display: none !important;
      }

      /* ── 3. Hide "Storage" stat box on result screen ─────────────── */
      .stat:has(#res-sync),
      .stat small:has(+ #res-sync) {
        display: none !important;
      }
      /* Fallback: hide by content when :has() unavailable */
      #res-sync {
        display: none !important;
      }
      #res-sync + small,
      small:has(~ #res-sync) {
        display: none !important;
      }
      /* Hide the whole stat box that contains Storage */
      .v59m-hide-storage {
        display: none !important;
      }

      /* ── 4. Hide version badge ───────────────────────────────────── */
      #start .badge.local {
        display: none !important;
      }

      /* ── 5. Learn setup collapsed by default ─────────────────────── */
      /* The big Start button is shown as a hero card in home view */
      #v59m-start-hero {
        margin: 18px 0 4px;
        padding: 20px;
        border-radius: 20px;
        background: var(--primary, #3b82f6);
        display: grid;
        gap: 10px;
      }
      #v59m-start-hero .v59m-hero-kicker {
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.75);
      }
      #v59m-start-hero .v59m-hero-title {
        font-size: 22px;
        font-weight: 900;
        color: #fff;
        line-height: 1.2;
        margin: 0;
      }
      #v59m-start-hero .v59m-hero-sub {
        font-size: 13px;
        color: rgba(255,255,255,0.8);
        margin: 0;
      }
      #v59m-start-hero-btn {
        min-height: 52px;
        width: 100%;
        border-radius: 14px;
        border: none;
        background: #fff;
        color: var(--primary, #3b82f6);
        font-size: 17px;
        font-weight: 900;
        cursor: pointer;
        margin-top: 4px;
      }
      #v59m-start-hero-btn:hover {
        background: rgba(255,255,255,0.92);
      }
      #v59m-choose-topic {
        display: block;
        text-align: center;
        font-size: 13px;
        color: rgba(255,255,255,0.75);
        cursor: pointer;
        background: none;
        border: none;
        width: 100%;
        padding: 4px;
        margin-top: 2px;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      /* Result stat cols: make 3 even when Storage is hidden */
      #result .stats {
        grid-template-columns: repeat(3, 1fr);
      }
    `;
    document.head.appendChild(s);
  }

  // ── 2. Child-friendly result stat labels ─────────────────────────────────

  function patchResultStats() {
    // Stat boxes: First try | Mastered | Hints | 2nd-try success | Storage
    // Targets are the <small> labels beneath each <strong> value
    const statMap = {
      'res-mastery': 'Got it! ✓',
      'res-hints':   'Hints used',
      'res-second':  null,       // hide entirely — "2nd-try success" is adult language
      'res-sync':    null,       // hide entirely — "Storage: Cloud ✓" is internal
    };

    for (const [id, label] of Object.entries(statMap)) {
      const el = byId(id);
      if (!el) continue;
      const box = el.closest('.stat');
      if (!box) continue;
      if (label === null) {
        box.classList.add('v59m-hide-storage');
        continue;
      }
      const small = box.querySelector('small');
      if (small && small.dataset.v59mPatched !== 'true') {
        small.textContent = label;
        small.dataset.v59mPatched = 'true';
      }
    }

    // "First try" heading → "Got it first time ✓"
    const firstTry = byId('first-score');
    if (firstTry && !firstTry.dataset.v59mWatched) {
      firstTry.dataset.v59mWatched = 'true';
    }

    // Patch the .stat <small> that says "First try"
    const stats = document.querySelectorAll('#result .stat small');
    stats.forEach(small => {
      if (small.textContent.trim() === 'First try' && !small.dataset.v59mPatched) {
        small.textContent = 'Got it first time ✓';
        small.dataset.v59mPatched = 'true';
      }
      if (small.textContent.trim() === 'Mastered' && !small.dataset.v59mPatched) {
        small.textContent = 'Got it! ✓';
        small.dataset.v59mPatched = 'true';
      }
      if (small.textContent.trim() === '2nd-try success' && !small.dataset.v59mPatched) {
        small.closest('.stat')?.classList.add('v59m-hide-storage');
        small.dataset.v59mPatched = 'true';
      }
      if (['Storage', 'Cloud ✓', 'Local'].some(t => small.textContent.trim().startsWith(t)) && !small.dataset.v59mPatched) {
        small.closest('.stat')?.classList.add('v59m-hide-storage');
        small.dataset.v59mPatched = 'true';
      }
    });
  }

  // ── 3. Result code explanation ────────────────────────────────────────────

  function patchResultCode() {
    const box = document.querySelector('.result-code-box');
    if (!box || box.dataset.v59mExplained === 'true') return;
    box.dataset.v59mExplained = 'true';

    // Add a plain-English caption above the code
    const note = document.createElement('p');
    note.style.cssText = 'font-size:12px;color:var(--muted,#64748b);margin:0 0 6px;font-weight:600;';
    note.textContent = '💾 Save this code — it lets you and your teacher check your answers later.';
    box.insertAdjacentElement('beforebegin', note);
  }

  // ── 4. Sign-in: relabel "Student ID" and hide version badge ──────────────

  function patchSignIn() {
    // Relabel "Student ID" → "My class number"
    const labels = document.querySelectorAll('#start label');
    labels.forEach(lbl => {
      const text = lbl.childNodes[0];
      if (text && text.nodeType === Node.TEXT_NODE && text.textContent.trim() === 'Student ID') {
        if (!lbl.dataset.v59mPatched) {
          text.textContent = 'My class number';
          lbl.dataset.v59mPatched = 'true';
        }
      }
    });

    // Update placeholder to match
    const input = byId('student-id');
    if (input && input.placeholder === 'e.g. 6A-012' && !input.dataset.v59mPatched) {
      input.placeholder = 'e.g. 6A-012';
      // keep same format — teacher configured this — just leave as-is
      input.dataset.v59mPatched = 'true';
    }
  }

  // ── 5. Collapse Learn setup — show hero Start button ─────────────────────

  function buildStartHero() {
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    if (!dashboard || byId('v59m-start-hero')) return;

    const hero = document.createElement('div');
    hero.id = 'v59m-start-hero';
    hero.innerHTML = `
      <div class="v59m-hero-kicker">✏️ Today's practice</div>
      <p class="v59m-hero-title">Ready to practise?</p>
      <p class="v59m-hero-sub">Your questions are picked just for you. Takes about 5 minutes.</p>
      <button type="button" id="v59m-start-hero-btn">▶ Start Practice</button>
      <button type="button" id="v59m-choose-topic">Choose your own topic ▼</button>
    `;

    // Insert at top of dashboard, above the continue card
    dashboard.insertAdjacentElement('afterbegin', hero);

    // Hero button → trigger the existing start flow
    byId('v59m-start-hero-btn')?.addEventListener('click', () => {
      // Use the recommendation if available; otherwise open the Learn panel
      const recBtn = document.querySelector('.v57c-recommend:not([disabled])');
      const startBtn = byId('start-btn');
      if (recBtn && !recBtn.disabled) {
        recBtn.click();
      } else if (startBtn) {
        startBtn.click();
      }
    });

    // "Choose your own topic" → open the Learn panel
    byId('v59m-choose-topic')?.addEventListener('click', () => {
      const openLearn = document.querySelector('.v40c-open-learn, [data-v40-nav="learn"]');
      if (openLearn) openLearn.click();
    });
  }

  // ── Observer: patch result screen when it becomes active ─────────────────

  function watchResultScreen() {
    const result = byId('result');
    if (!result) return;

    const observer = new MutationObserver(() => {
      if (result.classList.contains('active')) {
        patchResultStats();
        patchResultCode();
      }
    });
    observer.observe(result, { attributes: true, attributeFilter: ['class'] });

    // Also patch immediately if already active
    if (result.classList.contains('active')) {
      patchResultStats();
      patchResultCode();
    }
  }

  // Also re-patch each time finishPractice fires (result screen re-renders)
  function hookFinishPractice() {
    const orig = ROOT.finishPractice;
    if (typeof orig !== 'function' || orig.__v59mHooked) return;
    ROOT.finishPractice = async function(...args) {
      const r = await orig.apply(this, args);
      setTimeout(() => { patchResultStats(); patchResultCode(); }, 200);
      return r;
    };
    ROOT.finishPractice.__v59mHooked = true;
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    injectStyles();
    patchSignIn();
    watchResultScreen();

    // Home hero — inject after auth updates the dashboard
    window.addEventListener('v57c:home-updated', () => buildStartHero());
    window.addEventListener('v571a:gamification-updated', () => buildStartHero());
    buildStartHero();

    // Hook finishPractice when available
    if (typeof ROOT.finishPractice === 'function') {
      hookFinishPractice();
    } else {
      // Wait for it to be defined
      const checkHook = setInterval(() => {
        if (typeof ROOT.finishPractice === 'function') {
          hookFinishPractice();
          clearInterval(checkHook);
        }
      }, 500);
      setTimeout(() => clearInterval(checkHook), 15000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
