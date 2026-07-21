import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/utils/api-config";
import loanService from "@/services/loanService";
import reservationService, {
  type Reservation,
} from "@/services/reservationService";
import type { Bibliography, LibraryUser, LoanRequest } from "@/types";

export function useKatalogDetail(
  id: string | undefined,
  currentUser: LibraryUser | null,
  sessionLoading: boolean,
) {
  const [bibliography, setBibliography] = useState<Bibliography | null>(null);
  const [userLoans, setUserLoans] = useState<LoanRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LoanRequest[]>([]);
  const [userReservation, setUserReservation] = useState<Reservation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [similarBooks] = useState<Bibliography[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const bibResponse = await fetch(
          `${API_BASE_URL}/api/bibliographies/${id}`,
        );
        if (!bibResponse.ok)
          throw new Error(`HTTP error! status: ${bibResponse.status}`);
        const bibJson = await bibResponse.json();

        if (bibJson.success && bibJson.data) {
          const item = bibJson.data;
          const mappedBib: Bibliography = {
            id: item.id,
            title: item.title,
            author: Array.isArray(item.authors)
              ? item.authors.map((a: any) => a.name).join(", ")
              : item.author || "",
            publisher: typeof item.publisher === "object"
              ? item.publisher?.name || ""
              : item.publisher || "",
            publicationYear: String(item.publishYear ?? ""),
            isbn: item.isbnIssn || item.isbn || "",
            type: item.type || "physical_book",
            image: item.image || null,
            stock: item.stock ?? item.totalItems ?? 0,
            items: item.items || [],
            subjects: item.subjects || [],
          };
          setBibliography(mappedBib);

          const memberId = currentUser?.memberId;
          if (memberId) {
            try {
              const myLoans = await loanService.getMyLoanHistory();
              const loansForBib = myLoans.filter(
                (loan: unknown) => {
                  const l = loan as { item?: { bibliography?: { id?: string } } };
                  return l?.item?.bibliography?.id === id;
                },
              ) as LoanRequest[];

              setPendingRequests(
                loansForBib.filter((loan) => loan.status === "pending"),
              );

              setUserLoans(
                loansForBib.filter(
                  (loan) =>
                    loan.status === "approved" || loan.status === "extended",
                ),
              );
            } catch (err) {
              console.error("Error fetching member loans:", err);
              setPendingRequests([]);
              setUserLoans([]);
            }

            try {
              const reservations = await reservationService.getMyReservations();
              const activeRes = reservations.find(
                (r) => r.bibliographyId === id && r.status === "waiting",
              );
              setUserReservation(activeRes || null);
            } catch (err) {
              console.error("Error fetching reservation:", err);
            }
          }

        } else {
          throw new Error(bibJson.message || "Data tidak ditemukan");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat detail buku",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id && !sessionLoading) fetchData();
    window.scrollTo(0, 0);
  }, [id, sessionLoading, currentUser?.memberId]);

  return {
    bibliography,
    userLoans,
    pendingRequests,
    userReservation,
    loading,
    error,
    similarBooks,
    setUserReservation,
    setPendingRequests,
  };
}
