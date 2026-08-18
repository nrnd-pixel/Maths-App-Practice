# Maths Practice V3.2E — Exam Settings & Teacher Controls

V3.2E adds per-paper controls while preserving the V3.2D.1 Practice Mode, result-code and manual-review flows.

## New controls

- Duration: no timer, or a configured number of minutes.
- Answer release: immediately, after all manual reviews, or never.
- Availability: show or hide a paper in Exam Mode.
- Student instructions: paper-specific timing and answer-release rules are shown before starting.
- Timed exams: countdown, five-minute warning, one-minute urgent warning, and safe automatic submission at expiry.

Existing papers are seeded as available, untimed, with immediate answer release.

## Files to deploy

- `index.html` — V3.2E webapp.
- `migrate-v3.2D.1-to-v3.2E-exam-settings.sql` — run once in Supabase before deploying the page.
- Keep the deployed site's existing working `config.js` and `images/` when using the upgrade package.

See `DEPLOY-AND-TEST-V3.2E.md` for the short rollout and regression checklist.
