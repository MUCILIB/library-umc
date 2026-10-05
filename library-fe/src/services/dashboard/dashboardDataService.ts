import { API_BASE_URL } from "@/utils/api-config";

export interface DashboardStats {
  totalBibliographies: number;
  totalItems: number;
  totalCategories: number;
  totalGuests: number;
  webVisits: number;
  combinedVisits: number;
  activeBorrowings: number;
  outstandingFines: number;
  totalFineRevenue: number;
  waitingReservations?: number;
}

interface WebTrafficSummaryResponse {
  success: boolean;
  data?: {
    summary?: {
      todayPageViews?: number;
    };
  };
}

export interface BibliographyItem {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: string;
  type: string;
  category?: {
    id: string;
    name: string;
  };
  categoryId?: string;
  isbn?: string;
  stock: number;
  image: string | null;
}

export interface CategoryItem {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface GuestLogItem {
  id: string;
  name: string;
  email?: string | null;
  identifier: string;
  faculty?: string | null;
  major?: string | null;
  institution?: string | null;
  purpose?: string | null;
  phone?: string | null;
  studyProgramId?: number | null;
  facultyId?: number | null;
  type?: "member" | "non-member" | string;
  visitDate: string;
  memberId?: string | null;
}

const jsonOrThrow = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
};

export const dashboardDataService = {
  async getBibliographies(): Promise<BibliographyItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/bibliographies`, {
      credentials: "include"
    });
    const data = await jsonOrThrow(res);
    // Bibliographies API returns paginated { items, total, ... }
    if (data.success && data.data?.items && Array.isArray(data.data.items)) {
      return data.data.items;
    }
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async getCategories(): Promise<CategoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/categories`, {
      credentials: "include"
    });
    const data = await jsonOrThrow(res);
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async getGuests(params?: {
    studyProgramId?: number;
    facultyId?: number;
    type?: string;
    search?: string;
  }): Promise<GuestLogItem[]> {
    const query = new URLSearchParams();
    if (params?.studyProgramId) query.set("studyProgramId", String(params.studyProgramId));
    if (params?.facultyId) query.set("facultyId", String(params.facultyId));
    if (params?.type) query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    const res = await fetch(`${API_BASE_URL}/api/guests${qs ? `?${qs}` : ""}`, {
      credentials: "include"
    });
    const data = await jsonOrThrow(res);
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async getStats(): Promise<DashboardStats> {
    const [
      bibliographies,
      categories,
      guests,
      loansRes,
      unpaidFinesRes,
      paidFinesRes,
      webTrafficRes,
      reservationsRes
    ] = await Promise.all([
      this.getBibliographies(),
      this.getCategories(),
      this.getGuests().catch(() => []),
      fetch(`${API_BASE_URL}/api/loans?status=approved&limit=200`, {
        credentials: "include"
      }),
      fetch(`${API_BASE_URL}/api/fines?status=unpaid&limit=200`, {
        credentials: "include"
      }),
      fetch(`${API_BASE_URL}/api/fines?status=paid&limit=200`, {
        credentials: "include"
      }),
      fetch(`${API_BASE_URL}/api/reports/web-traffic?days=1`, {
        credentials: "include"
      }),
      fetch(`${API_BASE_URL}/api/reservations?status=waiting&limit=200`, {
        credentials: "include"
      }).catch(() => null)
    ]);

    let activeBorrowings = 0;
    let outstandingFines = 0;
    let totalFineRevenue = 0;
    let webVisits = 0;
    let waitingReservations = 0;

    try {
      const loansData = await loansRes.json();
      if (loansData.success && Array.isArray(loansData.data)) {
        activeBorrowings = loansData.data.length;
      }
    } catch {
      activeBorrowings = 0;
    }

    try {
      const unpaidFinesData = await unpaidFinesRes.json();
      if (unpaidFinesData.success && Array.isArray(unpaidFinesData.data)) {
        outstandingFines = unpaidFinesData.data.reduce(
          (sum: number, fine: { amount: number }) =>
            sum + (Number(fine.amount) || 0),
          0
        );
      }
    } catch {
      outstandingFines = 0;
    }

    try {
      const paidFinesData = await paidFinesRes.json();
      if (paidFinesData.success && Array.isArray(paidFinesData.data)) {
        totalFineRevenue = paidFinesData.data.reduce(
          (sum: number, fine: { amount: number }) =>
            sum + (Number(fine.amount) || 0),
          0
        );
      }
    } catch {
      totalFineRevenue = 0;
    }

    try {
      const webTrafficData =
        (await webTrafficRes.json()) as WebTrafficSummaryResponse;
      if (webTrafficData.success) {
        webVisits = Number(webTrafficData.data?.summary?.todayPageViews || 0);
      }
    } catch {
      webVisits = 0;
    }

    try {
      if (reservationsRes) {
        const reservationsData = await reservationsRes.json();
        if (reservationsData.success && Array.isArray(reservationsData.data)) {
          waitingReservations = reservationsData.data.length;
        }
      }
    } catch {
      waitingReservations = 0;
    }

    return {
      totalBibliographies: bibliographies.length,
      totalItems: bibliographies.reduce((sum, item) => sum + (Number(item.stock) || 0), 0),
      totalCategories: categories.length,
      totalGuests: guests.length,
      webVisits,
      combinedVisits: guests.length + webVisits,
      activeBorrowings,
      outstandingFines,
      totalFineRevenue,
      waitingReservations
    };
  },

  async deleteBibliography(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/bibliographies/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    return jsonOrThrow(res);
  },

  async deleteCategory(id: number) {
    const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    return jsonOrThrow(res);
  },

  async deleteGuest(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/guests/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    return jsonOrThrow(res);
  },

  async recordVisit(payload: { name: string; email: string; identifier?: string; faculty?: string; major?: string }) {
    const res = await fetch(`${API_BASE_URL}/api/guests/direct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        identifier: payload.identifier || "UNKNOWN",
        faculty: payload.faculty || "Not Specified",
        major: payload.major || "Not Specified",
      })
    });
    return jsonOrThrow(res);
  }
};