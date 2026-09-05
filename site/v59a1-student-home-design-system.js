/* V5.9A.1 — Student Home design-system parity layer.
   Presentation-only refinement over V5.9A. Uses the approved Year 6 dashboard
   reference as the structural design specification while delegating every action
   and every learning value to the established app owners. No data/network writes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59a1StudentHomeDesignSystemInstalled) return;
  ROOT.__v59a1StudentHomeDesignSystemInstalled = true;

  const STYLE_ID = 'v59a1-student-home-design-system-style';
  const POLISH_CLASS = 'v59a1-design-system';
  const MORE_LOGOUT_ID = 'v59a1-more-logout';
  let retryTimer = 0;
  let installed = false;

  function signedIn(){
    return typeof document !== 'undefined' &&
      !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function svgIcon(name){
    const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
    const map = {
      mixed:`<svg ${common}><path d="M5 5h4v4H5zM15 5h4M17 3v4M5 17h4M15 17h4M17 15v4M3 12h8M7 8v8M14 10l6 6M20 10l-6 6"/></svg>`,
      topic:`<svg ${common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12l7-7M16 5h3v3"/></svg>`,
      paper:`<svg ${common}><path d="M7 3h8l3 3v15H7z"/><path d="M15 3v4h4M10 11h5M10 15h5"/></svg>`,
      home:`<svg ${common}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>`,
      practice:`<svg ${common}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>`,
      progress:`<svg ${common}><path d="M5 20V10M12 20V4M19 20v-7"/></svg>`,
      badges:`<svg ${common}><path d="M12 3l2.8 5.6 6.2.9-4.5 4.4 1.1 6.1-5.6-2.9L6.4 20l1.1-6.1L3 9.5l6.2-.9z"/></svg>`,
      more:`<svg ${common}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>`,
      message:`<svg ${common}><path d="M21 14a4 4 0 01-4 4H9l-5 3v-7a7 7 0 017-7h6a4 4 0 014 4z"/></svg>`,
      settings:`<svg ${common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 00-1.7 1L5 6.1 3 9.5 5 11a7 7 0 000 2l-2 1.5 2 3.4 2.4-1a7 7 0 001.7 1l.4 3.1h5l.4-3.1a7 7 0 001.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"/></svg>`,
      clipboard:`<svg ${common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/></svg>`,
      spark:`<svg ${common}><path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></svg>`,
      chart:`<svg ${common}><path d="M4 19h16M7 16v-4M12 16V8M17 16V5"/></svg>`,
      logout:`<svg ${common}><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></svg>`
    };
    return map[name] || '';
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.${POLISH_CLASS}{
        --v59a-ink:#10205a;--v59a-muted:#526a9a;--v59a-blue:#1476ea;--v59a-purple:#6434e6;
        --v59a-green:#19c98a;--v59a-orange:#ff6b3d;--v59a-page:#f7fbff;--v59a-surface:#fff;
        --v59a-border:rgba(109,142,190,.16);--v59a-shadow:0 10px 28px rgba(36,76,132,.09);
        --v59a-radius-hero:26px;--v59a-radius-card:21px;--v59a-radius-inner:16px;--v59a-radius-icon:15px;
        --v59a-s1:4px;--v59a-s2:8px;--v59a-s3:12px;--v59a-s4:16px;--v59a-s5:20px;--v59a-s6:24px;
      }
      body.${POLISH_CLASS} #start .v59a-greeting,
      body.${POLISH_CLASS} #start .v59a-shortcut-kicker,
      body.${POLISH_CLASS} #start .v57c-continue-card h2,
      body.${POLISH_CLASS} #start .v57c-mini-card strong,
      body.${POLISH_CLASS} #start #v572-weekly-missions-card h3,
      body.${POLISH_CLASS} #start #v571b-latest-achievement h3,
      body.${POLISH_CLASS} #start #v573-class-challenge-card h3{letter-spacing:-.018em}

      body.${POLISH_CLASS} #start .v59a-hero-refresh{border-radius:var(--v59a-radius-hero)!important}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-avatar{width:82px;height:82px;border-width:5px;box-shadow:0 11px 28px rgba(29,78,216,.17)}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-greeting{font-size:clamp(28px,4vw,34px);font-weight:900;color:var(--v59a-ink)}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-year{font-size:12px;color:var(--v59a-muted)}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-level-pill{font-size:12px;padding:6px 10px;color:#213b82}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-xp-bar{height:13px;background:#dbe7f7}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-xp-bar>span{background:linear-gradient(90deg,#20bfa9,#25d38a)}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-xp-text{font-size:12px;font-weight:800;color:var(--v59a-ink)}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-profile-action{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.68);color:#17356f}
      body.${POLISH_CLASS} #start #v59a-student-profile .v59a-profile-action svg{width:22px;height:22px}

      body.${POLISH_CLASS} #start .v57c-continue-card{border-radius:var(--v59a-radius-hero)!important;min-height:205px!important;padding:23px 24px!important;background:linear-gradient(135deg,#542cd7 0%,#6f36e7 56%,#7140ef 100%)!important;box-shadow:0 18px 40px rgba(91,47,211,.26)!important}
      body.${POLISH_CLASS} #start .v57c-continue-card h2{font-size:clamp(27px,3.4vw,31px)!important;font-weight:900!important;line-height:1.08!important}
      body.${POLISH_CLASS} #start .v57c-continue-card p{font-size:14px!important;line-height:1.42!important;color:rgba(255,255,255,.9)!important}
      body.${POLISH_CLASS} #start .v57c-primary{min-height:56px!important;border-radius:999px!important;font-size:16px!important;font-weight:900!important;box-shadow:0 9px 20px rgba(40,20,96,.2)!important}
      body.${POLISH_CLASS} #start .v59a-continue-art{width:45%!important}

      body.${POLISH_CLASS} #start #v59a-practice-shortcuts{padding:12px 0 4px!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-kicker{font-size:24px!important;font-weight:900!important;color:var(--v59a-ink)!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-note{font-size:13px!important;color:var(--v59a-blue)!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-grid{gap:12px!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile{min-height:155px!important;border-radius:22px!important;padding:17px 12px 16px!important;box-shadow:0 9px 23px rgba(36,76,132,.09)!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile[data-type="mixed"]{background:linear-gradient(145deg,#a9f2d2,#dffbee)!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile[data-type="topic"]{background:linear-gradient(145deg,#a9dffc,#dff2ff)!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile[data-type="past_paper"]{background:linear-gradient(145deg,#ffd579,#fff0bd)!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon{width:58px!important;height:58px!important;border-radius:16px!important;box-shadow:0 7px 16px rgba(36,76,132,.12)!important}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon svg{width:31px;height:31px}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile[data-type="mixed"] .v59a-tile-icon{background:linear-gradient(145deg,#17cfa1,#0891b2);color:#fff}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile[data-type="topic"] .v59a-tile-icon{background:linear-gradient(145deg,#31a8ff,#1476ea);color:#fff}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile[data-type="past_paper"] .v59a-tile-icon{background:linear-gradient(145deg,#ff8055,#f45f32);color:#fff}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-main strong{font-size:16px!important;font-weight:900!important;max-width:130px!important;color:#10204e}
      body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-main span{font-size:10px!important;color:#526a82!important}

      body.${POLISH_CLASS} #start .v57c-home-grid{gap:13px!important}
      body.${POLISH_CLASS} #start .v57c-mini-card{border:1px solid var(--v59a-border)!important;border-radius:var(--v59a-radius-card)!important;padding:17px!important;box-shadow:var(--v59a-shadow)!important;min-height:166px;align-content:start}
      body.${POLISH_CLASS} #start .v57c-mini-card.v59a1-assignment-card{background:linear-gradient(145deg,#fff,#fafdff)!important}
      body.${POLISH_CLASS} #start .v57c-mini-card.v59a1-recommend-card{background:linear-gradient(145deg,#fff,#fbf6ff)!important;border-color:rgba(172,111,232,.17)!important}
      body.${POLISH_CLASS} #start .v57c-mini-card.v59a1-recent-card{background:linear-gradient(145deg,#fff,#f8fbff)!important;min-height:auto}
      body.${POLISH_CLASS} #start .v59a1-card-heading{display:flex;align-items:center;gap:9px;margin-bottom:1px}
      body.${POLISH_CLASS} #start .v59a1-card-icon{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;flex:0 0 auto;background:#eef5ff;color:#1d4ed8;box-shadow:inset 0 0 0 1px rgba(37,99,235,.08)}
      body.${POLISH_CLASS} #start .v59a1-recommend-card .v59a1-card-icon{background:#f4eaff;color:#7c3aed}
      body.${POLISH_CLASS} #start .v59a1-recent-card .v59a1-card-icon{background:#ecfdf5;color:#059669}
      body.${POLISH_CLASS} #start .v59a1-card-icon svg{width:21px;height:21px}
      body.${POLISH_CLASS} #start .v59a1-card-heading .v57c-mini-kicker{font-size:16px!important;font-weight:900!important;letter-spacing:-.01em!important;text-transform:none!important;color:var(--v59a-ink)!important}
      body.${POLISH_CLASS} #start .v57c-mini-card>strong{font-size:15px!important;color:#16275b;line-height:1.25}
      body.${POLISH_CLASS} #start .v57c-mini-card>p{font-size:11px!important;line-height:1.4;color:var(--v59a-muted)!important}
      body.${POLISH_CLASS} #start .v57c-mini-card button{border:0!important;background:transparent!important;color:var(--v59a-blue)!important;padding:5px 0!important;min-height:30px!important;font-size:11px!important;font-weight:800!important}

      body.${POLISH_CLASS} #start #v572-weekly-missions-card,
      body.${POLISH_CLASS} #start #v571b-latest-achievement{border-radius:var(--v59a-radius-card)!important;padding:17px!important;box-shadow:var(--v59a-shadow)!important;min-height:215px!important;background:#fff!important}
      body.${POLISH_CLASS} #start #v572-weekly-missions-card{border-color:rgba(35,198,135,.16)!important}
      body.${POLISH_CLASS} #start #v571b-latest-achievement{background:linear-gradient(145deg,#fff,#fdf8ff)!important;border-color:rgba(137,78,220,.16)!important}
      body.${POLISH_CLASS} #start #v572-weekly-missions-card .v59a-mission-streak{font-size:25px!important;color:#f0522d!important;font-weight:900!important}
      body.${POLISH_CLASS} #start #v572-weekly-missions-card .v572-mini-progress{height:10px!important;border-radius:999px!important;background:#dfe7f2!important}
      body.${POLISH_CLASS} #start #v572-weekly-missions-card .v572-mini-progress>span{background:linear-gradient(90deg,#17c98a,#31d69d)!important;border-radius:inherit!important}
      body.${POLISH_CLASS} #start #v571b-latest-achievement .v571b-achievement-icon{width:74px!important;height:74px!important;border-radius:20px!important;background:linear-gradient(145deg,#7541e8,#a345e6 58%,#f4b83f)!important;color:#ffe15d!important;box-shadow:0 9px 20px rgba(110,53,205,.2)!important}

      body.${POLISH_CLASS} #start #v573-class-challenge-card{border-radius:var(--v59a-radius-card)!important;min-height:170px!important;padding:18px 158px 18px 19px!important;background:linear-gradient(145deg,#f2fbff,#e2f3ff 60%,#fff)!important;box-shadow:var(--v59a-shadow)!important}
      body.${POLISH_CLASS} #start #v573-class-challenge-card .v573-bar{height:12px!important;border-radius:999px!important;background:#dce7f5!important}
      body.${POLISH_CLASS} #start #v573-class-challenge-card .v573-bar>span{background:linear-gradient(90deg,#1780ef,#44b6f6)!important;border-radius:inherit!important}

      body.${POLISH_CLASS} #v59a-mobile-nav{height:82px!important;padding-top:8px!important;background:rgba(255,255,255,.97)!important;border-top:1px solid rgba(109,142,190,.17)!important;box-shadow:0 -8px 26px rgba(36,76,132,.09)!important}
      body.${POLISH_CLASS} #v59a-mobile-nav button{font-size:11px!important;font-weight:650!important;color:#435478!important;gap:5px!important}
      body.${POLISH_CLASS} #v59a-mobile-nav button span:first-child{width:28px;height:28px;display:grid;place-items:center!important;font-size:0!important}
      body.${POLISH_CLASS} #v59a-mobile-nav button span:first-child svg{width:25px;height:25px}
      body.${POLISH_CLASS} #v59a-mobile-nav button[aria-current="page"]{color:var(--v59a-blue)!important;font-weight:800!important}
      body.${POLISH_CLASS} #v59a-more-sheet .v59a-more-card{border-radius:24px 24px 18px 18px!important;padding:18px!important}
      body.${POLISH_CLASS} #v59a-more-sheet .v59a-more-action{min-height:52px!important;border-radius:15px!important;display:flex;align-items:center;gap:11px!important}
      body.${POLISH_CLASS} #v59a-more-sheet .v59a-more-action svg{width:21px;height:21px}
      body.${POLISH_CLASS} #${MORE_LOGOUT_ID}{color:#b42318!important;background:#fff7f6!important;border-color:rgba(180,35,24,.16)!important}

      @media(max-width:760px){
        body.${POLISH_CLASS}{background:#eef8ff!important;padding-bottom:90px!important}
        body.${POLISH_CLASS} .shell{width:min(520px,100%)!important;margin:0 auto!important;padding-bottom:8px!important}
        body.${POLISH_CLASS} #start.v40-shell-authenticated[data-v40-start-view="home"]{background:#fff!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0 15px 20px!important}
        body.${POLISH_CLASS} #start.v40-shell-authenticated[data-v40-start-view="home"]>.header{display:none!important}
        body.${POLISH_CLASS} #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-learning-hub-hero.v59a-hero-refresh{margin-left:-15px!important;margin-right:-15px!important;border-radius:0!important}
        body.${POLISH_CLASS} #start #v59a-student-profile{grid-template-columns:74px minmax(0,1fr) auto!important;gap:13px!important;padding:18px 16px 90px!important;min-height:225px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-avatar{width:74px!important;height:74px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-greeting{font-size:29px!important;line-height:1!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-year{font-size:10px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-level-pill{font-size:11px!important;padding:5px 8px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-xp-bar{height:12px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-xp-text{font-size:11px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-profile-action{width:40px!important;height:40px!important}
        body.${POLISH_CLASS} #start .v59a-profile-mountains{width:250px!important;height:135px!important}
        body.${POLISH_CLASS} #start .v59a-profile-motto{font-size:15px!important;right:19px!important;bottom:24px!important}

        body.${POLISH_CLASS} #start .v57c-continue-card{margin-top:-58px!important;min-height:210px!important;padding:22px 20px!important;border-radius:25px!important}
        body.${POLISH_CLASS} #start .v57c-continue-card>div:first-child{max-width:72%!important}
        body.${POLISH_CLASS} #start .v57c-continue-card h2{font-size:27px!important}
        body.${POLISH_CLASS} #start .v57c-continue-card p{font-size:13px!important}
        body.${POLISH_CLASS} #start .v57c-primary{width:62%!important;min-height:55px!important;font-size:16px!important}
        body.${POLISH_CLASS} #start .v59a-continue-slogan{font-size:13px!important;right:9px!important;top:16px!important}

        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile{min-height:150px!important;padding:15px 7px 14px!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-main span{display:none!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-main strong{font-size:14px!important;line-height:1.12!important;max-width:105px!important}

        body.${POLISH_CLASS} #start .v57c-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:11px!important}
        body.${POLISH_CLASS} #start .v57c-mini-card{min-height:158px!important;padding:14px!important}
        body.${POLISH_CLASS} #start .v57c-mini-card.v59a1-recent-card{display:none!important}
        body.${POLISH_CLASS} #start .v59a1-card-heading .v57c-mini-kicker{font-size:15px!important}
        body.${POLISH_CLASS} #start .v59a1-card-icon{width:36px;height:36px;border-radius:12px}
        body.${POLISH_CLASS} #start .v57c-mini-card>strong{font-size:13px!important}
        body.${POLISH_CLASS} #start .v57c-mini-card>p{font-size:10px!important}

        body.${POLISH_CLASS} #start #v572-weekly-missions-card,
        body.${POLISH_CLASS} #start #v571b-latest-achievement{min-height:204px!important;padding:14px!important}
        body.${POLISH_CLASS} #start #v572-weekly-missions-card .v59a-mission-streak{font-size:24px!important}
        body.${POLISH_CLASS} #start #v573-class-challenge-card{min-height:165px!important;padding-right:122px!important}
        body.${POLISH_CLASS} #start #v573-class-challenge-card::after{font-size:58px!important;right:27px!important}
        body.${POLISH_CLASS} #start #v573-class-challenge-card::before{font-size:11px!important;width:96px!important;right:5px!important}
        body.${POLISH_CLASS} #start .v57c-secondary{display:none!important}
      }

      @media(max-width:430px){
        body.${POLISH_CLASS} #start #v59a-student-profile{grid-template-columns:66px minmax(0,1fr) auto!important;padding-left:12px!important;padding-right:12px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-avatar{width:66px!important;height:66px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-greeting{font-size:26px!important}
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-profile-action{width:36px!important;height:36px!important}
        body.${POLISH_CLASS} #start .v57c-continue-card h2{font-size:24px!important}
        body.${POLISH_CLASS} #start .v57c-continue-card p{font-size:11px!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile{min-height:138px!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon{width:50px!important;height:50px!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-tile-main strong{font-size:12px!important}
      }

      @media(max-width:350px){
        body.${POLISH_CLASS} #start #v59a-student-profile .v59a-profile-actions{display:none!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-note{display:none!important}
        body.${POLISH_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile{min-height:126px!important}
      }

      @media(prefers-reduced-motion:reduce){
        body.${POLISH_CLASS} #start *,body.${POLISH_CLASS} #v59a-mobile-nav *{scroll-behavior:auto!important;transition:none!important;animation:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function decorateProfile(){
    const profile = document.getElementById('v59a-student-profile');
    if (!profile) return false;
    profile.dataset.v59a1DesignSystem = 'true';
    const feedback = profile.querySelector('[data-v59a-profile-action="feedback"]');
    const more = profile.querySelector('[data-v59a-profile-action="more"]');
    if (feedback && feedback.dataset.v59a1Icon !== 'true'){
      feedback.innerHTML = svgIcon('message');
      feedback.dataset.v59a1Icon = 'true';
    }
    if (more && more.dataset.v59a1Icon !== 'true'){
      more.innerHTML = svgIcon('settings');
      more.dataset.v59a1Icon = 'true';
    }
    return true;
  }

  function decorateQuickActions(){
    const types = {mixed:'mixed',topic:'topic',past_paper:'paper'};
    let count = 0;
    Object.entries(types).forEach(([type,iconName])=>{
      const tile = document.querySelector(`#v59a-practice-shortcuts .v59a-practice-tile[data-type="${type}"]`);
      const icon = tile?.querySelector('.v59a-tile-icon');
      if (!tile || !icon) return;
      tile.dataset.v59a1DesignSystem = 'true';
      if (icon.dataset.v59a1Icon !== 'true'){
        icon.innerHTML = svgIcon(iconName);
        icon.dataset.v59a1Icon = 'true';
      }
      count += 1;
    });
    return count === 3;
  }

  function wrapCardHeading(card,kind,index){
    if (!card || card.querySelector('.v59a1-card-heading')) return;
    const kicker = card.querySelector('.v57c-mini-kicker');
    if (!kicker) return;
    const heading = document.createElement('div');
    heading.className = 'v59a1-card-heading';
    const icon = document.createElement('span');
    icon.className = 'v59a1-card-icon';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML = svgIcon(kind === 'assignment' ? 'clipboard' : kind === 'recommend' ? 'spark' : 'chart');
    kicker.before(heading);
    heading.append(icon,kicker);
    card.dataset.v59a1Index = String(index);
  }

  function decorateMiniCards(){
    const cards = [...document.querySelectorAll('#start .v57c-home-grid .v57c-mini-card')];
    if (!cards.length) return false;
    const kinds = ['assignment','recommend','recent'];
    cards.forEach((card,index)=>{
      const kind = kinds[index] || 'recent';
      card.classList.add(`v59a1-${kind}-card`);
      wrapCardHeading(card,kind,index);
      const button = card.querySelector('button');
      if (button && button.dataset.v59a1Label !== 'true'){
        if (kind === 'assignment') button.textContent = 'View assignments ›';
        if (kind === 'recommend' && !button.disabled) button.textContent = 'Open next step ›';
        if (kind === 'recent') button.textContent = button.classList.contains('v57c-result') ? 'View result ›' : 'View progress ›';
        button.dataset.v59a1Label = 'true';
      }
    });
    return true;
  }

  function decorateBottomNav(){
    const nav = document.getElementById('v59a-mobile-nav');
    if (!nav) return false;
    const icons = {home:'home',practice:'practice',progress:'progress',badges:'badges',more:'more'};
    Object.entries(icons).forEach(([key,iconName])=>{
      const button = nav.querySelector(`[data-v59a-nav="${key}"]`);
      const icon = button?.querySelector('span:first-child');
      if (!button || !icon || icon.dataset.v59a1Icon === 'true') return;
      icon.innerHTML = svgIcon(iconName);
      icon.dataset.v59a1Icon = 'true';
    });
    return true;
  }

  function decorateMoreSheet(){
    const sheet = document.getElementById('v59a-more-sheet');
    if (!sheet) return false;
    const existing = sheet.querySelectorAll('.v59a-more-action');
    existing.forEach(button=>{
      if (button.dataset.v59a1Decorated === 'true') return;
      const key = button.dataset.v59aMore;
      const name = key === 'assignments' ? 'clipboard' : key === 'reviewed' ? 'chart' : 'message';
      const text = button.textContent.replace(/^[^A-Za-z]+/,'').trim();
      button.innerHTML = `${svgIcon(name)}<span>${text}</span>`;
      button.dataset.v59a1Decorated = 'true';
    });
    const card = sheet.querySelector('.v59a-more-card');
    if (card && !document.getElementById(MORE_LOGOUT_ID)){
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.id = MORE_LOGOUT_ID;
      logout.className = 'v59a-more-action';
      logout.innerHTML = `${svgIcon('logout')}<span>Sign out</span>`;
      card.appendChild(logout);
    }
    return true;
  }

  function decorateSupportingWidgets(){
    document.getElementById('v572-weekly-missions-card')?.setAttribute('data-v59a1-widget','weekly-missions');
    document.getElementById('v571b-latest-achievement')?.setAttribute('data-v59a1-widget','latest-badge');
    document.getElementById('v573-class-challenge-card')?.setAttribute('data-v59a1-widget','class-challenge');
  }

  function apply(){
    injectStyles();
    if (!signedIn()){
      document.body?.classList.remove(POLISH_CLASS);
      return false;
    }
    if (!document.getElementById('v59a-student-profile') || !document.getElementById('v59a-mobile-nav')) return false;
    document.body?.classList.add(POLISH_CLASS);
    decorateProfile();
    decorateQuickActions();
    decorateMiniCards();
    decorateBottomNav();
    decorateMoreSheet();
    decorateSupportingWidgets();
    window.dispatchEvent(new CustomEvent('v59a1:design-system-applied'));
    return true;
  }

  function scheduleApply(attempt=0){
    if (typeof window === 'undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(()=>{
      retryTimer = 0;
      const ok = apply();
      if (!ok && signedIn() && attempt < 50) scheduleApply(attempt+1);
    },attempt ? 120 : 35);
  }

  function wire(){
    if (installed || typeof document === 'undefined') return installed;
    installed = true;
    injectStyles();
    ['v59a:home-refreshed','v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']
      .forEach(name=>window.addEventListener(name,()=>scheduleApply()));
    window.addEventListener('pageshow',()=>scheduleApply());
    window.addEventListener('focus',()=>scheduleApply());
    document.addEventListener('click',event=>{
      if (event.target?.closest?.(`#${MORE_LOGOUT_ID}`)){
        event.preventDefault();
        document.getElementById('v40c-student-logout')?.click();
        document.body?.classList.remove(POLISH_CLASS);
      }
      if (event.target?.closest?.('[data-v59a-profile-action="more"],[data-v59a-nav="more"]')) window.setTimeout(()=>decorateMoreSheet(),40);
      if (event.target?.closest?.('#v40c-student-logout')) document.body?.classList.remove(POLISH_CLASS);
    },true);
    scheduleApply();
    return true;
  }

  const api = Object.freeze({
    STYLE_ID,POLISH_CLASS,signedIn,svgIcon,decorateProfile,decorateQuickActions,
    decorateMiniCards,decorateBottomNav,decorateMoreSheet,apply
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59A1StudentHomeDesignSystem',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();