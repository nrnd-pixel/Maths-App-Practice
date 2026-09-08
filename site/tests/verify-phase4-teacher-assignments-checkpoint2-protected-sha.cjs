const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const gitObject = objectPath => execFileSync('git', ['rev-parse', `HEAD:${objectPath}`], {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim();

// Approved main baseline after PR #217: d9ea9ca66a286e020a1bfa27e11bef68c6d432b8
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
  'site/v53d6-resource-bank-status-clarity.js': '98c5c1c24480856745dd85922ed674e16bf7bfc1',

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

  'site/v58a-student-first-use-experience.js': '610dc830c89d44959e5ea893b79b8424283077be',
  'site/v58b-teacher-workspace-consolidation.js': '661c54ddc1f5cf45252f14b0dadf8600c1243ab2',
  'site/v58c-parent-friendly-student-report.js': 'ab1ec58ff7cae1d886879002e4983179d7280145',
  'site/v58c-parent-summary-workspace-shortcut.js': 'a6bbf05422d414d94fa7e6164f1d302e27feda51',
  'site/v58d-content-workflow-consolidation.js': '7905fce53236305d946315cae260c4b1bf212be6',
  'site/v581a-practice-cloud-result-reconciliation.js': '09f167eab59737a393113ec3059724b8931155d3',
  'site/v58-stable-release-checkpoint.js': '7afdfa50363672f7dd35d67473bcec8485944fdd',
};

for (const [file, expected] of Object.entries(protectedBlobs)) {
  assert.equal(gitObject(file), expected, `${file} must remain byte-identical to approved main`);
}

assert.equal(
  gitObject('supabase'),
  '19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456',
  'The complete Supabase tree, including every SQL migration, must remain byte-identical to approved main',
);

console.log('Phase 4 teacher assignments checkpoint 2 protected SHA audit passed.');
console.log(`- ${Object.keys(protectedBlobs).length} protected runtime files match exact approved-main Git blob SHAs`);
console.log('- complete Supabase tree matches exact approved-main Git tree SHA');
