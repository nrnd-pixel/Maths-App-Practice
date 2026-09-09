const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {section,loadApi}=require('./v52c-consolidated-test-helper.cjs');

const hotfix=section('mount');
const releasePath=path.join(__dirname,'..','v40-release.js');
const release=fs.readFileSync(releasePath,'utf8');
const api=loadApi(hotfix);

assert.strictEqual(api.LIBRARY_ID,'v52c-student-topical-library');

assert(hotfix.includes("document.querySelector('#start .v40c-learn-setup')"),
  'Hotfix must target the current V4 Learn shell');
assert(hotfix.includes("setup?.querySelector('.v40c-practice-summary')"),
  'Topical library must prefer mounting before the current Practice setup');
assert(hotfix.includes("setup?.querySelector('.v40c-learn-actions')"),
  'Current Learn actions must remain a supported fallback anchor');
assert(hotfix.includes("document.getElementById('start-btn')?.closest('.buttons')"),
  'Legacy .buttons shells must remain supported');
assert(hotfix.includes("anchor.insertAdjacentElement('beforebegin', root)"),
  'Library root must be inserted before the chosen Learn-shell anchor');
assert(hotfix.includes("root.id = LIBRARY_ID"),
  'Hotfix must create the exact root consumed by the accepted V5.2C renderer');
assert(hotfix.includes("root.className = 'info hidden'"),
  'New root must start hidden until Topical Practice is selected');
assert(hotfix.includes('observer.disconnect()'),
  'Fallback shell observer must disconnect after mounting instead of remaining page-wide');

assert(!hotfix.includes("cloud.rpc("),
  'Mount hotfix must not alter or duplicate secure topical RPC behavior');
assert(!hotfix.includes("cloud.from("),
  'Mount hotfix must not access database tables');
assert(!hotfix.includes('active='),
  'Mount hotfix must not change topical activation state');

const consolidated="loadScriptOnce('topical-legacy-student-route.js', 'data-topical-legacy-student-route');";
assert(release.includes(consolidated),'Consolidated V5.2C route must be release-wired');
assert(release.indexOf(consolidated)>release.indexOf("loadScriptOnce('v52b1-large-import-timeout-recovery.js?v=52b1-1'"),
  'Consolidated V5.2C route must retain the accepted loader phase');
assert(release.indexOf(consolidated)<release.indexOf("loadScriptOnce('practice-eligibility-ui.js'"),
  'Consolidated V5.2C route must remain before the V53 layer');

console.log('V5.2C.1 topical library mount checks passed.');