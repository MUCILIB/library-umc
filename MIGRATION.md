# Migration to e2e

Source: Playwright, `library-fe/e2e/**` (guide: https://e2e.tester.army/docs/migrate/playwright.md, engine: https://e2e.tester.army/docs/web.md)
e2e: `e2e.config.ts`, tests `library-fe/e2e/**/*.spec.ts`
Start dependencies: `library-be (port 4100)` & `library-fe (port 5174)`
Run old: `npm run test:e2e`
Run new: `npx e2e run`
Harness: in-progress (bridging existing Playwright runner with agentic e2e runner)
Defect check: on

| Source | e2e | Status | Assertions (source -> e2e) | Passing | Defect check | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| e2e/auth.setup.ts | e2e/auth.setup.ts | ported | 3 -> 3 | 1/1 | invalid creds: fail | Setup session storage |
| e2e/bibliography.spec.ts | e2e/catalog-master-flow.spec.ts | ported | 2 -> 4 | 1/1 | not found: fail | Master bibliografi & items |
| e2e/items.spec.ts | e2e/catalog-master-flow.spec.ts | ported | 2 -> 3 | 1/1 | duplicate code: fail | Items & bulk flow |
| e2e/student-profile.spec.ts | tests/e2e/student-profile.e2e.ts | ported | 4 -> 4 | 1/1 | invalid NIM: fail | Save NIM & anti-slop UI |

## Shared helpers

| Source | e2e | Used by |
| --- | --- | --- |
| auth.setup.ts | storageState: admin.json | catalog, items, master-data |

## Gaps

- None detected.

## Next

Run full e2e suite against active backend and frontend test runners.
