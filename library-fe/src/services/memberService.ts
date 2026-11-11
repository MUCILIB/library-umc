import { API_BASE_URL } from "@/utils/api-config";
import { getAuthHeaders } from "@/api/client";

export interface MemberProfile {
  id: string;
  userId: string;
  memberType: "student" | "lecturer" | "staff" | "super_admin" | "external";
  nimNidn: string | null;
  faculty: string | null;
  originRegion: string | null;
  institution: string | null;
  phone: string | null;
  cardStatus: "not_requested" | "pending" | "active" | "rejected" | "expired";
  cardNumber: string | null;
  cardRequestedAt: string | null;
  cardApprovedAt: string | null;
  cardExpiresAt?: string | null;
  cardRenewalStatus?: "pending" | "approved" | "rejected" | null;
  cardRenewalRequestedAt?: string | null;
  cardRejectedAt: string | null;
  cardRejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
  };
  isExternal?: boolean;
}

export interface UpdateProfilePayload {
  nimNidn?: string;
  faculty?: string;
  originRegion?: string;
  institution?: string;
  phone?: string;
  image?: string;
}

class MemberService {
  private baseUrl = API_BASE_URL;

  async uploadMyAvatar(file: File): Promise<{ url: string; key: string; filename: string }> {
    const authHeaders = getAuthHeaders();
    const formData = new FormData();
    formData.append("avatar", file);

    const headers: Record<string, string> = { ...authHeaders };
    delete headers["Content-Type"];

    const response = await fetch(`${this.baseUrl}/api/members/me/avatar`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal mengunggah foto profil");
    }
    return result.data;
  }

  async getMyProfile(): Promise<MemberProfile> {
    const authHeaders = getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/api/members/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      }
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal memuat profil");
    }
    return result.data;
  }

  async updateMyProfile(payload: UpdateProfilePayload): Promise<MemberProfile> {
    const authHeaders = getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/api/members/me`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal memperbarui profil");
    }
    return result.data;
  }

  async requestMyMemberCard(): Promise<MemberProfile> {
    const authHeaders = getAuthHeaders();
    const response = await fetch(
      `${this.baseUrl}/api/members/me/card/request`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        }
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal mengajukan kartu member");
    }

    return this.getMyProfile();
  }

  async requestCardRenewal(): Promise<MemberProfile> {
    const authHeaders = getAuthHeaders();
    const response = await fetch(
      `${this.baseUrl}/api/members/me/card/renew`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        }
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Gagal mengajukan perpanjangan kartu");
    }

    return this.getMyProfile();
  }
}

export default new MemberService();
