/* V5.9S — Bilingual Math Keywords Helper.
   A searchable modal glossary of PSR Mathematics key terms in English and
   Bahasa Melayu. Accessible from the quiz screen toolbar. Students can search
   by English term, Malay term or keyword in the definition.
   No grading, network or data changes. Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59sMathKeywordsInstalled) return;
  ROOT.__v59sMathKeywordsInstalled = true;

  const STYLE_ID   = 'v59s-keywords-style';
  const OVERLAY_ID = 'v59s-keywords-overlay';
  const BTN_CLASS  = 'v59s-keywords-btn';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const KEYWORDS = [
    { en:'Difference',     ms:'Beza',              def:'Result of subtracting the smaller from the larger.',    eg:'18 − 12 = 6' },
    { en:'Total / Sum',    ms:'Jumlah / Hasil Tambah', def:'Result when two or more numbers are added.',      eg:'$45 + $20 = $65' },
    { en:'Product',        ms:'Hasil Darab',        def:'The answer when numbers are multiplied.',              eg:'6 × 8 = 48' },
    { en:'Quotient',       ms:'Hasil Bahagi',       def:'The answer when one number is divided by another.',    eg:'48 ÷ 6 = 8' },
    { en:'Remainder',      ms:'Baki',               def:'What is left over after equal division.',              eg:'13 ÷ 4 = 3 rem 1' },
    { en:'Perimeter',      ms:'Perimeter / Ukur Lilit', def:'Total distance around the outside of a shape.',  eg:'4+6+4+6 = 20 cm' },
    { en:'Area',           ms:'Luas',               def:'Space inside a flat shape (cm² or m²).',              eg:'5 × 3 = 15 cm²' },
    { en:'Volume',         ms:'Isipadu',            def:'Space inside a 3D shape (cm³).',                      eg:'4 × 3 × 2 = 24 cm³' },
    { en:'Equivalent Fraction', ms:'Pecahan Setara', def:'Fractions that look different but have the same value.', eg:'1/2 = 2/4 = 3/6' },
    { en:'Simplest Form',  ms:'Bentuk Termudah',    def:'Fraction where numerator and denominator share no common factor except 1.', eg:'18/24 → 3/4' },
    { en:'Numerator',      ms:'Pengangka',          def:'The top number of a fraction.',                        eg:'In 3/4, the numerator is 3' },
    { en:'Denominator',    ms:'Penyebut',           def:'The bottom number of a fraction.',                     eg:'In 3/4, the denominator is 4' },
    { en:'Ratio',          ms:'Nisbah',             def:'Comparison between two or more quantities using ":".',  eg:'3 : 2' },
    { en:'Percentage',     ms:'Peratus',            def:'Parts per 100; shown with the % symbol.',              eg:'75% = 75/100 = ¾' },
    { en:'Discount',       ms:'Diskaun',            def:'Reduction from the original price.',                   eg:'20% off $50 → save $10' },
    { en:'Mean / Average', ms:'Min / Purata',       def:'Sum of all values ÷ number of values.',               eg:'(80+70+90)÷3 = 80' },
    { en:'Mode',           ms:'Mod',                def:'The value that appears most often in a data set.',     eg:'In 2,3,3,4 → mode is 3' },
    { en:'Median',         ms:'Median',             def:'The middle value when data is in order.',              eg:'1,3,5,7,9 → median is 5' },
    { en:'Range',          ms:'Julat',              def:'Difference between the largest and smallest value.',   eg:'9 − 1 = 8' },
    { en:'Straight Line Angle', ms:'Sudut Garis Lurus', def:'Angles on a straight line add up to 180°.',     eg:'128° + x = 180°, x = 52°' },
    { en:'Right Angle',    ms:'Sudut Tepat',        def:'An angle of exactly 90°.',                            eg:'Corner of a square' },
    { en:'Acute Angle',    ms:'Sudut Tirus',        def:'An angle less than 90°.',                             eg:'45°' },
    { en:'Obtuse Angle',   ms:'Sudut Cakah',        def:'An angle between 90° and 180°.',                      eg:'120°' },
    { en:'Reflex Angle',   ms:'Sudut Refleks',      def:'An angle greater than 180°.',                         eg:'270°' },
    { en:'Symmetry',       ms:'Simetri',            def:'A shape has symmetry if it looks the same after reflection.', eg:'Square has 4 lines of symmetry' },
    { en:'Perpendicular',  ms:'Berserenjang',       def:'Lines that meet at a right angle (90°).',             eg:'⊥' },
    { en:'Parallel',       ms:'Selari',             def:'Lines that are always the same distance apart and never meet.', eg:'= =' },
    { en:'Factor',         ms:'Faktor',             def:'A number that divides exactly into another number.',   eg:'Factors of 12: 1,2,3,4,6,12' },
    { en:'Multiple',       ms:'Gandaan',            def:'Result of multiplying a number by a whole number.',   eg:'Multiples of 4: 4,8,12,16…' },
    { en:'Prime Number',   ms:'Nombor Perdana',     def:'A number with exactly two factors: 1 and itself.',    eg:'2, 3, 5, 7, 11, 13…' },
  ];

  function injectStyles() {
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 9965;
        background: rgba(15,23,42,.65); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      #${OVERLAY_ID} .v59s-card {
        background: var(--card,#fff); border: 1px solid var(--border,#e2e8f0);
        border-radius: 22px; padding: 22px 20px; width: min(500px,100%);
        max-height: 88vh; overflow-y: auto;
        box-shadow: 0 24px 70px rgba(0,0,0,.2);
        display: flex; flex-direction: column; gap: 12px;
      }
      #${OVERLAY_ID} .v59s-header {
        display: flex; justify-content: space-between; align-items: center;
        position: sticky; top: -22px; background: var(--card,#fff); padding: 4px 0; z-index: 1;
      }
      #${OVERLAY_ID} .v59s-title { font-size: 16px; font-weight: 900; margin: 0; }
      #${OVERLAY_ID} .v59s-close {
        background: var(--soft,#eaf2ff); border: none; border-radius: 9px;
        width: 32px; height: 32px; cursor: pointer; font-size: 15px; flex-shrink: 0;
      }
      #${OVERLAY_ID} .v59s-search {
        width: 100%; min-height: 40px; padding: 9px 12px;
        border: 1.5px solid var(--border,#e2e8f0); border-radius: 12px;
        font-size: 14px; background: #fff; color: var(--text,#172033);
      }
      #${OVERLAY_ID} .v59s-list { display: grid; gap: 8px; }
      #${OVERLAY_ID} .v59s-item {
        border: 1px solid var(--border,#e2e8f0); border-radius: 12px; padding: 12px 14px;
        background: #f8fafc;
      }
      #${OVERLAY_ID} .v59s-terms {
        display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 4px;
      }
      #${OVERLAY_ID} .v59s-en { font-size: 14px; font-weight: 900; color: var(--text,#172033); }
      #${OVERLAY_ID} .v59s-ms {
        font-size: 12px; font-weight: 700; color: var(--primary,#2563eb);
        background: var(--soft,#eaf2ff); padding: 2px 7px; border-radius: 99px;
      }
      #${OVERLAY_ID} .v59s-def { font-size: 12.5px; color: var(--muted,#667085); margin: 0 0 3px; }
      #${OVERLAY_ID} .v59s-eg  { font-size: 11.5px; color: #16713d; font-weight: 700; }
      #${OVERLAY_ID} .v59s-empty { text-align: center; color: var(--muted,#667085); padding: 20px; font-size: 13px; }
      .${BTN_CLASS} {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 800;
        background: color-mix(in srgb, #06b6d4 15%, var(--card,#fff));
        border: 1.5px solid color-mix(in srgb, #06b6d4 35%, var(--border,#e2e8f0));
        color: #0e7490; cursor: pointer; white-space: nowrap;
      }
      html[data-theme="dark"] .${BTN_CLASS} { color: #67e8f9; }
      .${BTN_CLASS}:hover { background: color-mix(in srgb, #06b6d4 22%, var(--card,#fff)); }
    `;
    document.head.appendChild(s);
  }

  function renderList(query) {
    const q = (query || '').trim().toLowerCase();
    const filtered = q
      ? KEYWORDS.filter(k =>
          k.en.toLowerCase().includes(q) ||
          k.ms.toLowerCase().includes(q) ||
          k.def.toLowerCase().includes(q))
      : KEYWORDS;
    if (filtered.length === 0)
      return '<div class="v59s-empty">No keywords match your search.</div>';
    return filtered.map(k => `
      <div class="v59s-item">
        <div class="v59s-terms">
          <span class="v59s-en">${esc(k.en)}</span>
          <span class="v59s-ms">${esc(k.ms)}</span>
        </div>
        <p class="v59s-def">${esc(k.def)}</p>
        <p class="v59s-eg">e.g. ${esc(k.eg)}</p>
      </div>`).join('');
  }

  ROOT.__v59sClose  = () => byId(OVERLAY_ID)?.remove();
  ROOT.__v59sSearch = q => {
    const list = byId('v59s-list');
    if (list) list.innerHTML = renderList(q);
  };
  ROOT.__v59sOpen   = () => {
    if (byId(OVERLAY_ID)) return;
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.addEventListener('click', e => { if (e.target === overlay) ROOT.__v59sClose(); });
    overlay.innerHTML = `
      <div class="v59s-card">
        <div class="v59s-header">
          <p class="v59s-title">📖 Math Keywords — English / BM</p>
          <button class="v59s-close" onclick="window.__v59sClose()">✕</button>
        </div>
        <input class="v59s-search" type="search" placeholder="Search term or keyword…"
          oninput="window.__v59sSearch(this.value)" autocomplete="off" />
        <div class="v59s-list" id="v59s-list">${renderList('')}</div>
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
    btn.innerHTML = '📖 Keywords';
    btn.onclick = () => ROOT.__v59sOpen();
    const ref = beforeSelector ? parent.querySelector(beforeSelector) : null;
    ref ? parent.insertBefore(btn, ref) : parent.appendChild(btn);
  }

  function init() {
    if (typeof document === 'undefined') return;
    const tryInsert = () => {
      insertButton('#quiz .buttons', '#quit-btn');
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
