export type NewsCategory =
  | "pengumuman"
  | "agenda"
  | "kegiatan"
  | "layanan"
  | "literasi";

export type NewsStatus = "draft" | "published" | "archived";

export interface CreateNewsInput {
  title: string;
  slug?: string;
  category: NewsCategory;
  excerpt?: string;
  content: string;
  coverImage?: string;
  status?: NewsStatus;
  publishedAt?: Date | string | null;
}

export interface UpdateNewsInput {
  title?: string;
  slug?: string;
  category?: NewsCategory;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  status?: NewsStatus;
  publishedAt?: Date | string | null;
}

export interface QueryNewsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: NewsCategory | "all";
  status?: NewsStatus | "all";
}
