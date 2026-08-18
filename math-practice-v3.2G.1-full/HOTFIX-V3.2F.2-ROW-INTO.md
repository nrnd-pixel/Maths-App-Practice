# V3.2F.2 SQL row-variable hotfix

The original classes migration attempted to load assignment, roster-student and class table rows into one multi-item `INTO` list. PostgreSQL rejects that form when the targets are composite row variables.

The corrected migrations load the three rows separately. No table structure, access rule or application feature has changed.

If the original migration failed:

1. Run the corrected `migrate-v3.2F.1-to-v3.2F.2-classes-assignments.sql` in full.
2. After it succeeds, run the corrected `migrate-v3.2F.2-to-v3.2F.2.1-open-access.sql` in full.
3. Hard-refresh the deployed site.

Both scripts use `if not exists` or replaceable database functions, so rerunning them after the failed attempt is safe.
