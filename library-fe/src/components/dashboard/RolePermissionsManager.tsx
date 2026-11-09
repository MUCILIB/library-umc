import { useEffect, useState, useMemo } from "react";
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
import { RoleMatrix, type PermissionGroup } from "@/components/blocks/RoleMatrix";

export default function RolePermissionsManager() {
  const { success, error: showError, warning } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<SidebarMenuMeta[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("super_admin");
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<RoleDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states for Create Role Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Form states for Edit Role Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Form states for Delete Role Modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Current Matrix State for the selected role: menuKey -> PermissionItem
  const [matrix, setMatrix] = useState<Record<string, PermissionItem>>({});

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [rolesRes, menusRes] = await Promise.all([
        roleApi.getAll(),
        roleApi.getMenus(),
      ]);

      const allRoles = rolesRes.data || [];
      const allMenus = menusRes.data || [];

      setRoles(allRoles);
      setMenus(allMenus);

      if (allRoles.length > 0) {
        const defaultRole =
          allRoles.find((r) => r.id === "super_admin") || allRoles[0];
        setSelectedRoleId(defaultRole.id);
        await loadRoleDetail(defaultRole.id, allMenus);
      }
    } catch (err) {
      console.error(err);
      showError("Gagal", "Gagal memuat konfigurasi Role & Matriks", 4000);
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

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleDetail || !editName.trim()) {
      warning("Perhatian", "Nama role wajib diisi", 3000);
      return;
    }

    try {
      setEditLoading(true);
      await roleApi.update(selectedRoleDetail.id, {
        name: selectedRoleDetail.isSystem ? undefined : editName.trim(),
        description: editDescription.trim(),
      });

      success("Berhasil", "Informasi role berhasil diperbarui", 3000);
      setIsEditOpen(false);

      const rolesRes = await roleApi.getAll();
      setRoles(rolesRes.data || []);
      await loadRoleDetail(selectedRoleDetail.id, menus);
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
      await roleApi.delete(selectedRoleDetail.id);
      success("Berhasil", `Role '${selectedRoleDetail.name}' berhasil dihapus`, 3000);
      setIsDeleteOpen(false);

      const rolesRes = await roleApi.getAll();
      setRoles(rolesRes.data || []);

      const nextRole = rolesRes.data?.find((r) => r.id === "super_admin") || rolesRes.data?.[0];
      if (nextRole) {
        setSelectedRoleId(nextRole.id);
        await loadRoleDetail(nextRole.id, menus);
      }
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

  // RoleMatrix Props Conversion
  const matrixRoles = useMemo(() => {
    if (!selectedRoleDetail) return [];
    return [{ id: selectedRoleDetail.id, label: selectedRoleDetail.name }];
  }, [selectedRoleDetail]);

  const matrixGroups: PermissionGroup[] = useMemo(() => {
    return Object.entries(groupedMenus).map(([groupName, groupMenuList]) => ({
      resource: groupName,
      permissions: groupMenuList.flatMap((m) => {
        if (m.key === "cms") {
          return [
            { id: `${m.key}:canView`, label: `${m.label}: Lihat Pengaturan Web` },
            { id: `${m.key}:canEdit`, label: `${m.label}: Ubah & Simpan Konten` },
          ];
        }
        return [
          { id: `${m.key}:canView`, label: `${m.label}: Lihat / Akses Menu` },
          { id: `${m.key}:canAdd`, label: `${m.label}: Tambah Data` },
          { id: `${m.key}:canEdit`, label: `${m.label}: Ubah Data` },
          { id: `${m.key}:canDelete`, label: `${m.label}: Hapus Data` },
        ];
      }),
    }));
  }, [groupedMenus]);

  const matrixValue: Record<string, string[]> = useMemo(() => {
    if (!selectedRoleDetail) return {};
    const val: Record<string, string[]> = {};
    for (const m of menus) {
      const p = matrix[m.key];
      if (!p) continue;
      if (isSuperAdminSelected || p.canView) {
        val[`${m.key}:canView`] = [selectedRoleDetail.id];
      }
      if (isSuperAdminSelected || p.canAdd) {
        val[`${m.key}:canAdd`] = [selectedRoleDetail.id];
      }
      if (isSuperAdminSelected || p.canEdit) {
        val[`${m.key}:canEdit`] = [selectedRoleDetail.id];
      }
      if (isSuperAdminSelected || p.canDelete) {
        val[`${m.key}:canDelete`] = [selectedRoleDetail.id];
      }
    }
    return val;
  }, [matrix, menus, selectedRoleDetail, isSuperAdminSelected]);

  const handleMatrixValueChange = (nextValue: Record<string, string[]>) => {
    if (isSuperAdminSelected || !selectedRoleDetail) return;

    setMatrix((prev) => {
      const next = { ...prev };
      for (const m of menus) {
        const canView = Boolean(nextValue[`${m.key}:canView`]?.includes(selectedRoleDetail.id));
        const canAdd = Boolean(nextValue[`${m.key}:canAdd`]?.includes(selectedRoleDetail.id));
        const canEdit = Boolean(nextValue[`${m.key}:canEdit`]?.includes(selectedRoleDetail.id));
        const canDelete = Boolean(nextValue[`${m.key}:canDelete`]?.includes(selectedRoleDetail.id));

        next[m.key] = {
          menuKey: m.key,
          canView: canAdd || canEdit || canDelete ? true : canView,
          canAdd,
          canEdit,
          canDelete,
        };
      }
      return next;
    });
  };

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
        <div className="space-y-6">
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
          </div>

          {/* RoleMatrix Component from https://uipkge.dev/r/react/role-matrix.json */}
          <RoleMatrix
            title={`Matriks Hak Akses: ${selectedRoleDetail.name}`}
            description="Tentukan hak akses granular (Lihat, Tambah, Ubah, Hapus) untuk setiap modul."
            roles={matrixRoles}
            groups={matrixGroups}
            value={matrixValue}
            onValueChange={handleMatrixValueChange}
            readOnly={isSuperAdminSelected}
          />
        </div>
      )}

      {/* Modal Tambah Role Kustom */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !createLoading && setIsCreateOpen(false)}
        title="Tambah Role Kustom Baru"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Nama Role <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Contoh: Asisten Laboratorium, Kepala Perpustakaan"
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              required
              disabled={createLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Tugas pokok dan lingkup wewenang role ini..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
              disabled={createLoading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={createLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
            >
              {createLoading && <Loader2 size={12} className="animate-spin" />}
              Simpan Role Baru
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Role */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => !editLoading && setIsEditOpen(false)}
        title={`Edit Role: ${selectedRoleDetail?.name}`}
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Nama Role <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              required
              disabled={editLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
              disabled={editLoading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              disabled={editLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
            >
              {editLoading && <Loader2 size={12} className="animate-spin" />}
              Perbarui Role
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Hapus Role */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !deleteLoading && setIsDeleteOpen(false)}
        title="Konfirmasi Hapus Role"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2 text-xs leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              Apakah Anda yakin ingin menghapus role <strong>{selectedRoleDetail?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteRole()}
              disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors shadow-xs"
            >
              {deleteLoading && <Loader2 size={12} className="animate-spin" />}
              Hapus Role Permanen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
