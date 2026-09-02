/* V5.5D — Past Paper Practice result attribution.
   Records Past Paper Practice sessions with their selected exam year and paper
   using existing practice_sessions columns. No schema, auth, grading or Exam Mode
   changes are required. Topic-level answer evidence remains unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v55dPastPaperResultAttributionInstalled) return;
  ROOT.__v55dPastPaperResultAttributionInstalled = true;

  let installed = false;

  const trim = value => String(value ?? '').trim();

  function isPastPaperState(stateLike){
    return stateLike?.v55a_practice_type === 'past_paper'
      && Number(stateLike?.v55a_exam_year || 0) > 0
      && !!trim(stateLike?.v55a_paper);
  }

  function pastPaperLabel(examYear, paper){
    const year = Number(examYear || 0);
    const name = trim(paper);
    return year && name ? `${year} · ${name}` : '';
  }

  function enrichResult(record, stateLike){
    if (!record || typeof record !== 'object' || !isPastPaperState(stateLike)) return record;
    const examYear = Number(stateLike.v55a_exam_year);
    const paper = trim(stateLike.v55a_paper);
    return {
      ...record,
      practice_mode:'past_paper',
      exam_year:examYear,
      paper,
      strand:'mixed',
      topic:pastPaperLabel(examYear, paper)
    };
  }

  function resultContext(stateLike){
    if (!isPastPaperState(stateLike)) return null;
    return {
      student:trim(stateLike.student),
      yearLevel:Number(stateLike.year || 0),
      classGroup:trim(stateLike.classGroup),
      examYear:Number(stateLike.v55a_exam_year),
      paper:trim(stateLike.v55a_paper)
    };
  }

  function updateStudentResultContext(context){
    if (!context || typeof document === 'undefined') return false;
    const name = document.getElementById('result-name');
    if (!name) return false;
    const classText = context.classGroup && context.classGroup !== 'Other' ? context.classGroup : '';
    name.textContent = `${context.student} • Year ${context.yearLevel}${classText} • ${pastPaperLabel(context.examYear, context.paper)}`;
    return true;
  }

  function installWrappers(){
    if (ROOT.__v55dPastPaperResultAttributionWrappersInstalled) return true;
    if (typeof resultRecord !== 'function' || typeof finishPractice !== 'function') return false;

    const baseResultRecord = resultRecord;
    const baseFinishPractice = finishPractice;

    resultRecord = function(...args){
      const record = baseResultRecord.apply(this, args);
      try {
        return enrichResult(record, typeof state !== 'undefined' ? state : null);
      } catch {
        return record;
      }
    };

    finishPractice = async function(...args){
      let context = null;
      try { context = resultContext(typeof state !== 'undefined' ? state : null); } catch {}
      const output = await baseFinishPractice.apply(this, args);
      if (context) updateStudentResultContext(context);
      return output;
    };

    try { ROOT.resultRecord = resultRecord; } catch {}
    try { ROOT.finishPractice = finishPractice; } catch {}
    ROOT.__v55dPastPaperResultAttributionWrappersInstalled = true;
    return true;
  }

  function install(){
    if (installed) return true;
    if (!installWrappers()) return false;
    installed = true;
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 120) return;
      window.setTimeout(run, 100);
    };
    run();
  }

  const api = Object.freeze({
    isPastPaperState,
    pastPaperLabel,
    enrichResult,
    resultContext
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window, 'V55DPastPaperResultAttribution', {
      value:api,
      writable:false,
      configurable:false
    });
    scheduleInstall();
  }
})();
