const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('past-paper-results.js');
const config=read('config.js');
const feature=require(path.join(root,'past-paper-results.js'));

function expect(condition,message){if(!condition)throw new Error(message)}

expect(feature.pastPaperLabel(2025,'Paper 1')==='2025 · Paper 1','paper label must be stable');
expect(feature.pastPaperLabel(0,'Paper 1')==='','paper label must require a year');

const ordinary={practice_mode:'mixed',strand:'mixed',topic:'Mixed Practice',details:[{topic:'Fractions'}]};
const ordinaryOut=feature.enrichResult(ordinary,{v55a_practice_type:'mixed'});
expect(ordinaryOut===ordinary,'non-past-paper Practice must remain untouched');

const state={
  student:'Arina',studentId:'6A-ARINA',year:6,classGroup:'A',
  v55a_practice_type:'past_paper',v55a_exam_year:2025,v55a_paper:'Paper 1'
};
const base={
  practice_mode:'mixed',strand:'mixed',topic:'Mixed Practice',
  first_try_score:3,mastery_score:4,total:5,
  details:[{questionId:'q1',strand:'number',topic:'Fractions',correct:true}]
};
const enriched=feature.enrichResult(base,state);
expect(enriched!==base,'Past Paper attribution should return a new session record');
expect(enriched.practice_mode==='past_paper','Past Paper Practice must be distinguishable in stored session mode');
expect(enriched.exam_year===2025,'Past Paper Practice must store exam_year');
expect(enriched.paper==='Paper 1','Past Paper Practice must store paper');
expect(enriched.strand==='mixed','session strand should remain compatible with Practice analytics');
expect(enriched.topic==='2025 · Paper 1','session activity label must identify the paper');
expect(enriched.first_try_score===3&&enriched.mastery_score===4&&enriched.total===5,'grading summary must remain unchanged');
expect(enriched.details===base.details,'answer-level details must not be rewritten');
expect(enriched.details[0].topic==='Fractions','topic-level learning evidence must remain the actual question topic');

expect(feature.isPastPaperState(state),'valid Past Paper state should be recognized');
expect(!feature.isPastPaperState({...state,v55a_exam_year:0}),'missing year must not be attributed as Past Paper');
expect(!feature.isPastPaperState({...state,v55a_paper:''}),'missing paper must not be attributed as Past Paper');

const context=feature.resultContext(state);
expect(context.student==='Arina'&&context.yearLevel===6&&context.examYear===2025&&context.paper==='Paper 1','result-page context must preserve selected paper identity');

expect(source.includes('const wrappedResultRecord = function'),'consolidated results must wrap the existing Practice result record instead of replacing grading');
expect(source.includes('const baseResultRecord = resultRecord'),'results must preserve the accepted result recorder');
expect(source.includes('const baseFinishPractice = finishPractice'),'results must preserve and wrap the resume-produced finish workflow');
expect(source.includes("practice_mode:'past_paper'"),'results must persist an explicit Past Paper Practice mode');
expect(source.includes('const output = await baseFinishPractice.apply(this, args);'),'results must await lower completion before updating result presentation');
expect(config.includes("'./past-paper-results.js'"),'consolidated V5.5D results must be loaded by config');
expect(config.indexOf("'./past-paper-resume.js'") < config.indexOf("'./past-paper-results.js'"),'results must load after V5.5C resume wiring');

console.log('V5.5D Past Paper Practice result attribution regression passed.');
