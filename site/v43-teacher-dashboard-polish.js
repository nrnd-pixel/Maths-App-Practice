/* V4.3C — Teacher Dashboard Responsive & Dark Mode Polish.
   Presentation-only. Keeps existing teacher data, Exam Settings save logic,
   grading, auth, Practice/Exam and assignment behavior unchanged. */
(() => {
  'use strict';

  const STYLE_ID = 'v43c-teacher-dashboard-polish-style';
  const narrowCards = window.matchMedia('(max-width:700px)');
  const expandedExamCards = new Set();

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Exam Settings surfaces should follow the active theme instead of
         retaining the legacy hard-coded white card. */
      #teacher .settings-card{
        background:var(--card);
        color:var(--text);
        box-shadow:0 1px 0 color-mix(in srgb,var(--border) 70%,transparent);
      }
      #teacher .settings-card .settings-card-head{
        align-items:flex-start;
      }
      #teacher .settings-card .settings-fields label{
        color:var(--text);
      }
      #teacher .settings-card input,
      #teacher .settings-card select{
        border-color:var(--border);
        color:var(--text);
      }
      #teacher .settings-card .availability-off{
        background:var(--soft);
        color:var(--muted);
      }
      #teacher .v43c-head-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        justify-content:flex-end;
        align-items:center;
      }
      #teacher .v43c-card-toggle{
        min-height:34px;
        padding:6px 10px;
        border:1px solid var(--border);
        background:transparent;
        color:var(--text);
        border-radius:10px;
        font-size:12px;
      }
      #teacher .v43c-settings-summary{
        display:none;
        color:var(--muted);
        font-size:12px;
        line-height:1.45;
        margin-top:9px;
      }
      #teacher .v43c-unsaved{
        display:none;
        font-size:11px;
        font-weight:800;
        color:var(--warn);
      }
      #teacher .settings-card.v43c-dirty .v43c-unsaved{display:inline}

      /* Teacher tab strip: keep every label intact and make the active area
         easy to reach on touch/narrow screens. */
      #teacher > .tabs{
        scroll-padding-inline:18px;
        overscroll-behavior-x:contain;
        -webkit-overflow-scrolling:touch;
      }
      #teacher > .tabs .tab{
        scroll-margin-inline:18px;
      }

      @media(max-width:850px){
        #teacher > .tabs{
          gap:15px;
          padding:0 10px 5px;
          margin-left:-10px;
          margin-right:-10px;
          scrollbar-width:thin;
        }
        #teacher > .tabs .tab{
          min-height:42px;
          padding-left:2px;
          padding-right:2px;
        }
      }

      @media(max-width:700px){
        #teacher #exam-settings-panel > .header{
          gap:10px;
        }
        #teacher #exam-settings-panel > .header #refresh-exam-settings{
          width:auto;
          min-width:118px;
        }
        #teacher .settings-list{gap:10px}
        #teacher .settings-card{
          padding:13px;
          border-radius:14px;
        }
        #teacher .settings-card-head{
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:9px;
          align-items:start;
        }
        #teacher .settings-card-head h3{
          font-size:16px;
          line-height:1.35;
        }
        #teacher .settings-card-head .muted{
          display:none;
        }
        #teacher .v43c-head-actions{
          max-width:145px;
        }
        #teacher .v43c-settings-summary{
          display:block;
        }
        #teacher .settings-card.v43c-collapsed .settings-fields,
        #teacher .settings-card.v43c-collapsed > .buttons{
          display:none!important;
        }
        #teacher .settings-card:not(.v43c-collapsed) .settings-fields{
          margin-top:12px;
        }
        #teacher .settings-card:not(.v43c-collapsed) > .buttons{
          margin-top:14px;
        }
        #teacher .settings-card:not(.v43c-collapsed) > .buttons .save-exam-setting{
          width:100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function examCardKey(card){
    return [card?.dataset?.year, card?.dataset?.examYear, card?.dataset?.paper]
      .map(value => String(value || '').trim())
      .join('|');
  }

  function selectedText(select){
    return select?.selectedOptions?.[0]?.textContent?.trim() || '';
  }

  function shortRelease(value){
    if (/manual review/i.test(value)) return 'After review';
    if (/do not release/i.test(value)) return 'Answers hidden';
    return 'Immediate release';
  }

  function shortAvailability(value){
    return /^unavailable/i.test(value) ? 'Unavailable' : 'Available';
  }

  function updateExamCardSummary(card){
    const summary = card.querySelector('.v43c-settings-summary');
    if (!summary) return;
    const duration = card.querySelector('.setting-duration')?.value?.trim();
    const release = selectedText(card.querySelector('.setting-release'));
    const availability = selectedText(card.querySelector('.setting-available'));
    summary.textContent = `${duration ? `${duration} min` : 'No timer'} · ${shortRelease(release)} · ${shortAvailability(availability)}`;
  }

  function setExamCardExpanded(card, expanded, remember=true){
    const key = examCardKey(card);
    card.classList.toggle('v43c-collapsed', !expanded);
    const button = card.querySelector('.v43c-card-toggle');
    if (button){
      button.textContent = expanded ? 'Hide settings' : 'Edit settings';
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
    if (remember && key){
      if (expanded) expandedExamCards.add(key);
      else expandedExamCards.delete(key);
    }
  }

  function markDirty(card){
    card.classList.add('v43c-dirty');
    updateExamCardSummary(card);
  }

  function decorateExamCard(card){
    if (!card || card.dataset.v43cDecorated === '1') return;
    card.dataset.v43cDecorated = '1';

    const head = card.querySelector('.settings-card-head');
    if (!head) return;

    const status = head.querySelector('.tag');
    const actions = document.createElement('div');
    actions.className = 'v43c-head-actions';

    if (status){
      status.replaceWith(actions);
      actions.appendChild(status);
    } else {
      head.appendChild(actions);
    }

    const unsaved = document.createElement('span');
    unsaved.className = 'v43c-unsaved';
    unsaved.textContent = 'Unsaved';
    actions.appendChild(unsaved);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'v43c-card-toggle';
    toggle.addEventListener('click', () => {
      const expanded = card.classList.contains('v43c-collapsed');
      setExamCardExpanded(card, expanded, true);
      if (expanded){
        requestAnimationFrame(() => card.scrollIntoView({block:'nearest',behavior:'smooth'}));
      }
    });
    actions.appendChild(toggle);

    const summary = document.createElement('div');
    summary.className = 'v43c-settings-summary';
    head.insertAdjacentElement('afterend', summary);

    card.querySelectorAll('.setting-duration,.setting-release,.setting-available').forEach(control => {
      control.addEventListener('input', () => markDirty(card));
      control.addEventListener('change', () => markDirty(card));
    });

    const save = card.querySelector('.save-exam-setting');
    save?.addEventListener('click', () => {
      card.classList.remove('v43c-dirty');
    });

    updateExamCardSummary(card);
    const shouldExpand = !narrowCards.matches || expandedExamCards.has(examCardKey(card));
    setExamCardExpanded(card, shouldExpand, false);
  }

  function decorateExamSettings(){
    document.querySelectorAll('#exam-settings-list .settings-card').forEach(decorateExamCard);
  }

  function refreshExamCardResponsiveState(){
    document.querySelectorAll('#exam-settings-list .settings-card').forEach(card => {
      const expanded = !narrowCards.matches || expandedExamCards.has(examCardKey(card));
      setExamCardExpanded(card, expanded, false);
    });
  }

  function wrapExamSettingsRenderer(){
    try {
      if (typeof loadExamSettingsEditor !== 'function' || loadExamSettingsEditor.__v43cWrapped) return;
      const previous = loadExamSettingsEditor;
      const wrapped = async function(...args){
        const result = await previous.apply(this,args);
        decorateExamSettings();
        return result;
      };
      wrapped.__v43cWrapped = true;
      loadExamSettingsEditor = wrapped;
    } catch (error){
      console.warn('V4.3C could not wrap Exam Settings renderer.',error);
    }
  }

  function wireTeacherTabs(){
    const tabs = document.querySelector('#teacher > .tabs');
    if (!tabs || tabs.dataset.v43cWired === '1') return;
    tabs.dataset.v43cWired = '1';

    tabs.addEventListener('click', event => {
      const tab = event.target.closest('.tab');
      if (!tab || !tabs.contains(tab)) return;
      requestAnimationFrame(() => {
        tab.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      });
    });
  }

  function wire(){
    injectStyles();
    wrapExamSettingsRenderer();
    wireTeacherTabs();
    decorateExamSettings();
    narrowCards.addEventListener?.('change',refreshExamCardResponsiveState);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
