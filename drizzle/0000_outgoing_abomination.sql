CREATE TYPE "public"."role" AS ENUM('petugas', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('masuk', 'keluar');--> statement-breakpoint
CREATE TABLE "gambar_validasi_gagal" (
	"id" serial PRIMARY KEY NOT NULL,
	"plat_nomor" varchar(20) NOT NULL,
	"gambar_gagal_path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parkir" (
	"id" serial PRIMARY KEY NOT NULL,
	"plat_nomor" varchar(20) NOT NULL,
	"confidence_plat" real NOT NULL,
	"waktu_masuk" timestamp with time zone DEFAULT now() NOT NULL,
	"waktu_keluar" timestamp with time zone,
	"status" "status" DEFAULT 'masuk' NOT NULL,
	"similarity" real,
	"face_embedding" vector(512),
	"gambar_masuk_path" text,
	"gambar_keluar_path" text,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'petugas' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "parkir" ADD CONSTRAINT "parkir_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;