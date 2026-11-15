import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatar } from "@/lib/avatar";
import type { AuditLog } from "@/services/dashboard/auditLogsService";
import AuditLogDetail from "./AuditLogDetail";

export const ACTION_LABELS: Record<string, string> = {
  create: "Membuat data", update: "Memperbarui data", delete: "Menghapus data",
  approve: "Menyetujui", blacklist: "Memblokir pengguna", failed_login: "Login gagal",
  rate_limited: "Batas permintaan tercapai",
  "role.created": "Membuat role", "role.updated": "Memperbarui role",
  "role.deleted": "Menghapus role", "role.permissions_updated": "Mengubah izin role",
};
export const ENTITY_LABELS: Record<string, string> = {
  loan: "Peminjaman", item: "Eksemplar", fine: "Denda", Users: "Pengguna",
  category: "Kategori", bibliography: "Bibliografi", reservation: "Reservasi",
  auth: "Autentikasi", role: "Role", faculty: "Fakultas", study_program: "Program studi",
};
export function activityLabel(log: AuditLog) {
  return ACTION_LABELS[log.eventType ?? log.action] ?? log.eventType ?? log.action;
}

export default function AuditLogRow({ log }: { log: AuditLog }) {
  const actor = log.actorSnapshot ?? log.user;
  const name = actor?.name || "Tidak diketahui";
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const timestamp = log.occurredAt ?? log.createdAt;
  const date = timestamp ? new Date(timestamp) : null;
  const validDate = date && !Number.isNaN(date.getTime());
  const cell = "min-w-0 px-4 py-3 text-sm break-words [overflow-wrap:anywhere] lg:px-5 lg:py-4";
  const mobileLabel = "mb-1 block text-xs font-semibold text-muted-foreground lg:hidden";

  return (
    <tr className="grid grid-cols-2 border-b border-border hover:bg-surface-hover/40 lg:table-row">
      <td className={cell}>
        <span className={mobileLabel}>Waktu</span>
        {validDate ? <time dateTime={date.toISOString()} className="text-muted-foreground">
          <span className="block whitespace-nowrap">{date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
          <span className="block text-xs whitespace-nowrap">{date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" })}</span>
        </time> : <span className="text-muted-foreground">Waktu tidak tersedia</span>}
      </td>
      <td className={`${cell} col-span-2 row-start-1`}>
        <span className={mobileLabel}>Pelaku</span>
        <div className="flex items-center gap-3">
          <Avatar className="size-10" title="Foto profil saat ini, bukan foto historis">
            <AvatarImage src={log.user?.image?.trim() ? getUserAvatar(log.user) : undefined}
              alt="Foto profil pelaku saat ini, bukan foto historis" width={40} height={40} className="object-cover" />
            <AvatarFallback className="text-xs font-semibold text-muted-foreground" aria-label={`Inisial ${name}`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{actor?.role || "Role tidak tersedia"} · {log.actorSnapshot ? "Saat kejadian" : "Profil saat ini"}</p>
            {!log.actorSnapshot && <p className="text-xs text-muted-foreground">Snapshot historis tidak tersedia.</p>}
          </div>
        </div>
      </td>
      <td className={cell}>
        <span className={mobileLabel}>Aktivitas</span>
        <p className="font-semibold text-foreground">{activityLabel(log)}</p>
      </td>
      <td className={cell}>
        <span className={mobileLabel}>Objek</span>
        <p className="text-xs text-muted-foreground">{ENTITY_LABELS[log.entity] ?? log.entity}</p>
        <p className="font-medium text-foreground">{log.targetSnapshot?.label ?? log.entityId ?? "ID tidak tersedia"}</p>
      </td>
      <td className={`${cell} col-span-2 lg:max-w-xs`}>
        <span className={mobileLabel}>Ringkasan</span>
        <p className="line-clamp-2 text-muted-foreground" title={log.detail ?? undefined}>{log.detail || "Ringkasan tidak tersedia"}</p>
      </td>
      <td className={`${cell} col-span-2 [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:active:translate-y-px`}><AuditLogDetail log={log} /></td>
    </tr>
  );
}
