# Maths Practice V5.7.5 Gamification Stable Release Checkpoint

Date: 2026-09-03

## Accepted base

- Production `main` before this checkpoint: `cada087966746a0fdbdba71912470d5705bb568e`
- Accepted gamification sequence: V5.7.1A through V5.7.4
- Supabase project: `SR Lumapas Math Practice`
- No new Supabase migration or data mutation is required by this stable checkpoint

## Accepted gamification scope

### V5.7.1A — XP + Levels

Student XP and levels are derived from saved Practice evidence. First-try and second-try correctness plus accepted Practice completion bonuses contribute to XP, while Exam activity is excluded. Refreshing the browser cannot duplicate XP because the browser does not own an XP ledger.

### V5.7.1B — Practice Streaks + Achievement Badges

Students receive a gentle Practice streak and an achievement gallery based on meaningful saved Practice evidence. Historical Practice can unlock existing badges without generating repeated celebration popups.

### V5.7.2 — Weekly Missions

Students receive three weekly missions: Question Quest, Keep It Going and Challenge Complete. Progress resets each Monday using Brunei time and is derived from saved non-Exam Practice activity.

### V5.7.3 — Cooperative Class Challenge + Teacher Motivation

Students see aggregate Class Question Quest progress without classmates' names or rankings. Teachers can inspect an alphabetical class motivation view covering XP, levels, streaks, weekly questions, Practice days and mission completion. The design deliberately avoids public leaderboards and class-v-class ranking.

### V5.7.4 — Gamification Polish + Teacher Controls

Teachers can enable or pause the cooperative challenge per class and select 5, 10, 15 or 20 Practice questions per active student. The class target recalculates from the active roster size. Student challenge reads remain aggregate-only. XP rules, grading and Exam behavior are unchanged.

## V5.7.5 release identity

The final gamification checkpoint advances presentation to:

- Document title: **Math Practice V5.7.5**
- Start badge: **Version 5.7.5 • Gamified Practice Release**
- Release Audit heading: **V5.7.5 Release Audit**
- Release note: summarizes XP, levels, streaks, badges, weekly missions and cooperative class motivation

The accepted V5.7 stable checkpoint and V5.6/V5.5/V5.4 audit foundations remain retained below the V5.7.5 checkpoint.

## Product boundaries retained

- Student entry remains Practice-first.
- Continue Learning priority remains unchanged.
- Past Paper Practice, cross-device resume and teacher assignments retain their accepted behavior.
- Exam Mode remains preserved in code/data/teacher publication controls while the student entry stays hidden.
- This V5.7.5 checkpoint makes no network calls and performs no Supabase writes.
- Existing V5.7.4 teacher challenge settings remain functional; this checkpoint does not change them.
- No leaderboard, class-v-class ranking, coin shop or answer/hint advantage is introduced.
- No answer keys, correct-answer snapshots, PINs, student access tokens or service-role credentials are added.

## Release gates

Before merge:

1. V5 Regression Safety is green on the exact PR head.
2. V5.7 Stable Release Checkpoint remains green.
3. V5.7.1A, V5.7.1B, V5.7.2, V5.7.3 and V5.7.4 regressions are green.
4. V5.7.5 Gamification Stable Checkpoint CI is green.
5. Netlify deploy preview is green.
6. Student smoke test: title/badge show V5.7.5; XP/levels, streaks, badges, Weekly Missions and Class Question Quest render normally; Continue Learning and Practice remain normal; Exam entry remains hidden.
7. Teacher smoke test: Class Motivation and Class Challenge settings open normally; challenge enable/pause and selected target still persist.
8. Release Audit shows the V5.7.5 gamification checkpoint above the retained V5.7 and earlier audit foundations.

No new Supabase migration or data mutation is required for this release checkpoint.
