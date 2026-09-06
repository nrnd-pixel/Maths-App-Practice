/* V5.9G Student Home Visual Fidelity — test-only presentation layer.
   Loaded only with ?v59-student-home-preview=1. This module changes only
   presentation inside the V5.9 student Home. It introduces no network,
   Supabase, grading, assignment, result, or persistence authority. */
(() => {
  'use strict';

  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (window.__v59gStudentHomeVisualFidelityInstalled) return;
  window.__v59gStudentHomeVisualFidelityInstalled = true;

  const HOME_ID = 'v59-student-home-preview';
  const STYLE_ID = 'v59g-student-home-visual-fidelity-style';
  let timer = 0;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Header: keep the real pupil data, but add the airy illustrated feel. */
      #${HOME_ID} .v59-welcome-wrap{
        position:relative;overflow:hidden;isolation:isolate;
        background:linear-gradient(135deg,#d8f5ff 0%,#e8efff 58%,#e6e8ff 100%)
      }
      #${HOME_ID} .v59-welcome-wrap:before{
        content:'';position:absolute;z-index:-2;right:-36px;bottom:-22px;width:360px;height:132px;
        background:linear-gradient(145deg,rgba(104,153,228,.18),rgba(128,100,214,.13));
        clip-path:polygon(0 100%,18% 52%,30% 73%,47% 30%,60% 58%,73% 21%,100% 72%,100% 100%);
        pointer-events:none
      }
      #${HOME_ID} .v59-welcome-wrap:after{
        content:'';position:absolute;z-index:-1;right:36px;top:16px;width:170px;height:68px;opacity:.48;
        background:
          radial-gradient(circle at 22% 60%,#fff 0 18px,transparent 19px),
          radial-gradient(circle at 45% 42%,#fff 0 25px,transparent 26px),
          radial-gradient(circle at 70% 62%,#fff 0 18px,transparent 19px);
        pointer-events:none
      }
      #${HOME_ID} .v59-avatar{
        position:relative;background:linear-gradient(145deg,#1768e5,#4a55dc);
        border-width:4px;box-shadow:0 8px 22px rgba(38,91,193,.22),0 0 0 4px rgba(255,255,255,.34)
      }
      #${HOME_ID} .v59-avatar:after{
        content:'★';position:absolute;right:-7px;bottom:-5px;width:22px;height:22px;border-radius:50%;
        display:grid;place-items:center;background:#fff3b7;color:#d19208;font-size:11px;
        box-shadow:0 3px 9px rgba(76,55,8,.15)
      }
      #${HOME_ID} .v59-level-pill{background:rgba(255,255,255,.66);padding:5px 9px;border-radius:999px}

      /* Continue Learning: replace abstract maths tiles with a journey to a goal. */
      #${HOME_ID} .v59-hero{min-height:238px;background:linear-gradient(118deg,#5228c8 0%,#7246e3 58%,#8257ec 100%)}
      #${HOME_ID} .v59-math-art{display:none!important}
      #${HOME_ID} .v59g-journey-art{position:absolute;right:12px;bottom:0;width:min(43%,330px);height:100%;pointer-events:none;z-index:1}
      #${HOME_ID} .v59g-journey-mountain{position:absolute;right:-20px;bottom:0;width:100%;height:68%;opacity:.58;background:linear-gradient(145deg,rgba(218,202,255,.22),rgba(255,255,255,.05));clip-path:polygon(0 100%,18% 65%,33% 82%,52% 39%,65% 63%,82% 22%,100% 53%,100% 100%)}
      #${HOME_ID} .v59g-step{position:absolute;width:48px;height:22px;border-radius:7px;background:linear-gradient(180deg,#f7f1ff,#d8c7ff);box-shadow:0 5px 0 rgba(60,24,142,.23);transform:skewX(-12deg)}
      #${HOME_ID} .v59g-step.s1{right:18px;bottom:26px}
      #${HOME_ID} .v59g-step.s2{right:70px;bottom:57px}
      #${HOME_ID} .v59g-step.s3{right:120px;bottom:89px}
      #${HOME_ID} .v59g-step.s4{right:164px;bottom:122px}
      #${HOME_ID} .v59g-star{position:absolute;right:187px;bottom:154px;color:#ffe774;font-size:42px;filter:drop-shadow(0 5px 10px rgba(67,39,7,.25));transform:rotate(-8deg)}
      #${HOME_ID} .v59g-flag{position:absolute;right:210px;bottom:177px;color:#fff;font-size:27px;filter:drop-shadow(0 4px 7px rgba(38,24,89,.25))}
      #${HOME_ID} .v59g-spark{position:absolute;color:#fff6a8;font-size:14px;opacity:.9}
      #${HOME_ID} .v59g-spark.a{right:76px;top:28px}#${HOME_ID} .v59g-spark.b{right:22px;top:84px}#${HOME_ID} .v59g-spark.c{right:150px;top:52px}

      /* Practice tiles: clearer, larger, more dimensional learning icons. */
      #${HOME_ID} .v59-path{position:relative;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease}
      #${HOME_ID} .v59-path:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(31,62,108,.10)}
      #${HOME_ID} .v59-path-icon{position:relative;overflow:hidden;box-shadow:0 8px 16px rgba(32,68,124,.20),inset 0 1px 0 rgba(255,255,255,.32)}
      #${HOME_ID} .v59-path-icon:after{content:'';position:absolute;inset:4px 7px auto 7px;height:28%;border-radius:999px;background:rgba(255,255,255,.20);pointer-events:none}
      #${HOME_ID} .v59-path-icon svg{width:29px;height:29px;position:relative;z-index:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.12))}
      #${HOME_ID} .v59-path:nth-child(1){background:linear-gradient(145deg,#d9faed,#c7f2e1)}
      #${HOME_ID} .v59-path:nth-child(2){background:linear-gradient(145deg,#deefff,#c8e4ff)}
      #${HOME_ID} .v59-path:nth-child(3){background:linear-gradient(145deg,#fff2cb,#ffe6a9)}

      /* Badge: make earning something feel celebratory rather than analytical. */
      #${HOME_ID} .v59g-badge-card{position:relative;overflow:hidden;background:linear-gradient(145deg,#fff,#fbf8ff)}
      #${HOME_ID} .v59g-badge-card:before{content:'✦  ·  ✧';position:absolute;right:18px;top:20px;color:#cdb6ff;font-size:21px;letter-spacing:8px;opacity:.7;pointer-events:none}
      #${HOME_ID} .v59g-badge-card:after{content:'✦';position:absolute;right:34px;bottom:18px;color:#f1c850;font-size:23px;opacity:.66;pointer-events:none}
      #${HOME_ID} .v59g-badge-card .v59-badge-mark{transform:rotate(-3deg);background:linear-gradient(145deg,#9365ec,#5630bb);box-shadow:0 10px 22px rgba(91,54,177,.20)}
      #${HOME_ID} .v59g-badge-card .v59-badge-mark:after{content:'';position:absolute}

      /* Cooperative challenge: stronger trophy/progress moment without a leaderboard. */
      #${HOME_ID} .v59-challenge{position:relative;overflow:hidden;background:linear-gradient(120deg,#eaf8ff,#d8ecff 70%,#e6e5ff)}
      #${HOME_ID} .v59-challenge:after{content:'🏆';position:absolute;right:26px;bottom:-10px;font-size:94px;opacity:.075;filter:grayscale(.1);pointer-events:none;transform:rotate(7deg)}
      #${HOME_ID} .v59-challenge .v59-soft-icon{background:linear-gradient(145deg,#fff6cf,#ffe39b);color:#845b00;box-shadow:0 7px 16px rgba(116,83,10,.12)}
      #${HOME_ID} .v59-challenge .v59-progress{height:11px}
      #${HOME_ID} .v59-challenge .v59-progress span{background:linear-gradient(90deg,#2c8ced,#5a72ec)}

      /* Keep the colourful concept identity in dark mode. */
      html[data-theme="dark"] #${HOME_ID} .v59-welcome-wrap{background:linear-gradient(135deg,#cfeeff,#dfe8ff 60%,#e4e3ff)}
      html[data-theme="dark"] #${HOME_ID} .v59g-badge-card{background:linear-gradient(145deg,#fff,#faf7ff)}
      html[data-theme="dark"] #${HOME_ID} .v59-challenge{background:linear-gradient(120deg,#dff4ff,#d2e8ff 70%,#e1e0ff)}

      @media(max-width:620px){
        #${HOME_ID} .v59-welcome-wrap:before{right:-90px;width:300px;height:115px;opacity:.8}
        #${HOME_ID} .v59-welcome-wrap:after{right:-22px;top:8px;opacity:.35}
        #${HOME_ID} .v59-hero-copy{max-width:74%}
        #${HOME_ID} .v59g-journey-art{right:-18px;width:46%}
        #${HOME_ID} .v59g-step{width:37px;height:18px}
        #${HOME_ID} .v59g-step.s1{right:6px;bottom:24px}#${HOME_ID} .v59g-step.s2{right:42px;bottom:49px}#${HOME_ID} .v59g-step.s3{right:78px;bottom:75px}#${HOME_ID} .v59g-step.s4{right:110px;bottom:101px}
        #${HOME_ID} .v59g-star{right:126px;bottom:126px;font-size:33px}#${HOME_ID} .v59g-flag{right:143px;bottom:148px;font-size:22px}
      }
      @media(max-width:430px){
        #${HOME_ID} .v59-hero-copy{max-width:78%}
        #${HOME_ID} .v59g-journey-art{opacity:.72;right:-30px}
        #${HOME_ID} .v59g-star{font-size:29px}
      }
      @media(prefers-reduced-motion:reduce){#${HOME_ID} .v59-path{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function iconSvg(kind){
    const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    if (kind === 'mixed') return `<svg ${common}><path d="M4 7h16M4 17h16"/><path d="M8 3v8M16 13v8"/><circle cx="16" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="1.6" fill="currentColor" stroke="none"/></svg>`;
    if (kind === 'topic') return `<svg ${common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m16 8 5-5M17 3h4v4"/></svg>`;
    return `<svg ${common}><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>`;
  }

  function patchPracticeIcons(){
    const home = document.getElementById(HOME_ID);
    if (!home) return;
    const map = [
      ['mixed','[data-v59-action="mixed"]'],
      ['topic','[data-v59-action="topic"]'],
      ['paper','[data-v59-action="past_paper"]']
    ];
    map.forEach(([kind,selector]) => {
      const icon = home.querySelector(`${selector} .v59-path-icon`);
      if (!icon || icon.dataset.v59gIcon === kind) return;
      icon.dataset.v59gIcon = kind;
      icon.innerHTML = iconSvg(kind);
    });
  }

  function patchJourney(){
    const hero = document.querySelector(`#${HOME_ID} .v59-hero`);
    if (!hero || hero.querySelector('.v59g-journey-art')) return;
    const art = document.createElement('div');
    art.className = 'v59g-journey-art';
    art.setAttribute('aria-hidden','true');
    art.innerHTML = '<div class="v59g-journey-mountain"></div><span class="v59g-spark a">✦</span><span class="v59g-spark b">✧</span><span class="v59g-spark c">✦</span><span class="v59g-step s1"></span><span class="v59g-step s2"></span><span class="v59g-step s3"></span><span class="v59g-step s4"></span><span class="v59g-star">★</span><span class="v59g-flag">⚑</span>';
    hero.appendChild(art);
  }

  function patchBadgeCelebration(){
    const home = document.getElementById(HOME_ID);
    if (!home) return;
    const card = [...home.querySelectorAll('.v59-card')].find(item => item.querySelector('.v59-card-head h2')?.textContent.trim().toLowerCase() === 'latest badge');
    if (card) card.classList.add('v59g-badge-card');
  }

  function polish(){
    injectStyles();
    patchPracticeIcons();
    patchJourney();
    patchBadgeCelebration();
  }

  function schedule(){
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => { timer = 0; polish(); }, 70);
  }

  function wire(){
    polish();
    ['pageshow','v57c:home-updated','v571b:achievements-updated','v573:class-challenge-updated'].forEach(name => window.addEventListener(name,schedule));
    document.addEventListener('click',event => {
      if (event.target?.closest?.('[data-v59-action="home"],[data-v40-nav="home"],.back-home')) window.setTimeout(schedule,0);
    },true);
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(mutations => {
        const meaningful = mutations.some(mutation => !mutation.target?.closest?.('.v59g-journey-art'));
        if (meaningful) schedule();
      });
      observer.observe(document.body,{subtree:true,childList:true});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
