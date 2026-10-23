import { API_BASE_URL } from "@/utils/api-config";

export interface Recommendation {
  id: string;
  dosenId: string;
  isbn?: string | null;
  title: string;
  author: string;
  publisher?: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string | null;
  dosen?: {
    name: string;
    email: string;
  };
}

export interface CreateRecommendationPayload {
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  reason: string;
}

export interface RecommendationResponse {
  success: boolean;
  message: string;
  data: Recommendation;
}

export interface RecommendationListResponse {
  success: boolean;
  message: string;
  data: Recommendation[];
}

export const recommendationService = {
  /**
   * Mengambil riwayat rekomendasi buku milik dosen yang sedang login
   */
  async getMyRecommendations(status?: "pending" | "approved" | "rejected"): Promise<Recommendation[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`${API_BASE_URL}/api/recommendations/history${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const json: RecommendationListResponse = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Gagal memuat rekomendasi buku");
    }

    return Array.isArray(json.data) ? json.data : [];
  },

  /**
   * Mengajukan rekomendasi buku baru (khusus Dosen)
   */
  async createRecommendation(payload: CreateRecommendationPayload): Promise<Recommendation> {
    const res = await fetch(`${API_BASE_URL}/api/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const json: RecommendationResponse = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Gagal mengajukan usulan buku");
    }

    return json.data;
  },

  /**
   * Membatalkan / menghapus usulan buku (hanya bisa jika status pending)
   */
  async deleteMyRecommendation(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/recommendations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Gagal menghapus usulan buku");
    }

    return true;
  },
};

export default recommendationService;
