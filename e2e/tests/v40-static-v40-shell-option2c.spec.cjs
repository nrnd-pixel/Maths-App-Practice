const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const {
  installSupabaseMock,
  openApp,
  signInStudent,
  startPractice,
} = require('./helpers.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BASE_SHA = '653aec5e06e1bf1669b4c9c0cd3e91069715de45';
const EXPECTED_FROZEN_SITE_SHA256 = 'be3012e349c2b9b6b0fba450e3ef3264421ea9d002ec00a48270d6c1ad464b13';
const EXPECTED_SUPABASE_SHA256 = '0684a8f4f9a2e9acf193aeeedecbf7825091a8a0cf9edee1f2a2d4837a6490ec';
const EXPECTED_SUPABASE_TREE = '19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456';

const RUNTIME_SUCCESSORS = Object.freeze({
  'site/index.html': '94b7b0f22cd4c25f41ef1b17fdf693dcba85fe72',
});
const AUTHORIZED_SITE_SUCCESSORS = Object.freeze({
  'site/assignments-student.js': '1004dba36c2d0bfe737b1e4c590360142001d419',
  'site/past-paper-assignments.js': 'bd05a8b516987bcaa5b16ad9e8be991b947b2894',
  'site/config.js': '508341fa4d359135646d615ed9751e709fa6315d',
  'site/question-bank-audit-multipart.js': 'b4c4609ddb90a9d8705e02aeb99cb653ded7277e',
  'site/question-bank-metadata-review.js': '23e2650cf0ace6c33740ad63f35d821e213834a9',
  'site/question-bank-selection-qa.js': '61c6ca27e9877f6bb31ee3b31173a88e4fdf319b',
  'site/v52-topical-activation-guard.js': '2df46ed74e364e06efbc462284fd398cfcd6c5f4',
  'site/v52-teacher-topical-library.js': '92df3624a7b48ed88a64eb5de985cd232c63b215',
  'site/tests/verify-v5.1b2d-correction-audit-history.cjs': 'fa9c7bff475d1e3f3d7512c6b5165d8a47ecbe57',
  'site/v52b1-question-bank-observer-gate.js': 'd0c4745afdd78fc326b39748eca559e9d530503a',
  'site/tests/verify-v5.2b1-question-bank-observer-gate.cjs': '7ad4dc99fa074c36116760c055ed48aeb30dfdfa',
  'site/v52b1-question-bank-performance.js': '5a2e180ca5e7c6579f6504be072a2cf90bf8e1d6',
  'site/tests/verify-v5.2b1-question-bank-performance.cjs': '1e238a44c1bd7cc09c1c9ab046d8098a2223a633',
  'site/v39cd-dashboard-state-bundle.js': 'f68bdd4b407913fc9ca546a995b57f212a7a8d69',
  'site/v576-feedback-presentation-bundle.js': 'dfa88c4e560eee8d5f58ed2d3ccee62b7a6942f0',
  'site/v58ab-first-use-workspace-bundle.js': '09250fe29a6fd0d01150dc243a4a9a8706800bbe',
  'site/v58c-parent-summary-presentation-bundle.js': '74dd51284bbc626a1f8789ba1312f039675a23c3',
  'site/tests/verify-v5.8c-parent-friendly-student-report.cjs': '94b3557672dfbd11faa3fd72c9897b714743eba1',
  'site/tests/verify-v5.8d-content-workflow-consolidation.cjs': 'ead9443286d1cb476b98c7746fb48008a446f2f5',
  'site/tests/verify-v5.8-stable-release-checkpoint.cjs': 'a86f2fa81441b49b3871eae8bdb35c3b4cab15dc',
  'site/tests/verify-v5.7.6-classroom-feedback-support.cjs': '10a72e71103ec68500f40bb8e7969d16f14c5cf6',
  'site/tests/verify-v5.7.6.3-teacher-feedback-header-icon.cjs': '3434826de0a9e1c34d1e5171800be6bb40a4c9fb',
  'site/tests/verify-v5.8a-student-first-use-experience.cjs': '869ed2b70d2d81aad3969de348411fe5cf3fcac5',
  'site/tests/verify-v5.8b-teacher-workspace-consolidation.cjs': 'f783125ce8898b3018c6957629bd8d931ea4ba0e',
  'site/tests/verify-v59a-student-home-refresh-test-contract.cjs': '522599fc59cae3e5d75b29723679c67f4ee5240d',
  'site/v59a-student-home-refresh.js': 'b4e2f290061f061c22d00fc23e87d9adecf7cde9',
  'site/tests/verify-v5.9b-adaptive-diagnostic-pilot-v2.cjs': 'd85d55d045847255714607ced0cb441af94d2bd0',
  'site/v59b-adaptive-diagnostic-pilot-v2.js': '42fc17368432f3558f6bf7caa66749e8ae02805b',
  'site/tests/v51-phase4-protected-shas.json': '77717886a1f45d4a0e62189df2f32cebbe1edeef',
  'site/tests/verify-phase4-gamification-checkpoint2-integrity.cjs': '487f567d481d8332854b2556b25c8c790561fc66',
  'site/tests/verify-phase4-past-paper-v55-checkpoint1-integrity.cjs': '921a7d9195933bd05f054cc529989b54d36ba3a2',
  'site/tests/verify-phase4-past-paper-v56-v57-checkpoint1-integrity.cjs': '4804b1ca8631291ca70e61c6a3091aea979eb4dd',
  'site/tests/verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs': 'ecf5e7055428a638bd1f70309a515e06853c0aa1',
  'site/tests/verify-phase4-teacher-assignments-v44-v48-checkpoint2-integrity.cjs': 'd8f3e86d83d136d6ae99234c22beb6d640c7736b',
  'site/tests/verify-phase4-v50-operations-reporting-integrity.cjs': '982d12fab8c6d01ec9499bb28c943b53f08cf101',
  'site/tests/verify-phase4-v50-operations-reporting-protected-sha.cjs': 'aea914adf7c3d1268a9ea1a7bf012a68c9f8cb36',
  'site/tests/verify-phase4-v51-question-bank-management-integrity.cjs': '7d04c724f9bc39614671b02b0a37b22e74f8d67a',
  'site/tests/verify-phase4-v51-question-bank-management-protected-sha.cjs': '1613f8a1413114358fbfd1bc774c8689cec39602',
  'site/tests/verify-phase4-v52c-legacy-student-route-integrity.cjs': '89567520661af8b9c8c1e944d7cb869097cc773f',
  'site/tests/verify-phase4-v52c-legacy-student-route-protected-sha.cjs': 'a8001054de08b71bbc860632fc0ed1081d1d339b',
  'site/tests/verify-phase4-v53-practice-selection-dormant-reference-integrity.cjs': '716f2679c26144e8f1b7decd605b082551e7cb3a',
  'site/tests/verify-phase4-v53-practice-selection-protected-sha.cjs': 'a33ea86c659bc638cc3ac23a1b11e98c60233c14',
  'site/tests/verify-phase4-v53-ui-resource-companion-dormant-reference-integrity.cjs': 'fd7b49e31fa174e3c225ffa814968847416f237e',
  'site/tests/verify-phase4-v53-ui-resource-companion-integrity.cjs': '72328a455af6073e633a347db5bb482c29569c41',
  'site/tests/verify-phase4-v53-ui-resource-companion-protected-sha.cjs': '78f22d0063a9f412c4b49e7a7ecfec08e7fc3df7',
  'site/tests/verify-phase4-v54-resource-bank-dormant-reference-integrity.cjs': 'f19d8cd7b1b72a2851b5a0d534b26b103cc08331',
  'site/tests/verify-phase4-v54-resource-bank-integrity.cjs': 'a15550958a3179a86610c19af6cad591768ec708',
  'site/tests/verify-phase4-v54-resource-bank-protected-sha.cjs': 'c9df6dde91e85c5c9d6a6e524b7c457bc1f68256',
  'site/tests/verify-question-metadata-v2-schema-contract.cjs': 'c8fb99a90c058834c99353afe85169b97b02e51e',
  'site/tests/verify-adaptive-question-readiness-v2.cjs': '62a1d5df660089b5e5db16facbd7e95d5f151299',
  'site/tests/verify-adaptive-diagnostic-server-readiness-v2.cjs': 'ead9b5cc61e6e466a74b5b0578e81e8185609215',
  'site/tests/verify-v5.1.cjs': 'c3b22c0e540b6da490fd3acf886016986bd35716',
  'site/tests/verify-v5.4a-resource-bank-visibility.cjs': 'c13bfae1ceb6923aa4b4c03c5c61efb1bc7d6c81',
  'site/tests/verify-v5.8.1b-checkpoint-attribution.cjs': 'd37669274932200d75e4108c18191b3a9ba3c7c3',
  'site/tests/verify-v5.8.2-past-paper-completion-dedup.cjs': '8f4306ffb9e3a0c291cf53b5482d7ddb32b80c2d',
  'site/tests/verify-phase5c-wrapper-chain-coverage.cjs': '8bf3c87f93f1677cb15395e36c7c7600dffb3672',
  'site/demo/index.html': '631153822067f4efc48794be719e8d6bbb4e96df',
  'site/viewer-demo/index.html': '9f1338facc7ddefde9640959a6fbfce7d1aac517',
  'site/demo-student/index.html': '72df4461ed816b40133b4a34e1434ef4f994c144',
  'site/tests/verify-v5.9-current-live-demo.cjs': '23ec8bbc994fe7d37af3c8fa7f55e7e11e03157b',
  'site/tests/verify-v5.9-demo-viewer-access.cjs': 'db303e51de65f4cb61485d0fba00393498348511',
  'site/tests/verify-v5.9-demo-student-questions.cjs': 'e94f0096fa18394b5c4c95d66ab2160bf1bac86b',
});
// Phase 5A — 85 dormant JS files removed (never loaded by config.js or the V40 release chain).
// Deleted files appear in git diff but have no blob; they are authorised here, not in
// AUTHORIZED_SITE_SUCCESSORS, so the blob-check loop skips them correctly.
const AUTHORIZED_SITE_DELETIONS = new Set([
  'site/v38-release.js','site/v381-release.js','site/v39-release.js',
  'site/v42-practice-assignments.js','site/v43-individual-practice-assignments.js',
  'site/v43-multi-recipient-practice-assignments.js','site/v44-action-center-practice.js',
  'site/v44-intervention-follow-through.js','site/v44-intervention-highlight-clarity.js',
  'site/v44-shared-focus-groups.js','site/v45-intervention-outcomes.js',
  'site/v46-intervention-export.js','site/v47-class-intervention-overview.js',
  'site/v47-follow-up-from-history.js','site/v47-intervention-history.js',
  'site/v48-deadline-follow-up.js','site/v48-student-deadline-experience.js',
  'site/v48-teacher-deadline-monitoring.js','site/v49-student-next-steps.js',
  'site/v49-student-progress-snapshot.js','site/v50-production-polish.js',
  'site/v50-rc2-empty-result-code-polish.js','site/v50-release-audit-rc3.js',
  'site/v50-release-audit.js','site/v50-report-archive.js','site/v50-reporting-export.js',
  'site/v50-roster-edit.js','site/v50-student-launch-readiness.js',
  'site/v50-teacher-class-report.js','site/v50-teacher-operations.js',
  'site/v50-teacher-student-report.js','site/v51-bulk-question-image-cleanup.js',
  'site/v51-bulk-question-image-safety.js','site/v51-bulk-question-image-upload.js',
  'site/v51-multipart-question-management.js','site/v51-one-confirmation-paper-import.js',
  'site/v51-paper-package-preview-status.js','site/v51-paper-package-preview.js',
  'site/v51-paper-profile-validator.js','site/v51-post-import-integrity.js',
  'site/v51-question-bank-bulk-metadata.js','site/v51-question-bank-bulk-status.js',
  'site/v51-question-bank-qa.js','site/v51-question-change-history.js',
  'site/v51-question-review-workflow.js','site/v51-student-exam-paper-library.js',
  'site/v51-student-exam-resume-progress.js','site/v52c-student-topical-library.js',
  'site/v52c-topical-hint-bridge.js','site/v52c-topical-publication.js',
  'site/v52c1-topical-library-mount-hotfix.js','site/v52c2-topical-result-ux.js',
  'site/v53a-practice-eligibility.js','site/v53b-unified-practice-retrieval.js',
  'site/v53c-two-mode-student-ui.js','site/v53d1-teacher-practice-pool-alignment.js',
  'site/v53d3-practice-selection-quality.js','site/v53d4-student-recommendation-alignment.js',
  'site/v53d5-practice-selection-intelligence.js','site/v53d6-resource-bank-status-clarity.js',
  'site/v54a-resource-bank-visibility.js','site/v54b-practice-eligibility-controls.js',
  'site/v54c-compact-question-bank.js','site/v54d-topical-resource-simplification.js',
  'site/v54e-bulk-practice-eligibility.js','site/v54f-bulk-selection-scope-safety.js',
  'site/v55a-past-paper-practice.js','site/v55a1-practice-type-guard.js',
  'site/v55b-full-paper-practice.js','site/v55c-resume-past-paper-practice.js',
  'site/v55c1-resume-button-bridge.js','site/v55d-past-paper-result-attribution.js',
  'site/v56b-teacher-assigned-past-paper-practice.js','site/v56c-student-past-paper-progress.js',
  'site/v56d-teacher-past-paper-analytics.js','site/v571a-gamification-foundation.js',
  'site/v571b-streaks-achievements.js','site/v572-weekly-missions.js',
  'site/v573-class-challenges-teacher-gamification.js','site/v574-gamification-polish-teacher-controls.js',
  'site/v57a-cross-device-past-paper-resume.js','site/v57a1-cross-device-local-bridge.js',
  'site/v57a2-stale-local-checkpoint-cleanup.js','site/v57d-past-paper-analytics-actions.js',
  'site/v57d1-focus-plan-copy-fallback.js',
]);
const AUTHORIZED_SUPABASE_SUCCESSORS = Object.freeze({
  'supabase/question_metadata_v2_demand_profile.sql': 'afdd7ded59ca373026a51453ade760a4b203d9e3',
  'supabase/v54h_practice_review_safety.sql': '75e36c2e3474cabba39c2bb2f8910e96564a3c2b',
  'supabase/v581b_assignment_checkpoint_attribution_hardening.sql': 'd47da7bce5621fc5dc84fb7e37cf6efe598359d6',
  'supabase/20260907073416_add_adaptive_route_preview_v1.sql': 'd00b2284dd639f58ef16de880cb995346b5532d9',
  'supabase/20260907080542_adaptive_pilot_feature_gate_v1.sql': '5565dfd1a4e67384cf69a61188b1e3452a24af39',
  'supabase/20260907150643_v59b_interactive_adaptive_diagnostic_pilot.sql': '28454d0b3bb19972be5915271842b36d920d3aba',
  'supabase/20260914134600_student_adaptive_question_readiness_v2.sql': 'da88c946334f07912735c3afd3c27073ab318d24',
  'supabase/20260915023000_adaptive_diagnostic_server_readiness_v2.sql': 'fe61768b9dbbb9d8fbfb6909a71e799dbfdd2c95',
  'supabase/20260916010000_adaptive_pilot_lifecycle_telemetry_v1.sql': 'c37fb6a97185cc58035ed03715c2ff803086bcf3',
});

const FROZEN_HIGH_RISK_BLOBS = Object.freeze({
  'site/config.js': '508341fa4d359135646d615ed9751e709fa6315d',
  'site/v39-student-polish.js': '4daea69a282d99f7e8a07bd4aeaa26dcaaaf86ad',
  'site/v40-student-platform.js': 'c200fd22365d54178696b5f12e6866c8b4edbfed',
  'site/v40-student-session.js': '52150813ff7eeeff72cbc98ab1cafff180d32c96',
  'site/v40-learning-priorities.js': 'bfec5b47eaf266486d21c96acdb4e1cfd677b328',
  'site/v40-platform-polish.js': '5ebdcb4c8d6a8a4c5fad19fa14dfaea2561d102b',
  'site/v40-release.js': 'a308df11b601bf563b56d555e9f434652e524d77',
  'site/v40-start-shell.js': '26280684b65275ea13656b3e423a8a3ce81cd9e9',
  'site/v41-signin-guard.js': '5794576f4c41e32ae8bb081e380ff892ef5f4a6c',
  'site/gamification-core.js': '87d6175270284e4b40c3a1fbcd196622179d0402',
  'site/gamification-student.js': 'd9c4dc0e25cbed50346937db887a703800be5a59',
  'site/v57c-student-continue-learning-home.js': '196225cf94035363869b8051bc33cdd3c03993f9',
  'site/v58a-student-first-use-experience.js': '8e0279e86b1ece862586238f99c760129c13465f',
});

// Phase 7B-D authorizes exact successors for these maintained verifiers. Keep
// their pre-successor blobs in the historical remainder calculation so the
// established frozen hash continues to prove every other site byte unchanged.
const PHASE7BD_REPLACED_SITE_BASELINE_BLOBS = Object.freeze({
  'site/question-bank-metadata-review.js': '5571f6ea2ee33479f5dd0ad75a418249c10ba664',
  'site/question-bank-selection-qa.js': '65df39b8a93c1c95bc3c5cdd4049070e7e18c8bf',
  'site/v52-topical-activation-guard.js': '7ece6302bc0faf9066db9e1b615810ad63c5f0fa',
  'site/v52-teacher-topical-library.js': '25a2e7eb176eb100ab852fc664379e5716feb6de',
  'site/v52b1-question-bank-observer-gate.js': '82a87ffed9091b76c9008a3949c3bd432c2d06ce',
  'site/tests/verify-v5.2b1-question-bank-observer-gate.cjs': 'e0c51954d485f5b090650e24b05b4ff0071537cd',
  'site/v52b1-question-bank-performance.js': '87124f4bc252289203409fc0abe614748ed1dd86',
  'site/tests/verify-v5.2b1-question-bank-performance.cjs': '160679754284a8158aaf6bf025a9530183eb9fbf',
  'site/question-bank-audit-multipart.js': '6738e89a7a4a98693b7303a05714c7419d562407',
  'site/tests/verify-v5.1b2d-correction-audit-history.cjs': '016562130bb8a7f601301f8d37819a060f0c06a6',
  'site/tests/verify-v5.7.6-classroom-feedback-support.cjs': '8033886865b0621313fbb8a0f9d6af38e53d499b',
  'site/tests/verify-v5.7.6.3-teacher-feedback-header-icon.cjs': '844feccd2cee26352f3c0d38219f03ee9e246e48',
  'site/tests/verify-v5.8a-student-first-use-experience.cjs': '0b65819da2d6285841e719c43d2606b2b2d15b69',
  'site/tests/verify-v5.8b-teacher-workspace-consolidation.cjs': 'c78833c57b21792f4f1960baa5a54a906d4a4a9b',
  'site/tests/verify-v5.8c-parent-friendly-student-report.cjs': '8cb7a721f645c39d9198cc90127c63696929df1a',
  'site/tests/verify-v5.8d-content-workflow-consolidation.cjs': '700c94d2ab07b3585a96194ce87a89eaf00f1ed0',
  'site/tests/verify-v5.8-stable-release-checkpoint.cjs': 'eabecf938d48ce6040973a0cd4e8c65ac9401818',
});

const SCREEN_CONFIG = Object.freeze({
  start: 'home',
  quiz: 'learn',
  result: 'learn',
  'exam-result': 'learn',
  'student-assignments': 'assignments',
  'student-dashboard': 'progress',
  'student-review': 'reviewed',
});
const NAV_KEYS = Object.freeze(['home', 'learn', 'assignments', 'progress', 'reviewed']);

function git(args) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function gitBlob(pathname) {
  return git(['hash-object', pathname]);
}

function workingManifestHash(root, excluded = new Set(), baselineBlobs = {}) {
  const output = git(['ls-files', '-co', '--exclude-standard', root]);
  const paths = output
    ? [...new Set(output.split(/\r?\n/).filter(Boolean))].sort()
    : [];
  const records = paths
    .filter(pathname => !excluded.has(pathname) || baselineBlobs[pathname])
    .map(pathname => `${baselineBlobs[pathname] || gitBlob(pathname)}  ${pathname}`);
  return crypto.createHash('sha256')
    .update(records.length ? `${records.join('\n')}\n` : '')
    .digest('hex');
}

async function installLifecycleCapture(page) {
  await page.addInitScript(({ screenConfig, navKeys }) => {
    window.__option2cCapture = {
      navs: {},
      buttons: {},
      learn: {},
      baseValidate: null,
      sessionValidate: null,
      platformValidate: null,
      v52c2Validate: null,
      validateOrder: [],
    };

    const captureStatic = () => {
      const capture = window.__option2cCapture;
      for (const screenId of Object.keys(screenConfig)) {
        const screen = document.getElementById(screenId);
        const nav = screen?.querySelector(':scope > .v40-student-nav') || null;
        capture.navs[screenId] = nav;
        capture.buttons[screenId] = {};
        for (const key of navKeys) {
          capture.buttons[screenId][key] = nav?.querySelector(`[data-v40-nav="${key}"]`) || null;
        }
      }

      const setup = document.querySelector('#start .v40c-learn-setup');
      capture.learn = {
        setup,
        modeSwitch: setup?.querySelector('.mode-switch') || null,
        modeNote: setup?.querySelector('#mode-note') || null,
        startButton: setup?.querySelector('#start-btn') || null,
        strand: document.getElementById('practice-strand-wrap'),
        topic: document.getElementById('practice-topic-wrap'),
        count: document.getElementById('practice-count-wrap'),
        difficulty: document.getElementById('practice-difficulty-wrap'),
        examYear: document.getElementById('exam-year-wrap'),
        examPaper: document.getElementById('exam-paper-wrap'),
        examNote: document.getElementById('exam-paper-note'),
        examInstructions: document.getElementById('exam-instructions'),
        openLearn: document.querySelector('#start [data-action-for="start-btn"] .v40c-open-learn'),
      };
      capture.baseValidate = window.validateStudentAccess;
      capture.validateOrder.push('base');

      const observer = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (!(node instanceof HTMLScriptElement)) return;
            const src = String(node.getAttribute('src') || '');
            if (src.includes('v40-student-session.js')) {
              node.addEventListener('load', () => {
                capture.sessionValidate = window.validateStudentAccess;
                capture.validateOrder.push('session');
              }, { once: true });
            }
            if (src.includes('v40-platform-polish.js')) {
              node.addEventListener('load', () => {
                capture.platformValidate = window.validateStudentAccess;
                capture.validateOrder.push('platform-polish');
              }, { once: true });
            }
            if (src.includes('topical-legacy-student-route.js')) {
              node.addEventListener('load', () => {
                capture.v52c2Validate = window.validateStudentAccess;
                capture.validateOrder.push('v52c2');
              }, { once: true });
            }
          });
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', captureStatic, { once: true });
    } else {
      captureStatic();
    }
  }, { screenConfig: SCREEN_CONFIG, navKeys: NAV_KEYS });
}

async function signInAndWait(page) {
  await signInStudent(page);
  await expect(page.locator('#start')).toHaveClass(/v40-shell-authenticated/);
  await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
}

test.describe('Option 2C static V40 nav + Learn shell hard gates', () => {
  test('gate 1 — true pre-JS flash suppression keeps only the logged-out shell visible', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      const baseURL = String(test.info().project.use.baseURL || 'http://127.0.0.1:4173');
      await page.goto(baseURL);
      await expect(page.locator('#start')).toBeVisible();
      await expect(page.locator('#start .header')).toBeVisible();
      await expect(page.locator('#start .v40c-session-panel')).toBeVisible();
      await expect(page.locator('#v40c-student-signin')).toBeVisible();
      await expect(page.locator('#start .v40c-session-identity')).toBeHidden();
      await expect(page.locator('#start > .v40-student-nav')).toBeHidden();
      await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
      await expect(page.locator('#start .mode-switch')).toBeHidden();
      await expect(page.locator('#start .v40-learning-hub-hero')).toBeHidden();
      await expect(page.locator('#start .v40c3-home-dashboard')).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test('gate 2 — all seven static navs and every tab button keep exact DOM identity after enhancement', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    const identity = await page.evaluate(({ screenConfig, navKeys }) => {
      const capture = window.__option2cCapture;
      return Object.keys(screenConfig).map(screenId => {
        const screen = document.getElementById(screenId);
        const nav = screen?.querySelector(':scope > .v40-student-nav') || null;
        return {
          screenId,
          navSame: capture.navs[screenId] === nav,
          navCount: screen?.querySelectorAll(':scope > .v40-student-nav').length || 0,
          staticMarker: nav?.dataset.v40StaticNav || '',
          enhanced: nav?.dataset.v40NavEnhanced || '',
          buttonsSame: navKeys.every(key => capture.buttons[screenId][key] === nav?.querySelector(`[data-v40-nav="${key}"]`)),
          buttonCount: nav?.querySelectorAll('[data-v40-nav]').length || 0,
        };
      });
    }, { screenConfig: SCREEN_CONFIG, navKeys: NAV_KEYS });

    for (const row of identity) {
      expect(row.navSame, `${row.screenId} nav was replaced`).toBe(true);
      expect(row.navCount, `${row.screenId} duplicate nav`).toBe(1);
      expect(row.staticMarker, `${row.screenId} is not source HTML`).toBe('true');
      expect(row.enhanced, `${row.screenId} not enhanced`).toBe('true');
      expect(row.buttonsSame, `${row.screenId} nav buttons were replaced`).toBe(true);
      expect(row.buttonCount, `${row.screenId} tab count`).toBe(5);
    }
  });

  test('gate 3 — static Learn shell and legacy controls keep exact DOM identity and final positions', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    const result = await page.evaluate(() => {
      const capture = window.__option2cCapture.learn;
      const setup = document.querySelector('#start .v40c-learn-setup');
      const practiceGrid = setup?.querySelector('.v40c-settings-grid');
      const examGrid = setup?.querySelector('.v40c-exam-grid');
      const actions = setup?.querySelector('.v40c-learn-actions');
      const current = {
        setup,
        modeSwitch: setup?.querySelector('.mode-switch'),
        modeNote: setup?.querySelector('#mode-note'),
        startButton: setup?.querySelector('#start-btn'),
        strand: document.getElementById('practice-strand-wrap'),
        topic: document.getElementById('practice-topic-wrap'),
        count: document.getElementById('practice-count-wrap'),
        difficulty: document.getElementById('practice-difficulty-wrap'),
        examYear: document.getElementById('exam-year-wrap'),
        examPaper: document.getElementById('exam-paper-wrap'),
        examNote: document.getElementById('exam-paper-note'),
        examInstructions: document.getElementById('exam-instructions'),
        openLearn: document.querySelector('#start [data-action-for="start-btn"] .v40c-open-learn'),
      };
      return {
        allSame: Object.keys(capture).every(key => capture[key] === current[key]),
        setupCount: document.querySelectorAll('#start .v40c-learn-setup').length,
        startButtonCount: document.querySelectorAll('#start #start-btn').length,
        modeSwitchParent: current.modeSwitch?.parentElement === setup,
        modeNoteParent: current.modeNote?.parentElement === setup,
        startButtonParent: current.startButton?.parentElement === actions,
        practiceParents: [current.strand,current.topic,current.count,current.difficulty].every(node => node?.parentElement === practiceGrid),
        examParents: [current.examYear,current.examPaper,current.examNote,current.examInstructions].every(node => node?.parentElement === examGrid),
        navPosition: document.querySelector('#start .v40c-session-panel')?.nextElementSibling === document.querySelector('#start > .v40-student-nav'),
        enhanced: setup?.dataset.v40LearnEnhanced || '',
        fallback: setup?.dataset.v40Fallback || '',
      };
    });

    expect(result).toEqual({
      allSame: true,
      setupCount: 1,
      startButtonCount: 1,
      modeSwitchParent: true,
      modeNoteParent: true,
      startButtonParent: true,
      practiceParents: true,
      examParents: true,
      navPosition: true,
      enhanced: 'true',
      fallback: '',
    });
  });

  test('gate 4 — Home and Learn tabs switch the authenticated start shell without reconstruction', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    const startNav = page.locator('#start > .v40-student-nav');
    await expect(startNav.locator('[data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('#start .v39-home-hub')).toBeVisible();

    await startNav.locator('[data-v40-nav="learn"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
    await expect(startNav.locator('[data-v40-nav="learn"]')).toHaveAttribute('aria-current', 'page');
    await expect(startNav.locator('[data-v40-nav="home"]')).not.toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeVisible();
    await expect(page.locator('#start .v39-home-hub')).toBeHidden();

    await startNav.locator('[data-v40-nav="home"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    await expect(startNav.locator('[data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('#start .v39-home-hub')).toBeVisible();
  });

  test('gate 5 — Assignments, Progress and Reviewed tabs still delegate to the existing destinations', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    const startNav = page.locator('#start > .v40-student-nav');
    for (const [key, selector] of [
      ['assignments', '#student-assignments'],
      ['progress', '#student-dashboard'],
      ['reviewed', '#student-review'],
    ]) {
      await expect(startNav.locator(`[data-v40-nav="${key}"]`)).toBeVisible();
      await startNav.locator(`[data-v40-nav="${key}"]`).click();
      await expect(page.locator(selector)).toHaveClass(/active/);
      await page.locator(`${selector} .back-home`).first().click();
      await expect(page.locator('#start')).toHaveClass(/active/);
      await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    }
  });

  test('gate 6 — non-Home transitions use the existing back-home and delegated source-button path', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    await page.evaluate(() => {
      window.__option2cDelegation = {
        assignmentsBackHome: 0,
        progressSource: 0,
        dashboardBackHome: 0,
      };
      document.querySelector('#student-assignments .back-home')?.addEventListener('click', () => {
        window.__option2cDelegation.assignmentsBackHome += 1;
      });
      document.getElementById('my-progress-btn')?.addEventListener('click', () => {
        window.__option2cDelegation.progressSource += 1;
      });
      document.querySelector('#student-dashboard .back-home')?.addEventListener('click', () => {
        window.__option2cDelegation.dashboardBackHome += 1;
      });
    });

    await page.locator('#start [data-v40-nav="assignments"]').click();
    await expect(page.locator('#student-assignments')).toHaveClass(/active/);

    await page.locator('#student-assignments [data-v40-nav="progress"]').click();
    await expect(page.locator('#student-dashboard')).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__option2cDelegation)).toMatchObject({
      assignmentsBackHome: 1,
      progressSource: 1,
    });

    await page.locator('#student-dashboard [data-v40-nav="learn"]').click();
    await expect(page.locator('#start')).toHaveClass(/active/);
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'home');
    await expect(page.locator('#start [data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('#start .v39-home-hub')).toBeVisible();
    expect(await page.evaluate(() => window.__option2cDelegation.dashboardBackHome)).toBe(1);
  });

  test('gate 7 — active Practice keeps every non-Learn navigation tab disabled', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);
    await startPractice(page);

    const quizNav = page.locator('#quiz > .v40-student-nav');
    await expect(quizNav).toBeVisible();
    await expect(quizNav.locator('[data-v40-nav="learn"]')).toHaveAttribute('aria-current', 'page');
    for (const key of ['home','assignments','progress','reviewed']) {
      await expect(quizNav.locator(`[data-v40-nav="${key}"]`)).toBeDisabled();
    }
    await quizNav.locator('[data-v40-nav="home"]').click({ force: true });
    await expect(page.locator('#quiz')).toHaveClass(/active/);
  });

  test('gate 8 — authenticated → logged-out → authenticated cycling preserves one static shell and resets Home', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);

    await page.locator('#start [data-v40-nav="learn"]').click();
    await expect(page.locator('#start')).toHaveAttribute('data-v40-start-view', 'learn');
    await expect(page.locator('.v40c-nav-identity')).toHaveCount(7);

    await page.locator('#v40c-student-logout').click();
    await expect(page.locator('#start')).toHaveClass(/v40-shell-logged-out/);
    await expect(page.locator('#start')).not.toHaveAttribute('data-v40-start-view', /.+/);
    await expect(page.locator('#start > .v40-student-nav')).toBeHidden();
    await expect(page.locator('#start .v40c-learn-setup')).toBeHidden();
    await expect(page.locator('.v40c-nav-identity')).toHaveCount(0);

    await signInAndWait(page);
    await expect(page.locator('#start [data-v40-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.v40c-nav-identity')).toHaveCount(7);

    const state = await page.evaluate(({ screenConfig }) => {
      const capture = window.__option2cCapture;
      return {
        navsSame: Object.keys(screenConfig).every(screenId =>
          capture.navs[screenId] === document.getElementById(screenId)?.querySelector(':scope > .v40-student-nav')
        ),
        learnSame: capture.learn.setup === document.querySelector('#start .v40c-learn-setup'),
        navCount: document.querySelectorAll('.v40-student-nav').length,
        learnCount: document.querySelectorAll('#start .v40c-learn-setup').length,
      };
    }, { screenConfig: SCREEN_CONFIG });
    expect(state).toEqual({ navsSame: true, learnSame: true, navCount: 7, learnCount: 1 });
  });

  test('gate 9 — repeated nav/Learn enhancement is idempotent and does not stack listeners', async ({ page }) => {
    await installSupabaseMock(page);
    await openApp(page);
    await signInAndWait(page);
    await page.locator('#start [data-v40-nav="learn"]').click();

    await page.evaluate(() => {
      window.__option2cProgressSourceClicks = 0;
      document.getElementById('my-progress-btn')?.addEventListener('click', () => {
        window.__option2cProgressSourceClicks += 1;
      });
    });

    await page.addScriptTag({ url: '/v40-student-nav.js?option2c-repeat=1' });
    await page.addScriptTag({ url: '/v40-learn-setup.js?option2c-repeat=1' });
    await page.addScriptTag({ url: '/v40-student-nav.js?option2c-repeat=2' });
    await page.addScriptTag({ url: '/v40-learn-setup.js?option2c-repeat=2' });

    await expect(page.locator('.v40-student-nav')).toHaveCount(7);
    await expect(page.locator('#start .v40c-learn-setup')).toHaveCount(1);
    await expect(page.locator('#v40-student-nav-style')).toHaveCount(1);
    await expect(page.locator('#v40-learn-setup-style')).toHaveCount(1);

    const change = page.locator('#start .v40c-change-settings');
    await expect(change).toHaveAttribute('aria-expanded', 'false');
    await change.click();
    await expect(change).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#start .v40c-practice-summary')).toHaveClass(/v40c-settings-open/);
    await change.click();
    await expect(change).toHaveAttribute('aria-expanded', 'false');

    await page.locator('#start [data-v40-nav="home"]').click();
    await page.locator('#start [data-v40-nav="progress"]').click();
    await expect(page.locator('#student-dashboard')).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__option2cProgressSourceClicks)).toBe(1);

    const navSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-student-nav.js'), 'utf8');
    const learnSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-learn-setup.js'), 'utf8');
    expect(learnSource).not.toContain('MutationObserver');
    expect(navSource).not.toMatch(/\.observe\(\s*document(?:\.|\s*[,)]|\s*$)/m);
  });

  test('gate 10 — wrapper chain, frozen site boundary and authorized V5.9 successors remain exact', async ({ page }) => {
    await installLifecycleCapture(page);
    await installSupabaseMock(page);
    await openApp(page);

    await expect.poll(() => page.evaluate(() => Boolean(
      window.__option2cCapture?.baseValidate &&
      window.__option2cCapture?.sessionValidate &&
      window.__option2cCapture?.platformValidate &&
      window.__option2cCapture?.v52c2Validate
    )), { timeout: 15_000 }).toBe(true);

    const chain = await page.evaluate(() => {
      const capture = window.__option2cCapture;
      const knownStages = [
        capture.baseValidate,
        capture.sessionValidate,
        capture.platformValidate,
        capture.v52c2Validate,
      ];
      return {
        knownStagesAreFunctions: knownStages.every(fn => typeof fn === 'function'),
        knownStagesAreDistinct: new Set(knownStages).size === 4,
        baseToSessionWrapped: capture.baseValidate !== capture.sessionValidate,
        sessionToPlatformWrapped: capture.sessionValidate !== capture.platformValidate,
        platformToV52C2Wrapped: capture.platformValidate !== capture.v52c2Validate,
        knownLoadOrder: capture.validateOrder.slice(0, 4),
        currentFinalIsFunction: typeof window.validateStudentAccess === 'function',
      };
    });
    expect(chain).toEqual({
      knownStagesAreFunctions: true,
      knownStagesAreDistinct: true,
      baseToSessionWrapped: true,
      sessionToPlatformWrapped: true,
      platformToV52C2Wrapped: true,
      knownLoadOrder: ['base', 'session', 'platform-polish', 'v52c2'],
      currentFinalIsFunction: true,
    });

    const sessionSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-student-session.js'), 'utf8');
    const platformSource = fs.readFileSync(path.join(REPO_ROOT, 'site/v40-platform-polish.js'), 'utf8');
    const v52c2OwnerSource = fs.readFileSync(path.join(REPO_ROOT, 'site/topical-legacy-student-route.js'), 'utf8');
    expect(sessionSource).toContain('const validateStudentAccessV40Base = validateStudentAccess;');
    expect(sessionSource).toContain('return validateStudentAccessV40Base(requestedPurpose);');
    expect(platformSource).toContain('const validateBase = validateStudentAccess;');
    expect(platformSource).toContain('const access = await validateBase(purpose);');
    expect(v52c2OwnerSource).toContain('/* V5.2C.2 — Topical Practice result UX polish.');
    expect(v52c2OwnerSource).toContain('const base=validateStudentAccess;');
    expect(v52c2OwnerSource).toContain('const access=await base(purpose);');

    const changedSite = git(['diff', '--name-only', BASE_SHA, '--', 'site'])
      .split(/\r?\n/)
      .filter(Boolean)
      .sort();
    expect(changedSite).toEqual([
      ...Object.keys(RUNTIME_SUCCESSORS),
      ...Object.keys(AUTHORIZED_SITE_SUCCESSORS),
      ...[...AUTHORIZED_SITE_DELETIONS].sort(),
    ].sort());

    for (const [pathname, expected] of Object.entries(RUNTIME_SUCCESSORS)) {
      expect(gitBlob(pathname), `${pathname} successor bytes changed`).toBe(expected);
    }
    for (const [pathname, expected] of Object.entries(AUTHORIZED_SITE_SUCCESSORS)) {
      expect(gitBlob(pathname), `${pathname} successor bytes changed`).toBe(expected);
    }
    for (const [pathname, expected] of Object.entries(FROZEN_HIGH_RISK_BLOBS)) {
      expect(gitBlob(pathname), `${pathname} must remain byte-identical`).toBe(expected);
    }

    const authorizedSite = new Set([
      ...Object.keys(RUNTIME_SUCCESSORS),
      ...Object.keys(AUTHORIZED_SITE_SUCCESSORS),
    ]);
    expect(workingManifestHash(
      'site',
      authorizedSite,
      PHASE7BD_REPLACED_SITE_BASELINE_BLOBS,
    )).toBe(EXPECTED_FROZEN_SITE_SHA256);

    const authorizedSupabase = new Set(Object.keys(AUTHORIZED_SUPABASE_SUCCESSORS));
    expect(workingManifestHash('supabase', authorizedSupabase)).toBe(EXPECTED_SUPABASE_SHA256);
    for (const [pathname, expected] of Object.entries(AUTHORIZED_SUPABASE_SUCCESSORS)) {
      expect(gitBlob(pathname), `${pathname} successor bytes changed`).toBe(expected);
    }
    const changedSupabase = git(['diff', '--name-only', BASE_SHA, '--', 'supabase'])
      .split(/\r?\n/)
      .filter(Boolean)
      .sort();
    expect(changedSupabase).toEqual(Object.keys(AUTHORIZED_SUPABASE_SUCCESSORS).sort());
    expect(git(['rev-parse', `${BASE_SHA}:supabase`])).toBe(EXPECTED_SUPABASE_TREE);
  });
});
