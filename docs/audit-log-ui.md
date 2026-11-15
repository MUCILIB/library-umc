# Audit log UI

Direction: existing MUCILIB dashboard, crimson primary, semantic light/dark tokens and existing typography. ENERGY 1 / RHYTHM 1 / MOTION 1. antislop DURING is a session override.

## Decisions

- Keep six semantic columns on desktop, stack labeled row cells on narrow screens to preserve readable identities and objects without a wide page.
- Reuse Radix Avatar and getUserAvatar only when a stored image exists. Missing or failed images show initials, never an unrelated generated photo.
- Names and roles prefer actorSnapshot. The image is Users.image from the current joined profile, explicitly described as current and not historical.
- Indonesian event/action labels make activity scannable; object type and historical target label remain separate. Search also accepts the displayed activity label.
- Reserve 40px image dimensions. Use two-line summaries with full text in title and the existing detail dialog. Localize both occurredAt and legacy createdAt with the browser timezone visible.
- Preserve filters, read scope, 100-row fetch limit, existing client pagination and detail focus/Escape behavior. No database migration or fixture changes.
- Use existing brand tokens, spacing and restrained hover only; no decorative icons, new colors, assets or dependencies.

## Verification evidence

- `library-fe: npm test && npm run build`: 36 files, 191 tests passed; TypeScript and Vite build passed. Existing jsdom canvas/navigation notices and Vite large-chunk warning remain.
- `library-be: npm test -- src/modules/audit/__tests__/audit.profile.test.ts src/modules/audit/__tests__/audit.validation.test.ts && npm run build`: 2 files, 2 tests passed; TypeScript build passed. Vite config-loader advisory remains.
- Regression coverage: successful current photo, broken-photo initials, absent-photo initials, preserved historical identity/role, Indonesian role/legacy labels, semantic time, detail diff, untrusted text, Escape/focus restoration and search/error retry. Backend test checks current image projection separately from snapshots and preserved filter/limit/offset chain.
- Browser feasibility: installed Playwright and Chromium/Chrome are available; no installs performed. A scratch-only Vite component harness was attempted. Final attempt timed out navigating to `/audit-ui-check`; no successful browser click-through or screenshot was obtained. Browser and owned child server were closed in finally. No real database was accessed for browser verification.
- Existing 17 CI E2E failures were not rerun or claimed fixed.

## Delivery gate

- Hard gate, source/test/build evidence: PASS for image semantics/dimensions, honest current-photo identity, preserved data states, functional existing detail, native controls, and no generated assets or claims.
- Purpose gate: PASS by source review; existing MUCILIB tokens and structural spacing serve scanability, with no added decoration or animation.
- Liveliness/quality locks: PASS by source review for declared 1/1/1 direction, repeated profile motif and restrained primary action.
- Browser delivery gate: UNVERIFIED. Mobile layout, light/dark contrast, console cleanliness and complete control click-through require actual browser confirmation before claiming full UI acceptance. This note is not a clean browser gate PASS.
