# Phase 3 backend SLiMS import increment

Scope: safe conflict validation and idempotent item detail enrichment.

- Preserve row-level conflict reasons in `importErrors` and resolved preview data.
- Reject duplicate item codes that claim different bibliographies, ambiguous bibliography matches, and existing item codes attached to another bibliography.
- Keep title/call-number resolution only when it identifies exactly one bibliography; never select the first ambiguous match.
- When an item code already belongs to the resolved bibliography, update only empty operational detail fields from non-empty source values. Preserve status, QR fields, and loan state.
- Keep approval resumable and idempotent; conflicts remain invalid and are never mutated.
- Verify with focused Vitest tests and TypeScript compilation. Do not use production or SLiMS databases.

Known limitations for this increment:
- Enrichment is limited to empty `site`, `source`, and `invoice` fields previewed in `_detailPatch`; populated conflicts block the whole row. Status, QR, location, inventory code, price, dates, supplier, and collection type remain unchanged on existing items.
- No schema migration or source-column expansion; unsupported fields stay in raw source evidence.
- This is linked item-detail import after a committed bibliography batch, not complete paired import: bibliography auto-create, cross-file completeness reporting, and bibliography re-import identity/deduplication remain future work.
- Existing item updates lock the item and recheck identity/values. Concurrent approval workers and new-item races need separate database integration coverage.
- `TEST_DATABASE_URL` was unset; verification used mocked DB boundaries, never production or SLiMS writes. Full real-CSV pair import was not exercised.

Verification: `npx vitest run src/modules/import/__tests__` and `npx tsc --noEmit` (see final execution report for counts).
