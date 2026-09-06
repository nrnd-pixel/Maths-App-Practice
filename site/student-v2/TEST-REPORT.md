# Student UI v2 — test report

Status: interactive mock prototype complete; not production-ready and not deployed.

## Environment and method

Browser: hosted Chrome, through the supported browser-control surface. The prototype was served by a supervised development-only server. Responsive testing used a same-origin iframe harness at explicit CSS viewport sizes. Desktop Chrome scrollbars consume 15 px where visible; scroll width was compared against the actual available client width. This is responsive browser testing, not physical-device or Safari validation.

## Results

| Check | Evidence / result |
|---|---|
| Mobile 360 × 800 | Home, Practice, Progress: no horizontal overflow; visible buttons at least 44 × 44 CSS px |
| Primary 390 × 844 | Same checks passed; visually reviewed Home; Continue and three practice paths reachable |
| Mobile 430 × 932 | Same checks passed |
| Tablet 768 × 1024 | Same checks passed; Progress visually reviewed with two-column cards |
| Desktop 1280 × 900 | Same checks passed; side navigation and constrained content width visually reviewed |
| Home interactions | Continue, Mixed, Topic, Past Papers, assignment, recommendation, mission details, badge dialog and class challenge opened correctly |
| Bottom navigation | Home / Practice / Progress / Badges / More: correct destinations and `aria-current="page"` |
| Practice completion | Completed initial five remaining questions; four correct and one incorrect produced 4/5, worked answers and +50 demo XP |
| Equivalent fractions | 6/8 accepted for 3/4 in the shaded-strip question |
| Incorrect response | 65 for 6.4 × 10 produced encouraging correction and the answer 64 |
| Multipart question | 48 and 43 accepted for parts (a) and (b); a two-question session completed with 2/2 |
| Draft / resume | Multipart draft 48 / 43 survived Save & leave → Continue; page reload retained demo totals and the unfinished session |
| Past Papers | Sample Paper 2 opened the multipart practice flow; original live past-paper engine was not invoked |
| Assignment / recommendation | Details and practice start paths passed; switching from unfinished work prompts Resume or Start new sample |
| Back / scroll | Visible Back controls returned to their expected parent screens; route transitions reset scroll and focus to main |
| Keyboard-space simulation | At 390 × 430, the focused second answer field was within the viewport and Check answer remained reachable by scrolling |
| Text enlargement | At 200% text size on 390 px Home, Practice and Progress: no page overflow after reflow fix |
| Settings | Larger text and Calmer colours checkboxes changed and restored their states |
| Loading | Inline, dependency-free page rendered after reload; no loading placeholders or remote assets required |
| Static integrity | JavaScript syntax checked; bundled script/CSS match source; no production client or network request path present |

## Defects found and fixed

1. The original build replacement treated the literal `B$` currency text as a replacement token, causing an inline syntax error. Changed the bundler to callback replacements and retested in the browser.
2. A decorative greeting symbol wrapped awkwardly on mobile. Removed it.
3. Large text overflowed the practice cards and some navigation labels. Added flexible grid sizing and text wrapping; the three primary screens passed the 200% recheck.
4. The recommendation continued to say “0 more practice sessions” after badge eligibility. Replaced it with an unlocked-state message.
5. Reopening an active assignment could offer to replace itself. It now resumes that assignment.
6. The skip link could be interpreted as an application route. It now focuses main without changing the screen.

No unresolved blocking defect was found in the tested paths. This is not a complete accessibility certification or an exhaustive device regression.

## UX review for ages 9–12

The first viewport gives a personalised greeting, one dominant Continue action and three distinct Practice choices. Secondary cards stack on phones instead of compressing assignment and progress text into narrow columns. Hints, correction and rest-day wording encourage effort; the class challenge does not rank pupils. Buttons have labels as well as icons. Topic progress uses positive language and visible percentages rather than colour alone.

The Home page is still fairly long because all requested sections are present. Observe whether students notice assignments without scrolling too far. Recommendation wording, XP and badge terminology should be tested with the class. No animation, sound or competitive leaderboard was added.

## Comparison with the reference

Captured: blue personalised header, prominent purple Continue card, green/blue/gold practice pathways, rounded modular cards, gamified progress, cooperative challenge and clear five-tab mobile navigation.

Differences: initials avatar rather than a copied character; original abstract maths tiles rather than mountain artwork; geometric original badge; secondary cards stacked on small screens; desktop navigation moved to the side. These choices reduce asset weight, distractions and crowded text. This prototype is visually simpler than the reference and does not reproduce its 3D artwork.

## Limits and next validation

- All accounts, papers, recommendations, dates, streaks and class totals are fictional. No real student data, production auth, Supabase RPC, marking, AI help, Exam recovery or teacher reporting was tested.
- The weekly chart and five-day streak are seeded display examples, not a calendar engine. Demo XP is not production XP.
- Large text and reduced-height checks are simulations; test an actual Android keyboard, iOS Safari, 200% browser zoom and assistive technology next.
- Browser reload was tested on HTTP. File-based browser storage behaviour varies; the memory fallback is provided, but every browser's file mode was not tested.
- Reset's destructive confirmation path is present; automated validation did not clear the browser's test state.
- The current-UI link is deliberately labelled as the live app. It was not opened or used for test submissions.

## Recommended student trial

With 3–5 pupils, observe: resume a practice; locate an assignment; choose a topic; understand a corrected answer; find the next topic from Progress. Record hesitation, mis-taps, whether the children distinguish assignments from optional practice, and whether they understand XP and accuracy. Use this fictional prototype only, with teacher supervision.

Next phase: simplify from student feedback, add Malay wording where useful, then connect only approved UI components to a dedicated non-production environment while preserving the existing backend and question engine contracts.
