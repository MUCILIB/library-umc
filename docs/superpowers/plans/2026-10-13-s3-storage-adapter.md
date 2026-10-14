# S3 Storage Adapter for Repository Proposals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement S3-compatible cloud storage adapter (Dahono S3 / AWS S3) for thesis proposal PDF documents under the `/library/` path, with backward-compatible local fallback when S3 environment variables are absent.

**Architecture:** Create an isolated `storage.service.ts` seam in `library-be/src/modules/repository/service/storage.service.ts`. It reads `ENDPOINT_URL`, `ACCESS_KEY`, `SECRET_KEY`, `S3_BUCKET` (or defaults) and uses `@aws-sdk/client-s3` with `forcePathStyle: true`. If credentials are present, save/read/delete under `library/proposals/<filename>`. If credentials are not set (e.g. offline dev/testing), fall back gracefully to local `storage/proposals/`.

**Tech Stack:** Node.js, TypeScript, `@aws-sdk/client-s3`, `vitest`.

**Spec:** User requirements:
- `ENDPOINT_URL`
- `ACCESS_KEY`
- `SECRET_KEY`
- Storage prefix/folder: `library/`
- Zero slop, resilient to network/credentials missing, TDD vertical slice.

## Global Constraints
- Strictly avoid leaking secrets or logging `SECRET_KEY`.
- Backward-compatible: Existing local files or runs without S3 credentials must continue to work via fallback.
- `forcePathStyle: true` mandatory for S3-compatible Dahono endpoint.
- All vitest test suites must pass 100%.

## Review Focus
1. S3 configuration presence: Returns S3 mode when env vars exist, local mode when absent.
2. Path key formatting: Always sanitizes prefix into `library/proposals/<filename>` without double slashes.
3. PDF Stream retrieval: Correctly converts AWS SDK response Body into `Buffer` for `pdf-lib` slicing.
4. File deletion: Gracefully handles non-existent keys during delete without crashing.
5. Error boundary: When S3 throws network error, returns descriptive error message.

---

### Task 1: Create Unit Test for Storage Service (Red Phase)

**Files:**
- Create: `library-be/src/modules/repository/__tests__/storage.service.test.ts`

- [ ] **Step 1: Write failing unit tests for StorageService**
- [ ] **Step 2: Run test to verify it fails (Red)**
- [ ] **Step 3: Implement StorageService (Green)**
- [ ] **Step 4: Verify all unit tests pass**
- [ ] **Step 5: Commit**

---

### Task 2: Integrate StorageService into ProposalService

**Files:**
- Modify: `library-be/src/modules/repository/service/proposal.service.ts`

- [ ] **Step 1: Wire `saveProposalPdf`, `readProposalPdf`, and `deleteProposalPdf` into `create`, `viewPdf`, `updateProposal`, and `deleteProposal`**
- [ ] **Step 2: Run all existing repository tests (`vitest run src/modules/repository`)**
- [ ] **Step 3: Run full backend build (`npm run build`)**
- [ ] **Step 4: Commit**
