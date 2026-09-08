const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const featureSource=read('past-paper-core.js');
const config=read('config.js');
const feature=require(path.join(root,'past-paper-core.js')).V55APastPaperPractice;

function expect(condition,message){
  if(!condition) throw new Error(message);
}

const rows=[
  {id:'a',source_type:'past_paper',exam_year:2025,paper:'Paper 1',question_number:'1',marks:1},
  {id:'b',source_type:'past_paper',exam_year:2025,paper:'Paper 1',question_number:'2a',parent_question_number:'2',marks:1},
  {id:'c',source_type:'past_paper',exam_year:2025,paper:'Paper 1',question_number:'2b',parent_question_number:'2',marks:2},
  {id:'d',source_type:'past_paper',exam_year:2024,paper:'Paper 1',question_number:'1',marks:1},
  {id:'e',source_type:'topical_exercise',exam_year:null,paper:'',question_number:'1',marks:1}
];

const library=feature.derivePaperLibrary(rows);
expect(library.length===2,'only past-paper year/paper groups should appear in the library');
expect(library[0].exam_year===2025,'paper library should sort newest year first');
expect(library[0].logical_questions===2,'multipart rows must count as one logical question');
expect(library[0].physical_rows===3,'physical row count must preserve multipart parts');
expect(library[0].marks===4,'paper marks must sum physical row marks');
expect(feature.matchesPaper(rows[0],2025,'Paper 1')===true,'matching year/paper should be accepted');
expect(feature.matchesPaper(rows[0],2024,'Paper 1')===false,'different year must be rejected');
expect(feature.matchesPaper({_kind:'multipart',parts:[rows[1],rows[2]]},2025,'paper 1')===true,'multipart items should match from part metadata');

expect(featureSource.includes('Mixed Practice'),'student UI must expose Mixed Practice');
expect(featureSource.includes('Topic Practice'),'student UI must expose Topic Practice');
expect(featureSource.includes('Past Paper Practice'),'student UI must expose Past Paper Practice');
expect(featureSource.includes("cloud.rpc('get_student_practice_questions_v53d3'"),'paper discovery must reuse the protected Practice retrieval RPC');
expect(featureSource.includes("practiceType !== 'past_paper'"),'ordinary Practice behavior must remain the default path');
expect(featureSource.includes('baseGetQuestions'),'Past Paper Practice must filter the existing authorized Practice pool rather than create a second grading path');
expect(featureSource.includes('V53D3PracticeSelection'),'Past Paper Practice should retain repeat-avoidance ordering without weak-area recommendation bias');
expect(!featureSource.includes('answer:'),'feature source must not add an answer-key payload');
expect(!featureSource.includes('correct_answer'),'feature source must not request or expose correct answers');
expect(config.includes("'./past-paper-core.js'"),'consolidated Past Paper core must be loaded by config.js');

console.log('V5.5A Past Paper Practice regression passed.');
