import { useEffect, useState } from "react";
import { TablePagination } from "@/components/common/TablePagination";
import {
  BadgeCheck,
  RefreshCw,
  UserCheck,
  UserX,
  IdCard,
  Clock,
  Sparkles,
  Calendar,
  Loader2,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserAvatar } from "@/lib/avatar";
import { useToast } from "@/hooks/useToast";
import {
  usersManagementService,
  type PendingMemberCardRequest,
} from "@/services/dashboard/usersManagementService";
import { triggerBadgeRefresh } from "@/hooks/dashboard/useDashboardBadges";
import { useRolePermissions } from "@/hooks/useRolePermissions";

export default function CardApprovalsSection() {
  const { success, error, warning } = useToast();
  const { canEdit } = useRolePermissions();

  const [activeTab, setActiveTab] = useState<"new" | "renewals">("new");
  const [newRequests, setNewRequests] = useState<PendingMemberCardRequest[]>([]);
  const [renewalRequests, setRenewalRequests] = useState<PendingMemberCardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [approvalModalItem, setApprovalModalItem] = useState<{
    item: PendingMemberCardRequest;
    type: "new" | "renewal";
  } | null>(null);
  const [approvalDuration, setApprovalDuration] = useState<number>(365);
  const [customApprovalDate, setCustomApprovalDate] = useState<string>("");
  const [isCustomApprovalDate, setIsCustomApprovalDate] = useState(false);
  const [approvingLoading, setApprovingLoading] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [newData, renewalData] = await Promise.all([
        usersManagementService.getPendingCardRequests(),
        usersManagementService.getPendingCardRenewals(),
      ]);
      setNewRequests(newData || []);
      setRenewalRequests(renewalData || []);
    } catch (err) {
      console.error(err);
      error("Gagal", "Gagal memuat daftar pengajuan kartu", 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const currentList = activeTab === "new" ? newRequests : renewalRequests;

  const filtered = currentList.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.user?.name || "").toLowerCase().includes(q) ||
      (item.user?.email || "").toLowerCase().includes(q) ||
      (item.nimNidn || "").toLowerCase().includes(q) ||
      (item.cardNumber || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTabChange = (tab: "new" | "renewals") => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearch("");
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const openApprovalModal = (item: PendingMemberCardRequest, type: "new" | "renewal") => {
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() + 1);
    setCustomApprovalDate(defaultDate.toISOString().split("T")[0]);
    setApprovalDuration(365);
    setIsCustomApprovalDate(false);
    setApprovalModalItem({ item, type });
  };

  const handleExecuteApproval = async () => {
    if (!approvalModalItem) return;
    const { item, type } = approvalModalItem;
    setApprovingLoading(true);
    setActionId(item.id);
    try {
      const payloadDate = customApprovalDate || undefined;
      const durationDays = approvalDuration;

      if (type === "new") {
        await usersManagementService.approveMemberCard(item.id, undefined, {
          cardExpiresAt: payloadDate,
          durationDays,
        });
        success("Berhasil", `Kartu member ${item.user.name} berhasil disetujui`);
      } else {
        await usersManagementService.approveCardRenewal(item.id, durationDays || 365);
        if (payloadDate) {
          await usersManagementService.updateCardExpiry(item.id, {
            cardExpiresAt: payloadDate,
            durationDays,
          });
        }
        success("Berhasil", `Perpanjangan kartu member ${item.user.name} berhasil disetujui`);
      }
      setApprovalModalItem(null);
      await loadAll();
      triggerBadgeRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyetujui kartu";
      error("Gagal", message, 4000);
    } finally {
      setApprovingLoading(false);
      setActionId(null);
    }
  };

  // Actions for New Card Requests
  const handleApprove = (item: PendingMemberCardRequest) => {
    openApprovalModal(item, "new");
  };

  const handleReject = async (item: PendingMemberCardRequest) => {
    const reason = window.prompt(`Alasan penolakan untuk ${item.user.name}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      warning("Perhatian", "Alasan penolakan wajib diisi", 3000);
      return;
    }

    setActionId(item.id);
    try {
      await usersManagementService.rejectMemberCard(item.id, reason.trim());
      success("Berhasil", `Pengajuan kartu member ${item.user.name} ditolak`, 3000);
      await loadAll();
      triggerBadgeRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menolak kartu";
      error("Gagal", message, 4000);
    } finally {
      setActionId(null);
    }
  };

  const handleIssueDirect = async (item: PendingMemberCardRequest) => {
    setActionId(item.id);
    try {
      await usersManagementService.issueMemberCard(item.userId);
      success("Berhasil", `Kartu member ${item.user.name} diterbitkan`, 3000);
      await loadAll();
      triggerBadgeRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menerbitkan kartu";
      error("Gagal", message, 4000);
    } finally {
      setActionId(null);
    }
  };

  // Actions for Renewal Requests
  const handleApproveRenewal = (item: PendingMemberCardRequest) => {
    openApprovalModal(item, "renewal");
  };

  const handleRejectRenewal = async (item: PendingMemberCardRequest) => {
    const reason = window.prompt(`Alasan penolakan perpanjangan untuk ${item.user.name}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      warning("Perhatian", "Alasan penolakan wajib diisi", 3000);
      return;
    }

    setActionId(item.id);
    try {
      await usersManagementService.rejectCardRenewal(item.id, reason.trim());
      success("Berhasil", `Perpanjangan kartu member ${item.user.name} ditolak`, 3000);
      await loadAll();
      triggerBadgeRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menolak perpanjangan kartu";
      error("Gagal", message, 4000);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[28px] font-extrabold text-foreground tracking-tight">
          Persetujuan Kartu Member
        </h2>
        <p className="text-muted-foreground font-medium text-[15px] mt-1">
          Kelola pengajuan kartu member baru dan perpanjangan masa berlaku kartu.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => handleTabChange("new")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "new"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <IdCard size={16} />
          Pengajuan Kartu Baru
          {newRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary font-bold">
              {newRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("renewals")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "renewals"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles size={16} />
          Pengajuan Perpanjangan
          {renewalRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
              {renewalRequests.length}
            </span>
          )}
        </button>
      </div>

      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-[360px]">
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama, email, nomor kartu..."
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none"
            />
          </div>

          <button
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-warning-bg border border-border transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, idx) => (
              <Skeleton key={idx} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <IdCard size={42} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold">
              Tidak ada {activeTab === "new" ? "pengajuan kartu baru" : "pengajuan perpanjangan"} yang pending
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/60">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted border border-border shrink-0">
                      <img
                        src={getUserAvatar(item.user)}
                        alt={item.user?.name || "User Avatar"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground">
                          {item.user?.name || "Nama Pengguna"}
                        </h3>
                        {activeTab === "new" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <BadgeCheck size={12} /> Kartu Baru
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            <Clock size={12} /> Perpanjangan
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.cardNumber && (
                          <span className="font-mono font-semibold text-foreground mr-2">
                            No. Kartu: {item.cardNumber} ·
                          </span>
                        )}
                        NIM/NIDN: {item.nimNidn || "-"} · Fakultas: {item.faculty || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {canEdit("cardApprovals") ? (
                      activeTab === "new" ? (
                        <>
                          <button
                            onClick={() => void handleApprove(item)}
                            disabled={actionId === item.id}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                          >
                            <UserCheck size={14} />
                            Setujui
                          </button>
                          <button
                            onClick={() => void handleReject(item)}
                            disabled={actionId === item.id}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                          >
                            <UserX size={14} />
                            Tolak
                          </button>
                          <button
                            onClick={() => void handleIssueDirect(item)}
                            disabled={actionId === item.id}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
                          >
                            <IdCard size={14} />
                            Terbitkan Langsung
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => void handleApproveRenewal(item)}
                            disabled={actionId === item.id}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <UserCheck size={14} />
                            Setujui Perpanjangan (+1 Thn)
                          </button>
                          <button
                            onClick={() => void handleRejectRenewal(item)}
                            disabled={actionId === item.id}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                          >
                            <UserX size={14} />
                            Tolak
                          </button>
                        </>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Hanya Lihat
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              label="data pengajuan"
            />
          </>
        )}
      </div>

      {/* ── Modal: Setujui & Atur Masa Berlaku Kartu ── */}
      <Modal
        isOpen={Boolean(approvalModalItem)}
        onClose={() => setApprovalModalItem(null)}
        title={
          approvalModalItem?.type === "renewal"
            ? "Persetujuan Perpanjangan Kartu"
            : "Persetujuan Penerbitan Kartu Member"
        }
        size="md"
      >
        {approvalModalItem && (
          <div className="space-y-4 p-1">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-2">
                  <IdCard className="size-4 text-primary" />
                  {approvalModalItem.item.user.name}
                </span>
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-mono">
                  {approvalModalItem.item.cardNumber || "Kartu Baru"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                NIM/NIDN: {approvalModalItem.item.nimNidn || "-"} · Fakultas: {approvalModalItem.item.faculty || "-"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-2">
                Pilih Masa Berlaku Kartu
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { days: 180, label: "6 Bulan" },
                  { days: 365, label: "1 Tahun" },
                  { days: 730, label: "2 Tahun" },
                  { days: 1460, label: "4 Tahun" },
                ].map((preset) => {
                  const isSelected = !isCustomApprovalDate && approvalDuration === preset.days;
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        setIsCustomApprovalDate(false);
                        setApprovalDuration(preset.days);
                        const d = new Date();
                        d.setDate(d.getDate() + preset.days);
                        setCustomApprovalDate(d.toISOString().split("T")[0]);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-foreground">
                  Tanggal Berakhir Masa Aktif
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomApprovalDate(true)}
                  className={`text-[11px] font-medium transition-colors cursor-pointer ${
                    isCustomApprovalDate
                      ? "text-primary font-bold underline"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pilih Tanggal Kustom
                </button>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  required
                  value={customApprovalDate}
                  onChange={(e) => {
                    setIsCustomApprovalDate(true);
                    setCustomApprovalDate(e.target.value);
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={approvingLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-3">
              <button
                type="button"
                onClick={() => setApprovalModalItem(null)}
                disabled={approvingLoading}
                className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteApproval}
                disabled={approvingLoading}
                className="h-10 px-5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {approvingLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    <span>Konfirmasi & Setujui</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
