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

  it("merender tabel matriks switch horizontal dengan kolom Lihat, Tambah, Ubah, Hapus", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(screen.getByText("Staf Perpustakaan")).toBeInTheDocument();
    });

    const staffButton = screen.getByText("Staf Perpustakaan").closest("button");
    if (staffButton) fireEvent.click(staffButton);

    await waitFor(() => {
      // Header tabel
      expect(screen.getByText("Modul / Sub-Menu")).toBeInTheDocument();
      expect(screen.getByText("Lihat (View)")).toBeInTheDocument();
      expect(screen.getByText("Tambah (Add)")).toBeInTheDocument();
      expect(screen.getByText("Ubah (Edit)")).toBeInTheDocument();
      expect(screen.getByText("Hapus (Delete)")).toBeInTheDocument();
      expect(screen.getByText("Aksi Cepat")).toBeInTheDocument();

      // Baris menu
      expect(screen.getByText("Sirkulasi & Scan")).toBeInTheDocument();
      expect(screen.getByText("Bibliografi (Buku)")).toBeInTheDocument();
    });
  });

  it("menerapkan smart dependency: mengaktifkan canAdd otomatis mengaktifkan canView", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(screen.getByText("Staf Perpustakaan")).toBeInTheDocument();
    });

    const staffButton = screen.getByText("Staf Perpustakaan").closest("button");
    if (staffButton) fireEvent.click(staffButton);

    await waitFor(() => {
      expect(screen.getByTestId("switch-bibliographies-canAdd")).toBeInTheDocument();
    });

    const viewSwitch = screen.getByTestId("switch-bibliographies-canView");
    const addSwitch = screen.getByTestId("switch-bibliographies-canAdd");

    // Awalnya canAdd adalah false untuk bibliographies pada staff
    expect(addSwitch).toHaveAttribute("aria-checked", "false");

    // Klik toggle addSwitch
    fireEvent.click(addSwitch);

    // canAdd menjadi true dan canView dipastikan true
    expect(addSwitch).toHaveAttribute("aria-checked", "true");
    expect(viewSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("menerapkan smart dependency: mematikan canView otomatis mematikan canAdd, canEdit, canDelete", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(screen.getByText("Staf Perpustakaan")).toBeInTheDocument();
    });

    const staffButton = screen.getByText("Staf Perpustakaan").closest("button");
    if (staffButton) fireEvent.click(staffButton);

    await waitFor(() => {
      expect(screen.getByTestId("switch-circulation-canView")).toBeInTheDocument();
    });

    const viewSwitch = screen.getByTestId("switch-circulation-canView");
    const addSwitch = screen.getByTestId("switch-circulation-canAdd");
    const editSwitch = screen.getByTestId("switch-circulation-canEdit");

    // Pada staff mock, circulation canView=true, canAdd=true, canEdit=true
    expect(viewSwitch).toHaveAttribute("aria-checked", "true");
    expect(addSwitch).toHaveAttribute("aria-checked", "true");
    expect(editSwitch).toHaveAttribute("aria-checked", "true");

    // Matikan canView
    fireEvent.click(viewSwitch);

    // Seluruh aksi otomatis mati
    expect(viewSwitch).toHaveAttribute("aria-checked", "false");
    expect(addSwitch).toHaveAttribute("aria-checked", "false");
    expect(editSwitch).toHaveAttribute("aria-checked", "false");
  });

  it("tombol aksi cepat per baris mengaktifkan dan mengosongkan semua izin modul", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(screen.getByText("Staf Perpustakaan")).toBeInTheDocument();
    });

    const staffButton = screen.getByText("Staf Perpustakaan").closest("button");
    if (staffButton) fireEvent.click(staffButton);

    await waitFor(() => {
      expect(screen.getByTestId("btn-quick-toggle-bibliographies")).toBeInTheDocument();
    });

    const quickBtn = screen.getByTestId("btn-quick-toggle-bibliographies");
    fireEvent.click(quickBtn);

    const viewSwitch = screen.getByTestId("switch-bibliographies-canView");
    const addSwitch = screen.getByTestId("switch-bibliographies-canAdd");
    const editSwitch = screen.getByTestId("switch-bibliographies-canEdit");
    const deleteSwitch = screen.getByTestId("switch-bibliographies-canDelete");

    expect(viewSwitch).toHaveAttribute("aria-checked", "true");
    expect(addSwitch).toHaveAttribute("aria-checked", "true");
    expect(editSwitch).toHaveAttribute("aria-checked", "true");
    expect(deleteSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("pada role super_admin, seluruh switch berstatus checked dan disabled", async () => {
    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(screen.getByTestId("switch-circulation-canView")).toBeInTheDocument();
    });

    const circulationView = screen.getByTestId("switch-circulation-canView");
    const circulationAdd = screen.getByTestId("switch-circulation-canAdd");
    const circulationEdit = screen.getByTestId("switch-circulation-canEdit");
    const circulationDelete = screen.getByTestId("switch-circulation-canDelete");

    expect(circulationView).toHaveAttribute("aria-checked", "true");
    expect(circulationAdd).toHaveAttribute("aria-checked", "true");
    expect(circulationEdit).toHaveAttribute("aria-checked", "true");
    expect(circulationDelete).toHaveAttribute("aria-checked", "true");

    expect(circulationView).toBeDisabled();
    expect(circulationAdd).toBeDisabled();
    expect(circulationEdit).toBeDisabled();
    expect(circulationDelete).toBeDisabled();
  });

  it("menyimpan perubahan matriks mengirim data permissions yang diperbarui", async () => {
    (roleApi.updatePermissions as any).mockResolvedValue({ success: true });

    render(<RolePermissionsManager />);

    await waitFor(() => {
      expect(screen.getByText("Staf Perpustakaan")).toBeInTheDocument();
    });

    const staffButton = screen.getByText("Staf Perpustakaan").closest("button");
    if (staffButton) fireEvent.click(staffButton);

    await waitFor(() => {
      expect(screen.getByTestId("switch-bibliographies-canAdd")).toBeInTheDocument();
    });

    // Nyalakan canAdd untuk bibliographies
    const addSwitch = screen.getByTestId("switch-bibliographies-canAdd");
    fireEvent.click(addSwitch);

    const saveButton = screen.getByText("Simpan Perubahan Matriks");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(roleApi.updatePermissions).toHaveBeenCalledWith(
        "staff",
        expect.arrayContaining([
          expect.objectContaining({
            menuKey: "bibliographies",
            canView: true,
            canAdd: true,
          }),
        ])
      );
    });
  });
});
