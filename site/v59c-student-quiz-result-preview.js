/* V5.9C Student Quiz + Result Preview — concept-fidelity presentation only.
   Loaded only with ?v59-student-home-preview=1. Keeps the accepted V5.8
   question, response, grading, save, teacher-review and result-code engines
   untouched. This module only adds scoped styling and light DOM scaffolding. */
(() => {
  'use strict';

  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (window.__v59cStudentQuizResultPreviewInstalled) return;
  window.__v59cStudentQuizResultPreviewInstalled = true;

  const STYLE_ID = 'v59c-student-quiz-result-preview-style';
  const QUIZ_CARD_ID = 'v59c-question-card';
  let observer = null;
  let timer = 0;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[data-v59-student-home-preview="true"] body:has(#quiz.active),
      html[data-v59-student-home-preview="true"] body:has(#result.active){background:#f4f8ff}

      #quiz.v59c-concept-quiz,
      #result.v59c-concept-result{--v59c-ink:#16264c;--v59c-muted:#52627e;--v59c-blue:#1454d4;--v59c-purple:#6136d5;--v59c-green:#087657;--v59c-line:#e2eaf4;color:var(--v59c-ink);font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif}

      #quiz.v59c-concept-quiz.active{width:min(760px,100%);margin:0 auto;background:transparent;border:0;box-shadow:none;padding:4px 0 30px}
      #quiz.v59c-concept-quiz .v59c-quiz-head{padding:8px 2px 4px;margin-bottom:14px}
      #quiz.v59c-concept-quiz .v59c-eyebrow{font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:var(--v59c-blue);margin-bottom:5px}
      #quiz.v59c-concept-quiz .v59c-quiz-head h1{margin:0;font-size:clamp(27px,5vw,34px);line-height:1.15;letter-spacing:-.04em}
      #quiz.v59c-concept-quiz .v59c-quiz-head p{margin:7px 0 0;color:var(--v59c-muted);font-size:13px;line-height:1.5}
      #quiz.v59c-concept-quiz .quizbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 2px;margin:0 0 11px}
      #quiz.v59c-concept-quiz .quizbar .pills{gap:6px}
      #quiz.v59c-concept-quiz .quizbar .pill{background:#eaf0ff;color:#315eaa;border:0;font-size:10px;padding:5px 9px}
      #quiz.v59c-concept-quiz .scoremini{font-size:11px;line-height:1.45;color:var(--v59c-muted)}
      #quiz.v59c-concept-quiz .scoremini strong{color:var(--v59c-ink)}
      #quiz.v59c-concept-quiz > .progress{height:9px;margin:0 2px 7px;background:#dee7f4;border-radius:999px;overflow:hidden}
      #quiz.v59c-concept-quiz > .progress>div{background:linear-gradient(90deg,#0ca499,#16c690);border-radius:999px}
      #quiz.v59c-concept-quiz > #progress-text{margin:0 2px 14px;font-size:12px;color:var(--v59c-muted);font-weight:800}

      #quiz.v59c-concept-quiz #${QUIZ_CARD_ID}{background:#fff;border:1px solid var(--v59c-line);border-radius:24px;padding:clamp(18px,4vw,28px);box-shadow:0 5px 20px rgba(27,60,114,.06)}
      #quiz.v59c-concept-quiz .question-meta{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 10px}
      #quiz.v59c-concept-quiz .qnum{font-size:11px;font-weight:950;color:var(--v59c-blue);text-transform:uppercase}
      #quiz.v59c-concept-quiz .source{font-size:11px;color:var(--v59c-muted);font-weight:750}
      #quiz.v59c-concept-quiz #q-text{margin:12px 0 22px;font-size:clamp(22px,4.5vw,29px);line-height:1.45;letter-spacing:-.02em;color:var(--v59c-ink)}
      #quiz.v59c-concept-quiz .qimage{display:block;max-width:100%;max-height:360px;margin:0 auto 18px;border:1px solid var(--v59c-line);border-radius:16px;background:#fff;object-fit:contain}
      #quiz.v59c-concept-quiz .qimage.hidden{display:none!important}
      #quiz.v59c-concept-quiz .answerbox{margin:0;padding:0;border:0;background:transparent}
      #quiz.v59c-concept-quiz .answerbox>label{display:block;margin:0 0 10px;font-size:13px;font-weight:900;color:var(--v59c-muted)}
      #quiz.v59c-concept-quiz .response-shell{display:grid;gap:11px}
      #quiz.v59c-concept-quiz .response-shell input,
      #quiz.v59c-concept-quiz .response-shell select,
      #quiz.v59c-concept-quiz .response-shell textarea{min-height:54px;border:2px solid #afbfda;border-radius:14px;background:#fff;color:var(--v59c-ink);padding:13px 14px;font-size:16px}
      #quiz.v59c-concept-quiz .response-shell input:focus,
      #quiz.v59c-concept-quiz .response-shell select:focus,
      #quiz.v59c-concept-quiz .response-shell textarea:focus{outline:3px solid #dce8ff;border-color:var(--v59c-blue)}
      #quiz.v59c-concept-quiz .choice-list{display:grid;gap:10px}
      #quiz.v59c-concept-quiz .choice-option{display:flex;align-items:flex-start;gap:12px;min-height:58px;padding:14px;border:2px solid var(--v59c-line);border-radius:15px;background:#fff;font-weight:750;cursor:pointer}
      #quiz.v59c-concept-quiz .choice-option:has(input:checked){background:#ecf2ff;border-color:var(--v59c-blue)}
      #quiz.v59c-concept-quiz .choice-option input{width:20px;height:20px;min-height:0;margin-top:1px;accent-color:var(--v59c-blue)}
      #quiz.v59c-concept-quiz .fraction-entry{margin-top:2px}
      #quiz.v59c-concept-quiz .fraction-bar{background:var(--v59c-ink)}
      #quiz.v59c-concept-quiz .response-guide{font-size:11px;color:var(--v59c-muted);line-height:1.45}
      #quiz.v59c-concept-quiz .answer-action{display:flex;justify-content:flex-end;margin-top:16px}
      #quiz.v59c-concept-quiz #check-btn,
      #quiz.v59c-concept-quiz #next-btn{min-height:49px;min-width:150px;border-radius:14px;background:var(--v59c-blue);color:#fff;font-weight:900;padding:11px 18px}
      #quiz.v59c-concept-quiz #attempt-text{margin-top:8px;font-size:11px;color:var(--v59c-muted)}
      #quiz.v59c-concept-quiz #hint-btn{margin-top:14px;min-height:44px;padding:10px 14px;border-radius:13px;background:#fff5d8;color:#855200;font-size:12px;font-weight:900}
      #quiz.v59c-concept-quiz #hint-box{margin-top:12px;padding:15px;border-radius:14px;background:#fff5d8;color:#704900;font-size:13px;line-height:1.5}
      #quiz.v59c-concept-quiz #feedback{margin-top:14px;padding:16px;border-radius:16px;border:0;background:#eaf2ff;color:#284873;line-height:1.5}
      #quiz.v59c-concept-quiz #feedback.correct{background:#def6e8;color:#126744}
      #quiz.v59c-concept-quiz #feedback.incorrect{background:#fff0ed;color:#9a342b}
      #quiz.v59c-concept-quiz #feedback.try{background:#fff5d8;color:#704900}
      #quiz.v59c-concept-quiz #${QUIZ_CARD_ID}>.buttons{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:18px}
      #quiz.v59c-concept-quiz #quit-btn{min-height:47px;padding:10px 15px;border:1px solid var(--v59c-line);border-radius:14px;background:#fff;color:#395270;font-size:12px;font-weight:900}

      #quiz.v59c-concept-quiz .multipart-stack{display:grid;gap:14px}
      #quiz.v59c-concept-quiz .multipart-part{border:1px solid var(--v59c-line);border-radius:18px;padding:16px;background:#fafdff}
      #quiz.v59c-concept-quiz .multipart-part.correct-part{border-color:#95d8b7;background:#f4fff9}
      #quiz.v59c-concept-quiz .multipart-part .part-label{color:var(--v59c-blue)}
      #quiz.v59c-concept-quiz .drawing-stage{border-color:var(--v59c-line);border-radius:16px}
      #quiz.v59c-concept-quiz .manual-response textarea{min-height:145px}

      #result.v59c-concept-result.active{width:min(820px,100%);margin:0 auto;background:transparent;border:0;box-shadow:none;padding:18px 0 38px;text-align:center}
      #result.v59c-concept-result .v59c-result-kicker{font-size:11px;font-weight:950;letter-spacing:.09em;text-transform:uppercase;color:var(--v59c-green);margin-bottom:7px}
      #result.v59c-concept-result>div:first-child{width:82px;height:90px;margin:0 auto 14px;display:grid;place-items:center;background:linear-gradient(145deg,#8656e6,#5834b7);clip-path:polygon(50% 0,94% 25%,94% 75%,50% 100%,6% 75%,6% 25%);font-size:34px!important}
      #result.v59c-concept-result>h1{margin:0 0 8px;font-size:clamp(30px,6vw,40px);line-height:1.15;letter-spacing:-.04em;color:var(--v59c-ink)}
      #result.v59c-concept-result>#result-name{margin:0;color:var(--v59c-muted);font-size:13px}
      #result.v59c-concept-result>#result-score{margin:19px 0 2px;font-size:clamp(44px,8vw,66px);font-weight:950;color:#215dbe;letter-spacing:-.05em}
      #result.v59c-concept-result>#result-message{width:min(620px,100%);margin:12px auto 0;padding:15px;border-radius:16px;background:#e7f6ef;color:#286249;font-size:13px;line-height:1.5}
      #result.v59c-concept-result>.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin:20px 0}
      #result.v59c-concept-result>.stats .stat{background:#fff;border:1px solid var(--v59c-line);border-radius:18px;padding:15px;box-shadow:0 4px 15px rgba(27,60,114,.04)}
      #result.v59c-concept-result>.stats .stat strong{display:block;font-size:22px;color:#215dbe;margin-bottom:3px}
      #result.v59c-concept-result>.stats .stat small{color:var(--v59c-muted);font-size:10px}
      #result.v59c-concept-result #result-code-box{border:1px solid #bdd8ff;background:#f3f8ff;border-radius:18px;padding:14px 16px;margin:18px 0;text-align:left}
      #result.v59c-concept-result #review{display:grid;gap:11px;margin-top:20px;text-align:left}
      #result.v59c-concept-result .reviewitem{background:#fff;border:1px solid var(--v59c-line);border-radius:18px;padding:16px;box-shadow:0 4px 15px rgba(27,60,114,.04)}
      #result.v59c-concept-result>.buttons{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:20px}
      #result.v59c-concept-result>.buttons button{min-height:48px;border-radius:14px;padding:11px 17px;font-weight:900}
      #result.v59c-concept-result #again-btn{background:var(--v59c-blue);color:#fff}
      #result.v59c-concept-result .back-home{background:#eef3ff;color:#214da8}

      @media(max-width:620px){
        #quiz.v59c-concept-quiz.active,#result.v59c-concept-result.active{padding-left:2px;padding-right:2px}
        #quiz.v59c-concept-quiz .quizbar{align-items:flex-start;flex-direction:column}
        #quiz.v59c-concept-quiz .scoremini{text-align:left}
        #quiz.v59c-concept-quiz #${QUIZ_CARD_ID}>.buttons{display:grid;grid-template-columns:1fr 1fr}
        #quiz.v59c-concept-quiz #quit-btn,#quiz.v59c-concept-quiz #next-btn,#quiz.v59c-concept-quiz #check-btn{width:100%;min-width:0}
        #result.v59c-concept-result>.stats{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:390px){#quiz.v59c-concept-quiz #${QUIZ_CARD_ID}{padding:16px}#quiz.v59c-concept-quiz #q-text{font-size:21px}}
      @media(prefers-reduced-motion:reduce){#quiz.v59c-concept-quiz *,#result.v59c-concept-result *{scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureQuizScaffold(){
    const quiz = document.getElementById('quiz');
    if (!quiz) return false;
    quiz.classList.add('v59c-concept-quiz');

    if (!quiz.querySelector('.v59c-quiz-head')) {
      const head = document.createElement('header');
      head.className = 'v59c-quiz-head';
      head.innerHTML = '<div class="v59c-eyebrow">Practice</div><h1>One question at a time</h1><p>Read carefully, have a go, and use a hint when you need it.</p>';
      quiz.insertAdjacentElement('afterbegin', head);
    }

    let card = document.getElementById(QUIZ_CARD_ID);
    if (!card) {
      card = document.createElement('section');
      card.id = QUIZ_CARD_ID;
      card.setAttribute('aria-label','Practice question');
      const progressText = document.getElementById('progress-text');
      if (progressText) progressText.insertAdjacentElement('afterend', card);
      else quiz.appendChild(card);

      [
        quiz.querySelector(':scope > .question-meta'),
        document.getElementById('q-text'),
        document.getElementById('q-image'),
        quiz.querySelector(':scope > .answerbox'),
        document.getElementById('hint-btn'),
        document.getElementById('hint-box'),
        document.getElementById('feedback'),
        quiz.querySelector(':scope > .buttons')
      ].filter(Boolean).forEach(node => card.appendChild(node));
    }
    return true;
  }

  function ensureResultScaffold(){
    const result = document.getElementById('result');
    if (!result) return false;
    result.classList.add('v59c-concept-result');
    if (!result.querySelector('.v59c-result-kicker')) {
      const heading = result.querySelector(':scope > h1');
      if (heading) {
        heading.textContent = 'You made progress!';
        const kicker = document.createElement('div');
        kicker.className = 'v59c-result-kicker';
        kicker.textContent = 'Practice complete';
        heading.insertAdjacentElement('beforebegin', kicker);
      }
    } else {
      const heading = result.querySelector(':scope > h1');
      if (heading && heading.textContent !== 'You made progress!') heading.textContent = 'You made progress!';
    }
    return true;
  }

  function refresh(){
    injectStyles();
    ensureQuizScaffold();
    ensureResultScaffold();
  }

  function schedule(){
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => { timer = 0; refresh(); }, 40);
  }

  function watch(){
    if (observer || typeof MutationObserver === 'undefined') return;
    const shell = document.querySelector('.shell') || document.body;
    observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
        return !!target?.closest?.('#quiz,#result') || [...mutation.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('#quiz,#result') || node.querySelector?.('#quiz,#result')));
      });
      if (relevant) schedule();
    });
    observer.observe(shell,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  }

  function wire(){
    injectStyles();
    refresh();
    watch();
    window.addEventListener('pageshow',schedule);
    document.addEventListener('click',event => {
      if (event.target?.closest?.('#next-btn,#check-btn,#again-btn,.back-home')) schedule();
    },true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
