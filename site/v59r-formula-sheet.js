/* V5.9R — PSR Formula & Reference Sheet.
   A modal overlay showing Year 4–6 Brunei PSR formulas, unit conversions,
   angle rules and geometry facts. Accessible from the quiz screen toolbar
   and the student home. No data, grading or network changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59rFormulaSheetInstalled) return;
  ROOT.__v59rFormulaSheetInstalled = true;

  const STYLE_ID   = 'v59r-formula-style';
  const OVERLAY_ID = 'v59r-formula-overlay';
  const BTN_CLASS  = 'v59r-formula-btn';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  const SECTIONS = [
    {
      title: '📏 Metric Conversions',
      color: '#3b82f6',
      items: [
        'Length: 1 km = 1,000 m · 1 m = 100 cm · 1 cm = 10 mm',
        'Mass: 1 kg = 1,000 g · ½ kg = 500 g · ¼ kg = 250 g',
        'Capacity: 1 L = 1,000 mL · ½ L = 500 mL · ¼ L = 250 mL',
        'Time: 1 h = 60 min · 1 min = 60 s · 1 day = 24 h · 1 week = 7 days',
      ],
    },
    {
      title: '📐 Perimeter & Area',
      color: '#10b981',
      items: [
        'Rectangle: P = 2 × (l + w) · A = l × w',
        'Square: P = 4 × s · A = s × s',
        'Triangle: A = ½ × b × h',
        'Composite shapes: Split into rectangles/triangles, add areas',
      ],
    },
    {
      title: '📐 Volume',
      color: '#8b5cf6',
      items: [
        'Cuboid: V = l × w × h',
        'Cube: V = s × s × s',
        '1 cm³ = 1 mL · 1,000 cm³ = 1 L',
      ],
    },
    {
      title: '🔢 Fractions, Decimals & %',
      color: '#f59e0b',
      items: [
        'Equivalent fractions: multiply/divide top & bottom by same number',
        'Simplest form: divide by HCF',
        '½ = 0.5 = 50% · ¼ = 0.25 = 25% · ¾ = 0.75 = 75%',
        '⅕ = 0.2 = 20% · ⅛ = 0.125 = 12.5% · ⅔ ≈ 0.667 ≈ 66.7%',
        'Percentage of amount: value ÷ total × 100',
        'Discount: Original price × (discount % ÷ 100)',
      ],
    },
    {
      title: '📐 Angles',
      color: '#f43f5e',
      items: [
        'Angles on a straight line = 180°',
        'Angles at a point = 360°',
        'Right angle = 90° · Straight = 180° · Full turn = 360°',
        'Triangle angles sum = 180°',
        'Quadrilateral angles sum = 360°',
        'Acute: < 90° · Obtuse: 90°–180° · Reflex: > 180°',
      ],
    },
    {
      title: '📊 Statistics',
      color: '#06b6d4',
      items: [
        'Mean = sum of all values ÷ number of values',
        'Mode = value that appears most often',
        'Median = middle value when sorted',
        'Range = largest − smallest',
      ],
    },
    {
      title: '💰 Money & Ratio',
      color: '#84cc16',
      items: [
        'Ratio a : b → a/(a+b) and b/(a+b) of total',
        'Ratio 3 : 2 → 3 parts + 2 parts = 5 equal parts',
        'Profit = Selling price − Cost price',
        'Loss = Cost price − Selling price',
        '% profit/loss = profit or loss ÷ cost price × 100',
      ],
    },
  ];

  function injectStyles() {
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 9960;
        background: rgba(15,23,42,.65); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      #${OVERLAY_ID} .v59r-card {
        background: var(--card,#fff); border: 1px solid var(--border,#e2e8f0);
        border-radius: 22px; padding: 22px 20px; width: min(580px,100%);
        max-height: 88vh; overflow-y: auto;
        box-shadow: 0 24px 70px rgba(0,0,0,.2);
        display: flex; flex-direction: column; gap: 14px;
      }
      #${OVERLAY_ID} .v59r-header {
        display: flex; justify-content: space-between; align-items: center;
        position: sticky; top: -22px; background: var(--card,#fff);
        padding: 4px 0; z-index: 1;
      }
      #${OVERLAY_ID} .v59r-title { font-size: 16px; font-weight: 900; margin: 0; }
      #${OVERLAY_ID} .v59r-close {
        background: var(--soft,#eaf2ff); border: none; border-radius: 9px;
        width: 32px; height: 32px; cursor: pointer; font-size: 15px; flex-shrink: 0;
      }
      #${OVERLAY_ID} .v59r-section {
        border-radius: 14px; overflow: hidden;
        border: 1px solid var(--border,#e2e8f0);
      }
      #${OVERLAY_ID} .v59r-section-head {
        padding: 9px 14px; font-size: 13px; font-weight: 900; color: #fff;
      }
      #${OVERLAY_ID} .v59r-items { padding: 10px 14px; display: grid; gap: 6px; }
      #${OVERLAY_ID} .v59r-item {
        font-size: 12.5px; color: var(--text,#172033); line-height: 1.5;
        padding-left: 12px; border-left: 2px solid var(--border,#e2e8f0);
      }
      .${BTN_CLASS} {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 800;
        background: color-mix(in srgb, #8b5cf6 15%, var(--card,#fff));
        border: 1.5px solid color-mix(in srgb, #8b5cf6 35%, var(--border,#e2e8f0));
        color: #5b21b6; cursor: pointer; white-space: nowrap;
      }
      html[data-theme="dark"] .${BTN_CLASS} { color: #c4b5fd; }
      .${BTN_CLASS}:hover { background: color-mix(in srgb, #8b5cf6 22%, var(--card,#fff)); }
    `;
    document.head.appendChild(s);
  }

  ROOT.__v59rClose = () => byId(OVERLAY_ID)?.remove();
  ROOT.__v59rOpen  = () => {
    if (byId(OVERLAY_ID)) return;
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.addEventListener('click', e => { if (e.target === overlay) ROOT.__v59rClose(); });
    const sectionsHtml = SECTIONS.map(sec => `
      <div class="v59r-section">
        <div class="v59r-section-head" style="background:${sec.color}">${sec.title}</div>
        <div class="v59r-items">
          ${sec.items.map(item => `<div class="v59r-item" style="border-color:${sec.color}40">${item}</div>`).join('')}
        </div>
      </div>`).join('');
    overlay.innerHTML = `
      <div class="v59r-card">
        <div class="v59r-header">
          <p class="v59r-title">📋 PSR Formula & Reference Sheet</p>
          <button class="v59r-close" onclick="window.__v59rClose()">✕</button>
        </div>
        <p style="font-size:11px;color:var(--muted);margin:0">
          Quick reference for Year 4–6 PSR Mathematics. Tap any section to review.
        </p>
        ${sectionsHtml}
      </div>`;
    document.body.appendChild(overlay);
  };

  function insertButton(parentSelector, beforeSelector) {
    if (typeof document === 'undefined') return;
    const parent = document.querySelector(parentSelector);
    if (!parent || parent.querySelector('.'+BTN_CLASS)) return;
    injectStyles();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.innerHTML = '📋 Formulas';
    btn.onclick = () => ROOT.__v59rOpen();
    const ref = beforeSelector ? parent.querySelector(beforeSelector) : null;
    ref ? parent.insertBefore(btn, ref) : parent.appendChild(btn);
  }

  function init() {
    if (typeof document === 'undefined') return;
    const tryInsert = () => {
      insertButton('#quiz .buttons', '#quit-btn');
      insertButton('#start .v40c3-home-dashboard', null);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryInsert, { once: true });
    } else {
      tryInsert();
    }
    if (typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(tryInsert);
      const quiz = document.getElementById('quiz');
      if (quiz) obs.observe(quiz, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    }
  }

  init();
})();
