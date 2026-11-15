import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AuditLog } from "@/services/dashboard/auditLogsService";

export default function AuditLogDetail({ log }: { log: AuditLog }) {
  const actor = log.actorSnapshot ?? log.user;
  const changes = Object.entries(log.changes ?? {});
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Lihat detail audit ${log.id}`}>Lihat detail</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85dvh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Detail audit log</DialogTitle>
          <DialogDescription>Identitas, objek, dan perubahan yang tercatat pada aktivitas ini.</DialogDescription>
        </DialogHeader>
        {!log.actorSnapshot && <p className="text-sm text-muted-foreground">Snapshot historis tidak tersedia.</p>}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm [&_dt]:font-semibold [&_dd]:break-words [&_dd]:whitespace-pre-wrap">
          <div><dt>Pelaku</dt><dd>{actor?.name || "Tidak diketahui"}</dd></div>
          <div><dt>{log.actorSnapshot ? "Role saat kejadian" : "Profil saat ini"}</dt><dd>{actor?.role || "-"}</dd></div>
          <div><dt>ID pelaku</dt><dd>{log.actorSnapshot?.id ?? log.userId ?? log.user?.id ?? "-"}</dd></div>
          <div><dt>Waktu</dt><dd>{log.occurredAt ?? log.createdAt ?? "Waktu tidak tersedia"}</dd></div>
          <div><dt>Aktivitas</dt><dd>{log.eventType ?? log.action}</dd></div>
          <div><dt>Hasil</dt><dd>{log.outcome ?? "Tidak tersedia"}</dd></div>
          <div><dt>Objek</dt><dd>{log.targetSnapshot?.label ?? log.entity}</dd></div>
          <div><dt>Tipe objek</dt><dd>{log.targetSnapshot?.type ?? log.entity}</dd></div>
          <div><dt>ID objek</dt><dd>{log.targetSnapshot?.id ?? log.entityId ?? "-"}</dd></div>
          <div><dt>ID audit</dt><dd>{log.id}</dd></div>
          <div><dt>Alamat IP</dt><dd>{log.ipAddress ?? "-"}</dd></div>
          <div><dt>User agent</dt><dd>{log.userAgent ?? "-"}</dd></div>
          <div><dt>Versi skema</dt><dd>{log.metadata?.schemaVersion ?? "Tidak tersedia"}</dd></div>
          <div><dt>Ringkasan</dt><dd>{log.detail ?? "-"}</dd></div>
        </dl>
        <section aria-label="Perubahan" className="space-y-2">
          <h3 className="font-semibold">Perubahan</h3>
          {changes.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr>{["Field", "Sebelum", "Sesudah"].map(label => <th key={label} scope="col" className="p-2 border-b border-border">{label}</th>)}</tr></thead>
                <tbody>{changes.map(([field, change]) => (
                  <tr key={field} className="border-b border-border align-top">
                    <th scope="row" className="p-2 font-medium break-words">{field}</th>
                    <td className="p-2 break-words whitespace-pre-wrap">{String(change.before)}</td>
                    <td className="p-2 break-words whitespace-pre-wrap">{String(change.after)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">Data perubahan tidak tersedia.</p>}
        </section>
        <DialogClose asChild><Button variant="outline" className="justify-self-end">Tutup</Button></DialogClose>
      </DialogContent>
    </Dialog>
  );
}
