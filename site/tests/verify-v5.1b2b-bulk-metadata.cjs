const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sourcePath = path.join(__dirname,'..','question-bank-metadata-review.js');
const source = fs.readFileSync(sourcePath,'utf8');
const sandbox = {window:{}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'question-bank-metadata-review.js'});
const bulk = sandbox.window.V51QuestionBankBulkMetadata;
assert(bulk,'V51QuestionBankBulkMetadata API should be exposed');

assert.deepStrictEqual(
  Array.from(bulk.allowedFields),
  ['strand','topic','subtopic','skill','difficulty','source_type'],
  'B2B metadata whitelist must stay narrow'
);

const rows = [
  {id:'p1',year_level:6,exam_year:2020,paper:'Paper 2',question_number:'1',strand:'number',topic:'Decimals',subtopic:'Addition',skill:'Add decimals',difficulty:'standard',source_type:'past_paper',active:true},
  {id:'p2',year_level:6,exam_year:2020,paper:'Paper 2',question_number:'2',strand:'number',topic:'Decimals',subtopic:'Addition',skill:'Add decimals',difficulty:'standard',source_type:'past_paper',active:true},
  {id:'practice',year_level:6,exam_year:null,paper:'',question_number:'',strand:'number',topic:'Fractions',subtopic:'',skill:'Compare fractions',difficulty:'foundation',source_type:'practice',active:true}
];

const ids = new Set(['p1','p2']);
const plan = bulk.buildMetadataPlan(rows,ids,{topic:'Number Operations',difficulty:'challenge'});
assert.strictEqual(plan.selected.length,2);
assert.strictEqual(plan.changing.length,2);
assert.strictEqual(plan.canRun,true);
assert.strictEqual(plan.fieldCounts.topic,2);
assert.strictEqual(plan.fieldCounts.difficulty,2);
assert.strictEqual(plan.patch.topic,'Number Operations');
assert.strictEqual(plan.patch.difficulty,'challenge');

const unchanged = bulk.buildMetadataPlan(rows,new Set(['p1']),{topic:'Decimals',difficulty:'standard'});
assert.strictEqual(unchanged.changing.length,0,'Rows already holding the requested values must be excluded');
assert.strictEqual(unchanged.canRun,false);

const protectedField = bulk.buildMetadataPlan(rows,new Set(['p1']),{marks:5,answer:'99'});
assert.strictEqual(protectedField.fields.length,0,'Protected fields must never enter the patch');
assert(protectedField.blockers.some(x=>x.includes('Protected or unsupported field: marks')));
assert(protectedField.blockers.some(x=>x.includes('Protected or unsupported field: answer')));
assert.strictEqual(protectedField.canRun,false);

const blankTopic = bulk.buildMetadataPlan(rows,new Set(['p1']),{topic:'   '});
assert(blankTopic.blockers.some(x=>x.includes('Topic cannot be blank')),'Required topic cannot be cleared');
assert.strictEqual(blankTopic.canRun,false);

const clearSubtopic = bulk.buildMetadataPlan(rows,new Set(['p1']),{subtopic:''});
assert.strictEqual(clearSubtopic.blockers.length,0,'Subtopic may intentionally be cleared');
assert.strictEqual(clearSubtopic.changing.length,1);
assert.strictEqual(clearSubtopic.patch.subtopic,'');
assert.strictEqual(clearSubtopic.canRun,true);

const makePastPaper = bulk.buildMetadataPlan(rows,new Set(['practice']),{source_type:'past_paper'});
assert(makePastPaper.blockers.some(x=>x.includes('cannot become past_paper')),'Past-paper conversion requires complete exam identity');
assert.strictEqual(makePastPaper.canRun,false);

const removePastPaperClassification = bulk.buildMetadataPlan(rows,new Set(['p1']),{source_type:'practice'});
assert.strictEqual(removePastPaperClassification.blockers.length,0);
assert.strictEqual(removePastPaperClassification.sourceTypeWarnings.length,1,'Past-paper classification changes must warn');
assert.strictEqual(removePastPaperClassification.canRun,true);

const confirm = bulk.confirmationText(removePastPaperClassification);
assert(confirm.includes('Only the enabled metadata fields will change.'));
assert(confirm.includes('Answers, marks, response types, exam identity, multipart structure, images and active status will not change.'));
assert(confirm.includes('no Exam Setting will be created or enabled'));
assert(confirm.includes('configured Supabase question bank'));

assert(source.includes("cloud.from('questions').update(patch).in('id',ids)"),'B2B should use one whitelisted patch update');
assert(!/cloud\.from\(['\"]questions['\"]\)\.delete\s*\(/.test(source),'B2B must not delete question rows');
assert(!/cloud\.from\(['\"]questions['\"]\)\.insert\s*\(/.test(source),'B2B must not insert question rows');
assert(!/cloud\.from\(['\"]questions['\"]\)\.upsert\s*\(/.test(source),'B2B must not upsert question rows');
assert(!source.includes('storage.from('),'B2B must not change Storage');
assert(!source.includes("from('exam_paper_settings')"),'B2B must not change Exam Settings');
assert(!source.includes('update({active'),'B2B must not change active status');
assert(!source.includes('question_number:'),'B2B must not construct question-number patches');
assert(source.includes('Preview metadata changes'));
assert(source.includes('Apply metadata changes'));
assert(source.includes('Uses the B2A selection'));

console.log('V5.1B2B bulk metadata checks passed.');
