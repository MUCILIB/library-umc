import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AppRoutes from "../index";

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: { role: "student", name: "Mahasiswa UMC" },
      },
    }),
  },
}));

vi.mock("@/pages/Home", () => ({
  default: () => <div>Home</div>,
}));

vi.mock("@/pages/RepositoriPage", () => ({
  default: () => <div data-testid="repositori-page">Repositori Karya Ilmiah Mahasiswa</div>,
}));

describe("Repositori Route and Canonical Redirects", () => {
  it("renders RepositoriPage on /repositori", async () => {
    render(
      <MemoryRouter initialEntries={["/repositori"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("repositori-page")).toBeInTheDocument();
  });

  it("redirects /e-resource to /repositori", async () => {
    render(
      <MemoryRouter initialEntries={["/e-resource"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("repositori-page")).toBeInTheDocument();
  });
});
