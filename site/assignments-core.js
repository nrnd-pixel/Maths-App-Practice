/* Phase 4 — Teacher Assignments shared core.
   Consolidates V5.3D1 assignment compatibility and Practice-resource helpers while
   preserving the established legacy RPC names for untouched downstream consumers. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;

  const RPC_MAP = Object.freeze({
    get_student_practice_assignments:'get_student_practice_assignments_v53d1',
    start_student_practice_assignment:'start_student_practice_assignment_v53d1',
    complete_student_practice_assignment:'complete_student_practice_assignment_v53d1',
    create_teacher_practice_assignment_v43:'create_teacher_practice_assignment_v53d1',
    create_teacher_practice_assignments_v43b:'create_teacher_practice_assignments_v53d1'
  });

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const compact = value => norm(value).replace(/\s+/g,'');
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function dateLabel(value,prefix){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${prefix} ${date.toLocaleString()}`;
  }

  function strandLabel(strand){
    try { return STRANDS?.[strand] || strand || 'Practice'; }
    catch { return strand || 'Practice'; }
  }

  function routeRpc(name,args={}){
    const rpcName = String(name || '');
    return {name:RPC_MAP[rpcName] || rpcName,args:args && typeof args === 'object' ? args : {}};
  }

  function installRpcBridge(){
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (cloud.__v53d1PracticeAssignmentRpcBridge === true) return true;
      const previousRpc = cloud.rpc.bind(cloud);
      cloud.rpc = function(name,args,options){
        const routed = routeRpc(name,args);
        return previousRpc(routed.name,routed.args,options);
      };
      Object.defineProperty(cloud,'__v53d1PracticeAssignmentRpcBridge',{
        value:true,writable:false,configurable:false
      });
      return true;
    } catch (error){
      console.warn('V5.3D1 Practice assignment RPC bridge could not be installed.',error);
      return false;
    }
  }

  function logicalQuestionKey(question){
    const id = trim(question?.id);
    const parent = trim(question?.parent_question_number);
    if (!parent) return `single|${id}`;
    const examYear = trim(question?.exam_year);
    const paper = compact(question?.paper);
    if (examYear && paper) return `group|exam|${examYear}|${paper}|${compact(parent)}`;
    return `group|resource|${norm(question?.source_type || 'unknown')}|${norm(question?.source || 'unknown')}|${compact(parent)}`;
  }

  function isPracticeEligible(question){
    if (question?.practice_eligible === true) return true;
    return question?.practice_eligible == null && question?.active !== false;
  }

  function selectedTeacherClass(){
    try {
      if (!Array.isArray(teacherClasses)) return null;
      return teacherClasses.find(row => String(row?.id) === String(selectedClassId)) || null;
    } catch { return null; }
  }

  function teacherQuestionRows(){
    try { return Array.isArray(teacherQuestions) ? teacherQuestions : []; }
    catch { return []; }
  }

  function matchingQuestions(cls,strand,topic=''){
    return teacherQuestionRows().filter(question =>
      isPracticeEligible(question) &&
      Number(question?.year_level) === Number(cls?.year_level) &&
      norm(question?.strand) === norm(strand) &&
      (!topic || norm(question?.topic) === norm(topic))
    );
  }

  function availableItems(cls,strand,topic=''){
    return new Set(matchingQuestions(cls,strand,topic).map(logicalQuestionKey)).size;
  }

  function topicOptions(cls,strand){
    return [...new Set(matchingQuestions(cls,strand,'')
      .map(question => trim(question?.topic)).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  }

  const compatibilityApi = Object.freeze({
    RPC_MAP,
    routeRpc,
    logicalQuestionKey,
    isPracticeEligible,
    matchingQuestions,
    availableItems,
    topicOptions
  });

  const api = Object.freeze({
    ...compatibilityApi,
    trim,
    norm,
    compact,
    html,
    dateLabel,
    strandLabel,
    selectedTeacherClass,
    installRpcBridge
  });

  function install(){
    if (installRpcBridge()) return;
    if (typeof window === 'undefined') return;
    let tries=0;
    const timer=window.setInterval(()=>{
      tries+=1;
      if (installRpcBridge() || tries>=80) window.clearInterval(timer);
    },50);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports=api;

  if (typeof window !== 'undefined'){
    if (!ROOT.__assignmentsCoreInstalled) ROOT.__assignmentsCoreInstalled=true;
    // Preserve the exact V5.3D1 installation flag expected by historical checks.
    ROOT.__v53d1TeacherPracticePoolAlignmentInstalled=true;
    if (!Object.prototype.hasOwnProperty.call(window,'AssignmentsCore')){
      Object.defineProperty(window,'AssignmentsCore',{value:api,writable:false,configurable:false});
    }
    if (!Object.prototype.hasOwnProperty.call(window,'V53D1TeacherPracticePoolAlignment')){
      Object.defineProperty(window,'V53D1TeacherPracticePoolAlignment',{
        value:compatibilityApi,writable:false,configurable:false
      });
    }
    install();
  }
})();