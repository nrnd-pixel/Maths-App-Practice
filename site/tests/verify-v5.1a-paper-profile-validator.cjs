const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname,'..');
const source = fs.readFileSync(path.join(siteRoot,'v51-paper-profile-validator.js'),'utf8');
const release = fs.readFileSync(path.join(siteRoot,'v40-release.js'),'utf8');

const context = { window:{}, console };
vm.createContext(context);
new vm.Script(source,{filename:'v51-paper-profile-validator.js'}).runInContext(context);
const api = context.window.V51PaperProfileValidator;
assert.ok(api,'V5.1A paper profile API must be exposed.');
assert.match(release,/v51-paper-profile-validator\.js\?v=51a-1', 'data-v51-paper-profile-validator'/,
  'Stable loader must include the V5.1A paper-profile validator exactly once.');
assert.equal((release.match(/data-v51-paper-profile-validator/g)||[]).length,1);

const row = (paper,question,marks,extra={}) => ({
  year_level:6,
  exam_year:2026,
  paper,
  question_number:String(question),
  marks,
  source_type:'past_paper',
  active:true,
  _valid:true,
  _duplicate:false,
  ...extra
});

function paper1(){
  return Array.from({length:40},(_,i)=>row('Paper 1',i+1,i<30?2:3));
}
function paper2(){
  return Array.from({length:30},(_,i)=>row('Paper 2',i+1,3));
}

// Canonical profile recognition.
assert.equal(api.paperProfile('Paper 1').expectedLogicalQuestions,40);
assert.equal(api.paperProfile('P1').expectedMarks,90);
assert.equal(api.paperProfile('paper-2').expectedLogicalQuestions,30);
assert.equal(api.paperProfile('P2').expectedMarks,90);
assert.equal(api.paperProfile('Topical Set 1'),null);

// Full Paper 1: 40 logical questions / 90 marks.
let profiles = api.buildProfiles([],paper1());
assert.equal(profiles.length,1);
assert.equal(profiles[0].logicalQuestions,40);
assert.equal(profiles[0].totalMarks,90);
assert.equal(profiles[0].status,'pass');
assert.equal(profiles[0].readyForPaperQA,true);

// Full Paper 2: 30 logical questions / 90 marks; 3 marks each is captured as an advisory profile property.
profiles = api.buildProfiles([],paper2());
assert.equal(profiles[0].logicalQuestions,30);
assert.equal(profiles[0].totalMarks,90);
assert.equal(profiles[0].typicalLogicalMarks,3);
assert.equal(profiles[0].typicalMarkAnomalies,0);
assert.equal(profiles[0].status,'pass');

// Paper 2 may still pass count + total when a real paper varies from the typical 3-mark pattern.
const variedP2 = paper2();
variedP2[0] = {...variedP2[0],marks:4};
variedP2[1] = {...variedP2[1],marks:2};
profiles = api.buildProfiles([],variedP2);
assert.equal(profiles[0].totalMarks,90);
assert.equal(profiles[0].typicalMarkAnomalies,2);
assert.equal(profiles[0].status,'pass','Typical Paper 2 mark pattern must remain advisory, not a hard failure.');

// Incremental/correction imports profile the resulting bank, not only the current CSV.
const fullP1 = paper1();
profiles = api.buildProfiles(fullP1.slice(0,39),[fullP1[39]]);
assert.equal(profiles[0].logicalQuestions,40);
assert.equal(profiles[0].totalMarks,90);
assert.equal(profiles[0].status,'pass');

// Multipart rows count as one logical question when parent grouping is present.
const multipartP1 = paper1().filter(r=>r.question_number!=='5');
multipartP1.push(row('Paper 1','5(a)',1,{parent_question_number:'5',part_label:'a',part_order:1}));
multipartP1.push(row('Paper 1','5(b)',1,{parent_question_number:'5',part_label:'b',part_order:2}));
profiles = api.buildProfiles([],multipartP1);
assert.equal(profiles[0].physicalRows,41);
assert.equal(profiles[0].logicalQuestions,40);
assert.equal(profiles[0].totalMarks,90);
assert.equal(profiles[0].ungroupedMultipartRows,0);
assert.equal(profiles[0].status,'pass');

// Multipart-looking numbers without parent grouping are flagged structurally.
const ungroupedP1 = paper1().filter(r=>r.question_number!=='5');
ungroupedP1.push(row('Paper 1','5(a)',1));
ungroupedP1.push(row('Paper 1','5(b)',1));
profiles = api.buildProfiles([],ungroupedP1);
assert.equal(profiles[0].logicalQuestions,40);
assert.equal(profiles[0].totalMarks,90);
assert.equal(profiles[0].ungroupedMultipartRows,2);
assert.equal(profiles[0].status,'attention');
assert.equal(profiles[0].readyForPaperQA,false);

// Incomplete batches are flagged but remain an advisory concern rather than being rejected by the row importer.
profiles = api.buildProfiles([],paper1().slice(0,20));
assert.equal(profiles[0].status,'incomplete');
assert.equal(profiles[0].readyForPaperQA,false);

// Over-target count/marks is a strong attention signal.
const overP1 = [...paper1(),row('Paper 1','41',1)];
profiles = api.buildProfiles([],overP1);
assert.equal(profiles[0].logicalQuestions,41);
assert.equal(profiles[0].totalMarks,91);
assert.equal(profiles[0].status,'attention');

// Topical exercises are intentionally outside exam-paper profile validation.
profiles = api.buildProfiles([], [{
  year_level:6,exam_year:null,paper:'Topical Fractions',question_number:'1',marks:1,
  source_type:'topical',active:true,_valid:true,_duplicate:false
}]);
assert.equal(profiles.length,0);

// V5.1A is read-only presentation/QA logic.
assert.doesNotMatch(source,/cloud\.rpc\(|cloud\.from\(|fetch\(|localStorage|sessionStorage/);
assert.doesNotMatch(source,/insert\(|update\(|delete\(|upsert\(/i);

console.log('V5.1A paper-profile validator verification passed.');
console.log('- stable loader integration verified');
console.log('- Paper 1 profile: 40 logical questions / 90 marks');
console.log('- Paper 2 profile: 30 logical questions / 90 marks');
console.log('- Paper 2 3-mark pattern remains advisory');
console.log('- multipart grouping, incremental imports and over/incomplete states verified');
console.log('- topical content is excluded and validator remains read-only');
