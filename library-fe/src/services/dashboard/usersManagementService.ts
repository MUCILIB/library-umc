import { API_BASE_URL } from "@/utils/api-config";

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "super_admin" | "staff" | "student" | "lecturer" | string;
  banned: boolean;
  createdAt: string;
  hasSyncedMember?: boolean;
  cardStatus?:
    | "not_requested"
    | "pending"
    | "active"
    | "rejected"
    | "expired"
    | null;
  cardNumber?: string | null;
  cardRequestedAt?: string | null;
  cardApprovedAt?: string | null;
  cardRejectedAt?: string | null;
  cardRejectedReason?: string | null;
}

export interface PendingMemberCardRequest {
  id: string;
  userId: string;
  memberType: "student" | "lecturer" | "staff" | "super_admin";
  nimNidn: string | null;
  faculty: string | null;
  phone: string | null;
  cardStatus: "pending";
  cardNumber: string | null;
  cardRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
  };
}

const jsonOrThrow = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
};

export const usersManagementService = {
  async getUsers(): Promise<DashboardUser[]> {
    const res = await fetch(`${API_BASE_URL}/api/users/all`, {
      credentials: "include"
    });
    const data = await jsonOrThrow(res);
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async updateRole(userId: string, role: string) {
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role })
    });
    return jsonOrThrow(res);
  },

  async updateBanStatus(userId: string, banned: boolean, banReason?: string) {
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ banned, banReason })
    });
    return jsonOrThrow(res);
  },

  async deleteUser(userId: string) {
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: "DELETE",
      credentials: "include"
    });
    return jsonOrThrow(res);
  },

  async syncMemberByUserId(userId: string) {
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}/sync-member`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    return jsonOrThrow(res);
  },

  async issueMemberCard(userId: string, cardNumber?: string) {
    const res = await fetch(
      `${API_BASE_URL}/api/members/${userId}/card/issue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cardNumber })
      }
    );
    return jsonOrThrow(res);
  },

  async getPendingCardRequests(
    limit = 100
  ): Promise<PendingMemberCardRequest[]> {
    const query = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(
      `${API_BASE_URL}/api/members/cards/pending?${query.toString()}`,
      {
        credentials: "include"
      }
    );
    const data = await jsonOrThrow(res);
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async approveMemberCard(memberId: string, cardNumber?: string) {
    const res = await fetch(
      `${API_BASE_URL}/api/members/${memberId}/card/approve`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cardNumber })
      }
    );
    return jsonOrThrow(res);
  },

  async rejectMemberCard(memberId: string, reason: string) {
    const res = await fetch(
      `${API_BASE_URL}/api/members/${memberId}/card/reject`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason })
      }
    );
    return jsonOrThrow(res);
  },

  async getMembers(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/members`, {
      credentials: "include"
    });
    const data = await jsonOrThrow(res);
    return data.success && Array.isArray(data.data) ? data.data : [];
  }
};
