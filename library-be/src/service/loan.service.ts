import { eq } from "drizzle-orm";
import { db } from "../db";
import { items, loanRelations, members } from "../db/schema";

export class LoanService {
  async createLoan(memberId: string, itemId: string, dueDate: Date) {
    // Cek member
    const member = await db.query.members.findFirst({
      where: eq(members.id, memberId),
    });

    if (!member) {
      throw new Error("Member tidak ditemukan");
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item) {
      throw new Error("Buku tidak ditemukan");
    }

    if (item.status !== "available") {
      throw new Error("Buku sedang dipinjam");
    }
  }
}
