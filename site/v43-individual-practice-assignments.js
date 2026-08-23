/* V4.3A — Individual Practice Assignments.
   Replaces only the teacher-facing V4.2B assignment admin presentation.
   Existing student Practice assignment cards and secure Practice engine remain unchanged.
   Whole-class assignments have no recipient rows; individual assignments have one recipient row. */
(() => {
  'use strict';

  const STYLE_ID = 'v43a-individual-practice-style';
  const SECTION_ID = 'v43a-practice-assignment-admin';
  let assignments = [];
  let attempts = [];
  let recipients = [];
  let refreshBusy = false;
  let refreshQueued = false;

  function html(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #v42b-practice-assignment-admin{display:none!important}
      #${SECTION_ID}{margin-top:22px;border-top:1px solid var(--border);padding-top:20px}
      #${SECTION_ID} .v43a-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
      #${SECTION_ID} .v43a-wide{grid-column:1/-1}
      #${SECTION_ID} .v43a-target-wrap.hidden{display:none}
      #${SECTION_ID} .v43a-list{display:grid;gap:12px;margin-top:14px}
      #${SECTION_ID} .v43a-card{border:1px solid var(--border);border-radius:15px;padding:14px;background:var(--surface-soft,var(--card))}
      #${SECTION_ID} .v43a-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #${SECTION_ID} .v43a-card h4{margin:0 0 4px}
      #${SECTION_ID} .v43a-stats{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      #${SECTION_ID} .v43a-audience{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:7px}
      #${SECTION_ID} .v43a-student-list{margin-top:10px}
      @media(max-width:700px){
        #${SECTION_ID} .v43a-grid{grid-template-columns:1fr}
        #${SECTION_ID} .v43a-wide{grid-column:auto}
        #${SECTION_ID} #v43a-save{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedClass(){
    if (typeof teacherClasses === 'undefined' || typeof selectedClassId === 'undefined') return null;
    return (teacherClasses || []).find(row => String(row?.id) === String(selectedClassId)) || null;
  }

  function classStudents(cls, activeOnly=false){
    if (!cls || typeof teacherStudents === 'undefined') return [];
    return (teacherStudents || []).filter(student =>
      String(student?.class_id) === String(cls.id) && (!activeOnly || student?.active !== false)
    );
  }

  function strandLabel(strand){
    return typeof STRANDS === 'object' && STRANDS ? (STRANDS[strand] || strand || 'Practice') : (strand || 'Practice');
  }

  function logicalQuestionKey(question){
    const parent = text(question?.parent_question_number);
    const paper = text(question?.paper);
    const year = Number(question?.exam_year);
    if (parent && paper && Number.isFinite(year) && year > 0){
      return `group|${year}|${lower(paper).replace(/\s+/g,'')}|${lower(parent).replace(/\s+/g,'')}`;
    }
    return `single|${text(question?.id)}`;
  }

  function matchingQuestions(cls, strand, topic){
    const questions = typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions) ? teacherQuestions : [];
    return questions.filter(question =>
      question?.active !== false &&
      Number(question?.year_level) === Number(cls?.year_level) &&
      lower(question?.strand) === lower(strand) &&
      (!topic || lower(question?.topic) === lower(topic))
    );
  }

  function availableItems(cls, strand, topic){
    return new Set(matchingQuestions(cls,strand,topic).map(logicalQuestionKey)).size;
  }

  function dateLabel(value, prefix){
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : `${prefix} ${date.toLocaleString()}`;
  }

  function feedback(kind,message){
    const root = document.getElementById('v43a-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function recipientsFor(assignmentId){
    return recipients.filter(row => String(row?.assignment_id) === String(assignmentId));
  }

  function attemptFor(assignmentId,studentId){
    return attempts.find(row =>
      String(row?.assignment_id) === String(assignmentId) &&
      String(row?.roster_student_id) === String(studentId)
    ) || null;
  }

  function populateStudents(){
    const cls = selectedClass();
    const select = document.getElementById('v43a-target-student');
    if (!cls || !select) return;
    const active = classStudents(cls,true).sort((a,b) => text(a.student_name).localeCompare(text(b.student_name),undefined,{numeric:true}));
    const previous = select.value;
    select.innerHTML = active.map(student =>
      `<option value="${html(student.id)}">${html(student.student_name)} · ${html(student.student_id)}</option>`
    ).join('');
    if (active.some(student => String(student.id) === String(previous))) select.value = previous;
  }

  function updateAudienceControls(){
    const audience = document.getElementById('v43a-audience')?.value || 'class';
    const wrap = document.getElementById('v43a-target-wrap');
    if (wrap) wrap.classList.toggle('hidden',audience !== 'student');
  }

  function populateTopics(){
    const cls = selectedClass();
    const strand = document.getElementById('v43a-strand')?.value || '';
    const topicSelect = document.getElementById('v43a-topic');
    const availability = document.getElementById('v43a-availability');
    if (!cls || !topicSelect) return;

    const topics = [...new Set(matchingQuestions(cls,strand,'').map(q => text(q.topic)).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b,undefined,{numeric:true}));
    const previous = topicSelect.value;
    topicSelect.innerHTML = '<option value="">All topics in this strand</option>' +
      topics.map(topic => `<option value="${html(topic)}">${html(topic)}</option>`).join('');
    if (topics.includes(previous)) topicSelect.value = previous;

    if (availability){
      const count = availableItems(cls,strand,topicSelect.value);
      availability.textContent = count
        ? `${count} logical question${count===1?'':'s'} currently available for this selection.`
        : 'No active questions currently match this selection.';
    }
  }

  async function loadData(){
    if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser){
      assignments = []; attempts = []; recipients = []; return;
    }
    const [a,b,c] = await Promise.all([
      cloud.from('practice_assignments').select('*').order('created_at',{ascending:false}),
      cloud.from('practice_assignment_attempts').select('*').order('started_at',{ascending:false}),
      cloud.from('practice_assignment_recipients').select('*')
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    if (c.error) throw c.error;
    assignments = a.data || [];
    attempts = b.data || [];
    recipients = c.data || [];
  }

  function relevantStudentsFor(assignment,cls){
    const targetRows = recipientsFor(assignment.id);
    if (!targetRows.length) return classStudents(cls,true);
    const ids = new Set(targetRows.map(row => String(row.roster_student_id)));
    return classStudents(cls,false).filter(student => ids.has(String(student.id)));
  }

  function renderList(){
    const root = document.getElementById('v43a-list');
    const cls = selectedClass();
    if (!root || !cls) return;
    const classAssignments = assignments.filter(row => String(row?.class_id) === String(cls.id));
    if (!classAssignments.length){
      root.innerHTML = '<div class="empty">No targeted Practice assignments for this class yet.</div>';
      return;
    }

    root.innerHTML = classAssignments.map(assignment => {
      const targetRows = recipientsFor(assignment.id);
      const targeted = targetRows.length > 0;
      const students = relevantStudentsFor(assignment,cls);
      const rows = students.map(student => ({student,attempt:attemptFor(assignment.id,student.id)}));
      const started = rows.filter(row => row.attempt).length;
      const completed = rows.filter(row => row.attempt?.status === 'completed').length;
      const inProgress = rows.filter(row => row.attempt?.status === 'in_progress').length;
      const pct = students.length ? Math.round(started / students.length * 100) : 0;
      const title = assignment.topic || `${strandLabel(assignment.strand)} — all topics`;
      const available = availableItems(cls,assignment.strand,assignment.topic || '');
      const audienceText = targeted
        ? (students.map(student => student.student_name).join(', ') || 'Individual student')
        : `Whole class · ${students.length} active student${students.length===1?'':'s'}`;

      return `
        <article class="v43a-card">
          <div class="v43a-card-head">
            <div>
              <h4>✏️ ${html(title)}</h4>
              <div class="help">${html(strandLabel(assignment.strand))} · ${Number(assignment.question_count||5)} question target · ${available} currently available</div>
              <div class="help">${html(dateLabel(assignment.opens_at,'Starts') || 'Available immediately')} · ${html(dateLabel(assignment.closes_at,'Target due') || 'No target due date')}</div>
              <div class="v43a-audience"><span class="tag">${targeted?'Individual':'Whole class'}</span><span class="help">${html(audienceText)}</span></div>
            </div>
            <span class="tag ${assignment.active?'availability-on':'availability-off'}">${assignment.active?'Active':'Inactive'}</span>
          </div>
          <div class="v43a-stats">
            <span class="tag">${started}/${students.length} started</span>
            <span class="tag">${completed} completed</span>
            <span class="tag">${inProgress} in progress</span>
            <span class="tag">${Math.max(0,students.length-started)} not started</span>
          </div>
          <div class="participation-bar"><span style="width:${pct}%"></span></div>
          <details class="v43a-student-list">
            <summary>${targeted?'Assigned student':'Student participation'}</summary>
            ${rows.map(({student,attempt}) => {
              const status = attempt?.status === 'completed' ? 'Completed' : attempt ? 'In progress' : 'Not started';
              const className = attempt?.status === 'completed' ? 'completed' : attempt ? 'in-progress' : 'incomplete';
              const session = attempt?.practice_session_id && typeof teacherResults !== 'undefined'
                ? (teacherResults || []).find(result => String(result?.id) === String(attempt.practice_session_id))
                : null;
              const mastery = session && Number.isFinite(Number(session.mastery_percent)) ? ` · ${Number(session.mastery_percent)}% mastery` : '';
              const inactive = student.active === false ? ' · inactive roster' : '';
              return `<div class="roster-row"><div><strong>${html(student.student_name)}</strong><div class="help">${html(student.student_id)}${html(mastery)}${html(inactive)}</div></div><span class="attempt-status ${className}">${status}</span></div>`;
            }).join('') || '<div class="empty">Assigned roster student is no longer available.</div>'}
          </details>
          <div class="buttons">
            <button class="outline v43a-toggle" data-id="${html(assignment.id)}" data-active="${assignment.active?'true':'false'}" type="button">${assignment.active?'Deactivate':'Activate'}</button>
          </div>
        </article>`;
    }).join('');

    root.querySelectorAll('.v43a-toggle').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const next = button.dataset.active !== 'true';
          const {error} = await cloud.from('practice_assignments')
            .update({active:next,updated_at:new Date().toISOString()})
            .eq('id',button.dataset.id);
          if (error) throw error;
          feedback('correct',next?'Practice assignment activated.':'Practice assignment deactivated.');
          await loadData();
          renderList();
        } catch (error){
          feedback('incorrect',error?.message || String(error));
        } finally {
          if (document.contains(button)) button.disabled = false;
        }
      });
    });
  }

  function ensureSection(){
    const anchor = document.getElementById('assignment-list');
    if (!anchor) return null;
    let section = document.getElementById(SECTION_ID);
    if (section) return section;

    section = document.createElement('section');
    section.id = SECTION_ID;
    section.innerHTML = `
      <div class="header">
        <div>
          <h3>Assign targeted Practice</h3>
          <p class="muted">Assign a short strand or topic Practice target to the whole class or one student.</p>
        </div>
        <span class="tag">V4.3A</span>
      </div>
      <div class="info">Individual assignments are visible only to the selected student. Opening and due dates remain learning targets rather than hard access blocks.</div>
      <div class="v43a-grid">
        <label>Assign to
          <select id="v43a-audience"><option value="class">Whole class</option><option value="student">One student</option></select>
        </label>
        <label id="v43a-target-wrap" class="v43a-target-wrap hidden">Student
          <select id="v43a-target-student"></select>
        </label>
        <label>Strand<select id="v43a-strand"></select></label>
        <label>Topic<select id="v43a-topic"><option value="">All topics in this strand</option></select></label>
        <label>Question target<input id="v43a-count" type="number" min="1" max="20" value="5"><span class="help">Usually 5 or 10 questions.</span></label>
        <label>Suggested start<input id="v43a-opens" type="datetime-local"><span class="help">Does not restrict access.</span></label>
        <label>Target due date<input id="v43a-closes" type="datetime-local"><span class="help">Students can still complete it afterwards.</span></label>
        <div class="v43a-wide help" id="v43a-availability"></div>
      </div>
      <button id="v43a-save" class="primary" type="button">Assign Practice</button>
      <div id="v43a-feedback" class="feedback hidden"></div>
      <div id="v43a-list" class="v43a-list"></div>`;
    anchor.insertAdjacentElement('afterend',section);

    const strand = section.querySelector('#v43a-strand');
    const entries = typeof STRANDS === 'object' && STRANDS ? Object.entries(STRANDS) : [];
    strand.innerHTML = entries.map(([key,label]) => `<option value="${html(key)}">${html(label)}</option>`).join('');
    if (!strand.value && entries.length) strand.value = entries[0][0];

    section.querySelector('#v43a-audience').addEventListener('change',updateAudienceControls);
    strand.addEventListener('change',populateTopics);
    section.querySelector('#v43a-topic').addEventListener('change',populateTopics);
    section.querySelector('#v43a-save').addEventListener('click',saveAssignment);
    populateStudents();
    populateTopics();
    updateAudienceControls();
    return section;
  }

  async function saveAssignment(){
    const cls = selectedClass();
    if (!cls){ feedback('try','Select a class first.'); return; }
    const audience = document.getElementById('v43a-audience')?.value || 'class';
    const targetStudent = audience === 'student' ? (document.getElementById('v43a-target-student')?.value || '') : '';
    const strand = document.getElementById('v43a-strand')?.value || '';
    const topic = document.getElementById('v43a-topic')?.value || '';
    const requested = Math.max(1,Math.min(20,Number(document.getElementById('v43a-count')?.value)||5));
    const opens = document.getElementById('v43a-opens')?.value || '';
    const closes = document.getElementById('v43a-closes')?.value || '';

    if (audience === 'student' && !targetStudent){ feedback('try','Choose a student.'); return; }
    if (!strand){ feedback('try','Choose a strand.'); return; }
    if (opens && closes && Date.parse(closes) <= Date.parse(opens)){ feedback('try','Target due date must be after the suggested start.'); return; }

    const button = document.getElementById('v43a-save');
    if (!button) return;
    button.disabled = true;
    button.textContent = 'Assigning…';
    try {
      const {data,error} = await cloud.rpc('create_teacher_practice_assignment_v43',{
        p_class_id:cls.id,
        p_strand:strand,
        p_topic:topic || null,
        p_question_count:requested,
        p_opens_at:opens ? new Date(opens).toISOString() : null,
        p_closes_at:closes ? new Date(closes).toISOString() : null,
        p_target_student_id:targetStudent || null
      });
      if (error) throw error;
      const actual = Number(data?.recommended_count || requested);
      const who = data?.audience === 'individual' ? ` for ${data?.target_student_name || 'the selected student'}` : ' for the whole class';
      feedback('correct',`Practice assigned${who}. ${actual} matching question${actual===1?'':'s'} will be used.`);
      await loadData();
      renderList();
    } catch (error){
      feedback('incorrect',error?.message || String(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Assign Practice';
    }
  }

  async function refresh(){
    if (refreshBusy) return;
    const cls = selectedClass();
    if (!cls) return;
    const section = ensureSection();
    if (!section) return;
    populateStudents();
    populateTopics();
    updateAudienceControls();
    refreshBusy = true;
    try {
      await loadData();
      renderList();
    } catch (error){
      feedback('incorrect',`Could not load targeted Practice assignments. ${error?.message || ''}`.trim());
    } finally {
      refreshBusy = false;
    }
  }

  function scheduleRefresh(){
    if (refreshQueued) return;
    refreshQueued = true;
    setTimeout(() => { refreshQueued = false; refresh(); },0);
  }

  function wire(){
    injectStyles();
    scheduleRefresh();

    const content = document.getElementById('selected-class-content');
    if (content){
      const observer = new MutationObserver(scheduleRefresh);
      observer.observe(content,{childList:true});
    }

    try {
      if (typeof renderClassAdmin === 'function' && !renderClassAdmin.__v43aWrapped){
        const previous = renderClassAdmin;
        const wrapped = function(...args){
          const result = previous.apply(this,args);
          scheduleRefresh();
          return result;
        };
        wrapped.__v43aWrapped = true;
        renderClassAdmin = wrapped;
      }
    } catch (error){
      console.warn('V4.3A could not wrap class renderer.',error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
