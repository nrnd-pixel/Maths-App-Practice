# Maths Practice V3.2F.3 — Student Access Controls

V3.2F.3 adds optional access rules for both Practice Mode and Exam Mode while preserving V3.2F.2.1 open access as the default.

## Teacher choices

- **Open to everyone:** student name is required and Student ID is optional.
- **Registered Student ID required:** only active roster students can start.
- **Student ID + PIN required:** active roster students enter a private 4–8 digit PIN. This is the recommended restricted setting.

Teachers choose the rule in **Teacher Dashboard → Student Access**. PINs are set or reset beside each student in **Classes & Assignments**, or supplied as the optional third field during roster import.

## Security and identity

- PINs are stored only as one-way hashes using Supabase pgcrypto.
- A generic failure message avoids confirming whether an ID exists.
- Repeated failed checks are temporarily rate-limited.
- Successful validation issues a short-lived access ticket.
- Active questions, Practice submissions and new Exam attempts use that ticket.
- Official roster name, class and year replace typed values for registered students.
- Deactivating a student immediately prevents new restricted sessions without deleting historical results.

Existing unfinished Exam attempts can still resume using their recoverable attempt credentials. Existing results, result codes, manual review, assignments and paper settings remain compatible.
