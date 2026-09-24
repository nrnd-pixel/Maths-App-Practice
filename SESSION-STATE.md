# SESSION-STATE.md
# Update this file at the end of each session.
# Claude reads it at the start of each conversation.

## Verified main SHA
`410485abb77c99ed0ffaa33caf4dd806f024217a`

## Open PRs
| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #237 | feature/209-adaptive-diagnostic-pilot | DRAFT — no merge | Issue #209, pilot only |
| #180 | Science V0.2 | Parked | Isolated, low urgency |

## Next priority
Demo routes (#204/#205) if actively demoing, otherwise Stage 3F-B adaptive pilot when students available.

## Recent merges (this session)
| PR | What |
|----|------|
| #344 | feat: engagement boost — XP celebration, streak urgency, Student ID pre-fill, first-practice moment |
| #343 | chore: add SESSION-STATE.md to repo root |
| #342 | chore: Supabase keep-alive cron (07:00 Brunei daily) |
| #341 | feat: PWA support — installable app icon on home screen |
| #340 | feat: V5.9A nature/explorer theme + Quick 5 shortcut |
| #339 | fix: open-access fields hidden until policy known |
| #338 | fix: open-access fields CSS (superseded by #339) |
| #337 | fix: layout shift — inline CSS + pre-render teacher zone |
| #336 | fix: sign-in flash — Connecting badge + hidden placeholder |
| #335 | perf: eliminate duplicate boot RPC |

## Key SHA values
- BASE_SHA (seal verifiers): `653aec5e06e1bf1669b4c9c0cd3e91069715de45`
- Supabase tree SHA: `4e4f573f452e6d9ab628b163329fea356bcb16e9`
- Current app version: `5.9`
- Option 2C RUNTIME_SUCCESSORS index.html blob: `15b4f5c531b34db61981a9a93719a3aa01f0c8b7`
- config.js blob (updated by #344): `7307eae1b864bf05778f6daacc7a099b7b563e90`

## Loader manifest (updated by #344)
- Tier 1 (config.js): **47 scripts** (was 45)
- Tier 2 (v40-release.js): 41 scripts
- Total symbolic positions: 88 (was 86)
- All Phase 7B/7D-A/7D-C/7D-D verifiers updated to match

## Load performance (all fixed)
- Local Demo flash → fixed (#336)
- Loading placeholder → fixed (#336)
- Card layout flash → fixed (#337)
- Open-access fields outside card → fixed (#339)
- Cold start delay → addressed by keep-alive cron (#342, runs 07:00 Brunei)

## Engagement features live (PR #344)
- XP banner on result screen after every practice
- First-practice celebration overlay (badge + next step)
- Streak urgency chip (amber pulse + hours remaining)
- Student ID pre-fill from localStorage on return visits

## Notes for next session
- Provide GitHub token at session start (not stored here)
- Token needs: Contents + Pull requests + Workflows write permissions
- Keep-alive cron running nightly 23:00 UTC (07:00 Brunei)
- PWA live — students can install to home screen
