import { API_BASE_URL } from "@/utils/api-config";

export interface Loan {
  id: string;
  requestId?: string;
  itemId: string;
  memberId: string;
  memberName?: string;
  memberNim?: string;
  bibliographyTitle?: string;
  bibliographyAuthor?: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: "pending" | "approved" | "rejected" | "returned" | "extended";
  extensionStatus?: "none" | "pending" | "approved" | "rejected";
  extendCount: number;
  returnRequests?: Array<{ id: string; status: "pending" | "approved" }>;
  requestDate?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  rejectReason?: string;
  fine?: number;
  verificationToken?: string;
  qrCodeUrl?: string;
  member?: Record<string, unknown>;
  item?: {
    id: string;
    itemCode?: string;
    barcode?: string;
    uniqueCode?: string;
    locationId?: number;
    location?: {
      id?: number;
      room?: string;
      rack?: string;
      shelf?: string;
    };
    bibliographyId: string;
    status: string;
    bibliography: {
      id: string;
      title: string;
      author?: string;
      sor?: string;
      image?: string;
      callNumber?: string;
      classification?: string;
      authors?: Array<{ id?: number; name: string }>;
      bibliographyAuthors?: Array<{ author?: { name: string } }>;
    };
  } & Record<string, unknown>;
}

class LoanService {
  private baseUrl = API_BASE_URL;

  // POST /loans/request - Request a book loan (Member)
  async requestLoan(data: {
    memberId: string;
    bibliographyId: string;
    loanDate: string;
    dueDate: string;
    notes?: string;
  }): Promise<Loan> {
    const response = await fetch(`${this.baseUrl}/api/loans/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal mengajukan peminjaman");
    return result.data;
  }

  // GET /loans - Get all loans (Admin)
  async getAllLoans(params?: {
    status?: string;
    memberId?: string;
    itemId?: string;
  }): Promise<Loan[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.memberId) queryParams.append("memberId", params.memberId);
    if (params?.itemId) queryParams.append("itemId", params.itemId);

    const url = `${this.baseUrl}/api/loans${queryParams.toString() ? `?${queryParams}` : ""}`;
    const response = await fetch(url, { credentials: "include" });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal memuat data peminjaman");
    return result.data;
  }

  // GET /loans/history - Get my loan history (Member)
  async getMyLoanHistory(): Promise<Loan[]> {
    const response = await fetch(`${this.baseUrl}/api/loans/history`, {
      credentials: "include"
    });

    let result: { success?: boolean; message?: string; data?: Loan[] } | null =
      null;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "Respon server tidak valid saat memuat riwayat peminjaman"
      );
    }

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Gagal memuat riwayat peminjaman");
    }

    return Array.isArray(result.data) ? result.data : [];
  }

  // POST /loans/{requestId}/approve - Approve loan (Admin)
  async approveLoan(requestId: string, notes?: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/loans/${requestId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes })
      }
    );
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal menyetujui peminjaman");
  }

  // POST /loans/{requestId}/reject - Reject loan (Admin)
  async rejectLoan(requestId: string, reason: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/loans/${requestId}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason })
      }
    );
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal menolak peminjaman");
  }

  // POST /loans/{loanId}/return-request - Member creates a return request
  async createReturnRequest(loanId: string): Promise<{ success: boolean; message: string; data: unknown }> {
    const response = await fetch(`${this.baseUrl}/api/loans/${loanId}/return-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Gagal mengajukan pengembalian");
    return result;
  }

  // GET /loans/return-requests/pending - Admin gets pending return requests
  async getPendingReturnRequests(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/loans/return-requests/pending`, {
      credentials: "include"
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Gagal memuat permintaan pengembalian");
    return result.data;
  }

  // POST /loans/return-requests/{requestId}/approve - Admin approves return request
  async approveReturnRequest(requestId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/loans/return-requests/${requestId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Gagal menyetujui pengembalian");
    return result;
  }


  // GET /loans/verify/{token} - Verify loan token
  async verifyLoanToken(token: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/api/loans/verify/${token}`, {
      credentials: "include"
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Token tidak valid");
    return result.data;
  }

  // POST /api/loans/{loanId}/extend - Request extension (Member)
  async extendLoan(
    loanId: string
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const response = await fetch(`${this.baseUrl}/api/loans/${loanId}/extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal mengajukan perpanjangan");
    return result;
  }

  // POST /api/loans/{loanId}/approve-extension - Approve extension (Admin)
  async approveExtension(
    loanId: string
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const response = await fetch(`${this.baseUrl}/api/loans/${loanId}/approve-extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal menyetujui perpanjangan");
    return result;
  }

  // POST /api/loans/{loanId}/reject-extension - Reject extension (Admin)
  async rejectExtension(
    loanId: string
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    const response = await fetch(`${this.baseUrl}/api/loans/${loanId}/reject-extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal menolak perpanjangan");
    return result;
  }
}

export default new LoanService();
