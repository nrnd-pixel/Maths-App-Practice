/* V5.9A — Home screen visual reskin (styling only).
   Adds an "rk-" (reskin) prefixed class layer to the existing, unchanged
   Continue-Learning-Home elements built by v39/v40/v40c3. No id is renamed,
   no existing class is removed, no markup is restructured, and no network,
   Supabase or storage call is made. Purely additive classList.add() calls
   plus a scoped stylesheet. Safe to remove by deleting this file and its
   one config.js load-list entry. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59aHomeReskinInstalled) return;
  ROOT.__v59aHomeReskinInstalled = true;

  const STYLE_ID = 'v59a-home-reskin-style';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .rk-home-shell{
        --rk-ink:#16264c;--rk-muted:#52627e;--rk-blue:#1454d4;--rk-purple:#6136d5;
        --rk-line:#e2eaf4;--rk-surface:#fff;--rk-radius:22px;--rk-shadow:0 5px 20px #1b3c7210;
        font-family:'Baloo 2',ui-rounded,"Trebuchet MS",system-ui,sans-serif;
      }
      #start .rk-hero{
        background:linear-gradient(115deg,#5a2dcd,#7751e1);color:#fff;position:relative;
        isolation:isolate;overflow:hidden;padding:23px;border-radius:26px;
        box-shadow:0 8px 22px #6038b42b;display:flex;flex-direction:column;gap:10px;
      }
      #start .rk-hero .rk-eyebrow{
        font-size:.75rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#e5dcff;
      }
      #start .rk-hero h2.rk-hero-title{
        font-size:1.6rem;line-height:1.15;color:#fff;font-weight:800;margin:0;
      }
      #start .rk-hero p.rk-hero-text{
        color:#f0eaff;font-size:.9375rem;margin:0;
      }
      #start .rk-hero .v40-learning-cycle{
        margin-top:6px;
      }
      #start .rk-card{
        background:var(--rk-surface);border:1px solid var(--rk-line);border-radius:var(--rk-radius);
        padding:19px;box-shadow:var(--rk-shadow);
      }
      #start .rk-card.rk-recommend{
        border-color:#e8ddff;background:#fcfaff;
      }
      #start .rk-card .v40c3-priority-kicker{
        font-size:.75rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8b6100;
      }
      #start .rk-card .v40c3-priority-title{
        font-size:1.1rem;font-weight:800;color:var(--rk-ink);margin-top:6px;
      }
      #start .rk-card .v40c3-priority-text{
        font-size:.9375rem;color:var(--rk-muted);margin-top:6px;
      }
      #start .rk-card .v40c3-priority-action{
        margin-top:14px;border-radius:14px;min-height:44px;font-weight:800;
      }
    `;
    document.head.appendChild(style);
  }

  function applyClasses(){
    const hub = document.querySelector('#start .v39-home-hub');
    if (hub) hub.classList.add('rk-home-shell');

    const hero = document.querySelector('#start .v40-learning-hub-hero');
    if (hero){
      hero.classList.add('rk-hero');
      const kicker = hero.querySelector('.v40-learning-hub-kicker');
      if (kicker) kicker.classList.add('rk-eyebrow');
      const h2 = hero.querySelector('h2');
      if (h2) h2.classList.add('rk-hero-title');
      const p = hero.querySelector('p');
      if (p) p.classList.add('rk-hero-text');
    }

    const priorityCard = document.querySelector('#start .v40c3-priority-card');
    if (priorityCard) priorityCard.classList.add('rk-card', 'rk-recommend');
  }

  function run(){
    injectStyle();
    applyClasses();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, { once:true });
  } else {
    run();
  }

  // Re-apply if the hub/hero/priority card get re-rendered (e.g. sign-in state change),
  // consistent with the observer pattern already used by v571a/v57c.
  new MutationObserver(applyClasses).observe(document.body, { childList:true, subtree:true });
})();
