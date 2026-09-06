# Student UI v2 — test prototype

## Open the prototype

- Branch: `feature/student-ui-v2`.
- Static route when serving the existing `site` directory: `/student-v2/`.
- No installation needed: open `site/student-v2/index.html` in a modern browser. The HTML contains its own CSS and JavaScript and works offline.
- The downloadable `Maths-Student-UI-Test.html` is the same compiled page with a friendly filename.
- Existing UI remains at `/`; no original frontend file is changed. More → About this test includes an explicitly labelled link to the current live UI in a separate tab. Nothing is transferred between the interfaces.

This route has **not** been deployed. A production URL ending in `/student-v2/` will not show this branch's prototype until a separate test deployment is explicitly arranged.

## Safety boundaries

The baseline is production commit `164bbe2c380b55f974223cb7715e2bd219ee216f` (V5.8 Stable). Every addition is inside `site/student-v2/`. No production file, authentication code, SQL, Supabase configuration, Edge Function, teacher interface or deployment workflow is modified.

The prototype has no Supabase SDK, credentials, imports, fetch calls or production session access. A Content Security Policy blocks network connections with `connect-src 'none'`. The optional outbound current-UI link is user navigation, not a data bridge.

The only persistence key is `maths-student-v2-demo-20260906`. It contains fictional demo activity only. When browser storage is unavailable, the app continues in memory. No real Student ID or PIN is requested. No service worker is installed. No backend tests or migrations are run.

## Implemented scope

- Home: Ahmad / Year 6A, XP and level, Continue Learning, Mixed / Topic / Past Papers, assignment details, recommendation, missions, badges, notifications and class challenge.
- Practice Hub: six entry paths, ten realistic primary topics, sample Paper 1 and Paper 2 choices for 2024 and 2025.
- Progress: accuracy, completed questions, topics, XP, encouraging topic bars, sample weekly chart, achievements and recent results.
- Interactive practice: 20 original questions, numeric and multiple-choice answers, equivalent fractions, units, two-part questions, accessible inline SVG maths diagrams, hints, correct/incorrect feedback, draft saving, pause/resume and results.
- Completed sessions update demo totals, topic evidence, weekly sessions, class progress and badge eligibility. XP is a deliberately simple demo rule: 10 per completed sample question. It does not represent or change the production XP rules.
- Browser hash navigation, labelled bottom tabs, desktop side navigation, focus states, large-text and calmer-colour settings, and demo reset confirmation.

The initial Continue session has five remaining questions after a fictional five-question checkpoint. The assignment starts with four of ten completed. Sample paper content is not an official past-paper transcription. The production grading engine, Exam Mode, answer release, account system and reporting are preserved but not exercised by this UI test. Production photo/image rendering is not changed; the mock flow demonstrates diagrams only.

## Files

| File | Purpose |
|---|---|
| `index.html` | Self-contained runnable page; includes CSP, shell and compiled CSS/JS |
| `styles.css` | Shared tokens, components, layouts, responsive and accessibility styles |
| `app.js` | UI views, demo questions, navigation and isolated state |
| `build.cjs` | Dependency-free bundler; updates the inline CSS/JS in index.html |
| `package.json` | Local development/build/check commands; no dependencies |
| `preview-server.cjs` | Development-only static server for this prototype |
| `qa.html` | Responsive iframe harness for browser QA, including text enlargement |
| `TEST-REPORT.md` | Validation evidence, limitations and next steps |

After editing CSS or JavaScript, run `node build.cjs`. Optional preview: `npm run dev -- --host 127.0.0.1 --port 4173`; open the displayed port in your own browser. `qa.html` provides 360, 390, 430, 768 and 1280 px viewport frames plus reduced-height and 200% text checks. It does not emulate a physical phone or touch keyboard.

## Next phase

Evaluate this mock prototype first. Then decide which views to retain. A later integration should adapt approved views to the existing session and read-only data APIs on a separate branch, with existing Practice/Exam engines still owning question retrieval, grading, saves and reporting. Real test accounts and a non-production backend would be required for end-to-end integration testing.
