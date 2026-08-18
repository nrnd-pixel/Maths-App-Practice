Math Practice V3.2B.1

This full package is based on V3.2B with a multi-part practice-filter hotfix.

Important for an existing DEV site:
- Copy your working config.js into this folder before deployment.
- Do NOT rerun the fresh schema.
- No additional SQL migration is required beyond the migrations you already ran through V3.2B.

Fix behavior:
A grouped question is eligible when ANY active part matches the student's selected strand/topic/difficulty. Once eligible, ALL active sibling parts are included so the student sees the complete grouped question.
