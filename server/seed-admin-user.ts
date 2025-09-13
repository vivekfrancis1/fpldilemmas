import { db } from "./db.js";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function seedAdminUser() {
  try {
    const adminEmail = "fpldilemmas@gmail.com";
    
    // Check if admin user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, adminEmail));
    
    if (existingUser) {
      console.log("✅ Admin user already exists:", adminEmail);
      return;
    }

    // Create admin user with hashed password
    const hashedPassword = await bcrypt.hash("fpldilemmas2024", 12);
    
    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      firstName: "FPL",
      lastName: "Admin", 
      role: "admin"
    });

    console.log("✅ Admin user created successfully:", adminEmail);
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
  }
}