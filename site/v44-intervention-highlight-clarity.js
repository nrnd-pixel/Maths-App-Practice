/* V4.4C clarity patch — make Review Practice target unmistakable.
   Visual-only companion to v44-intervention-follow-through.js. It does not
   choose, create, update, or complete assignments. */
(() => {
  'use strict';

  const STYLE_ID = 'v44c-intervention-highlight-clarity-style';
  let sequence = 0;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v44c-highlight-strong{
        position:relative;
        outline:4px solid var(--primary) !important;
        outline-offset:4px !important;
        box-shadow:
          0 0 0 8px color-mix(in srgb,var(--primary) 16%,transparent),
          0 0 28px color-mix(in srgb,var(--primary) 36%,transparent) !important;
        scroll-margin-block:110px;
        animation:v44c-target-pulse 1s ease-in-out 3;
      }
      .v44c-target-label{
        position:absolute;
        z-index:4;
        top:-15px;
        right:12px;
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:6px 10px;
        border-radius:999px;
        background:var(--primary);
        color:#fff;
        font-size:11px;
        font-weight:900;
        line-height:1.2;
        box-shadow:0 6px 18px color-mix(in srgb,var(--primary) 28%,transparent);
        pointer-events:none;
      }
      @keyframes v44c-target-pulse{
        0%,100%{transform:translateZ(0);box-shadow:0 0 0 8px color-mix(in srgb,var(--primary) 14%,transparent),0 0 24px color-mix(in srgb,var(--primary) 30%,transparent)}
        50%{transform:translateZ(0);box-shadow:0 0 0 12px color-mix(in srgb,var(--primary) 22%,transparent),0 0 34px color-mix(in srgb,var(--primary) 44%,transparent)}
      }
      @media(max-width:520px){
        .v44c-target-label{
          position:static;
          width:max-content;
          max-width:100%;
          margin:0 0 10px auto;
        }
      }
      @media(prefers-reduced-motion:reduce){
        .v44c-highlight-strong{animation:none}
      }
    `;
    document.head.appendChild(style);
  }

  function clearStrongHighlight(card){
    if (!card) return;
    card.classList.remove('v44c-highlight-strong');
    card.querySelector(':scope > .v44c-target-label')?.remove();
  }

  function emphasize(card,token){
    if (!card || token !== sequence) return;

    document.querySelectorAll('.v44c-highlight-strong').forEach(other => {
      if (other !== card) clearStrongHighlight(other);
    });

    card.classList.add('v44c-highlight-strong');
    card.querySelector(':scope > .v44c-target-label')?.remove();

    const label = document.createElement('div');
    label.className = 'v44c-target-label';
    label.textContent = '✓ Matching Practice assignment';
    card.prepend(label);

    card.scrollIntoView({behavior:'smooth',block:'center'});

    window.setTimeout(() => {
      if (token === sequence) clearStrongHighlight(card);
    },5000);
  }

  function waitForTarget(token,attempt=0){
    if (token !== sequence) return;
    const card = document.querySelector('#v43b-practice-assignment-admin .v43b-card.v44c-highlight');
    if (card){
      emphasize(card,token);
      return;
    }
    if (attempt >= 35) return;
    window.setTimeout(() => waitForTarget(token,attempt+1),100);
  }

  function wire(){
    injectStyles();
    const teacher = document.getElementById('teacher');
    if (!teacher || teacher.dataset.v44cHighlightClarity === '1') return;
    teacher.dataset.v44cHighlightClarity = '1';

    teacher.addEventListener('click',event => {
      const button = event.target.closest?.('.v44c-review-practice');
      if (!button) return;
      sequence += 1;
      const token = sequence;
      window.setTimeout(() => waitForTarget(token),80);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
