# CMS Sidebar Accordion Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the CMS dashboard module from a horizontal tab page into a native collapsible sidebar accordion tree with dedicated sub-menu routing in SuperAdminDashboard.

**Architecture:** Extend `ActiveMenu` in `SuperAdminDashboard.tsx` to support `cms-banner`, `cms-branding`, `cms-hero`, and `cms-location`. Build an interactive collapsible accordion component inside `DashboardSidebar` using `SidebarMenuSub`, `SidebarMenuSubItem`, and `SidebarMenuSubButton`. Replace the horizontal Radix Tabs in `CmsSection.tsx` with focused view rendering based on the active sub-menu key.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI Sidebar components, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-cms-sidebar-accordion-navigation.md`

## Global Constraints
- Minimal code (Ponytail): leverage existing `SidebarMenuSub*` components from `src/components/ui/sidebar.tsx` without adding new NPM dependencies.
- Anti-slop: maintain clean typography, accessible ARIA states (`aria-expanded`, `aria-current`), no em-dashes, and seamless dark/light theme support.
- RBAC safety: `cms-*` sub-keys must inherit permissions from parent `cms` in `useRolePermissions.ts`.
- Zero backend breakage: no DB migration required; all API endpoints remain untouched.

## Review Focus
1. Collapsed sidebar state: Clicking CMS icon when sidebar is collapsed (icon-only mode) must behave gracefully without breaking layout.
2. Initial deep link or direct click on parent CMS item: Must automatically expand and default to `cms-banner`.
3. State persistence: When switching between sub-tabs or refreshing, the accordion state stays expanded if active menu is under `cms-*`.
4. Role permissions: Non-superadmin users with `cms` view permission must see the accordion and its sub-items properly.
5. Save action toast & reactivity: Submitting changes on any sub-page continues to trigger toast feedback and update global site settings cache.

---

### Task 1: Extend Permissions Hook & Navigation Types

**Files:**
- Modify: `library-fe/src/hooks/useRolePermissions.ts`
- Modify: `library-fe/src/pages/dashboard/SuperAdminDashboard.tsx:83-115`

- [ ] **Step 1: Update `useRolePermissions.ts` to inherit parent `cms` permissions for `cms-*` keys**
- [ ] **Step 2: Update `ActiveMenu` type in `SuperAdminDashboard.tsx` to include `cms-banner` | `cms-branding` | `cms-hero` | `cms-location`**
- [ ] **Step 3: Run Vitest to verify hook tests pass**

---

### Task 2: Implement Sidebar Accordion Item in `DashboardSidebar`

**Files:**
- Modify: `library-fe/src/pages/dashboard/SuperAdminDashboard.tsx`
- Test: `library-fe/src/pages/dashboard/__tests__/SuperAdminDashboard.test.tsx` (or new navigation unit test)

- [ ] **Step 1: Write unit test verifying CMS menu renders as collapsible with 4 child sub-items**
- [ ] **Step 2: Implement accordion expand/collapse state and render `SidebarMenuSub` with `cms-banner`, `cms-branding`, `cms-hero`, and `cms-location`**
- [ ] **Step 3: Add Chevron icon indicator and active styling for parent & child buttons**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 3: Refactor `CmsSection.tsx` to Focused Sub-Page View

**Files:**
- Modify: `library-fe/src/components/dashboard/CmsSection.tsx`
- Test: `library-fe/src/components/dashboard/__tests__/CmsSection.test.tsx`

- [ ] **Step 1: Update `CmsSection.tsx` to accept an `activeSubPage?: "banner" | "branding" | "hero" | "location"` prop**
- [ ] **Step 2: Remove horizontal `Tabs` bar and render only the selected sub-page (`BannerTab`, `BrandingTab`, `HeroTab`, or `FooterLocationTab`)**
- [ ] **Step 3: Update `CmsSection.test.tsx` to verify independent sub-page rendering**
- [ ] **Step 4: Run test suite to verify 100% pass**

---

### Task 4: Connect Routing in `SuperAdminDashboard.tsx` Main Content Area

**Files:**
- Modify: `library-fe/src/pages/dashboard/SuperAdminDashboard.tsx:500-540`

- [ ] **Step 1: In `renderContent()`, map `cms-banner`, `cms-branding`, `cms-hero`, `cms-location`, and fallback `cms` to `<CmsSection />` with corresponding `activeSubPage`**
- [ ] **Step 2: Verify `bun run build` in `library-fe` passes cleanly without type errors**

---

### Task 5: End-to-End Verification with Playwright

**Files:**
- Modify: `library-umc/scripts/e2e-cms-and-logo-verification.ts`

- [ ] **Step 1: Update E2E test to click the CMS accordion menu in sidebar and navigate to each sub-menu item**
- [ ] **Step 2: Run local test script against preview build or verify build integrity**
