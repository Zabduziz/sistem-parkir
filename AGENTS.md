# sistem-parkir

Bun + Hono + Drizzle ORM + PostgreSQL backend for a parking system (skripsi/thesis).

## Commands

```sh
bun run --hot src/index.ts        # dev server (port 3000, 0.0.0.0)
bun run --hot src/db/seed.ts      # seed DB with admin/petugas users
```

No test/lint/typecheck scripts are configured.

## Database

- PostgreSQL via Drizzle ORM with `pgvector` extension (face_embedding: 512-d vector).
- Connection string from `DATABASE_URL` in `.env` (local instance on port 5441).
- Schema at `src/db/schema.ts`: tables `users` and `parkir`.
- Drizzle config at `drizzle.config.ts` (no `drizzle/` migrations dir yet; run `bunx drizzle-kit generate` to create).
- Seed creates: `admin`/`admin123` (admin), `petugas`/`user123` (petugas).

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/auth/register` | Admin | Register new user (JSON: nama, username, password, role?) |
| POST   | `/auth/login`    | No | Login, returns JWT (JSON: username, password) |
| GET    | `/users` | Admin | List all users |
| POST   | `/users` | Admin | Create user (JSON: nama, username, password, role?) |
| PUT    | `/users/:id` | Admin | Update user (JSON: nama?, username?, password?, role?) |
| DELETE | `/users/:id` | Admin | Delete user (blocked for self / users with parkir records) |
| POST   | `/detection` | Yes | Record vehicle entry (multipart: platNomor, userId, confidencePlat, faceEmbedding, gambar) |
| GET    | `/parkir?plateNumber=X` | Yes | Check latest record for a plate |
| PUT    | `/parkir` | Yes | Record vehicle exit (multipart: plateNumber, similarity, gambarKeluar) |
| GET    | `/history` | Yes | All records ordered by waktuMasuk desc |
| GET    | `/stream-in` | No | Proxy MJPEG stream from `URL_LOCAL_PI:5000` |
| GET    | `/stream-out` | No | Proxy MJPEG stream from `URL_LOCAL_PI:5001` |

## Structure

```
src/
  index.ts          # entrypoint, mounts all route modules
  middleware/
    auth.ts         # JWT auth middleware + adminMiddleware (role check)
  routes/
    auth.ts         # POST /auth/register (admin only), POST /auth/login
    users.ts        # GET/POST/PUT/DELETE /users (admin only user CRUD)
    detection.ts    # POST /detection
    parkir.ts       # GET /parkir, PUT /parkir
    history.ts      # GET /history
    stream.ts       # GET /stream-in, GET /stream-out
  db/
    pool.ts         # Drizzle + pg Pool setup
    schema.ts       # Drizzle schema (users, parkir tables)
    seed.ts         # DB seed script
uploads/            # uploaded images (gitignored except .gitkeep)
```

## Notes

- CORS allows `http://localhost:5173` (Vue frontend dev server).
- File uploads saved to `./uploads/`; served statically at `/uploads/*`.
- Uses `bun.lock` (Bun package manager). Install with `bun install`.
- TypeScript: strict mode, `verbatimModuleSyntax`, `bundler` module resolution, no emit.
- Face embeddings are InsightFace 512-d vectors stored via pgvector.
