# Migration Manifest

## V3.2G.2 to V3.2G.3

No SQL migration is required. Deploy the V3.2G.3 client and assets while keeping the V3.2G.2 security migration installed. See `NO-SQL-MIGRATION-V3.2G.3.txt`.

## Existing V3.2G.1 installation

Run exactly one new SQL file:

1. `migrate-v3.2G.1-to-v3.2G.2-security.sql`

Then deploy the V3.2G.2 web files. Do not deploy the V3.2G.2 `index.html` before the migration because it calls the new practice feedback RPCs and expects sanitized question payloads.

If you already ran an earlier copy of the V3.2G.2 migration, also run
`fix-v3.2G.2-internal-helper-permissions.sql`. New package copies include the
same correction in the main migration, so fresh upgrades do not need the
follow-up file.

## Fresh database

Run these files in order:

1. `database/01-fresh-schema-v3.1.sql`
2. `database/02-migrate-v3.1.1-to-v3.1.2-storage.sql`
3. `database/03-migrate-v3.1.2-to-v3.2A-response-types.sql`
4. `database/04-migrate-v3.2A-to-v3.2B-multipart.sql`
5. `database/05-migrate-v3.2B.1-to-v3.2B.2-topic-normalization.sql`
6. `database/06-migrate-v3.2B.2-to-v3.2C-manual-review.sql`
7. `database/07-migrate-v3.2C-to-v3.2C.1-student-review.sql`
8. `database/08-migrate-v3.2C.1-to-v3.2D-exam-mode.sql`
9. `migrate-v3.2D.1-to-v3.2E-exam-settings.sql`
10. `migrate-v3.2E-to-v3.2F.1-exam-attempts.sql`
11. `migrate-v3.2F.1-to-v3.2F.2-classes-assignments.sql`
12. `migrate-v3.2F.2-to-v3.2F.2.1-open-access.sql`
13. `migrate-v3.2F.2.1-to-v3.2F.3-student-access.sql`
14. `database/14-migrate-v3.2G.1-to-v3.2G.2-security.sql`

V3.2D.1, V3.2G.1 and V3.2G.3 are client-only releases and have no database migration. The top-level duplicate C.1/D migration files are convenience copies; do not run them after their numbered `database/` equivalents.
