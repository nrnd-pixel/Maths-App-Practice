# SESSION-STATE.md
# Update this file at the end of each session.
# Claude reads it at the start of each conversation.

## Verified main SHA
`7c7a8ad47256b9e7580178d80f95f6c468b18d19`

## Open PRs
| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #237 | feature/209-adaptive-diagnostic-pilot | DRAFT — no merge | Issue #209, pilot only |
| #180 | Science V0.2 | Parked | Isolated, low urgency |

## Next priority
Demo routes (#204/#205) if actively demoing; Stage 3F-B adaptive pilot when students available.

## Recent merges (this session)
| PR | What |
|----|------|
| #346 | feat: v59e result next-step prompt + v59f achievements grid |
| #345 | fix: student-facing language polish — 23 copy changes for Year 4–6 |
| #344 | feat: engagement boost — XP celebration, streak urgency, Student ID pre-fill |

## Key SHA values
- BASE_SHA (seal verifiers): `653aec5e06e1bf1669b4c9c0cd3e91069715de45`
- Supabase tree SHA: `4e4f573f452e6d9ab628b163329fea356bcb16e9`
- Current app version: `5.9`
- config.js blob (post-#346): `d8fe9bb121f3c6526c7ec86ca0206b37a9432b72`

## Loader manifest (updated PR #346)
- Tier 1 (config.js): **49 scripts** (was 47)
- Tier 2 (v40-release.js): 41 scripts
- Total: 90 symbolic positions
- All Phase 7B/7D-A/7D-C/7D-D verifiers updated to match

## Student UX improvements shipped (this session)
- PR #345: 23 language changes — removed jargon, simplified copy
- PR #346:
  - v59e: result screen "What to do next" prompt (score-aware, shows recommended topic)
  - v59f: achievements grid — all 8 badges with progress indicators for locked ones
  - Phase 5C: already complete (spec + verifier + CI gate all in place, no work needed)

## CI improvements (PR #345)
- Sentinel file approach for verifier failure detection (replaces unreliable continue-on-error + steps.*.outcome)

## Notes for next session
- Provide GitHub token at session start (not stored here)
- Token needs: Contents + Pull requests + Workflows write permissions
- Keep-alive cron running nightly 23:00 UTC (07:00 Brunei)
- PWA live — students can install to home screen
