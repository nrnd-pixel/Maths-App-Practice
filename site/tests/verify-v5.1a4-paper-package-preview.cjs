const {section}=require('./v51-owner-section-helper.cjs');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const sourcePath = path.join(root,'site','paper-import-management.js');
const loaderPath = path.join(root,'site','v40-release.js');
const source = section('paper-import-management.js','/* V5.1A4 — Paper Import Package Preview.','/* V5.1A4 — package-preview status wording polish.');
const loader = fs.readFileSync(loaderPath,'utf8');

const sandbox = {window:{},console};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'paper-import-management.js'});
const api = sandbox.window.V51PaperPackagePreview;
assert(api,'V5.1A4 package preview API should be exposed');

const files = [
  {name:'questions.csv',webkitRelativePath:'PSR_2020_P2/questions.csv'},
  {name:'manifest.json',webkitRelativePath:'PSR_2020_P2/manifest.json'},
  {name:'audit_report.xlsx',webkitRelativePath:'PSR_2020_P2/audit_report.xlsx'},
  {name:'2020_P2_Q10.png',webkitRelativePath:'PSR_2020_P2/images/2020_P2_Q10.png'},
  {name:'2020_P2_Q15.png',webkitRelativePath:'PSR_2020_P2/images/2020_P2_Q15.png'},
  {name:'notes.txt',webkitRelativePath:'PSR_2020_P2/notes.txt'}
];
const inventory = api.classifyPackageFiles(files);
assert.strictEqual(inventory.questions.length,1);
assert.strictEqual(inventory.manifests.length,1);
assert.strictEqual(inventory.audits.length,1);
assert.strictEqual(inventory.images.length,2);
assert.strictEqual(inventory.other.length,1);
assert.strictEqual(inventory.duplicateImageNames.length,0);

const duplicateImages = api.classifyPackageFiles([
  {name:'Q10.png',webkitRelativePath:'pkg/images/Q10.png'},
  {name:'q10.PNG',webkitRelativePath:'pkg/extra/q10.PNG'}
]);
assert.strictEqual(duplicateImages.duplicateImageNames.length,1,'duplicate image basenames must be detected case-insensitively');

const rows = [
  {year_level:6,exam_year:2020,paper:'Paper 2',question_number:'1',marks:3,image_url:'',_valid:true,_duplicate:true},
  {year_level:6,exam_year:2020,paper:'Paper 2',question_number:'10',marks:3,image_url:'images/2020_P2_Q10.png',_valid:true,_duplicate:false},
  {year_level:6,exam_year:2020,paper:'Paper 2',question_number:'15(a)',parent_question_number:'15',part_label:'a',part_order:1,marks:1,image_url:'images/2020_P2_Q15.png',_valid:true,_duplicate:false},
  {year_level:6,exam_year:2020,paper:'Paper 2',question_number:'15(b)',parent_question_number:'15',part_label:'b',part_order:2,marks:2,image_url:'images/2020_P2_Q15.png',_valid:true,_duplicate:false}
];
const stats = api.packageCsvStats(rows);
assert.strictEqual(stats.rowCount,4);
assert.strictEqual(stats.logicalQuestions,3,'multipart rows should count as one logical question');
assert.strictEqual(stats.marks,9);
assert.strictEqual(stats.requiredImageCount,2,'shared multipart image should count once');

const coverage = api.packageImageCoverage(rows,inventory);
assert.strictEqual(coverage.requiredCount,2);
assert.strictEqual(coverage.matchedCount,2);
assert.strictEqual(coverage.missing.length,0);

const manifest = {
  year_level:6,
  exam_year:2020,
  paper:'Paper 2',
  questions_detected:3,
  csv_rows_generated:4,
  paper_total_marks:9,
  csv_marks_total:9,
  images_required:2,
  images_generated:2,
  audit_counts:{PASS:4,REVIEW:0,ERROR:0},
  validation_results:{csv_exactly_25_columns:true,required_images_exist:true},
  final_status:'PASS'
};
const audit = api.manifestAudit(manifest,rows,inventory);
assert.strictEqual(audit.errors.length,0,'matching manifest should pass');
assert(audit.checks.length >= 8,'manifest should be checked against core package counts and metadata');
assert(audit.checks.every(check=>check.pass),'all comparable manifest fields should pass');

const brokenManifest = api.manifestAudit({...manifest,csv_rows_generated:5,images_required:3},rows,inventory);
assert.strictEqual(brokenManifest.errors.length,2,'manifest count mismatches must be blockers');

const counts = api.importCounts(rows);
assert.deepStrictEqual(JSON.parse(JSON.stringify(counts)),{total:4,ready:3,duplicates:1,invalid:0});

const ready = api.evaluateReadiness({
  inventory,
  manifestAuditResult:audit,
  imageCoverage:coverage,
  imageReport:{missing:[],duplicateFileNames:[],invalidMatches:[],orphanFiles:['already-existing.png']},
  rows
});
assert.strictEqual(ready.ready,true,'duplicates and orphan selections should remain advisory for staged completion imports');
assert.strictEqual(ready.blockers.length,0);
assert.strictEqual(ready.warnings.length,1);

const blocked = api.evaluateReadiness({
  inventory,
  manifestAuditResult:{errors:['Manifest mismatch'],warnings:[]},
  imageCoverage:{missing:['missing.png'],duplicateRequired:[]},
  imageReport:{missing:['missing.png'],duplicateFileNames:[],invalidMatches:[],orphanFiles:[]},
  rows:[...rows,{_valid:false,_duplicate:false}]
});
assert.strictEqual(blocked.ready,false);
assert(blocked.blockers.length >= 3,'manifest, image and CSV blockers must all surface');

assert(source.includes('webkitdirectory'), 'A4 should support one extracted-folder selection');
assert(source.includes("document.getElementById('preview-csv')?.click()"), 'A4 must reuse the existing CSV preview path');
assert(source.includes("document.getElementById('v51a2-image-files')"), 'A4 must hand package images to the existing A2 matcher');
assert(source.includes('V51PaperProfileValidator'), 'A4 must reuse the A1 paper profile validator');
assert(source.includes('V51BulkQuestionImageUpload'), 'A4 must reuse the A2 image matcher');
assert(!/storage\.from\(/.test(source), 'A4 must not write directly to Supabase Storage');
assert(!/\.from\(\s*['\"]questions['\"]\s*\)/.test(source), 'A4 must not write question rows directly');
assert(!source.includes('localStorage'), 'A4 must not persist package state in localStorage');
assert(!source.includes('sessionStorage'), 'A4 must not persist package state in sessionStorage');
assert(!source.includes('fetch('), 'A4 must not add a direct network path');
assert(loader.includes('paper-import-management.js'), 'V5 loader must include the A4 module');

console.log('V5.1A4 paper package preview checks passed.');