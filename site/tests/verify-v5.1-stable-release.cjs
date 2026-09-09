const fs = require('fs');
const path = require('path');
const assert = require('assert');

const site = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');
const changelog = fs.readFileSync(path.join(site,'..','CHANGELOG.md'),'utf8');

const readme = read('README.md');
const config = read('config.js');
const release = read('v40-release.js');
const versionSource = read('version.js');
const auditOwner = read('release-audit-ui.js');
const checkpoint = read('v54-stable-release-checkpoint.js');
const migrations = changelog;
const checklist = changelog;

function section(source,start,next){
  const begin=source.indexOf(start);
  assert(begin>=0,`Missing consolidated section: ${start}`);
  const end=next ? source.indexOf(next,begin+start.length) : source.length;
  assert(end>begin,`Missing consolidated section boundary after: ${start}`);
  return source.slice(begin,end).trimEnd();
}
const polish=section(auditOwner,'/* V5.4 — UX & Production Polish.','/* V5.0 Release Candidate Audit');
const audit=section(auditOwner,'/* V5.4 — extends the existing read-only Release Audit');

// Preserve the signed-off V5.1 release history and migration/checklist record.
assert.match(readme,/^# Maths Practice V5\.1/m);
assert.match(readme,/V5\.1 is the \*\*Stable Release\*\*/);
assert.match(readme,/visible application identity is \*\*V5\.1 Stable Release\*\*/i);
assert.doesNotMatch(readme,/current \*\*release-candidate line\*\*/i);
assert.match(readme,/5c625f6103f037a6bdce592eb985df0ad47a9f42/,'Stable README must record the accepted RC merge base');
assert.match(release,/function applyV51StableRelease\(\)/);
assert.match(release,/MathAppVersion\?\.applyIdentity/);
assert.match(release,/V5\.1 Stable Release:/);
assert.match(release,/loadScriptOnce\('student-exam-ui\.js', 'data-student-exam-ui'\)/);
const studentExamOwner=read('student-exam-ui.js');
assert(studentExamOwner.indexOf('/* V5.1C1 — Student Exam Paper Library.') < studentExamOwner.indexOf('/* V5.1C2 — Student Exam Resume & Progress Clarity.'));
assert.match(release,/loadScriptOnce\('release-audit-ui\.js', 'data-release-audit-ui'\)/);

// Current runtime identity is centralized and derived from config.js's actual staged list.
assert.match(config,/const MATH_APP_STAGED_SCRIPTS = Object\.freeze\(\[/);
assert.match(config,/\.\/version\.js'/);
assert.doesNotMatch(config,/document\.title\s*=\s*['"]Math Practice V5\./);
assert.match(versionSource,/const CURRENT_RELEASE = buildRelease\(deriveCurrentVersion\(stagedScripts\)\)/);
assert.match(polish,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(polish,/MathAppVersion\?\.applyIdentity/);
assert.match(polish,/phase:'V5\.4Stable'/);
assert.match(audit,/V5\.4 Release Audit/);
assert.match(audit,/V5\.4 production-polish checks pass/);
assert.match(checkpoint,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(checkpoint,/MathAppVersion\?\.applyIdentity/);
assert.match(checkpoint,/V5\.4 Stable Release:/);
assert.doesNotMatch(polish,/const TITLE = 'Math Practice V5\.|const BADGE = 'Version 5\./);
assert.doesNotMatch(checkpoint,/const TITLE = 'Math Practice V5\.|const BADGE = 'Version 5\./);
assert.match(config,/\.\/v40-start-shell\.js'[\s\S]*\.\/v54-stable-release-checkpoint\.js'/,
  'Historical V5.4 checkpoint must load after the established start shell.');

assert.match(migrations,/20260829181613 v51b3_exam_publication_bulk_cleanup/);
assert.match(migrations,/V5\.1C2 — no new database migration required/);
assert.match(checklist,/V5\.1C2 — Exam resume and progress clarity/);
assert.match(checklist,/V5 Regression Safety is green on the exact candidate head/);

for (const source of [release,polish,audit,checkpoint,versionSource]) {
  assert(!/cloud\.rpc\(|cloud\.from\(|localStorage\.setItem|localStorage\.removeItem/.test(source),
    'Release stamp/presentation files must not add application data writes.');
}

assert(!release.includes('Version 5.1 • Release Candidate'),'Historical stable release must not regress to RC badge wording');
assert(!release.includes('V5.1 Release Candidate:'),'Historical stable release must not regress to RC release-note wording');

console.log('Stable Release history + current identity checks passed.');
console.log('- accepted V5.1 release history and C1/C2 loader wiring remain recoverable');
console.log('- current displayed identity is derived from config.js through version.js');
console.log('- consolidated late audit/polish owner retains the historical V5.4 presentation contracts');
console.log('- production migration/checklist record is retained in CHANGELOG.md');
console.log('- release presentation remains free of application data writes');
