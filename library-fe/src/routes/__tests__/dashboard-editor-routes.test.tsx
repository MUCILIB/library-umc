import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AppRoutes from "../index";

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: { role: "super_admin", name: "Super Admin" },
      },
    }),
  },
}));

vi.mock("@/pages/Home", () => ({
  default: () => <div>Home</div>,
}));

vi.mock("@/pages/dashboard/SuperAdminDashboard", () => ({
  default: () => {
    const search = window.location.search;
    return <div data-testid="super-admin-dashboard">Dashboard Loaded with search: {search}</div>;
  },
}));

describe("Dashboard Editor Canonical Redirect Routes", () => {
  it("redirects /dashboard/ebooks/baru to /dashboard/super-admin?tab=ebooks&action=create", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/ebooks/baru"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("super-admin-dashboard")).toBeInTheDocument();
  });

  it("redirects /dashboard/repository/baru to /dashboard/super-admin?tab=repository&action=create", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/repository/baru"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("super-admin-dashboard")).toBeInTheDocument();
  });
});
