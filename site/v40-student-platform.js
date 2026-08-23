/* V4.0A — Full Student Learning Platform: learning hub foundation.
   Presentation-only: builds on the stable V3.9 home cards and preserves their
   existing button IDs, event handlers, access rules and backend flows.

   V4.1A adds Actionable Focus Areas to the existing secure My Progress view.
   It reuses the verified Practice access ticket and the existing Practice engine;
   no PIN, answer key, grading authority or new question-selection path is added. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-student-platform-style';

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .v40-learning-hub-hero{
        border:1px solid color-mix(in srgb,var(--primary) 30%,var(--border));
        border-radius:20px;
        padding:clamp(18px,3vw,26px);
        background:linear-gradient(135deg,
          color-mix(in srgb,var(--soft) 78%,var(--card)),
          var(--card));
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:18px;
        align-items:center;
      }

      #start .v40-learning-hub-kicker{
        color:var(--primary);
        font-size:12px;
        font-weight:900;
        letter-spacing:.06em;
        text-transform:uppercase;
        margin-bottom:6px;
      }

      #start .v40-learning-hub-hero h2{
        margin:0 0 7px;
        font-size:clamp(23px,3.3vw,32px);
        line-height:1.2;
      }

      #start .v40-learning-hub-hero p{
        margin:0;
        color:var(--muted);
        line-height:1.55;
        max-width:720px;
      }

      #start .v40-learning-cycle{
        display:flex;
        align-items:center;
        gap:7px;
        flex-wrap:wrap;
        justify-content:flex-end;
      }

      #start .v40-learning-cycle span{
        display:inline-flex;
        align-items:center;
        min-height:34px;
        padding:7px 10px;
        border:1px solid var(--border);
        border-radius:999px;
        background:var(--card);
        font-size:12px;
        font-weight:850;
        white-space:nowrap;
      }

      #start .v40-learning-cycle b{
        color:var(--muted);
        font-size:13px;
      }

      #start .v40-platform-section{
        display:grid;
        gap:12px;
      }

      #start .v40-platform-section + .v40-platform-section{
        margin-top:4px;
      }

      #start .v40-platform-section .v39-section-head{
        margin-bottom:0;
      }

      #start .v40-platform-section[data-section="continue"] .v39-action-card[data-action-for="start-btn"]{
        border-color:color-mix(in srgb,var(--primary) 42%,var(--border));
        box-shadow:0 8px 24px color-mix(in srgb,var(--primary) 8%,transparent);
      }

      #start .v40-platform-section[data-section="learning"] .v39-action-card{
        background:color-mix(in srgb,var(--surface-muted, #f8fafc) 55%,var(--card));
      }

      #start .v40-section-note{
        margin:-3px 0 0;
        color:var(--muted);
        font-size:12px;
        line-height:1.45;
      }

      #student-progress-focus .v41-focus-action{
        display:flex;
        justify-content:flex-end;
        margin-top:12px;
      }

      #student-progress-focus .v41-focus-practice{
        min-height:40px;
        padding:8px 12px;
        font-size:12px;
      }

      html[data-theme="dark"] #start .v40-learning-hub-hero{
        background:linear-gradient(135deg,
          color-mix(in srgb,var(--soft) 28%,var(--card)),
          var(--card));
      }

      @media(max-width:760px){
        #start .v40-learning-hub-hero{
          grid-template-columns:1fr;
          padding:18px;
        }

        #start .v40-learning-cycle{
          justify-content:flex-start;
        }

        #student-progress-focus .v41-focus-practice{
          width:100%;
        }
      }

      @media(max-width:420px){
        #start .v40-learning-cycle{
          display:grid;
          grid-template-columns:1fr;
          align-items:stretch;
        }

        #start .v40-learning-cycle span{
          justify-content:center;
        }

        #start .v40-learning-cycle b{
          display:none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function makeSection(title, description, name){
    const section = document.createElement('section');
    section.className = 'v40-platform-section';
    section.dataset.section = name;

    const head = document.createElement('div');
    head.className = 'v39-section-head';

    const copy = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = description;
    copy.append(heading, paragraph);
    head.appendChild(copy);

    const grid = document.createElement('div');
    grid.className = 'v39-student-action-grid';

    section.append(head, grid);
    return { section, grid };
  }

  function buildLearningHub(){
    const hub = document.querySelector('#start .v39-home-hub');
    if (!hub || hub.classList.contains('v40-platform-ready')) return;

    const oldStudentZone = hub.querySelector('.v39-student-zone');
    const oldGrid = oldStudentZone?.querySelector('.v39-student-action-grid');
    if (!oldStudentZone || !oldGrid) return;

    const practiceCard = oldGrid.querySelector('[data-action-for="start-btn"]');
    const assignmentCard = oldGrid.querySelector('[data-action-for="my-assignments-btn"]');
    const progressCard = oldGrid.querySelector('[data-action-for="my-progress-btn"]');
    const reviewedCard = oldGrid.querySelector('[data-action-for="check-reviewed-btn"]');

    if (!practiceCard || !progressCard || !reviewedCard) return;

    const hero = document.createElement('section');
    hero.className = 'v40-learning-hub-hero';
    hero.setAttribute('aria-label', 'Student learning hub');
    hero.innerHTML = `
      <div>
        <div class="v40-learning-hub-kicker">Your learning hub</div>
        <h2>Learn, check your progress, and keep improving.</h2>
        <p>Everything you need for Maths is organised here — start learning, complete teacher assignments, follow recommended practice, and review feedback.</p>
      </div>
      <div class="v40-learning-cycle" aria-label="Learning cycle">
        <span>✏️ Learn</span><b>→</b><span>📊 Check</span><b>→</b><span>🌱 Improve</span>
      </div>
    `;

    const continueLearning = makeSection(
      'Continue Learning',
      'Start a new activity or continue work from your teacher.',
      'continue'
    );
    continueLearning.grid.appendChild(practiceCard);
    if (assignmentCard) continueLearning.grid.appendChild(assignmentCard);

    const myLearning = makeSection(
      'My Learning',
      'See what to practise next and learn from your previous work.',
      'learning'
    );
    myLearning.grid.append(progressCard, reviewedCard);

    const note = document.createElement('p');
    note.className = 'v40-section-note';
    note.textContent = 'Recommended Practice, achievements and teacher messages are available inside My Progress.';
    myLearning.section.appendChild(note);

    oldStudentZone.replaceWith(continueLearning.section);
    const teacherZone = hub.querySelector('.v39-teacher-zone');
    if (teacherZone) {
      hub.insertBefore(myLearning.section, teacherZone);
      hub.insertBefore(hero, continueLearning.section);
    } else {
      hub.prepend(hero);
      hub.appendChild(myLearning.section);
    }

    hub.classList.add('v40-platform-ready');
  }

  function normaliseLabel(value){
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function strandKeyFromLabel(label){
    if (typeof STRANDS !== 'object' || !STRANDS) return '';

    const wanted = normaliseLabel(label);
    const match = Object.entries(STRANDS).find(([key, display]) =>
      normaliseLabel(key) === wanted || normaliseLabel(display) === wanted
    );

    return match?.[0] || '';
  }

  async function startFocusPractice(topic, strand, button){
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Starting…';

    try {
      if (typeof startRecommendedPracticeV35 !== 'function') {
        throw new Error('Practice is not available yet.');
      }

      if (
        typeof activeStudentAccess === 'undefined' ||
        !activeStudentAccess?.access_token
      ) {
        alert('Your student login has expired. Return Home and sign in again.');
        if (typeof show === 'function') show('start');
        return;
      }

      studentPracticeRecommendationV35 = {
        practice_scope: 'topic',
        practice_strand: strand,
        practice_topic: topic,
        focus_strand: strand,
        focus_topic: topic,
        recommended_count: 5,
        reason: 'focus_area'
      };

      await startRecommendedPracticeV35();
    } catch (error) {
      console.warn('Could not start focus-area practice.', error);
      alert(`Focus practice could not start. ${error?.message || ''}`.trim());
    } finally {
      if (document.contains(button)) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function decorateFocusAreas(){
    const root = document.getElementById('student-progress-focus');
    if (!root) return;

    root.querySelectorAll('.insight-card').forEach(card => {
      if (card.querySelector('.v41-focus-practice')) return;

      const topic = card.querySelector('.row strong')?.textContent?.trim() || '';
      const strandLabel = card.querySelector('.help')?.textContent?.trim() || '';
      const strand = strandKeyFromLabel(strandLabel);

      if (!topic || !strand) return;

      const action = document.createElement('div');
      action.className = 'v41-focus-action';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline v41-focus-practice';
      button.textContent = 'Practice this topic';
      button.setAttribute('aria-label', `Practice ${topic}`);
      button.addEventListener('click', () => startFocusPractice(topic, strand, button));

      action.appendChild(button);
      card.appendChild(action);
    });
  }

  function wireActionableFocusAreas(){
    const root = document.getElementById('student-progress-focus');
    if (!root || root.dataset.v41FocusReady === '1') return;

    root.dataset.v41FocusReady = '1';

    const observer = new MutationObserver(() => decorateFocusAreas());
    observer.observe(root, { childList:true, subtree:true });

    decorateFocusAreas();
  }

  function applyV40A(){
    injectStyles();
    buildLearningHub();
    wireActionableFocusAreas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV40A, { once:true });
  } else {
    applyV40A();
  }
})();