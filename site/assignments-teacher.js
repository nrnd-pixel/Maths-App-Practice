/* Phase 4 — Teacher Assignments teacher runtime.
   Consolidates the final V4.3B teacher experience and uses AssignmentsCore's
   V5.3D1 Practice-resource eligibility directly. The exact V43B DOM contract is
   preserved for untouched V44/V47/V48/V56B consumers. */
(() => {
  'use strict';

  const core = typeof module !== 'undefined' && module.exports
    ? require('./assignments-core.js')
    : window.AssignmentsCore;
  if (!core) throw new Error('AssignmentsCore must load before assignments-teacher.js');

  const ROOT=typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__assignmentsTeacherInstalled) return;
  ROOT.__assignmentsTeacherInstalled=true;

  const STYLE_ID='v43b-multi-recipient-practice-style';
  const SECTION_ID='v43b-practice-assignment-admin';
  let assignments=[];
  let attempts=[];
  let recipients=[];
  let refreshBusy=false;
  let refreshQueued=false;

  const html=core.html;
  const text=core.trim;
  const dateLabel=core.dateLabel;
  const strandLabel=core.strandLabel;

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #v43a-practice-assignment-admin{display:none!important}
      #${SECTION_ID}{margin-top:22px;border-top:1px solid var(--border);padding-top:20px}
      #${SECTION_ID} .v43b-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
      #${SECTION_ID} .v43b-wide{grid-column:1/-1}
      #${SECTION_ID} .v43b-target-wrap.hidden{display:none}
      #${SECTION_ID} .v43b-picker{border:1px solid var(--border);border-radius:14px;padding:12px;background:var(--surface-soft,var(--card))}
      #${SECTION_ID} .v43b-picker-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px}
      #${SECTION_ID} .v43b-picker-actions{display:flex;gap:7px;flex-wrap:wrap}
      #${SECTION_ID} .v43b-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:230px;overflow:auto}
      #${SECTION_ID} .v43b-option{display:flex;align-items:flex-start;gap:9px;border:1px solid var(--border);border-radius:11px;padding:9px 10px;background:var(--card);cursor:pointer}
      #${SECTION_ID} .v43b-option input{width:auto;margin-top:2px;flex:0 0 auto}
      #${SECTION_ID} .v43b-option strong{display:block}
      #${SECTION_ID} .v43b-list{display:grid;gap:12px;margin-top:14px}
      #${SECTION_ID} .v43b-card{border:1px solid var(--border);border-radius:15px;padding:14px;background:var(--surface-soft,var(--card))}
      #${SECTION_ID} .v43b-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #${SECTION_ID} .v43b-card h4{margin:0 0 4px}
      #${SECTION_ID} .v43b-stats{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      #${SECTION_ID} .v43b-audience{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:7px}
      #${SECTION_ID} .v43b-student-list{margin-top:10px}
      @media(max-width:700px){
        #${SECTION_ID} .v43b-grid{grid-template-columns:1fr}
        #${SECTION_ID} .v43b-wide{grid-column:auto}
        #${SECTION_ID} .v43b-options{grid-template-columns:1fr;max-height:280px}
        #${SECTION_ID} #v43b-save{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedClass(){ return core.selectedTeacherClass(); }

  function classStudents(cls,activeOnly=false){
    try {
      if (!cls || !Array.isArray(teacherStudents)) return [];
      return teacherStudents.filter(student=>
        String(student?.class_id) === String(cls.id) && (!activeOnly || student?.active !== false)
      );
    } catch { return []; }
  }

  function sameYearClasses(cls){
    try {
      if (!cls || !Array.isArray(teacherClasses)) return [];
      return teacherClasses.filter(row=>row?.active !== false && Number(row?.year_level) === Number(cls.year_level));
    } catch { return []; }
  }

  function feedback(kind,message){
    const root=document.getElementById('v43b-feedback');
    if (!root) return;
    root.className=`feedback ${kind}`;
    root.textContent=message;
    root.classList.remove('hidden');
  }

  function recipientsFor(assignmentId){
    return recipients.filter(row=>String(row?.assignment_id) === String(assignmentId));
  }

  function attemptFor(assignmentId,studentId){
    return attempts.find(row=>
      String(row?.assignment_id) === String(assignmentId) &&
      String(row?.roster_student_id) === String(studentId)
    ) || null;
  }

  function checkedValues(selector){
    return [...document.querySelectorAll(selector)].filter(input=>input.checked).map(input=>input.value);
  }

  function setAll(selector,checked){
    document.querySelectorAll(selector).forEach(input=>{ input.checked=checked; });
  }

  function populateTargetPickers(){
    const cls=selectedClass();
    if (!cls) return;
    const studentRoot=document.getElementById('v43b-student-options');
    const classRoot=document.getElementById('v43b-class-options');

    if (studentRoot){
      const classChanged=studentRoot.dataset.classId !== String(cls.id);
      const previous=classChanged ? new Set() : new Set(checkedValues('#v43b-student-options input[type="checkbox"]'));
      const students=classStudents(cls,true).sort((a,b)=>text(a.student_name).localeCompare(text(b.student_name),undefined,{numeric:true}));
      studentRoot.innerHTML=students.map(student=>`
        <label class="v43b-option">
          <input type="checkbox" value="${html(student.id)}" ${previous.has(String(student.id))?'checked':''}>
          <span><strong>${html(student.student_name)}</strong><span class="help">${html(student.student_id)}</span></span>
        </label>`).join('') || '<div class="empty">No active students in this class.</div>';
      studentRoot.dataset.classId=String(cls.id);
    }

    if (classRoot){
      const contextKey=`${cls.id}|${cls.year_level}`;
      const contextChanged=classRoot.dataset.contextKey !== contextKey;
      const previous=contextChanged ? new Set([String(cls.id)]) : new Set(checkedValues('#v43b-class-options input[type="checkbox"]'));
      const classes=sameYearClasses(cls).sort((a,b)=>text(a.name).localeCompare(text(b.name),undefined,{numeric:true}));
      classRoot.innerHTML=classes.map(row=>`
        <label class="v43b-option">
          <input type="checkbox" value="${html(row.id)}" ${previous.has(String(row.id))?'checked':''}>
          <span><strong>${html(row.name)}</strong><span class="help">Year ${Number(row.year_level)}</span></span>
        </label>`).join('') || '<div class="empty">No active classes in this year level.</div>';
      classRoot.dataset.contextKey=contextKey;
    }
  }

  function updateAudienceControls(){
    const audience=document.getElementById('v43b-audience')?.value || 'class';
    document.getElementById('v43b-student-target-wrap')?.classList.toggle('hidden',audience !== 'students');
    document.getElementById('v43b-class-target-wrap')?.classList.toggle('hidden',audience !== 'classes');
  }

  function populateTopics(){
    const cls=selectedClass();
    const strand=document.getElementById('v43b-strand')?.value || '';
    const topicSelect=document.getElementById('v43b-topic');
    const availability=document.getElementById('v43b-availability');
    if (!cls || !topicSelect) return;

    const topics=core.topicOptions(cls,strand);
    const previous=topicSelect.value;
    topicSelect.innerHTML='<option value="">All topics in this strand</option>' +
      topics.map(topic=>`<option value="${html(topic)}">${html(topic)}</option>`).join('');
    if (previous === '' || topics.includes(previous)) topicSelect.value=previous;

    if (availability){
      const count=core.availableItems(cls,strand,topicSelect.value);
      availability.textContent=count
        ? `${count} Practice-resource logical question${count===1?'':'s'} available for Year ${Number(cls.year_level)}. Multi-class assignment is limited to this same year level.`
        : 'No Practice-eligible questions currently match this selection.';
      availability.dataset.v53d1Aligned='1';
    }
  }

  async function loadData(){
    if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser){
      assignments=[]; attempts=[]; recipients=[]; return;
    }
    const [a,b,c]=await Promise.all([
      cloud.from('practice_assignments').select('*').order('created_at',{ascending:false}),
      cloud.from('practice_assignment_attempts').select('*').order('started_at',{ascending:false}),
      cloud.from('practice_assignment_recipients').select('*')
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    if (c.error) throw c.error;
    assignments=a.data || [];
    attempts=b.data || [];
    recipients=c.data || [];
  }

  function relevantStudentsFor(assignment,cls){
    const targetRows=recipientsFor(assignment.id);
    if (!targetRows.length) return classStudents(cls,true);
    const ids=new Set(targetRows.map(row=>String(row.roster_student_id)));
    return classStudents(cls,false).filter(student=>ids.has(String(student.id)));
  }

  function renderList(){
    const root=document.getElementById('v43b-list');
    const cls=selectedClass();
    if (!root || !cls) return;
    const classAssignments=assignments.filter(row=>String(row?.class_id) === String(cls.id));
    if (!classAssignments.length){
      root.innerHTML='<div class="empty">No targeted Practice assignments for this class yet.</div>';
      return;
    }

    root.innerHTML=classAssignments.map(assignment=>{
      const targetRows=recipientsFor(assignment.id);
      const students=relevantStudentsFor(assignment,cls);
      const rows=students.map(student=>({student,attempt:attemptFor(assignment.id,student.id)}));
      const started=rows.filter(row=>row.attempt).length;
      const completed=rows.filter(row=>row.attempt?.status === 'completed').length;
      const inProgress=rows.filter(row=>row.attempt?.status === 'in_progress').length;
      const pct=students.length ? Math.round(started / students.length * 100) : 0;
      const title=assignment.topic || `${strandLabel(assignment.strand)} — all topics`;
      const available=core.availableItems(cls,assignment.strand,assignment.topic || '');
      const audienceTag=targetRows.length === 0 ? 'Whole class' : targetRows.length === 1 ? 'Individual' : 'Selected students';
      const audienceText=targetRows.length
        ? (students.map(student=>student.student_name).join(', ') || `${targetRows.length} selected student${targetRows.length===1?'':'s'}`)
        : `${students.length} active student${students.length===1?'':'s'} in ${cls.name}`;

      return `
        <article class="v43b-card">
          <div class="v43b-card-head">
            <div>
              <h4>✏️ ${html(title)}</h4>
              <div class="help" data-v53d1-aligned="1">${html(strandLabel(assignment.strand))} · ${Number(assignment.question_count||5)} question target · ${available} Practice-resource question${available===1?'':'s'} currently available</div>
              <div class="help">${html(dateLabel(assignment.opens_at,'Starts') || 'Available immediately')} · ${html(dateLabel(assignment.closes_at,'Target due') || 'No target due date')}</div>
              <div class="v43b-audience"><span class="tag">${audienceTag}</span><span class="help">${html(audienceText)}</span></div>
            </div>
            <span class="tag ${assignment.active?'availability-on':'availability-off'}">${assignment.active?'Active':'Inactive'}</span>
          </div>
          <div class="v43b-stats">
            <span class="tag">${started}/${students.length} started</span>
            <span class="tag">${completed} completed</span>
            <span class="tag">${inProgress} in progress</span>
            <span class="tag">${Math.max(0,students.length-started)} not started</span>
          </div>
          <div class="participation-bar"><span style="width:${pct}%"></span></div>
          <details class="v43b-student-list">
            <summary>${targetRows.length?'Assigned students':'Student participation'}</summary>
            ${rows.map(({student,attempt})=>{
              const status=attempt?.status === 'completed' ? 'Completed' : attempt ? 'In progress' : 'Not started';
              const className=attempt?.status === 'completed' ? 'completed' : attempt ? 'in-progress' : 'incomplete';
              const session=attempt?.practice_session_id && typeof teacherResults !== 'undefined'
                ? (teacherResults || []).find(result=>String(result?.id) === String(attempt.practice_session_id))
                : null;
              const mastery=session && Number.isFinite(Number(session.mastery_percent)) ? ` · ${Number(session.mastery_percent)}% mastery` : '';
              const inactive=student.active === false ? ' · inactive roster' : '';
              return `<div class="roster-row"><div><strong>${html(student.student_name)}</strong><div class="help">${html(student.student_id)}${html(mastery)}${html(inactive)}</div></div><span class="attempt-status ${className}">${status}</span></div>`;
            }).join('') || '<div class="empty">Assigned roster students are no longer available.</div>'}
          </details>
          <div class="buttons">
            <button class="outline v43b-toggle" data-id="${html(assignment.id)}" data-active="${assignment.active?'true':'false'}" type="button">${assignment.active?'Deactivate':'Activate'}</button>
          </div>
        </article>`;
    }).join('');

    root.querySelectorAll('.v43b-toggle').forEach(button=>{
      button.addEventListener('click',async()=>{
        button.disabled=true;
        try {
          const next=button.dataset.active !== 'true';
          const {error}=await cloud.from('practice_assignments')
            .update({active:next,updated_at:new Date().toISOString()})
            .eq('id',button.dataset.id);
          if (error) throw error;
          feedback('correct',next?'Practice assignment activated.':'Practice assignment deactivated.');
          await loadData();
          renderList();
        } catch (error){
          feedback('incorrect',error?.message || String(error));
        } finally {
          if (document.contains(button)) button.disabled=false;
        }
      });
    });
  }

  function ensureSection(){
    const anchor=document.getElementById('assignment-list');
    if (!anchor) return null;
    let section=document.getElementById(SECTION_ID);
    if (section) return section;

    section=document.createElement('section');
    section.id=SECTION_ID;
    section.innerHTML=`
      <div class="header">
        <div>
          <h3>Assign targeted Practice</h3>
          <p class="muted">Assign one Practice target to the selected class, selected students, or multiple same-year classes.</p>
        </div>
        <span class="tag" data-v53d1-aligned="1">V5.3D1</span>
      </div>
      <div class="info">Selected-student assignments stay private to those learners. Multi-class assignment creates one class-owned assignment per selected class so participation remains separate and clear.</div>
      <div class="v43b-grid">
        <label>Assign to
          <select id="v43b-audience">
            <option value="class">Whole selected class</option>
            <option value="students">Selected students</option>
            <option value="classes">Multiple classes</option>
          </select>
        </label>
        <div></div>
        <div id="v43b-student-target-wrap" class="v43b-target-wrap v43b-wide hidden">
          <div class="v43b-picker">
            <div class="v43b-picker-head"><strong>Choose students</strong><div class="v43b-picker-actions"><button type="button" class="outline" id="v43b-students-all">Select all</button><button type="button" class="outline" id="v43b-students-clear">Clear</button></div></div>
            <div id="v43b-student-options" class="v43b-options"></div>
          </div>
        </div>
        <div id="v43b-class-target-wrap" class="v43b-target-wrap v43b-wide hidden">
          <div class="v43b-picker">
            <div class="v43b-picker-head"><div><strong>Choose classes</strong><div class="help">Only active classes in Year <span id="v43b-class-year"></span> are shown.</div></div><div class="v43b-picker-actions"><button type="button" class="outline" id="v43b-classes-all">Select all</button><button type="button" class="outline" id="v43b-classes-clear">Clear</button></div></div>
            <div id="v43b-class-options" class="v43b-options"></div>
          </div>
        </div>
        <label>Strand<select id="v43b-strand"></select></label>
        <label>Topic<select id="v43b-topic"><option value="">All topics in this strand</option></select></label>
        <label>Question target<input id="v43b-count" type="number" min="1" max="20" value="5"><span class="help">Usually 5 or 10 questions.</span></label>
        <label>Suggested start<input id="v43b-opens" type="datetime-local"><span class="help">Does not restrict access.</span></label>
        <label>Target due date<input id="v43b-closes" type="datetime-local"><span class="help">Students can still complete it afterwards.</span></label>
        <div class="v43b-wide help" id="v43b-availability" data-v53d1-aligned="1"></div>
      </div>
      <button id="v43b-save" class="primary" type="button">Assign Practice</button>
      <div id="v43b-feedback" class="feedback hidden"></div>
      <div id="v43b-list" class="v43b-list"></div>`;
    anchor.insertAdjacentElement('afterend',section);

    const strand=section.querySelector('#v43b-strand');
    const entries=typeof STRANDS === 'object' && STRANDS ? Object.entries(STRANDS) : [];
    strand.innerHTML=entries.map(([key,label])=>`<option value="${html(key)}">${html(label)}</option>`).join('');
    if (!strand.value && entries.length) strand.value=entries[0][0];

    section.querySelector('#v43b-audience').addEventListener('change',updateAudienceControls);
    strand.addEventListener('change',populateTopics);
    section.querySelector('#v43b-topic').addEventListener('change',populateTopics);
    section.querySelector('#v43b-save').addEventListener('click',saveAssignment);
    section.querySelector('#v43b-students-all').addEventListener('click',()=>setAll('#v43b-student-options input[type="checkbox"]',true));
    section.querySelector('#v43b-students-clear').addEventListener('click',()=>setAll('#v43b-student-options input[type="checkbox"]',false));
    section.querySelector('#v43b-classes-all').addEventListener('click',()=>setAll('#v43b-class-options input[type="checkbox"]',true));
    section.querySelector('#v43b-classes-clear').addEventListener('click',()=>setAll('#v43b-class-options input[type="checkbox"]',false));

    populateTargetPickers();
    populateTopics();
    updateAudienceControls();
    return section;
  }

  async function saveAssignment(){
    const cls=selectedClass();
    if (!cls){ feedback('try','Select a class first.'); return; }

    const audience=document.getElementById('v43b-audience')?.value || 'class';
    const strand=document.getElementById('v43b-strand')?.value || '';
    const topic=document.getElementById('v43b-topic')?.value || '';
    const requested=Math.max(1,Math.min(20,Number(document.getElementById('v43b-count')?.value)||5));
    const opens=document.getElementById('v43b-opens')?.value || '';
    const closes=document.getElementById('v43b-closes')?.value || '';

    let classIds=[String(cls.id)];
    let studentIds=[];
    if (audience === 'students') studentIds=checkedValues('#v43b-student-options input[type="checkbox"]');
    if (audience === 'classes') classIds=checkedValues('#v43b-class-options input[type="checkbox"]');

    if (audience === 'students' && !studentIds.length){ feedback('try','Choose at least one student.'); return; }
    if (audience === 'classes' && !classIds.length){ feedback('try','Choose at least one class.'); return; }
    if (!strand){ feedback('try','Choose a strand.'); return; }
    if (opens && closes && Date.parse(closes) <= Date.parse(opens)){ feedback('try','Target due date must be after the suggested start.'); return; }

    const button=document.getElementById('v43b-save');
    if (!button) return;
    button.disabled=true;
    button.textContent='Assigning…';
    try {
      const {data,error}=await cloud.rpc('create_teacher_practice_assignments_v43b',{
        p_class_ids:classIds,
        p_strand:strand,
        p_topic:topic || null,
        p_question_count:requested,
        p_opens_at:opens ? new Date(opens).toISOString() : null,
        p_closes_at:closes ? new Date(closes).toISOString() : null,
        p_target_student_ids:studentIds.length ? studentIds : null
      });
      if (error) throw error;

      const actual=Number(data?.recommended_count || requested);
      let who='the selected class';
      if (data?.audience === 'individual') who='1 selected student';
      else if (data?.audience === 'students') who=`${Number(data?.student_count||studentIds.length)} selected students`;
      else if (data?.audience === 'classes') who=`${Number(data?.class_count||classIds.length)} classes`;
      feedback('correct',`Practice assigned to ${who}. ${actual} matching question${actual===1?'':'s'} will be used.`);
      await loadData();
      renderList();
    } catch (error){
      feedback('incorrect',error?.message || String(error));
    } finally {
      button.disabled=false;
      button.textContent='Assign Practice';
    }
  }

  async function refresh(){
    if (refreshBusy) return;
    const cls=selectedClass();
    if (!cls) return;
    const section=ensureSection();
    if (!section) return;
    const year=document.getElementById('v43b-class-year');
    if (year) year.textContent=String(Number(cls.year_level));
    populateTargetPickers();
    populateTopics();
    updateAudienceControls();
    refreshBusy=true;
    try {
      await loadData();
      renderList();
    } catch (error){
      feedback('incorrect',`Could not load targeted Practice assignments. ${error?.message || ''}`.trim());
    } finally {
      refreshBusy=false;
    }
  }

  function scheduleRefresh(){
    if (refreshQueued) return;
    refreshQueued=true;
    setTimeout(()=>{ refreshQueued=false; refresh(); },0);
  }

  function wire(){
    injectStyles();
    scheduleRefresh();

    const content=document.getElementById('selected-class-content');
    if (content){
      const observer=new MutationObserver(scheduleRefresh);
      observer.observe(content,{childList:true});
    }

    try {
      if (typeof renderClassAdmin === 'function' && !renderClassAdmin.__assignmentsTeacherWrapped){
        const previous=renderClassAdmin;
        const wrapped=function(...args){
          const result=previous.apply(this,args);
          scheduleRefresh();
          return result;
        };
        wrapped.__assignmentsTeacherWrapped=true;
        renderClassAdmin=wrapped;
      }
    } catch (error){
      console.warn('Assignments teacher runtime could not wrap class renderer.',error);
    }
  }

  const api=Object.freeze({
    refresh,
    scheduleRefresh,
    populateTargetPickers,
    populateTopics,
    updateAudienceControls,
    renderList,
    saveAssignment
  });

  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (typeof window !== 'undefined'){
    if (!Object.prototype.hasOwnProperty.call(window,'AssignmentsTeacher')){
      Object.defineProperty(window,'AssignmentsTeacher',{value:api,writable:false,configurable:false});
    }
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();