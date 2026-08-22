/* V3.9D — Student mobile and UI state polish.
   Presentation-only: preserves existing loading, error, navigation and data logic. */
(() => {
  'use strict';

  const STYLE_ID = 'v39-state-polish-style';
  const STUDENT_ROOTS = [
    '#start',
    '#quiz',
    '#result',
    '#student-review',
    '#student-assignments',
    '#student-dashboard',
    '#exam-result'
  ].join(',');

  function byId(id){
    return document.getElementById(id);
  }

  function injectStyles(){
    if (byId(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :is(${STUDENT_ROOTS}) button:focus-visible,
      :is(${STUDENT_ROOTS}) input:focus-visible,
      :is(${STUDENT_ROOTS}) select:focus-visible,
      :is(${STUDENT_ROOTS}) textarea:focus-visible{
        outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);
        outline-offset:2px;
      }

      :is(${STUDENT_ROOTS}) button:disabled{
        cursor:not-allowed;
      }

      #start .v39-loading-state,
      #student-dashboard .v39-loading-state,
      #student-assignments .v39-loading-state,
      #student-review .v39-loading-state{
        position:relative;
        padding-left:42px;
      }

      #start .v39-loading-state::before,
      #student-dashboard .v39-loading-state::before,
      #student-assignments .v39-loading-state::before,
      #student-review .v39-loading-state::before{
        content:'';
        position:absolute;
        left:16px;
        top:50%;
        width:14px;
        height:14px;
        margin-top:-8px;
        border:2px solid color-mix(in srgb,var(--primary) 24%,var(--border));
        border-top-color:var(--primary);
        border-radius:50%;
        animation:v39-state-spin .8s linear infinite;
      }

      @keyframes v39-state-spin{
        to{transform:rotate(360deg)}
      }

      @media (prefers-reduced-motion:reduce){
        #start .v39-loading-state::before,
        #student-dashboard .v39-loading-state::before,
        #student-assignments .v39-loading-state::before,
        #student-review .v39-loading-state::before{
          animation:none;
        }
      }

      #student-dashboard .v39-state-error,
      #student-assignments .v39-state-error,
      #student-review .v39-state-error{
        border-color:color-mix(in srgb,var(--danger) 38%,var(--border));
        background:var(--dangerbg);
        color:var(--danger);
      }

      #student-dashboard .v39-state-empty,
      #student-assignments .v39-state-empty,
      #student-review .v39-state-empty{
        text-align:center;
        max-width:720px;
        margin-left:auto;
        margin-right:auto;
      }

      #student-review .recent-results,
      #student-review .student-review-content{
        margin-top:18px;
      }

      #result .buttons,
      #exam-result .buttons{
        justify-content:center;
      }

      #quiz #feedback:not(.hidden){
        scroll-margin-top:18px;
      }

      @media(max-width:760px){
        #start,
        #quiz,
        #result,
        #student-review,
        #student-assignments,
        #student-dashboard,
        #exam-result{
          overflow-wrap:anywhere;
        }

        #student-dashboard > .header,
        #student-assignments > .header,
        #student-review > .header{
          gap:12px;
        }

        #student-dashboard > .header > button,
        #student-assignments > .header > button,
        #student-review > .header > button{
          min-width:92px;
        }

        #quiz .pills{
          gap:7px;
        }

        #quiz .pill{
          max-width:100%;
          white-space:normal;
        }

        #quiz #q-text{
          font-size:clamp(20px,6vw,27px);
          line-height:1.42;
        }

        #quiz .qimage{
          width:100%;
          max-height:none;
        }

        #quiz .answerbox{
          padding:14px;
          margin:14px 0;
        }

        #quiz .choice-option{
          min-height:48px;
        }

        #student-assignments .student-assignment-meta,
        #student-dashboard .practice-recommendation-meta{
          gap:6px;
        }

        #student-assignments .student-assignment-action,
        #student-dashboard .practice-recommendation-action{
          justify-content:stretch;
        }

        #student-assignments .student-assignment-action button,
        #student-dashboard .practice-recommendation-action button{
          width:100%;
        }
      }

      @media(max-width:520px){
        #start button,
        #quiz button,
        #result button,
        #student-review button,
        #student-assignments button,
        #student-dashboard button,
        #exam-result button{
          min-height:48px;
        }

        #result .buttons,
        #exam-result .buttons,
        #student-review .buttons{
          display:grid;
          grid-template-columns:1fr;
          width:100%;
        }

        #result .buttons button,
        #exam-result .buttons button,
        #student-review .buttons button{
          width:100%;
        }

        #student-dashboard > .header,
        #student-assignments > .header,
        #student-review > .header{
          flex-direction:column;
          align-items:stretch;
        }

        #student-dashboard > .header > button,
        #student-assignments > .header > button,
        #student-review > .header > button{
          width:100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function classifyState(el){
    if (!el) return;

    const text = String(el.textContent || '').trim().toLowerCase();
    const visible = Boolean(text) && !el.classList.contains('hidden');
    const isLoading = visible && /^(loading|checking|refreshing|getting|preparing)|loading…|loading\.\.\./i.test(text);
    const isError = visible && !isLoading && /could not|couldn't|failed|unable|unavailable|connection|try again|error/i.test(text);
    const isEmpty = visible && !isLoading && (
      el.classList.contains('empty') ||
      /no assignments|no practice|no progress|nothing to show|sign in to see|no reviewed|no recent/i.test(text)
    );

    el.classList.toggle('v39-loading-state', isLoading);
    el.classList.toggle('v39-state-error', isError);
    el.classList.toggle('v39-state-empty', isEmpty);
  }

  function refreshStates(){
    [
      byId('student-access-note'),
      byId('student-dashboard-feedback'),
      byId('student-assignments-feedback'),
      byId('student-review-feedback')
    ].filter(Boolean).forEach(classifyState);

    document.querySelectorAll(
      '#student-dashboard .empty, #student-assignments .empty, #student-review .empty'
    ).forEach(classifyState);
  }

  function observeStates(){
    ['start','student-dashboard','student-assignments','student-review'].forEach(id => {
      const root = byId(id);
      if (!root) return;
      new MutationObserver(refreshStates).observe(root, {
        childList:true,
        subtree:true,
        characterData:true,
        attributes:true,
        attributeFilter:['class']
      });
    });
  }

  function applyV39D(){
    injectStyles();
    refreshStates();
    observeStates();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV39D, { once:true });
  } else {
    applyV39D();
  }
})();
