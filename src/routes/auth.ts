import { Hono } from "hono";
import { db } from "../db/pool.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { authMiddleware, adminMiddleware } from "../middleware/auth.ts";

const app = new Hono();
const JWT_SECRET = process.env.JWT_SECRET!;

app.use("/register", authMiddleware, adminMiddleware);

app.post("/register", async (c) => {
  try {
    const { nama, username, password, role } = await c.req.json<{
      nama: string;
      username: string;
      password: string;
      role?: "petugas" | "admin";
    }>();

    if (!nama || !username || !password) {
      return c.json({ message: "nama, username, dan password wajib diisi" }, 400);
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (existing) {
      return c.json({ message: "Username sudah digunakan" }, 409);
    }

    const hashedPassword = await Bun.password.hash(password);

    const [newUser] = await db
      .insert(users)
      .values({
        nama,
        username,
        password: hashedPassword,
        role: role ?? "petugas",
      })
      .returning();

    if (!newUser) {
      return c.json({ message: "Gagal membuat user" }, 500);
    }

    return c.json(
      {
        message: "User berhasil didaftarkan",
        data: { id: newUser.id, nama: newUser.nama, username: newUser.username, role: newUser.role },
      },
      201,
    );
  } catch (e) {
    console.error(e);
    return c.json(
      {
        message: "Terjadi kesalahan saat registrasi",
        error: e instanceof Error ? e.message : String(e),
      },
      400,
    );
  }
});

app.post("/login", async (c) => {
  try {
    const { username, password } = await c.req.json<{
      username: string;
      password: string;
    }>();

    if (!username || !password) {
      return c.json({ message: "username dan password wajib diisi" }, 400);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!user) {
      return c.json({ message: "Username atau password salah" }, 401);
    }

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) {
      return c.json({ message: "Username atau password salah" }, 401);
    }

    const token = await sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      },
      JWT_SECRET,
      "HS256",
    );

    return c.json({
      message: "Login berhasil",
      token,
      user: { id: user.id, nama: user.nama, username: user.username, role: user.role },
    });
  } catch (e) {
    console.error(e);
    return c.json(
      {
        message: "Terjadi kesalahan saat login",
        error: e instanceof Error ? e.message : String(e),
      },
      400,
    );
  }
});

export default app;
