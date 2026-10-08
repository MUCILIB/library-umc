import { useMemo, useState, Fragment } from "react";
import { RefreshCw, ShieldCheck, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLogs } from "@/hooks/dashboard/useAuditLogs";

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
      const userName = (log.user?.name || "").toLowerCase();
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
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama, email, userId, IP, detail..."
              className="w-full pl-11 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/10 focus:border-primary/40 outline-none"
            />
          </div>

          <Select value={action} onValueChange={(val) => setAction(val)}>
            <SelectTrigger className="w-full xl:w-[180px] rounded-xl text-sm font-semibold">
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
            <SelectTrigger className="w-full xl:w-[180px] rounded-xl text-sm font-semibold">
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
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Waktu
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Actor
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Action
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Entity
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Entity ID
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      IP Address
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-hover/40 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleString("id-ID")
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">
                            {log.user?.name || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.user?.email || log.userId || "-"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-muted-foreground uppercase">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-muted-foreground">
                        {log.entity}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {log.entityId || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                        {log.ipAddress || "-"}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-muted-foreground max-w-[360px] break-all">
                        {log.detail || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground font-medium">
                  Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLogs.length)}–
                  {Math.min(currentPage * itemsPerPage, filteredLogs.length)} dari {filteredLogs.length} data
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                    )
                    .map((p, idx, arr) => {
                      const showDot = idx > 0 && arr[idx - 1] !== p - 1;
                      return (
                        <Fragment key={p}>
                          {showDot && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                              currentPage === p
                                ? "bg-primary text-white shadow-md shadow-red-500/20"
                                : "text-muted-foreground hover:bg-surface-hover hover:text-muted-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        </Fragment>
                      );
                    })}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
