import {
  pgTable,
  serial,
  varchar,
  timestamp,
  pgEnum,
  integer,
  text,
  vector,
  real,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["petugas", "admin"]);
export const statusEnum = pgEnum("status", ["masuk", "keluar"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").default("petugas").notNull(),
});

export const parkir = pgTable("parkir", {
  id: serial("id").primaryKey(),
  platNomor: varchar("plat_nomor", { length: 20 }).notNull(),
  confidencePlat: real("confidence_plat").notNull(),
  waktuMasuk: timestamp("waktu_masuk", { withTimezone: true })
    .defaultNow()
    .notNull(),
  waktuKeluar: timestamp("waktu_keluar", { withTimezone: true }),
  status: statusEnum("status").default("masuk").notNull(),
  similarity: real("similarity"),
  // InsightFace menghasilkan 512-dimensional vector menggunakan pgvector.
  faceEmbedding: vector("face_embedding", { dimensions: 512 }),
  gambarMasukPath: text("gambar_masuk_path"),
  gambarKeluarPath: text("gambar_keluar_path"),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
});

export const gambarValidasiGagal = pgTable("gambar_validasi_gagal", {
  id: serial("id").primaryKey(),
  platNomor: varchar("plat_nomor", { length: 20 }).notNull(),
  gambarGagalPath: text("gambar_gagal_path").notNull(),
  similarity: real("similarity"),
  waktuValidasi: timestamp("waktu_validasi", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
