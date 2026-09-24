# SESSION-STATE.md
# Update this file at the end of each session.
# Claude reads it at the start of each conversation.

## Verified main SHA
`7f677690e08a5044987750f849f93e05a72f6030`

## Open PRs
| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #237 | feature/209-adaptive-diagnostic-pilot | DRAFT — no merge | Issue #209, pilot only |
| #180 | Science V0.2 | Parked | Isolated, low urgency |

## Next priority
Demo routes (#204/#205) if actively demoing; otherwise Stage 3F-B adaptive pilot when students available.

## Recent merges (this session)
| PR | What |
|----|------|
| #345 | fix: student-facing language polish — 23 copy changes, remove jargon for Year 4–6 |
| #344 | feat: engagement boost — XP celebration, streak urgency, Student ID pre-fill |
| #343 | chore: add SESSION-STATE.md to repo root |
| #342 | chore: Supabase keep-alive cron (07:00 Brunei daily) |
| #341 | feat: PWA support — installable app icon |
| #340 | feat: V5.9A nature/explorer theme + Quick 5 shortcut |

## Key SHA values
- BASE_SHA (seal verifiers): `653aec5e06e1bf1669b4c9c0cd3e91069715de45`
- Supabase tree SHA: `4e4f573f452e6d9ab628b163329fea356bcb16e9`
- Current app version: `5.9`
- config.js blob: `7307eae1b864bf05778f6daacc7a099b7b563e90`

## Loader manifest (updated PR #344)
- Tier 1 (config.js): **47 scripts**
- Tier 2 (v40-release.js): 41 scripts
- Total: 88 symbolic positions

## Student language polish (PR #345 — merged)
All changes in `site/index.html` only, presentation layer:
- Sign-in: "Start practising" / "Start Learning" button
- Badge: "Version 5.9 • Maths Practice" (version prefix kept for verifier)
- Difficulty: Easy / Medium / Hard
- Strand → "Topic area"
- Result: "Your score" (was "First-try score"), sync stat hidden
- Result code: "Your practice code"
- Streak/goal: "meaningful" removed
- Release note/PIN disclaimer hidden from students
- CI fix: sentinel-file approach for verifier step (eliminates continue-on-error outcome leak)

## Notes for next session
- Provide GitHub token at session start (not stored here)
- Token needs: Contents + Pull requests + Workflows write permissions
- Keep-alive cron running nightly 23:00 UTC (07:00 Brunei)
- PWA live — students can install to home screen
