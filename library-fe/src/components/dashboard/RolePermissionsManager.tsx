import { useEffect, useState, useMemo, Fragment } from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Lock,
  Loader2,
} from "lucide-react";
import {
  roleApi,
  type Role,
  type RoleDetail,
  type PermissionItem,
  type SidebarMenuMeta,
} from "@/api/client";
import { useToast } from "@/hooks/useToast";
import Modal from "@/components/ui/modal";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
}

function ToggleSwitch({ checked, onChange, disabled, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary/30 ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function RolePermissionsManager() {
  const { success, error: showError, warning } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("super_admin");
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<RoleDetail | null>(null);
  const [menus, setMenus] = useState<SidebarMenuMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Matrix state: menuKey -> PermissionItem
  const [matrix, setMatrix] = useState<Record<string, PermissionItem>>({});

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load roles & menus
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [rolesRes, menusRes] = await Promise.all([
        roleApi.getAll(),
        roleApi.getMenus(),
      ]);
      setRoles(rolesRes.data || []);
      setMenus(menusRes.data || []);

      const activeId = rolesRes.data?.[0]?.id || "super_admin";
      setSelectedRoleId(activeId);
      await loadRoleDetail(activeId, menusRes.data || []);
    } catch (err) {
      console.error(err);
      showError("Gagal", "Gagal memuat daftar role dan menu", 4000);
    } finally {
      setLoading(false);
    }
  };

  const loadRoleDetail = async (roleId: string, currentMenus: SidebarMenuMeta[]) => {
    try {
      const res = await roleApi.getById(roleId);
      const detail = res.data;
      setSelectedRoleDetail(detail);

      const newMatrix: Record<string, PermissionItem> = {};
      const menuList = currentMenus.length > 0 ? currentMenus : menus;

      for (const m of menuList) {
        const found = detail.permissions?.find((p) => p.menuKey === m.key);
        newMatrix[m.key] = {
          menuKey: m.key,
          canView: detail.id === "super_admin" || Boolean(found?.canView),
          canAdd: detail.id === "super_admin" || Boolean(found?.canAdd),
          canEdit: detail.id === "super_admin" || Boolean(found?.canEdit),
          canDelete: detail.id === "super_admin" || Boolean(found?.canDelete),
        };
      }
      setMatrix(newMatrix);
    } catch (err) {
      console.error(err);
      showError("Gagal", `Gagal memuat rincian izin role ${roleId}`, 4000);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  const handleSelectRole = async (roleId: string) => {
    setSelectedRoleId(roleId);
    await loadRoleDetail(roleId, menus);
  };

  const handleToggle = (
    menuKey: string,
    action: "canView" | "canAdd" | "canEdit" | "canDelete",
    val: boolean
  ) => {
    if (selectedRoleId === "super_admin") return;

    setMatrix((prev) => {
      const current = prev[menuKey] || {
        menuKey,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      };

      const updated = {
        ...current,
        [action]: val,
      };

      // Jika add, edit, atau delete diaktifkan, otomatis pastikan canView juga true
      if (val && action !== "canView") {
        updated.canView = true;
      }
      // Jika canView dinonaktifkan, otomatis matikan add, edit, dan delete
      if (!val && action === "canView") {
        updated.canAdd = false;
        updated.canEdit = false;
        updated.canDelete = false;
      }

      return {
        ...prev,
        [menuKey]: updated,
      };
    });
  };

  const handleSetAll = (enable: boolean) => {
    if (selectedRoleId === "super_admin") return;

    setMatrix(() => {
      const next: Record<string, PermissionItem> = {};
      for (const m of menus) {
        next[m.key] = {
          menuKey: m.key,
          canView: enable,
          canAdd: enable,
          canEdit: enable,
          canDelete: enable,
        };
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleDetail || selectedRoleId === "super_admin") return;

    try {
      setSaving(true);
      const permissionsArray = Object.values(matrix);
      await roleApi.updatePermissions(selectedRoleId, permissionsArray);
      success("Berhasil", `Matriks hak akses role '${selectedRoleDetail.name}' berhasil disimpan`, 3000);
      await loadRoleDetail(selectedRoleId, menus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan hak akses";
      showError("Gagal", msg, 4000);
    } finally {
      setSaving(false);
    }
  };

  // Create Role Handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      warning("Perhatian", "Nama role wajib diisi", 3000);
      return;
    }

    try {
      setCreateLoading(true);
      const res = await roleApi.create({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
      });

      success("Berhasil", `Role '${res.data.name}' berhasil dibuat`, 3000);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");

      const rolesRes = await roleApi.getAll();
      setRoles(rolesRes.data || []);
      setSelectedRoleId(res.data.id);
      await loadRoleDetail(res.data.id, menus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat role";
      showError("Gagal", msg, 4000);
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit Role Handler
  const handleOpenEdit = () => {
    if (!selectedRoleDetail) return;
    setEditName(selectedRoleDetail.name);
    setEditDescription(selectedRoleDetail.description || "");
    setIsEditOpen(true);
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleDetail) return;

    try {
      setEditLoading(true);
      await roleApi.update(selectedRoleId, {
        name: selectedRoleDetail.isSystem ? undefined : editName.trim(),
        description: editDescription.trim(),
      });

      success("Berhasil", "Informasi role berhasil diperbarui", 3000);
      setIsEditOpen(false);

      const rolesRes = await roleApi.getAll();
      setRoles(rolesRes.data || []);
      await loadRoleDetail(selectedRoleId, menus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui role";
      showError("Gagal", msg, 4000);
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Role Handler
  const handleDeleteRole = async () => {
    if (!selectedRoleDetail || selectedRoleDetail.isSystem) return;

    try {
      setDeleteLoading(true);
      await roleApi.delete(selectedRoleId);

      success("Berhasil", `Role '${selectedRoleDetail.name}' berhasil dihapus`, 3000);
      setIsDeleteOpen(false);

      const rolesRes = await roleApi.getAll();
      setRoles(rolesRes.data || []);
      const nextRole = rolesRes.data?.[0]?.id || "super_admin";
      setSelectedRoleId(nextRole);
      await loadRoleDetail(nextRole, menus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus role";
      showError("Gagal", msg, 4000);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Grouped menus for organized matrix presentation
  const groupedMenus = useMemo(() => {
    const groups: Record<string, SidebarMenuMeta[]> = {};
    for (const m of menus) {
      if (!groups[m.group]) {
        groups[m.group] = [];
      }
      groups[m.group].push(m);
    }
    return groups;
  }, [menus]);

  const isSuperAdminSelected = selectedRoleId === "super_admin";

  return (
    <div className="space-y-6">
      {/* Header & Role Badges Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="text-primary size-5" />
            Matriks Hak Akses & Role Dinamis (RBAC)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tentukan visibilitas sub-menu sidebar dan izin operasi (Lihat, Tambah, Ubah, Hapus) per role.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs shrink-0"
        >
          <Plus size={14} />
          Tambah Role Kustom
        </button>
      </div>

      {/* Role Pill Navigation */}
      <div className="flex flex-wrap gap-2 p-2 bg-muted/60 border border-border rounded-2xl">
        {roles.map((r) => {
          const isSelected = r.id === selectedRoleId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => void handleSelectRole(r.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              <ShieldCheck
                size={14}
                className={
                  r.id === "super_admin"
                    ? "text-amber-500"
                    : r.isSystem
                    ? "text-blue-500"
                    : "text-emerald-500"
                }
              />
              <span>{r.name}</span>
              {r.isSystem ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-semibold">
                  Sistem
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Kustom
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Role Card & Matrix Controls */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-card border border-border rounded-[24px]">
          <Loader2 className="animate-spin text-primary size-6" />
        </div>
      ) : selectedRoleDetail && (
        <div className="bg-card border border-border rounded-[24px] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground">
                  {selectedRoleDetail.name}
                </h3>
                <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  id: {selectedRoleDetail.id}
                </span>
                {selectedRoleDetail.isSystem && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <Lock size={10} /> Role Sistem Bawaan
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedRoleDetail.description || "Tidak ada deskripsi role."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted text-foreground transition-colors"
              >
                <Edit2 size={12} /> Edit Role
              </button>

              {!selectedRoleDetail.isSystem && (
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/20 text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 size={12} /> Hapus
                </button>
              )}
            </div>
          </div>

          {/* Super Admin Notice Banner */}
          {isSuperAdminSelected ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <Lock className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold">Hak Akses Super Admin Terkunci Penuh:</span> Role ini
                memiliki hak akses universal tanpa batas untuk memastikan sistem selalu dapat
                dikonfigurasi dan tidak terkunci secara tidak sengaja.
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAll(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Aktifkan Semua
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAll(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <XCircle size={13} className="text-rose-500" />
                  Nonaktifkan Semua
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleSavePermissions()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Simpan Perubahan Matriks
              </button>
            </div>
          )}

          {/* Matrix Table */}
          <div className="border border-border rounded-2xl overflow-hidden shadow-2xs bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/80 border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 w-[40%]">Sub-Menu Sidebar</th>
                    <th className="py-3.5 px-3 text-center w-[15%]">Lihat (View)</th>
                    <th className="py-3.5 px-3 text-center w-[15%]">Tambah (Add)</th>
                    <th className="py-3.5 px-3 text-center w-[15%]">Ubah (Edit)</th>
                    <th className="py-3.5 px-3 text-center w-[15%]">Hapus (Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(groupedMenus).map(([groupName, groupMenuList]) => {
                    const groupTotalPerms = groupMenuList.length * 4;
                    const groupActivePerms = groupMenuList.reduce((acc, m) => {
                      const p = matrix[m.key] || {
                        canView: isSuperAdminSelected,
                        canAdd: isSuperAdminSelected,
                        canEdit: isSuperAdminSelected,
                        canDelete: isSuperAdminSelected,
                      };
                      return (
                        acc +
                        (p.canView ? 1 : 0) +
                        (p.canAdd ? 1 : 0) +
                        (p.canEdit ? 1 : 0) +
                        (p.canDelete ? 1 : 0)
                      );
                    }, 0);

                    return (
                      <Fragment key={groupName}>
                        {/* Group Header Row dengan ringkasan status izin */}
                        <tr className="bg-muted/60 font-bold text-foreground">
                          <td colSpan={5} className="py-2.5 px-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                                <Layers size={13} className="text-primary" />
                                {groupName}
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground bg-background px-2.5 py-0.5 rounded-full border border-border shadow-2xs">
                                {groupActivePerms} dari {groupTotalPerms} izin aktif
                              </span>
                            </div>
                          </td>
                        </tr>

                      {groupMenuList.map((menuItem) => {
                        const perm = matrix[menuItem.key] || {
                          menuKey: menuItem.key,
                          canView: isSuperAdminSelected,
                          canAdd: isSuperAdminSelected,
                          canEdit: isSuperAdminSelected,
                          canDelete: isSuperAdminSelected,
                        };

                        return (
                          <tr
                            key={menuItem.key}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <p className="font-bold text-foreground text-sm">
                                {menuItem.label}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {menuItem.description}
                              </p>
                            </td>

                            <td className="py-3 px-3 text-center align-middle">
                              <div className="flex justify-center">
                                <ToggleSwitch
                                  checked={perm.canView}
                                  onChange={(v) =>
                                    handleToggle(menuItem.key, "canView", v)
                                  }
                                  disabled={isSuperAdminSelected}
                                  label={`Lihat ${menuItem.label}`}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center align-middle">
                              <div className="flex justify-center">
                                <ToggleSwitch
                                  checked={perm.canAdd}
                                  onChange={(v) =>
                                    handleToggle(menuItem.key, "canAdd", v)
                                  }
                                  disabled={isSuperAdminSelected}
                                  label={`Tambah ${menuItem.label}`}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center align-middle">
                              <div className="flex justify-center">
                                <ToggleSwitch
                                  checked={perm.canEdit}
                                  onChange={(v) =>
                                    handleToggle(menuItem.key, "canEdit", v)
                                  }
                                  disabled={isSuperAdminSelected}
                                  label={`Ubah ${menuItem.label}`}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center align-middle">
                              <div className="flex justify-center">
                                <ToggleSwitch
                                  checked={perm.canDelete}
                                  onChange={(v) =>
                                    handleToggle(menuItem.key, "canDelete", v)
                                  }
                                  disabled={isSuperAdminSelected}
                                  label={`Hapus ${menuItem.label}`}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Custom Role */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Tambah Role Kustom Baru"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Nama Role <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Contoh: Asisten Laboratorium"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Deskripsi Tugas & Tanggung Jawab
            </label>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Tuliskan deskripsi cakupan tugas role ini..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {createLoading ? "Menyimpan..." : "Buat Role"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Role */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Informasi Role"
      >
        <form onSubmit={handleEditRole} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Nama Role
            </label>
            <input
              type="text"
              value={editName}
              disabled={selectedRoleDetail?.isSystem}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden disabled:opacity-50"
              required
            />
            {selectedRoleDetail?.isSystem && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Nama role sistem bawaan tidak dapat diubah.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Deskripsi
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Konfirmasi Hapus Role"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus role{" "}
              <span className="font-bold">{selectedRoleDetail?.name}</span>? Role ini hanya
              dapat dihapus jika tidak ada akun pengguna yang sedang menggunakannya.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteRole()}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-xl bg-destructive text-white text-xs font-bold hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteLoading ? "Menghapus..." : "Ya, Hapus Role"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
