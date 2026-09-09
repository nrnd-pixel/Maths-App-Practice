const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {section,loadApi}=require('./v52c-consolidated-test-helper.cjs');

const bridge=section('hint');
const loaderPath=path.join(__dirname,'..','v40-release.js');
const loader=fs.readFileSync(loaderPath,'utf8');
const api=loadApi(bridge);

assert.strictEqual(typeof api.showTopicalHint,'function');
assert(bridge.includes("cloud.rpc('request_topical_hint_v52c'"),'Topical Hint must use its dedicated bearer-token RPC');
assert(bridge.includes('state?.topicalSource'),'Hint bridge must activate only for an explicit topical session');
assert(bridge.includes('const baseHandler=button.onclick'),'Existing ordinary Practice Hint handler must be preserved');
assert(bridge.includes("return typeof baseHandler==='function' ? baseHandler.call(this,event)"),'Non-topical Hint clicks must fall through to the existing handler unchanged');
assert(bridge.includes('!status?.correct && !status?.submitted'),'Multipart Hint must skip already-completed parts');
assert(bridge.includes("['drawing','manual']"),'Teacher-marked response types must not request automatic hints');
assert(!bridge.includes("request_practice_hint_v3"),'Topical hint bridge must never call the ordinary active-question Hint RPC');
assert(!bridge.includes("cloud.from('questions')"),'Topical hint bridge must not access the question table directly');

const consolidated="loadScriptOnce('topical-legacy-student-route.js', 'data-topical-legacy-student-route')";
assert(loader.includes(consolidated),'Release loader must include the consolidated V5.2C route');
assert(loader.indexOf(consolidated)>loader.indexOf("loadScriptOnce('v52b1-large-import-timeout-recovery.js?v=52b1-1'"),'Consolidated V5.2C route must retain the historical phase after V52B1 support');
assert(loader.indexOf(consolidated)<loader.indexOf("loadScriptOnce('practice-eligibility-ui.js'"),'Consolidated V5.2C route must remain before V53A');

console.log('V5.2C topical hint bridge checks passed.');