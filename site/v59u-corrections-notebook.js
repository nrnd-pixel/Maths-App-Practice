/* V5.9U — Buku Pembetulan (Corrections Notebook).
   Shows students a list of questions they answered incorrectly in their
   most recent practice session, lets them re-attempt each one, and marks
   it resolved when they get it right.
   
   Data source: reads the `gradedAnswers` array from the completed practice
   state exposed by finishPractice. Falls back to inspecting the result
   screen review items if the state is unavailable.
   
   No Supabase writes, no grading authority changes. The re-attempt is
   purely presentational — it shows ✓/✗ feedback and resolves the item
   locally in the session. Encourages self-correction.
   No data persistence beyond the current page session. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59uCorrectionsInstalled) return;
  ROOT.__v59uCorrectionsInstalled = true;

  const STYLE_ID   = 'v59u-corrections-style';
  const OVERLAY_ID = 'v59u-corrections-overlay';
  const BTN_CLASS  = 'v59u-corrections-btn';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let corrections = []; // { id, questionText, correctAnswer, studentAnswer, explanation, resolved }

  /* ── Collect mistakes from the result screen ────────────────────────────── */
  function collectMistakes() {
    corrections = [];

    // Primary: try the global practice state (set by finishPractice)
    let items = [];
    try {
      const state = ROOT.__latestPracticeResult || ROOT.latestPracticeResult;
      if (state?.details) {
        items = state.details.filter(d => !d.correct);
      }
    } catch {}

    // Fallback: scrape the result screen review cards already in the DOM
    if (!items.length) {
      document.querySelectorAll('#result .reviewitem').forEach(card => {
        const statusEl = card.querySelector('.feedback');
        const isWrong = statusEl?.classList.contains('incorrect') || statusEl?.textContent?.includes('✗');
        if (!isWrong) return;
        const questionEl = card.querySelector('h3,h4,strong,p');
        const correctEl  = card.querySelector('[data-correct],em');
        const explEl     = card.querySelector('.hint,[data-explanation]');
        items.push({
          questionId: `scraped-${corrections.length}`,
          question:   questionEl?.textContent?.trim() || 'Question',
          correctAnswer: correctEl?.textContent?.trim() || '',
          finalAnswer:   '',
          explanation:   explEl?.textContent?.trim() || '',
        });
      });
    }

    corrections = items.map((d, i) => ({
      id: String(d.questionId || i),
      questionText: esc(d.question || d.questionText || 'Question ' + (i+1)),
      correctAnswer: String(d.correctAnswer || d.answer || ''),
      studentAnswer: String(d.finalAnswer || d.studentAnswer || ''),
      explanation: esc(d.explanation || ''),
      resolved: false,
      retryFeedback: 'idle', // idle | correct | wrong
      retryInput: '',
    }));
  }

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 9955;
        background: rgba(15,23,42,.7); backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      #${OVERLAY_ID} .v59u-card {
        background: var(--card,#fff); border: 1px solid var(--border,#e2e8f0);
        border-radius: 22px; padding: 22px 20px; width: min(540px,100%);
        max-height: 90vh; overflow-y: auto;
        box-shadow: 0 24px 70px rgba(0,0,0,.22);
        display: flex; flex-direction: column; gap: 14px;
      }
      #${OVERLAY_ID} .v59u-header {
        display: flex; justify-content: space-between; align-items: center;
        position: sticky; top: -22px; background: var(--card,#fff); padding: 4px 0; z-index: 1;
      }
      #${OVERLAY_ID} .v59u-title { font-size: 16px; font-weight: 900; margin: 0; }
      #${OVERLAY_ID} .v59u-close {
        background: var(--soft,#eaf2ff); border: none; border-radius: 9px;
        width: 32px; height: 32px; cursor: pointer; font-size: 15px; flex-shrink: 0;
      }
      #${OVERLAY_ID} .v59u-progress {
        font-size: 12px; color: var(--muted,#667085); font-weight: 700;
      }
      #${OVERLAY_ID} .v59u-item {
        border: 1.5px solid var(--border,#e2e8f0); border-radius: 14px; padding: 14px;
        display: flex; flex-direction: column; gap: 10px;
      }
      #${OVERLAY_ID} .v59u-item.resolved {
        border-color: #86d3a3; background: #f0fdf4; opacity: .8;
      }
      #${OVERLAY_ID} .v59u-q {
        font-size: 15px; font-weight: 760; line-height: 1.5; color: var(--text,#172033);
      }
      #${OVERLAY_ID} .v59u-wrong-ans {
        font-size: 12px; color: var(--danger,#b42318);
        background: var(--dangerbg,#fff1f0); border-radius: 8px; padding: 6px 10px;
      }
      #${OVERLAY_ID} .v59u-retry-row {
        display: flex; gap: 8px; align-items: center;
      }
      #${OVERLAY_ID} .v59u-retry-input {
        flex: 1; min-height: 40px; padding: 8px 12px;
        border: 1.5px solid var(--border,#e2e8f0); border-radius: 10px;
        font-size: 15px; font-weight: 700; background: #fff; color: var(--text,#172033);
      }
      #${OVERLAY_ID} .v59u-retry-btn {
        padding: 8px 16px; border-radius: 10px; background: var(--primary,#2563eb);
        color: #fff; border: none; font-size: 13px; font-weight: 800; cursor: pointer;
      }
      #${OVERLAY_ID} .v59u-feedback-correct {
        background: var(--successbg,#ecfdf3); color: var(--success,#16713d);
        border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 800;
      }
      #${OVERLAY_ID} .v59u-feedback-wrong {
        background: var(--dangerbg,#fff1f0); color: var(--danger,#b42318);
        border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 800;
      }
      #${OVERLAY_ID} .v59u-explanation {
        font-size: 12.5px; color: var(--muted,#667085); line-height: 1.55;
        border-left: 3px solid var(--primary,#2563eb);
        padding: 6px 10px; background: var(--soft,#eaf2ff); border-radius: 0 8px 8px 0;
      }
      #${OVERLAY_ID} .v59u-resolved-tag {
        font-size: 12px; font-weight: 800; color: #16713d; display: flex; align-items: center; gap: 5px;
      }
      #${OVERLAY_ID} .v59u-empty {
        text-align: center; padding: 24px; color: var(--muted,#667085); font-size: 14px;
      }
      .${BTN_CLASS} {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 800;
        background: color-mix(in srgb, #f43f5e 12%, var(--card,#fff));
        border: 1.5px solid color-mix(in srgb, #f43f5e 30%, var(--border,#e2e8f0));
        color: #9f1239; cursor: pointer; white-space: nowrap;
      }
      html[data-theme="dark"] .${BTN_CLASS} { color: #fda4af; }
      .${BTN_CLASS}:hover { background: color-mix(in srgb, #f43f5e 18%, var(--card,#fff)); }
    `;
    document.head.appendChild(s);
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function normalize(s) {
    return String(s ?? '').trim().toLowerCase()
      .replace(/,/g,'').replace(/°/g,'').replace(/\s+/g,' ');
  }

  function renderOverlay() {
    const overlay = byId(OVERLAY_ID);
    if (!overlay) return;

    const pending   = corrections.filter(c => !c.resolved);
    const resolved  = corrections.filter(c =>  c.resolved);
    const total     = corrections.length;
    const doneCount = resolved.length;

    let itemsHtml = '';
    if (corrections.length === 0) {
      itemsHtml = `<div class="v59u-empty">
        🎉 No mistakes to review from your last practice session.<br>
        <span style="font-size:12px">Complete a practice set first, then open this notebook to review any wrong answers.</span>
      </div>`;
    } else {
      [...pending, ...resolved].forEach(item => {
        const show = item.retryFeedback !== 'idle';
        const showExpl = item.retryFeedback === 'wrong' && item.explanation;
        itemsHtml += `
          <div class="v59u-item ${item.resolved ? 'resolved' : ''}">
            <p class="v59u-q">${item.questionText}</p>
            ${item.studentAnswer ? `<p class="v59u-wrong-ans">❌ Your answer: ${esc(item.studentAnswer)}</p>` : ''}
            ${item.resolved
              ? `<p class="v59u-resolved-tag">✅ Correct! Well done.</p>`
              : `<div class="v59u-retry-row">
                   <input class="v59u-retry-input" type="text"
                     id="v59u-input-${item.id}"
                     placeholder="Your answer…"
                     value="${esc(item.retryInput)}"
                     onkeydown="if(event.key==='Enter')window.__v59uCheck('${item.id}')"
                   />
                   <button class="v59u-retry-btn" onclick="window.__v59uCheck('${item.id}')">Check</button>
                 </div>
                 ${item.retryFeedback === 'correct'
                   ? `<p class="v59u-feedback-correct">✅ Correct! Great work — mistake resolved.</p>`
                   : ''}
                 ${item.retryFeedback === 'wrong'
                   ? `<p class="v59u-feedback-wrong">✗ Not quite — correct answer: <strong>${esc(item.correctAnswer)}</strong></p>` : ''}
                 ${showExpl ? `<p class="v59u-explanation">💡 ${item.explanation}</p>` : ''}`
            }
          </div>`;
      });
    }

    overlay.querySelector('.v59u-card').innerHTML = `
      <div class="v59u-header">
        <p class="v59u-title">📓 Buku Pembetulan</p>
        <button class="v59u-close" onclick="window.__v59uClose()">✕</button>
      </div>
      ${total > 0
        ? `<p class="v59u-progress">Resolved ${doneCount} of ${total} mistake${total!==1?'s':''}
            ${doneCount === total && total > 0 ? '🎉 All done!' : ''}</p>`
        : ''}
      ${itemsHtml}`;
  }

  ROOT.__v59uCheck = id => {
    const item = corrections.find(c => c.id === id);
    if (!item) return;
    const input = byId(`v59u-input-${id}`);
    const val = input?.value ?? '';
    item.retryInput = val;
    const isCorrect = normalize(val) === normalize(item.correctAnswer) || (() => {
      // Also accept close numeric match (within 0.01%)
      const num = parseFloat(val.replace(/,/g,''));
      const ans = parseFloat(item.correctAnswer.replace(/,/g,''));
      return !isNaN(num) && !isNaN(ans) && Math.abs(num - ans) < 0.001;
    })();
    if (isCorrect) {
      item.resolved = true;
      item.retryFeedback = 'correct';
    } else {
      item.retryFeedback = 'wrong';
    }
    renderOverlay();
    // Refocus on the same input if still showing it
    setTimeout(() => byId(`v59u-input-${id}`)?.focus(), 50);
  };

  ROOT.__v59uClose = () => byId(OVERLAY_ID)?.remove();

  ROOT.__v59uOpen = () => {
    if (byId(OVERLAY_ID)) return;
    injectStyles();
    collectMistakes();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = '<div class="v59u-card"></div>';
    overlay.addEventListener('click', e => { if (e.target === overlay) ROOT.__v59uClose(); });
    document.body.appendChild(overlay);
    renderOverlay();
  };

  /* ── Hook into finishPractice to capture wrong answers automatically ────── */
  function hookFinishPractice() {
    if (typeof finishPractice === 'undefined') return false;
    const original = finishPractice;
    // Don't re-wrap if already wrapped by another script
    if (finishPractice.__v59uHooked) return true;
    try {
      const wrapped = function(...args) {
        const result = original.apply(this, args);
        try {
          // After practice ends, extract wrong answers from the result
          if (result?.details) ROOT.__latestPracticeResult = result;
        } catch {}
        return result;
      };
      wrapped.__v59uHooked = true;
      // Only if not frozen (safety check)
      if (!Object.isFrozen(window)) {
        finishPractice = wrapped;
      }
    } catch {}
    return true;
  }

  function insertButton(parentSelector, beforeSelector) {
    if (typeof document === 'undefined') return;
    const parent = document.querySelector(parentSelector);
    if (!parent || parent.querySelector('.'+BTN_CLASS)) return;
    injectStyles();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.innerHTML = '📓 Corrections';
    btn.onclick = () => ROOT.__v59uOpen();
    const ref = beforeSelector ? parent.querySelector(beforeSelector) : null;
    ref ? parent.insertBefore(btn, ref) : parent.appendChild(btn);
  }

  function init() {
    if (typeof document === 'undefined') return;
    const tryInsert = () => {
      hookFinishPractice();
      // Show on result screen
      insertButton('#result .buttons', null);
      // Show on student home
      insertButton('#start .v40c3-home-dashboard', null);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryInsert, { once: true });
    } else {
      tryInsert();
    }
    if (typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(tryInsert);
      const result = document.getElementById('result');
      if (result) obs.observe(result, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
      const start = document.getElementById('start');
      if (start) obs.observe(start, { childList:true, subtree:false, attributes:true, attributeFilter:['class'] });
    }
  }

  init();
})();
