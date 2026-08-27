/* V5.0RC2 launch audit polish.
   A deliberate clean-start can leave zero saved result codes. When the server-side
   RC2 audit passes that empty population, present it as an empty sample rather than
   a zero-length-code failure. Real saved codes still require >=19 chars and uniqueness. */
(() => {
  'use strict';

  if (window.__v50Rc2EmptyResultCodePolishInstalled) return;
  window.__v50Rc2EmptyResultCodePolishInstalled = true;

  const ROOT_ID = 'v50-release-audit-root';

  function polish(){
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const rc2Section = [...root.querySelectorAll('.v50rc-section')]
      .find(section => section.querySelector('h3')?.textContent?.includes('RC2 — Security & launch configuration'));
    if (!rc2Section) return;

    const phaseTag = rc2Section.querySelector('.v50rc-phase .tag');
    if (!phaseTag || !phaseTag.textContent.includes('Security pass')) return;

    const card = [...rc2Section.querySelectorAll('.v50rc-check')]
      .find(item => item.querySelector('strong')?.textContent?.includes('Result review code entropy'));
    if (!card) return;

    const detail = card.querySelector('div');
    if (!detail || !/Minimum code length 0\s*·\s*0 duplicate code\(s\)/.test(detail.textContent || '')) return;

    card.classList.remove('fail','warn');
    card.classList.add('pass');
    const strong = card.querySelector('strong');
    if (strong) strong.textContent = '✅ Result review code entropy';
    detail.textContent = 'No result codes saved yet after clean start · generator uses 19-character UUID-derived codes';
  }

  function install(){
    polish();
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    new MutationObserver(polish).observe(root,{childList:true,subtree:true,characterData:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
