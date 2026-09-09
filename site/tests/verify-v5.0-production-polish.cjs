const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const config = read('site/config.js');
const release = read('site/v40-release.js');
const versionSource = read('site/version.js');
const auditOwner = read('site/release-audit-ui.js');

function section(source,start,next){
  const begin=source.indexOf(start);
  assert.ok(begin>=0,`Missing consolidated section: ${start}`);
  const end=next ? source.indexOf(next,begin+start.length) : source.length;
  assert.ok(end>begin,`Missing consolidated section boundary after: ${start}`);
  return source.slice(begin,end).trimEnd();
}
const polish=section(auditOwner,'/* V5.4 — UX & Production Polish.','/* V5.0 Release Candidate Audit');
const auditRc3=section(auditOwner,'/* V5.4 — extends the existing read-only Release Audit');

new vm.Script(versionSource,{filename:'version.js'});
new vm.Script(auditOwner,{filename:'release-audit-ui.js'});

// Current visible identity is centralized rather than owned by the historical polish layer.
assert.match(config,/const MATH_APP_STAGED_SCRIPTS = Object\.freeze\(\[/);
assert.match(versionSource,/const CURRENT_RELEASE = buildRelease\(deriveCurrentVersion\(stagedScripts\)\)/);
assert.match(release,/MathAppVersion\?\.applyIdentity/);
assert.match(polish,/MathAppVersion\?\.CURRENT_RELEASE/);
assert.match(polish,/MathAppVersion\?\.applyIdentity/);
assert.match(polish,/stable_release_branding/);

// Loader order keeps frozen RC2 security first, then the consolidated late audit/polish owner.
assert.match(release,/v50-security-hardening\.js\?v=50rc2-1[\s\S]*release-audit-ui\.js/);
assert.match(release,/data-v50-security-hardening/);
assert.match(release,/data-release-audit-ui/);

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
assert.match(auditRc3,/Stable-release identity/);
assert.match(auditRc3,/RC3 — UX & production polish/);
assert.match(auditRc3,/Production-polish checks passed/);
assert.doesNotMatch(auditRc3,/cloud\.rpc\(|cloud\.from\(|fetch\(/);
assert.doesNotMatch(auditRc3,/localStorage|sessionStorage/);
assert.doesNotMatch(auditRc3,/reset_student_launch_activity|generate_missing_student_pins|set_student_pin|manage_teacher_assignment|transfer_roster_student/);

console.log('Historical V5.0 production-polish contract verification passed against the active consolidated owner.');
console.log('- current identity remains centralized through version.js');
console.log('- packaged production/local setup behavior is preserved');
console.log('- Teacher tabs, status feedback and privacy wording remain protected');
console.log('- stable audit presentation remains read-only');
