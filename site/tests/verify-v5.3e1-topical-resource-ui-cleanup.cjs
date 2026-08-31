const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v53e1-topical-resource-ui-cleanup.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'v40-release.js'),'utf8');

assert(source.includes("#v52b-topical-library .v52c-publication{display:none!important}"),
  'Legacy V5.2C student-publication panel must be hidden in the teacher topical library');
assert(source.includes("Topical Exercise Resource Library"),
  'Teacher topical library must be presented as a resource library');
assert(source.includes("Students access eligible questions through ordinary Practice Mode."),
  'Teacher library copy must describe ordinary Practice as the student route');
assert(source.includes("Resource-bank source"),
  'Obsolete Student exposure OFF badge must be replaced with resource-bank wording');
assert(source.includes("Practice resource bank eligibility"),
  'Practice eligibility panel must use current resource-bank wording');
assert(source.includes("In Practice resource bank"),
  'Eligible topical sets must use current in-bank wording');
assert(source.includes("Live in student Practice"),
  'Eligibility panel must describe the live ordinary Practice route');
assert(source.includes("Eligible rows can be served through ordinary student Practice while topical rows remain inactive."),
  'Eligibility help must preserve the inactive-topical safety explanation');

assert(source.includes("observe(cards,{childList:true})"),
  'UI cleanup observer must be limited to top-level topical-card replacement');
assert(!source.includes('subtree:true'),
  'UI cleanup must not install a broad subtree observer');
assert(!source.includes('characterData:true'),
  'UI cleanup must not observe its own text mutations');
assert(!source.includes('.rpc('),
  'UI cleanup must not call Supabase RPCs');
assert(!source.includes('save_topical_exercise_setting_v52c'),
  'UI cleanup must not mutate legacy topical publication state');
assert(!source.includes('save_topical_practice_eligibility_v53a'),
  'UI cleanup must not mutate Practice eligibility itself');

assert(loader.includes("loadScriptOnce('v53d5-practice-selection-intelligence.js?v=53d5-1', 'data-v53d5-practice-selection-intelligence');"),
  'Accepted V5.3D5 loader must remain present');
assert(loader.includes("loadScriptOnce('v53e1-topical-resource-ui-cleanup.js?v=53e1-1', 'data-v53e1-topical-resource-ui-cleanup');"),
  'V5.3E1 cleanup must be loaded after the accepted V5.3 stack');

console.log('V5.3E1 topical resource UI cleanup checks passed.');
