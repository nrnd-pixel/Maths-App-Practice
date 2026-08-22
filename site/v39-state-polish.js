/* V3.9D — Student mobile/state presentation polish.
   CSS-only: no MutationObservers, no DOM state rewriting, no data or navigation changes. */
(() => {
  'use strict';

  const STYLE_ID = 'v39-state-polish-style';
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #start button:focus-visible,
    #start input:focus-visible,
    #start select:focus-visible,
    #quiz button:focus-visible,
    #quiz input:focus-visible,
    #quiz select:focus-visible,
    #quiz textarea:focus-visible,
    #result button:focus-visible,
    #student-review button:focus-visible,
    #student-assignments button:focus-visible,
    #student-dashboard button:focus-visible,
    #exam-result button:focus-visible{
      outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);
      outline-offset:2px;
    }

    #student-dashboard .empty,
    #student-assignments .empty,
    #student-review .empty{
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
})();
