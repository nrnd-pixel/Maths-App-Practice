const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const featureSource=read('v55b-full-paper-practice.js');
const config=read('config.js');
const feature=require(path.join(root,'v55b-full-paper-practice.js'));

function expect(condition,message){
  if(!condition) throw new Error(message);
}

const items=[
  {id:'q10',question_number:'10'},
  {id:'q2b',question_number:'2(b)'},
  {id:'q1',question_number:'1'},
  {id:'q2a',question_number:'2(a)'},
  {_kind:'multipart',id:'m31',question_number:'31',parts:[{question_number:'31a'},{question_number:'31b'}]},
  {id:'q3',question_number:'3'}
];

const ordered=feature.sortSourceOrder(items).map(item=>item.id);
expect(JSON.stringify(ordered)===JSON.stringify(['q1','q2a','q2b','q3','q10','m31']),
  `source order is incorrect: ${JSON.stringify(ordered)}`);

const key=feature.questionOrderKey({question_number:'Question 25(a)'});
expect(key.number===25,'question-order parser must extract the numeric question number');
expect(/a/i.test(key.suffix),'question-order parser must preserve the suffix/part label');

expect(feature.getScope()==='quick','Quick Session must remain the default scope');
expect(featureSource.includes("scope = next === 'all' ? 'all' : 'quick'"),'scope setter must support All Available Questions while falling back to Quick Session');
expect(featureSource.includes('Quick Session'),'student UI must expose Quick Session');
expect(featureSource.includes('All Available Questions'),'student UI must expose All Available Questions');
expect(featureSource.includes("scope === 'all'"),'full-paper behavior must be opt-in');
expect(featureSource.includes("getPracticeType?.() === 'past_paper'"),'full-paper behavior must be restricted to Past Paper Practice');
expect(featureSource.includes('sortSourceOrder(items)'),'all-available sessions must use source question-number ordering');
expect(featureSource.includes('TEMP_COUNT_VALUE'),'full-paper wrapper must safely override the existing Practice count only for the run');
expect(featureSource.includes("state.v55b_paper_scope = 'all_available'"),'full-paper Practice state must record its session scope');
expect(!featureSource.includes('correct_answer'),'V5.5B must not add or request answer-key payloads');
expect(!featureSource.includes('answer:'),'V5.5B must not add answer-key objects');
expect(config.includes("'./v55b-full-paper-practice.js'"),'V5.5B preview script must be loaded after V5.5A guards');
expect(config.indexOf("'./v55a1-practice-type-guard.js'") < config.indexOf("'./v55b-full-paper-practice.js'"),
  'V5.5B must load after the V5.5A.1 Practice-type guard');

console.log('V5.5B Full Available Past-Paper Practice regression passed.');
