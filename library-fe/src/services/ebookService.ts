import { API_BASE_URL } from "@/utils/api-config";
import { getAuthHeaders } from "@/api/client";

export interface EbookItem {
  id: string;
  title: string;
  isbn?: string | null;
  publishYear?: number | null;
  edition?: string | null;
  image?: string | null;
  description?: string | null;
  type: string;
  category?: { id: number; name: string } | null;
  publisher?: { id: number; name: string } | null;
  authors: Array<{ id?: number; name?: string; role?: string }>;
  content?: {
    id: string;
    contentType?: string | null;
    fileSize?: number | null;
    pageCount?: number | null;
    isFullAccess?: boolean | null;
    previewStartPage?: number | null;
    previewEndPage?: number | null;
    allowDownload?: boolean | null;
    hasFile?: boolean;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EbookListResponse {
  data: EbookItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class EbookService {
  private baseUrl = API_BASE_URL;

  private async parseJsonResponse(response: Response, defaultErrorMessage: string) {
    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        `Server mengembalikan response non-JSON (Status ${response.status}). Pastikan backend telah aktif.`
      );
    }
    if (!result.success) {
      throw new Error(result.message || defaultErrorMessage);
    }
    return result;
  }

  async getEbooks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
  }): Promise<EbookListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.categoryId) query.set("categoryId", params.categoryId.toString());

    const queryString = query.toString();
    const url = `${this.baseUrl}/api/ebooks${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders()
      },
      credentials: "include"
    });

    const parsed = await this.parseJsonResponse(res, "Gagal mengambil daftar e-book");
    return {
      data: parsed.data || [],
      meta: parsed.meta || { page: 1, limit: 10, total: 0, totalPages: 1 }
    };
  }

  async getEbookById(id: string): Promise<EbookItem> {
    const url = `${this.baseUrl}/api/ebooks/${id}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders()
      },
      credentials: "include"
    });

    const parsed = await this.parseJsonResponse(res, "Gagal mengambil detail e-book");
    return parsed.data;
  }

  async createEbook(formData: FormData): Promise<EbookItem> {
    const url = `${this.baseUrl}/api/ebooks`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders()
      },
      credentials: "include",
      body: formData
    });

    const parsed = await this.parseJsonResponse(res, "Gagal menambahkan e-book");
    return parsed.data;
  }

  async updateEbook(id: string, formData: FormData): Promise<EbookItem> {
    const url = `${this.baseUrl}/api/ebooks/${id}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders()
      },
      credentials: "include",
      body: formData
    });

    const parsed = await this.parseJsonResponse(res, "Gagal memperbarui e-book");
    return parsed.data;
  }

  async deleteEbook(id: string): Promise<void> {
    const url = `${this.baseUrl}/api/ebooks/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders()
      },
      credentials: "include"
    });

    await this.parseJsonResponse(res, "Gagal menghapus e-book");
  }

  getStreamUrl(id: string, mode?: "preview" | "full" | "download"): string {
    const query = new URLSearchParams();
    if (mode === "preview") query.set("preview", "public");
    if (mode === "download") query.set("download", "true");
    const qs = query.toString();
    return `${this.baseUrl}/api/ebooks/${id}/stream${qs ? `?${qs}` : ""}`;
  }
}

export const ebookService = new EbookService();
