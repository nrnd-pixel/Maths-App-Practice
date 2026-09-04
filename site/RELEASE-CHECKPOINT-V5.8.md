# Maths Practice V5.8 Stable Release Checkpoint

Date: 2026-09-04

## Accepted base

- Production `main` before this checkpoint: `4f88bc2153c32434a130dbe54310595839148423`
- Accepted feature sequence: V5.8A through V5.8D
- Supabase project: `SR Lumapas Math Practice`
- No new Supabase migration or data mutation is required by this stable checkpoint

## V5.8 accepted scope

### V5.8A — Student First-Use Experience

New students who have not yet earned the existing First Practice achievement receive one clear Home action: start five Mixed Practice questions. The card reuses the established Practice controls and start button, respects saved Past Paper checkpoints and active teacher assignments, and disappears after the existing server-derived First Practice evidence is present. No onboarding datastore, grading path, XP rule or achievement write path was added.

### V5.8B — Teacher Workspace Consolidation

The Teacher Dashboard now offers a cleaner task-grouped workspace covering Monitor, Teach, Students, Content and Reports & Support. The workspace is a launcher only. The full original teacher tool row remains available underneath, including Exam Settings, Results, Exam Attempts and specialist tools that are not promoted in the simplified workspace.

### V5.8C — Parent-Friendly Student Report

Teachers can open a concise parent/family Practice progress summary derived from the existing Student Performance Report snapshot. It includes learner identity, recent Practice evidence, strengths, focus areas, a suggested next step and a printable A4 view. It does not create a parent login, a second reporting engine or a new persistence path, and it does not present Practice evidence as an official exam grade.

### V5.8D — Content Workflow Consolidation

The existing content-management tools are linked into one source-aware route: Import, Validate, Review, Practice availability, topical publication and Audit history. The workflow delegates to the established import package preview, Question Bank QA, review workflow, Practice eligibility controls, Topical Exercise Library publication controls and correction-history viewer. Exam publication remains under Exam Settings and is intentionally not promoted while Exam Mode is deferred.

## Stable release identity

The final V5.8 presentation advances to:

- Document title: **Math Practice V5.8**
- Start badge: **Version 5.8 • Stable Release**
- Release Audit heading: **V5.8 Release Audit**
- Release note: summarizes student first-use guidance, the cleaner teacher workspace, parent-friendly reporting and the consolidated content workflow

The accepted V5.7, V5.6, V5.5 and V5.4 stable/audit foundations remain retained below the V5.8 checkpoint. V5.8 adds a new checkpoint summary rather than rewriting historical release evidence.

## Product boundaries retained

- The student entry remains Practice-first.
- Saved Past Paper Practice, teacher assignments, recommendations, gamification and classroom feedback remain within their accepted V5.7 boundaries.
- Mixed Practice, Topic Practice and Past Paper Practice retain deterministic grading and their accepted feedback behaviour.
- The full teacher toolset remains available even where V5.8B provides a simplified launcher.
- The detailed Student Performance Report remains available alongside the parent-friendly summary.
- Existing Question Bank, Bulk Import, QA, review, Practice eligibility, topical publication and audit tools remain the workflow owners.
- Exam Mode remains preserved in code, data, teacher publication controls, existing attempts and historical results, while its student entry remains deferred.
- The V5.8 Stable checkpoint is presentation/audit-only and makes no network calls.
- The checkpoint does not change Supabase data, authentication, grading, Practice retrieval, assignments, results, question content, feedback records, gamification rules or the preserved Exam engine.

## Release gates

Before merge:

1. Existing V5 Regression Safety is green on the exact PR head.
2. V5.7 Stable Release Checkpoint remains green.
3. V5.7.5 gamification and V5.7.6 feedback regressions remain green.
4. V5.8A Student First-Use regression is green.
5. V5.8B Teacher Workspace regression is green.
6. V5.8C Parent-Friendly Student Report regression is green.
7. V5.8D Content Workflow regression is green.
8. V5.8 Stable Release Checkpoint CI is green.
9. Netlify deploy preview is green.
10. Student smoke test: Home and Practice-first flow work normally, the first-use card behaves correctly where applicable, feedback remains accessible, and the visible badge settles on **Version 5.8 • Stable Release**.
11. Teacher smoke test: Teacher Workspace, Parent Summary, Content Workflow, Feedback Inbox and original All teacher tools remain accessible.
12. Release Audit shows the V5.8 checkpoint above the retained V5.7, V5.6, V5.5 and V5.4 audit foundations.

No new Supabase migration or data mutation is required for this release checkpoint.
