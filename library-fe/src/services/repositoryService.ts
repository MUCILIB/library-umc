import { API_BASE_URL } from "@/utils/api-config";

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

  async getMyProposals(): Promise<RepositoryProposal[]> {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal memuat proposal");
    }
    return result.data;
  }

  async getAllProposals(status?: string): Promise<RepositoryProposal[]> {
    const url = status
      ? `${this.baseUrl}/api/repository/proposals?status=${status}`
      : `${this.baseUrl}/api/repository/proposals`;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal memuat daftar proposal");
    }
    return result.data;
  }

  async getProposalById(id: string): Promise<RepositoryProposal> {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals/${id}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal memuat detail proposal");
    }
    return result.data;
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
      body: formData
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal mengajukan proposal");
    }
    return result.data;
  }

  async reviewProposal(
    id: string,
    action: "APPROVE" | "REVISION_REQUIRED" | "UNDER_REVIEW",
    reviewNotes?: string
  ): Promise<RepositoryProposal> {
    const response = await fetch(`${this.baseUrl}/api/repository/proposals/${id}/review`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNotes })
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal memperbarui review proposal");
    }
    return result.data;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule)
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal menyimpan batasan halaman");
    }
    return result.data;
  }
}

export const repositoryService = new RepositoryService();
