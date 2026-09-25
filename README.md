# Maths Practice App

A Year 4-6 Mathematics practice app for Brunei primary school students, built for classroom use with a teacher-facing admin side and a student-facing learning side.

**Live site:** https://magical-pixie-a61111.netlify.app

## What it does

**For students**
- Practice sessions with hints, second attempts and instant feedback
- Exam Mode: full past papers with no hints until submission
- Gamification: XP, streaks, badges, personal bests, weekly missions
- My Progress dashboard with recommended topics and achievement tracking
- Works offline after first visit (PWA, installable to home screen)

**For teachers**
- Manage classes and student rosters
- Assign practice sessions and past papers
- Question bank with full CRUD, bulk CSV import and QA tooling
- Results, analytics and learning insights export
- Parent-friendly student progress reports

## Tech stack

- **Frontend:** Vanilla JS, no framework, no build step, served statically from Netlify
- **Backend:** Supabase (PostgreSQL + Row-Level Security + Edge Functions)
- **Auth:** Supabase Auth (teacher login); student access via class ID + PIN
- **CI:** GitHub Actions - 124 static verifiers + 37 Playwright specs

## Repo layout

```
site/          deployed app (Netlify publish dir)
  index.html   app shell + inline JS (teacher + student combined)
  config.js    Supabase config + 57-script tier-1 loader
  v40-*.js     frozen core wrapper chain (do not modify without care)
  v59*.js      current V5.9 feature scripts
  images/      past paper question images (PNG + WebP)
  sw.js        service worker (cache-first for assets)
  tests/       124 static CJS verifiers
supabase/      SQL migrations (never modify without explicit approval)
e2e/           Playwright test suite (37 specs)
tooling/       loader manifest and phase7 tooling
docs/          roadmap, decisions, known issues, source data
```

## Development

No build step. Edit files in `site/`, commit to a branch, open a PR.
Netlify deploys a preview automatically. CI runs on every PR targeting `main`.

Always branch from verified current `main`. Never commit directly to `main`.
See `docs/DECISIONS.md` for standing engineering rules.

## Frozen files

These own critical wrapper chains and must not be modified without mapping impact first:

- `v40-student-session.js`, `v40-platform-polish.js`, `v40-release.js`, `v40-start-shell.js`
- `v41-signin-guard.js`
- `v51-exam-publication-safety.js`, `v50-security-hardening.js`
- `v52b1-question-bank-observer-gate.js`
- `v581a-practice-cloud-result-reconciliation.js`
- All `supabase/*.sql` files
