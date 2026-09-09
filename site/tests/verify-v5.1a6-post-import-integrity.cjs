const {section}=require('./v51-owner-section-helper.cjs');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const sourcePath = path.join(root,'site','paper-import-management.js');
const loaderPath = path.join(root,'site','v40-release.js');
const source = section('paper-import-management.js','/* V5.1A6 — Post-import integrity check.',null);
const loader = fs.readFileSync(loaderPath,'utf8');

function logicalQuestionNumber(row){
  const parent = String(row.parent_question_number || '').trim();
  if (parent) return parent.replace(/^q\s*/i,'').trim();
  const raw = String(row.question_number || '').trim().replace(/^q\s*/i,'');
  const match = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
  return match ? match[1] : raw;
}

const sandbox = {
  window:{
    V51PaperProfileValidator:{
      logicalQuestionNumber,
      paperProfile(value){
        const text = String(value || '').trim().toLowerCase();
        if (text === 'paper 1') return {label:'Paper 1',expectedLogicalQuestions:40,expectedMarks:90};
        if (text === 'paper 2') return {label:'Paper 2',expectedLogicalQuestions:30,expectedMarks:90};
        return null;
      }
    }
  },
  console
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'paper-import-management.js'});
const api = sandbox.window.V51PostImportIntegrity;
assert(api,'V5.1A6 API should be exposed');

function make2019Rows({hosted=false,activateQ28=false}={}){
  const rows = [];
  const imageQuestions = new Set([2,3,4,5,6,7,8,9,10,11]);
  const imageRef = q => hosted
    ? `https://example.supabase.co/storage/v1/object/public/question-images/2019/Paper-2/2019_P2_Q${q}.png`
    : `images/2019_P2_Q${q}.png`;

  for (let q=1; q<=30; q+=1){
    let parts = null;
    if ([1,17,29].includes(q)) parts = [{label:'a',marks:1},{label:'b',marks:2}];
    if (q === 30) parts = [{label:'a',marks:1},{label:'b',marks:1},{label:'c',marks:1}];
    const active = q === 28 ? !!activateQ28 : true;

    if (!parts){
      rows.push({
        _valid:true,
        _duplicate:false,
        year_level:6,
        exam_year:2019,
        paper:'Paper 2',
        source_type:'past_paper',
        question_number:String(q),
        parent_question_number:null,
        marks:3,
        active,
        image_url:imageQuestions.has(q) ? imageRef(q) : ''
      });
      continue;
    }

    parts.forEach((part,index) => rows.push({
      _valid:true,
      _duplicate:false,
      year_level:6,
      exam_year:2019,
      paper:'Paper 2',
      source_type:'past_paper',
      question_number:`${q}(${part.label})`,
      parent_question_number:String(q),
      part_label:part.label,
      part_order:index+1,
      marks:part.marks,
      active:true,
      image_url:imageQuestions.has(q) && index === 0 ? imageRef(q) : ''
    }));
  }
  return rows;
}

const packageRows = make2019Rows();
const actualRows = make2019Rows({hosted:true});
const identity = {yearLevel:6,examYear:2019,paper:'Paper 2',sourceType:'past_paper'};
const expected = api.packageExpectations(packageRows);

assert.strictEqual(expected.physicalRows,35,'2019 package should contain 35 physical rows');
assert.strictEqual(expected.activeRows,34,'Q28 should be the only inactive physical row');
assert.strictEqual(expected.logicalQuestions,30);
assert.strictEqual(expected.activeLogicalQuestions,29);
assert.strictEqual(expected.totalMarks,90);
assert.strictEqual(expected.activeMarks,87);
assert.strictEqual(expected.imageReferences,10);
assert.deepStrictEqual(Array.from(expected.multipartGroups),['Q1','Q17','Q29','Q30']);
assert.deepStrictEqual(Array.from(expected.inactiveLogicalQuestions),['Q28']);

const report = api.buildIntegrityReport({
  identity,
  expected,
  rows:actualRows,
  examSettings:[],
  strictActiveState:true
});
assert.strictEqual(report.integrityPass,true,'2019 acceptance state should pass content integrity');
assert.strictEqual(report.status,'pass_with_review','inactive Q28 should produce PASS with review');
assert.strictEqual(report.actual.physicalRows,35);
assert.strictEqual(report.actual.activeRows,34);
assert.strictEqual(report.actual.logicalQuestions,30);
assert.strictEqual(report.actual.activeLogicalQuestions,29);
assert.strictEqual(report.actual.totalMarks,90);
assert.strictEqual(report.actual.activeMarks,87);
assert.strictEqual(report.actual.distinctImageUrls,10);
assert.strictEqual(report.actual.nonHttpsImageRows.length,0);
assert.strictEqual(report.actual.duplicateQuestionNumbers.length,0);
assert.strictEqual(report.actual.missingLogicalQuestions.length,0);
assert.deepStrictEqual(Array.from(report.actual.multipartGroups),['Q1','Q17','Q29','Q30']);
assert.deepStrictEqual(Array.from(report.actual.inactiveLogicalQuestions),['Q28']);
assert.strictEqual(report.settingExists,false);
assert.strictEqual(report.settingAvailable,false);
assert.strictEqual(report.examReady,false);

const unsafeSetting = api.buildIntegrityReport({
  identity,
  expected,
  rows:actualRows,
  examSettings:[{year_level:6,exam_year:2019,paper:'Paper 2',is_available:true}],
  strictActiveState:true
});
assert.strictEqual(unsafeSetting.integrityPass,true,'available setting does not alter question-bank integrity');
assert.strictEqual(unsafeSetting.status,'attention','available setting with incomplete active paper should be flagged');
assert.strictEqual(unsafeSetting.availabilityConflict,true);
assert.strictEqual(unsafeSetting.examReady,false);

const missingQ12 = actualRows.filter(row => logicalQuestionNumber(row) !== '12');
const missingReport = api.buildIntegrityReport({identity,expected,rows:missingQ12,examSettings:[],strictActiveState:true});
assert.strictEqual(missingReport.integrityPass,false,'missing logical question must fail integrity');
assert.strictEqual(missingReport.status,'fail');
assert(missingReport.actual.missingLogicalQuestions.includes('Q12'));

const nonHttpsRows = actualRows.map(row => ({...row}));
const imageIndex = nonHttpsRows.findIndex(row => row.image_url);
nonHttpsRows[imageIndex].image_url = 'images/not-uploaded.png';
const nonHttpsReport = api.buildIntegrityReport({identity,expected,rows:nonHttpsRows,examSettings:[],strictActiveState:true});
assert.strictEqual(nonHttpsReport.integrityPass,false,'non-HTTPS image reference must fail integrity');
assert.strictEqual(nonHttpsReport.actual.nonHttpsImageRows.length,1);

const duplicateRows = [...actualRows, {...actualRows.find(row => row.question_number === '5'),id:'duplicate-q5'}];
const duplicateReport = api.buildIntegrityReport({identity,expected,rows:duplicateRows,examSettings:[],strictActiveState:true});
assert.strictEqual(duplicateReport.integrityPass,false,'duplicate question number must fail integrity');
assert(duplicateReport.actual.duplicateQuestionNumbers.some(item => item.questionNumber === 'Q5'));

const activatedRows = make2019Rows({hosted:true,activateQ28:true});
const laterManualReport = api.buildIntegrityReport({identity,expected,rows:activatedRows,examSettings:[],strictActiveState:false});
assert.strictEqual(laterManualReport.integrityPass,true,'later teacher activation should not corrupt content integrity');
assert.strictEqual(laterManualReport.status,'attention','manual check should surface changed active state without calling content corrupt');
const strictActivatedReport = api.buildIntegrityReport({identity,expected,rows:activatedRows,examSettings:[],strictActiveState:true});
assert.strictEqual(strictActivatedReport.integrityPass,false,'immediate post-import check must verify inactive review state was preserved');

assert(source.includes("cloud.from('exam_paper_settings')"),'A6 should read the Exam Setting for the verified paper');
assert(source.includes(".select('*')"),'A6 Exam Setting access must be read-only');
assert(!/\.insert\s*\(/.test(source),'A6 must not insert rows');
assert(!/\.update\s*\(/.test(source),'A6 must not update rows');
assert(!/\.upsert\s*\(/.test(source),'A6 must not upsert rows');
assert(!/\.delete\s*\(/.test(source),'A6 must not delete rows');
assert(!/\.upload\s*\(/.test(source),'A6 must not upload Storage objects');
assert(!/\.remove\s*\(/.test(source),'A6 must not remove Storage objects');
assert(source.includes("getElementById('v51a5-import-paper')"),'A6 should capture the A5 import context before the write');
assert(source.includes('imported successfully'),'A6 should automatically verify after A5 reports success');
assert(loader.includes('paper-import-management.js'),'V5 loader must include A6');

console.log('V5.1A6 post-import integrity checks passed.');
