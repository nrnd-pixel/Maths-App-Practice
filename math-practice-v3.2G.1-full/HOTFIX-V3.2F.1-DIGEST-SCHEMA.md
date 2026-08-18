# V3.2F.1 Supabase digest-schema hotfix

The original V3.2F.1 migration referenced `public.digest()`. Supabase normally installs extension functions under the `extensions` schema, so attempt creation failed with `function public.digest(text, unknown) does not exist`.

The corrected migration now references `extensions.digest()` in all start, save and finalize functions.

## Apply

Run the corrected `migrate-v3.2E-to-v3.2F.1-exam-attempts.sql` again in Supabase SQL Editor. It is idempotent: it keeps the existing attempt table and data, then replaces the affected functions and policies safely.

No rollback, table deletion, question re-import or website change is required. After the SQL succeeds, refresh the deployed website and start the exam again.
