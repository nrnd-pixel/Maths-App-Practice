/* V4.0C2 — Learn / Practice setup experience.
   Presentation-only: reorganises the existing mode and filter controls while
   preserving their IDs, values, handlers and secure start flows. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-learn-setup-style';

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .v40c-learn-setup{
        margin:20px 0 8px;
        border:1px solid var(--border);
        border-radius:20px;
        background:var(--card);
        overflow:hidden;
      }

      #start .v40c-learn-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
        padding:18px 18px 0;
      }

      #start .v40c-learn-kicker{
        color:var(--primary);
        font-size:12px;
        font-weight:900;
        letter-spacing:.06em;
        text-transform:uppercase;
        margin-bottom:5px;
      }

      #start .v40c-learn-head h2{
        margin:0 0 5px;
        font-size:clamp(21px,2.8vw,27px);
      }

      #start .v40c-learn-head p{
        margin:0;
        color:var(--muted);
        font-size:13px;
        line-height:1.5;
      }

      #start .v40c-learn-setup .mode-switch{
        margin:18px;
        max-width:none;
      }

      #start .v40c-learn-setup #mode-note{
        margin:-8px 18px 16px;
      }

      #start .v40c-practice-summary,
      #start .v40c-exam-panel{
        margin:0 18px 18px;
        border:1px solid var(--border);
        border-radius:16px;
        background:color-mix(in srgb,var(--soft) 18%,var(--card));
      }

      #start .v40c-practice-summary{
        padding:15px;
      }

      #start .v40c-summary-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
      }

      #start .v40c-summary-head h3,
      #start .v40c-exam-panel h3{
        margin:0 0 4px;
        font-size:16px;
      }

      #start .v40c-summary-head p,
      #start .v40c-exam-panel > p{
        margin:0;
        color:var(--muted);
        font-size:12px;
        line-height:1.45;
      }

      #start .v40c-practice-pills{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        margin-top:13px;
      }

      #start .v40c-practice-pills span{
        display:inline-flex;
        align-items:center;
        min-height:31px;
        padding:6px 9px;
        border-radius:999px;
        background:var(--card);
        border:1px solid var(--border);
        font-size:11px;
        font-weight:800;
        color:var(--text);
      }

      #start .v40c-change-settings{
        flex:0 0 auto;
        min-height:40px;
        padding:8px 12px;
        font-size:12px;
      }

      #start .v40c-practice-settings{
        display:none;
        border-top:1px solid var(--border);
        margin-top:14px;
        padding-top:14px;
      }

      #start .v40c-practice-summary.v40c-settings-open .v40c-practice-settings{
        display:block;
      }

      #start .v40c-settings-grid,
      #start .v40c-exam-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }

      #start .v40c-settings-grid > label,
      #start .v40c-exam-grid > label{
        min-width:0;
      }

      #start .v40c-exam-panel{
        padding:15px;
      }

      #start .v40c-exam-grid{
        margin-top:13px;
      }

      #start .v40c-exam-grid #exam-paper-note,
      #start .v40c-exam-grid #exam-instructions{
        grid-column:1/-1;
        margin-top:0;
      }

      #start .v40c-learn-actions{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        padding:15px 18px 18px;
        border-top:1px solid var(--border);
        background:color-mix(in srgb,var(--soft) 12%,var(--card));
      }

      #start .v40c-learn-action-copy strong{
        display:block;
        margin-bottom:2px;
      }

      #start .v40c-learn-action-copy span{
        color:var(--muted);
        font-size:12px;
        line-height:1.4;
      }

      #start .v40c-learn-actions #start-btn{
        min-width:190px;
        min-height:50px;
        font-size:15px;
      }

      #start .v40c-open-learn{
        grid-area:button;
        width:100%;
        margin:2px 0 0;
        min-height:48px;
      }

      html[data-theme="dark"] #start .v40c-practice-summary,
      html[data-theme="dark"] #start .v40c-exam-panel,
      html[data-theme="dark"] #start .v40c-learn-actions{
        background:color-mix(in srgb,var(--soft) 12%,var(--card));
      }

      @media(max-width:700px){
        #start .v40c-learn-head,
        #start .v40c-summary-head,
        #start .v40c-learn-actions{
          flex-direction:column;
          align-items:stretch;
        }

        #start .v40c-settings-grid,
        #start .v40c-exam-grid{
          grid-template-columns:1fr;
        }

        #start .v40c-exam-grid #exam-paper-note,
        #start .v40c-exam-grid #exam-instructions{
          grid-column:auto;
        }

        #start .v40c-change-settings,
        #start .v40c-learn-actions #start-btn{
          width:100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function selectedText(id, fallback){
    const select = document.getElementById(id);
    if (!select) return fallback;
    const option = select.options?.[select.selectedIndex];
    return option?.textContent?.trim() || select.value || fallback;
  }

  function currentMode(){
    return document.getElementById('exam-mode-btn')?.classList.contains('active')
      ? 'exam'
      : 'practice';
  }

  function updatePracticeSummary(){
    const values = {
      strand: selectedText('strand-filter', 'Mixed Practice'),
      topic: selectedText('topic-filter', 'All topics / Mixed'),
      count: document.getElementById('question-count')?.value || '10',
      difficulty: selectedText('difficulty-filter', 'Any difficulty')
    };

    const map = {
      strand: values.strand,
      topic: values.topic,
      count: `${values.count} questions`,
      difficulty: values.difficulty
    };

    Object.entries(map).forEach(([key, value]) => {
      const target = document.querySelector(`[data-v40-summary="${key}"]`);
      if (target && target.textContent !== value) target.textContent = value;
    });
  }

  function updateModeView(){
    const setup = document.querySelector('#start .v40c-learn-setup');
    if (!setup) return;

    const mode = currentMode();
    const practice = setup.querySelector('.v40c-practice-summary');
    const exam = setup.querySelector('.v40c-exam-panel');
    const actionTitle = setup.querySelector('.v40c-learn-action-copy strong');
    const actionText = setup.querySelector('.v40c-learn-action-copy span');

    practice?.classList.toggle('hidden', mode !== 'practice');
    exam?.classList.toggle('hidden', mode !== 'exam');

    if (actionTitle) {
      actionTitle.textContent = mode === 'exam' ? 'Ready for Exam Mode?' : 'Ready to practise?';
    }
    if (actionText) {
      actionText.textContent = mode === 'exam'
        ? 'Choose the paper above, then start when you are ready.'
        : 'Your selected practice settings will be used for this session.';
    }

    updatePracticeSummary();
  }

  function scrollToLearn(){
    const setup = document.querySelector('#start .v40c-learn-setup');
    if (!setup) return;
    setup.scrollIntoView({ behavior:'smooth', block:'start' });
    window.setTimeout(() => {
      document.getElementById('practice-mode-btn')?.focus({ preventScroll:true });
    }, 250);
  }

  function keepHomeLearnCardUseful(startButton){
    const card = document.querySelector('#start [data-action-for="start-btn"]');
    if (!card || card.querySelector('.v40c-open-learn')) return;

    const title = card.querySelector('.v39-action-title');
    const description = card.querySelector('.v39-action-description');
    if (title) title.textContent = 'Learn';
    if (description) description.textContent = 'Choose Practice or Exam, adjust your activity if needed, then start.';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'primary v40c-open-learn';
    open.textContent = 'Open Learn';
    open.addEventListener('click', scrollToLearn);

    if (startButton.parentElement === card) {
      card.replaceChild(open, startButton);
    } else {
      card.appendChild(open);
    }
  }

  function buildLearnSetup(){
    const start = document.getElementById('start');
    const modeSwitch = start?.querySelector('.mode-switch');
    const modeNote = document.getElementById('mode-note');
    const startButton = document.getElementById('start-btn');

    if (!start || !modeSwitch || !startButton || start.querySelector('.v40c-learn-setup')) return;

    const setup = document.createElement('section');
    setup.className = 'v40c-learn-setup';
    setup.setAttribute('aria-label', 'Learn setup');

    const head = document.createElement('div');
    head.className = 'v40c-learn-head';
    head.innerHTML = `
      <div>
        <div class="v40c-learn-kicker">Learn</div>
        <h2>Choose how you want to learn.</h2>
        <p>Pick Practice for guided learning or Exam for a full past paper.</p>
      </div>
    `;

    const practiceSummary = document.createElement('section');
    practiceSummary.className = 'v40c-practice-summary';
    practiceSummary.innerHTML = `
      <div class="v40c-summary-head">
        <div>
          <h3>Practice setup</h3>
          <p>Start quickly with these settings, or change them if you want a specific focus.</p>
        </div>
        <button type="button" class="outline v40c-change-settings" aria-expanded="false">Change settings</button>
      </div>
      <div class="v40c-practice-pills" aria-label="Current practice settings">
        <span data-v40-summary="strand"></span>
        <span data-v40-summary="topic"></span>
        <span data-v40-summary="count"></span>
        <span data-v40-summary="difficulty"></span>
      </div>
      <div class="v40c-practice-settings">
        <div class="v40c-settings-grid"></div>
      </div>
    `;

    const settingsGrid = practiceSummary.querySelector('.v40c-settings-grid');
    [
      'practice-strand-wrap',
      'practice-topic-wrap',
      'practice-count-wrap',
      'practice-difficulty-wrap'
    ].forEach(id => {
      const field = document.getElementById(id);
      if (field) settingsGrid.appendChild(field);
    });

    const examPanel = document.createElement('section');
    examPanel.className = 'v40c-exam-panel hidden';
    examPanel.innerHTML = `
      <h3>Exam setup</h3>
      <p>Select a complete past paper. Exam Mode keeps its existing save, resume and submission safeguards.</p>
      <div class="v40c-exam-grid"></div>
    `;

    const examGrid = examPanel.querySelector('.v40c-exam-grid');
    ['exam-year-wrap','exam-paper-wrap','exam-paper-note','exam-instructions'].forEach(id => {
      const field = document.getElementById(id);
      if (field) examGrid.appendChild(field);
    });

    const actions = document.createElement('div');
    actions.className = 'v40c-learn-actions';
    actions.innerHTML = `
      <div class="v40c-learn-action-copy">
        <strong>Ready to practise?</strong>
        <span>Your selected practice settings will be used for this session.</span>
      </div>
    `;
    actions.appendChild(startButton);

    modeSwitch.insertAdjacentElement('beforebegin', setup);
    setup.append(head, modeSwitch);
    if (modeNote) setup.appendChild(modeNote);
    setup.append(practiceSummary, examPanel, actions);

    keepHomeLearnCardUseful(startButton);

    const change = practiceSummary.querySelector('.v40c-change-settings');
    change?.addEventListener('click', () => {
      const open = practiceSummary.classList.toggle('v40c-settings-open');
      change.setAttribute('aria-expanded', String(open));
      change.textContent = open ? 'Hide settings' : 'Change settings';
    });

    ['strand-filter','topic-filter','question-count','difficulty-filter'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', updatePracticeSummary);
    });

    ['practice-mode-btn','exam-mode-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        window.setTimeout(updateModeView, 0);
      });
    });

    updateModeView();
  }

  function applyV40C2(){
    injectStyles();
    buildLearnSetup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV40C2, { once:true });
  } else {
    applyV40C2();
  }
})();
