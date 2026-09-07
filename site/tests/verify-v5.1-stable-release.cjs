const fs = require('fs');
const path = require('path');
const assert = require('assert');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');
const changelog = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

const readme = read('README.md');
const config = read('config.js');
const release = read('v40-release.js');
const polish = read('v50-production-polish.js');
const audit = read('v50-release-audit-rc3.js');
const checkpoint = read('v54-stable-release-checkpoint.js');
const migrations = changelog;
const checklist = changelog;

// Preserve the signed-off V5.1 release history and migration/checklist record.
assert.match(readme,/^# Maths Practice V5\.1/m);
assert.match(readme,/V5\.1 is the \*\*Stable Release\*\*/);
assert.match(readme,/visible application identity is \*\*V5\.1 Stable Release\*\*/i);
assert.doesNotMatch(readme,/current \*\*release-candidate line\*\*/i);
assert.match(readme,/5c625f6103f037a6bdce592eb985df0ad47a9f42/,'Stable README must record the accepted RC merge base');
assert.match(config,/document\.title = 'Math Practice V5\.1'/,
  'Historical bootstrap title remains recoverable before current production branding applies.');
assert.match(release,/function applyV51StableRelease\(\)/);
assert.match(release,/Version 5\.1 • Stable Release/);
assert.match(release,/V5\.1 Stable Release:/);
assert.match(release,/v51-student-exam-paper-library\.js\?v=51c1-1/);
assert.match(release,/v51-student-exam-resume-progress\.js\?v=51c2-1/);
assert.match(release,/v50-production-polish\.js\?v=51stable-1/);
assert.match(release,/v50-release-audit-rc3\.js\?v=51stable-1/);

// Current signed-off runtime identity advances to V5.4 without altering historical loader wiring.
assert.match(polish,/const TITLE = 'Math Practice V5\.4'/);
assert.match(polish,/const BADGE = 'Version 5\.4 • Stable Release'/);
assert.match(polish,/phase:'V5\.4Stable'/);
assert.match(audit,/V5\.4 Release Audit/);
assert.match(audit,/V5\.4 production-polish checks pass/);
assert.match(checkpoint,/const TITLE = 'Math Practice V5\.4'/);
assert.match(checkpoint,/const BADGE = 'Version 5\.4 • Stable Release'/);
assert.match(checkpoint,/V5\.4 Stable Release:/);
assert.match(config,/\.\/v40-start-shell\.js'[\s\S]*\.\/v54-stable-release-checkpoint\.js'/,
  'Current V5.4 checkpoint must load after the established start shell.');

assert.match(migrations,/20260829181613 v51b3_exam_publication_bulk_cleanup/);
assert.match(migrations,/V5\.1C2 — no new database migration required/);
assert.match(checklist,/V5\.1C2 — Exam resume and progress clarity/);
assert.match(checklist,/V5 Regression Safety is green on the exact candidate head/);

for (const source of [release,polish,audit,checkpoint]) {
  assert(!/cloud\.rpc\(|cloud\.from\(|localStorage\.setItem|localStorage\.removeItem/.test(source),
    'Stable release stamp/presentation files must not add application data writes.');
}

assert(!release.includes('Version 5.1 • Release Candidate'),'Historical stable release must not regress to RC badge wording');
assert(!release.includes('V5.1 Release Candidate:'),'Historical stable release must not regress to RC release-note wording');

console.log('Stable Release history + current checkpoint checks passed.');
console.log('- accepted V5.1 release history and C1/C2 loader wiring remain recoverable');
console.log('- V5.4 production identity, release audit and final checkpoint are aligned');
console.log('- production migration/checklist record is retained in CHANGELOG.md');
console.log('- release presentation remains free of application data writes');
