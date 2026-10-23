import { db } from "../src/db";
import { Users } from "../src/db/schema";
import { generateDefaultAvatar } from "../src/utils/avatar";
import { isNull, or, eq } from "drizzle-orm";

async function main() {
  console.log("Checking users without avatars in library database...");

  const usersWithoutAvatar = await db
    .select({ id: Users.id, name: Users.name, email: Users.email, image: Users.image })
    .from(Users)
    .where(or(isNull(Users.image), eq(Users.image, "")));

  console.log(`Found ${usersWithoutAvatar.length} users with missing avatar.`);

  let updated = 0;
  for (const user of usersWithoutAvatar) {
    const avatarUrl = generateDefaultAvatar(user.email || user.name || user.id);
    await db.update(Users).set({ image: avatarUrl }).where(eq(Users.id, user.id));
    updated++;
  }

  console.log(`Successfully backfilled ${updated} users with deterministic DiceBear Waves avatars.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
