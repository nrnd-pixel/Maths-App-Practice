/* V5.3D1 — Teacher Practice-pool alignment.
   Keeps the established V4.3B assignment workflow, but aligns teacher availability
   and student assignment targets to the V5.3 unified Practice resource bank. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53d1TeacherPracticePoolAlignmentInstalled) return;
  ROOT.__v53d1TeacherPracticePoolAlignmentInstalled = true;

  const RPC_MAP = Object.freeze({
    get_student_practice_assignments:'get_student_practice_assignments_v53d1',
    start_student_practice_assignment:'start_student_practice_assignment_v53d1',
    complete_student_practice_assignment:'complete_student_practice_assignment_v53d1'
  });
  const assignmentById = new Map();
  let assignmentLoadBusy = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const compact = value => norm(value).replace(/\s+/g,'');

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
      Object.defineProperty(cloud,'__v53d1PracticeAssignmentRpcBridge',{value:true,writable:false,configurable:false});
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

  function matchingQuestions(cls,strand,topic=''){
    let questions=[];
    try { questions = Array.isArray(teacherQuestions) ? teacherQuestions : []; } catch {}
    return questions.filter(question =>
      isPracticeEligible(question) &&
      Number(question?.year_level) === Number(cls?.year_level) &&
      norm(question?.strand) === norm(strand) &&
      (!topic || norm(question?.topic) === norm(topic))
    );
  }

  function availableItems(cls,strand,topic=''){
    return new Set(matchingQuestions(cls,strand,topic).map(logicalQuestionKey)).size;
  }

  function strandLabel(strand){
    try { return STRANDS?.[strand] || strand || 'Practice'; }
    catch { return strand || 'Practice'; }
  }

  function sameOptions(select,topics){
    const current=[...select.options].slice(1).map(option=>trim(option.value));
    return current.length===topics.length && current.every((value,index)=>value===topics[index]);
  }

  function refreshBuilder(){
    if (typeof document === 'undefined') return false;
    const section=document.getElementById('v43b-practice-assignment-admin');
    const cls=selectedTeacherClass();
    const strand=section?.querySelector('#v43b-strand')?.value || '';
    const topicSelect=section?.querySelector('#v43b-topic');
    const availability=section?.querySelector('#v43b-availability');
    if (!section || !cls || !strand || !topicSelect || !availability) return false;

    const topics=[...new Set(matchingQuestions(cls,strand,'').map(question=>trim(question?.topic)).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    const previous=topicSelect.value;
    if (!sameOptions(topicSelect,topics)){
      topicSelect.innerHTML='<option value="">All topics in this strand</option>' +
        topics.map(topic=>`<option value="${topic.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}">${topic.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`).join('');
      if (topics.includes(previous)) topicSelect.value=previous;
    }

    const count=availableItems(cls,strand,topicSelect.value);
    availability.textContent=count
      ? `${count} Practice-resource logical question${count===1?'':'s'} available for Year ${Number(cls.year_level)}. Multi-class assignment is limited to this same year level.`
      : 'No Practice-eligible questions currently match this selection.';
    availability.dataset.v53d1Aligned='1';
    return true;
  }

  async function loadAssignments(){
    if (assignmentLoadBusy) return false;
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser) return false;
      assignmentLoadBusy=true;
      const {data,error}=await cloud.from('practice_assignments')
        .select('id,class_id,strand,topic,question_count');
      if (error) throw error;
      assignmentById.clear();
      (Array.isArray(data)?data:[]).forEach(row=>assignmentById.set(String(row.id),row));
      return true;
    } catch (error){
      console.warn('V5.3D1 Practice assignment metadata could not be refreshed.',error);
      return false;
    } finally { assignmentLoadBusy=false; }
  }

  function refreshCards(){
    if (typeof document === 'undefined') return;
    const cls=selectedTeacherClass();
    if (!cls) return;
    document.querySelectorAll('#v43b-list .v43b-card').forEach(card=>{
      const id=card.querySelector('.v43b-toggle[data-id]')?.dataset?.id || '';
      const assignment=assignmentById.get(String(id));
      if (!assignment) return;
      const available=availableItems(cls,assignment.strand,assignment.topic || '');
      const firstHelp=card.querySelector('.v43b-card-head .help');
      if (!firstHelp) return;
      firstHelp.textContent=`${strandLabel(assignment.strand)} · ${Number(assignment.question_count||5)} question target · ${available} Practice-resource question${available===1?'':'s'} currently available`;
      firstHelp.dataset.v53d1Aligned='1';
    });
  }

  function refreshUi(load=false,delay=0){
    window.setTimeout(async()=>{
      if (load) await loadAssignments();
      refreshBuilder();
      refreshCards();
    },delay);
  }

  function wireUi(){
    if (typeof document === 'undefined') return;
    document.addEventListener('change',event=>{
      if (event.target?.matches?.('#v43b-strand,#v43b-topic')) refreshUi(false,0);
    });
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('.class-select,.tab[data-panel="classes-panel"],#refresh-btn')){
        refreshUi(true,0);refreshUi(false,120);refreshUi(false,400);
      }
      if (event.target?.closest?.('#v43b-save,.v43b-toggle')){
        refreshUi(true,300);refreshUi(true,1000);
      }
      if (event.target?.closest?.('.v44a-assign-practice')){
        refreshUi(false,80);refreshUi(false,220);
      }
    });
    refreshUi(true,0);
    refreshUi(false,250);
  }

  function install(){
    wireUi();
    if (installRpcBridge()) return;
    let tries=0;
    const timer=window.setInterval(()=>{
      tries+=1;
      if (installRpcBridge() || tries>=80) window.clearInterval(timer);
    },50);
  }

  const api=Object.freeze({RPC_MAP,routeRpc,logicalQuestionKey,isPracticeEligible,matchingQuestions,availableItems});
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V53D1TeacherPracticePoolAlignment',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
