import { useMemo, useState } from "react";
import { TablePagination } from "@/components/common/TablePagination";
import { RefreshCw, ShieldCheck, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLogs } from "@/hooks/dashboard/useAuditLogs";
import AuditLogDetail from "./AuditLogDetail";

const ACTION_OPTIONS = [
  "all",
  "create",
  "update",
  "delete",
  "approve",
  "blacklist",
  "failed_login",
  "rate_limited",
];
const ENTITY_OPTIONS = [
  "all",
  "loan",
  "item",
  "fine",
  "Users",
  "category",
  "bibliography",
  "reservation",
  "auth",
  "role",
];

export default function AuditLogsSection() {
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { logs, loading, error, updateParams, refetch } = useAuditLogs(true, {
    limit: 100,
    offset: 0,
  });

  const applyFilter = async () => {
    setCurrentPage(1);
    await updateParams({
      action: action === "all" ? undefined : action,
      entity: entity === "all" ? undefined : entity,
      limit: 100,
      offset: 0,
    });
  };

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return logs;

    return logs.filter((log) => {
      const userId = (log.userId || "").toLowerCase();
      const userName = (log.actorSnapshot?.name ?? log.user?.name ?? "").toLowerCase();
      const userEmail = (log.user?.email || "").toLowerCase();
      const entityId = (log.entityId || "").toLowerCase();
      const ipAddress = (log.ipAddress || "").toLowerCase();
      const detail = (log.detail || "").toLowerCase();
      return (
        userId.includes(keyword) ||
        userName.includes(keyword) ||
        userEmail.includes(keyword) ||
        entityId.includes(keyword) ||
        ipAddress.includes(keyword) ||
        detail.includes(keyword) ||
        (log.targetSnapshot?.label ?? "").toLowerCase().includes(keyword) ||
        (log.eventType ?? "").toLowerCase().includes(keyword) ||
        log.action.toLowerCase().includes(keyword) ||
        log.entity.toLowerCase().includes(keyword)
      );
    });
  }, [logs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[28px] font-extrabold text-foreground tracking-tight">
          Audit Log Sistem
        </h2>
        <p className="text-muted-foreground font-medium text-[15px] mt-1">
          Riwayat aktivitas sensitif super admin dan staff pada sistem.
        </p>
      </div>

      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          <div className="relative w-full xl:max-w-[340px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              aria-label="Cari audit log"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama, email, userId, IP, detail..."
              className="w-full pl-11 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/10 focus:border-primary/40 outline-none"
            />
          </div>

          <Select value={action} onValueChange={(val) => setAction(val)}>
            <SelectTrigger aria-label="Filter aktivitas" className="w-full xl:w-[180px] rounded-xl text-sm font-semibold">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  Action: {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entity} onValueChange={(val) => setEntity(val)}>
            <SelectTrigger aria-label="Filter objek" className="w-full xl:w-[180px] rounded-xl text-sm font-semibold">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  Entity: {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => void applyFilter()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90"
          >
            <ShieldCheck size={14} /> Terapkan
          </button>

          <button
            onClick={() => void refetch()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-warning-bg border border-border"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-destructive">{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm font-semibold">
            Tidak ada audit log yang cocok dengan filter.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Waktu", "Pelaku", "Aktivitas", "Objek", "Ringkasan", "Detail"].map(label => (
                      <th key={label} scope="col" className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-hover/40 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {log.occurredAt
                          ? new Date(log.occurredAt).toLocaleString("id-ID", { timeZoneName: "short" })
                          : log.createdAt || "Waktu tidak tersedia"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden="true" className="size-8 rounded-full bg-muted text-muted-foreground shrink-0 flex items-center justify-center text-xs font-semibold">
                            {(log.actorSnapshot?.name ?? log.user?.name ?? "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{log.actorSnapshot?.name ?? log.user?.name ?? "Tidak diketahui"}</p>
                            <p className="text-xs text-muted-foreground">{log.actorSnapshot ? log.actorSnapshot.role : "Profil saat ini"}</p>
                            {!log.actorSnapshot && <p className="text-xs text-muted-foreground">Snapshot historis tidak tersedia.</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{log.eventType ?? log.action}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground break-words">{log.targetSnapshot?.label ?? log.entity}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-sm break-words">{log.detail || "-"}</td>
                      <td className="px-6 py-4"><AuditLogDetail log={log} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              label="log aktivitas"
            />
          </>
        )}
      </div>
    </div>
  );
}
