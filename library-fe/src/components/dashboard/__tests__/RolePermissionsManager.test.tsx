import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RolePermissionsManager from "../RolePermissionsManager";
import { roleApi } from "@/api/client";

vi.mock("@/api/client", () => ({
  roleApi: {
    getAll: vi.fn(),
    getMenus: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updatePermissions: vi.fn(),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("RolePermissionsManager Component", () => {
  const mockRoles = [
    {
      id: "super_admin",
      name: "Super Admin",
      description: "Akses penuh tanpa batas",
      isSystem: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: "staff",
      name: "Staf Perpustakaan",
      description: "Pengelolaan sirkulasi dan katalog",
      isSystem: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];

  const mockMenus = [
    {
      key: "circulation",
      label: "Sirkulasi & Scan",
      group: "Sirkulasi & Layanan",
      description: "Peminjaman cepat dengan pemindai barcode",
    },
    {
      key: "bibliographies",
      label: "Bibliografi (Buku)",
      group: "Manajemen Koleksi",
      description: "Katalog judul buku",
    },
  ];

  const mockSuperAdminDetail = {
    ...mockRoles[0],
    permissions: [
      { menuKey: "circulation", canView: true, canAdd: true, canEdit: true, canDelete: true },
      { menuKey: "bibliographies", canView: true, canAdd: true, canEdit: true, canDelete: true },
    ],
  };

  const mockStaffDetail = {
    ...mockRoles[1],
    permissions: [
      { menuKey: "circulation", canView: true, canAdd: true, canEdit: true, canDelete: false },
      { menuKey: "bibliographies", canView: true, canAdd: false, canEdit: false, canDelete: false },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (roleApi.getAll as any).mockResolvedValue({ data: mockRoles });
    (roleApi.getMenus as any).mockResolvedValue({ data: mockMenus });
    (roleApi.getById as any).mockImplementation((id: string) => {
      if (id === "super_admin") return Promise.resolve({ data: mockSuperAdminDetail });
      return Promise.resolve({ data: mockStaffDetail });
    });
  });

  it("merender judul matriks dan pill navigasi role", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(
        screen.getByText("Matriks Hak Akses & Role Dinamis (RBAC)")
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText("Super Admin").length).toBeGreaterThan(0);
    expect(screen.getByText("Staf Perpustakaan")).toBeInTheDocument();
  });

  it("menampilkan banner terkunci saat role Super Admin dipilih", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(
        screen.getByText(/Hak Akses Super Admin Terkunci Penuh/i)
      ).toBeInTheDocument();
    });
  });

  it("bisa beralih ke role Staf dan menampilkan tombol Simpan", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(screen.getByText("Staf Perpustakaan")).toBeInTheDocument();
    });

    const staffButton = screen.getByText("Staf Perpustakaan").closest("button");
    if (staffButton) {
      fireEvent.click(staffButton);
    }

    await waitFor(() => {
      expect(screen.getByText("Simpan Perubahan Matriks")).toBeInTheDocument();
      expect(screen.getByText("Aktifkan Semua")).toBeInTheDocument();
      expect(screen.getByText("Nonaktifkan Semua")).toBeInTheDocument();
    });
  });
});
