/* V5.9P — Kilat Math Sprint.
   A 60-second timed mental-maths speed drill accessible from the student home.
   Generates random Year 4–6 mental arithmetic questions (times tables, division,
   fractions of amounts, metric conversion, angles on a line, quick addition).
   Multiple-choice format: 4 options, one correct. Combo multiplier rewards
   consecutive correct answers. High score persisted in localStorage.
   No grading authority, no Supabase writes, no network calls.
   Presentation only — adds a Launch Sprint button to the student home toolbar. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59pKilatSprintInstalled) return;
  ROOT.__v59pKilatSprintInstalled = true;

  const STYLE_ID   = 'v59p-kilat-style';
  const OVERLAY_ID = 'v59p-kilat-overlay';
  const BTN_ID     = 'v59p-kilat-launch';
  const HS_KEY     = 'brunei_kilat_highscore_v59p';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* ── Question generator ────────────────────────────────────────────────── */
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function generateQuestion() {
    const type = ['multiply','divide','fraction','metric','angles','add'][rnd(0,5)];
    let prompt = '', category = '', answer = 0;

    if (type === 'multiply') {
      const a = rnd(2,12), b = rnd(2,12);
      prompt = `${a} × ${b} = ?`; category = 'Times Tables'; answer = a * b;
    } else if (type === 'divide') {
      const b = rnd(2,11), a = b * rnd(2,12);
      prompt = `${a} ÷ ${b} = ?`; category = 'Division'; answer = a / b;
    } else if (type === 'fraction') {
      const pairs = [
        ['½ of 60',30],['¼ of 80',20],['¾ of 40',30],['⅓ of 90',30],
        ['½ of 48',24],['¼ of 100',25],['⅔ of 60',40],['¾ of 80',60],
        ['⅓ of 120',40],['½ of 74',37],['¼ of 64',16],['⅘ of 50',40],
      ];
      const [lbl, ans] = pairs[rnd(0, pairs.length-1)];
      prompt = `${lbl} = ?`; category = 'Fractions'; answer = ans;
    } else if (type === 'metric') {
      const opts = [
        ['3 km = ___ m',3000],['1500 m = ___ km',1.5],['2.5 kg = ___ g',2500],
        ['750 g = ___ kg',0.75],['4 L = ___ mL',4000],['2500 mL = ___ L',2.5],
        ['180 min = ___ h',3],['2¼ h = ___ min',135],['3 km = ___ m',3000],
        ['1 h 45 min = ___ min',105],
      ];
      const [lbl, ans] = opts[rnd(0, opts.length-1)];
      prompt = lbl; category = 'Unit Conversion'; answer = ans;
    } else if (type === 'angles') {
      const known = rnd(30,150);
      const ans = 180 - known;
      prompt = `Angles on a straight line: ${known}° + x = 180°. x = ?`;
      category = 'Angles'; answer = ans;
    } else {
      const a = rnd(100,999), b = rnd(100,999);
      prompt = `${a} + ${b} = ?`; category = 'Addition'; answer = a + b;
    }

    // Generate 3 wrong options that look plausible
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const noise = [rnd(1,5), rnd(1,3)*10, rnd(1,2)*100][rnd(0,2)];
      const sign = Math.random() < 0.5 ? 1 : -1;
      const w = Math.round((answer + sign * noise) * 100) / 100;
      if (w !== answer && w > 0 && !wrongs.has(w)) wrongs.add(w);
    }
    const options = [answer, ...[...wrongs]].sort(() => Math.random() - 0.5);
    return { prompt, category, answer, options };
  }

  /* ── Styles ────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 9980;
        background: rgba(15,23,42,.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      #${OVERLAY_ID} .v59p-card {
        background: var(--card,#fff); border: 1px solid var(--border,#e2e8f0);
        border-radius: 24px; padding: 28px 24px; width: min(440px,100%);
        box-shadow: 0 28px 80px rgba(0,0,0,.22);
        display: flex; flex-direction: column; gap: 18px;
      }
      #${OVERLAY_ID} .v59p-header {
        display: flex; justify-content: space-between; align-items: flex-start;
      }
      #${OVERLAY_ID} .v59p-title {
        font-size: 20px; font-weight: 900; color: var(--text,#172033); margin: 0;
      }
      #${OVERLAY_ID} .v59p-subtitle {
        font-size: 12px; color: var(--muted,#667085); margin: 2px 0 0;
      }
      #${OVERLAY_ID} .v59p-close {
        background: var(--soft,#eaf2ff); border: none; border-radius: 10px;
        width: 34px; height: 34px; font-size: 17px; cursor: pointer;
        display: grid; place-items: center; flex-shrink: 0;
      }
      #${OVERLAY_ID} .v59p-timer-bar {
        height: 10px; background: #e7ebf0; border-radius: 99px; overflow: hidden;
      }
      #${OVERLAY_ID} .v59p-timer-fill {
        height: 100%; background: var(--primary,#2563eb);
        border-radius: 99px; transition: width .9s linear, background .4s;
      }
      #${OVERLAY_ID} .v59p-timer-fill.low { background: #ef4444; }
      #${OVERLAY_ID} .v59p-stats {
        display: flex; gap: 10px;
      }
      #${OVERLAY_ID} .v59p-stat {
        flex: 1; border: 1px solid var(--border,#e2e8f0);
        border-radius: 14px; padding: 10px; text-align: center;
        background: var(--soft,#eaf2ff);
      }
      #${OVERLAY_ID} .v59p-stat strong {
        display: block; font-size: 22px; font-weight: 900;
        color: var(--primary,#2563eb);
      }
      #${OVERLAY_ID} .v59p-stat small { font-size: 11px; color: var(--muted,#667085); }
      #${OVERLAY_ID} .v59p-category {
        font-size: 11px; font-weight: 800; color: var(--primary,#2563eb);
        text-transform: uppercase; letter-spacing: .06em;
      }
      #${OVERLAY_ID} .v59p-question {
        font-size: clamp(22px,5vw,30px); font-weight: 900;
        color: var(--text,#172033); line-height: 1.3; min-height: 44px;
      }
      #${OVERLAY_ID} .v59p-options {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      }
      #${OVERLAY_ID} .v59p-opt {
        padding: 14px; border: 2px solid var(--border,#e2e8f0);
        border-radius: 14px; background: #fff; font-size: 18px; font-weight: 800;
        cursor: pointer; text-align: center; transition: border-color .12s, background .12s;
      }
      #${OVERLAY_ID} .v59p-opt:hover { border-color: var(--primary,#2563eb); background: var(--soft,#eaf2ff); }
      #${OVERLAY_ID} .v59p-opt.correct { border-color: #16a34a; background: #dcfce7; color: #166534; }
      #${OVERLAY_ID} .v59p-opt.wrong   { border-color: #dc2626; background: #fee2e2; color: #991b1b; }
      #${OVERLAY_ID} .v59p-opt:disabled { cursor: default; }
      #${OVERLAY_ID} .v59p-combo {
        font-size: 13px; font-weight: 800; color: #f59e0b;
        text-align: center; min-height: 20px;
      }
      #${OVERLAY_ID} .v59p-intro, #${OVERLAY_ID} .v59p-result {
        text-align: center; display: flex; flex-direction: column;
        align-items: center; gap: 14px;
      }
      #${OVERLAY_ID} .v59p-big-emoji { font-size: 64px; line-height: 1; }
      #${OVERLAY_ID} .v59p-result-score {
        font-size: 42px; font-weight: 900; color: var(--primary,#2563eb);
      }
      #${OVERLAY_ID} .v59p-hs {
        font-size: 13px; color: var(--muted,#667085);
      }
      #${BTN_ID} {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 9px 16px; border-radius: 12px; font-size: 14px; font-weight: 800;
        background: color-mix(in srgb, #f59e0b 18%, var(--card,#fff));
        border: 1.5px solid color-mix(in srgb, #f59e0b 40%, var(--border,#e2e8f0));
        color: #92400e; cursor: pointer; white-space: nowrap;
      }
      html[data-theme="dark"] #${BTN_ID} { color: #fcd34d; }
      #${BTN_ID}:hover { background: color-mix(in srgb, #f59e0b 28%, var(--card,#fff)); }
    `;
    document.head.appendChild(s);
  }

  /* ── Game state ────────────────────────────────────────────────────────── */
  let timerInterval = null;
  let gameState = 'idle'; // idle | playing | over
  let timeLeft = 60;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let correctCount = 0;
  let currentQ = null;

  function loadHighScore() {
    try { return Number(localStorage.getItem(HS_KEY) || 0); } catch { return 0; }
  }
  function saveHighScore(s) {
    try { localStorage.setItem(HS_KEY, String(s)); } catch {}
  }

  /* ── Render helpers ────────────────────────────────────────────────────── */
  function renderIntro() {
    const hs = loadHighScore();
    return `
      <div class="v59p-intro">
        <div class="v59p-big-emoji">⚡</div>
        <div>
          <p class="v59p-title" style="font-size:22px">Kilat Math Sprint</p>
          <p class="v59p-subtitle">60 seconds · Mental maths · Year 4–6</p>
        </div>
        ${hs > 0 ? `<p class="v59p-hs">🏆 Your best: <strong>${hs} pts</strong></p>` : ''}
        <p style="font-size:13px;color:var(--muted);text-align:center;max-width:280px">
          Answer as many questions as you can. Each correct answer scores points.
          Build a combo for a bonus multiplier!
        </p>
        <button class="primary" style="min-width:160px;font-size:15px" onclick="window.__v59pStart()">Start Sprint ⚡</button>
      </div>`;
  }

  function renderResult() {
    const hs = loadHighScore();
    const emoji = score >= 80 ? '🌟' : score >= 50 ? '😊' : score >= 20 ? '💪' : '🔄';
    const msg   = score >= 80 ? 'Outstanding!' : score >= 50 ? 'Great work!' : score >= 20 ? 'Keep practising!' : 'Try again!';
    const newBest = score > hs;
    if (newBest) saveHighScore(score);
    return `
      <div class="v59p-result">
        <div class="v59p-big-emoji">${emoji}</div>
        <div class="v59p-result-score">${score} pts</div>
        <p style="font-weight:800;font-size:16px;margin:0">${msg}</p>
        ${newBest ? '<p style="color:#f59e0b;font-weight:900;margin:0">🏆 New personal best!</p>' : `<p class="v59p-hs">Best: ${hs} pts</p>`}
        <div class="v59p-stats" style="width:100%">
          <div class="v59p-stat"><strong>${correctCount}</strong><small>Correct</small></div>
          <div class="v59p-stat"><strong>${maxCombo}×</strong><small>Best combo</small></div>
        </div>
        <button class="primary" style="min-width:160px" onclick="window.__v59pStart()">Play Again</button>
      </div>`;
  }

  function renderPlaying() {
    const pct = (timeLeft / 60) * 100;
    const low  = timeLeft <= 10;
    const mult = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
    return `
      <div class="v59p-timer-bar">
        <div class="v59p-timer-fill ${low?'low':''}" id="v59p-timer-fill" style="width:${pct}%"></div>
      </div>
      <div class="v59p-stats">
        <div class="v59p-stat"><strong id="v59p-score">${score}</strong><small>Score</small></div>
        <div class="v59p-stat"><strong id="v59p-time">${timeLeft}s</strong><small>Time left</small></div>
        <div class="v59p-stat"><strong>${mult}×</strong><small>Multiplier</small></div>
      </div>
      <div>
        <p class="v59p-category" id="v59p-cat"></p>
        <p class="v59p-question" id="v59p-q"></p>
      </div>
      <div class="v59p-options" id="v59p-opts"></div>
      <p class="v59p-combo" id="v59p-combo"></p>`;
  }

  function renderOverlay() {
    const overlay = byId(OVERLAY_ID);
    if (!overlay) return;
    let inner = '';
    if (gameState === 'idle') inner = renderIntro();
    else if (gameState === 'playing') inner = renderPlaying();
    else inner = renderResult();
    overlay.querySelector('.v59p-card').innerHTML = `
      <div class="v59p-header">
        <div>
          <p class="v59p-title">⚡ Kilat Math Sprint</p>
          <p class="v59p-subtitle">60-second mental maths challenge</p>
        </div>
        <button class="v59p-close" onclick="window.__v59pClose()" aria-label="Close">✕</button>
      </div>
      ${inner}`;
    if (gameState === 'playing') showQuestion();
  }

  function showQuestion() {
    currentQ = generateQuestion();
    const catEl = byId('v59p-cat');
    const qEl   = byId('v59p-q');
    const opts  = byId('v59p-opts');
    if (catEl) catEl.textContent = currentQ.category;
    if (qEl)   qEl.textContent  = currentQ.prompt;
    if (opts) {
      opts.innerHTML = currentQ.options.map(opt => `
        <button class="v59p-opt" onclick="window.__v59pAnswer(${opt})">${opt}</button>
      `).join('');
    }
    updateComboText();
  }

  function updateComboText() {
    const el = byId('v59p-combo');
    if (!el) return;
    if (combo >= 5) el.textContent = `🔥 ${combo}× Combo! +3× points!`;
    else if (combo >= 3) el.textContent = `🔥 ${combo}× Combo! +2× points!`;
    else if (combo >= 2) el.textContent = `⚡ ${combo}× Combo!`;
    else el.textContent = '';
  }

  /* ── Game logic ────────────────────────────────────────────────────────── */
  ROOT.__v59pStart = function() {
    gameState = 'playing'; timeLeft = 60; score = 0;
    combo = 0; maxCombo = 0; correctCount = 0;
    renderOverlay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      const fill  = byId('v59p-timer-fill');
      const timeEl = byId('v59p-time');
      if (fill) {
        fill.style.width = `${(timeLeft/60)*100}%`;
        fill.classList.toggle('low', timeLeft <= 10);
      }
      if (timeEl) timeEl.textContent = `${timeLeft}s`;
      const scoreEl = byId('v59p-score');
      if (scoreEl) scoreEl.textContent = score;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        gameState = 'over';
        renderOverlay();
      }
    }, 1000);
  };

  ROOT.__v59pAnswer = function(chosen) {
    if (!currentQ || gameState !== 'playing') return;
    const opts = byId('v59p-opts');
    if (!opts) return;
    const isCorrect = Number(chosen) === Number(currentQ.answer);

    // Highlight buttons
    [...opts.querySelectorAll('.v59p-opt')].forEach(btn => {
      btn.disabled = true;
      if (Number(btn.textContent) === Number(currentQ.answer)) btn.classList.add('correct');
      else if (Number(btn.textContent) === Number(chosen) && !isCorrect) btn.classList.add('wrong');
    });

    if (isCorrect) {
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      correctCount++;
      const mult = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
      score += 10 * mult;
    } else {
      combo = 0;
    }
    updateComboText();
    setTimeout(showQuestion, isCorrect ? 400 : 700);
  };

  ROOT.__v59pClose = function() {
    clearInterval(timerInterval);
    gameState = 'idle';
    byId(OVERLAY_ID)?.remove();
  };

  ROOT.__v59pOpen = function() {
    if (byId(OVERLAY_ID)) return;
    injectStyles();
    gameState = 'idle';
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = '<div class="v59p-card"></div>';
    document.body.appendChild(overlay);
    renderOverlay();
  };

  /* ── Launch button on student home ─────────────────────────────────────── */
  function insertLaunchButton() {
    if (typeof document === 'undefined') return;
    if (byId(BTN_ID)) return;

    // Find the student home dashboard toolbar
    const dashboard = document.querySelector('#start .v40c3-home-dashboard');
    const target = dashboard || document.querySelector('#start .v40c-learn-setup') || document.querySelector('#start');
    if (!target) return;

    injectStyles();
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.innerHTML = '⚡ Kilat Sprint';
    btn.onclick = () => ROOT.__v59pOpen();
    // Insert after the first child of target to keep it near the top
    target.insertAdjacentElement('afterbegin', btn);
  }

  function init() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insertLaunchButton, { once: true });
    } else {
      insertLaunchButton();
    }
    // Re-check when the home screen activates
    if (typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(() => insertLaunchButton());
      const start = document.getElementById('start');
      if (start) obs.observe(start, { childList: true, subtree: false, attributes: true, attributeFilter: ['class'] });
    }
  }

  init();
})();
