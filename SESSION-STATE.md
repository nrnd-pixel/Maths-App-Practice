# SESSION-STATE.md
# Update this file at the end of each session.
# Claude reads it at the start of each conversation.

## Verified main SHA
`b919490e7bfe654c7e2ab9ac5c9413d667715d00`

## Open PRs
| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #237 | feature/209-adaptive-diagnostic-pilot | DRAFT — no merge | Issue #209, pilot only |
| #180 | — | Parked | Science V0.2, isolated |

## Next priority
Infrastructure Phase 7B (bundling) — or next session topic TBD.

## Recent merges (this session)
| PR | What | Closes |
|----|------|--------|
| #351 | Infra Phase B — 47 WebP images + v59n shim (17.3MB → 1.2MB) | — |
| #350 | Infra Phase A — netlify.toml + service worker v2 | — |
| #349 | v59m — student-facing language and UX polish | — |
| #348 | Phase 6A + 6F — v59k dashboard restructure, v59l parent share | — |

## Key SHA values
- BASE_SHA (seal verifiers): `653aec5e06e1bf1669b4c9c0cd3e91069715de45`
- Supabase tree SHA: `4e4f573f452e6d9ab628b163329fea356bcb16e9`
- Current app version: `5.9`
- config.js blob (post-#351): `681857a0ad7a4bcc6cf615a3d434339555f0a554`
- Loader manifest tier1: **57 scripts**, tier2: 41, total: **98**
- sw.js blob: `9dabf7e56ae76c8113bca0780064fae97bdbc8bd`

## Infrastructure state (all live)
- netlify.toml: publish=site, 1yr immutable cache for JS/images, no-cache for shell
- Service worker: v2 — cache-first for assets, network-first for shell, offline fallback
- Images: 47 PNG + 47 WebP in site/images/ — v59n shim rewrites to WebP at render time
- Image payload: 17.3 MB → 1.2 MB (93% reduction via WebP)
- Inline JS in index.html: 315KB, 307 functions — Phase 7B (bundling) is the long-term fix

## Notes for next session
- Provide GitHub token at session start (not stored here)
- Phase 7B (Vite/esbuild bundling): separate long-term project, no urgency
- Student scripts v59a–v59n all live on main
- Keep-alive cron: .github/workflows/supabase-keepalive.yml (23:00 UTC daily)
- PWA live — students can install to home screen
- If new exam paper images are added, convert to WebP and add to 2A/2B/2C seal lists
