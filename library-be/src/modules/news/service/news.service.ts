import { db } from "../../../db";
import { news, Users } from "../../../db/schema";
import { eq, desc, and, or, ilike, sql, ne } from "drizzle-orm";
import type {
  CreateNewsInput,
  UpdateNewsInput,
  QueryNewsParams,
} from "../news.types";
import crypto from "crypto";

export class NewsService {
  /**
   * Mengubah judul menjadi string slug kebab-case ramah URL
   */
  static slugify(text: string): string {
    const slug = text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/&/g, "-dan-")
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      return `berita-${Date.now()}`;
    }
    return slug;
  }

  /**
   * Menghasilkan slug unik, menambahkan sufiks acak jika slug sudah digunakan di DB
   */
  static async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = this.slugify(title);
    let candidateSlug = baseSlug;

    // Cek apakah candidateSlug sudah ada di database
    const existing = await db.query.news.findFirst({
      where: excludeId
        ? and(eq(news.slug, candidateSlug), ne(news.id, excludeId))
        : eq(news.slug, candidateSlug),
    });

    if (!existing) {
      return candidateSlug;
    }

    // Jika terjadi duplikasi, tambahkan sufiks acak hex unik
    const suffix = crypto.randomBytes(3).toString("hex");
    return `${baseSlug}-${suffix}`;
  }

  /**
   * Membuat artikel berita baru
   */
  static async createNews(input: CreateNewsInput, authorId?: string) {
    const slug = input.slug
      ? await this.generateUniqueSlug(input.slug)
      : await this.generateUniqueSlug(input.title);

    const publishedAt =
      input.status === "published"
        ? input.publishedAt
          ? new Date(input.publishedAt)
          : new Date()
        : null;

    const [created] = await db
      .insert(news)
      .values({
        title: input.title,
        slug,
        category: input.category,
        excerpt: input.excerpt || null,
        content: input.content,
        coverImage: input.coverImage || null,
        status: input.status || "draft",
        authorId: authorId || null,
        publishedAt,
      })
      .returning();

    return created;
  }

  /**
   * Memperbarui artikel berita
   */
  static async updateNews(id: string, input: UpdateNewsInput) {
    const existing = await db.query.news.findFirst({
      where: eq(news.id, id),
    });

    if (!existing) {
      throw new Error("Berita tidak ditemukan");
    }

    let slug = existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      slug = await this.generateUniqueSlug(input.slug, id);
    } else if (input.title && input.title !== existing.title && !input.slug) {
      // Jika judul berubah dan slug tidak dikirim manual, buat ulang slug unik
      slug = await this.generateUniqueSlug(input.title, id);
    }

    let publishedAt = existing.publishedAt;
    if (input.status === "published" && existing.status !== "published") {
      publishedAt = input.publishedAt ? new Date(input.publishedAt) : new Date();
    } else if (input.status === "draft") {
      publishedAt = null;
    } else if (input.publishedAt !== undefined) {
      publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    }

    const [updated] = await db
      .update(news)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        slug,
        ...(input.category !== undefined && { category: input.category }),
        ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.status !== undefined && { status: input.status }),
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(news.id, id))
      .returning();

    return updated;
  }

  /**
   * Menghapus artikel berita
   */
  static async deleteNews(id: string) {
    const existing = await db.query.news.findFirst({
      where: eq(news.id, id),
    });

    if (!existing) {
      throw new Error("Berita tidak ditemukan");
    }

    await db.delete(news).where(eq(news.id, id));
    return true;
  }

  /**
   * Mengambil detail artikel berita berdasarkan ID
   */
  static async getNewsById(id: string) {
    const result = await db.query.news.findFirst({
      where: eq(news.id, id),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return result || null;
  }

  /**
   * Mengambil artikel berita berdasarkan slug dan menambah counter views secara atomik
   */
  static async getNewsBySlug(slug: string, incrementView = false) {
    const result = await db.query.news.findFirst({
      where: eq(news.slug, slug),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!result) {
      return null;
    }

    if (incrementView) {
      // Increment views atomically in background
      db.update(news)
        .set({ views: sql`${news.views} + 1` })
        .where(eq(news.id, result.id))
        .catch((err) => console.error("Error incrementing news views:", err));
      result.views = (result.views || 0) + 1;
    }

    return result;
  }

  /**
   * Mengambil daftar berita dengan pencarian, filter kategori, status, dan paginasi
   */
  static async listNews(params: QueryNewsParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter status
    if (params.status && params.status !== "all") {
      conditions.push(eq(news.status, params.status));
    }

    // Filter kategori
    if (params.category && params.category !== "all") {
      conditions.push(eq(news.category, params.category));
    }

    // Filter pencarian
    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(news.title, term),
          ilike(news.excerpt, term),
          ilike(news.content, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, items] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(news)
        .where(whereClause),
      db.query.news.findMany({
        where: whereClause,
        orderBy: [desc(news.publishedAt), desc(news.createdAt)],
        limit,
        offset,
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Mengambil berita terbaru yang sudah terbit (misalnya untuk ditampilkan di Landing Page)
   */
  static async getRecentNews(limit = 4) {
    const safeLimit = Math.min(20, Math.max(1, limit));
    return await db.query.news.findMany({
      where: eq(news.status, "published"),
      orderBy: [desc(news.publishedAt), desc(news.createdAt)],
      limit: safeLimit,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  }

  /**
   * Mengambil ringkasan statistik dan analitik traffic berita
   */
  static async getNewsStats() {
    const [counts, totalViewsRes, topArticles, categoryCounts] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          published: sql<number>`count(case when ${news.status} = 'published' then 1 end)::int`,
          draft: sql<number>`count(case when ${news.status} = 'draft' then 1 end)::int`,
          archived: sql<number>`count(case when ${news.status} = 'archived' then 1 end)::int`,
        })
        .from(news),
      db
        .select({
          totalViews: sql<number>`coalesce(sum(${news.views}), 0)::int`,
        })
        .from(news),
      db.query.news.findMany({
        orderBy: [desc(news.views), desc(news.createdAt)],
        limit: 5,
        columns: {
          id: true,
          title: true,
          slug: true,
          views: true,
          category: true,
          publishedAt: true,
          status: true,
        },
      }),
      db
        .select({
          category: news.category,
          count: sql<number>`count(*)::int`,
          views: sql<number>`coalesce(sum(${news.views}), 0)::int`,
        })
        .from(news)
        .groupBy(news.category),
    ]);

    return {
      total: counts[0]?.total || 0,
      published: counts[0]?.published || 0,
      draft: counts[0]?.draft || 0,
      archived: counts[0]?.archived || 0,
      totalViews: totalViewsRes[0]?.totalViews || 0,
      topArticles,
      categoryStats: categoryCounts,
    };
  }
}
