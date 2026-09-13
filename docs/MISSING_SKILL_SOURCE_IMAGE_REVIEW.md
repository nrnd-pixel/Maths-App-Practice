# Missing Skill Metadata — Source Image Review Queue

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **read-only source-verification queue / no production metadata writes**.

Companion map: `docs/MISSING_SKILL_REMEDIATION_MAP.md`

Purpose: provide a durable, question-by-question path from each Medium-confidence missing-skill candidate to the authoritative image currently referenced by the live Question Bank. A candidate may be promoted only if the source image supports the proposed skill label.

## Review rules

- Review the actual image, not only stored question text.
- Confirm the candidate describes the mathematical action actually required by the source.
- Do not change `skill` from this file directly.
- If the source contradicts or materially narrows the candidate, revise the candidate map first.
- If the image is unavailable or ambiguous, retain `Medium` / `HOLD`.
- Multipart siblings that share one image should be reviewed together but approved separately.

## 2013 Paper 1

| Question | Candidate skill | Source image |
|---|---|---|
| Q12 | Identify a non-equivalent fraction from shaded models | [2013 Q12 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q12.png) |
| Q20 | Measure a length using a ruler | [2013 Q20 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q20.png) |
| Q24 | Identify a cube net | [2013 Q24 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q24.png) |
| Q26 | Identify the edges and faces of a pyramid | [2013 Q26 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q26.png) |
| Q27 | Calculate the perimeter of a polygon | [2013 Q27 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q27.png) |
| Q28 | Measure an obtuse angle using a protractor | [2013 Q28 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q28.png) |
| Q30 | Identify properties of a kite | [2013 Q30 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q30.png) |
| Q34 | Use the area of equal squares to find a length | [2013 Q34 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q34.png) |
| Q35(a) | Use straight-line angle relationships to find a missing angle | [2013 Q35 shared source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q35.png) |
| Q35(b) | Use straight-line angle relationships to find a missing angle | [2013 Q35 shared source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q35.png) |
| Q39(a) | Read a value from a bar graph | [2013 Q39 shared source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q39.png) |
| Q39(b) | Find the total from a bar chart | [2013 Q39 shared source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q39.png) |
| Q39(c) | Find the difference between two bar-chart values | [2013 Q39 shared source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q39.png) |
| Q40(a) | Calculate points from a league table | [2013 Q40 shared source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q40.png) |
| Q40(b) | Find wins from league-table points | [2013 Q40 shared source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2013/paper-1/1788304943820-2013_P1_Q40.png) |

## 2018 Paper 1

| Question | Candidate skill | Source image |
|---|---|---|
| Q5 | Read a shaded mixed-number model | [2018 Q5 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q05.png) |
| Q22 | Use isosceles-triangle angle facts to find an unknown angle | [2018 Q22 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q22.png) |
| Q24 | Read a number-line value and multiply it | [2018 Q24 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q24.png) |
| Q26 | Use a pictogram key and total to find a missing frequency | [2018 Q26 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q26.png) |
| Q28 | Extend a visual matchstick pattern | [2018 Q28 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q28.png) |
| Q29 | Compare frequencies shown in a tally chart | [2018 Q29 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q29.png) |
| Q34 | Infer a missing value from a visual number pattern | [2018 Q34 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q34.png) |
| Q36 | Find the perimeter of a composite figure made from equal squares | [2018 Q36 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q36.png) |
| Q40 | Combine straight-line and quadrilateral angle facts | [2018 Q40 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2018/paper-1/1788304501082-2018_P1_Q40.png) |

## 2019 Paper 1

| Question | Candidate skill | Source image |
|---|---|---|
| Q19 | Read an object's length and multiply it | [2019 Q19 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2019/paper-1/1788303826069-2019_P1_Q19.png) |
| Q22 | Find side length from the perimeter of a composite square figure | [2019 Q22 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2019/paper-1/1788303826069-2019_P1_Q22.png) |
| Q23 | Use straight-line and vertically opposite angle relationships | [2019 Q23 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2019/paper-1/1788303826069-2019_P1_Q23.png) |
| Q27 | Use a pictograph and a comparison to find a total | [2019 Q27 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2019/paper-1/1788303826069-2019_P1_Q27.png) |
| Q29 | Identify the correct line of symmetry | [2019 Q29 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2019/paper-1/1788303826069-2019_P1_Q29.png) |
| Q33 | Read a protractor then find a reflex angle | [2019 Q33 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2019/paper-1/1788303826069-2019_P1_Q33.png) |
| Q40 | Combine rectangle and isosceles-triangle angle facts | [2019 Q40 source](https://lmveznstltjxzpalcmid.supabase.co/storage/v1/object/public/question-images/v51-imports/2019/paper-1/1788303826069-2019_P1_Q40.png) |

### 2019 Q39(b) — no stored image reference

Candidate: `Use a mean to find the mean of remaining values`.

The live row has no `image_url`, so this item remains **HOLD** until the authoritative Paper 1 source is available through another trusted source. Do not promote it from Medium based on stored text alone.

## Review outcome fields

When source verification is completed, record for each row:

- `source_checked`: yes/no;
- `candidate_supported`: yes/no/partial;
- `recommended_skill`;
- `review_note`;
- `reviewed_at` (date only in this documentation; not a production field);
- `review_status`: `approved_candidate`, `revise_candidate`, or `hold`.

Approval in this document still does **not** authorise a database write. Production remediation remains a separately approved change set keyed by immutable question IDs.