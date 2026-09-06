const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(siteRoot, name), 'utf8');

const release = read('v40-release.js');
const workspace = read('v58b-teacher-workspace-consolidation.js');
const actionCenter = read('v42-teacher-action-center.js');
const singleAssign = read('v44-action-center-practice.js');
const groupAssign = read('v44-shared-focus-groups.js');
const followThrough = read('v44-intervention-follow-through.js');
const queue = read('v45-intervention-queue.js');
const outcomes = read('v45-intervention-outcomes.js');
const history = read('v47-intervention-history.js');
const followUp = read('v47-follow-up-from-history.js');
const classOverview = read('v47-class-intervention-overview.js');
const deadlines = read('v48-teacher-deadline-monitoring.js');
const deadlineFollowUp = read('v48-deadline-follow-up.js');
const topicProgress = read('v49-student-topic-progress.js');

// 1) The established intervention chain must remain loaded in dependency order.
const chain = [
  'v42-teacher-action-center.js',
  'v44-action-center-practice.js',
  'v44-shared-focus-groups.js',
  'v44-intervention-follow-through.js',
  'v45-intervention-queue.js',
  'v45-intervention-outcomes.js',
  'v47-intervention-history.js',
  'v47-follow-up-from-history.js',
  'v47-class-intervention-overview.js',
  'v48-teacher-deadline-monitoring.js',
  'v48-deadline-follow-up.js',
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
assert.doesNotMatch(singleAssign, /create_teacher_practice_assignments_v43b|cloud\.rpc\(|cloud\.from\(/,
  'Single-learner intervention bridge must not own assignment creation or database access.');

assert.match(groupAssign, /group\.learners\.length >= 2/);
assert.match(groupAssign, /String\(cls\.id\),lower\(strand\),lower\(topic\)/);
assert.match(groupAssign, /#v43b-student-options/);
assert.doesNotMatch(groupAssign, /create_teacher_practice_assignments_v43b|cloud\.rpc\(|cloud\.from\(/,
  'Shared-focus grouping must prefill only and must not create assignments itself.');

// 5) Follow-through must detect matching existing work and suppress duplicate-assignment
// prompting while an intervention is outstanding.
assert.match(followThrough, /Practice: \$\{item\.status\.label\}/);
assert.match(followThrough, /assignButton\.classList\.add\('hidden'\)/);
assert.match(followThrough, /Review Practice/);
assert.doesNotMatch(followThrough, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Intervention follow-through must remain read-only.');

// 6) Queue states remain a workflow view of already-rendered intervention status.
for (const state of ['needs-assignment', 'outstanding', 'completed']) {
  assert.ok(queue.includes(state), `Intervention queue must retain ${state} state`);
}
assert.doesNotMatch(queue, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Intervention queue must remain presentation-only.');

// 7) Completed outcomes must report the recorded Practice result, not invent a new
// improvement score or write learning data.
assert.match(outcomes, /Completed Practice outcome:/);
assert.match(outcomes, /Outcome: \$\{mastery\}% mastery/);
assert.match(outcomes, /practice_session_id/);
assert.doesNotMatch(outcomes, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Completed intervention outcomes must remain read-only.');

// 8) Learner history and follow-up must reuse the existing assignment/result records.
assert.match(history, /Practice intervention history/);
assert.match(history, /practice_assignments/);
assert.match(history, /practice_assignment_attempts/);
assert.doesNotMatch(history, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Intervention history must remain read-only.');

assert.match(followUp, /Assign again/);
assert.match(followUp, /#v43b-student-options/);
assert.match(followUp, /This creates a new assignment only after you review the settings and click Assign Practice/);
assert.doesNotMatch(followUp, /create_teacher_practice_assignments_v43b|\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'History follow-up must only prefill the established assignment builder.');

// 9) Class overview must summarize the same queue states and introduce no new thresholds.
assert.match(classOverview, /Class intervention overview/);
assert.match(classOverview, /Counts follow the current Analytics filters/);
assert.match(classOverview, /No new mastery or intervention threshold is applied/);
assert.doesNotMatch(classOverview, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Class intervention overview must stay read-only over the existing queue.');

// 10) Deadline monitoring stays guidance-only. The follow-up write is restricted to the
// existing assignment target date and emits the established assignment-changed event.
assert.match(deadlines, /Target dates remain guidance only and do not block access/);
assert.match(deadlines, /\.eq\('class_id',cls\.id\)/);
assert.match(deadlines, /DUE_SOON_MS = 48 \* 60 \* 60 \* 1000/);
assert.doesNotMatch(deadlines, /\.insert\(|\.update\(|\.delete\(|cloud\.rpc\(/,
  'Deadline monitor itself must remain read-only.');

assert.match(deadlineFollowUp, /closes_at:value/);
assert.match(deadlineFollowUp, /cloud\.from\('practice_assignments'\)[\s\S]*?\.update\(payload\)/);
assert.match(deadlineFollowUp, /math-practice-assignments-changed/);
assert.match(deadlineFollowUp, /Target only — access stays open/);
assert.doesNotMatch(deadlineFollowUp, /practice_assignment_attempts[\s\S]*?\.update\(|practice_sessions[\s\S]*?\.update\(/,
  'Deadline target editing must not alter attempts or Practice results.');

// 11) Student topic progress remains a read-only drill-down over the secure My Progress UI.
assert.match(topicProgress, /Read-only drill-down/);
assert.match(topicProgress, /View topic progress/);
assert.match(topicProgress, /Current mastery/);
assert.match(topicProgress, /Existing improvement milestone/);
assert.doesNotMatch(topicProgress, /cloud\.rpc\(|cloud\.from\(|cloud\.functions\.invoke\(/,
  'Student topic progress must not create a second progress data path.');

console.log('V5.8 intervention workflow regression passed.');
console.log(`- ${chain.length} established intervention modules retained in loader order`);
console.log('- Action Center remains the single teacher entry point from V5.8 Teacher Workspace');
console.log('- Individual/shared-focus assignment actions remain prefill-only');
console.log('- Outstanding/completed intervention states, outcomes and history remain read-only views');
console.log('- Deadline editing remains limited to assignment target dates');
console.log('- Student topic progress remains presentation-only over existing secure evidence');
