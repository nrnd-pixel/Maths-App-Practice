const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const modulePath=path.join(root,'v53e1-topical-resource-ui-cleanup.js');
const source=fs.readFileSync(modulePath,'utf8');
const loader=fs.readFileSync(path.join(root,'v40-release.js'),'utf8');
const api=require(modulePath);

const eligible=[
  {year_level:6,source:'Set A',source_type:'topical_exercise',practice_eligible:true,active:false},
  {year_level:6,source:'Set A',source_type:'topical_exercise',practice_eligible:true,active:false}
];
const partial=[eligible[0],{...eligible[1],practice_eligible:false}];
assert.strictEqual(api.isTopical(eligible[0]),true);
assert.strictEqual(api.isPracticeEligible(eligible[0]),true);
assert.strictEqual(api.practiceSetLabel(eligible),'Available in Practice');
assert.strictEqual(api.practiceSetLabel(partial),'Partially in Practice');
assert.strictEqual(api.practiceSetLabel(partial.map(row=>({...row,practice_eligible:false}))),'Not in Practice');

assert(source.includes("#v52b-topical-library .v52c-publication{display:none!important}"),
  'Legacy V5.2C student-publication panel must be hidden in the teacher topical library');
assert(source.includes('#questions-cards .toggle-q[data-v52-topical-locked="1"]{display:none!important}'),
  'Obsolete locked topical Activate control must be hidden rather than fighting the legacy guard observer');
assert(source.includes('Topical Exercise Resource Library'),
  'Teacher topical library must be presented as a resource library');
assert(source.includes('Students access eligible questions through ordinary Practice Mode.'),
  'Teacher library copy must describe ordinary Practice as the student route');
assert(source.includes('Practice eligible'),
  'Legacy staged summary must be replaced by the actual Practice-eligible row count');
assert(source.includes('Available in Practice'),
  'Fully eligible topical sets must visibly show current Practice availability');
assert(source.includes('Practice resource bank eligibility'),
  'Practice eligibility panel must use current resource-bank wording');
assert(source.includes('Live in student Practice'),
  'Eligibility panel must describe the live ordinary Practice route');
assert(source.includes('Inactive record'),
  'Topical Question Bank cards must clarify that inactive is record state');
assert(source.includes('Practice resource'),
  'Practice-eligible topical question cards must show an independent Practice resource badge');

assert(source.includes("observe(cards,{childList:true})"),
  'UI cleanup observer must be limited to top-level topical-card replacement');
assert(!source.includes('subtree:true'),
  'UI cleanup must not install a broad new subtree observer');
assert(!source.includes('characterData:true'),
  'UI cleanup must not observe its own text mutations');
assert(!source.includes('.rpc('),
  'UI cleanup must not call Supabase RPCs');
assert(!source.includes('save_topical_exercise_setting_v52c'),
  'UI cleanup must not mutate legacy topical publication state');
assert(!source.includes('save_topical_practice_eligibility_v53a'),
  'UI cleanup must not mutate Practice eligibility itself');

assert(loader.includes("loadScriptOnce('v53a-practice-eligibility.js?v=53a-2', 'data-v53a-practice-eligibility');"),
  'Current Practice eligibility copy must be cache-busted in the combined E1 preview');
assert(loader.includes("loadScriptOnce('v53d5-practice-selection-intelligence.js?v=53d5-1', 'data-v53d5-practice-selection-intelligence');"),
  'Accepted V5.3D5 loader must remain present');
assert(loader.includes("loadScriptOnce('v53e1-topical-resource-ui-cleanup.js?v=53e1-1', 'data-v53e1-topical-resource-ui-cleanup');"),
  'V5.3E1 cleanup must be loaded after the accepted V5.3 stack');

console.log('V5.3E1 teacher resource status clarity checks passed.');
