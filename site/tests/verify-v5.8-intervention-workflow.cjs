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
const deadlineRuntime = read('assignment-deadlines.js');
const topicProgress = read('v49-student-topic-progress.js');

// Source owners remain phase-preserving after Phase 4 consolidation.
const singleAssign = interventions;
const groupAssign = interventions;
const followThrough = interventions;
const outcomes = queueSupport;
const history = historyRuntime;
const followUp = historyRuntime;
const classOverview = historyRuntime;
const deadlines = deadlineRuntime;
const deadlineFollowUp = deadlineRuntime;

// 1) The established intervention phases must remain loaded in dependency order.
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

// 4) Targeted Practice preparation must remain deliberate: prefill the established
// V4.3 builder but never create an assignment directly from Action Center code.
assert.match(singleAssign, /Assign Practice/);
assert.match(singleAssign, /#v43b-student-options/);
assert.match(singleAssign, /#v43b-strand/);
assert.match(singleAssign, /#v43b-topic/);
assert.match(singleAssign, /#v43b-count/);
const v44a = interventions.slice(0, interventions.indexOf('/* Phase 4 checkpoint 2 boundary: V44B */'));
assert.doesNotMatch(v44a, /create_teacher_practice_assignments_v43b|cloud\.rpc\(|cloud\.from\(/,
  'Single-learner intervention bridge must not own assignment creation or database access.');

assert.match(groupAssign, /group\.learners\.length >= 2/);
assert.match(groupAssign, /String\(cls\.id\),lower\(strand\),lower\(topic\)/);
assert.match(groupAssign, /#v43b-student-options/);
const v44bStart = interventions.indexOf('/* Phase 4 checkpoint 2 boundary: V44B */');
const v44cStart = interventions.indexOf('/* Phase 4 checkpoint 2 boundary: V44C */');
const v44b = interventions.slice(v44bStart, v44cStart);
assert.doesNotMatch(v44b, /create_teacher_practice_assignments_v43b|cloud\.rpc\(|cloud\.from\(/,
  'Shared-focus grouping must prefill only and must not create assignments itself.');

// 5) Follow-through must detect matching existing work and suppress duplicate-assignment
// prompting while an intervention is outstanding.
assert.match(followThrough, /Practice: \$\{item\.status\.label\}/);
assert.match(followThrough, /assignButton\.classList\.add\('hidden'\)/);
assert.match(followThrough, /Review Practice/);
const clarityStart = interventions.indexOf('/* Phase 4 checkpoint 2 boundary: V44C clarity */');
const v44c = interventions.slice(v44cStart, clarityStart);
assert.doesNotMatch(v44c, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Intervention follow-through must remain read-only.');

// 6) Queue states remain a workflow view of already-rendered intervention status.
for (const state of ['needs-assignment', 'outstanding', 'completed']) {
  assert.ok(queue.includes(state), `Intervention queue must retain ${state} state`);
}
assert.doesNotMatch(queue, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Intervention queue must remain presentation-only.');

// 7) Completed outcomes must report the recorded Practice result, not invent a new
// improvement score or write learning data.
const v46Marker = queueSupport.indexOf('/* Phase 4 checkpoint 2 boundary: V46A */');
const v45b = queueSupport.slice(0, v46Marker);
assert.match(v45b, /Completed Practice outcome:/);
assert.match(v45b, /Outcome: \$\{mastery\}% mastery/);
assert.match(v45b, /practice_session_id/);
assert.doesNotMatch(v45b, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Completed intervention outcomes must remain read-only.');

// V46 remains a read-only CSV projection of the existing queue/outcome decorations.
const v46 = queueSupport.slice(v46Marker);
assert.match(v46, /Export queue CSV/);
assert.match(v46, /v45bOutcomeSession/);
assert.match(v46, /v45-intervention-queue-tools/);
assert.doesNotMatch(v46, /cloud\.rpc\(|cloud\.from\(|\.insert\(|\.update\(|\.delete\(/,
  'Intervention export must not mutate assignment or analytics data.');

// 8) Learner history and follow-up must reuse the existing assignment/result records.
assert.match(history, /Practice intervention history/);
assert.match(history, /practice_assignments/);
assert.match(history, /practice_assignment_attempts/);
const v47bMarker = historyRuntime.indexOf('/* Phase 4 checkpoint 2 boundary: V47B */');
const v47cMarker = historyRuntime.indexOf('/* Phase 4 checkpoint 2 boundary: V47C */');
const v47a = historyRuntime.slice(0, v47bMarker);
const v47b = historyRuntime.slice(v47bMarker, v47cMarker);
const v47c = historyRuntime.slice(v47cMarker);
assert.doesNotMatch(v47a, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Intervention history must remain read-only.');

assert.match(followUp, /Assign again/);
assert.match(followUp, /#v43b-student-options/);
assert.match(followUp, /This creates a new assignment only after you review the settings and click Assign Practice/);
assert.doesNotMatch(v47b, /create_teacher_practice_assignments_v43b|\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'History follow-up must only prefill the established assignment builder.');

// 9) Class overview must summarize the same queue states and introduce no new thresholds.
assert.match(classOverview, /Class intervention overview/);
assert.match(classOverview, /Counts follow the current Analytics filters/);
assert.match(classOverview, /No new mastery or intervention threshold is applied/);
assert.doesNotMatch(v47c, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Class intervention overview must stay read-only over the existing queue.');

// 10) Deadline monitoring stays guidance-only. The follow-up write is restricted to the
// existing assignment target date and emits the established assignment-changed event.
const v48bMarker = deadlineRuntime.indexOf('/* Phase 4 checkpoint 2 boundary: V48B */');
const v48cMarker = deadlineRuntime.indexOf('/* Phase 4 checkpoint 2 boundary: V48C */');
const v48a = deadlineRuntime.slice(0, v48bMarker);
const v48c = deadlineRuntime.slice(v48cMarker);
assert.match(deadlines, /Target dates remain guidance only and do not block access/);
assert.match(v48a, /\.eq\('class_id',cls\.id\)/);
assert.match(v48a, /DUE_SOON_MS = 48 \* 60 \* 60 \* 1000/);
assert.doesNotMatch(v48a, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Deadline monitor itself must remain read-only.');

assert.match(deadlineFollowUp, /closes_at:value/);
assert.match(v48c, /cloud\.from\('practice_assignments'\)[\s\S]*?\.update\(payload\)/);
assert.match(v48c, /math-practice-assignments-changed/);
assert.match(v48c, /Target only — access stays open/);
assert.doesNotMatch(v48c, /practice_assignment_attempts[\s\S]*?\.update\(|practice_sessions[\s\S]*?\.update\(/,
  'Deadline target editing must not alter attempts or Practice results.');

// 11) Student topic progress remains a read-only drill-down over the secure My Progress UI.
assert.match(topicProgress, /Read-only drill-down/);
assert.match(topicProgress, /View topic progress/);
assert.match(topicProgress, /Current mastery/);
assert.match(topicProgress, /Existing improvement milestone/);
assert.doesNotMatch(topicProgress, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Student topic progress must not create a second progress data path.');

// Phase 4 checkpoint 2 guards are part of this maintained regression gate.
require('./verify-phase4-teacher-assignments-v44-v48-checkpoint2-integrity.cjs');
require('./verify-phase4-teacher-assignments-v44-v48-dormant-reference-integrity.cjs');

console.log('V5.8 intervention workflow regression passed.');
console.log(`- ${chain.length} phase-preserving intervention owners retained in loader order`);
console.log('- Action Center remains the single teacher entry point from V5.8 Teacher Workspace');
console.log('- Individual/shared-focus assignment actions remain prefill-only');
console.log('- Outstanding/completed intervention states, outcomes, export and history remain read-only views');
console.log('- Deadline editing remains limited to assignment target dates');
console.log('- Student topic progress remains presentation-only over existing secure evidence');
