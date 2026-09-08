const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(values => values.some(value => value !== ''));
}

function recordsFromCsv(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const headers = rows.shift();
  return {
    headers,
    records: rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
  };
}

const html = read('site/index.html');
const config = read('site/config.js');
const release = read('site/v40-release.js');
const session = read('site/v40-student-session.js');
const assignments = read('site/assignments-teacher.js');
const deadlineMonitor = read('site/assignment-deadlines.js');
const deadlineFollowUp = read('site/assignment-deadlines.js');
const progressOverview = read('site/v50-student-progress-overview.js');
const aiUi = read('site/v38-ai-help.js');
const aiEdge = read('supabase/functions/student-ai-help-v38/index.ts');
const aiCompat = read('supabase/functions/student-ai-help-v381/index.ts');

// 1) Syntax safety: compile the large inline application and every browser JS file.
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());
assert.ok(inlineScripts.length >= 1, 'No inline application script was found.');
inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `index-inline-${index + 1}.js` }));

const browserJs = fs.readdirSync(siteRoot).filter(name => name.endsWith('.js')).sort();
assert.ok(browserJs.length >= 40, 'Expected the established staged browser-module set.');
for (const name of browserJs) {
  new vm.Script(fs.readFileSync(path.join(siteRoot, name), 'utf8'), { filename: name });
}

// 2) Loader integrity: every staged local module referenced by config/release exists.
const configRefs = [...config.matchAll(/['"]\.\/([^'"]+\.js)['"]/g)].map(match => match[1]);
const releaseRefs = [...release.matchAll(/loadScriptOnce\('([^'?]+\.js)(?:\?[^']*)?'/g)].map(match => match[1]);
assert.ok(configRefs.length >= 15, 'The active V3.8–V4.0 functional loader set is incomplete.');
assert.ok(releaseRefs.length >= 25, 'The established V4.1+ loader set is incomplete.');
for (const ref of [...configRefs, ...releaseRefs]) {
  assert.ok(fs.existsSync(path.join(siteRoot, ref)), `Missing staged browser module: ${ref}`);
}
const releaseKeys = [...release.matchAll(/loadScriptOnce\([^,]+,\s*'([^']+)'\)/g)].map(match => match[1]);
assert.equal(new Set(releaseKeys).size, releaseKeys.length, 'Release loader contains duplicate data keys.');

// 2B) V5.0B4B legacy presentation cleanup: old release-label scripts stay archived but are not executed.
for (const retired of ['v38-release.js', 'v381-release.js', 'v39-release.js']) {
  assert.ok(fs.existsSync(path.join(siteRoot, retired)), `${retired} must remain recoverable in repository history/source.`);
  assert.ok(!configRefs.includes(retired), `${retired} must not be loaded by the active config bootstrap.`);
}

// 3) Final visible identity is the signed-off V5.0 Stable Release.
assert.match(config, /Math Practice V5\.0/);
assert.match(release, /Math Practice V5\.0/);
assert.match(release, /Version 5\.0 • Stable Release/);
assert.match(release, /V5\.0 Stable Release:/);
assert.doesNotMatch(release, /Version 5\.0 • Release Candidate|V5\.0 Release Candidate:/,
  'Final V5.0 must not regress to Release Candidate branding.');
assert.match(release, /v49-student-topic-progress\.js/);
assert.match(release, /v50-student-progress-overview\.js/);
assert.doesNotMatch(release, /loadScriptOnce\('v49-student-progress-snapshot\.js/, 'The superseded V4.9A panel must not be loaded after B3 consolidation.');
assert.doesNotMatch(release, /loadScriptOnce\('v49-student-next-steps\.js/, 'The superseded V4.9C panel must not be loaded after B3 consolidation.');
assert.ok(fs.existsSync(path.join(siteRoot, 'v49-student-progress-snapshot.js')), 'Archived V4.9A source must remain recoverable in the repository.');
assert.ok(fs.existsSync(path.join(siteRoot, 'v49-student-next-steps.js')), 'Archived V4.9C source must remain recoverable in the repository.');

// 4) Browser-secret boundary: only the publishable browser key belongs in site code.
for (const name of ['index.html', 'config.js', ...browserJs]) {
  const source = fs.readFileSync(path.join(siteRoot, name), 'utf8');
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}/, `${name} contains a server-side secret reference/value.`);
}
assert.match(config, /supabasePublishableKey:\s*'sb_publishable_/);

// 5) Student sign-in/session invariants: PIN is not persisted; Practice and Exam tickets stay separate.
assert.match(session, /SESSION_MAX_AGE_MS\s*=\s*8\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
assert.match(session, /sessionStorage\.setItem/);
assert.match(session, /practice:\s*practiceAccess\.access_token/);
assert.match(session, /exam:\s*examAccess\.access_token/);
assert.match(session, /requestTicket\('practice'/);
assert.match(session, /requestTicket\('exam'/);
assert.match(session, /pin\.value\s*=\s*''/);
assert.doesNotMatch(session, /sessionStorage\.setItem\([^)]*pin/i, 'Student PIN must never be written to sessionStorage.');

// 6) AI Help boundary: browser invokes the protected function; server accepts Practice modes only.
assert.match(aiUi, /cloud\.functions\.invoke\('student-ai-help-v38'/);
assert.match(aiEdge, /\["practice",\s*"recommended_practice"\]\.includes\(mode\)/);
assert.doesNotMatch(aiEdge, /\["practice",\s*"recommended_practice",\s*"exam"\]/i, 'Exam must never be an AI Help mode.');
assert.match(aiEdge, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
assert.match(aiEdge, /Deno\.env\.get\("OPENAI_API_KEY"\)/);
assert.match(aiCompat, /TARGET_FUNCTION_URL/);
assert.match(aiCompat, /Origin not allowed/);

// 7) Assignment write guard: the active teacher Assign Practice action is disabled during creation.
assert.match(assignments, /const button=document\.getElementById\('v43b-save'\)/);
assert.match(assignments, /button\.disabled=true/);
assert.match(assignments, /button\.textContent='Assigning…'/);
assert.match(assignments, /create_teacher_practice_assignments_v43b/);
assert.match(assignments, /finally\s*\{[\s\S]*?button\.disabled=false/);

// 8) V5.0B2 runtime hardening: deadline monitoring stays class-scoped and event-driven.
assert.match(deadlineMonitor, /\.eq\('class_id',cls\.id\)/, 'Deadline assignments must be scoped to the selected class.');
assert.match(deadlineMonitor, /practice_assignment_recipients'\)\.select\('\*'\)\.in\('assignment_id',assignmentIds\)/);
assert.match(deadlineMonitor, /practice_assignment_attempts'\)\.select\('\*'\)\.in\('assignment_id',assignmentIds\)/);
assert.match(deadlineMonitor, /math-practice-assignments-changed/);
assert.doesNotMatch(deadlineMonitor, /getElementById\('teacher'\)\?\.addEventListener\('click'/, 'Deadline monitoring must not refresh on every teacher click.');
assert.match(deadlineFollowUp, /dispatchEvent\(new CustomEvent\('math-practice-assignments-changed'/);
assert.doesNotMatch(deadlineFollowUp, /getElementById\('teacher'\)\?\.addEventListener\('click'/, 'Deadline follow-up decoration must not run on every teacher click.');
assert.match(release, /assignment-deadlines\.js\?v=48a-2/);
assert.match(release, /assignment-deadlines\.js\?v=48c-4/);

// 9) V5.0B3 progress consolidation: one active overview replaces duplicate V4.9A/V4.9C panels.
assert.match(progressOverview, /OVERVIEW_ID = 'v50-student-progress-overview'/);
assert.match(progressOverview, /What to work on next/);
assert.match(progressOverview, /Current focus/);
assert.match(progressOverview, /Strongest topic/);
assert.match(progressOverview, /Practice sessions/);
assert.match(progressOverview, /Topics practised/);
assert.match(progressOverview, /v50-retired-progress-source/);
assert.doesNotMatch(progressOverview, /V4\.9A|V4\.9C/, 'Internal feature labels must not reappear in the consolidated student UI.');

// 10) Student progress presentation modules must remain read-only overlays on existing secure evidence.
for (const file of [
  'site/v49-student-progress-snapshot.js',
  'site/v49-student-topic-progress.js',
  'site/v49-student-next-steps.js',
  'site/v50-student-progress-overview.js'
]) {
  const source = read(file);
  assert.doesNotMatch(source, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/, `${file} must remain presentation-only.`);
}

// 11) Question-bank/import contract remains stable.
const bank = recordsFromCsv(path.join(siteRoot, 'question-bank', 'PSR_2025_Mathematics_Paper1_Q1-Q40.csv'));
const template = recordsFromCsv(path.join(siteRoot, 'question-import-template.csv'));
assert.deepEqual(template.headers, bank.headers, 'Template and bank headers must stay aligned.');
assert.equal(bank.headers.length, 25, 'Question import schema must remain 25 columns.');
assert.equal(bank.records.length, 42, 'Multipart reference paper should remain 42 physical rows.');
const active = bank.records.filter(record => /^(true|1|yes)$/i.test(record.active));
const logicalQuestions = new Set(active.map(record => record.parent_question_number || record.question_number));
const marks = active.reduce((sum, record) => sum + Number(record.marks), 0);
assert.equal(logicalQuestions.size, 40);
assert.equal(marks, 90);
for (const record of active.filter(record => record.image_url)) {
  assert.match(record.image_url, /^images\/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i);
  assert.ok(fs.existsSync(path.join(siteRoot, ...record.image_url.split('/'))), `Missing referenced question image: ${record.image_url}`);
}

console.log('V5 regression safety verification passed.');
console.log(`- ${inlineScripts.length} inline application script block(s) compiled`);
console.log(`- ${browserJs.length} browser JS files compiled`);
console.log(`- ${configRefs.length + releaseRefs.length} staged loader references resolved`);
console.log('- V5.0 Stable Release identity is active and Release Candidate branding is rejected');
console.log('- Legacy V3.8/V3.8.1/V3.9 release-label scripts remain archived but are no longer actively loaded');
console.log('- Browser-secret, student-session and Practice/Exam boundaries verified');
console.log('- AI Help remains Practice-only at the server boundary');
console.log('- Multi-recipient assignment double-submit guard verified');
console.log('- V5.0B2 deadline reads remain selected-class scoped and event-driven');
console.log('- V5.0B3 uses one active student progress overview while archived V4.9A/V4.9C source remains recoverable');
console.log(`- ${active.length} active reference rows, ${logicalQuestions.size} logical questions, ${marks} marks`);
