const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const featureSource=read('past-paper-resume.js');
const config=read('config.js');
const feature=require(path.join(root,'past-paper-resume.js'));

function expect(condition,message){
  if(!condition) throw new Error(message);
}

// Node import must remain DOM-free so helpers can be regression tested.
expect(feature.STORAGE_KEY==='mathPastPaperResumeV55C','V5.5C storage key changed unexpectedly');
expect(feature.VERSION===1,'V5.5C checkpoint version must remain explicit');

// Identity must be stable across harmless case/spacing differences.
const keyA=feature.identityKey(' 6A-ARINA ','Arina',6,2025,'Paper 1');
const keyB=feature.identityKey('6a-arina','Different display name',6,2025,' paper   1 ');
expect(keyA===keyB,'resume identity key must normalize student ID and paper');

// Expired checkpoints must be removed; fresh ones retained.
const now=Date.parse('2026-09-02T02:00:00Z');
const fresh={version:1,savedAt:'2026-09-01T02:00:00Z'};
const stale={version:1,savedAt:'2026-08-20T02:00:00Z'};
expect(feature.checkpointIsFresh(fresh,now),'one-day-old checkpoint should still be resumable');
expect(!feature.checkpointIsFresh(stale,now),'expired checkpoint must not be resumable');
const pruned=feature.pruneStore({fresh,stale},now);
expect(Object.keys(pruned).length===1&&pruned.fresh,'pruneStore must remove expired checkpoints');

// Logical question identity must preserve multipart grouping and source order.
const items=[
  {id:'q1',question_number:'1'},
  {_kind:'multipart',id:'m31',question_number:'31',parts:[{id:'q31a'},{id:'q31b'}]},
  {id:'q32',question_number:'32'}
];
expect(feature.questionItemId(items[1])==='multipart:q31a,q31b','multipart resume identity must use its part IDs');
const ids=feature.questionItemIds(items);
expect(JSON.stringify(ids)===JSON.stringify(['q1','multipart:q31a,q31b','q32']),'logical question IDs must retain session order');
const rebuilt=feature.applyCheckpointToItems({questionIds:ids},[items[2],items[0],items[1]]);
expect(rebuilt.missing===0,'existing logical questions must all rebuild');
expect(JSON.stringify(feature.questionItemIds(rebuilt.ordered))===JSON.stringify(ids),'resume rebuild must restore original session order');

// Checkpoint must preserve progress, but never persist protected answer/feedback data.
const state={
  student:'Arina',studentId:'6A-ARINA',year:6,
  questions:items,index:1,first:1,mastered:2,hints:1,second:1,
  startedAt:'2026-09-02T01:00:00Z',
  answers:[{
    questionId:'q1',question:'Sensitive question text',responseType:'number',finalAnswer:'42',
    correct:true,firstTry:true,attempts:1,hintUsed:false,marksPossible:2,
    correctAnswer:'DO_NOT_STORE_ANSWER_KEY',explanation:'DO_NOT_STORE_EXPLANATION',
    hint:'DO_NOT_STORE_HINT',accessToken:'DO_NOT_STORE_TOKEN',pin:'DO_NOT_STORE_PIN'
  }]
};
const snapshot=feature.buildCheckpoint(state,{
  studentId:'6A-ARINA',studentName:'Arina',yearLevel:6,examYear:2025,paper:'Paper 1',scope:'all',nextIndex:1
},'2026-09-02T02:00:00Z');
expect(snapshot.nextIndex===1,'checkpoint must save the next logical question boundary');
expect(snapshot.scope==='all','checkpoint must preserve All Available scope');
expect(snapshot.first===1&&snapshot.mastered===2&&snapshot.hints===1&&snapshot.second===1,'checkpoint must preserve Practice counters');
expect(snapshot.answers[0].finalAnswer==='42'&&snapshot.answers[0].correct===true,'checkpoint must retain student response outcome');
const serialized=JSON.stringify(snapshot);
for(const secret of ['DO_NOT_STORE_ANSWER_KEY','DO_NOT_STORE_EXPLANATION','DO_NOT_STORE_HINT','DO_NOT_STORE_TOKEN','DO_NOT_STORE_PIN']){
  expect(!serialized.includes(secret),`checkpoint leaked protected value: ${secret}`);
}
expect(!Object.prototype.hasOwnProperty.call(snapshot.answers[0],'correctAnswer'),'safe answer must not persist a correct-answer field');
expect(!Object.prototype.hasOwnProperty.call(snapshot.answers[0],'explanation'),'safe answer must not persist explanation text');

// Rehydration may use freshly fetched question metadata, but protected feedback remains blank.
const hydrated=feature.rehydrateAnswers(snapshot,[{id:'q1',question_number:'1',question_text:'Fresh question',strand:'number',topic:'Whole Numbers',marks:2}]);
expect(hydrated[0].question.includes('Fresh question'),'resume must rebuild display metadata from the current authorized question bank');
expect(hydrated[0].correctAnswer===''&&hydrated[0].explanation==='','resume must not reconstruct protected answer feedback from local storage');

// Browser wiring and release ordering invariants.
expect(featureSource.includes("state.v55a_practice_type !== 'past_paper'"),'checkpoint writing must be restricted to Past Paper Practice');
expect(featureSource.includes('checkpointCurrentBoundary();'),'progress must be checkpointed at the completed-question boundary');
expect(featureSource.includes('const pool = await getQuestions();'),'resume must re-fetch the current authorized Practice bank');
expect(featureSource.includes('applyCheckpointToItems(snapshot, items)'),'resume must validate saved question IDs against current eligible questions');
expect(featureSource.includes("removeCheckpoint(found.key)"),'changed or replaced saved sessions must be discardable');
expect(featureSource.includes('if (await restoreFromCheckpoint(found)) return;'),'explicit resume must short-circuit without entering fresh-start core');
expect(featureSource.includes('const wrappedNextQuestion = function(...args)'),'nextQuestion wrapper must remain synchronous for V57A');
expect(featureSource.includes('} finally {'),'finishPractice cleanup must remain finally-protected');
expect(config.includes("'./past-paper-resume.js'"),'consolidated V5.5C resume must be loaded by config');
expect(config.indexOf("'./past-paper-core.js'") < config.indexOf("'./past-paper-resume.js'"),'resume must load after and outside the Past Paper core');

console.log('V5.5C Resume Past Paper Practice regression passed.');
