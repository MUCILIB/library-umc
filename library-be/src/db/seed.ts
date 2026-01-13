import { db } from ".";
import { Users, members } from "./schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function seed() {
  console.log("Seeding database...");

  const usersData = [
    {
      email: "fauzanrizqinoor@gmail.com",
      full_name: "Rizqi Noor Fauzan",
      role: "mahasiswa" as const,
      nim: "12345678",
      status: "active",
      faculty: "Teknik",
    },
    {
      email: "rizqinoorf@gmail.com",
      full_name: "Fauzan AJA",
      role: "dosen" as const,
      nidn: "98765432",
      status: "active",
      faculty: "Ilmu Komputer",
    },
    {
      email: "staff@campus.ac.id",
      full_name: "Pak Joko Staff",
      role: "staff" as const,
      status: "active",
      faculty: "Administrasi",
    },
    {
      email: "inactive@campus.ac.id",
      full_name: "Andi Drop Out",
      role: "mahasiswa" as const,
      nim: "87654321",
      status: "blacklist", // corrected from 'inactive' to match schema enum
      faculty: "Teknik",
    },
  ];

  for (const data of usersData) {
    const existing = await db.query.Users.findFirst({
      where: eq(Users.email, data.email),
    });

    if (!existing) {
      const userId = randomUUID();
      const now = new Date();

      // 1. Insert into Users table
      await db.insert(Users).values({
        id: userId,
        name: data.full_name,
        email: data.email,
        emailVerified: true,
        role: data.role,
        status: data.status as "active" | "blacklist",
        createdAt: now,
        updatedAt: now,
      });

      // 2. Insert into members table if applicable (has nim or nidn)
      if ("nim" in data || "nidn" in data) {
        // Determine member type and ID
        const memberType = data.role === "mahasiswa" ? "Student" : "Lecture";
        const nimNidn = "nim" in data ? data.nim : (data as any).nidn;

        await db.insert(members).values({
          userId: userId,
          memberType: memberType,
          nimNidn: nimNidn,
          faculty: data.faculty,
          createdAt: now,
          updatedAt: now,
        });
      }

      console.log(`Created user: ${data.email}`);
    } else {
      console.log(`User already exists: ${data.email}`);
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed();
