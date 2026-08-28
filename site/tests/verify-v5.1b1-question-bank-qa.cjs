const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sourcePath = path.join(__dirname,'..','v51-question-bank-qa.js');
const source = fs.readFileSync(sourcePath,'utf8');

const sandbox = { window:{} };
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'v51-question-bank-qa.js'});
const qa = sandbox.window.V51QuestionBankQA;
assert(qa,'V51QuestionBankQA API should be exposed');

function row({id,year=2020,paper='Paper 2',qno,parent=null,label=null,order=null,marks=3,active=true,image='',sourceType='past_paper',skill='Solve',answer='1',prompt='Shared prompt'}={}){
  return {
    id:String(id ?? `${year}-${paper}-${qno}`),
    year_level:6,
    strand:'number',
    topic:'Number',
    subtopic:'',
    skill,
    difficulty:'standard',
    marks,
    exam_year:year,
    paper,
    question_number:String(qno ?? ''),
    parent_question_number:parent == null ? null : String(parent),
    part_label:label,
    part_order:order,
    group_prompt:parent == null ? null : prompt,
    source_type:sourceType,
    source:'PSR',
    question_text:`Question ${qno}`,
    answer,
    accepted_answers:[answer],
    response_type:'number',
    response_config:{},
    hint:'',
    explanation:'',
    image_url:image,
    active
  };
}

function simplePaper(year=2020){
  return Array.from({length:30},(_,i)=>row({id:`${year}-${i+1}`,year,qno:i+1}));
}

const p2020 = simplePaper(2020);
const profile2020 = qa.auditPaperProfiles(p2020)[0];
assert.strictEqual(profile2020.status,'pass');
assert.strictEqual(profile2020.logicalQuestions,30);
assert.strictEqual(profile2020.totalMarks,90);
assert.strictEqual(profile2020.physicalRows,30);

function paper2019(){
  const rows=[];
  for(let q=1;q<=30;q++){
    if(q===1){
      rows.push(row({id:'2019-1a',year:2019,qno:'1(a)',parent:1,label:'a',order:1,marks:1}));
      rows.push(row({id:'2019-1b',year:2019,qno:'1(b)',parent:1,label:'b',order:2,marks:1}));
      rows.push(row({id:'2019-1c',year:2019,qno:'1(c)',parent:1,label:'c',order:3,marks:1}));
    }else if([17,29,30].includes(q)){
      rows.push(row({id:`2019-${q}a`,year:2019,qno:`${q}(a)`,parent:q,label:'a',order:1,marks:1}));
      rows.push(row({id:`2019-${q}b`,year:2019,qno:`${q}(b)`,parent:q,label:'b',order:2,marks:2}));
    }else{
      rows.push(row({id:`2019-${q}`,year:2019,qno:q,active:q!==28}));
    }
  }
  return rows;
}

const p2019 = paper2019();
assert.strictEqual(p2019.length,35,'2019 package should have 35 physical rows');
const context2019 = qa.buildQaContext(p2019);
const profile2019 = context2019.profiles[0];
assert.strictEqual(profile2019.status,'incomplete');
assert.strictEqual(profile2019.logicalQuestions,29);
assert.strictEqual(profile2019.totalMarks,87);
assert.strictEqual(profile2019.physicalRows,34);

const q28 = p2019.find(r=>r.question_number==='28');
const q28Flags = qa.qaFlags(q28,context2019).map(f=>f.key);
assert.deepStrictEqual(Array.from(q28Flags),['inactive'],'Q28 should be a row-level inactive flag only');
assert.strictEqual(qa.matchesQaFilter(q28,'inactive','all',context2019),true);
assert.strictEqual(qa.matchesQaFilter(p2019.find(r=>r.question_number==='2'),'paper_issue','all',context2019),true,'Paper issue filter should include rows from the incomplete active paper');
const stats2019 = qa.summaryStats(p2019,context2019);
assert.strictEqual(stats2019.flagged,1,'Paper-level incompleteness should not inflate row-level flagged count');
assert.strictEqual(stats2019.inactive,1);
assert.strictEqual(stats2019.paperIssues,1);
assert.strictEqual(stats2019.multipart,0,'Known valid multipart groups should not be flagged');

const duplicateRows = [row({id:'dup-a',qno:2}),row({id:'dup-b',qno:2})];
const duplicateContext = qa.buildQaContext(duplicateRows);
assert(duplicateContext.duplicateIds.has('dup-a'));
assert(duplicateContext.duplicateIds.has('dup-b'));
assert(qa.qaFlags(duplicateRows[0],duplicateContext).some(f=>f.key==='duplicate'));

const brokenMultipart = row({id:'broken-multipart',qno:'5(a)',parent:null,label:null,order:null});
const multipartContext = qa.buildQaContext([brokenMultipart]);
assert(multipartContext.multipartIds.has('broken-multipart'));
assert(qa.qaFlags(brokenMultipart,multipartContext).some(f=>f.key==='multipart'));

const metadataRow = row({id:'metadata',qno:8,skill:'',answer:''});
const metadata = qa.metadataIssues(metadataRow);
assert(metadata.includes('skill'));
assert(metadata.includes('answer'));
assert(qa.qaFlags(metadataRow,qa.buildQaContext([metadataRow])).some(f=>f.key==='metadata'));

const staticRow = row({id:'static',qno:9,image:'images/2019_P2_Q9.png'});
assert.strictEqual(qa.imageReferenceKind(staticRow.image_url),'app_static');
assert(!qa.qaFlags(staticRow,qa.buildQaContext([staticRow])).some(f=>f.key==='image'),'Known app-static images must not be false-positive QA flags');
const rootStaticRow = row({id:'root-static',qno:10,image:'/images/2019_P2_Q10.png'});
assert.strictEqual(qa.imageReferenceKind(rootStaticRow.image_url),'app_static');
assert(!qa.qaFlags(rootStaticRow,qa.buildQaContext([rootStaticRow])).some(f=>f.key==='image'));
const httpsRow = row({id:'https',qno:11,image:'https://example.com/q11.png'});
assert.strictEqual(qa.imageReferenceKind(httpsRow.image_url),'https');
assert(!qa.qaFlags(httpsRow,qa.buildQaContext([httpsRow])).some(f=>f.key==='image'));
const httpRow = row({id:'http',qno:12,image:'http://example.com/q12.png'});
assert(qa.qaFlags(httpRow,qa.buildQaContext([httpRow])).some(f=>f.key==='image'),'Plain HTTP image URLs should be flagged');
const unresolvedRow = row({id:'unresolved',qno:13,image:'question-assets/q13.png'});
assert(qa.qaFlags(unresolvedRow,qa.buildQaContext([unresolvedRow])).some(f=>f.key==='image'),'Unknown relative image paths should be flagged');

const topical = row({id:'topical',year:0,paper:'',qno:'',sourceType:'topical_exercise'});
assert.strictEqual(qa.sourceCategory(topical),'topical');
assert.strictEqual(qa.matchesQaFilter(topical,'all','topical',qa.buildQaContext([topical])),true);
assert.strictEqual(qa.matchesQaFilter(topical,'all','past_paper',qa.buildQaContext([topical])),false);

for (const forbidden of [".from('questions')",".from(\"questions\")",".insert(",".update(",".delete(",".upsert(","storage.from("]){
  assert(!source.includes(forbidden),`B1 must remain read-only; found forbidden write token ${forbidden}`);
}
assert(source.includes('V5.1B1 — Question Bank QA'));
assert(source.includes('Needs QA'));
assert(source.includes('Paper profile issue'));
assert(source.includes('All source types'));
assert(source.includes('Image path issue'));

console.log('V5.1B1 Question Bank QA checks passed.');
