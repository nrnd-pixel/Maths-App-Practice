/* V3.9A — Student Home & Navigation polish.
   Presentation-only: preserves existing button IDs, event handlers and app logic. */
(() => {
  'use strict';

  const STYLE_ID = 'v39-student-home-style';

  const actionDefinitions = [
    {
      id: 'start-btn',
      icon: '✏️',
      title: 'Practice or Exam',
      description: 'Choose your mode and start solving maths questions.',
      emphasis: 'primary'
    },
    {
      id: 'my-assignments-btn',
      icon: '📚',
      title: 'My Assignments',
      description: 'See work your teacher has assigned and continue where you left off.'
    },
    {
      id: 'my-progress-btn',
      icon: '📊',
      title: 'My Progress',
      description: 'See your progress, achievements and recommended practice.'
    },
    {
      id: 'check-reviewed-btn',
      icon: '✅',
      title: 'Reviewed Work',
      description: 'Check feedback on work that has been reviewed by your teacher.'
    }
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .v39-home-hub{
        margin-top:24px;
        display:grid;
        gap:22px;
      }

      #start .v39-section-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
      }

      #start .v39-section-head h2{
        margin:0 0 4px;
        font-size:clamp(20px,2.7vw,27px);
      }

      #start .v39-section-head p{
        margin:0;
        color:var(--muted);
        line-height:1.5;
      }

      #start .v39-student-action-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }

      #start .v39-action-card{
        min-width:0;
        border:1px solid var(--border);
        border-radius:17px;
        padding:15px;
        background:var(--card);
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        grid-template-areas:
          'icon copy'
          'button button';
        gap:10px 12px;
        align-items:start;
      }

      #start .v39-action-card[data-emphasis="primary"]{
        border-color:color-mix(in srgb,var(--primary) 35%,var(--border));
        background:color-mix(in srgb,var(--soft) 55%,var(--card));
      }

      #start .v39-action-icon{
        grid-area:icon;
        width:42px;
        height:42px;
        border-radius:13px;
        display:grid;
        place-items:center;
        background:var(--soft);
        font-size:21px;
        line-height:1;
      }

      #start .v39-action-copy{
        grid-area:copy;
        min-width:0;
      }

      #start .v39-action-title{
        font-size:16px;
        font-weight:850;
        line-height:1.3;
        margin-bottom:3px;
      }

      #start .v39-action-description{
        color:var(--muted);
        font-size:13px;
        line-height:1.45;
      }

      #start .v39-action-card > button{
        grid-area:button;
        width:100%;
        margin:2px 0 0;
        min-height:48px;
      }

      #start .v39-teacher-zone{
        border-top:1px solid var(--border);
        padding-top:18px;
      }

      #start .v39-teacher-zone-head{
        display:flex;
        align-items:center;
        gap:9px;
        margin-bottom:10px;
        color:var(--muted);
        font-size:13px;
        font-weight:800;
      }

      #start .v39-teacher-actions{
        display:flex;
        flex-wrap:wrap;
        gap:9px;
      }

      #start .v39-teacher-actions button{
        min-height:42px;
        padding:9px 14px;
        font-size:13px;
      }

      #start .v39-original-actions-empty{
        display:none!important;
      }

      html[data-theme="dark"] #start .v39-action-card{
        background:var(--card);
      }

      html[data-theme="dark"] #start .v39-action-card[data-emphasis="primary"]{
        background:color-mix(in srgb,var(--soft) 32%,var(--card));
      }

      @media(max-width:760px){
        #start .v39-home-hub{
          margin-top:20px;
          gap:18px;
        }

        #start .v39-student-action-grid{
          grid-template-columns:1fr;
        }

        #start .v39-action-card{
          padding:14px;
        }

        #start .v39-teacher-actions{
          display:grid;
          grid-template-columns:1fr 1fr;
        }

        #start .v39-teacher-actions button{
          width:100%;
        }
      }

      @media(max-width:420px){
        #start .v39-teacher-actions{
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createActionCard(definition, button) {
    const card = document.createElement('article');
    card.className = 'v39-action-card';
    card.dataset.actionFor = definition.id;
    if (definition.emphasis) card.dataset.emphasis = definition.emphasis;

    const icon = document.createElement('div');
    icon.className = 'v39-action-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = definition.icon;

    const copy = document.createElement('div');
    copy.className = 'v39-action-copy';

    const title = document.createElement('div');
    title.className = 'v39-action-title';
    title.textContent = definition.title;

    const description = document.createElement('div');
    description.className = 'v39-action-description';
    description.textContent = definition.description;

    copy.append(title, description);
    card.append(icon, copy, button);
    return card;
  }

  function syncCardVisibility(button, card) {
    const sync = () => {
      card.classList.toggle('hidden', button.classList.contains('hidden'));
    };
    sync();
    new MutationObserver(sync).observe(button, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  function buildHomeHub() {
    const start = document.getElementById('start');
    const startButton = document.getElementById('start-btn');
    if (!start || !startButton || start.querySelector('.v39-home-hub')) return;

    const originalActions = startButton.closest('.buttons');
    if (!originalActions) return;

    const hub = document.createElement('div');
    hub.className = 'v39-home-hub';

    const studentSection = document.createElement('section');
    studentSection.className = 'v39-student-zone';
    studentSection.setAttribute('aria-label', 'Student actions');

    const sectionHead = document.createElement('div');
    sectionHead.className = 'v39-section-head';
    sectionHead.innerHTML = `
      <div>
        <h2>What would you like to do?</h2>
        <p>Choose your next maths activity.</p>
      </div>
    `;

    const actionGrid = document.createElement('div');
    actionGrid.className = 'v39-student-action-grid';

    actionDefinitions.forEach(definition => {
      const button = document.getElementById(definition.id);
      if (!button) return;
      const card = createActionCard(definition, button);
      syncCardVisibility(button, card);
      actionGrid.appendChild(card);
    });

    studentSection.append(sectionHead, actionGrid);
    hub.appendChild(studentSection);

    const teacherButton = document.getElementById('teacher-btn');
    const setupButton = document.getElementById('setup-btn');
    if (teacherButton || setupButton) {
      const teacherSection = document.createElement('section');
      teacherSection.className = 'v39-teacher-zone';
      teacherSection.setAttribute('aria-label', 'Teacher tools');

      const teacherHead = document.createElement('div');
      teacherHead.className = 'v39-teacher-zone-head';
      teacherHead.innerHTML = '<span aria-hidden="true">🔒</span><span>Teacher tools</span>';

      const teacherActions = document.createElement('div');
      teacherActions.className = 'v39-teacher-actions';
      if (teacherButton) teacherActions.appendChild(teacherButton);
      if (setupButton) teacherActions.appendChild(setupButton);

      teacherSection.append(teacherHead, teacherActions);
      hub.appendChild(teacherSection);
    }

    originalActions.insertAdjacentElement('afterend', hub);
    if (!originalActions.children.length) {
      originalActions.classList.add('v39-original-actions-empty');
    }
  }

  function applyV39A() {
    injectStyles();
    buildHomeHub();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV39A, { once: true });
  } else {
    applyV39A();
  }
})();
