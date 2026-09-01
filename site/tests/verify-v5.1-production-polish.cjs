const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const config = read('site/config.js');
const release = read('site/v40-release.js');
const polish = read('site/v50-production-polish.js');
const auditRc3 = read('site/v50-release-audit-rc3.js');
const checkpoint = read('site/v54-stable-release-checkpoint.js');

new vm.Script(polish,{filename:'v50-production-polish.js'});
new vm.Script(auditRc3,{filename:'v50-release-audit-rc3.js'});
new vm.Script(checkpoint,{filename:'v54-stable-release-checkpoint.js'});

// Historical V5.1 bootstrap/release presenter remains recoverable, while the signed-off
// production-polish layer and final checkpoint expose the current V5.4 stable identity.
assert.match(config,/document\.title = 'Math Practice V5\.1'/);
assert.match(release,/document\.title = 'Math Practice V5\.1'/);
assert.match(release,/Version 5\.1 • Stable Release/);
assert.match(release,/V5\.1 Stable Release:/);
assert.doesNotMatch(release,/Version 5\.1 • Release Candidate|V5\.1 Release Candidate:/);
assert.match(polish,/const TITLE = 'Math Practice V5\.4'/);
assert.match(polish,/const BADGE = 'Version 5\.4 • Stable Release'/);
assert.match(polish,/phase:'V5\.4Stable'/);
assert.match(polish,/stable_release_branding/);
assert.match(checkpoint,/const TITLE = 'Math Practice V5\.4'/);
assert.match(checkpoint,/const BADGE = 'Version 5\.4 • Stable Release'/);
assert.match(checkpoint,/V5\.4 Stable Release:/);

// Loader order keeps RC2 security first, then production polish and the read-only audit extension.
assert.match(release,/v50-security-hardening\.js\?v=50rc2-1[\s\S]*v50-production-polish\.js\?v=51stable-1[\s\S]*v50-release-audit\.js\?v=50rc2-1[\s\S]*v50-release-audit-rc3\.js\?v=51stable-1/);
assert.match(release,/data-v50-production-polish/);
assert.match(release,/data-v50-release-audit-rc3/);
assert.match(config,/\.\/v40-start-shell\.js'[\s\S]*\.\/v54-stable-release-checkpoint\.js'/,
  'V5.4 stable checkpoint must load after the established start shell.');

// Production polish remains presentation/accessibility only.
assert.doesNotMatch(polish,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/,
  'Production polish must not make network/data calls.');
assert.doesNotMatch(polish,/localStorage|sessionStorage/,
  'Production polish must not persist application state.');
assert.doesNotMatch(polish,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt/i,
  'Production polish must not touch grading or submission logic.');
assert.doesNotMatch(polish,/SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/);

// Production setup control is hidden only when packaged config + deployed HTTPS are present.
assert.match(polish,/function hasPackagedCloudConfig\(\)/);
assert.match(polish,/function isDeployedHost\(\)/);
assert.match(polish,/if \(packagedProduction\(\)\)[\s\S]*button\.classList\.add\('hidden'\)/);
assert.match(polish,/button\.setAttribute\('aria-hidden','true'\)/);
assert.match(polish,/button\.textContent = 'Connection Setup'/,
  'Local/dev setup access must remain available.');

// Reviewed Work/result-code copy treats Practice and Exam consistently and privately.
assert.match(polish,/Practice or Exam work/);
assert.match(polish,/Treat this code as private\. Anyone with the code can view this Practice result/);
assert.match(polish,/Treat this code as private\. Anyone with the code can view this Exam result/);
assert.match(polish,/Analytics, assignments, reports and question management/);

// Teacher Dashboard tab accessibility + narrow-screen overflow are explicitly protected.
assert.match(polish,/setAttribute\('role','tablist'\)/);
assert.match(polish,/setAttribute\('role','tab'\)/);
assert.match(polish,/setAttribute\('aria-selected'/);
assert.match(polish,/setAttribute\('aria-controls'/);
assert.match(polish,/setAttribute\('role','tabpanel'\)/);
assert.match(polish,/ArrowRight/);
assert.match(polish,/ArrowLeft/);
assert.match(polish,/event\.key === 'Home'/);
assert.match(polish,/event\.key === 'End'/);
assert.match(polish,/@media\(max-width:900px\)[\s\S]*#teacher > \.tabs[\s\S]*overflow-x:auto/);
assert.match(polish,/scrollIntoView\(\{block:'nearest',inline:'nearest'\}\)/);

// Loading/save/access feedback is exposed as polite status output.
assert.match(polish,/cloud-status','student-access-note','exam-save-status','mode-note/);
assert.match(polish,/setAttribute\('aria-live','polite'\)/);
assert.match(polish,/querySelectorAll\('\.feedback'\)/);

// Stable audit presentation consumes only the local polish API and remains read-only.
assert.match(polish,/Object\.defineProperty\(window,'V50ProductionPolish'/);
assert.match(polish,/getAudit/);
assert.match(auditRc3,/V50ProductionPolish\?\.getAudit/);
assert.match(auditRc3,/V5\.4 Release Audit/);
assert.match(auditRc3,/stable V5\.4 baseline/);
assert.match(auditRc3,/Visible shell uses the signed-off V5\.4 Stable Release identity/);
assert.match(auditRc3,/V5\.4 production-polish checks pass/);
assert.match(auditRc3,/Stable-release identity/);
assert.match(auditRc3,/RC3 — UX & production polish/);
assert.match(auditRc3,/Production-polish checks passed/);
assert.doesNotMatch(auditRc3,/cloud\.rpc\(|cloud\.from\(|fetch\(/);
assert.doesNotMatch(auditRc3,/localStorage|sessionStorage/);
assert.doesNotMatch(auditRc3,/reset_student_launch_activity|generate_missing_student_pins|set_student_pin|manage_teacher_assignment|transfer_roster_student/);

// V5.4 checkpoint remains presentation-only and reuses the audited production-polish API.
assert.match(checkpoint,/V50ProductionPolish\?\.refresh/);
assert.doesNotMatch(checkpoint,/cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(|fetch\(/);
assert.doesNotMatch(checkpoint,/localStorage|sessionStorage/);
assert.doesNotMatch(checkpoint,/grade_practice_response|request_practice_hint|finalize_exam_attempt|submit_practice_session|save_exam_attempt/i);

console.log('Stable UX & production-polish verification passed.');
console.log('- historical V5.1 bootstrap remains recoverable while V5.4 Stable Release is the final production identity');
console.log('- packaged production hides the connection editor while local/dev setup remains available');
console.log('- Reviewed Work and result-code privacy language covers both Practice and Exam');
console.log('- Teacher tabs have keyboard semantics and narrow-screen horizontal navigation');
console.log('- status feedback is announced accessibly and the V5.4 stable audit presentation remains read-only');
