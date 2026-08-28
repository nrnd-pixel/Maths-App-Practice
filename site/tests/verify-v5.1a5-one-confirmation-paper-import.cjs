const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname,'..','..');
const sourcePath = path.join(root,'site','v51-one-confirmation-paper-import.js');
const loaderPath = path.join(root,'site','v40-release.js');
const source = fs.readFileSync(sourcePath,'utf8');
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
      }
    },
    V51PaperProfileValidator:{
      paperProfile(value){
        return /^paper\s*[12]$/i.test(String(value||'').trim()) ? {label:String(value).trim()} : null;
      },
      buildProfiles(_existing,rows){
        const first = rows[0] || {};
        if (first._profileStatus === 'incomplete'){
          return [{
            examYear:first.exam_year,
            paper:first.paper,
            logicalQuestions:29,
            expectedLogicalQuestions:30,
            totalMarks:87,
            expectedMarks:90,
            status:'incomplete'
          }];
        }
        return [{
          examYear:first.exam_year,
          paper:first.paper,
          logicalQuestions:30,
          expectedLogicalQuestions:30,
          totalMarks:90,
          expectedMarks:90,
          status:'pass'
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
vm.runInContext(source,sandbox,{filename:'v51-one-confirmation-paper-import.js'});
const api = sandbox.window.V51OneConfirmationPaperImport;
assert(api,'V5.1A5 API should be exposed');

const readyRows = [
  {_valid:true,_duplicate:false,year_level:6,exam_year:2021,paper:'Paper 2',question_number:'1',source_type:'past_paper',image_url:'images/2021_P2_Q1.png'},
  {_valid:true,_duplicate:false,year_level:6,exam_year:2021,paper:'Paper 2',question_number:'2',source_type:'past_paper',image_url:''},
  {_valid:true,_duplicate:true,year_level:6,exam_year:2021,paper:'Paper 2',question_number:'3',source_type:'past_paper',image_url:'images/duplicate.png'}
];
const plan = api.buildPlan({rows:readyRows,packageReady:true,cloudReadyForTeacher:true,files:[{name:'2021_P2_Q1.png'}]});
assert.strictEqual(plan.ready,true,'clean package with a PASS paper profile and new rows should be importable');
assert.strictEqual(plan.profilePass,true);
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
assert(confirmation.includes('Paper-profile QA has passed'));
assert(confirmation.includes('configured Supabase question bank'));
assert(confirmation.includes('Existing duplicates remain skipped'));
assert(confirmation.includes('No Exam Setting will be created or enabled automatically'));

const incompleteRows = readyRows.map((row,index)=>({...row,_profileStatus:index===0?'incomplete':undefined}));
const incompletePlan = api.buildPlan({rows:incompleteRows,packageReady:true,cloudReadyForTeacher:true,files:[{name:'2021_P2_Q1.png'}]});
assert.strictEqual(incompletePlan.ready,false,'incomplete Paper 1/2 profile must block one-confirmation import');
assert.strictEqual(incompletePlan.profilePass,false);
assert(incompletePlan.blockers.some(item => /profile must PASS/i.test(item)));
assert(incompletePlan.blockers.some(item => /29\/30 logical questions/i.test(item)));
assert(incompletePlan.blockers.some(item => /87\/90 marks/i.test(item)));

const invalidPlan = api.buildPlan({
  rows:[{_valid:false,_duplicate:false,exam_year:2021,paper:'Paper 2',source_type:'past_paper',image_url:''}],
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
  rows:[{_valid:true,_duplicate:true,exam_year:2020,paper:'Paper 2',source_type:'past_paper',image_url:''}],
  packageReady:true,
  cloudReadyForTeacher:true,
  files:[]
});
assert.strictEqual(duplicateOnly.ready,false,'already-imported packages must not re-import');
assert.strictEqual(duplicateOnly.alreadyImported,true);

const noCloud = api.buildPlan({rows:readyRows,packageReady:true,cloudReadyForTeacher:false,files:[]});
assert.strictEqual(noCloud.ready,false,'Cloud Teacher mode is required');
assert(noCloud.blockers.some(item => /Cloud Teacher/i.test(item)));

const topicalRows = [{_valid:true,_duplicate:false,year_level:6,exam_year:null,paper:'',question_number:'1',source_type:'practice',image_url:''}];
const topicalPlan = api.buildPlan({rows:topicalRows,packageReady:true,cloudReadyForTeacher:true,files:[]});
assert.strictEqual(topicalPlan.ready,true,'non-paper practice packages should not be forced through Paper 1/2 profile QA');
assert.strictEqual(topicalPlan.profilePass,true);

assert.strictEqual((source.match(/window\.confirm\s*\(/g)||[]).length,1,'A5 must use exactly one deliberate confirmation dialog');
assert(source.includes("getElementById('v51a2-upload-images')"),'A5 should invoke the existing A2 upload action');
assert(source.includes("getElementById('import-btn')"),'A5 should invoke the existing question importer');
assert(source.includes('V51BulkQuestionImageUpload'),'A5 should reuse A2 validation/upload state');
assert(source.includes('V51PaperPackagePreview'),'A5 should reuse A4 readiness/count logic');
assert(source.includes('V51PaperProfileValidator'),'A5 should require the existing paper-profile validator for Paper 1/2');
assert(source.includes('profile must PASS before one-confirmation import'),'A5 should expose the strict profile gate');
assert(!/\.from\(\s*['\"]questions['\"]\s*\)/.test(source),'A5 must not write question rows directly');
assert(!/storage\.from/.test(source),'A5 must not implement a direct Storage write path');
assert(!/exam_settings|exam-settings/i.test(source),'A5 must not create or enable Exam Settings');
assert(!source.includes('localStorage'),'A5 must not persist orchestration state in localStorage');
assert(!source.includes('sessionStorage'),'A5 must not persist orchestration state in sessionStorage');
assert(loader.includes('v51-one-confirmation-paper-import.js'),'V5 loader must include A5');

console.log('V5.1A5 one-confirmation paper import checks passed.');
