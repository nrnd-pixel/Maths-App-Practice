const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const read = name => fs.readFileSync(path.join(siteRoot, name), 'utf8');
const normalize = source => String(source).replace(/\r\n/g, '\n').trimEnd();
const gitObject = objectPath => execFileSync('git', ['rev-parse', `HEAD:${objectPath}`], {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim();

const release = read('v40-release.js');
const interventions = read('assignment-interventions.js');
const queueSupport = read('assignment-intervention-queue-support.js');
const history = read('assignment-intervention-history.js');
const deadlines = read('assignment-deadlines.js');
const queue = read('v45-intervention-queue.js');

const groups = [
  {
    owner: 'assignment-interventions.js',
    source: interventions,
    retired: [
      'v44-action-center-practice.js',
      'v44-shared-focus-groups.js',
      'v44-intervention-follow-through.js',
      'v44-intervention-highlight-clarity.js',
    ],
  },
  {
    owner: 'assignment-intervention-queue-support.js',
    source: queueSupport,
    retired: [
      'v45-intervention-outcomes.js',
      'v46-intervention-export.js',
    ],
  },
  {
    owner: 'assignment-intervention-history.js',
    source: history,
    retired: [
      'v47-intervention-history.js',
      'v47-follow-up-from-history.js',
      'v47-class-intervention-overview.js',
    ],
  },
  {
    owner: 'assignment-deadlines.js',
    source: deadlines,
    retired: [
      'v48-teacher-deadline-monitoring.js',
      'v48-student-deadline-experience.js',
      'v48-deadline-follow-up.js',
    ],
  },
];

// 1) The four owners must be strict source-preserving concatenations of the
// historical runtime files. Compare the exact raw source join so pre-existing
// trailing-newline differences in dormant files cannot be mistaken for code drift.
for (const group of groups) {
  const expected = group.retired.map(name => read(name)).join('\n\n');
  assert.equal(
    normalize(group.source),
    normalize(expected),
    `${group.owner} must remain source-equivalent to ${group.retired.join(' -> ')}`,
  );
}

// 2) The loader must retire all twelve historical files while retaining the
// exact phase boundary around the untouched V45A queue.
const retiredNames = groups.flatMap(group => group.retired);
for (const name of retiredNames) {
  assert.equal(release.includes(name), false, `${name} must be dormant, not staged`);
}

const loaderChain = [
  'assignments-teacher.js',
  'assignment-interventions.js',
  'v45-intervention-queue.js?v=45a-1',
  'assignment-intervention-queue-support.js',
  'assignment-intervention-history.js',
  'assignment-deadlines.js',
  'v49-student-topic-progress.js',
];
let previous = -1;
for (const token of loaderChain) {
  const index = release.indexOf(token);
  assert.ok(index >= 0, `Release loader must stage ${token}`);
  assert.ok(index > previous, `${token} must remain after its previous phase dependency`);
  previous = index;
}
assert.equal((release.match(/v45-intervention-queue\.js\?v=45a-1/g) || []).length, 1,
  'Untouched V45A must remain staged exactly once.');

// 3) Checkpoint 1 remains the compatibility boundary. Consumers still target
// the exact V43B DOM rather than acquiring assignment-render ownership.
for (const token of [
  '#v43b-practice-assignment-admin',
  '#v43b-student-options',
  '#v43b-strand',
  '#v43b-topic',
  '#v43b-count',
  '.v43b-card',
  '.v43b-toggle[data-id]',
]) {
  assert.ok(
    interventions.includes(token) || history.includes(token) || deadlines.includes(token),
    `Consolidated consumers must retain V43B contract token ${token}`,
  );
}
for (const source of [interventions, queueSupport, history, deadlines]) {
  assert.doesNotMatch(source, /renderClassAdmin\s*=\s*(?:wrapped|function|async)/,
    'Checkpoint 2 must not take ownership of renderClassAdmin.');
  assert.doesNotMatch(source, /(?:startPractice|nextQuestion|finishPractice)\s*=\s*(?:wrapped|function|async)/,
    'Checkpoint 2 must not take ownership of the Practice lifecycle.');
}

// 4) V44 keeps deliberate prefill/review semantics and exact assignment-card lookup.
for (const token of ['#v43b-student-options', '#v43b-strand', '#v43b-topic', '#v43b-count']) {
  assert.ok(interventions.includes(token), `V44 owner must retain ${token}`);
}
assert.match(interventions, /Assign Practice/);
assert.match(interventions, /Review Practice/);
assert.match(interventions, /\.v43b-toggle\[data-id\]/);
assert.match(interventions, /closest\('\.v43b-card'\)/);
assert.match(interventions, /v44c-highlight-strong/);
assert.doesNotMatch(interventions, /create_teacher_practice_assignments_v43b|cloud\.rpc\(|\.insert\(|\.update\(|\.delete\(/,
  'V44 intervention owner must remain prefill/read-only and never auto-create assignments.');

// 5) V45A remains external and provides the queue/filter contract consumed by V45B/V46.
for (const token of [
  'v45-intervention-queue-tools',
  'v45-queue-summary',
  'v45-queue-filter',
  'v45-queue-expand',
  'needs-assignment',
  'outstanding',
  'completed',
]) {
  assert.ok(queue.includes(token), `Protected V45A must retain ${token}`);
}

// 6) V45B/V46 remain observation/export only. Recorded Practice result fields are
// displayed/exported directly; no improvement score or database mutation is introduced.
for (const token of [
  'Completed Practice outcome:',
  'mastery_percent',
  'first_try_percent',
  'hints_used',
  'practice_session_id',
  'v45bOutcomeSession',
  'v45-intervention-queue-tools',
  'v45-queue-filter[aria-pressed="true"]',
  'Export queue CSV',
  'outcome_mastery_percent',
]) {
  assert.ok(queueSupport.includes(token), `Queue support must retain ${token}`);
}
assert.doesNotMatch(queueSupport, /improvement_(?:score|percent)|invented_(?:score|improvement)/i,
  'V45B must not introduce an invented improvement metric.');
assert.doesNotMatch(queueSupport, /create_teacher_practice_assignments|cloud\.rpc\(|\.insert\(|\.update\(|\.delete\(/,
  'V45B/V46 must remain read/export-only with no assignment or analytics mutation.');
const exportStart = queueSupport.indexOf('/* V4.6A — Intervention Queue Export.');
assert.ok(exportStart >= 0, 'V46 source boundary must remain present.');
const exportSource = queueSupport.slice(exportStart);
assert.doesNotMatch(exportSource, /cloud\.(?:from|rpc|functions)|practice_assignments|analyticsContext\s*=/,
  'V46 export must not perform assignment reads/writes or mutate Analytics state.');

// 7) V47 retains history, result navigation, V43B review and deliberate Assign-again prefill.
for (const token of [
  'Practice intervention history',
  'Open Results',
  'Assign again',
  '#v43b-student-options',
  '#v43b-strand',
  '#v43b-topic',
  '#v43b-count',
  '.v43b-toggle[data-id]',
  'Class intervention overview',
  'No new mastery or intervention threshold is applied',
]) {
  assert.ok(history.includes(token), `V47 owner must retain ${token}`);
}
assert.doesNotMatch(history, /create_teacher_practice_assignments_v43b|\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'V47 history/follow-up must remain read-only except deliberate builder prefill.');

// 8) V48 retains teacher monitoring, student card decoration, and the narrow target-date write/event chain.
for (const token of [
  'v48a-deadline-monitoring',
  'DUE_SOON_MS = 48 * 60 * 60 * 1000',
  '#v43b-list',
  '.v43b-toggle[data-id=',
  'v42b-student-practice-assignments',
  'math-practice-assignments-changed',
  'closes_at:value',
  'updated_at:new Date().toISOString()',
  'Target only — access stays open',
]) {
  assert.ok(deadlines.includes(token), `V48 owner must retain ${token}`);
}
assert.match(deadlines, /cloud\.from\('practice_assignments'\)[\s\S]*?\.update\(payload\)/);
const deadlineFollowUpStart = deadlines.indexOf('/* V4.8C — Practice Deadline Follow-Up.');
assert.ok(deadlineFollowUpStart >= 0, 'V48C deadline follow-up source boundary must remain present.');
const deadlineFollowUp = deadlines.slice(deadlineFollowUpStart);
assert.doesNotMatch(deadlineFollowUp, /practice_assignment_attempts|practice_sessions/,
  'Deadline target editing must not alter attempts or Practice results.');
assert.doesNotMatch(deadlineFollowUp, /payload\s*=\s*\{[^}]*\bactive\s*:/s,
  'Deadline target payload must not alter assignment active/access state.');

// 9) Protected checkpoint boundaries must be byte-identical to the approved main baseline.
const protectedBlobs = {
  'site/assignments-core.js': '39e47ff10dd1efdc704a572aea4376e313a9b727',
  'site/assignments-student.js': '5b5bf1604120df9a8aa037db6c8fa8ab4d0970d2',
  'site/assignments-teacher.js': '872b3d4f149a96b896bbdf586cabc46ee2765afe',
  'site/v45-intervention-queue.js': '8600da5af28f77bd6f1d7bea72ba6fb7be4bef7a',
  'site/v53a-practice-eligibility.js': 'a7a940b9ee080b8fa6a5ed518b0b060f6ba504ca',
  'site/v53b-unified-practice-retrieval.js': 'b427513531fce17b8de348ef3251c9d1614d9ca2',
  'site/v53c-two-mode-student-ui.js': '05257bf18a97873f3b76e11f44da2127e3f02898',
  'site/v53d3-practice-selection-quality.js': '5a59a347dd966c3cbc2317aa14c08021647f20e5',
  'site/v53d4-student-recommendation-alignment.js': '6c6d21102f0ddae7b28d4624a56e419371a7cc22',
  'site/v53d5-practice-selection-intelligence.js': '595735f995318c97e783680dda58ea5c22609c27',
  'site/past-paper-core.js': '8b007f6cae55dbcb32267c97bfbc4b25e4654fe0',
  'site/past-paper-resume.js': '844cf3f514c75736079278ead84d402f39be09d1',
  'site/past-paper-results.js': 'ab2a4edc98d042bd6344cbd7ab81fc2175292b81',
  'site/past-paper-assignments.js': 'e67d9018a1ebf42e3ff104ef1cabf6d92c8474fd',
  'site/past-paper-progress.js': '46080d3b78e39fc205d2ef3f7a9fd602e363f8f8',
  'site/past-paper-analytics.js': 'db017e8a8fcf45afa3f1530e6f548a29153f509e',
  'site/past-paper-cross-device.js': 'cc975d4188f465be9464dd6de7b1d8b8a08ff868',
  'site/past-paper-analytics-actions.js': '7d1a39376a48fa8c42dc0ce26b3dfd33163e274e',
  'site/v57b-teacher-assignment-management.js': '17c2f49ca21205710a606e867b6235dcc71dfc35',
  'site/v57c-student-continue-learning-home.js': 'b3daeac60970302bc6bb59e654f9ec8c484096a0',
  'site/gamification-core.js': '87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/gamification-student.js': '4847c0be7c635d46bb1e458a81510d37f1079851',
  'site/gamification-teacher.js': '04b93c670575acbf53e023b4f53edde9171ed034',
  'site/v581a-practice-cloud-result-reconciliation.js': '09f167eab59737a393113ec3059724b8931155d3',
  'site/v58a-student-first-use-experience.js': '610dc830c89d44959e5ea893b79b8424283077be',
  'site/v58b-teacher-workspace-consolidation.js': '661c54ddc1f5cf45252f14b0dadf8600c1243ab2',
  'site/v58c-parent-friendly-student-report.js': 'ab1ec58ff7cae1d886879002e4983179d7280145',
  'site/v58c-parent-summary-workspace-shortcut.js': 'a6bbf05422d414d94fa7e6164f1d302e27feda51',
  'site/v58d-content-workflow-consolidation.js': '7905fce53236305d946315cae260c4b1bf212be6',
  'site/v58-stable-release-checkpoint.js': '7afdfa50363672f7dd35d67473bcec8485944fdd',
};
for (const [file, expected] of Object.entries(protectedBlobs)) {
  assert.equal(gitObject(file), expected, `${file} must remain byte-identical to the approved main baseline`);
}
assert.equal(gitObject('supabase'), '19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456',
  'The complete Supabase tree, including every SQL migration, must remain byte-identical to main.');

console.log('Phase 4 teacher assignments checkpoint 2 integrity passed.');
console.log('- four phase-preserving owners are strict source-equivalent consolidations of 12 dormant files');
console.log('- loader order remains V44 -> external V45A -> V45B/V46 -> V47 -> V48');
console.log('- V43B DOM compatibility, intervention outcome/export read-only rules and deadline event/write boundaries are preserved');
console.log(`- ${Object.keys(protectedBlobs).length} protected browser files plus the complete Supabase tree match approved main blob/tree SHAs`);
