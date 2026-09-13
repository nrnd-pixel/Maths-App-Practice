# Missing Skill Metadata — Candidate Remediation Map

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **candidate-only / no database writes**.

Baseline: verified production Question Bank read-only audit from repository main `6f230b33700199a081d65c8465de4a0bd559d218`.

Scope: the 123 currently Practice-eligible rows with an empty `skill` field:

- 2013 Paper 1: 44 rows
- 2018 Paper 1: 39 rows
- 2019 Paper 1: 40 rows

## Method

Candidate labels were derived from the stored source question text, answer/response structure and the existing non-empty skill vocabulary already used elsewhere in the Question Bank.

Principles:

- prefer an existing skill label when it accurately matches the question;
- make the skill more specific than the broad topic;
- do not encode difficulty in `skill`;
- do not overload `skill` with every embedded/prerequisite concept — those belong in Question Metadata V2;
- diagram-dependent or context-dependent interpretations are marked **Medium** confidence and should be checked against the original paper image/source before any write;
- this file is a review map, not authorisation to update production.

## 2013 Paper 1 — 44 rows

| Q | Topic | Candidate skill | Confidence |
| --- | --- | --- | --- |
| 1 | Addition & Subtraction | Add whole numbers | High |
| 2 | Addition & Subtraction | Subtract whole numbers | High |
| 3(a) | Multiplication & Division | Multiply a decimal by 100 | High |
| 3(b) | Multiplication & Division | Divide a decimal by 100 | High |
| 4(a) | Factors & Multiples | Identify prime numbers from a set | High |
| 4(b) | Factors & Multiples | Identify a multiple of 2 | High |
| 5 | Fractions | Add fractions with like denominators and simplify | High |
| 6(a) | Fractions | Convert a decimal to a fraction | High |
| 6(b) | Fractions | Convert a percentage to a fraction in simplest form | High |
| 7 | Multiplication & Division | Divide a 4-digit number by a 1-digit number | High |
| 8 | Factors & Multiples | Find the HCF of two numbers | High |
| 9 | Fractions | Convert an improper fraction to a mixed number | High |
| 10 | Mass | Convert kilograms to grams and add a mass | High |
| 11(a) | Fractions | Identify a fraction represented by shading | High |
| 11(b) | Fractions | Write a fraction in words | High |
| 12 | Fractions | Identify a non-equivalent fraction from shaded models | Medium |
| 13 | Factors & Multiples | Express a number as prime factors | High |
| 14 | Reasoning | Choose operations to make a number statement true | High |
| 15 | Estimation | Identify numbers that round to a target hundred | High |
| 17 | Powers & Roots | Evaluate powers and cube roots | High |
| 18 | Algebra | Simplify an algebraic expression | High |
| 20 | Length | Measure a length using a ruler | Medium |
| 21 | Time | Convert decimal hours to minutes | High |
| 23(a) | Fractions, Decimals & Percentages | Compare values using <, > or = | High |
| 23(b) | Powers & Roots | Compare multiplication and cube-root values | High |
| 24 | 3D Shapes | Identify a cube net | Medium |
| 25 | Algebra | Evaluate an algebraic expression by substitution | High |
| 26 | 3D Shapes | Identify the edges and faces of a pyramid | Medium |
| 27 | Perimeter | Calculate the perimeter of a polygon | Medium |
| 28 | Angles | Measure an obtuse angle using a protractor | Medium |
| 29 | Pictorial Algebra | Solve two symbol equations | High |
| 30 | Triangles & Quadrilaterals | Identify properties of a kite | Medium |
| 32 | One-step Problems | Find how many items to transfer to make totals equal | High |
| 34 | Area | Use the area of equal squares to find a length | Medium |
| 35(a) | Angles | Use straight-line angle relationships to find a missing angle | Medium |
| 35(b) | Angles | Use straight-line angle relationships to find a missing angle | Medium |
| 36(a) | Money | Calculate monetary amounts from note quantities | High |
| 36(b) | Money | Calculate money remaining after a purchase | High |
| 37 | Mass | Find the mass of one equal item after subtracting container mass | High |
| 39(a) | Bar Charts | Read a value from a bar graph | Medium |
| 39(b) | Bar Charts | Find the total from a bar chart | Medium |
| 39(c) | Bar Charts | Find the difference between two bar-chart values | Medium |
| 40(a) | Multi-step Problems | Calculate points from a league table | Medium |
| 40(b) | Multi-step Problems | Find wins from league-table points | Medium |

### 2013 source checks before write

Prioritise original-image/source verification for Q12, Q20, Q24, Q26–Q28, Q30, Q34–Q35, Q39 and Q40 because the precise assessed skill depends partly on a figure, table or diagram not fully represented by text alone.

## 2018 Paper 1 — 39 rows

| Q | Topic | Candidate skill | Confidence |
| --- | --- | --- | --- |
| 1 | Addition & Subtraction | Subtract whole numbers | High |
| 2 | Decimals | Complete an expanded decimal form | High |
| 3 | Whole Numbers | Write a number in numerals | High |
| 4 | Fractions, Decimals & Percentages | Convert a percentage to a decimal | High |
| 5 | Fractions | Read a shaded mixed-number model | Medium |
| 6 | Factors & Multiples | Complete a sequence of multiples | High |
| 7 | Fractions | Add fractions with unlike denominators | High |
| 8 | Multiplication & Division | Multiply a whole number by a multiple of 10 | High |
| 9 | Multiplication & Division | Multiply then add | High |
| 10 | Fractions | Find the number of unit fractions in a mixed number | High |
| 11 | Powers & Roots | Evaluate a power and square-root expression | High |
| 12 | Percentages | Calculate percentage of a quantity | High |
| 13 | Fractions | Multiply two fractions and simplify | High |
| 14 | Multiplication & Division | Find a remainder after division | High |
| 15 | Factors & Multiples | Find the HCF of three numbers | High |
| 16 | Algebra | Simplify an algebraic expression | High |
| 17 | Place Value | Find the number of tens in a value | High |
| 19 | Unit Conversion | Split a decimal kilometre measure into kilometres and metres | High |
| 20 | Factors & Multiples | Express a number as prime factors | High |
| 21 | Time | Find a fraction of a day in hours | High |
| 22 | Angles | Use isosceles-triangle angle facts to find an unknown angle | Medium |
| 23 | Time | Find a start time from an end time and duration | High |
| 24 | Number Patterns | Read a number-line value and multiply it | Medium |
| 25 | Fractions | Identify a non-equivalent fraction | High |
| 26 | Pictograms | Use a pictogram key and total to find a missing frequency | Medium |
| 27 | Fractions | Reduce a fraction to lowest terms | High |
| 28 | Patterns & Rules | Extend a visual matchstick pattern | Medium |
| 29 | Tables & Tallies | Compare frequencies shown in a tally chart | Medium |
| 30 | Rates & Ratio | Form and simplify a ratio from table values | High |
| 31(a) | Money | Calculate total cost from quantity and unit price | High |
| 31(b) | Money | Calculate a unit cost from a total cost | High |
| 33 | Rates & Ratio | Find quantities from a total and difference, then form a ratio | High |
| 34 | Patterns & Rules | Infer a missing value from a visual number pattern | Medium |
| 35 | Averages | Find a missing number from an average | High |
| 36 | Perimeter | Find the perimeter of a composite figure made from equal squares | Medium |
| 37 | Area | Find the number of equal triangular tiles covering a figure | High |
| 38 | Fractions | Work backwards through fractions of a remainder | High |
| 39 | Multi-step Problems | Solve a money problem using equal final amounts | High |
| 40 | Angles | Combine straight-line and quadrilateral angle facts | Medium |

### 2018 source checks before write

Prioritise source-image verification for Q5, Q22, Q24, Q26, Q28–Q29, Q34, Q36 and Q40. Q38 is textually clear but is especially relevant to future adaptive/prerequisite metadata because it combines whole reconstruction with fractions of a remainder.

## 2019 Paper 1 — 40 rows

| Q | Topic | Candidate skill | Confidence |
| --- | --- | --- | --- |
| 1 | Addition & Subtraction | Add whole numbers | High |
| 2 | Addition & Subtraction | Subtract whole numbers | High |
| 3(a) | Decimals | Divide a decimal by 100 | High |
| 3(b) | Decimals | Multiply a decimal by 100 | High |
| 4 | Fractions | Multiply a fraction by a whole number | High |
| 5 | Fractions | Convert a mixed number to an improper fraction | High |
| 6 | Powers & Roots | Evaluate a power and square-root expression | High |
| 7 | Fractions, Decimals & Percentages | Convert a fraction to a percentage | High |
| 8 | Fractions | Add fractions with unlike denominators | High |
| 9 | Number Patterns | Complete a number pattern | High |
| 10 | Algebra | Simplify an algebraic expression | High |
| 11 | Mass | Convert kilograms to grams | High |
| 12 | Multiplication & Division | Divide a 4-digit number by a 1-digit number | High |
| 13 | Factors & Multiples | Identify prime numbers in a range | High |
| 14 | Decimals | Arrange decimals in descending order | High |
| 15 | Factors & Multiples | Express a number as prime factors | High |
| 16 | Time | Multiply a compound time duration | High |
| 17 | Factors & Multiples | Complete the factor list of a whole number | High |
| 18 | Decimals | Construct a decimal from place-value quantities | High |
| 19 | Length | Read an object's length and multiply it | Medium |
| 20 | Multiplication & Division | Solve a missing-number equation | High |
| 21 | Rates & Ratio | Simplify a three-part ratio | High |
| 22 | Perimeter | Find side length from the perimeter of a composite square figure | Medium |
| 23 | Angles | Use straight-line and vertically opposite angle relationships | Medium |
| 24 | Time | Add a duration to a start time | High |
| 26 | Fractions | Complete a chain of equivalent fractions | High |
| 27 | Pictograms | Use a pictograph and a comparison to find a total | Medium |
| 28 | Time | Use LCM in a time context | High |
| 29 | Symmetry | Identify the correct line of symmetry | Medium |
| 30 | Money | Calculate monetary values from note quantities | High |
| 31 | Pictorial Algebra | Solve a pictorial equation | High |
| 32 | Money | Solve a multiplicative comparison money problem | High |
| 33 | Angles | Read a protractor then find a reflex angle | Medium |
| 34 | Percentages | Find a whole from a known percentage | High |
| 35 | Algebra | Solve linked equations | High |
| 36 | Money | Find the cost of one item from a fractional price relationship | High |
| 37 | Money | Find an item price from a multiplicative price relationship and total cost | High |
| 39(a) | Averages | Find a total from an average | High |
| 39(b) | Averages | Use a mean to find the mean of remaining values | Medium |
| 40 | Angles | Combine rectangle and isosceles-triangle angle facts | Medium |

### 2019 source checks before write

Prioritise source-image/table verification for Q19, Q22–Q23, Q27, Q29, Q33, Q39(b) and Q40.

## Review status

Counts from this candidate map:

- High-confidence candidates: suitable for source spot-check + terminology review before any update.
- Medium-confidence candidates: require original image/table/diagram/source verification before approval.
- No candidate in this file should be treated as production-approved solely because it is marked High.

## Proposed remediation workflow

1. Verify every Medium-confidence row against the original source image/PDF.
2. Spot-check High-confidence rows, especially multipart siblings, against source wording.
3. Normalise near-synonymous labels only when doing so improves consistency without losing the actual assessed action.
4. Prepare an explicit reviewed change set keyed by immutable question `id`.
5. Before any database update, take a read-only pre-change snapshot of `id`, old `skill`, candidate `skill`, `updated_at`, `active`, `practice_eligible`, `review_status` and source identity.
6. Apply changes only through a separately approved data-change plan; all Supabase SQL/database mutations remain high-risk/frozen work.
7. Re-run Question Bank integrity queries after any accepted remediation and confirm question counts, eligibility, answers, marks and response configs are unchanged.

## Relationship to Question Metadata V2

This remediation fills the existing first-level `skill` field only. It should **not** try to solve the richer metadata problem inside one text label.

Question Metadata V2 should separately model dimensions such as:

- embedded/secondary skills;
- prerequisite skills;
- procedural-step demand;
- conceptual reasoning demand;
- reading/context load;
- visual-spatial demand;
- response complexity;
- exam-position/demand profile;
- source confidence/audit status.

For example, 2018 Q38 can keep a primary skill such as `Work backwards through fractions of a remainder`, while Metadata V2 can additionally represent fraction-of-quantity, remainder reasoning, whole reconstruction, multi-step demand and reading load.
