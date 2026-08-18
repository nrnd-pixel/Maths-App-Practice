# V3.3 Learning Insights

## Purpose

V3.3 helps teachers move from participation counts to actionable learning evidence without changing how students practise, sit exams, receive feedback or retrieve reviewed work.

## New teacher experience

- The Analytics tab groups response records by topic and lists recorded skills or subtopics.
- Each topic card reports learners represented, scored responses, marks awarded, marks possible and pending teacher review.
- A learner profile opens from each student summary row and shows the learner's filtered topic evidence and recent completed Practice or Exam activity.
- The Learning CSV export follows the same period, class, year, activity and student-search filters as the dashboard.

## Calculation rules

- Auto-marked and completed teacher-reviewed responses contribute `marks_awarded / marks_possible`.
- A response with `review_status = pending` is shown as pending and excluded from the percentage.
- Fewer than three scored responses is labelled **Early evidence**.
- Three or more scored responses below 60% is labelled **Needs attention**.
- Three or more scored responses from 60% to 79% is labelled **Developing**.
- Three or more scored responses at 80% or above is labelled **Secure**.
- These labels are screening cues, not formal grades. Teachers should consider the response count and question coverage.

## Data and security

V3.3 creates no table, column, view, policy or RPC. The authenticated Teacher Dashboard loads complete paginated `session_answers` rows through the existing teacher policy, while the Review Queue continues to display only pending and reviewed manual responses. No new student data is exposed and no answer-release rule is changed.

## Compatibility

The V3.2G.3 client behavior remains the baseline. Existing question imports, exam attempts, result codes, manual marking, student access, classes, assignments and exports remain supported.
