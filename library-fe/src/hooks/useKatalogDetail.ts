import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/utils/api-config";
import { cleanIsbn } from "@/utils/format";
import loanService from "@/services/loanService";
import reservationService, {
  type Reservation,
} from "@/services/reservationService";
import type { Bibliography, LibraryUser, LoanRequest } from "@/types";

function mapRawBibliography(item: any): Bibliography {
  return {
    id: String(item.id || ""),
    title: item.title || "Tanpa Judul",
    author: Array.isArray(item.authors)
      ? item.authors.map((a: any) => a?.name || "").filter(Boolean).join(", ")
      : item.author || "",
    publisher: typeof item.publisher === "object"
      ? item.publisher?.name || ""
      : item.publisher || "",
    publicationYear: item.publicationYear
      ? String(item.publicationYear)
      : item.publishYear
      ? String(item.publishYear)
      : "",
    isbn: cleanIsbn(item.isbn || item.isbnIssn || ""),
    issn: item.issn || (item.isbnIssn?.startsWith("ISSN") ? item.isbnIssn.replace(/^ISSN[:\s]*/i, "") : undefined),
    isbnIssn: item.isbnIssn || undefined,
    type: item.type || "physical_book",
    image: item.image || null,
    stock: item.stock ?? item.totalItems ?? 0,
    items: Array.isArray(item.items) ? item.items : [],
    subjects: Array.isArray(item.subjects) ? item.subjects : [],
  };
}

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

  const [similarBooks, setSimilarBooks] = useState<Bibliography[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSimilarBooks([]);
        setSimilarLoading(true);

        const bibResponse = await fetch(
          `${API_BASE_URL}/api/bibliographies/${id}`,
        );
        if (!bibResponse.ok)
          throw new Error(`HTTP error! status: ${bibResponse.status}`);
        const bibJson = await bibResponse.json();

        if (bibJson.success && bibJson.data) {
          const item = bibJson.data;
          const mappedBib = mapRawBibliography(item);
          setBibliography(mappedBib);

          // Ambil buku serupa (similar books)
          fetchSimilarBooks(item, String(id));

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

    const fetchSimilarBooks = async (currentBib: any, currentId: string) => {
      try {
        setSimilarLoading(true);
        const collected: Bibliography[] = [];
        const seenIds = new Set<string>([currentId]);

        const addItems = (items: any[]) => {
          for (const raw of items) {
            const mapped = mapRawBibliography(raw);
            if (mapped.id && !seenIds.has(mapped.id)) {
              seenIds.add(mapped.id);
              collected.push(mapped);
            }
          }
        };

        // 1. Prioritas pertama: cari buku dengan subjek / topik yang sama
        const subjects = Array.isArray(currentBib.subjects) ? currentBib.subjects : [];
        const primarySubject = subjects[0]?.name;
        if (primarySubject) {
          try {
            const res = await fetch(
              `${API_BASE_URL}/api/bibliographies?subject=${encodeURIComponent(primarySubject)}&limit=10`
            );
            if (res.ok) {
              const json = await res.json();
              const items = json.data?.items ?? (Array.isArray(json.data) ? json.data : []);
              addItems(items);
            }
          } catch (err) {
            console.warn("[useKatalogDetail] Gagal mengambil buku berdasarkan subjek:", err);
          }
        }

        // 2. Prioritas kedua: jika masih kurang dari 5 buku, coba cari berdasarkan penulis yang sama
        if (collected.length < 5) {
          const authors = Array.isArray(currentBib.authors) ? currentBib.authors : [];
          const authorName = authors[0]?.name || (typeof currentBib.author === "string" ? currentBib.author : "");
          if (authorName && authorName.trim() && authorName !== "Tanpa Penulis") {
            try {
              const res = await fetch(
                `${API_BASE_URL}/api/bibliographies?author=${encodeURIComponent(authorName.trim())}&limit=10`
              );
              if (res.ok) {
                const json = await res.json();
                const items = json.data?.items ?? (Array.isArray(json.data) ? json.data : []);
                addItems(items);
              }
            } catch (err) {
              console.warn("[useKatalogDetail] Gagal mengambil buku berdasarkan penulis:", err);
            }
          }
        }

        // 3. Fallback: jika masih kurang dari 5 buku, ambil koleksi buku lainnya sebagai rekomendasi
        if (collected.length < 5) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/bibliographies?limit=15`);
            if (res.ok) {
              const json = await res.json();
              const items = json.data?.items ?? (Array.isArray(json.data) ? json.data : []);
              addItems(items);
            }
          } catch (err) {
            console.warn("[useKatalogDetail] Gagal mengambil buku fallback:", err);
          }
        }

        setSimilarBooks(collected.slice(0, 4));
      } catch (err) {
        console.error("[useKatalogDetail] Gagal memuat buku serupa:", err);
        setSimilarBooks([]);
      } finally {
        setSimilarLoading(false);
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
    similarLoading,
    setUserReservation,
    setPendingRequests,
  };
}
