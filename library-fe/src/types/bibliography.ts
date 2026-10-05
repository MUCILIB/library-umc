// src/types/bibliography.ts
// Tipe-tipe yang berkaitan dengan bibliografi buku (public catalog & reservasi)

// ==========================================
// BIBLIOGRAPHY
// ==========================================

export type BibliographyType = "physical_book" | "ebook" | "journal" | "thesis";

/** Struktur bibliografi yang dikembalikan dari GET /api/bibliographies */
export interface Bibliography {
  id: string;
  title: string;
  author: string;
  publisher: string;
  /** Tahun terbit — backend mengembalikan sebagai string (varchar) */
  publicationYear: string;
  isbn?: string;
  type: BibliographyType;
  description?: string;
  /** URL gambar cover (Cloudinary) */
  image: string | null;
  /** Menunjukkan apakah buku populer / ditampilkan di home */
  isPopular?: boolean;
  /** Jumlah stok yang tersedia (hanya relevan untuk physical_book / agregat) */
  stock?: number;
  /** Daftar item fisik individual (buku yang memiliki barcode / ID unik) */
  items?: {
    id: string;
    status: string;
    itemCode?: string;
    location?: {
      id: number;
      room: string;
      rack: string;
      shelf: string;
    };
  }[];
  subjects?: {
    id: number;
    name: string;
  }[];
  faculties?: {
    id: number;
    name: string;
    code?: string;
  }[];
  studyPrograms?: {
    id: number;
    name: string;
    code?: string;
    faculty?: { id: number; name: string };
  }[];
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// RESERVATION
// ==========================================

export type ReservationStatus = "waiting" | "fulfilled" | "canceled";

/** Struktur reservasi dari GET /api/reservations/my */
export interface Reservation {
  id: string;
  memberId: string;
  bibliographyId: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// LOAN REQUEST
// ==========================================

export interface LoanRequest {
  id: string;
  status:
    | "pending"
    | "approved"
    | "extended"
    | "rejected"
    | "active"
    | "returned"
    | "overdue";
  itemId: string;
  memberId: string;
  loanDate?: string;
  dueDate?: string;
  returnDate?: string;
  approvedBy?: string;
  createdAt?: string;
  member?: Record<string, unknown>;
  item?: Record<string, unknown>;
}
