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

vi.mock("@/pages/dashboard/SuperAdminDashboard", () => ({
  default: () => <div data-testid="super-admin-dashboard">Super Admin Dashboard</div>,
}));

vi.mock("@/pages/Home", () => ({
  default: () => <div>Home</div>,
}));

describe("AppRoutes Dashboard Redirects", () => {
  it("redirects /dashboard to /dashboard/super-admin", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("super-admin-dashboard")).toBeInTheDocument();
  });

  it("redirects /dashboard/loans to /dashboard/super-admin?tab=loans without 404", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/loans"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("super-admin-dashboard")).toBeInTheDocument();
  });
});
