/* V4.0D — Platform polish.
   CSS-only: tightens student navigation, card hierarchy, mobile wrapping and
   touch targets without changing authentication, data loading or app state. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-platform-polish-style';

  function applyV40DPolish(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Persistent student navigation reads as the primary tab bar. */
      .v40-student-nav{
        position:sticky;
        top:0;
        z-index:30;
        margin:0 0 20px;
        padding:8px 4px 10px;
        background:color-mix(in srgb,var(--card) 94%,transparent);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        border-bottom:1px solid var(--border);
      }

      .v40-student-nav button{
        min-height:44px;
        border-radius:12px;
      }

      .v40-student-nav button[aria-current="page"]{
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 10%,transparent);
      }

      /* Keep student identity compact beside the tabs. */
      .v40c-nav-identity{
        min-height:36px;
        padding:7px 10px;
      }

      /* Consistent vertical rhythm across the dedicated student areas. */
      #student-assignments,
      #student-dashboard,
      #student-review,
      #result,
      #exam-result,
      #quiz{
        scroll-margin-top:74px;
      }

      #student-assignments > h1,
      #student-dashboard > h1,
      #student-review > h1{
        margin-top:4px;
      }

      #student-assignments .student-assignment-card,
      #student-dashboard .practice-recommendation-card,
      #student-dashboard .insight-card,
      #student-dashboard .student-achievement-card,
      #student-dashboard .student-message-card-v37,
      #student-review .student-review-card,
      #student-review .student-result-head{
        border-radius:16px;
      }

      #student-assignments .student-assignment-card,
      #student-dashboard .practice-recommendation-card,
      #student-dashboard .insight-card,
      #student-dashboard .student-achievement-card,
      #student-dashboard .student-message-card-v37,
      #student-review .student-review-card{
        overflow-wrap:anywhere;
      }

      #student-assignments .student-assignment-action button,
      #student-dashboard .practice-recommendation-action button,
      #student-dashboard button,
      #student-review button,
      #result button,
      #exam-result button{
        min-height:44px;
      }

      /* Make the Learning Hub feel like an overview, not another form. */
      #start .v40c-session-panel.v40c-authenticated{
        margin-bottom:16px;
      }

      #start .v40c3-home-dashboard{
        margin-bottom:6px;
      }

      #start .v40c3-secondary-row{
        padding-bottom:2px;
      }

      #start .v40c-learn-setup{
        scroll-margin-top:78px;
      }

      /* Practice remains focused on the question and answer path. */
      #quiz .question-card,
      #quiz .answerbox,
      #quiz .feedback,
      #quiz .hint-box{
        overflow-wrap:anywhere;
      }

      #quiz img{
        max-width:100%;
        height:auto;
      }

      /* Keyboard users should always see where they are. */
      .v40-student-nav button:focus-visible,
      #start .v40c3-home-dashboard button:focus-visible,
      #start .v40c-learn-setup button:focus-visible,
      #student-assignments button:focus-visible,
      #student-dashboard button:focus-visible,
      #student-review button:focus-visible{
        outline:3px solid color-mix(in srgb,var(--primary) 42%,transparent);
        outline-offset:2px;
      }

      @media(max-width:760px){
        .v40-student-nav{
          margin-left:-2px;
          margin-right:-2px;
          padding-top:6px;
          padding-bottom:8px;
        }

        .v40-student-nav button{
          min-height:46px;
          padding:9px 12px;
        }

        .v40c-nav-identity{
          display:none;
        }

        #start .v40c3-priority-card,
        #start .v40-learning-hub-hero,
        #start .v40c-learn-setup,
        #start .v40c-session-panel{
          border-radius:16px;
        }

        #student-assignments .student-assignment-action,
        #student-dashboard .practice-recommendation-action{
          display:grid;
          grid-template-columns:1fr;
        }

        #student-assignments .student-assignment-action button,
        #student-dashboard .practice-recommendation-action button,
        #student-dashboard .buttons button,
        #student-review .buttons button{
          width:100%;
        }
      }

      @media(max-width:520px){
        .v40-student-nav{
          gap:4px;
        }

        .v40-student-nav button{
          gap:5px;
          padding:8px 10px;
          font-size:12px;
        }

        #start .v40c3-priority-card,
        #start .v40-learning-hub-hero{
          padding:15px;
        }

        #start .v40c3-glance{
          gap:7px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV40DPolish, { once:true });
  } else {
    applyV40DPolish();
  }
})();
