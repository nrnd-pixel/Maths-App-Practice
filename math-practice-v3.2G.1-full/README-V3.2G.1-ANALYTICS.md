# Maths Practice V3.2G.1 — Teacher Analytics Foundation

V3.2G.1 adds a teacher-only Analytics area while preserving all V3.2F.3 student access, Practice, Exam, assignment, result-code and manual-review behaviour.

## Added

- Overview cards for participating students, completed Practice sessions, Exam papers started/submitted, in-progress/incomplete exams, pending review and average final Exam score.
- Period, class, year, activity-mode and student filters.
- Separate participation and completion definitions.
- Active-roster, registered-participant, no-activity, other-participant and fully-marked summaries.
- Per-student Practice and Exam activity table.
- Final Exam averages that exclude results still awaiting teacher review.
- CSV export of the currently filtered student summary.
- Horizontally scrollable Teacher Dashboard tabs on narrow screens.

## Definitions

- **Participated:** completed a Practice session or started an Exam paper in the selected period.
- **Completed paper:** the Exam paper was submitted manually or safely auto-submitted when time expired.
- **Fully marked:** the submitted paper has no teacher-marked responses still awaiting review.
- **Other participant:** activity with an ID/name that is not currently matched to an active roster entry.

Practice and Exam data remain separate. Pending manual marks are never treated as incorrect or included in a final Exam average.

## Database

No Supabase migration is required. V3.2G.1 uses the tables and teacher permissions already installed by V3.2F.3.
