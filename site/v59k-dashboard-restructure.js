/* V5.9K — Dashboard restructure.
   Reorganises My Progress (student-dashboard) for Year 4–6 students:
   - Promotes Recommended Practice to a prominent hero card at the top
   - Keeps stat pills, streak/journey, messages and achievements always visible
   - Collapses Strengths, Focus Areas and Recent Activity behind a "See more" toggle
   No changes to grading, data, auth or network. Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59kDashboardRestructureInstalled) return;
  ROOT.__v59kDashboardRestructureInstalled = true;

  const STYLE_ID   = 'v59k-dashboard-style';
  const TOGGLE_ID  = 'v59k-see-more-toggle';
  const DRAWER_ID  = 'v59k-collapsible-drawer';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* ── Hero: Recommended Practice ─────────────────────────────── */
      #student-dashboard .v59k-recommendation-hero {
        margin: 16px 0 4px;
        padding: 20px;
        border-radius: 20px;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--primary, #3b82f6) 9%, var(--card, #fff)),
          color-mix(in srgb, var(--primary, #3b82f6) 5%, var(--card, #fff)));
        border: 1.5px solid color-mix(in srgb, var(--primary, #3b82f6) 22%, var(--border, #e2e8f0));
      }
      #student-dashboard .v59k-hero-kicker {
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--primary, #3b82f6);
        margin-bottom: 6px;
      }
      #student-dashboard .v59k-hero-inner {
        /* Leave recommendation content as-is — just re-wrap it */
      }

      /* ── Collapsible drawer ──────────────────────────────────────── */
      #${DRAWER_ID} {
        overflow: hidden;
        max-height: 0;
        transition: max-height 0.35s ease;
      }
      #${DRAWER_ID}.v59k-open {
        max-height: 4000px; /* large enough for any content */
      }

      /* ── Toggle button ───────────────────────────────────────────── */
      #${TOGGLE_ID} {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 44px;
        margin: 14px 0 4px;
        padding: 10px 18px;
        border-radius: 14px;
        border: 1px solid var(--border, #e2e8f0);
        background: var(--surface-muted, #f8fafc);
        color: var(--muted, #64748b);
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        transition: background 0.15s;
      }
      #${TOGGLE_ID}:hover {
        background: var(--surface-control, #eef2f7);
        color: var(--text, #1e293b);
      }
      #${TOGGLE_ID} .v59k-arrow {
        font-size: 11px;
        transition: transform 0.25s;
      }
      #${TOGGLE_ID}.v59k-open .v59k-arrow {
        transform: rotate(180deg);
      }
    `;
    document.head.appendChild(s);
  }

  function restructure() {
    const dashboard = byId('student-dashboard');
    if (!dashboard || byId(TOGGLE_ID)) return false; // already done

    injectStyles();

    // ── 1. Promote Recommendation section to hero ────────────────────────
    const recSection = dashboard.querySelector('.analytics-section:has(#student-practice-recommendation)');
    const recDiv     = byId('student-practice-recommendation');
    const summaryDiv = byId('student-dashboard-summary');

    if (recSection && recDiv && summaryDiv) {
      // Build hero wrapper
      const hero = document.createElement('div');
      hero.className = 'v59k-recommendation-hero';
      hero.innerHTML = '<div class="v59k-hero-kicker">🎯 Recommended for you</div>';
      const inner = document.createElement('div');
      inner.className = 'v59k-hero-inner';

      // Move recommendation content into hero
      inner.appendChild(recDiv);
      hero.appendChild(inner);

      // Remove original section and insert hero right after stat pills
      recSection.remove();
      summaryDiv.insertAdjacentElement('afterend', hero);
    }

    // ── 2. Collapse lower analytics sections ─────────────────────────────
    // Sections to collapse: Strengths, Focus Areas, Recent Activity
    const collapsible = Array.from(
      dashboard.querySelectorAll('.analytics-section:not(.student-motivation-section)')
    ).filter(s =>
      s.querySelector('#student-progress-strengths, #student-progress-focus, #student-progress-recent')
    );

    if (collapsible.length) {
      const drawer = document.createElement('div');
      drawer.id = DRAWER_ID;

      // Move each section into the drawer
      collapsible.forEach(s => drawer.appendChild(s));

      // Build toggle button
      const toggle = document.createElement('button');
      toggle.id   = TOGGLE_ID;
      toggle.type = 'button';
      toggle.innerHTML = '<span class="v59k-label">See more: Strengths &amp; Recent Activity</span><span class="v59k-arrow">▼</span>';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', DRAWER_ID);

      toggle.addEventListener('click', () => {
        const open = drawer.classList.toggle('v59k-open');
        toggle.classList.toggle('v59k-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('.v59k-label').textContent = open
          ? 'Show less'
          : 'See more: Strengths & Recent Activity';
      });

      // Insert toggle + drawer before the closing tag of the motivation section
      const motivSection = dashboard.querySelector('.student-motivation-section');
      if (motivSection) {
        motivSection.insertAdjacentElement('afterend', toggle);
        toggle.insertAdjacentElement('afterend', drawer);
      } else {
        // Fallback: append to dashboard
        dashboard.appendChild(toggle);
        dashboard.appendChild(drawer);
      }
    }

    return true;
  }

  function tryInit() {
    if (restructure()) return;
    // Dashboard may not be in the DOM yet — retry when Progress nav is clicked
    document.addEventListener('click', e => {
      if (e.target?.closest('[data-v40-nav="progress"]')) {
        setTimeout(restructure, 350);
      }
    }, { passive: true });
    // Also try on the home-updated event
    window.addEventListener('v57c:home-updated', () => setTimeout(restructure, 400));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  } else {
    tryInit();
  }
})();
