const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'past-paper-core.js'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const guard=require(path.join(root,'past-paper-core.js')).V55A1PracticeTypeGuard;

function expect(condition,message){
  if(!condition) throw new Error(message);
}

expect(guard.isPastPaperItem({source_type:'past_paper'})===true,'past-paper rows should be accepted');
expect(guard.isPastPaperItem({source_type:'topical_exercise'})===false,'topical rows must not leak into Past Paper Practice');
expect(guard.isPastPaperItem({_kind:'multipart',parts:[{source_type:'past_paper'},{source_type:'past_paper'}]})===true,'past-paper multipart groups should be accepted');
expect(guard.isPastPaperItem({_kind:'multipart',parts:[{source_type:'past_paper'},{source_type:'topical_exercise'}]})===false,'mixed-source multipart groups should be rejected');
expect(source.includes("practiceType === 'topic' && !topicSelectionReady()"),'Topic Practice must require an explicit strand/topic choice');
expect(source.includes('openTopicSettings();'),'Topic Practice should expose its filters');
expect(source.includes('matched.filter(isPastPaperItem)'),'Past Paper Practice must hard-filter the already selected paper to past-paper source rows');
expect(source.includes('marks available in the Practice bank'),'paper availability wording should describe the eligible Practice bank');
expect(config.includes("'./past-paper-core.js'"),'V5.5A.1 behavior must be owned by the consolidated core');

console.log('V5.5A.1 Practice type guard regression passed.');
