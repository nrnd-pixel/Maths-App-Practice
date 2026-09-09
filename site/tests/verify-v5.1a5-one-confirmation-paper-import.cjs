const {section}=require('./v51-owner-section-helper.cjs');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const sourcePath = path.join(root,'site','paper-import-management.js');
const loaderPath = path.join(root,'site','v40-release.js');
const source = section('paper-import-management.js','/* V5.1A5 — One-confirmation validated paper import.','/* V5.1A6 — Post-import integrity check.');
const loader = fs.readFileSync(loaderPath,'utf8');

const sandbox = {
  window:{
    V51PaperPackagePreview:{
      importCounts(rows){
        return {
          total:rows.length,
          ready:rows.filter(row => row._valid !== false && !row._duplicate).length,
          duplicates:rows.filter(row => !!row._duplicate).length,
          invalid:rows.filter(row => row._valid === false).length
        };
      },
      packageCsvStats(rows){
        const first = rows[0] || {};
        return {
          logicalQuestions:Number(first._packageLogical ?? (/paper\s*1/i.test(first.paper||'') ? 40 : 30)),
          marks:Number(first._packageMarks ?? 90)
        };
      }
    },
    V51PaperProfileValidator:{
      paperProfile(value){
        const text = String(value||'').trim();
        if (/^paper\s*1$/i.test(text)) return {label:'Paper 1',expectedLogicalQuestions:40,expectedMarks:90};
        if (/^paper\s*2$/i.test(text)) return {label:'Paper 2',expectedLogicalQuestions:30,expectedMarks:90};
        return null;
      },
      logicalQuestionNumber(row){
        if (row.parent_question_number) return String(row.parent_question_number);
        return String(row.question_number||'').replace(/^q/i,'').replace(/\([a-z]\)$/i,'');
      },
      buildProfiles(_existing,rows){
        const first = rows[0] || {};
        if (!/^paper\s*[12]$/i.test(String(first.paper||''))) return [];
        const expectedLogicalQuestions = /paper\s*1/i.test(first.paper||'') ? 40 : 30;
        const logicalQuestions = Number(first._activeLogical ?? expectedLogicalQuestions);
        const totalMarks = Number(first._activeMarks ?? 90);
        return [{
          examYear:first.exam_year,
          paper:first.paper,
          logicalQuestions,
          expectedLogicalQuestions,
          totalMarks,
          expectedMarks:90,
          status:logicalQuestions===expectedLogicalQuestions && totalMarks===90 ? 'pass' : 'incomplete'
        }];
      }
    },
    V51BulkQuestionImageUpload:{
      buildMatchReport(rows,files){
        const local = rows.filter(row => row._valid !== false && !row._duplicate && /^images\//.test(String(row.image_url||'')));
        return {
          requiresUpload:local.length>0,
          requiredCount:local.length,
          matchedCount:local.length,
          missing:[],
          duplicateFileNames:[],
          invalidMatches:[],
          readyToUpload:true,
          orphanFiles:[]
        };
      },
      localImageRows(rows){
        return rows.filter(row => row._valid !== false && !row._duplicate && /^images\//.test(String(row.image_url||'')));
      }
    }
  },
  console
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'paper-import-management.js'});
const api = sandbox.window.V51OneConfirmationPaperImport;
assert(api,'V5.1A5 API should be exposed');

const readyRows = [
  {_valid:true,_duplicate:false,year_level:6,exam_year:2021,paper:'Paper 2',question_number:'1',source_type:'past_paper',active:true,image_url:'images/2021_P2_Q1.png',_packageLogical:30,_packageMarks:90,_activeLogical:30,_activeMarks:90},
  {_valid:true,_duplicate:false,year_level:6,exam_year:2021,paper:'Paper 2',question_number:'2',source_type:'past_paper',active:true,image_url:''},
  {_valid:true,_duplicate:true,year_level:6,exam_year:2021,paper:'Paper 2',question_number:'3',source_type:'past_paper',active:true,image_url:'images/duplicate.png'}
];
const plan = api.buildPlan({rows:readyRows,packageReady:true,cloudReadyForTeacher:true,files:[{name:'2021_P2_Q1.png'}]});
assert.strictEqual(plan.ready,true,'clean complete package with new rows should be importable');
assert.strictEqual(plan.packageProfilePass,true);
assert.strictEqual(plan.examReady,true);
assert.strictEqual(plan.counts.total,3);
assert.strictEqual(plan.counts.ready,2);
assert.strictEqual(plan.counts.duplicates,1);
assert.strictEqual(plan.counts.invalid,0);
assert.strictEqual(plan.imagesToUpload,1,'only images for ready rows should be uploaded');
assert.strictEqual(plan.identity.examYear,2021);
assert.strictEqual(plan.identity.paper,'Paper 2');

const confirmation = api.confirmationText(plan);
assert(confirmation.includes('Import 2021 Paper 2 now?'));
assert(confirmation.includes('2 new question rows'));
assert(confirmation.includes('uploading 1 matched image'));
assert(confirmation.includes('Digitisation package is complete: 30/30 logical questions · 90/90 marks'));
assert(confirmation.includes('configured Supabase question bank'));
assert(confirmation.includes('Existing duplicates remain skipped'));
assert(confirmation.includes('No Exam Setting will be created or enabled automatically'));

const reviewRows = [
  {_valid:true,_duplicate:false,year_level:6,exam_year:2019,paper:'Paper 2',question_number:'1(a)',parent_question_number:'1',source_type:'past_paper',active:true,image_url:'',_packageLogical:30,_packageMarks:90,_activeLogical:29,_activeMarks:87},
  {_valid:true,_duplicate:false,year_level:6,exam_year:2019,paper:'Paper 2',question_number:'28',source_type:'past_paper',active:false,image_url:'images/2019_P2_Q28.png'}
];
const reviewPlan = api.buildPlan({rows:reviewRows,packageReady:true,cloudReadyForTeacher:true,files:[{name:'2019_P2_Q28.png'}]});
assert.strictEqual(reviewPlan.ready,true,'a complete package with an intentionally inactive review row should still be importable');
assert.strictEqual(reviewPlan.packageProfilePass,true,'full package should pass at 30/30 and 90/90 even when one row is inactive');
assert.strictEqual(reviewPlan.examReady,false,'active exam-profile QA should remain incomplete when the review row is inactive');
assert.deepStrictEqual(Array.from(reviewPlan.inactiveLogicalQuestions),['Q28']);
assert.strictEqual(reviewPlan.packageProfile.logicalQuestions,30);
assert.strictEqual(reviewPlan.packageProfile.totalMarks,90);
const reviewConfirmation = api.confirmationText(reviewPlan);
assert(reviewConfirmation.includes('Digitisation package is complete: 30/30 logical questions · 90/90 marks'));
assert(reviewConfirmation.includes('Review warning: Q28 is inactive and will stay inactive after import'));
assert(reviewConfirmation.includes('Active exam-profile QA remains incomplete (29/30 logical questions · 87/90 marks)'));

const trulyIncompleteRows = readyRows.map((row,index)=>({...row,_packageLogical:index===0?29:undefined,_packageMarks:index===0?87:undefined,_activeLogical:index===0?29:undefined,_activeMarks:index===0?87:undefined}));
const incompletePlan = api.buildPlan({rows:trulyIncompleteRows,packageReady:true,cloudReadyForTeacher:true,files:[{name:'2021_P2_Q1.png'}]});
assert.strictEqual(incompletePlan.ready,false,'a genuinely incomplete digitisation package must block one-confirmation import');
assert.strictEqual(incompletePlan.packageProfilePass,false);
assert(incompletePlan.blockers.some(item => /complete paper before one-confirmation import/i.test(item)));
assert(incompletePlan.blockers.some(item => /29\/30 logical questions/i.test(item)));
assert(incompletePlan.blockers.some(item => /87\/90 marks/i.test(item)));

const invalidPlan = api.buildPlan({
  rows:[{_valid:false,_duplicate:false,exam_year:2021,paper:'Paper 2',source_type:'past_paper',active:true,image_url:'',_packageLogical:30,_packageMarks:90}],
  packageReady:true,
  cloudReadyForTeacher:true,
  files:[]
});
assert.strictEqual(invalidPlan.ready,false,'invalid CSV rows must block A5');
assert(invalidPlan.blockers.some(item => /needs attention/i.test(item)));

const noPreviewPlan = api.buildPlan({rows:readyRows,packageReady:false,cloudReadyForTeacher:true,files:[]});
assert.strictEqual(noPreviewPlan.ready,false,'A4 package preview must be clean before A5');
assert(noPreviewPlan.blockers.some(item => /A4 package preview/i.test(item)));

const duplicateOnly = api.buildPlan({
  rows:[{_valid:true,_duplicate:true,exam_year:2020,paper:'Paper 2',question_number:'1',source_type:'past_paper',active:true,image_url:'',_packageLogical:30,_packageMarks:90,_activeLogical:30,_activeMarks:90}],
  packageReady:true,
  cloudReadyForTeacher:true,
  files:[]
});
assert.strictEqual(duplicateOnly.ready,false,'already-imported packages must not re-import');
assert.strictEqual(duplicateOnly.alreadyImported,true);

const noCloud = api.buildPlan({rows:readyRows,packageReady:true,cloudReadyForTeacher:false,files:[]});
assert.strictEqual(noCloud.ready,false,'Cloud Teacher mode is required');
assert(noCloud.blockers.some(item => /Cloud Teacher/i.test(item)));

const topicalRows = [{_valid:true,_duplicate:false,year_level:6,exam_year:null,paper:'',question_number:'1',source_type:'practice',active:true,image_url:''}];
const topicalPlan = api.buildPlan({rows:topicalRows,packageReady:true,cloudReadyForTeacher:true,files:[]});
assert.strictEqual(topicalPlan.ready,true,'non-paper practice packages should not be forced through Paper 1/2 completeness QA');
assert.strictEqual(topicalPlan.packageProfilePass,true);

assert.strictEqual((source.match(/window\.confirm\s*\(/g)||[]).length,1,'A5 must use exactly one deliberate confirmation dialog');
assert(source.includes("getElementById('v51a2-upload-images')"),'A5 should invoke the existing A2 upload action');
assert(source.includes("getElementById('import-btn')"),'A5 should invoke the existing question importer');
assert(source.includes('V51BulkQuestionImageUpload'),'A5 should reuse A2 validation/upload state');
assert(source.includes('V51PaperPackagePreview'),'A5 should reuse A4 package statistics/readiness');
assert(source.includes('V51PaperProfileValidator'),'A5 should reuse the established Paper 1/2 definitions and active exam-profile QA');
assert(source.includes('Inactive review rows may be imported safely and remain inactive'),'A5 UI should explain inactive review-row behavior');
assert(!/\.from\(\s*['\"]questions['\"]\s*\)/.test(source),'A5 must not write question rows directly');
assert(!/storage\.from/.test(source),'A5 must not implement a direct Storage write path');
assert(!/exam_settings|exam-settings/i.test(source),'A5 must not create or enable Exam Settings');
assert(!source.includes('localStorage'),'A5 must not persist orchestration state in localStorage');
assert(!source.includes('sessionStorage'),'A5 must not persist orchestration state in sessionStorage');
assert(loader.includes('paper-import-management.js'),'V5 loader must include A5');

console.log('V5.1A5 one-confirmation paper import checks passed.');
