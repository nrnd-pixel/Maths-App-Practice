'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const site = path.resolve(__dirname,'..');
const source = fs.readFileSync(path.join(site,'v581a-practice-cloud-result-reconciliation.js'),'utf8');
const config = fs.readFileSync(path.join(site,'config.js'),'utf8');

new vm.Script(source,{filename:'v581a-practice-cloud-result-reconciliation.js'});

// Exact V5.8.1A install / ownership markers must remain present.
assert.match(source,/__v581aPracticeCloudResultReconciliationInstalled/,
  'V581A global install marker is missing.');
assert.match(source,/let\s+finishWrapped\s*=\s*false\s*;/,
  'V581A finishPractice wrapper marker is missing.');
assert.match(source,/let\s+rpcWrapped\s*=\s*false\s*;/,
  'V581A cloud.rpc wrapper marker is missing.');
assert.match(source,/let\s+runtimeWired\s*=\s*false\s*;/,
  'V581A runtime wiring marker is missing.');
assert.match(source,/V581APracticeCloudResultReconciliation/,
  'V581A public integrity API marker is missing.');

// finishPractice must be wrapped around the accepted base implementation, never bypass it.
assert.match(source,/function\s+installFinishWrapper\s*\(\)/,
  'V581A finishPractice wrapper installer is missing.');
assert.match(source,/const\s+base\s*=\s*typeof\s+ROOT\.finishPractice\s*===\s*['"]function['"]/,
  'V581A must capture the existing finishPractice implementation.');
assert.match(source,/const\s+wrapped\s*=\s*async\s+function\s*\(\.\.\.args\)/,
  'V581A finishPractice wrapper function is missing.');
assert.match(source,/await\s+base\.apply\(this,args\)/,
  'V581A finishPractice wrapper must delegate to the existing implementation.');
assert.match(source,/ROOT\.finishPractice\s*=\s*wrapped/,
  'V581A must install the delegated finishPractice wrapper on the global owner.');
assert.match(source,/finishWrapped\s*=\s*true/,
  'V581A must record successful finishPractice wrapping.');

// cloud.rpc must likewise wrap and delegate to the existing RPC transport.
assert.match(source,/function\s+installAssignmentStartGuard\s*\(\)/,
  'V581A cloud.rpc wrapper installer is missing.');
assert.match(source,/const\s+previous\s*=\s*cloud\.rpc\.bind\(cloud\)/,
  'V581A must capture the existing cloud.rpc transport.');
assert.match(source,/cloud\.rpc\s*=\s*function\s*\(name,args,options\)/,
  'V581A cloud.rpc wrapper function is missing.');
assert.match(source,/return\s+previous\(name,args,options\)/,
  'V581A cloud.rpc wrapper must delegate every RPC to the existing transport.');
assert.match(source,/rpcWrapped\s*=\s*true/,
  'V581A must record successful cloud.rpc wrapping.');
assert.match(source,/if\s*\(!finishReady\s*\|\|\s*!rpcReady\)\s*return\s+false/,
  'V581A install must not report success unless both wrappers are installed.');

// V581A may read the saved result, but assignment completion must remain server-owned.
const directRpcCalls = [...source.matchAll(/\bcloud\.rpc\(\s*['"`]([^'"`]+)['"`]/g)]
  .map(match=>match[1]);
assert.deepEqual(directRpcCalls,['get_student_review'],
  'V581A must directly issue only the read-only get_student_review RPC.');
assert.doesNotMatch(source,/complete_student_(?:practice_)?assignment/i,
  'V581A must not contain an assignment-completion RPC.');
assert.doesNotMatch(source,/practice_assignment_attempts[^\n]*(?:update|upsert|insert)|from\(\s*['"]practice_assignment_attempts['"]\s*\)/i,
  'V581A must not write assignment completion/status directly.');

// Preserve the accepted load boundary around this high-risk patch.
assert.match(config,/\.\/v581a-practice-cloud-result-reconciliation\.js'/,
  'V581A loader is missing from config.js.');
assert.match(config,/\.\/v58d-content-workflow-consolidation\.js'[\s\S]*\.\/v581a-practice-cloud-result-reconciliation\.js'[\s\S]*\.\/v58-stable-release-checkpoint\.js'/,
  'V581A must remain after V58D and before the V58 stable checkpoint.');

// Execute the installer in a minimal sandbox to prove both wrappers replace-and-delegate,
// rather than merely checking for similarly named source text.
(async()=>{
  const finishCalls = [];
  const rpcCalls = [];

  const finishBase = async function(...args){
    finishCalls.push(args);
    return 'base-finish-result';
  };
  const rpcBase = function(name,args,options){
    rpcCalls.push({name,args,options});
    return Promise.resolve({data:null,error:null});
  };

  const sandbox = {
    console,
    Promise,
    finishPractice:finishBase,
    cloud:{rpc:rpcBase},
    setTimeout(fn){ fn(); return 1; },
    clearTimeout(){}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  new vm.Script(source,{filename:'v581a-practice-cloud-result-reconciliation.js'}).runInContext(sandbox);

  assert.equal(sandbox.__v581aPracticeCloudResultReconciliationInstalled,true,
    'V581A install marker must be set when the patch installs.');
  assert.notStrictEqual(sandbox.finishPractice,finishBase,
    'finishPractice must be replaced by the V581A wrapper.');
  assert.notStrictEqual(sandbox.cloud.rpc,rpcBase,
    'cloud.rpc must be replaced by the V581A wrapper.');

  const finishResult = await sandbox.finishPractice('sentinel-finish');
  assert.equal(finishResult,'base-finish-result',
    'wrapped finishPractice must return the base implementation result.');
  assert.equal(finishCalls.length,1,
    'wrapped finishPractice must invoke the base implementation exactly once.');
  assert.equal(finishCalls[0][0],'sentinel-finish',
    'wrapped finishPractice must preserve call arguments.');

  await sandbox.cloud.rpc('sentinel_rpc',{value:7},{head:true});
  assert.equal(rpcCalls.length,1,
    'wrapped cloud.rpc must invoke the previous transport exactly once.');
  assert.equal(rpcCalls[0].name,'sentinel_rpc',
    'wrapped cloud.rpc must preserve the RPC name.');
  assert.equal(rpcCalls[0].args.value,7,
    'wrapped cloud.rpc must preserve RPC arguments.');
  assert.equal(rpcCalls[0].options.head,true,
    'wrapped cloud.rpc must preserve RPC options.');

  assert.ok(sandbox.V581APracticeCloudResultReconciliation,
    'V581A public integrity API must be installed.');

  console.log('V581A Practice cloud-result reconciliation integrity: PASS');
  console.log('- finishPractice is wrapped and delegates to the accepted base implementation');
  console.log('- cloud.rpc is wrapped and delegates to the accepted transport');
  console.log('- V581A directly issues only get_student_review; assignment completion remains server-owned');
  console.log('- exact install markers and loader boundary remain present');
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
