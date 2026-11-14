import {
  ShieldCheck,
  UserX,
  UserCheck,
  Loader2,
  Trash2,
  MoreHorizontal,
  CreditCard,
  RefreshCw,
  Users2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatar } from "@/lib/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TablePagination } from "@/components/common/TablePagination";
import type { DashboardUser } from "@/services/dashboard/usersManagementService";
import type { Role } from "@/api/client";

export interface UserTableProps {
  users: DashboardUser[];
  loading: boolean;
  error: string | null;
  visibleColumns: Set<string>;
  currentUserId?: string;
  availableRoles: Role[];
  savingId: string | null;
  recordSavingId: string | null;
  syncSavingId: string | null;
  issueSavingId: string | null;
  banSavingId: string | null;
  deletingId: string | null;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onRoleChange: (user: DashboardUser, nextRole: string) => void;
  onRecordVisit: (user: DashboardUser) => void;
  onSyncMember: (user: DashboardUser) => void;
  onIssueCard: (user: DashboardUser) => void;
  onToggleBan: (user: DashboardUser) => void;
  onDeleteUser: (user: DashboardUser) => void;
}

export function getFallbackInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function roleBadgeClass(role: string): string {
  if (role === "super_admin") return "bg-warning-bg text-destructive border-warning-border";
  if (role === "staff") return "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  if (role === "lecturer" || role === "dosen") return "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800";
  if (role === "student") return "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  if (role === "external") return "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  return "bg-muted text-muted-foreground border-border";
}

export function roleBadgeLabel(role: string, availableRoles: Role[]): string {
  const found = availableRoles.find((r) => r.id === role);
  if (found) return found.name;
  if (role === "super_admin") return "Super Admin";
  if (role === "staff") return "Staf";
  if (role === "lecturer" || role === "dosen") return "Dosen";
  if (role === "student") return "Mahasiswa";
  if (role === "external") return "Anggota Luar";
  return role;
}

export function cardStatusLabel(status?: string | null): string {
  switch (status) {
    case "active":
      return "Aktif";
    case "pending":
      return "Menunggu";
    case "rejected":
      return "Ditolak";
    case "expired":
      return "Kedaluwarsa";
    default:
      return "Belum Ajukan";
  }
}

export function cardStatusClass(status?: string | null): string {
  switch (status) {
    case "active":
      return "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
    case "pending":
      return "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "expired":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function UserTable({
  users,
  loading,
  error,
  visibleColumns,
  currentUserId,
  availableRoles,
  savingId,
  recordSavingId,
  syncSavingId,
  issueSavingId,
  banSavingId,
  deletingId,
  canEditUsers,
  canDeleteUsers,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onRoleChange,
  onRecordVisit,
  onSyncMember,
  onIssueCard,
  onToggleBan,
  onDeleteUser,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(6)].map((_, idx) => (
          <Skeleton key={idx} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <Users2 size={42} className="mx-auto mb-3 opacity-40" />
        <p className="font-semibold">Tidak ada user ditemukan</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        <Table className="w-full min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-transparent border-b border-border">
              {visibleColumns.has("user") && (
                <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  User
                </TableHead>
              )}
              {visibleColumns.has("role") && (
                <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Role
                </TableHead>
              )}
              {visibleColumns.has("status") && (
                <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Status
                </TableHead>
              )}
              {visibleColumns.has("kartu") && (
                <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Kartu
                </TableHead>
              )}
              {visibleColumns.has("terdaftar") && (
                <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Terdaftar
                </TableHead>
              )}
              {visibleColumns.has("aksi") && (
                <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">
                  Aksi
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="hover:bg-muted/40 transition-colors border-b border-border"
              >
                {visibleColumns.has("user") && (
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage
                          src={getUserAvatar(user)}
                          alt={user.name || "User"}
                        />
                        <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                          {getFallbackInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {user.name || "-"}
                          </p>
                          {user.nimNidn && user.nimNidn !== "-" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                              {user.nimNidn}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                          {user.email}
                          {user.phone && (
                            <span className="ml-1.5 text-[11px] text-muted-foreground/80">
                              • {user.phone}
                            </span>
                          )}
                        </p>
                        {user.faculty && user.faculty !== "-" && (
                          <p className="text-[11px] text-muted-foreground/75 mt-0.5 truncate max-w-[220px]">
                            {user.faculty}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.has("role") && (
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${roleBadgeClass(user.role)}`}
                    >
                      {user.role === "super_admin" ? (
                        <ShieldCheck size={12} className="mr-1.5" />
                      ) : null}
                      {roleBadgeLabel(user.role, availableRoles)}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.has("status") && (
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {user.banned ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                        <UserX size={12} className="mr-1.5" /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                        Aktif
                      </span>
                    )}
                  </TableCell>
                )}
                {visibleColumns.has("kartu") && (
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${cardStatusClass(user.cardStatus)}`}
                      >
                        {cardStatusLabel(user.cardStatus)}
                      </span>
                      {user.cardNumber ? (
                        <span className="text-[11px] font-mono font-bold text-muted-foreground">
                          {user.cardNumber}
                        </span>
                      ) : null}
                    </div>
                    {user.cardRejectedReason ? (
                      <p className="max-w-[220px] text-[11px] text-rose-600 truncate mt-1">
                        {user.cardRejectedReason}
                      </p>
                    ) : null}
                  </TableCell>
                )}
                {visibleColumns.has("terdaftar") && (
                  <TableCell className="px-6 py-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </TableCell>
                )}
                {visibleColumns.has("aksi") && (
                  <TableCell className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                      {/* Role Selector with auto-save */}
                      <Select
                        value={user.role}
                        onValueChange={(value) => onRoleChange(user, value)}
                        disabled={
                          user.id === currentUserId ||
                          savingId === user.id ||
                          !canEditUsers
                        }
                      >
                        <SelectTrigger className="w-[115px] h-8 text-xs font-semibold bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                          {savingId === user.id ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Loader2 size={12} className="animate-spin" />
                              <span>Simpan...</span>
                            </span>
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent align="end">
                          {availableRoles.length > 0 ? (
                            availableRoles.map((r) => (
                              <SelectItem
                                key={r.id}
                                value={r.id}
                                className="text-xs cursor-pointer"
                              >
                                {r.name}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="student" className="text-xs cursor-pointer">Mahasiswa</SelectItem>
                              <SelectItem value="lecturer" className="text-xs cursor-pointer">Dosen</SelectItem>
                              <SelectItem value="staff" className="text-xs cursor-pointer">Staff</SelectItem>
                              <SelectItem value="external" className="text-xs cursor-pointer">Anggota Luar</SelectItem>
                              <SelectItem value="super_admin" className="text-xs cursor-pointer">Super Admin</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>

                      {/* Dropdown Menu for Secondary & Administrative Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-8 inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Aksi Lainnya"
                          >
                            <MoreHorizontal size={15} />
                            <span className="sr-only">Menu aksi user</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                            Operasional
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onRecordVisit(user)}
                            disabled={recordSavingId === user.id}
                            className="cursor-pointer text-xs flex items-center gap-2"
                          >
                            <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                            <span>{recordSavingId === user.id ? "Mencatat..." : "Catat Kunjungan"}</span>
                          </DropdownMenuItem>

                          {!user.hasSyncedMember ? (
                            <DropdownMenuItem
                              onClick={() => onSyncMember(user)}
                              disabled={syncSavingId === user.id}
                              className="cursor-pointer text-xs flex items-center gap-2"
                            >
                              <RefreshCw size={14} className={`text-sky-600 dark:text-sky-400 ${syncSavingId === user.id ? "animate-spin" : ""}`} />
                              <span>{syncSavingId === user.id ? "Menyinkronkan..." : "Sinkronisasi Member"}</span>
                            </DropdownMenuItem>
                          ) : user.cardStatus !== "active" ? (
                            <DropdownMenuItem
                              onClick={() => onIssueCard(user)}
                              disabled={issueSavingId === user.id}
                              className="cursor-pointer text-xs flex items-center gap-2"
                            >
                              <CreditCard size={14} className="text-blue-600 dark:text-blue-400" />
                              <span>{issueSavingId === user.id ? "Menerbitkan..." : "Terbitkan Kartu"}</span>
                            </DropdownMenuItem>
                          ) : null}

                          {canEditUsers && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                                Akses & Keamanan
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => onToggleBan(user)}
                                disabled={user.id === currentUserId || banSavingId === user.id}
                                className={`cursor-pointer text-xs flex items-center gap-2 ${
                                  user.banned ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {user.banned ? (
                                  <>
                                    <UserCheck size={14} />
                                    <span>{banSavingId === user.id ? "Memproses..." : "Buka Blokir (Unban)"}</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX size={14} />
                                    <span>{banSavingId === user.id ? "Memproses..." : "Blokir User (Ban)"}</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}

                          {canDeleteUsers && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteUser(user)}
                                disabled={user.id === currentUserId || deletingId === user.id}
                                className="cursor-pointer text-xs flex items-center gap-2 text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50"
                              >
                                <Trash2 size={14} />
                                <span>Hapus Akun</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        label="user"
      />
    </>
  );
}

export default UserTable;
