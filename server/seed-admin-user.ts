import { db } from "./db.js";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const ADMIN_EMAIL = "fpldilemmas@gmail.com";
const ADMIN_PASSWORD = "fpldilemmas2024";

export async function seedAdminUser() {
  try {
    const [existingUser] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));

    if (existingUser) {
      // Ensure the password is set and matches the expected value
      const needsUpdate = !existingUser.password ||
        !(await bcrypt.compare(ADMIN_PASSWORD, existingUser.password));

      if (needsUpdate) {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
        await db.update(users)
          .set({ password: hashedPassword, role: "admin" })
          .where(eq(users.email, ADMIN_EMAIL));
        console.log("✅ Admin user password updated:", ADMIN_EMAIL);
      } else {
        console.log("✅ Admin user already exists:", ADMIN_EMAIL);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.insert(users).values({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: "FPL",
      lastName: "Admin",
      role: "admin"
    });

    console.log("✅ Admin user created successfully:", ADMIN_EMAIL);
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
  }
}
