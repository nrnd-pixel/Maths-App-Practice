const fs = require('fs');
const path = require('path');
const assert = require('assert');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');

const readme = read('README.md');
const config = read('config.js');
const release = read('v40-release.js');
const polish = read('v50-production-polish.js');
const audit = read('v50-release-audit-rc3.js');
const migrations = read('DATABASE-MIGRATIONS-V5.1.txt');
const checklist = read('DEPLOY-AND-TEST-V5.1.md');

assert.match(readme,/^# Maths Practice V5\.1/m);
assert.match(readme,/V5\.1 is the \*\*Stable Release\*\*/);
assert.match(readme,/visible application identity is \*\*V5\.1 Stable Release\*\*/i);
assert.doesNotMatch(readme,/current \*\*release-candidate line\*\*/i);
assert.match(readme,/5c625f6103f037a6bdce592eb985df0ad47a9f42/,'Stable README must record the accepted RC merge base');

assert.match(config,/document\.title = 'Math Practice V5\.1'/);
assert.match(release,/function applyV51StableRelease\(\)/);
assert.match(release,/Version 5\.1 • Stable Release/);
assert.match(release,/V5\.1 Stable Release:/);
assert.match(release,/v51-student-exam-paper-library\.js\?v=51c1-1/);
assert.match(release,/v51-student-exam-resume-progress\.js\?v=51c2-1/);
assert.match(release,/v50-production-polish\.js\?v=51stable-1/);
assert.match(release,/v50-release-audit-rc3\.js\?v=51stable-1/);

assert.match(polish,/const TITLE = 'Math Practice V5\.1'/);
assert.match(polish,/const BADGE = 'Version 5\.1 • Stable Release'/);
assert.match(polish,/phase:'V5\.1Stable'/);
assert.match(audit,/V5\.1 Release Audit/);
assert.match(audit,/V5\.1 production-polish checks pass/);

assert.match(migrations,/20260829181613 v51b3_exam_publication_bulk_cleanup/);
assert.match(migrations,/V5\.1C2 — no new database migration required/);
assert.match(checklist,/V5\.1C2 — Exam resume and progress clarity/);
assert.match(checklist,/V5 Regression Safety is green on the exact candidate head/);

for (const source of [release,polish,audit]) {
  assert(!/cloud\.rpc\(|cloud\.from\(|localStorage\.setItem|localStorage\.removeItem/.test(source),
    'Stable release stamp/presentation files must not add application data writes.');
}

assert(!release.includes('Version 5.1 • Release Candidate'),'Stable release must not show RC badge wording');
assert(!release.includes('V5.1 Release Candidate:'),'Stable release must not show RC release-note wording');

console.log('V5.1 Stable Release stamp checks passed.');
console.log('- stable identity and Release Audit wording verified');
console.log('- accepted V5.1 C1/C2 loader wiring retained');
console.log('- production migration record retained');
console.log('- release stamp remains free of application data writes');
