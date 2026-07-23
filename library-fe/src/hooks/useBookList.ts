import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../utils/api-config";
import { cleanIsbn } from "../utils/format";
import type { Bibliography, Reservation } from "../types";
// ponytail: only 2 lines changed, global var replaced raw env var

export type { Bibliography, Reservation } from "../types";

// ==========================================
// INTERNAL TYPES (milik hook ini saja)
// ==========================================

interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

interface UseBookListReturn {
  bibliographies: Bibliography[];
  userReservations: Reservation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ==========================================
// HOOK
// ==========================================

export function useBookList(
  currentUser?: CurrentUser | null
): UseBookListReturn {
  const [bibliographies, setBibliographies] = useState<Bibliography[]>([]);
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBibliographies = async () => {
    const response = await fetch(`${API_BASE_URL}/api/bibliographies?limit=100`);

    if (!response.ok) {
      let apiMessage = "";
      try {
        const errJson = await response.json();
        apiMessage =
          typeof errJson?.message === "string" ? errJson.message : "";
      } catch {
        apiMessage = "";
      }

      throw new Error(
        apiMessage
          ? `Gagal mengambil koleksi: ${apiMessage} (HTTP ${response.status})`
          : `Gagal mengambil koleksi (HTTP ${response.status})`
      );
    }

    const json = await response.json();

    if (!json.success) {
      throw new Error("Respons API tidak valid");
    }

    // Handle paginated response: { items: [...], total, page, ... }
    const rawItems = json.data?.items ?? (Array.isArray(json.data) ? json.data : []);

    // Map Bibliography API shape → Bibliography shape expected by BookList
    const mapped: Bibliography[] = rawItems.map((item: any) => ({
      id: item.id,
      title: item.title,
      author: Array.isArray(item.authors)
        ? item.authors.map((a: any) => a.name).join(", ")
        : item.author || "",
      publisher: typeof item.publisher === "object"
        ? item.publisher?.name || ""
        : item.publisher || "",
      publicationYear: String(item.publishYear ?? ""),
      isbn: cleanIsbn(item.isbnIssn || item.isbn || ""),
      type: item.type || "physical_book",
      image: item.image || null,
      stock: item.stock ?? item.totalItems ?? 0,
      items: item.items || [],
      subjects: item.subjects || [],
      faculties: item.faculties || [],
    }));

    setBibliographies(mapped);
  };

  const fetchMyReservations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reservations/my`, {
        credentials: "include"
      });

      if (!response.ok) return;

      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setUserReservations(json.data);
      }
    } catch {
      console.warn("[useBookList] Gagal mengambil reservasi user");
    }
  };

  const userId = currentUser?.id;

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await fetchBibliographies();

      if (userId) {
        await fetchMyReservations();
      } else {
        setUserReservations([]);
      }
    } catch (err) {
      console.error("[useBookList] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    bibliographies,
    userReservations,
    loading,
    error,
    refetch: fetchAll
  };
}
