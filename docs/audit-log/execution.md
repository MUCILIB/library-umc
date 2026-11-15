# Execution ledger: audit-role-permission

Plan: docs/superpowers/plans/2026-11-15-audit-role-permission.md
Branch: feat/audit-role-hardening, base 7a67218.

- Baseline: backend tsc passed; role/auth tests 19/19 passed.
- Ruling: use feature branch in existing checkout rather than duplicate worktree; dependencies and approved untracked docs remain available, no main edits.
- Ruling: existing mucilib_test schema drift prevented drizzle push (fines waived). Created separate mucilib_audit_test without deleting existing data. Fresh schema push succeeded.
- Task 1 partial: persistence test observed RED missing event_type, then GREEN 1/1 after additive migration.
- Ruling: occurred_at migration adds nullable column before setting default, preserving null for legacy rows instead of fabricating event time.
- Task 1 verified: additive schema, validator and transactional writer; structured/legacy HTTP read passed.
- CRUD and permission verified: real PostgreSQL rollback on rejected audit insert, historical snapshot, no-op, boolean diff and concurrent update chain.
- HTTP uses real sessions/middleware: anonymous 401, staff 403, super_admin 200; invalid matrix 400 without mutation.
- User authorized real env database synchronization: `db:check` passed; `db:migrate` applied 0014; repeated migration no-op. Read-only information_schema confirmed seven audit columns, role enum and migration ledger. No real data fixtures/failure injection.
- Existing migration hashes for 0009/0013 differ from local files, but ledger timestamps and actual is_popular/bookmarks exist; historical migrations not replayed or modified.
- Full backend suite passed: 61 files, 385 tests. After requiring AuditContext at mutation callsites: focused 7 files, 28 tests and backend build passed.
- Independent backend review found long historical descriptions and nullable description diffs; both fixed with regression coverage.
- Final local verification: backend 61 files / 386 tests passed; frontend 36 files / 188 tests passed; both production builds passed. Backend lint passed after explicitly allowing the intentional control-character sanitization regex; frontend lint has warnings but no errors.
- Frontend audit detail and sidebar completed with legacy labeling, local initials, keyboard navigation, dialog focus/Escape and mobile drawer coverage.
- Pushed feature branch to janfdev fork and opened upstream PR https://github.com/MUCILIB/library-umc/pull/160. Merge awaits CI; Vercel preview requires integration authorization.
