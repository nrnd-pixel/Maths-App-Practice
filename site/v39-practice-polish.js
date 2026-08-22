/* V3.9B — Practice & AI Learning Help experience polish.
   Presentation-only enhancement: preserves existing Practice, grading, hint,
   AI Help and Supabase behaviour. */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);

  function injectStyles() {
    if (byId('v39-practice-polish-style')) return;
    const style = document.createElement('style');
    style.id = 'v39-practice-polish-style';
    style.textContent = `
      #quiz.v39-practice-polished .quizbar{
        border-bottom:1px solid var(--border);
        padding-bottom:14px;
        margin-bottom:14px;
      }

      #quiz.v39-practice-polished .progress{
        margin-top:14px;
      }

      .v39-practice-step{
        display:flex;
        align-items:center;
        gap:8px;
        margin:18px 0 8px;
        color:var(--muted);
        font-size:12px;
        font-weight:850;
        letter-spacing:.04em;
        text-transform:uppercase;
      }

      .v39-practice-step::before{
        content:'';
        width:8px;
        height:8px;
        border-radius:999px;
        background:var(--primary);
        flex:0 0 auto;
      }

      #quiz.v39-practice-polished .question-meta{
        margin-top:4px;
      }

      #quiz.v39-practice-polished #q-text{
        line-height:1.45;
        margin-bottom:12px;
      }

      #quiz.v39-practice-polished .answerbox{
        padding:20px;
        margin-top:12px;
        border-width:1px;
      }

      #quiz.v39-practice-polished .answerbox > label{
        font-size:16px;
        margin-bottom:2px;
      }

      #quiz.v39-practice-polished .answer-action{
        margin-top:14px;
      }

      #quiz.v39-practice-polished #check-btn{
        min-width:170px;
      }

      #quiz.v39-practice-polished #attempt-text{
        display:inline-flex;
        align-items:center;
        margin-top:11px;
        padding:5px 9px;
        border-radius:999px;
        background:var(--surface-muted, #f8fafc);
      }

      #quiz.v39-practice-polished #hint-btn{
        margin-top:2px;
      }

      #quiz.v39-practice-polished #feedback:not(.hidden){
        margin-top:14px;
        padding:16px;
        font-size:15px;
      }

      #quiz.v39-practice-polished .ai-help-v38{
        margin-top:14px;
        border-radius:18px;
        background:var(--surface-soft, var(--card));
      }

      #quiz.v39-practice-polished .ai-help-head-v38 h3{
        font-size:18px;
      }

      .v39-ai-guide{
        margin-top:6px;
        color:var(--muted);
        font-size:13px;
        line-height:1.45;
      }

      #quiz.v39-practice-polished .ai-help-actions-v38 button{
        min-height:48px;
        line-height:1.25;
      }

      #quiz.v39-practice-polished .ai-help-response-v38{
        padding:16px;
      }

      #quiz.v39-practice-polished .buttons.v39-practice-footer{
        border-top:1px solid var(--border);
        padding-top:16px;
        margin-top:20px;
      }

      #quiz.v39-practice-polished #next-btn:not(.hidden){
        min-width:170px;
      }

      @media(max-width:700px){
        #quiz.v39-practice-polished .answerbox{
          padding:16px;
        }
        #quiz.v39-practice-polished #check-btn,
        #quiz.v39-practice-polished #next-btn:not(.hidden){
          width:100%;
        }
        #quiz.v39-practice-polished .buttons.v39-practice-footer{
          display:grid;
          grid-template-columns:1fr;
        }
        #quiz.v39-practice-polished .buttons.v39-practice-footer #next-btn{
          order:-1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureStepLabel(anchor, key, text) {
    if (!anchor || document.querySelector(`[data-v39-step="${key}"]`)) return;
    const label = document.createElement('div');
    label.className = 'v39-practice-step';
    label.dataset.v39Step = key;
    label.textContent = text;
    anchor.insertAdjacentElement('beforebegin', label);
  }

  function moveAiAfterFeedback() {
    const panel = byId('ai-help-v38');
    const feedback = byId('feedback');
    if (!panel || !feedback) return false;
    if (feedback.nextElementSibling !== panel) {
      feedback.insertAdjacentElement('afterend', panel);
    }
    return true;
  }

  function enhanceAiCopy() {
    const panel = byId('ai-help-v38');
    if (!panel) return false;
    const head = panel.querySelector('.ai-help-head-v38 > div');
    if (!head) return false;

    const original = head.querySelector('.muted');
    const intro = 'Choose the smallest amount of help you need.';
    if (original && original.textContent !== intro) original.textContent = intro;

    let guide = head.querySelector('.v39-ai-guide');
    if (!guide) {
      guide = document.createElement('div');
      guide.className = 'v39-ai-guide';
      guide.textContent = 'Try the question yourself first. If you get stuck, start with a small nudge.';
      head.appendChild(guide);
    }
    return true;
  }

  function setGuideText(text) {
    const guide = byId('ai-help-v38')?.querySelector('.v39-ai-guide');
    if (guide && guide.textContent !== text) guide.textContent = text;
  }

  function updateAiStageMessage() {
    const panel = byId('ai-help-v38');
    if (!panel || panel.classList.contains('hidden')) return;

    const mistake = panel.querySelector('[data-ai-help-level="explain_mistake"]');
    const method = panel.querySelector('[data-ai-help-level="explain_method"]');

    if (method && !method.disabled) {
      setGuideText('Question complete. You can now review the method step by step.');
    } else if (mistake && !mistake.disabled) {
      setGuideText('You have made an attempt. You can ask for a nudge, one guided step, or an explanation of the mistake.');
    } else {
      setGuideText('Try the question yourself first. If you get stuck, start with a small nudge.');
    }
  }

  function applyStaticPracticePolish() {
    const quiz = byId('quiz');
    if (!quiz) return;
    quiz.classList.add('v39-practice-polished');

    const questionMeta = quiz.querySelector('.question-meta');
    const answerBox = quiz.querySelector('.answerbox');
    const hintButton = byId('hint-btn');
    const footer = byId('next-btn')?.closest('.buttons');

    ensureStepLabel(questionMeta, 'solve', '1 · Read and solve');
    ensureStepLabel(answerBox, 'answer', '2 · Enter your answer');
    ensureStepLabel(hintButton, 'learn', '3 · Check and learn');

    if (footer) footer.classList.add('v39-practice-footer');
  }

  function bindAiPanel(panel) {
    if (!panel || panel.dataset.v39PracticeObserver === 'true') return;
    panel.dataset.v39PracticeObserver = 'true';

    const observer = new MutationObserver(() => {
      updateAiStageMessage();
    });

    observer.observe(panel, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'disabled']
    });

    updateAiStageMessage();
  }

  function initializeAiPolish(attempt = 0) {
    const panel = byId('ai-help-v38');
    if (panel) {
      moveAiAfterFeedback();
      enhanceAiCopy();
      bindAiPanel(panel);
      updateAiStageMessage();
      return;
    }

    if (attempt < 30) {
      window.setTimeout(() => initializeAiPolish(attempt + 1), 100);
    }
  }

  function startPracticePolish() {
    applyStaticPracticePolish();
    initializeAiPolish();
  }

  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPracticePolish, { once: true });
  } else {
    startPracticePolish();
  }
})();
