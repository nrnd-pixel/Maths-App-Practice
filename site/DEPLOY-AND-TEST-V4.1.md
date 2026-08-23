# Deploy and Test — Maths Practice V4.1

## Release scope

V4.1 is the **Mastery & Mistake Recovery** release. It builds on the frozen V4.0 Student Learning Platform and adds:

- V4.1A Actionable Focus Areas;
- V4.1B Practice Mistake Recovery;
- secure multi-session Practice ticket rotation;
- V4.1C Mastery Progress;
- the PIN Enter-key sign-in guard;
- V4.1D Home learning-loop priorities and release polish.

V4.1 requires **no new SQL migration**.

## Baselines

- Stable V4.1 application merge baseline: `c03a294c65e46693b90e55cf12216a1b643c5902`
- V4.1C tested baseline before the final V4.1D slice: `ab3b7df0dde6e1e2aee6e7769566cf45b1725339`
- Frozen V4.0 production/docs baseline: `408386a068cf10e923cd0400796be87d13486143`
- V4.0 application merge baseline: `c95020073c66d1a87784c669ec8091a219891dbe`

The stable V4.1 application merge has been recorded in `README.md`.

## Before deployment

- [ ] Work from the V4.1 release branch / pull request only.
- [ ] Confirm `config.js` still contains the existing production Supabase URL and browser-safe key.
- [ ] Do not replace or regenerate production `config.js` for V4.1.
- [ ] Do not run a Supabase SQL migration for V4.1.
- [ ] Confirm no answer keys or PIN values have been added to browser storage.
- [ ] Confirm Practice and Exam still use separate temporary access tickets.
- [ ] Confirm Exam Mode and Exam Assignments remain AI-free.
- [ ] Confirm no page-wide recursive `MutationObserver` was introduced.

## Deploy Preview smoke test

### 1. Version and logged-out shell

- [ ] Browser title shows `Math Practice V4.1` after the app loads.
- [ ] Visible badge shows `Version 4.1 • Mastery & Mistake Recovery`.
- [ ] Logged-out page shows the Student ID/PIN sign-in experience.
- [ ] No Practice or Exam starts automatically while logged out.

### 2. Student sign-in

Test both paths:

- [ ] Enter Student ID + PIN and press **Enter** in the PIN field.
- [ ] Confirm sign-in lands on **Home** only.
- [ ] Log out.
- [ ] Sign in using **Sign in to Learning Hub**.
- [ ] Confirm sign-in again lands on **Home** only.
- [ ] Confirm the PIN field is cleared after sign-in.
- [ ] Confirm refresh restores the signed-in browser session when still within the V4 session lifetime.

### 3. Home learning priority

The intended priority order is:

1. in-progress assignment;
2. active assignment ready to start;
3. Focus Area / mastery practice;
4. Recommended Practice;
5. general Learn.

For the available test student:

- [ ] Confirm Home loads a personalised **Your next step** card.
- [ ] If the student has an in-progress assignment, it remains the highest priority.
- [ ] Otherwise, if the student has an active assignment, it remains ahead of optional Practice.
- [ ] Otherwise, if Progress contains a `Needs attention` or `Developing` topic, Home shows **🌱 Strengthen <topic>**.
- [ ] Confirm the Home focus topic matches a topic shown in **Progress → My Focus Areas**.
- [ ] Confirm `Needs attention` is preferred ahead of `Developing`; within the same state, the lower mastery percentage is preferred.
- [ ] Confirm Home shows `5 questions` and the same current mastery percentage returned by Progress.
- [ ] Click **Practice this Focus** and confirm a targeted Practice set starts for that topic.
- [ ] If fewer than five matching questions exist, confirm the existing Practice engine safely uses the available number rather than failing.

### 4. Practice and mistake recovery

- [ ] Complete a Practice set with at least one first-try correct response.
- [ ] Complete at least one response correctly on the second try.
- [ ] Leave at least one auto-marked response incorrect after the final try.
- [ ] Finish Practice.
- [ ] Confirm **Your learning summary** shows the expected first-try / corrected / still-needs-work counts.
- [ ] Confirm pending teacher-reviewed drawing/manual responses are not counted as `still needs work` while awaiting review.
- [ ] Click **Practice what I struggled with**.
- [ ] Confirm the recovery set loads without requesting the PIN again.
- [ ] Confirm answer grading works normally in the second Practice session.
- [ ] Start one additional Practice session and confirm ticket rotation still permits secure grading.

### 5. Mastery Progress

- [ ] Open **Progress**.
- [ ] Confirm the **🌱 Mastery Progress** guide appears.
- [ ] Confirm states are shown as:
  - 🔴 Needs attention
  - 🟠 Developing
  - 🟢 Secure
- [ ] Confirm topic percentages read **current mastery** and the underlying percentages are unchanged.
- [ ] Confirm **Practice this topic** still launches the correct topic.
- [ ] If a secure improvement milestone exists, confirm **📈 Recent improvement** shows the same previous/recent percentages and the correct point gain.

### 6. Assignments and Exam regression

- [ ] Open Assignments and confirm existing assignment states still load.
- [ ] Resume an in-progress Exam Assignment if one is available.
- [ ] Confirm Exam save/resume/exit safeguards remain unchanged.
- [ ] Confirm Exam Mode contains no AI Learning Help.
- [ ] Confirm Exam Assignments remain AI-free.
- [ ] Confirm final submission/result flow still works.

### 7. Reviewed Work and teacher workflows

- [ ] Open Reviewed Work and confirm reviewed responses load normally.
- [ ] Confirm answer-release behaviour remains unchanged.
- [ ] Teacher login/dashboard still loads.
- [ ] Teacher results, analytics, classes, assignments and Review Queue remain accessible.
- [ ] Existing duplicate-protection behaviour remains unchanged.

### 8. AI Help regression

- [ ] Practice AI Learning Help still loads through the existing V3.8.1 routing/security path.
- [ ] Nudge and guided help work as before.
- [ ] Explain-my-mistake remains gated until the relevant response state permits it.
- [ ] No AI Help is available in Exam Mode or Exam Assignments.

### 9. Mobile / narrow viewport

- [ ] Home priority card wraps cleanly.
- [ ] `Practice this Focus` remains full-width/readable when appropriate.
- [ ] Mastery Progress cards remain readable.
- [ ] Practice response controls remain usable.
- [ ] Persistent student navigation remains usable without covering required controls.

## V4.1 release result

The V4.1D Deploy Preview and regression checks passed before merge. The stable application merge is:

`c03a294c65e46693b90e55cf12216a1b643c5902`

Treat V4.1 as the frozen production baseline after final documentation housekeeping is merged. Begin V4.2 from that clean `main` state.

## Rollback

If only the V4.1D final slice needs rollback, restore the tested V4.1C baseline:

`ab3b7df0dde6e1e2aee6e7769566cf45b1725339`

If a full V4.1 rollback is required, restore the frozen V4.0 baseline:

`408386a068cf10e923cd0400796be87d13486143`

Preserve the existing production `config.js`. V4.1 has no SQL migration, so an application rollback requires **no SQL rollback**.
