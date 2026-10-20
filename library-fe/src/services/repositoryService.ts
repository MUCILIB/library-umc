import { API_BASE_URL } from "@/utils/api-config";
import { getAuthHeaders } from "@/api/client";

export interface RepositoryProposal {
  id: string;
  proposalNumber: string;
  title: string;
  abstract: string | null;
  keywords: string[] | null;
  authorUserId: string;
  authorNim: string;
  authorName: string;
  studyProgramId: number | null;
  advisorName1: string;
  advisorName2: string | null;
  documentCategory: "PROPOSAL" | "THESIS" | "REPORT";
  status: "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUIRED" | "APPROVED" | "ARCHIVED";
  fileSize: number;
  pageCount: number;
  reviewerUserId: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studyProgram?: {
    id: number;
    name: string;
    code: string | null;
    faculty?: {
      id: number;
      name: string;
      code: string | null;
    } | null;
  } | null;
  pageRules?: Array<{
    id: string;
    roleScope: string;
    allowedStartPage: number;
    allowedEndPage: number;
    allowDownloadFull: boolean;
  }>;
}

export interface CreateProposalPayload {
  title: string;
  abstract?: string;
  advisorName1: string;
  advisorName2?: string;
  studyProgramId: number;
  documentCategory: "PROPOSAL" | "THESIS" | "REPORT";
}

class RepositoryService {
  private baseUrl = API_BASE_URL;

  private async parseJsonResponse(response: Response, defaultErrorMessage: string) {
    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `Server mengembalikan response non-JSON (Status ${response.status}). Pastikan backend telah aktif dan terdeploy.`
      );
    }
    if (!result.success) {
      throw new Error(result.message || defaultErrorMessage);
    }
    return result.data;
  }

  async getMyProposals(): Promise<RepositoryProposal[]> {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      }
    });
    return this.parseJsonResponse(response, "Gagal memuat proposal");
  }

  async getAllProposals(status?: string, options?: RequestInit): Promise<RepositoryProposal[]> {
    const url = status
      ? `${this.baseUrl}/api/repository/proposals?status=${status}`
      : `${this.baseUrl}/api/repository/proposals`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options?.headers,
      },
      signal: options?.signal,
    });
    return this.parseJsonResponse(response, "Gagal memuat daftar proposal");
  }

  async getPublishedProposals(params?: {
    search?: string;
    category?: string;
    studyProgramId?: number;
    facultyId?: number;
    yearStart?: number;
    yearEnd?: number;
  }): Promise<RepositoryProposal[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.category) query.append("category", params.category);
    if (params?.studyProgramId) query.append("studyProgramId", params.studyProgramId.toString());
    if (params?.facultyId) query.append("facultyId", params.facultyId.toString());
    if (params?.yearStart) query.append("yearStart", params.yearStart.toString());
    if (params?.yearEnd) query.append("yearEnd", params.yearEnd.toString());

    const qs = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${this.baseUrl}/api/repository/published${qs}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      }
    });
    return this.parseJsonResponse(response, "Gagal memuat repositori karya ilmiah publik");
  }

  async getProposalById(id: string): Promise<RepositoryProposal> {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals/${id}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      }
    });
    return this.parseJsonResponse(response, "Gagal memuat detail proposal");
  }

  async submitProposal(
    payload: CreateProposalPayload,
    file: File
  ): Promise<RepositoryProposal> {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.abstract) formData.append("abstract", payload.abstract);
    formData.append("advisorName1", payload.advisorName1);
    if (payload.advisorName2) formData.append("advisorName2", payload.advisorName2);
    formData.append("studyProgramId", payload.studyProgramId.toString());
    formData.append("documentCategory", payload.documentCategory);
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/api/repository/proposals`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
      body: formData
    });

    return this.parseJsonResponse(response, "Gagal mengajukan proposal");
  }

  async reviewProposal(
    id: string,
    action: "APPROVE" | "REVISION_REQUIRED" | "UNDER_REVIEW",
    reviewNotes?: string
  ): Promise<RepositoryProposal> {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals/${id}/review`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ action, reviewNotes })
    });
    return this.parseJsonResponse(response, "Gagal memperbarui review proposal");
  }

  async configurePageRule(
    id: string,
    rule: {
      roleScope: string;
      allowedStartPage: number;
      allowedEndPage: number;
      allowDownloadFull: boolean;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals/${id}/page-rules`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(rule)
    });
    return this.parseJsonResponse(response, "Gagal menyimpan batasan halaman");
  }

  async updateProposal(
    id: string,
    payload: Partial<CreateProposalPayload>,
    file?: File
  ): Promise<RepositoryProposal> {
    const formData = new FormData();
    if (payload.title) formData.append("title", payload.title);
    if (payload.abstract !== undefined) formData.append("abstract", payload.abstract || "");
    if (payload.advisorName1) formData.append("advisorName1", payload.advisorName1);
    if (payload.advisorName2 !== undefined) formData.append("advisorName2", payload.advisorName2 || "");
    if (payload.studyProgramId) formData.append("studyProgramId", payload.studyProgramId.toString());
    if (payload.documentCategory) formData.append("documentCategory", payload.documentCategory);
    if (file) formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/api/repository/proposals/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
      body: formData
    });

    return this.parseJsonResponse(response, "Gagal memperbarui naskah proposal");
  }

  async deleteProposal(id: string): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      }
    });
    return this.parseJsonResponse(response, "Gagal menghapus naskah proposal");
  }
}

export const repositoryService = new RepositoryService();
