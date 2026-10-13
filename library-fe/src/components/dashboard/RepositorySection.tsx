import { useState, useEffect } from "react";
import {
  GraduationCap,
  Search,
  CheckCircle,
  Clock,
  Eye,
  Sliders,
  AlertCircle,
  FileText,
  User,
  Loader2
} from "lucide-react";
import { repositoryService, type RepositoryProposal } from "@/services/repositoryService";
import { API_BASE_URL } from "@/utils/api-config";
import { useToast } from "@/hooks/useToast";
import Modal from "@/components/ui/modal";

export default function RepositorySection() {
  const { success, error } = useToast();
  const [proposals, setProposals] = useState<RepositoryProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Review modal state
  const [reviewModalItem, setReviewModalItem] = useState<RepositoryProposal | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REVISION_REQUIRED">("APPROVE");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // ACL modal state
  const [aclModalItem, setAclModalItem] = useState<RepositoryProposal | null>(null);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(10);
  const [savingAcl, setSavingAcl] = useState(false);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const data = await repositoryService.getAllProposals(
        filterStatus === "all" ? undefined : filterStatus
      );
      setProposals(data);
    } catch (err: any) {
      error("Gagal Memuat", err.message || "Gagal memuat repositori karya ilmiah");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [filterStatus]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem) return;

    if (reviewAction === "REVISION_REQUIRED" && !reviewNotes.trim()) {
      error("Catatan Wajib", "Berikan catatan revisi yang jelas untuk mahasiswa");
      return;
    }

    try {
      setSubmittingReview(true);
      await repositoryService.reviewProposal(reviewModalItem.id, reviewAction, reviewNotes);
      success(
        "Status Diperbarui",
        reviewAction === "APPROVE"
          ? "Proposal berhasil disetujui untuk repositori publik."
          : "Proposal dikembalikan ke mahasiswa untuk revisi berkas."
      );
      setReviewModalItem(null);
      setReviewNotes("");
      fetchProposals();
    } catch (err: any) {
      error("Gagal Memproses Review", err.message || "Terjadi kesalahan");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveAcl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aclModalItem) return;

    if (startPage < 1 || endPage < startPage || endPage > aclModalItem.pageCount) {
      error(
        "Rentang Halaman Tidak Valid",
        `Rentang halaman harus antara 1 sampai ${aclModalItem.pageCount}`
      );
      return;
    }

    try {
      setSavingAcl(true);
      await repositoryService.configurePageRule(aclModalItem.id, {
        roleScope: "PUBLIC",
        allowedStartPage: Number(startPage),
        allowedEndPage: Number(endPage),
        allowDownloadFull: false
      });
      success("Berhasil Disimpan", `Akses publik dibatasi ke halaman ${startPage} - ${endPage}`);
      setAclModalItem(null);
      fetchProposals();
    } catch (err: any) {
      error("Gagal Menyimpan Aturan", err.message || "Terjadi kesalahan");
    } finally {
      setSavingAcl(false);
    }
  };

  const filteredProposals = proposals.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.authorName.toLowerCase().includes(term) ||
      p.authorNim.toLowerCase().includes(term) ||
      p.proposalNumber.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3" /> Disetujui
          </span>
        );
      case "REVISION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertCircle className="w-3 h-3" /> Perlu Revisi
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="w-3 h-3" /> Sedang Ditinjau
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="w-3 h-3" /> Pengajuan Baru
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-card border border-border">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-red-700 dark:text-red-500" />
            <h1 className="text-xl font-bold text-foreground">
              Repositori Skripsi & Karya Ilmiah Mahasiswa
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Verifikasi kelayakan berkas skripsi civitas akademika dan kelola aturan akses halaman (Page-Level ACL) untuk publik.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari judul, NIM, atau nama mahasiswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="all">Semua Status</option>
            <option value="SUBMITTED">Pengajuan Baru</option>
            <option value="UNDER_REVIEW">Sedang Ditinjau</option>
            <option value="REVISION_REQUIRED">Perlu Revisi</option>
            <option value="APPROVED">Disetujui</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-700" />
            <p className="text-sm">Memuat repositori skripsi...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground">Tidak ada dokumen ditemukan</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Belum ada karya ilmiah yang cocok dengan filter pencarian ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="p-4">Nomor & Kategori</th>
                  <th className="p-4">Karya Ilmiah & Penulis</th>
                  <th className="p-4">Halaman & Batas Akses</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProposals.map((item) => {
                  const rule = item.pageRules?.[0];
                  const publicRange = rule
                    ? `${rule.allowedStartPage} - ${rule.allowedEndPage}`
                    : "1 - 10 (Default)";

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-mono text-xs font-bold text-foreground">
                          {item.proposalNumber}
                        </div>
                        <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {item.documentCategory}
                        </span>
                      </td>

                      <td className="p-4 align-top max-w-md">
                        <div className="font-bold text-foreground leading-snug">{item.title}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>
                            {item.authorName} ({item.authorNim})
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Dosen Pembimbing: {item.advisorName1}
                        </div>
                      </td>

                      <td className="p-4 align-top text-xs">
                        <div className="font-medium text-foreground">
                          Total: <strong className="font-bold">{item.pageCount} Hal</strong>
                        </div>
                        <div className="text-muted-foreground mt-1 flex items-center gap-1">
                          <span>Akses Publik:</span>
                          <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                            {publicRange}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 align-top">{getStatusBadge(item.status)}</td>

                      <td className="p-4 align-top text-right space-y-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`${API_BASE_URL}/api/repository/proposals/${item.id}/view-pdf`}
                            target="_blank"
                            rel="noreferrer"
                            title="Pratinjau PDF Publik"
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors inline-flex items-center"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </a>

                          <button
                            onClick={() => {
                              setAclModalItem(item);
                              setStartPage(rule?.allowedStartPage || 1);
                              setEndPage(rule?.allowedEndPage || Math.min(10, item.pageCount));
                            }}
                            title="Konfigurasi Batas Halaman Publik"
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors inline-flex items-center"
                          >
                            <Sliders className="w-4 h-4 text-muted-foreground" />
                          </button>

                          <button
                            onClick={() => {
                              setReviewModalItem(item);
                              setReviewAction(
                                item.status === "APPROVED" ? "REVISION_REQUIRED" : "APPROVE"
                              );
                              setReviewNotes(item.reviewNotes || "");
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-700 hover:bg-red-800 text-white transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Review */}
      <Modal
        isOpen={!!reviewModalItem}
        onClose={() => setReviewModalItem(null)}
        title={reviewModalItem ? `Tinjau Berkas: ${reviewModalItem.proposalNumber}` : "Tinjau Berkas"}
        size="md"
      >
        {reviewModalItem && (
          <form onSubmit={handleReviewSubmit} className="space-y-4 p-2">
            <div>
              <p className="text-xs text-muted-foreground">Judul Karya Ilmiah:</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{reviewModalItem.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Penulis: {reviewModalItem.authorName} ({reviewModalItem.authorNim})
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Keputusan Verifikasi *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction("APPROVE")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    reviewAction === "APPROVE"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Setujui (Publish)
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction("REVISION_REQUIRED")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    reviewAction === "REVISION_REQUIRED"
                      ? "border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-2 ring-amber-500/20"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Minta Revisi
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Catatan Review / Instruksi Revisi
              </label>
              <textarea
                rows={4}
                placeholder={
                  reviewAction === "REVISION_REQUIRED"
                    ? "Jelaskan bab atau lembar pengesahan apa yang perlu diperbaiki..."
                    : "Catatan opsional apresiasi kelayakan berkas..."
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {submittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Keputusan
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Page ACL Configurator */}
      <Modal
        isOpen={!!aclModalItem}
        onClose={() => setAclModalItem(null)}
        title="Atur Batas Halaman PDF (ACL Publik)"
        size="md"
      >
        {aclModalItem && (
          <form onSubmit={handleSaveAcl} className="space-y-4 p-2">
            <div>
              <p className="text-xs text-muted-foreground">Karya Ilmiah:</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{aclModalItem.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total Dokumen Fisik: <strong>{aclModalItem.pageCount} Halaman</strong>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Aturan Keamanan Slicing:</p>
              <p>
                Pengunjung publik hanya akan menerima potongan halaman ini dari server secara dinamis. Halaman selebihnya tidak dikirimkan dan digantikan oleh Card Pembatas Akses Civitas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Mulai Halaman
                </label>
                <input
                  type="number"
                  min={1}
                  max={aclModalItem.pageCount}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Sampai Halaman
                </label>
                <input
                  type="number"
                  min={startPage}
                  max={aclModalItem.pageCount}
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAclModalItem(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingAcl}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {savingAcl && <Loader2 className="w-4 h-4 animate-spin" />}
                Terapkan Batasan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
