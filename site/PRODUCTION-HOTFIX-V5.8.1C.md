# V5.8.1C — Production Past Paper attribution alignment

Production audit on 2026-09-07 found that one newly completed teacher-assigned Past Paper session could still be stored as `mixed` with null `exam_year` / `paper`, even though assignment completion itself succeeded from question-level evidence.

## Live production alignment

Applied Supabase migration `v581c_past_paper_server_inference_live_alignment`:

- `submit_practice_session_v3` now upgrades a legacy/mixed label to `past_paper` only when every submitted question is Past Paper material from exactly one exam year and paper, and the session topic names that same paper.
- Safely re-attributed existing `mixed` sessions whose saved question evidence proves the same Past Paper identity.
- No Exam Mode behavior changed.

## Full active-assignment audit after repair

- 45 targeted students across active 2025 Paper 1 assignments
- 11 completed
- 13 in progress
- 21 not started
- 0 completed attempts with invalid/missing linked sessions
- 0 stale checkpoints on completed attempts
- 0 in-progress attempts with an already-completed qualifying full session
- 0 remaining reset assignment-start boundaries

A single pre-hotfix reset boundary for 6A-MIKAYLA was restored from her cloud checkpoint before the final audit. A newly completed 6A-ZAFRAN session was safely re-attributed to `past_paper / 2025 / Paper 1` so it is analytics-compatible.
