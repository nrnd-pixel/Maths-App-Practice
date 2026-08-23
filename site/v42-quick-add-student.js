/* V4.2D — Quick Add Student.
   Adds a simple single-student form above the existing bulk roster importer.
   Reuses the existing class_students write path and set_student_pin RPC. */
(() => {
  'use strict';

  const STYLE_ID = 'v42d-quick-add-student-style';
  const FORM_ID = 'v42d-quick-add-student';

  function norm(value){
    return String(value ?? '').trim().toLowerCase();
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${FORM_ID}{
        border:1px solid var(--border);
        border-radius:16px;
        padding:16px;
        margin:10px 0 20px;
        background:color-mix(in srgb,var(--soft) 35%,var(--card));
      }
      #${FORM_ID} h4{margin:0 0 6px}
      #${FORM_ID} .v42d-note{margin:0 0 14px;color:var(--muted);font-size:13px;line-height:1.45}
      #${FORM_ID} .v42d-fields{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(110px,.8fr);
        gap:10px;
        align-items:end;
      }
      #${FORM_ID} label{min-width:0}
      #${FORM_ID} input{min-width:0}
      #${FORM_ID} .v42d-add-button{
        grid-column:1/-1;
        justify-self:start;
        min-width:130px;
        white-space:nowrap;
      }
      @media(max-width:720px){
        #${FORM_ID} .v42d-fields{grid-template-columns:1fr 1fr}
        #${FORM_ID} .v42d-add-button{grid-column:1/-1;width:100%}
      }
      @media(max-width:560px){
        #${FORM_ID} .v42d-fields{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedClass(){
    if (!Array.isArray(teacherClasses)) return null;
    return teacherClasses.find(cls => String(cls?.id) === String(selectedClassId)) || null;
  }

  function existingStudentInClass(classId, studentId){
    if (!Array.isArray(teacherStudents)) return null;
    return teacherStudents.find(student =>
      String(student?.class_id) === String(classId) &&
      norm(student?.student_id) === norm(studentId)
    ) || null;
  }

  function activeStudentIdConflict(classId, studentId){
    if (!Array.isArray(teacherStudents)) return null;
    return teacherStudents.find(student =>
      String(student?.class_id) !== String(classId) &&
      student?.active !== false &&
      norm(student?.student_id) === norm(studentId)
    ) || null;
  }

  function setBusy(button, busy){
    button.disabled = busy;
    button.textContent = busy ? 'Adding…' : 'Add Student';
  }

  async function addStudent(){
    const button = document.getElementById('v42d-add-student-button');
    const idInput = document.getElementById('v42d-student-id');
    const nameInput = document.getElementById('v42d-student-name');
    const pinInput = document.getElementById('v42d-student-pin');
    if (!button || !idInput || !nameInput || !pinInput) return;

    if (!cloudReady || !teacherUser || !cloud){
      classFeedback('incorrect','Teacher cloud access is not ready.');
      return;
    }

    const cls = selectedClass();
    if (!cls){
      classFeedback('try','Select a class first.');
      return;
    }

    const studentId = idInput.value.trim();
    const studentName = nameInput.value.trim();
    const pin = pinInput.value.trim();

    if (!studentId || !studentName){
      classFeedback('try','Enter both Student ID and Student name.');
      return;
    }

    if (pin && !/^[0-9]{4,8}$/.test(pin)){
      classFeedback('incorrect','PIN must contain 4 to 8 digits.');
      return;
    }

    const existing = existingStudentInClass(cls.id, studentId);
    if (existing){
      if (existing.active === false){
        classFeedback('try',`${studentId} already exists in ${cls.name} but is inactive. Use Reactivate on that roster row instead of adding a duplicate.`);
      } else {
        classFeedback('try',`${studentId} already exists in ${cls.name}. Use the existing roster record instead of adding a duplicate.`);
      }
      return;
    }

    const conflict = activeStudentIdConflict(cls.id, studentId);
    if (conflict){
      const otherClass = teacherClasses.find(item => String(item?.id) === String(conflict.class_id));
      classFeedback('incorrect',`${studentId} is already active in ${otherClass?.name || 'another class'}. Deactivate or resolve that roster record first.`);
      return;
    }

    setBusy(button, true);
    try {
      const { data, error } = await cloud
        .from('class_students')
        .insert({
          class_id: cls.id,
          student_id: studentId,
          student_name: studentName,
          active: true
        })
        .select('id')
        .single();

      if (error) throw error;

      if (pin){
        const pinResult = await cloud.rpc('set_student_pin', {
          p_student_uuid: data.id,
          p_pin: pin
        });
        if (pinResult.error){
          classFeedback('incorrect',`${studentName} was added, but the PIN could not be set: ${pinResult.error.message}`);
          await loadTeacher();
          return;
        }
      }

      idInput.value = '';
      nameInput.value = '';
      pinInput.value = '';
      classFeedback('correct',`${studentName} (${studentId}) was added to ${cls.name}${pin ? ' with a PIN' : ''}.`);
      await loadTeacher();
      document.getElementById('v42d-student-id')?.focus();
    } catch (error) {
      console.warn('Could not add student.', error);
      classFeedback('incorrect',`Student could not be added: ${error?.message || error}`);
    } finally {
      if (document.contains(button)) setBusy(button, false);
    }
  }

  function buildForm(){
    if (document.getElementById(FORM_ID)) return;
    const content = document.getElementById('selected-class-content');
    const title = document.getElementById('selected-class-title');
    const rosterImport = document.getElementById('roster-import');
    const rosterLabel = rosterImport?.closest('label');
    if (!content || !title || !rosterLabel) return;

    const form = document.createElement('section');
    form.id = FORM_ID;
    form.setAttribute('aria-label','Add one student');
    form.innerHTML = `
      <h4>+ Add one student</h4>
      <p class="v42d-note">For a single new student. Use Roster import below for bulk additions or updates.</p>
      <div class="v42d-fields">
        <label>Student ID
          <input id="v42d-student-id" type="text" autocomplete="off" placeholder="e.g. 6A-024">
        </label>
        <label>Student name
          <input id="v42d-student-name" type="text" autocomplete="off" placeholder="e.g. Haziq">
        </label>
        <label>PIN <span class="help">optional</span>
          <input id="v42d-student-pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" placeholder="4–8 digits">
        </label>
        <button id="v42d-add-student-button" class="primary v42d-add-button" type="button">Add Student</button>
      </div>
    `;

    rosterLabel.before(form);
    form.querySelector('#v42d-add-student-button')?.addEventListener('click', addStudent);
    form.querySelector('#v42d-student-pin')?.addEventListener('keydown', event => {
      if (event.key === 'Enter'){
        event.preventDefault();
        addStudent();
      }
    });
  }

  function apply(){
    injectStyles();
    buildForm();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply, { once:true });
  } else {
    apply();
  }
})();
