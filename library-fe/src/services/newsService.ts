import { apiFetch, getAuthHeaders } from "@/api/client";
import { API_BASE_URL } from "@/utils/api-config";

export type NewsCategory =
  | "pengumuman"
  | "agenda"
  | "kegiatan"
  | "layanan"
  | "literasi";

export type NewsStatus = "draft" | "published" | "archived";

export interface NewsAuthor {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  category: NewsCategory;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  status: NewsStatus;
  views: number;
  authorId?: string | null;
  author?: NewsAuthor | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueryNewsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: NewsCategory | "all";
  status?: NewsStatus | "all";
}

export interface NewsListResponse {
  items: NewsItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateNewsPayload {
  title: string;
  slug?: string;
  category: NewsCategory;
  excerpt?: string;
  content: string;
  coverImage?: string;
  status?: NewsStatus;
  publishedAt?: string | null;
}

export interface UpdateNewsPayload {
  title?: string;
  slug?: string;
  category?: NewsCategory;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  status?: NewsStatus;
  publishedAt?: string | null;
}

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  pengumuman: "Pengumuman",
  agenda: "Agenda",
  kegiatan: "Kegiatan",
  layanan: "Layanan",
  literasi: "Literasi",
};

export const CATEGORY_STYLES: Record<
  NewsCategory,
  { bg: string; text: string; border: string }
> = {
  pengumuman: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900",
  },
  agenda: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-900",
  },
  kegiatan: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900",
  },
  layanan: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900",
  },
  literasi: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-900",
  },
};

export const newsService = {
  /**
   * Mengambil daftar berita
   */
  async getNewsList(params: QueryNewsParams = {}): Promise<NewsListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);
    if (params.category && params.category !== "all") query.set("category", params.category);
    if (params.status) query.set("status", params.status);

    const queryString = query.toString();
    const path = `/api/news${queryString ? `?${queryString}` : ""}`;
    const res = await apiFetch<NewsListResponse>(path);
    return res.data;
  },

  /**
   * Mengambil beberapa berita terbaru yang dipublikasikan (untuk Landing Page)
   */
  async getRecentNews(limit = 4): Promise<NewsItem[]> {
    const res = await apiFetch<NewsItem[]>(`/api/news/recent?limit=${limit}`);
    return res.data;
  },

  /**
   * Mengambil detail berita berdasarkan slug (Publik)
   */
  async getNewsBySlug(slug: string): Promise<NewsItem> {
    const res = await apiFetch<NewsItem>(`/api/news/${encodeURIComponent(slug)}`);
    return res.data;
  },

  /**
   * Mengambil data berita berdasarkan ID (CMS Admin)
   */
  async getNewsById(id: string): Promise<NewsItem> {
    const res = await apiFetch<NewsItem>(`/api/news/id/${id}`);
    return res.data;
  },

  /**
   * Membuat artikel berita baru
   */
  async createNews(payload: CreateNewsPayload): Promise<NewsItem> {
    const res = await apiFetch<NewsItem>("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Memperbarui artikel berita
   */
  async updateNews(id: string, payload: UpdateNewsPayload): Promise<NewsItem> {
    const res = await apiFetch<NewsItem>(`/api/news/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  /**
   * Menghapus artikel berita
   */
  async deleteNews(id: string): Promise<{ id: string }> {
    const res = await apiFetch<{ id: string }>(`/api/news/${id}`, {
      method: "DELETE",
    });
    return res.data;
  },

  /**
   * Mengunggah berkas gambar ke S3
   */
  async uploadImage(file: File): Promise<{ url: string; key: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const authHeaders = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/news/upload`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || "Gagal mengunggah gambar ke S3");
    }

    const resJson = await response.json();
    return resJson.data;
  },

  /**
   * Mendapatkan URL gambar yang aman (menangani path relatif `/api/news/assets/...` ke full URL)
   */
  getImageUrl(urlOrPath?: string | null): string {
    if (!urlOrPath) return "";
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      return urlOrPath;
    }
    if (urlOrPath.startsWith("/")) {
      return `${API_BASE_URL.replace(/\/api$/, "")}${urlOrPath}`;
    }
    return `${API_BASE_URL}/api/news/assets/${urlOrPath}`;
  },
};
