import * as React from "react";
import {
  Check,
  CheckCheck,
  Eye,
  Layers,
  Minus,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { type SidebarMenuMeta, type PermissionItem } from "@/api/client";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type PermissionAction = "canView" | "canAdd" | "canEdit" | "canDelete";

export const PERMISSION_ACTIONS: readonly {
  action: PermissionAction;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    action: "canView",
    label: "Lihat (View)",
    sublabel: "Akses Halaman",
    icon: Eye,
    color: "text-blue-500",
  },
  {
    action: "canAdd",
    label: "Tambah (Add)",
    sublabel: "Buat Data Baru",
    icon: Plus,
    color: "text-emerald-500",
  },
  {
    action: "canEdit",
    label: "Ubah (Edit)",
    sublabel: "Koreksi / Update",
    icon: Pencil,
    color: "text-amber-500",
  },
  {
    action: "canDelete",
    label: "Hapus (Delete)",
    sublabel: "Arsip / Hapus",
    icon: Trash2,
    color: "text-rose-500",
  },
] as const;

export function applySmartPermissionToggle(
  current: PermissionItem,
  action: PermissionAction,
  nextValue?: boolean
): PermissionItem {
  const value = nextValue !== undefined ? nextValue : !current[action];
  const updated: PermissionItem = { ...current, [action]: value };

  // Smart Dependency 1: Mutation requires View
  if (action !== "canView" && value === true) {
    updated.canView = true;
  }

  // Smart Dependency 2: Turning off View disables all mutations
  if (action === "canView" && value === false) {
    updated.canAdd = false;
    updated.canEdit = false;
    updated.canDelete = false;
  }

  return updated;
}

export function toggleAllMenuPermissions(current: PermissionItem): PermissionItem {
  const isAllActive =
    current.canView && current.canAdd && current.canEdit && current.canDelete;
  const target = !isAllActive;
  return {
    menuKey: current.menuKey,
    canView: target,
    canAdd: target,
    canEdit: target,
    canDelete: target,
  };
}

export type AccessStatus = "FULL" | "VIEW_ONLY" | "CUSTOM" | "NONE";

export function getAccessStatus(item?: PermissionItem): AccessStatus {
  if (!item) return "NONE";
  if (item.canView && item.canAdd && item.canEdit && item.canDelete) return "FULL";
  if (item.canView && !item.canAdd && !item.canEdit && !item.canDelete) return "VIEW_ONLY";
  if (!item.canView && !item.canAdd && !item.canEdit && !item.canDelete) return "NONE";
  return "CUSTOM";
}

export interface HorizontalRoleMatrixProps {
  menus: SidebarMenuMeta[];
  matrix: Record<string, PermissionItem>;
  onPermissionChange: (menuKey: string, action: PermissionAction) => void;
  onRowToggleAll: (menuKey: string) => void;
  onGroupToggleAll?: (groupName: string, enable: boolean) => void;
  readOnly?: boolean;
}

export function RoleMatrix({
  menus,
  matrix,
  onPermissionChange,
  onRowToggleAll,
  onGroupToggleAll,
  readOnly = false,
}: HorizontalRoleMatrixProps) {
  // Group menus by category
  const grouped = React.useMemo(() => {
    const map = new Map<string, SidebarMenuMeta[]>();
    for (const menu of menus) {
      const g = menu.group || "Lainnya";
      const existing = map.get(g) || [];
      existing.push(menu);
      map.set(g, existing);
    }
    return Array.from(map.entries());
  }, [menus]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
              <th className="py-3 px-4 w-[34%]">Modul / Sub-Menu</th>
              {PERMISSION_ACTIONS.map((col) => (
                <th key={col.action} className="py-3 px-3 text-center w-[13%]">
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-bold text-foreground">{col.label}</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {col.sublabel}
                    </span>
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-center w-[14%]">Aksi Cepat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {grouped.map(([groupName, groupMenus]) => {
              // Group level status
              const isGroupAllActive = groupMenus.every((m) => {
                const item = matrix[m.key];
                return (
                  item &&
                  item.canView &&
                  item.canAdd &&
                  item.canEdit &&
                  item.canDelete
                );
              });

              return (
                <React.Fragment key={groupName}>
                  {/* Category Header Row */}
                  <tr className="bg-muted/30 border-y border-border/80">
                    <td colSpan={6} className="py-2.5 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="size-3.5 text-primary" />
                          <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                            {groupName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            {groupMenus.length} modul
                          </span>
                        </div>

                        {!readOnly && onGroupToggleAll && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              data-testid={`btn-group-toggle-${groupName}`}
                              onClick={() => onGroupToggleAll(groupName, !isGroupAllActive)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                            >
                              <CheckCheck size={12} className={isGroupAllActive ? "text-primary" : ""} />
                              <span>{isGroupAllActive ? "Kosongkan Grup" : "Pilih Semua Grup"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Menu Rows */}
                  {groupMenus.map((menu) => {
                    const item = matrix[menu.key] || {
                      menuKey: menu.key,
                      canView: false,
                      canAdd: false,
                      canEdit: false,
                      canDelete: false,
                    };

                    const status = getAccessStatus(item);
                    const isAllActive =
                      item.canView &&
                      item.canAdd &&
                      item.canEdit &&
                      item.canDelete;

                    return (
                      <tr
                        key={menu.key}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        {/* Column 1: Modul name & status */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-xs">
                                {menu.label}
                              </span>
                              {status === "FULL" && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                                  Penuh
                                </span>
                              )}
                              {status === "VIEW_ONLY" && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                                  Hanya Lihat
                                </span>
                              )}
                              {status === "CUSTOM" && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                                  Kustom
                                </span>
                              )}
                              {status === "NONE" && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                                  Nonaktif
                                </span>
                              )}
                            </div>
                            {menu.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {menu.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Column 2-5: Switches */}
                        {PERMISSION_ACTIONS.map((col) => {
                          const isChecked = Boolean(item[col.action]);
                          return (
                            <td
                              key={col.action}
                              className="py-3 px-3 text-center align-middle"
                            >
                              <div className="flex justify-center">
                                <Switch
                                  data-testid={`switch-${menu.key}-${col.action}`}
                                  checked={isChecked}
                                  disabled={readOnly}
                                  onCheckedChange={() =>
                                    onPermissionChange(menu.key, col.action)
                                  }
                                  aria-label={`${menu.label} ${col.label}`}
                                />
                              </div>
                            </td>
                          );
                        })}

                        {/* Column 6: Quick Action */}
                        <td className="py-3 px-4 text-center align-middle">
                          <button
                            type="button"
                            data-testid={`btn-quick-toggle-${menu.key}`}
                            disabled={readOnly}
                            onClick={() => onRowToggleAll(menu.key)}
                            className={cn(
                              "inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-40",
                              isAllActive
                                ? "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                : "border-border bg-card text-foreground hover:bg-muted"
                            )}
                          >
                            {isAllActive ? (
                              <>
                                <Minus className="size-3" />
                                <span>Kosongkan</span>
                              </>
                            ) : (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                <span>Pilih Semua</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { RoleMatrix as HorizontalRoleMatrix };
export default RoleMatrix;
