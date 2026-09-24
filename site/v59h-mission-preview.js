/* V5.9H — Weekly mission preview on Home screen.
   Injects an inline mission progress strip into the "Today's Practice" shortcut
   section (V5.9A) so students see their weekly mission status before deciding
   whether to start a session. Reads from the existing V572WeeklyMissions cache —
   no new RPCs. Collapses when all missions are complete.
   No grading, network, persistence or data authority. Presentation only. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59hMissionPreviewInstalled) return;
  ROOT.__v59hMissionPreviewInstalled = true;

  const STYLE_ID   = 'v59h-mission-preview-style';
  const STRIP_ID   = 'v59h-mission-strip';
  const SHORTCUTS  = 'v59a-practice-shortcuts';

  const byId = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const esc  = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${STRIP_ID} {
        margin: 10px 0 2px;
        display: grid;
        gap: 7px;
      }
      .v59h-mission-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 14px;
        background: var(--surface-muted, #f8fafc);
        border: 1px solid var(--border, #e2e8f0);
      }
      .v59h-mission-row.v59h-done {
        background: var(--successbg, #f0fdf4);
        border-color: var(--success, #22c55e);
      }
      .v59h-icon { font-size: 18px; flex-shrink: 0; }
      .v59h-body { flex: 1; min-width: 0; }
      .v59h-title {
        font-size: 12px;
        font-weight: 800;
        color: var(--text, #1e293b);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .v59h-bar-wrap {
        height: 4px;
        border-radius: 999px;
        background: var(--bar-bg, #e7ebf0);
        margin-top: 4px;
        overflow: hidden;
      }
      .v59h-bar-fill {
        height: 100%;
        border-radius: 999px;
        background: var(--primary, #3b82f6);
        transition: width 0.5s ease;
      }
      .v59h-mission-row.v59h-done .v59h-bar-fill {
        background: var(--success, #22c55e);
      }
      .v59h-progress {
        font-size: 10px;
        color: var(--muted, #64748b);
        font-weight: 700;
        flex-shrink: 0;
        white-space: nowrap;
      }
      #${STRIP_ID} .v59h-header {
        font-size: 11px;
        font-weight: 900;
        color: var(--muted, #64748b);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 1px;
      }
      #${STRIP_ID}.v59h-all-done .v59h-header::after {
        content: ' ✅';
      }
    `;
    document.head.appendChild(s);
  }

  function missionProgressText(m) {
    if (m.complete) return '✓ Done';
    const unit = m.unit === 'questions' ? 'q' : m.unit === 'days' ? 'd' : '';
    return `${m.progress}/${m.target}${unit}`;
  }

  function buildStrip(missions) {
    if (!missions?.length) return null;

    injectStyles();
    const strip = document.createElement('div');
    strip.id = STRIP_ID;

    const allDone = missions.every(m => m.complete);
    if (allDone) strip.classList.add('v59h-all-done');

    const header = document.createElement('div');
    header.className = 'v59h-header';
    header.textContent = 'This week\'s missions';
    strip.appendChild(header);

    for (const m of missions) {
      const pct = m.complete ? 100 : clamp(Math.round(100 * (m.progress ?? 0) / Math.max(1, m.target ?? 1)), 0, 99);
      const row = document.createElement('div');
      row.className = `v59h-mission-row${m.complete ? ' v59h-done' : ''}`;
      row.innerHTML = `
        <div class="v59h-icon">${m.complete ? '✅' : esc(m.icon || '🎯')}</div>
        <div class="v59h-body">
          <div class="v59h-title">${esc(m.title || '')}</div>
          <div class="v59h-bar-wrap">
            <div class="v59h-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="v59h-progress">${missionProgressText(m)}</div>`;
      strip.appendChild(row);
    }

    return strip;
  }

  function getMissions() {
    // Read from V572WeeklyMissions public cache API
    try {
      const api = ROOT.V572WeeklyMissions;
      if (!api) return null;
      // The cache exposes its data via the gamification refresh event;
      // we poll the rendered card as a fallback signal
      const card = byId('v572-weekly-missions-card');
      if (!card || card.classList.contains('hidden')) return null;

      // Extract mission data from the rendered DOM (already rendered by V5.7.2)
      const missionEls = card.querySelectorAll('.v572-mission');
      if (!missionEls.length) return null;

      return Array.from(missionEls).map(el => {
        const titleEl = el.querySelector('.v572-mission-title strong');
        const descEl = el.querySelector('p');
        const iconEl = el.querySelector('.v572-mission-icon');
        const progressEl = el.querySelector('.v572-progress-text');
        const barEl = el.querySelector('.v572-mini-progress span');
        const complete = el.classList.contains('complete');

        // Parse progress from bar width or text
        const barWidth = parseFloat(barEl?.style?.width || '0');
        const progressText = progressEl?.textContent?.trim() || '';
        const progressMatch = progressText.match(/^(\d+)\/(\d+)/);

        return {
          title: titleEl?.textContent?.trim() || '',
          icon: complete ? '✅' : (iconEl?.textContent?.trim() || '🎯'),
          complete,
          progress: progressMatch ? parseInt(progressMatch[1]) : (complete ? 1 : 0),
          target: progressMatch ? parseInt(progressMatch[2]) : 1,
          unit: progressText.includes('questions') ? 'questions' : progressText.includes('day') ? 'days' : '',
          pctFromBar: barWidth,
        };
      }).filter(m => m.title);
    } catch {
      return null;
    }
  }

  function render() {
    const shortcuts = byId(SHORTCUTS);
    if (!shortcuts) return false;

    const missions = getMissions();
    if (!missions?.length) {
      byId(STRIP_ID)?.remove();
      return false;
    }

    const existing = byId(STRIP_ID);
    const strip = buildStrip(missions);
    if (!strip) return false;

    if (existing) {
      existing.replaceWith(strip);
    } else {
      // Insert before the Quick 5 button (first button child of shortcuts)
      const quick5 = shortcuts.querySelector('button');
      if (quick5) {
        shortcuts.insertBefore(strip, quick5);
      } else {
        shortcuts.appendChild(strip);
      }
    }
    return true;
  }

  function hookEvents() {
    // Re-render when missions update
    window.addEventListener('v572:missions-updated', () => setTimeout(render, 150));
    // Re-render when navigating home
    document.addEventListener('click', e => {
      if (e.target?.closest('[data-v40-nav="home"]')) setTimeout(render, 400);
    }, { passive: true });
    // Also catch the home refresh event from v59a
    window.addEventListener('v57c:home-updated', () => setTimeout(render, 300));
    window.addEventListener('v571a:gamification-updated', () => setTimeout(render, 300));
  }

  function tryInit() {
    hookEvents();
    // Try immediately in case already rendered
    setTimeout(render, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  } else {
    tryInit();
  }
})();
