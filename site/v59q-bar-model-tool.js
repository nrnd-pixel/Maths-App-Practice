/* V5.9Q — Interactive Bar Model Tool.
   A draggable modal overlay that lets students build comparison or part-whole
   bar models to visualise ratio, fraction and multi-step word problems.
   Accessible from a toolbar button on the practice (quiz) screen and the
   student home. No grading, network or persistence changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59qBarModelInstalled) return;
  ROOT.__v59qBarModelInstalled = true;

  const STYLE_ID   = 'v59q-bar-model-style';
  const OVERLAY_ID = 'v59q-bar-model-overlay';
  const BTN_CLASS  = 'v59q-bar-btn';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);

  const COLORS = ['#3b82f6','#f43f5e','#10b981','#f59e0b','#8b5cf6'];

  /* ── State ─────────────────────────────────────────────────────────────── */
  let state = {
    mode: 'comparison', // comparison | part_whole
    total: 60,
    bars: [
      { id: 'b1', label: 'A', units: 3, color: COLORS[0] },
      { id: 'b2', label: 'B', units: 2, color: COLORS[1] },
    ],
  };

  function totalUnits() { return state.bars.reduce((s,b) => s+b.units, 0); }
  function unitValue()  { return totalUnits() > 0 ? state.total / totalUnits() : 0; }

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (typeof document === 'undefined' || byId(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 9970;
        background: rgba(15,23,42,.65); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      #${OVERLAY_ID} .v59q-card {
        background: var(--card,#fff); border: 1px solid var(--border,#e2e8f0);
        border-radius: 22px; padding: 22px 20px; width: min(540px,100%);
        box-shadow: 0 24px 70px rgba(0,0,0,.2); max-height: 90vh;
        overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
      }
      #${OVERLAY_ID} .v59q-header {
        display: flex; justify-content: space-between; align-items: center;
      }
      #${OVERLAY_ID} .v59q-title { font-size: 16px; font-weight: 900; color: var(--text,#172033); margin:0; }
      #${OVERLAY_ID} .v59q-close {
        background: var(--soft,#eaf2ff); border: none; border-radius: 9px;
        width: 32px; height: 32px; cursor: pointer; font-size: 15px;
      }
      #${OVERLAY_ID} .v59q-controls {
        display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
      }
      #${OVERLAY_ID} .v59q-pill {
        padding: 6px 12px; border-radius: 99px; border: 1.5px solid var(--border,#e2e8f0);
        background: #f8fafc; font-size: 12px; font-weight: 800; cursor: pointer;
      }
      #${OVERLAY_ID} .v59q-pill.active {
        background: var(--primary,#2563eb); color: #fff; border-color: var(--primary,#2563eb);
      }
      #${OVERLAY_ID} .v59q-total-row {
        display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700;
      }
      #${OVERLAY_ID} .v59q-total-row input {
        width: 80px; min-height: 36px; padding: 6px 10px;
        border: 1.5px solid var(--border,#e2e8f0); border-radius: 10px;
        font-size: 14px; font-weight: 800; text-align: center;
        background: #fff; color: var(--text,#172033);
      }
      #${OVERLAY_ID} .v59q-canvas { display: flex; flex-direction: column; gap: 8px; }
      #${OVERLAY_ID} .v59q-bar-row {
        display: grid; grid-template-columns: 70px 1fr auto; gap: 8px; align-items: center;
      }
      #${OVERLAY_ID} .v59q-bar-label input {
        width: 100%; min-height: 32px; padding: 4px 8px; border: 1.5px solid var(--border,#e2e8f0);
        border-radius: 8px; font-size: 13px; font-weight: 700; background: #fff;
      }
      #${OVERLAY_ID} .v59q-bar-visual {
        display: flex; align-items: center; height: 38px; border-radius: 8px;
        overflow: hidden; background: #f1f5f9; position: relative;
      }
      #${OVERLAY_ID} .v59q-bar-fill {
        height: 100%; border-radius: 8px; display: flex; align-items: center;
        padding-left: 10px; font-size: 12px; font-weight: 800; color: #fff;
        transition: width .25s ease; min-width: 32px; white-space: nowrap; overflow: hidden;
      }
      #${OVERLAY_ID} .v59q-bar-btns {
        display: flex; gap: 4px; align-items: center;
      }
      #${OVERLAY_ID} .v59q-stepper {
        width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid var(--border,#e2e8f0);
        background: #f8fafc; font-size: 16px; font-weight: 900; cursor: pointer;
        display: grid; place-items: center; line-height: 1;
      }
      #${OVERLAY_ID} .v59q-units-badge {
        font-size: 11px; font-weight: 800; color: var(--muted,#667085);
        min-width: 20px; text-align: center;
      }
      #${OVERLAY_ID} .v59q-remove {
        width: 26px; height: 26px; border-radius: 7px; border: none;
        background: #fee2e2; color: #dc2626; font-size: 14px; cursor: pointer;
      }
      #${OVERLAY_ID} .v59q-add-bar {
        width: 100%; padding: 9px; border: 1.5px dashed var(--border,#e2e8f0);
        border-radius: 12px; background: #f8fafc; font-size: 13px; font-weight: 800;
        cursor: pointer; color: var(--primary,#2563eb); margin-top: 2px;
      }
      #${OVERLAY_ID} .v59q-summary {
        font-size: 12px; color: var(--muted,#667085);
        border: 1px solid var(--border,#e2e8f0);
        border-radius: 12px; padding: 10px 14px;
        display: flex; gap: 16px; flex-wrap: wrap;
      }
      #${OVERLAY_ID} .v59q-summary span { font-weight: 800; color: var(--text,#172033); }
      .${BTN_CLASS} {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 800;
        background: color-mix(in srgb, #10b981 15%, var(--card,#fff));
        border: 1.5px solid color-mix(in srgb, #10b981 35%, var(--border,#e2e8f0));
        color: #065f46; cursor: pointer; white-space: nowrap;
      }
      html[data-theme="dark"] .${BTN_CLASS} { color: #6ee7b7; }
      .${BTN_CLASS}:hover { background: color-mix(in srgb, #10b981 22%, var(--card,#fff)); }
    `;
    document.head.appendChild(s);
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function render() {
    const overlay = byId(OVERLAY_ID);
    if (!overlay) return;
    const tu = totalUnits();
    const uv = unitValue();
    overlay.querySelector('.v59q-card').innerHTML = `
      <div class="v59q-header">
        <p class="v59q-title">📊 Bar Model Builder</p>
        <button class="v59q-close" onclick="window.__v59qClose()">✕</button>
      </div>
      <p style="font-size:11px;color:var(--muted);margin:0">
        PSR Heuristic Tool — Kaedah Model Bar. Visualise ratio, fractions and word problems.
      </p>
      <div class="v59q-controls">
        <span style="font-size:12px;font-weight:700">Model:</span>
        <button class="v59q-pill ${state.mode==='comparison'?'active':''}"
          onclick="window.__v59qSetMode('comparison')">Comparison</button>
        <button class="v59q-pill ${state.mode==='part_whole'?'active':''}"
          onclick="window.__v59qSetMode('part_whole')">Part-Whole</button>
        <button class="v59q-pill" onclick="window.__v59qPreset('ratio')" style="margin-left:4px">Ratio preset</button>
        <button class="v59q-pill" onclick="window.__v59qPreset('diff')">Difference preset</button>
      </div>
      <div class="v59q-total-row">
        <label style="font-size:12px;font-weight:700">Total value:</label>
        <input type="number" value="${state.total}" min="1" max="9999"
          onchange="window.__v59qSetTotal(this.value)" />
        <span style="font-size:12px;color:var(--muted)">1 unit = ${Math.round(uv*100)/100}</span>
      </div>
      <div class="v59q-canvas">
        ${state.bars.map((bar, i) => {
          const pct = tu > 0 ? (bar.units / tu * 100) : 0;
          const val = Math.round(bar.units * uv * 100) / 100;
          return `
          <div class="v59q-bar-row">
            <div class="v59q-bar-label">
              <input value="${bar.label}" maxlength="12"
                onchange="window.__v59qLabel('${bar.id}',this.value)" />
            </div>
            <div class="v59q-bar-visual">
              <div class="v59q-bar-fill" style="width:${pct}%;background:${bar.color}">
                ${val > 0 ? val : ''}
              </div>
            </div>
            <div class="v59q-bar-btns">
              <button class="v59q-stepper" onclick="window.__v59qStep('${bar.id}',-1)">−</button>
              <span class="v59q-units-badge">${bar.units}</span>
              <button class="v59q-stepper" onclick="window.__v59qStep('${bar.id}',1)">+</button>
              ${state.bars.length > 1 ? `<button class="v59q-remove" onclick="window.__v59qRemove('${bar.id}')">✕</button>` : ''}
            </div>
          </div>`;
        }).join('')}
        ${state.bars.length < 5 ? `<button class="v59q-add-bar" onclick="window.__v59qAdd()">+ Add bar</button>` : ''}
      </div>
      <div class="v59q-summary">
        ${state.bars.map(b => {
          const pct = tu > 0 ? Math.round(b.units/tu*1000)/10 : 0;
          const val = Math.round(b.units * uv * 100) / 100;
          return `<div>${b.label}: <span>${val}</span> (${b.units} unit${b.units!==1?'s':''} · ${pct}%)</div>`;
        }).join('')}
      </div>`;
  }

  /* ── State mutators ─────────────────────────────────────────────────────── */
  ROOT.__v59qSetMode  = m => { state.mode = m; render(); };
  ROOT.__v59qSetTotal = v => { state.total = Math.max(1, Number(v)||1); render(); };
  ROOT.__v59qLabel    = (id,v) => { const b = state.bars.find(b=>b.id===id); if(b) b.label=v; render(); };
  ROOT.__v59qStep     = (id,d) => {
    const b = state.bars.find(b=>b.id===id);
    if (b) b.units = Math.max(1, Math.min(20, b.units+d));
    render();
  };
  ROOT.__v59qRemove   = id => {
    if (state.bars.length <= 1) return;
    state.bars = state.bars.filter(b=>b.id!==id);
    render();
  };
  ROOT.__v59qAdd      = () => {
    if (state.bars.length >= 5) return;
    const id = `b${Date.now()}`;
    const color = COLORS[state.bars.length % COLORS.length];
    state.bars.push({ id, label: String.fromCharCode(65+state.bars.length), units: 1, color });
    render();
  };
  ROOT.__v59qPreset   = type => {
    if (type === 'ratio') {
      state.mode='part_whole'; state.total=75;
      state.bars=[{id:'b1',label:'Boys (2 parts)',units:2,color:COLORS[0]},{id:'b2',label:'Girls (3 parts)',units:3,color:COLORS[1]}];
    } else {
      state.mode='comparison'; state.total=80;
      state.bars=[{id:'b1',label:'Ali',units:2,color:COLORS[0]},{id:'b2',label:'Siti (Ali+24)',units:4,color:COLORS[1]}];
    }
    render();
  };

  ROOT.__v59qClose = () => byId(OVERLAY_ID)?.remove();
  ROOT.__v59qOpen  = () => {
    if (byId(OVERLAY_ID)) return;
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = '<div class="v59q-card"></div>';
    overlay.addEventListener('click', e => { if (e.target === overlay) ROOT.__v59qClose(); });
    document.body.appendChild(overlay);
    render();
  };

  /* ── Insert buttons ─────────────────────────────────────────────────────── */
  function insertButton(parentSelector, insertBefore) {
    if (typeof document === 'undefined') return;
    const parent = document.querySelector(parentSelector);
    if (!parent || parent.querySelector('.'+BTN_CLASS)) return;
    injectStyles();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.innerHTML = '📊 Bar Model';
    btn.onclick = () => ROOT.__v59qOpen();
    if (insertBefore) {
      const ref = parent.querySelector(insertBefore);
      ref ? parent.insertBefore(btn, ref) : parent.appendChild(btn);
    } else {
      parent.appendChild(btn);
    }
  }

  function init() {
    if (typeof document === 'undefined') return;
    const tryInsert = () => {
      // On quiz screen — add to the buttons row near hint
      insertButton('#quiz .buttons', '#quit-btn');
      // On student home
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
      if (quiz) obs.observe(quiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  init();
})();
