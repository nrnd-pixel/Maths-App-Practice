const fs=require('fs');
const path=require('path');
const assert=require('assert');

const hotfixPath=path.join(__dirname,'..','v52c1-topical-library-mount-hotfix.js');
const releasePath=path.join(__dirname,'..','v40-release.js');
const hotfix=fs.readFileSync(hotfixPath,'utf8');
const release=fs.readFileSync(releasePath,'utf8');
const api=require(hotfixPath);

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

const baseLoader="loadScriptOnce('v52c-student-topical-library.js?v=52c-1', 'data-v52c-student-topical-library');";
const hotfixLoader="loadScriptOnce('v52c1-topical-library-mount-hotfix.js?v=52c1-1', 'data-v52c1-topical-library-mount-hotfix');";
assert(release.includes(baseLoader),'Accepted V5.2C student library loader must remain unchanged');
assert(release.includes(hotfixLoader),'V5.2C.1 mount hotfix must be release-wired');
assert(release.indexOf(hotfixLoader)>release.indexOf(baseLoader),
  'Mount hotfix must load after the accepted V5.2C student library');

console.log('V5.2C.1 topical library mount checks passed.');
