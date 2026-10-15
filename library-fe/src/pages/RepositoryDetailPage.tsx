import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import SecurePdfViewer from "@/components/SecurePdfViewer";
import { repositoryService, type RepositoryProposal } from "@/services/repositoryService";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";

export default function RepositoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<RepositoryProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const data = await repositoryService.getProposalById(id);
        setProposal(data);
      } catch (err: any) {
        setError(err.message || "Gagal memuat dokumen skripsi.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <Link
          to="/e-resource"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Repositori
        </Link>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-700" />
            <p className="text-sm">Memuat dokumen repositori...</p>
          </div>
        ) : error || !proposal ? (
          <div className="p-12 text-center border border-border rounded-2xl bg-card">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">Dokumen Tidak Ditemukan</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {error || "Dokumen belum disetujui untuk publik atau tautan tidak valid."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Metadata Ringkas */}
            <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                  {proposal.documentCategory}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {proposal.proposalNumber}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                {proposal.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs text-muted-foreground">
                <div>
                  <span className="block font-semibold text-foreground">Penulis:</span>
                  <span>{proposal.authorName} ({proposal.authorNim})</span>
                </div>
                <div>
                  <span className="block font-semibold text-foreground">Dosen Pembimbing:</span>
                  <span>{proposal.advisorName1}</span>
                </div>
                <div>
                  <span className="block font-semibold text-foreground">Total Halaman Dokumen:</span>
                  <span>{proposal.pageCount} Halaman</span>
                </div>
              </div>

              {proposal.abstract && (
                <div className="pt-3 border-t border-border">
                  <h4 className="text-xs font-bold text-foreground mb-1">Abstrak Penelitian:</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {proposal.abstract}
                  </p>
                </div>
              )}
            </div>

            {/* Viewer Aman dengan Page-Level PDF ACL & Blur Card Gate */}
            <div>
              <SecurePdfViewer
                proposalId={proposal.id}
                title={proposal.title}
                authorName={proposal.authorName}
                authorNim={proposal.authorNim}
                totalPhysicalPages={proposal.pageCount}
                allowedPublicPages={
                  proposal.pageRules?.find(
                    (r) => r.roleScope?.toUpperCase() === "PUBLIC" || r.roleScope?.toUpperCase() === "ALL"
                  )?.allowedEndPage || Math.min(10, proposal.pageCount)
                }
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
