const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(siteRoot, name), 'utf8');

const release = read('v40-release.js');
const workspace = read('v58b-teacher-workspace-consolidation.js');
const actionCenter = read('v42-teacher-action-center.js');
const interventions = read('assignment-interventions.js');
const queue = read('v45-intervention-queue.js');
const queueSupport = read('assignment-intervention-queue-support.js');
const historyRuntime = read('assignment-intervention-history.js');
const deadlinesRuntime = read('assignment-deadlines.js');
const topicProgress = read('v49-student-topic-progress.js');

// 1) The established intervention chain must remain loaded in phase order.
const chain = [
  'v42-teacher-action-center.js',
  'assignment-interventions.js',
  'v45-intervention-queue.js',
  'assignment-intervention-queue-support.js',
  'assignment-intervention-history.js',
  'assignment-deadlines.js',
  'v49-student-topic-progress.js'
];
let previous = -1;
for (const file of chain) {
  const index = release.indexOf(file);
  assert.ok(index >= 0, `Release loader must keep ${file}`);
  assert.ok(index > previous, `${file} must stay after its earlier intervention dependencies`);
  previous = index;
}

// 2) V5.8 Teacher Workspace must continue to expose the existing Action Center,
// rather than creating a second intervention system.
assert.match(workspace, /label:'Action Center'/);
assert.match(workspace, /anchor:'\.v42-action-center'/);
assert.match(workspace, /panel:'analytics-panel'/);

// 3) Priority identification stays based on the existing Analytics learning bands.
assert.match(actionCenter, /item\.band\?\.key === 'needs-attention'/);
assert.match(actionCenter, /item\.band\?\.key === 'developing'/);
assert.match(actionCenter, /function priorityLearners\(/);
assert.match(actionCenter, /function noActivityLearners\(/);
assert.doesNotMatch(actionCenter, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Action Center must remain presentation-only over already-loaded Analytics data.');

// 4) V44 preparation remains deliberate: prefill V43B but never create directly.
assert.match(interventions, /Assign Practice/);
assert.match(interventions, /#v43b-student-options/);
assert.match(interventions, /#v43b-strand/);
assert.match(interventions, /#v43b-topic/);
assert.match(interventions, /#v43b-count/);
assert.match(interventions, /group\.learners\.length >= 2/);
assert.match(interventions, /String\(cls\.id\),lower\(strand\),lower\(topic\)/);
assert.doesNotMatch(interventions, /create_teacher_practice_assignments_v43b|cloud\.rpc\(|\.insert\(|\.update\(|\.delete\(/,
  'V44 intervention bridges must remain prefill/read-only and must not create assignments themselves.');

// 5) Follow-through must detect existing work and suppress duplicate prompting.
assert.match(interventions, /Practice: \$\{item\.status\.label\}/);
assert.match(interventions, /assignButton\.classList\.add\('hidden'\)/);
assert.match(interventions, /Review Practice/);
assert.match(interventions, /\.v43b-toggle\[data-id\]/);
assert.match(interventions, /v44c-highlight-strong/);

// 6) External V45A queue states remain a workflow view of V44 status.
for (const state of ['needs-assignment', 'outstanding', 'completed']) {
  assert.ok(queue.includes(state), `Intervention queue must retain ${state} state`);
}
assert.doesNotMatch(queue, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Intervention queue must remain presentation-only.');

// 7) V45B completed outcomes and V46 export remain read-only over recorded evidence.
assert.match(queueSupport, /Completed Practice outcome:/);
assert.match(queueSupport, /Outcome: \$\{mastery\}% mastery/);
assert.match(queueSupport, /practice_session_id/);
assert.match(queueSupport, /v45bOutcomeSession/);
assert.match(queueSupport, /Export queue CSV/);
assert.match(queueSupport, /v45-queue-filter\[aria-pressed="true"\]/);
assert.doesNotMatch(queueSupport, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Completed outcomes/export must remain read-only and must not mutate assignment or analytics data.');

// 8) V47 history and follow-up reuse existing assignment/result records and builder.
assert.match(historyRuntime, /Practice intervention history/);
assert.match(historyRuntime, /practice_assignments/);
assert.match(historyRuntime, /practice_assignment_attempts/);
assert.match(historyRuntime, /Assign again/);
assert.match(historyRuntime, /#v43b-student-options/);
assert.match(historyRuntime, /This creates a new assignment only after you review the settings and click Assign Practice/);
assert.match(historyRuntime, /Class intervention overview/);
assert.match(historyRuntime, /No new mastery or intervention threshold is applied/);
assert.doesNotMatch(historyRuntime, /create_teacher_practice_assignments_v43b|\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'V47 history/follow-up must remain read-only except deliberate V43B prefill.');

// 9) Deadline monitoring stays guidance-only. V48C writes only target-date metadata
// and emits the established assignment-changed event.
assert.match(deadlinesRuntime, /Target dates remain guidance only and do not block access/);
assert.match(deadlinesRuntime, /\.eq\('class_id',cls\.id\)/);
assert.match(deadlinesRuntime, /DUE_SOON_MS = 48 \* 60 \* 60 \* 1000/);
assert.match(deadlinesRuntime, /closes_at:value/);
assert.match(deadlinesRuntime, /cloud\.from\('practice_assignments'\)[\s\S]*?\.update\(payload\)/);
assert.match(deadlinesRuntime, /math-practice-assignments-changed/);
assert.match(deadlinesRuntime, /Target only — access stays open/);
assert.doesNotMatch(deadlinesRuntime, /practice_assignment_attempts[\s\S]*?\.update\(|practice_sessions[\s\S]*?\.update\(/,
  'Deadline target editing must not alter attempts or Practice results.');

// 10) Student topic progress remains a read-only drill-down over secure My Progress.
assert.match(topicProgress, /Read-only drill-down/);
assert.match(topicProgress, /View topic progress/);
assert.match(topicProgress, /Current mastery/);
assert.match(topicProgress, /Existing improvement milestone/);
assert.doesNotMatch(topicProgress, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Student topic progress must not create a second progress data path.');

// Phase 4 checkpoint guards run through this maintained CI verifier.
require('./verify-phase4-teacher-assignments-checkpoint2-integrity.cjs');
require('./verify-phase4-teacher-assignments-checkpoint2-dormant-reference-integrity.cjs');

console.log('V5.8 intervention workflow regression passed.');
console.log(`- ${chain.length} phase-preserving intervention owners/dependencies retained in loader order`);
console.log('- Action Center remains the single teacher entry point from V5.8 Teacher Workspace');
console.log('- V44/V47 assignment actions remain prefill-only; V45B/V46 remain read/export-only');
console.log('- Deadline editing remains limited to assignment target dates');
console.log('- Student topic progress remains presentation-only over existing secure evidence');
