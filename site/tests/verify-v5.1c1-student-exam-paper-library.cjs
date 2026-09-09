const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname,'..','student-exam-ui.js'),'utf8');

assert(source.includes('Student Exam Paper Library'),'C1 feature identity missing');
assert(source.includes("Array.isArray(examMetaRows)"),'C1 must use the already-loaded secure available-paper metadata');
assert(source.includes("typeof settingFor === 'function'"),'C1 must reuse the existing Exam Settings source of truth');
assert(source.includes('logicalQuestions:logical.size'),'C1 must show logical-question counts');
assert(source.includes('marks,'),'C1 must show paper marks');
assert(source.includes("duration:Number(setting?.duration_minutes)||null"),'C1 must show existing timer settings');
assert(source.includes("releaseRule:String(setting?.answer_release_rule || 'immediate')"),'C1 must show existing answer-release rules');
assert(source.includes("fillExamPapers(paper)"),'C1 card selection must feed the existing paper selector path');
assert(source.includes("updateExamPaperNote()"),'C1 selection must reuse the existing paper-note/instruction path');
assert(source.includes("aria-pressed=\"${selected?'true':'false'}\""),'C1 cards must expose selected state accessibly');
assert(source.includes("Only papers currently available for your year are shown."),'C1 must explain the availability boundary');
assert(source.includes("No exam papers are available right now."),'C1 must provide a safe empty state');
assert(source.includes("papers.length>0"),'C1 must hide legacy dropdowns only when the library has usable cards');

assert(!source.includes("cloud.from("),'C1 presentation layer must not query or mutate database tables directly');
assert(!source.includes("cloud.rpc("),'C1 presentation layer must not call RPCs directly');
assert(!/\.insert\s*\(/.test(source),'C1 must not insert data');
assert(!/\.update\s*\(/.test(source),'C1 must not update data');
assert(!/\.delete\s*\(/.test(source),'C1 must not delete data');
assert(!/\.upsert\s*\(/.test(source),'C1 must not upsert data');
assert(!source.includes('start_or_resume_exam_attempt_v3'),'C1 must not alter attempt creation');
assert(!source.includes('get_student_questions'),'C1 must not alter secure question retrieval');
assert(!source.includes('correctResponse'),'C1 must not alter grading');

console.log('V5.1C1 Student Exam Paper Library checks passed.');
