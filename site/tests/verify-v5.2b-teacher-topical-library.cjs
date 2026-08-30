const fs = require('fs');
const path = require('path');
const assert = require('assert');

const modulePath = path.join(__dirname,'..','v52-teacher-topical-library.js');
const source = fs.readFileSync(modulePath,'utf8');
const api = require(modulePath);

const rows = [
  {id:'a1',source_type:'topical_exercise',source:'Fractions Set A',year_level:6,question_number:'1',strand:'number',topic:'Fractions',skill:'Add fractions',question_text:'Q1',marks:2,response_type:'number',answer:'3',active:false,review_status:'reviewed',image_url:'https://example.com/q1.png'},
  {id:'a2',source_type:'topical_exercise',source:'Fractions Set A',year_level:6,question_number:'2(a)',parent_question_number:'2',part_label:'a',part_order:1,group_prompt:'Use the diagram',strand:'number',topic:'Fractions',skill:'Compare fractions',question_text:'Q2a',marks:1,response_type:'number',answer:'1',active:false,review_status:'reviewed'},
  {id:'a3',source_type:'topical_exercise',source:'Fractions Set A',year_level:6,question_number:'2(b)',parent_question_number:'2',part_label:'b',part_order:2,group_prompt:'Use the diagram',strand:'number',topic:'Fractions',skill:'Compare fractions',question_text:'Q2b',marks:1,response_type:'number',answer:'2',active:false,review_status:'reviewed'},
  {id:'b1',source_type:'topical_exercise',source:'Decimals Set B',year_level:5,question_number:'1',strand:'number',topic:'Decimals',skill:'Place value',question_text:'Q1',marks:1,response_type:'number',answer:'5',active:false,review_status:'needs_review',review_note:'Check wording'},
  {id:'p1',source_type:'practice',source:'Teacher question bank',year_level:6,question_number:'1',strand:'number',topic:'Whole Numbers',skill:'Addition',question_text:'Practice',marks:1,response_type:'number',answer:'4',active:true}
];

assert(api.isTopical(rows[0]),'V5.2B must identify topical rows');
assert(!api.isTopical(rows[4]),'V5.2B must ignore ordinary Practice rows');
assert.strictEqual(api.logicalQuestionNumber(rows[1]),'2','Multipart topical parts must share one logical question');
assert.strictEqual(api.setKey(rows[0]),'6|fractions set a','Set identity must be year level + normalized Source name');

const sets = api.buildSetSummaries(rows);
assert.strictEqual(sets.length,2,'Library must group topical rows into two sets and ignore non-topical rows');
const fractions = sets.find(set=>set.source==='Fractions Set A');
const decimals = sets.find(set=>set.source==='Decimals Set B');
assert(fractions,'Fractions set must be present');
assert(decimals,'Decimals set must be present');
assert.strictEqual(fractions.physicalRows,3,'Fractions set must count physical rows');
assert.strictEqual(fractions.logicalQuestions,2,'Fractions multipart rows must collapse to logical question count');
assert.strictEqual(fractions.marks,4,'Fractions set must total marks');
assert.strictEqual(fractions.imageRows,1,'Fractions set must count image rows');
assert.strictEqual(fractions.status,'reviewed','Fully reviewed clean inactive set must report reviewed');
assert.strictEqual(decimals.status,'needs_review','Inactive set with unresolved review state must report needs_review');
assert.strictEqual(decimals.studentExposure,'off','Student exposure must remain off');

const stats = api.libraryStats(sets);
assert.deepStrictEqual(stats,{sets:2,rows:4,logicalQuestions:3,marks:5,needsReview:1,attention:0,reviewed:1,staged:0},'Library summary must aggregate set-level status correctly');

const rename = api.renamePlan(rows,fractions.key,'Fractions Set C');
assert(rename.canRun,'Inactive topical set must be safely renameable');
assert.strictEqual(rename.ids.length,3,'Rename must affect the complete set');
assert.strictEqual(rename.newKey,'6|fractions set c','Rename plan must derive the new set identity');
assert(!api.renamePlan(rows,fractions.key,'Fractions Set A').canRun,'Rename must reject an unchanged name');

const collisionRows = rows.concat({id:'c1',source_type:'topical_exercise',source:'Fractions Set C',year_level:6,question_number:'1',strand:'number',topic:'Fractions',skill:'Test',question_text:'Collision',marks:1,response_type:'number',answer:'1',active:false});
assert(api.renamePlan(collisionRows,'6|fractions set a','Fractions Set C').blockers.some(x=>/already has/i.test(x)),'Rename must block same-year set-name collisions');

const activeRows = rows.map(row=>row.id==='a1'?{...row,active:true}:row);
assert(api.renamePlan(activeRows,'6|fractions set a','Fractions Set D').blockers.some(x=>/Deactivate every row/i.test(x)),'Rename must be blocked while any set row is active');
assert.strictEqual(api.buildSetSummaries(activeRows).find(set=>set.source==='Fractions Set A').status,'attention','Active topical rows must force set Attention status');

const duplicateRows = rows.concat({...rows[0],id:'a4'});
const dupSet = api.buildSetSummaries(duplicateRows).find(set=>set.source==='Fractions Set A');
assert(dupSet.duplicateRows>=2,'Duplicate topical question numbers must be flagged at set level');
assert.strictEqual(dupSet.status,'attention','Duplicate topical question identity must force Attention status');

assert(source.includes('V5.2B — Topical Exercise Library'),'Teacher library panel identity must be present');
assert(source.includes('Student exposure remains OFF'),'Teacher library must state the staging boundary');
assert(source.includes("cloud.from('questions').update({source:plan.newName}).in('id',plan.ids)"),'Set rename must update only the Source field for the selected set rows');
assert(source.includes("document.querySelectorAll('#questions-cards .v51b2a-select')"),'Select set must reuse existing V5.1 B2A selection controls');
assert(source.includes("['v51b1-source-filter','topical']"),'View set must reuse the existing source filter');
assert(source.includes("['v51b2c-review-filter','all']"),'View set must coexist with the existing review filter');
assert(!source.includes('localStorage.setItem'),'V5.2B must not write local storage');
assert(!source.includes('localStorage.removeItem'),'V5.2B must not delete local storage');
assert(!source.includes('get_student_questions'),'V5.2B must not alter student question retrieval');
assert(!source.includes('grade_practice_response'),'V5.2B must not alter grading');
assert(!source.includes('exam_paper_settings'),'V5.2B must not alter Exam publication');
assert(!source.includes('save_exam_attempt'),'V5.2B must not alter Exam autosave');

console.log('V5.2B Teacher Topical Exercise Library & Management checks passed.');
