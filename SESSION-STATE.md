# SESSION-STATE.md
# Update this file at the end of each session.
# Claude reads it at the start of each conversation.

## Verified main SHA
`487c5bb32ef3f6cc1d78ea97b0dbeacec01acb4a`

## Open PRs
| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #237 | feature/209-adaptive-diagnostic-pilot | DRAFT — no merge | Issue #209, pilot only |
| #180 | — | Parked | Science V0.2, isolated |

## Next priority
No urgent open issues. Remaining work: observability (P2.2), adaptive pilot evidence (P1.2), or content/data work.

## Recent merges (this session)
| PR | What | Closes |
|----|------|--------|
| #352 | Housekeeping — source data out of site/, README, docs | — |
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
- 2A frozen SHA256 (post-#352): `42e00af61b6e186e...` (verify-v5.1.cjs path change)
- 2C frozen SHA256 (post-#352): `74b6e0dc55c7eff9...`

## Infrastructure state (all live)
- netlify.toml: publish=site, 1yr immutable cache for JS/images, no-cache for shell, /question-bank/* blocked
- Service worker v2: cache-first for assets, network-first for shell, offline fallback
- Images: 47 PNG + 47 WebP in site/images/ — v59n shim rewrites to WebP at render time
- Source data: docs/question-bank/ (NOT deployed) — CSV/XLSX no longer in site/

## Notes for next session
- Provide GitHub token at session start (not stored here)
- Next meaningful work: P2.2 observability (window.onerror handler) or P1.2 adaptive pilot evidence
- Student scripts v59a–v59n all live on main
- Keep-alive cron: .github/workflows/supabase-keepalive.yml (23:00 UTC daily)
- If new exam paper images added: convert to WebP, add blobs to 2A/2B/2C seal lists
- verify-v5.1.cjs now reads CSV from docs/question-bank/ (not site/question-bank/)
