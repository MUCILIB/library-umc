import { API_BASE_URL } from "@/utils/api-config";

// ==========================================
// Types
// ==========================================

export interface ApiSuccessResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Bibliography
export interface BibliographyAuthor {
  id: number;
  name: string;
  role: string;
  position: number;
}

export interface BibliographySubject {
  id: number;
  name: string;
}

export interface Bibliography {
  id: string;
  title: string;
  isbnIssn?: string;
  edition?: string;
  publishYear?: number;
  collation?: string;
  seriesTitle?: string;
  callNumber?: string;
  classification?: string;
  notes?: string;
  image?: string;
  sor?: string;
  description?: string;
  type?: string;
  stock: number;
  authors: BibliographyAuthor[];
  subjects: BibliographySubject[];
  unlistedAuthorsLabel?: string;
  totalItems: number;
  availableItems: number;
  publisher?: { id: number; name: string };
  publicationPlace?: { id: number; name: string };
  language?: { id: number; code: string; name: string };
  gmd?: { id: number; name: string };
  faculties?: { id: number; name: string; code?: string }[];
  studyPrograms?: { id: number; name: string; code?: string; faculty?: { id: number; name: string } }[];
  isPopular?: boolean;
  faculties?: Array<{ id: number; name: string }>;
  studyPrograms?: Array<{ id: number; name: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface BibliographyListResponse {
  items: Bibliography[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Item
export interface Item {
  id: string;
  bibliographyId: string;
  itemCode: string;
  inventoryCode?: string;
  callNumber?: string;
  locationId?: number;
  status: string;
  site?: string;
  source?: string;
  price?: string;
  priceCurrency?: string;
  qrToken?: string;
  qrVersion?: number;
  location?: { id: number; room: string; rack: string; shelf: string };
  bibliography?: Bibliography;
  createdAt?: string;
  updatedAt?: string;
}

// Import
export interface ImportBatch {
  id: string;
  type: "bibliography" | "item";
  filename: string;
  status: string;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  committedRows: number;
  duplicateRows: number;
  failedRows: number;
  createdAt: string;
  committedAt?: string;
}

export interface ImportApprovalResponse {
  processed: number;
  committed: number;
  failed: number;
  remaining: number;
  hasMore: boolean;
}

export interface ImportPreviewResponse {
  batch: ImportBatch;
  rows: Array<{
    id: string;
    rowNumber: number;
    rawData: Record<string, string>;
    resolvedData?: Record<string, unknown>;
    status: string;
  }>;
  errors: Array<{
    rowNumber: number;
    errors: string[];
  }>;
  pagination: PaginationMeta;
}

// ==========================================
// HTTP Client
// ==========================================

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T>> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    if (error.message === "Validation Error" && error.data?.fieldErrors) {
      const details = Object.entries(error.data.fieldErrors)
        .map(([field, msgs]) => {
          const fieldLabel = field === "isbnIssn" ? "ISBN/ISSN" : field === "title" ? "Judul" : field;
          return `${fieldLabel}: ${(msgs as string[]).join(", ")}`;
        })
        .join("; ");
      throw new Error(`Validasi Gagal - ${details}`);
    }
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

async function apiFetchBlob(path: string, filename: string): Promise<void> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

// ==========================================
// Bibliography API
// ==========================================

export const bibliographyApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return apiFetch<BibliographyListResponse>(`/api/bibliographies${query ? `?${query}` : ""}`);
  },

  getById: (id: string) =>
    apiFetch<Bibliography>(`/api/bibliographies/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch<Bibliography>("/api/bibliographies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Bibliography>(`/api/bibliographies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<null>(`/api/bibliographies/${id}`, { method: "DELETE" }),

  getItems: (id: string) =>
    apiFetch<Item[]>(`/api/bibliographies/${id}/items`),

  checkDuplicate: (params: { isbn?: string; title?: string; author?: string }) => {
    const search = new URLSearchParams();
    if (params.isbn) search.set("isbn", params.isbn);
    if (params.title) search.set("title", params.title);
    if (params.author) search.set("author", params.author);
    return apiFetch<{ hasExactMatch: boolean; duplicates: Array<{ id: string; title: string; isbnIssn?: string; classification?: string; callNumber?: string; authors: Array<{ name: string }>; similarity: string }> }>(
      `/api/bibliographies/check-duplicate?${search.toString()}`
    );
  },
};

// ==========================================
// Item API
// ==========================================

export const itemApi = {
  getById: (id: string) =>
    apiFetch<Item>(`/api/items/${id}`),

  create: (bibliographyId: string, data: Record<string, unknown>) =>
    apiFetch<Item>(`/api/bibliographies/${bibliographyId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  bulkCreate: (bibliographyId: string, data: { items: Array<Record<string, unknown>>; defaults?: Record<string, unknown> }) =>
    apiFetch<{ created: number; errors: unknown[] }>(
      `/api/bibliographies/${bibliographyId}/items/bulk`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }
    ),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Item>(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<Item>(`/api/items/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),

  updateLocation: (id: string, locationId: number) =>
    apiFetch<Item>(`/api/items/${id}/location`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    }),

  delete: (id: string) =>
    apiFetch<null>(`/api/items/${id}`, { method: "DELETE" }),

  getQrSvg: (id: string) => `${API_BASE_URL}/api/items/${id}/qr?format=svg`,
  getQrPng: (id: string) => `${API_BASE_URL}/api/items/${id}/qr?format=png`,

  resolveQr: (token: string) =>
    apiFetch<Item>(`/api/qr/resolve/${token}`),

  regenerateQr: (id: string) =>
    apiFetch<Item>(`/api/items/${id}/qr/regenerate`, { method: "POST" }),

  revokeQr: (id: string) =>
    apiFetch<Item>(`/api/items/${id}/qr/revoke`, { method: "POST" }),

  generateCode: (bibliographyId: string) =>
    apiFetch<{ itemCode: string }>(`/api/items/generate-code/${bibliographyId}`),
};

// ==========================================
// Location API
// ==========================================

export interface Location {
  id: number;
  room: string;
  rack: string;
  shelf: string;
}

export const locationApi = {
  list: () => apiFetch<Location[]>("/api/locations"),
};

// ==========================================
// Faculty API
// ==========================================

export interface Faculty {
  id: number;
  name: string;
  code?: string;
  createdAt?: string;
}

export const facultyApi = {
  list: () => apiFetch<Faculty[]>("/api/faculties"),

  getById: (id: number) => apiFetch<Faculty>(`/api/faculties/${id}`),

  create: (data: { name: string; code?: string }) =>
    apiFetch<Faculty>("/api/faculties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name: string; code?: string }) =>
    apiFetch<Faculty>(`/api/faculties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<null>(`/api/faculties/${id}`, { method: "DELETE" }),
};

// ==========================================
// Study Program API
// ==========================================

export interface StudyProgram {
  id: number;
  facultyId: number;
  name: string;
  code?: string;
  faculty?: { id: number; name: string };
  createdAt?: string;
}

export const studyProgramApi = {
  list: (facultyId?: number) => {
    const params = facultyId ? `?facultyId=${facultyId}` : "";
    return apiFetch<StudyProgram[]>(`/api/study-programs${params}`);
  },

  getById: (id: number) => apiFetch<StudyProgram>(`/api/study-programs/${id}`),

  create: (data: { name: string; code?: string; facultyId: number }) =>
    apiFetch<StudyProgram>("/api/study-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name: string; code?: string; facultyId?: number }) =>
    apiFetch<StudyProgram>(`/api/study-programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<null>(`/api/study-programs/${id}`, { method: "DELETE" }),
};

// ==========================================
// Import API
// ==========================================

export const importApi = {
  uploadBibliography: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ batchId: string; filename: string }>(
      "/api/import/bibliographies/upload",
      { method: "POST", body: formData }
    );
  },

  uploadItem: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ batchId: string; filename: string }>(
      "/api/import/items/upload",
      { method: "POST", body: formData }
    );
  },

  parse: (batchId: string) =>
    apiFetch<{ totalRows: number; parsedRows: number }>(
      `/api/import/batches/${batchId}/parse`,
      { method: "POST" }
    ),

  validate: (batchId: string) =>
    apiFetch<{ totalRows: number; validRows: number; invalidRows: number }>(
      `/api/import/batches/${batchId}/validate`,
      { method: "POST" }
    ),

  preview: (batchId: string, limit = 20) =>
    apiFetch<ImportPreviewResponse>(`/api/import/batches/${batchId}/preview?limit=${limit}`),

  approve: (batchId: string) =>
    apiFetch<ImportApprovalResponse>(
      `/api/import/batches/${batchId}/approve`,
      { method: "POST" }
    ),

  cancel: (batchId: string) =>
    apiFetch<{ success: boolean }>(
      `/api/import/batches/${batchId}/cancel`,
      { method: "POST" }
    ),

  list: () => apiFetch<ImportBatch[]>("/api/import/batches"),

  get: (batchId: string) =>
    apiFetch<ImportBatch>(`/api/import/batches/${batchId}`),

  getErrors: (batchId: string) =>
    apiFetch<Array<{ rowNumber: number; errors: string[]; rawData: unknown }>>(
      `/api/import/batches/${batchId}/errors`
    ),

  downloadErrors: (batchId: string) =>
    apiFetchBlob(`/api/import/batches/${batchId}/errors.csv`, `errors-${batchId}.csv`),
};

// ==========================================
// Export API
// ==========================================

export const exportApi = {
  downloadBibliographies: () =>
    apiFetchBlob("/api/export/bibliographies", "bibliographies_export.csv"),

  downloadItems: () =>
    apiFetchBlob("/api/export/items", "items_export.csv"),
};
