const fs=require('fs');
const path=require('path');
const assert=require('assert');

const bridgePath=path.join(__dirname,'..','v52c-topical-hint-bridge.js');
const loaderPath=path.join(__dirname,'..','v40-release.js');
const bridge=fs.readFileSync(bridgePath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const api=require(bridgePath);

assert.strictEqual(typeof api.showTopicalHint,'function');
assert(bridge.includes("cloud.rpc('request_topical_hint_v52c'"),'Topical Hint must use its dedicated bearer-token RPC');
assert(bridge.includes('state?.topicalSource'),'Hint bridge must activate only for an explicit topical session');
assert(bridge.includes('const baseHandler=button.onclick'),'Existing ordinary Practice Hint handler must be preserved');
assert(bridge.includes("return typeof baseHandler==='function' ? baseHandler.call(this,event)"),'Non-topical Hint clicks must fall through to the existing handler unchanged');
assert(bridge.includes('!status?.correct && !status?.submitted'),'Multipart Hint must skip already-completed parts');
assert(bridge.includes("['drawing','manual']"),'Teacher-marked response types must not request automatic hints');
assert(!bridge.includes("request_practice_hint_v3"),'Topical hint bridge must never call the ordinary active-question Hint RPC');
assert(!bridge.includes("cloud.from('questions')"),'Topical hint bridge must not access the question table directly');

assert(loader.includes("loadScriptOnce('v52c-topical-hint-bridge.js?v=52c-1', 'data-v52c-topical-hint-bridge')"),'Release loader must include the V5.2C Hint bridge');
assert(loader.indexOf('v52c-topical-hint-bridge.js')>loader.indexOf('v52c-student-topical-library.js'),'Hint bridge must load after the student topical engine');

console.log('V5.2C topical hint bridge checks passed.');
