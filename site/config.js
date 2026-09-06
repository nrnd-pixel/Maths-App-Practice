window.MATH_APP_CONFIG = {
  supabaseUrl: 'https://lmveznstltjxzpalcmid.supabase.co',
  supabasePublishableKey: 'sb_publishable_0ArG2t1Zgln135ctDR6pQw_QY_z3yf8',
  // Optional. Leave blank to use the current deployed page URL.
  // Example: 'https://your-site.netlify.app/'
  authRedirectUrl: ''
};

/*
 * V3.8.1 AI Help connectivity hotfix.
 *
 * Keep the normal Supabase client unchanged for the rest of the app. AI Help
 * requests are routed through a small compatibility Edge Function whose only
 * job is to handle browser CORS robustly, then forward the unchanged JSON body
 * to the protected V3.8 AI Help function. Student authorization remains the
 * temporary practice token inside the request body; no protected content or
 * service-role credential is exposed to the browser.
 */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const oldPath = '/functions/v1/student-ai-help-v38';
  const compatibilityPath = '/functions/v1/student-ai-help-v381';

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string'
      ? input
      : (input instanceof Request ? input.url : String(input?.url || input || ''));

    if (!url.includes(oldPath)) {
      return nativeFetch(input, init);
    }

    const redirectedUrl = url.replace(oldPath, compatibilityPath);

    if (input instanceof Request) {
      const redirectedRequest = new Request(redirectedUrl, input);
      return nativeFetch(redirectedRequest, init);
    }

    return nativeFetch(redirectedUrl, init);
  };
})();

/* Historical V5.1 bootstrap title; stable-release checkpoint layers apply the
   current release identity once the staged modules are loaded. */
document.title = 'Math Practice V5.1';

/* Stable V3.9/V4.x/V5.x foundation plus signed-off V5.4, V5.5 and V5.6 checkpoints.
   V5.6.1 keeps the student entry Practice-first. V5.7A adds secure cross-device
   Past Paper Practice checkpoints over the accepted V5.5C same-device fallback.
   V5.7A manual-test hardening keeps background checkpoint refreshes passive and
   preserves the explicit in-quiz cloud-save confirmation.
   V5.7B adds teacher assignment scheduling, close/reopen, reassign-as-new and
   student completion management without changing student grading or Exam Mode.
   V5.7C makes signed-in Home Practice-first: resume saved Past Paper work, surface
   teacher assignments, recommended Practice and the latest Practice result without
   requiring Exam access. V5.7D turns Past Paper Analytics into safe teacher actions:
   prepare targeted cohorts in the existing assignment form, open assignment
   management, or copy a teaching focus plan. V5.7D.1 hardens focus-plan copying
   with synchronous and selectable in-app fallbacks for restricted clipboard contexts.
   V5.7D performs no automatic assignment writes. V5.7E consolidates the accepted
   V5.7A-D sequence as the V5.7 stable release identity and audit checkpoint; the
   checkpoint itself makes no network or data writes. V5.7.1A adds a read-only
   student XP + level card on top of the accepted Continue Learning Home, derived
   from verified saved Practice activity and excluding Exam activity. V5.7.1B adds
   a gentle Practice streak and achievement badges derived from the same saved,
   non-Exam learning evidence; no streak/badge write path is introduced. V5.7.2 adds
   three weekly Practice missions that reset each Monday in Brunei time and are
   derived from saved non-Exam activity without a mission write path. V5.7.3 adds
   a cooperative class question challenge plus an alphabetical teacher motivation
   view for XP, streaks and weekly missions. It deliberately adds no leaderboard,
   class-v-class competition or gamification write path. V5.7.4 polishes the class
   challenge and adds teacher-only controls to enable/pause it and choose a target
   of 5, 10, 15 or 20 questions per active student. Student reads remain aggregate,
   Exam activity is excluded and XP rules are unchanged. V5.7.5 consolidates the
   accepted gamification sequence as a presentation/audit-only stable checkpoint;
   it adds no network calls, data writes or learning-rule changes. V5.7.6 adds an
   in-app student feedback form and secure teacher Feedback Inbox so classroom
   problems and suggestions can be captured without exposing access tokens, answers
   or grading data. V5.7.6.1 keeps that workflow unchanged while moving the student
   feedback trigger to a compact top-right Home icon. V5.7.6.3 mirrors that compact
   presentation for teachers by placing a proxy Feedback Inbox icon beside the
   Teacher Dashboard title without adding network calls. V5.8A adds a lightweight
   first-use Home card for students who have not yet earned the existing First
   Practice achievement. It prepares the established Mixed Practice controls for
   five questions and forwards to the existing Start Practice flow; assignments,
   saved Past Paper checkpoints, grading, XP and achievement ownership are unchanged.
   V5.8B adds a task-grouped Teacher Workspace launcher over the established teacher
   tools. It delegates to existing tabs and overlay triggers only; no analytics,
   assignment, reporting, content, feedback or data authority is duplicated.
   V5.8C adds a teacher-only parent/family progress summary derived entirely from
   the established Student Performance Report snapshot, with a printable Practice-
   focused view and no new reporting calculation, persistence or parent account.
   V5.8D consolidates the established content tools into a source-aware teacher route:
   Import, Validate, Review, Practice availability, topical publication and Audit.
   It is navigation/presentation only; Exam publication remains in Exam Settings and
   is intentionally not promoted while Exam Mode is deferred. V5.8 Stable then
   consolidates the accepted V5.8A-D sequence as the authoritative V5.8 release
   identity and audit checkpoint without adding network calls or data writes.
   Legacy release-label-only scripts remain archived in the repository; current
   staged loading remains coordinated by v40-release.js. */
window.addEventListener('load', () => {
  const stagedScripts = [
    './v38-ai-help.js',
    './v38-ai-admin.js',
    './v38-ai-polish.js',
    './v39-student-polish.js',
    './v39-practice-polish.js',
    './v39-dashboard-polish.js',
    './v39-state-polish.js',
    './v40-student-platform.js',
    './v40-student-nav.js',
    './v40-student-session.js',
    './v40-learn-setup.js',
    './v40-learning-priorities.js',
    './v40-platform-polish.js',
    './v40-release.js',
    './v40-start-shell.js',
    './v54-stable-release-checkpoint.js',
    './v55a-past-paper-practice.js',
    './v55a1-practice-type-guard.js',
    './v55b-full-paper-practice.js',
    './v55c-resume-past-paper-practice.js',
    './v55c1-resume-button-bridge.js',
    './v55d-past-paper-result-attribution.js',
    './v55-stable-release-checkpoint.js',
    './v56a-question-bank-response-filter.js',
    './v56a1-bulk-practice-confirmation-bridge.js',
    './v56b-teacher-assigned-past-paper-practice.js',
    './v56c-student-past-paper-progress.js',
    './v56d-teacher-past-paper-analytics.js',
    './v56-stable-release-checkpoint.js',
    './v561-practice-first-student-experience.js',
    './v57a-cross-device-past-paper-resume.js',
    './v57a1-cross-device-local-bridge.js',
    './v57a2-stale-local-checkpoint-cleanup.js',
    './v57b-teacher-assignment-management.js',
    './v57c-student-continue-learning-home.js',
    './v57d-past-paper-analytics-actions.js',
    './v57d1-focus-plan-copy-fallback.js',
    './v57-stable-release-checkpoint.js',
    './v571a-gamification-foundation.js',
    './v571b-streaks-achievements.js',
    './v572-weekly-missions.js',
    './v573-class-challenges-teacher-gamification.js',
    './v574-gamification-polish-teacher-controls.js',
    './v575-gamification-stable-checkpoint.js',
    './v576-classroom-feedback-support.js',
    './v5761-feedback-trigger-position.js',
    './v5763-teacher-feedback-header-icon.js',
    './v58a-student-first-use-experience.js',
    './v58b-teacher-workspace-consolidation.js',
    './v58c-parent-friendly-student-report.js',
    './v58c-parent-summary-workspace-shortcut.js',
    './v58d-content-workflow-consolidation.js',
    './v58-stable-release-checkpoint.js'
  ];

  if (new URLSearchParams(window.location.search).get('v59-student-home-preview') === '1') {
    // V5.9 preview layers remain test-only and presentation/delegation focused.
    stagedScripts.push('./v59-student-home-preview.js');
    stagedScripts.push('./v59b-student-practice-preview.js');
    stagedScripts.push('./v59c-student-quiz-result-preview.js');
    stagedScripts.push('./v59d-student-experience-preview.js');
    stagedScripts.push('./v59e-student-experience-polish.js');
    stagedScripts.push('./v59f-student-home-concept-polish.js');
    stagedScripts.push('./v59g-student-home-visual-fidelity.js');
  }

  stagedScripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  });
}, { once: true });