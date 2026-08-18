Math Practice V3.2B.2 — Curriculum Topic Normalization

Purpose
-------
Keeps the student topic filter, teacher Question Bank and CSV imports on one set of topic names.

Main normalizations
-------------------
Capacity -> Capacity & Volume
Rates / Ratio -> Rates & Ratio
Average -> Averages
Tally Charts -> Tables & Tallies
Number Patterns (Thinking strand) -> Patterns & Rules
Multi-step Word Problems -> Multi-step Problems
Powers and Roots -> Powers & Roots

Also added as canonical topics where needed by PSR 2025:
- Algebra
- Powers & Roots
- Fractions, Decimals & Percentages
- Pictorial Algebra

Upgrade steps
-------------
1. Run database/05-migrate-v3.2B.1-to-v3.2B.2-topic-normalization.sql once in Supabase SQL Editor.
   It is idempotent, so an accidental second run is safe.
2. Keep your working config.js.
3. Replace the DEV site's index.html with the V3.2B.2 index.html.
4. Redeploy to the same V3.2 DEV Netlify site.
5. Hard refresh the browser.

What V3.2B.2 changes in the app
--------------------------------
- Student topic filters use canonical topic names.
- Runtime filtering also recognizes known legacy aliases.
- Teacher Question Editor uses a topic dropdown tied to the selected strand.
- CSV import automatically normalizes known aliases.
- CSV rows with unknown topics are flagged for review instead of silently becoming unsearchable.
- Existing multi-part behavior from V3.2B.1 remains unchanged.

Recommended checks
------------------
A. Teacher Dashboard -> Q31(a) should show Topic = Capacity & Volume.
B. Q31(b) should show Topic = Rates & Ratio.
C. Student: Year 6 -> Measurement -> Capacity & Volume should be able to surface grouped Q31.
D. Student: Year 6 -> Number -> Rates & Ratio should also be able to surface grouped Q31.
E. Teacher Add/Edit Question: changing Strand should refresh the Topic list.
