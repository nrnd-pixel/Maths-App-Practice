# Phase 0 — Core browser E2E safety net

This folder is intentionally isolated from the live `site/` deployment. It adds real browser tests without adding a build step to Netlify or changing production app files.

## What these tests exercise

The suite opens the real rendered Maths App and drives the UI with Playwright. It currently covers the core flows that would be most costly to break:

1. Student ID + PIN sign-in
2. Starting a Practice session
3. Answering a rendered Practice question
4. Submitting Practice and seeing the saved result
5. Student sign-in persistence across reload without retaining the PIN
6. Teacher login
7. Teacher Analytics tab access

The six Playwright test cases cover those seven user behaviours; starting and answering Practice are deliberately kept together as one end-to-end flow.

## Production-data safety

The tests do **not** use real student or teacher credentials and do **not** write to the production database.

Before the page loads, Playwright intercepts every request to `*.supabase.co` and serves deterministic E2E fixtures for the access policy, student login, question bank, Practice submission, result lookup and teacher authentication. Unexpected direct write requests are rejected and fail the relevant smoke flow.

This means the suite still executes the real HTML, JavaScript patch chain, DOM events, authentication UI and result rendering while keeping backend data isolated.

## Run locally

From the repository root:

```sh
cd e2e
npm install
npx playwright install chromium
npm test
```

By default Playwright starts the dependency-free local server in `serve.cjs` and serves `site/` at `http://127.0.0.1:4173`.

## Run against a Netlify deploy preview

The same suite can point at a rendered branch/PR preview instead of the local server:

```sh
cd e2e
E2E_BASE_URL="https://YOUR-DEPLOY-PREVIEW.netlify.app" npm test
```

Supabase traffic is still intercepted, so a preview run does not create production test records.

## CI role

`.github/workflows/core-e2e.yml` runs this browser suite on pull requests to `main`. This is the Phase 0 safety signal for core user flows.

The existing `site/tests/verify-*.cjs` files are intentionally left untouched. They may continue to exist for historical checks, but this browser suite is the meaningful functional signal introduced in Phase 0.
