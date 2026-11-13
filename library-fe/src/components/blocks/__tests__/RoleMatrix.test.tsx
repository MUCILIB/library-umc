import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  RoleMatrix,
  applySmartPermissionToggle,
  toggleAllMenuPermissions,
  getAccessStatus,
} from "../RoleMatrix";
import type { PermissionItem, SidebarMenuMeta } from "@/api/client";

describe("RoleMatrix pure helper functions", () => {
  const baseItem: PermissionItem = {
    menuKey: "test_menu",
    canView: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
  };

  it("applySmartPermissionToggle: mengaktifkan canAdd otomatis mengaktifkan canView", () => {
    const updated = applySmartPermissionToggle(baseItem, "canAdd", true);
    expect(updated.canAdd).toBe(true);
    expect(updated.canView).toBe(true);
  });

  it("applySmartPermissionToggle: mengaktifkan canEdit atau canDelete otomatis mengaktifkan canView", () => {
    const updatedEdit = applySmartPermissionToggle(baseItem, "canEdit", true);
    expect(updatedEdit.canEdit).toBe(true);
    expect(updatedEdit.canView).toBe(true);

    const updatedDelete = applySmartPermissionToggle(baseItem, "canDelete", true);
    expect(updatedDelete.canDelete).toBe(true);
    expect(updatedDelete.canView).toBe(true);
  });

  it("applySmartPermissionToggle: mematikan canView otomatis mematikan semua mutasi", () => {
    const fullItem: PermissionItem = {
      menuKey: "test_menu",
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
    };

    const turnedOff = applySmartPermissionToggle(fullItem, "canView", false);
    expect(turnedOff.canView).toBe(false);
    expect(turnedOff.canAdd).toBe(false);
    expect(turnedOff.canEdit).toBe(false);
    expect(turnedOff.canDelete).toBe(false);
  });

  it("toggleAllMenuPermissions: mengaktifkan semua jika belum semua aktif, mematikan jika sudah semua", () => {
    const turnedOn = toggleAllMenuPermissions(baseItem);
    expect(turnedOn.canView).toBe(true);
    expect(turnedOn.canAdd).toBe(true);
    expect(turnedOn.canEdit).toBe(true);
    expect(turnedOn.canDelete).toBe(true);

    const turnedOff = toggleAllMenuPermissions(turnedOn);
    expect(turnedOff.canView).toBe(false);
    expect(turnedOff.canAdd).toBe(false);
    expect(turnedOff.canEdit).toBe(false);
    expect(turnedOff.canDelete).toBe(false);
  });

  it("getAccessStatus: mengidentifikasi status akses dengan akurat", () => {
    expect(getAccessStatus(undefined)).toBe("NONE");
    expect(getAccessStatus(baseItem)).toBe("NONE");

    expect(
      getAccessStatus({
        menuKey: "m",
        canView: true,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      })
    ).toBe("VIEW_ONLY");

    expect(
      getAccessStatus({
        menuKey: "m",
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      })
    ).toBe("FULL");

    expect(
      getAccessStatus({
        menuKey: "m",
        canView: true,
        canAdd: true,
        canEdit: false,
        canDelete: false,
      })
    ).toBe("CUSTOM");
  });
});

describe("RoleMatrix Component rendering & callbacks", () => {
  const mockMenus: SidebarMenuMeta[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      group: "Utama",
      description: "Ringkasan statistik",
    },
    {
      key: "loans",
      label: "Peminjaman",
      group: "Sirkulasi",
      description: "Data peminjaman",
    },
  ];

  const mockMatrix: Record<string, PermissionItem> = {
    dashboard: {
      menuKey: "dashboard",
      canView: true,
      canAdd: false,
      canEdit: false,
      canDelete: false,
    },
    loans: {
      menuKey: "loans",
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
    },
  };

  it("memanggil onPermissionChange saat switch diklik", () => {
    const handlePermissionChange = vi.fn();
    const handleRowToggle = vi.fn();

    render(
      <RoleMatrix
        menus={mockMenus}
        matrix={mockMatrix}
        onPermissionChange={handlePermissionChange}
        onRowToggleAll={handleRowToggle}
      />
    );

    const switchBtn = screen.getByTestId("switch-dashboard-canView");
    fireEvent.click(switchBtn);

    expect(handlePermissionChange).toHaveBeenCalledWith("dashboard", "canView");
  });

  it("memanggil onRowToggleAll saat tombol aksi cepat baris diklik", () => {
    const handlePermissionChange = vi.fn();
    const handleRowToggle = vi.fn();

    render(
      <RoleMatrix
        menus={mockMenus}
        matrix={mockMatrix}
        onPermissionChange={handlePermissionChange}
        onRowToggleAll={handleRowToggle}
      />
    );

    const quickBtn = screen.getByTestId("btn-quick-toggle-loans");
    fireEvent.click(quickBtn);

    expect(handleRowToggle).toHaveBeenCalledWith("loans");
  });

  it("memanggil onGroupToggleAll saat tombol aksi cepat grup diklik", () => {
    const handleGroupToggle = vi.fn();

    render(
      <RoleMatrix
        menus={mockMenus}
        matrix={mockMatrix}
        onPermissionChange={vi.fn()}
        onRowToggleAll={vi.fn()}
        onGroupToggleAll={handleGroupToggle}
      />
    );

    const groupBtn = screen.getByTestId("btn-group-toggle-Utama");
    fireEvent.click(groupBtn);

    expect(handleGroupToggle).toHaveBeenCalledWith("Utama", expect.any(Boolean));
  });
});
