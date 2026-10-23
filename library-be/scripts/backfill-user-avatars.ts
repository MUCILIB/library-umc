import { db } from "../src/db";
import { Users } from "../src/db/schema";
import { generateDefaultAvatar } from "../src/utils/avatar";
import { isNull, or, eq } from "drizzle-orm";

async function main() {
  console.log("Checking users without avatars in library database...");

  const usersToUpdate = await db
    .select({ id: Users.id, name: Users.name, email: Users.email, image: Users.image })
    .from(Users);

  let updated = 0;
  for (const user of usersToUpdate) {
    if (!user.image || user.image.trim() === "" || user.image.includes("9.x/waves")) {
      const avatarUrl = generateDefaultAvatar(user.email || user.name || user.id);
      await db.update(Users).set({ image: avatarUrl }).where(eq(Users.id, user.id));
      updated++;
    }
  }

  console.log(`Successfully backfilled/updated ${updated} users with 10.x DiceBear Waves avatars.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
