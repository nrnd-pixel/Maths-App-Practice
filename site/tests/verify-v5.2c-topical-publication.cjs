const assert=require('assert');
const {section,loadApi}=require('./v52c-consolidated-test-helper.cjs');

const source=section('publication');
const api=loadApi(source);

assert.strictEqual(api.setKey(6,' Topical  Exercise Paper 2 Extra '),'6|topical exercise paper 2 extra');
assert.strictEqual(api.publicationStateLabel({ready:false,is_available:false}),'Not ready to publish');
assert.strictEqual(api.publicationStateLabel({ready:true,is_available:false}),'Ready to publish');
assert.strictEqual(api.publicationStateLabel({ready:true,is_available:true}),'Published to students');
assert.strictEqual(api.publicationStateLabel({ready:false,is_available:true}),'Automatically hidden — readiness changed');
assert.strictEqual(api.canPublish({ready:true,is_available:false}),true);
assert.strictEqual(api.canPublish({ready:false,is_available:false}),false);
assert.strictEqual(api.canUnpublish({ready:false,is_available:true}),true);

const normalized=api.normalizeRows([{year_level:'6',source:' Set A ',ready:true,is_available:false,reasons:[' ok ','']}]);
assert.strictEqual(normalized[0].source,'Set A');
assert.deepStrictEqual(normalized[0].reasons,['ok']);

assert(source.includes("cloud.rpc('get_topical_exercise_publication_states_v52c'"),'Teacher library must read publication state through the guarded teacher RPC');
assert(source.includes("cloud.rpc('save_topical_exercise_setting_v52c'"),'Publish/unpublish must use the guarded teacher RPC');
assert(source.includes('item.ready?\'\':\'disabled\''),'Publish action must be disabled while readiness is false');
assert(source.includes('Topical question rows will remain inactive'),'Teacher confirmation must explain that publishing does not activate topical rows');
assert(source.includes("new MutationObserver"),'V5.2B set-card re-render must be observed');
assert(source.includes("observe(cards,{childList:true})"),'Publication observer must stay scoped to direct Topical Library card changes');

assert(!source.includes("cloud.from('topical_exercise_settings')"),'Frontend must not access the server-only publication table directly');
assert(!source.includes("cloud.from('questions')"),'Publication UI must not write question rows');
assert(!source.includes("update({active"),'Publication must not activate topical questions');
assert(!source.includes('get_student_questions'),'Teacher publication UI must not touch ordinary student retrieval');
assert(!source.includes('grade_practice_response_v3'),'Teacher publication UI must not touch grading');
assert(!source.includes('exam_paper_settings'),'Topical publication must remain separate from Exam Settings');

console.log('V5.2C topical publication checks passed.');