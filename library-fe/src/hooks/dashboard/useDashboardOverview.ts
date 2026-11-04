import { useEffect, useMemo, useState } from "react";
import loanService, { type Loan } from "@/services/loanService";
import type { DashboardStats } from "@/services/dashboard/dashboardDataService";
import type { ReportImportSummary } from "@/utils/dashboardReportImport";

export function useDashboardOverview(stats: DashboardStats) {
  const [displayStats, setDisplayStats] = useState<DashboardStats>(stats);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [loanLoading, setLoanLoading] = useState(true);

  useEffect(() => {
    setDisplayStats(stats);
  }, [stats]);

  useEffect(() => {
    let isMounted = true;

    const loadRecentLoans = async () => {
      setLoanLoading(true);
      try {
        const loans = await loanService.getAllLoans();
        if (!isMounted) return;

        const sorted = [...loans].sort((a, b) => {
          const da = new Date(a.createdAt || a.loanDate || 0).getTime();
          const db = new Date(b.createdAt || b.loanDate || 0).getTime();
          return db - da;
        });

        setRecentLoans(sorted.slice(0, 5));
      } catch {
        if (isMounted) {
          setRecentLoans([]);
        }
      } finally {
        if (isMounted) {
          setLoanLoading(false);
        }
      }
    };

    void loadRecentLoans();

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedRecentLoans = useMemo(
    () =>
      recentLoans.map((loan) => {
        const memberName =
          loan.memberName ||
          (loan.member?.user as { name?: string } | undefined)?.name ||
          "Member";
        const bookTitle =
          loan.bibliographyTitle || loan.item?.bibliography?.title || "Buku";
        const createdAt = loan.createdAt || loan.loanDate;
        const user = loan.member?.user || {
          name: memberName,
          email: (loan.member as any)?.nimNidn ? `${(loan.member as any).nimNidn}@student.umc.ac.id` : undefined,
        };

        return {
          id: loan.id,
          memberName,
          bookTitle,
          status: loan.status,
          user,
          timeText: createdAt
            ? new Date(createdAt).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "-"
        };
      }),
    [recentLoans]
  );

  const applyImportedSummary = (summary: ReportImportSummary) => {
    setDisplayStats((previous) => ({
      ...previous,
      activeBorrowings:
        summary.activeBorrowings > 0
          ? summary.activeBorrowings
          : previous.activeBorrowings,
      totalFineRevenue:
        summary.totalPaidFines > 0
          ? summary.totalPaidFines
          : previous.totalFineRevenue,
      outstandingFines:
        summary.outstandingFines > 0
          ? summary.outstandingFines
          : previous.outstandingFines
    }));
  };

  return {
    displayStats,
    loanLoading,
    formattedRecentLoans,
    applyImportedSummary
  };
}
