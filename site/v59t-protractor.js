/* V5.9T — Interactive Draggable Protractor.
   A floating, draggable protractor overlay for the quiz screen.
   Students can drag it over a diagram and rotate it to measure angles.
   Includes a ruler mode. No data, grading or network changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59tProtractorInstalled) return;
  ROOT.__v59tProtractorInstalled = true;

  const STYLE_ID  = 'v59t-protractor-style';
  const TOOL_ID   = 'v59t-protractor-tool';
  const BTN_CLASS = 'v59t-protractor-btn';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  let rotation = 0;
  let pos = { x: 60, y: 60 };
  let mode = 'protractor'; // protractor | ruler
  let dragging = false;
  let dragStart = { x: 0, y: 0 };

  function injectStyles() {
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${TOOL_ID} {
        position: fixed; z-index: 9950; user-select: none; touch-action: none;
        filter: drop-shadow(0 8px 20px rgba(0,0,0,.25));
      }
      #${TOOL_ID} .v59t-controls {
        display: flex; align-items: center; gap: 4px;
        background: rgba(15,23,42,.88); color: #fff;
        border-radius: 12px; padding: 6px 8px; margin-bottom: 4px;
        backdrop-filter: blur(6px); font-size: 12px; font-weight: 700;
        cursor: move; white-space: nowrap; width: max-content;
      }
      #${TOOL_ID} .v59t-btn {
        background: rgba(255,255,255,.15); border: none; color: #fff;
        border-radius: 7px; padding: 4px 8px; font-size: 11px; font-weight: 800;
        cursor: pointer; white-space: nowrap;
      }
      #${TOOL_ID} .v59t-btn.active { background: var(--primary,#2563eb); }
      #${TOOL_ID} .v59t-btn:hover { background: rgba(255,255,255,.25); }
      #${TOOL_ID} .v59t-btn.active:hover { background: #1d4ed8; }
      #${TOOL_ID} .v59t-rot-lbl {
        font-size: 11px; min-width: 38px; text-align: center;
      }
      #${TOOL_ID} svg { display: block; }
      .${BTN_CLASS} {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 800;
        background: color-mix(in srgb, #f59e0b 15%, var(--card,#fff));
        border: 1.5px solid color-mix(in srgb, #f59e0b 35%, var(--border,#e2e8f0));
        color: #92400e; cursor: pointer; white-space: nowrap;
      }
      html[data-theme="dark"] .${BTN_CLASS} { color: #fcd34d; }
      .${BTN_CLASS}:hover { background: color-mix(in srgb, #f59e0b 22%, var(--card,#fff)); }
    `;
    document.head.appendChild(s);
  }

  function protractorSVG() {
    // Semicircle protractor with degree markings 0-180
    const R = 90, cx = 100, cy = 100;
    let marks = '';
    for (let deg = 0; deg <= 180; deg += 10) {
      const rad = (180 - deg) * Math.PI / 180;
      const x1 = cx + R * Math.cos(rad);
      const y1 = cy - R * Math.sin(rad);
      const major = deg % 30 === 0;
      const len = major ? 12 : 6;
      const x2 = cx + (R - len) * Math.cos(rad);
      const y2 = cy - (R - len) * Math.sin(rad);
      marks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#334155" stroke-width="${major?1.5:0.8}"/>`;
      if (major) {
        const tx = cx + (R - 22) * Math.cos(rad);
        const ty = cy - (R - 22) * Math.sin(rad);
        marks += `<text x="${tx.toFixed(1)}" y="${(ty+3.5).toFixed(1)}" text-anchor="middle" font-size="8" fill="#334155" font-weight="700">${deg}</text>`;
      }
    }
    return `<svg width="200" height="106" viewBox="0 0 200 106">
      <path d="M10,100 A90,90 0 0,1 190,100 Z" fill="rgba(219,234,254,.85)" stroke="#2563eb" stroke-width="1.5"/>
      <line x1="10" y1="100" x2="190" y2="100" stroke="#2563eb" stroke-width="1.5"/>
      <line x1="100" y1="100" x2="100" y2="14" stroke="#dc2626" stroke-width="1" stroke-dasharray="3,3"/>
      ${marks}
      <circle cx="100" cy="100" r="4" fill="#2563eb"/>
      <text x="100" y="113" text-anchor="middle" font-size="7" fill="#64748b">Place centre point on vertex</text>
    </svg>`;
  }

  function rulerSVG() {
    let marks = '';
    for (let i = 0; i <= 20; i++) {
      const x = 10 + i * 14;
      const major = i % 5 === 0;
      const h = major ? 20 : (i%2===0 ? 12 : 7);
      marks += `<line x1="${x}" y1="10" x2="${x}" y2="${10+h}" stroke="#334155" stroke-width="${major?1.5:0.8}"/>`;
      if (major) marks += `<text x="${x}" y="${10+h+10}" text-anchor="middle" font-size="8" fill="#334155" font-weight="700">${i/2}</text>`;
    }
    return `<svg width="300" height="45" viewBox="0 0 300 45">
      <rect x="5" y="8" width="290" height="28" rx="4" fill="rgba(219,234,254,.85)" stroke="#2563eb" stroke-width="1.5"/>
      ${marks}
      <text x="155" y="43" text-anchor="middle" font-size="7" fill="#64748b">cm</text>
    </svg>`;
  }

  function updateTransform() {
    const tool = byId(TOOL_ID);
    if (tool) tool.style.transform = `translate3d(${pos.x}px,${pos.y}px,0) rotate(${rotation}deg)`;
  }

  function setupDrag() {
    const ctrl = byId(TOOL_ID)?.querySelector('.v59t-controls');
    if (!ctrl) return;

    function onDown(e) {
      dragging = true;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      dragStart = { x: cx - pos.x, y: cy - pos.y };
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      pos = { x: cx - dragStart.x, y: cy - dragStart.y };
      updateTransform();
    }
    function onUp() { dragging = false; }

    ctrl.addEventListener('mousedown', onDown);
    ctrl.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  ROOT.__v59tRotate = deg => {
    rotation = (rotation + deg + 360) % 360;
    const lbl = byId('v59t-rot-lbl');
    if (lbl) lbl.textContent = `${rotation}°`;
    updateTransform();
  };

  ROOT.__v59tSetMode = m => {
    mode = m;
    render();
  };

  ROOT.__v59tClose = () => byId(TOOL_ID)?.remove();

  function render() {
    const tool = byId(TOOL_ID);
    if (!tool) return;
    tool.innerHTML = `
      <div class="v59t-controls" title="Drag to move">
        <span>📐</span>
        <button class="v59t-btn ${mode==='protractor'?'active':''}" onclick="window.__v59tSetMode('protractor')">Protractor</button>
        <button class="v59t-btn ${mode==='ruler'?'active':''}" onclick="window.__v59tSetMode('ruler')">Ruler</button>
        ${mode==='protractor' ? `
          <button class="v59t-btn" onclick="window.__v59tRotate(-5)">◁ 5°</button>
          <span class="v59t-rot-lbl" id="v59t-rot-lbl">${rotation}°</span>
          <button class="v59t-btn" onclick="window.__v59tRotate(5)">5° ▷</button>
        ` : ''}
        <button class="v59t-btn" onclick="window.__v59tClose()" style="margin-left:4px">✕</button>
      </div>
      ${mode === 'protractor' ? protractorSVG() : rulerSVG()}`;
    updateTransform();
    setupDrag();
  }

  ROOT.__v59tOpen = () => {
    if (byId(TOOL_ID)) { byId(TOOL_ID)?.remove(); return; }
    injectStyles();
    const tool = document.createElement('div');
    tool.id = TOOL_ID;
    tool.style.cssText = `transform: translate3d(${pos.x}px,${pos.y}px,0)`;
    document.body.appendChild(tool);
    render();
  };

  function insertButton(parentSelector, beforeSelector) {
    if (typeof document === 'undefined') return;
    const parent = document.querySelector(parentSelector);
    if (!parent || parent.querySelector('.'+BTN_CLASS)) return;
    injectStyles();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.innerHTML = '📐 Protractor';
    btn.onclick = () => ROOT.__v59tOpen();
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
