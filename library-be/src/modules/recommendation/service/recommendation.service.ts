import { db } from "../../../db";
import { recommendations, bibliographies } from "../../../db/schema";
import { eq, and, isNull, desc, ilike } from "drizzle-orm";
import { NotFoundError, BadRequestError, ForbiddenError } from "../../../exceptions/AppError";

class RecommendationService {
  /**
   * 1. Submit Rekomendasi (Dosen)
   */
  async createRecommendation(
    dosenId: string,
    data: {
      isbn?: string;
      title: string;
      author: string;
      publisher?: string;
      reason: string;
    }
  ) {
    // Priority 1: Check by ISBN if provided (most reliable)
    if (data.isbn) {
      const existingByISBN = await db.query.bibliographies.findFirst({
        where: and(
          eq(bibliographies.isbnIssn, data.isbn),
          isNull(bibliographies.deletedAt)
        )
      });

      if (existingByISBN) {
        throw new BadRequestError(
          "Buku dengan ISBN ini sudah tersedia di koleksi perpustakaan. Silakan lakukan reservasi atau peminjaman langsung."
        );
      }
    }

    // Priority 2: Check by Title & Author if ISBN not found / not provided
    const existingCollection = await db.query.bibliographies.findFirst({
      where: and(
        ilike(bibliographies.title, `%${data.title}%`),
        ilike(bibliographies.sor, `%${data.author}%`),
        isNull(bibliographies.deletedAt)
      )
    });

    if (existingCollection) {
      throw new BadRequestError(
        "Buku ini sudah tersedia di koleksi perpustakaan. Silakan lakukan reservasi atau peminjaman langsung."
      );
    }

    const [recommendation] = await db
      .insert(recommendations)
      .values({
        dosenId,
        isbn: data.isbn,
        title: data.title,
        author: data.author,
        publisher: data.publisher,
        reason: data.reason,
        status: "pending"
      })
      .returning();

    return recommendation;
  }

  /**
   * 2. Ambil List Rekomendasi (Admin/Dosen)
   */
  async getRecommendations(
    filters: {
      dosenId?: string;
      status?: "pending" | "approved" | "rejected";
    } = {}
  ) {
    const conditions = [isNull(recommendations.deletedAt)];

    if (filters.dosenId) {
      conditions.push(eq(recommendations.dosenId, filters.dosenId));
    }

    if (filters.status) {
      conditions.push(eq(recommendations.status, filters.status));
    }

    return await db.query.recommendations.findMany({
      where: and(...conditions),
      with: {
        dosen: true
      },
      orderBy: [desc(recommendations.createdAt)]
    });
  }

  /**
   * 3. Update Status Rekomendasi (Admin)
   */
  async updateStatus(id: string, status: "pending" | "approved" | "rejected") {
    const rec = await db.query.recommendations.findFirst({
      where: and(eq(recommendations.id, id), isNull(recommendations.deletedAt))
    });

    if (!rec) {
      throw new NotFoundError("Rekomendasi tidak ditemukan");
    }

    const [updated] = await db
      .update(recommendations)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(recommendations.id, id))
      .returning();

    return updated;
  }

  /**
   * 4. Soft Delete (Admin/Staff, atau Dosen pemilik usulan dengan status pending)
   */
  async deleteRecommendation(id: string, actorUserId?: string, actorRole?: string) {
    const rec = await db.query.recommendations.findFirst({
      where: and(eq(recommendations.id, id), isNull(recommendations.deletedAt))
    });

    if (!rec) {
      throw new NotFoundError("Rekomendasi tidak ditemukan");
    }

    if (actorRole && actorRole !== "super_admin" && actorRole !== "staff") {
      if (rec.dosenId !== actorUserId) {
        throw new ForbiddenError("Anda tidak memiliki izin untuk menghapus usulan ini");
      }
      if (rec.status !== "pending") {
        throw new BadRequestError("Hanya usulan dengan status 'Menunggu' yang dapat dibatalkan");
      }
    }

    const [deleted] = await db
      .update(recommendations)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(recommendations.id, id))
      .returning();

    return deleted;
  }
}

export default new RecommendationService();
