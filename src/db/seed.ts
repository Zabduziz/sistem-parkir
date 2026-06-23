import { db } from "./pool.ts";
import * as schema from "./schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Membersihkan tabel...");

  // Gunakan truncate agar ID auto-increment kembali ke 1
  // 'cascade' digunakan untuk menghapus data yang memiliki Relasi/FK
  await db.execute(
    sql`TRUNCATE TABLE ${schema.parkir}, ${schema.users} RESTART IDENTITY CASCADE`,
  );
  console.log("Seeding database...");

  const hashedAdminPassword = await Bun.password.hash("admin123");
  const hashedUserPassword = await Bun.password.hash("user123");
  const userAdmin = await db
    .insert(schema.users)
    .values({
      nama: "Admin",
      username: "admin",
      password: hashedAdminPassword,
      role: "admin",
    })
    .returning();
  const userPetugas = await db
    .insert(schema.users)
    .values({
      nama: "Petugas",
      username: "petugas",
      password: hashedUserPassword,
      role: "petugas",
    })
    .returning();

  console.log("Seeding done...");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
