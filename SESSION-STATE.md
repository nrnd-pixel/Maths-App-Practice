# SESSION-STATE.md
# Update this file at the end of each session.
# Claude reads it at the start of each conversation.

## Verified main SHA
`d9bdb0b1316493003606e1fc3eb33389c4a6d754`

## Open PRs
| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #237 | feature/209-adaptive-diagnostic-pilot | DRAFT — no merge | Issue #209, pilot only |
| #180 | — | Parked | Science V0.2, isolated |

## Next priority
**Infrastructure Phase B** — image optimisation (WebP conversion for 18 images >500KB, ~12MB → ~2-3MB)

## Recent merges (this session)
| PR | What | Closes |
|----|------|--------|
| #350 | Infra Phase A — netlify.toml + service worker v2 | — |
| #349 | v59m — student-facing language and UX polish | — |
| #348 | Phase 6A + 6F — v59k dashboard restructure, v59l parent share | — |
| #347 | Phase 6 engagement — v59g–v59j | — |

## Key SHA values
- BASE_SHA (seal verifiers): `653aec5e06e1bf1669b4c9c0cd3e91069715de45`
- Supabase tree SHA: `4e4f573f452e6d9ab628b163329fea356bcb16e9`
- Current app version: `5.9`
- config.js blob (post-#349): `b934d492d443a23ea568dc5eb0c03f467ae24773`
- Loader manifest tier1: **56 scripts**, tier2: 41, total: **97**
- sw.js blob (post-#350): `9dabf7e56ae76c8113bca0780064fae97bdbc8bd`

## Infrastructure state
- netlify.toml: LIVE — publish=site, 1yr immutable cache for JS/images, no-cache for index.html+config.js
- Service worker: v2 — cache-first for assets, network-first for shell, offline fallback
- Images: **not yet optimised** — 47 PNG files, 17.3MB total, 18 files >500KB (Phase B pending)
- Inline JS in index.html: 315KB, 307 functions — Phase 7B (bundling) is the long-term fix

## Notes for next session
- Provide GitHub token at session start (not stored here)
- Phase B: convert site/images/*.png to WebP — no JS changes, no seal impact on frozen hash
  (images are in ALLOWED_SITE_CHANGES / AUTHORIZED_SITE_SUCCESSORS lists already)
- Phase 7B (bundling/Vite): long-term architectural work, separate project
- Keep-alive cron: .github/workflows/supabase-keepalive.yml (23:00 UTC daily)
- PWA live — students can install to home screen
